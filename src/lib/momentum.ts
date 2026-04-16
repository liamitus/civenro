// Momentum scoring for bills.
//
// The goal is to give users signal about whether a bill is actually moving —
// because ~90% of introduced bills die quietly in committee, and Congress.gov's
// native status ("Referred to Committee", "In Progress") doesn't change when a
// bill is abandoned. A bill that was referred 18 months ago looks identical to
// one referred yesterday without a momentum signal.
//
// Design principles:
//   1. Explainable over accurate — publish the formula; no black boxes.
//   2. Honest language — DEAD / DORMANT / STALLED / ACTIVE / ADVANCING / ENACTED.
//   3. Hard overrides first (prior Congress = dead, 365d silence = dead, etc.),
//      then a graded score for ranking within the "alive" tiers.

export type MomentumTier =
  | "DEAD"
  | "DORMANT"
  | "STALLED"
  | "ACTIVE"
  | "ADVANCING"
  | "ENACTED";

export type DeathReason =
  | "CONGRESS_ENDED"
  | "FAILED_VOTE"
  | "VETOED"
  | "LONG_SILENCE"
  | null;

export interface MomentumInputs {
  billId: string;
  currentStatus: string;
  congressNumber: number | null;
  latestActionDate: Date | null;
  currentStatusDate: Date;
  cosponsorCount: number | null;
  cosponsorPartySplit: string | null;
  substantiveVersions: number;
  engagementCount: number; // votes + publicVotes + comments
}

export interface MomentumResult {
  score: number; // 0-100
  tier: MomentumTier;
  daysSinceLastAction: number;
  deathReason: DeathReason;
}

const DAY_MS = 86_400_000;

/**
 * Current Congress number for a given date.
 *
 * Congress N runs Jan 3 of year (2*(N-1) + 1789) through Jan 3 of the next
 * odd year. 119th Congress: Jan 3 2025 → Jan 3 2027.
 */
export function getCurrentCongress(now: Date = new Date()): number {
  let year = now.getUTCFullYear();
  // If we're in the first 2 days of January of an odd year, the previous
  // Congress is still technically in session.
  if (year % 2 === 1 && now.getUTCMonth() === 0 && now.getUTCDate() < 3) {
    year -= 1;
  }
  const startYear = year % 2 === 1 ? year : year - 1;
  return Math.floor((startYear - 1789) / 2) + 1;
}

/**
 * Date the given Congress ends (Jan 3 of the next odd year after it starts).
 */
export function getCongressEndDate(congress: number): Date {
  const startYear = (congress - 1) * 2 + 1789;
  return new Date(Date.UTC(startYear + 2, 0, 3));
}

/**
 * Parse "X D, Y R" cosponsor split into { d, r } counts. Returns null if unparsable.
 */
function parsePartySplit(split: string | null): { d: number; r: number } | null {
  if (!split) return null;
  const d = /(\d+)\s*D/i.exec(split)?.[1];
  const r = /(\d+)\s*R/i.exec(split)?.[1];
  if (!d && !r) return null;
  return { d: parseInt(d || "0", 10), r: parseInt(r || "0", 10) };
}

function isBipartisan(split: string | null): boolean {
  const parsed = parsePartySplit(split);
  if (!parsed) return false;
  const minority = Math.min(parsed.d, parsed.r);
  return minority >= 3; // ≥3 cosponsors from the minority party
}

/**
 * Status floor — where the bill sits structurally, independent of activity.
 * Higher = further along in the legislative process.
 */
function statusFloor(status: string): number {
  if (status.startsWith("enacted_")) return 100;
  if (status.startsWith("conference_")) return 40;
  if (
    status === "passed_bill" ||
    status === "passed_concurrentres" ||
    status === "passed_simpleres"
  ) {
    return 38;
  }
  if (status.startsWith("pass_back_")) return 32;
  if (status.startsWith("pass_over_")) return 28;
  if (status === "reported") return 18;
  if (status === "introduced") return 8;
  if (status.startsWith("prov_kill_")) return 3; // stalled, not dead
  if (status.startsWith("fail_originating_")) return 2; // can revive via companion
  return 5;
}

/**
 * Compute momentum for a single bill.
 *
 * The hard overrides happen first so terminally-dead bills are never scored
 * as alive regardless of noise in other fields.
 */
export function computeMomentum(
  inputs: MomentumInputs,
  currentCongress: number,
  now: Date = new Date(),
): MomentumResult {
  const lastActionTs = (inputs.latestActionDate ?? inputs.currentStatusDate).getTime();
  const daysSinceLastAction = Math.max(
    0,
    Math.floor((now.getTime() - lastActionTs) / DAY_MS),
  );

  // --- Hard overrides ---

  // Enacted: the only terminal success.
  if (inputs.currentStatus.startsWith("enacted_")) {
    return { score: 100, tier: "ENACTED", daysSinceLastAction, deathReason: null };
  }

  // Prior Congress: constitutionally dead, bills do not carry over.
  if (
    inputs.congressNumber !== null &&
    inputs.congressNumber < currentCongress
  ) {
    return {
      score: 0,
      tier: "DEAD",
      daysSinceLastAction,
      deathReason: "CONGRESS_ENDED",
    };
  }

  // Terminal failures: cleared second chamber failing, pocket veto, failed override.
  if (
    inputs.currentStatus.startsWith("fail_second_") ||
    inputs.currentStatus.startsWith("vetoed_override_fail_")
  ) {
    return {
      score: 0,
      tier: "DEAD",
      daysSinceLastAction,
      deathReason: "FAILED_VOTE",
    };
  }
  if (inputs.currentStatus === "vetoed_pocket") {
    return { score: 0, tier: "DEAD", daysSinceLastAction, deathReason: "VETOED" };
  }

  // Long silence: no action in 365+ days is effectively dead for a live-Congress bill.
  if (daysSinceLastAction > 365) {
    return {
      score: 0,
      tier: "DEAD",
      daysSinceLastAction,
      deathReason: "LONG_SILENCE",
    };
  }

  // --- Graded score ---

  const floor = statusFloor(inputs.currentStatus);

  // Recency: exponential decay with ~60 day half-life, worth up to 30 points.
  const recency = 30 * Math.pow(0.5, daysSinceLastAction / 60);

  // Text iteration: committees publishing revised versions = real engagement.
  // Worth up to 10 points; cap at 3 substantive versions.
  const textIteration = Math.min(10, inputs.substantiveVersions * 4);

  // Cosponsor support: log-scaled, bonus for bipartisan. Up to 10 points.
  const cosponsors = inputs.cosponsorCount ?? 0;
  const cosponsorBase = Math.log1p(cosponsors) * 2;
  const cosponsorScore = Math.min(
    10,
    cosponsorBase * (isBipartisan(inputs.cosponsorPartySplit) ? 1.5 : 1.0),
  );

  // Civic engagement on our platform — capped low to avoid circularity.
  const civicScore = Math.min(5, Math.log1p(inputs.engagementCount));

  // End-of-Congress penalty: bills that haven't passed either chamber in the
  // last 3 months of a Congress are unlikely to move.
  const endOfCongress = getCongressEndDate(currentCongress);
  const daysToEnd = Math.max(
    0,
    Math.floor((endOfCongress.getTime() - now.getTime()) / DAY_MS),
  );
  let endPenalty = 0;
  if (daysToEnd < 90 && floor < 25) endPenalty = 15;
  else if (daysToEnd < 180 && floor < 18) endPenalty = 8;

  // Status floor contributes up to 40 for non-enacted bills (conference=40).
  const floorContribution = Math.min(40, floor);

  const rawScore =
    floorContribution + recency + textIteration + cosponsorScore + civicScore - endPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // --- Tier derivation ---
  //
  // Primarily age-based so users can trust the label, with status overrides
  // promoting bills that have cleared meaningful procedural milestones.

  let tier: MomentumTier;
  if (floor >= 28) {
    // Passed at least one chamber — structurally advancing.
    tier = "ADVANCING";
  } else if (daysSinceLastAction <= 60) {
    // Congress cadence is monthly; 60 days covers a normal markup cycle.
    tier = "ACTIVE";
  } else if (daysSinceLastAction <= 180) {
    tier = "STALLED";
  } else {
    tier = "DORMANT";
  }

  return { score, tier, daysSinceLastAction, deathReason: null };
}
