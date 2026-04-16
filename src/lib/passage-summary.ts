/**
 * Per-chamber passage summary for a bill.
 *
 * Congress doesn't record individual votes for voice votes, unanimous
 * consent, or suspension-of-the-rules passages that are agreed to by voice.
 * The majority of enacted bills (naming bills, technical fixes, ceremonial
 * resolutions) pass this way — so "no votes from your reps" is usually a
 * procedural fact about Congress, not about the reps.
 *
 * We infer this signal from what's already in our DB: for each chamber we
 * know the bill reached, do we have any RepresentativeVote rows? If yes, a
 * roll call happened. If no, the chamber agreed by a method that didn't
 * produce individual records.
 */
export type ChamberName = "house" | "senate";

export type ChamberPassageStatus =
  | "passed_with_rollcall"
  | "passed_without_rollcall"
  | "pending";

export interface ChamberPassage {
  chamber: ChamberName;
  status: ChamberPassageStatus;
  /** How many passage-type roll calls we have for this chamber. */
  passageRollCallCount: number;
  /** How many procedural/amendment/cloture roll calls we have. These
   * aren't passage, but serve as accountability signals when final
   * passage was by voice / UC. */
  proceduralRollCallCount: number;
}

export interface BillStatusInput {
  billType: string;
  currentStatus: string;
}

export interface ChamberRollCalls {
  passage: number;
  procedural: number;
}

export interface RollCallCounts {
  house: ChamberRollCalls;
  senate: ChamberRollCalls;
}

const BOTH_CHAMBERS_PASSED_STATUSES = new Set([
  "passed_bill",
  "pass_back_house",
  "pass_back_senate",
]);

function bothChambersPassed(currentStatus: string): boolean {
  return (
    currentStatus.startsWith("enacted_") ||
    currentStatus.startsWith("vetoed") ||
    currentStatus.startsWith("prov_kill_veto") ||
    currentStatus.startsWith("conference_") ||
    BOTH_CHAMBERS_PASSED_STATUSES.has(currentStatus)
  );
}

function originChamber(billType: string): ChamberName | null {
  if (billType.startsWith("house")) return "house";
  if (billType.startsWith("senate")) return "senate";
  return null;
}

function chamberHasPassed(
  chamber: ChamberName,
  bill: BillStatusInput,
): boolean {
  if (bothChambersPassed(bill.currentStatus)) return true;

  const origin = originChamber(bill.billType);
  if (origin === chamber) {
    // Origin chamber passes before it can cross over
    return (
      bill.currentStatus === "passed_house" ||
      bill.currentStatus === "pass_over_house" ||
      bill.currentStatus === "passed_senate" ||
      bill.currentStatus === "pass_over_senate"
    );
  }

  // Non-origin chamber
  if (chamber === "senate") {
    return (
      bill.currentStatus === "passed_senate" ||
      bill.currentStatus === "pass_over_senate"
    );
  }
  if (chamber === "house") {
    return (
      bill.currentStatus === "passed_house" ||
      bill.currentStatus === "pass_over_house"
    );
  }
  return false;
}

/**
 * Whether this chamber is relevant to the bill at all — i.e. the bill
 * originates there or has reached it. Used to decide whether to surface
 * context notes / rep rows for senators when the bill is House-only (for
 * example).
 */
export function chamberIsRelevant(
  chamber: ChamberName,
  bill: BillStatusInput,
): boolean {
  const origin = originChamber(bill.billType);
  if (origin === chamber) return true;
  if (bothChambersPassed(bill.currentStatus)) return true;
  if (chamber === "senate") {
    return (
      bill.currentStatus === "passed_house" ||
      bill.currentStatus === "pass_over_house" ||
      bill.currentStatus === "passed_senate" ||
      bill.currentStatus === "pass_over_senate"
    );
  }
  if (chamber === "house") {
    return (
      bill.currentStatus === "passed_senate" ||
      bill.currentStatus === "pass_over_senate" ||
      bill.currentStatus === "passed_house" ||
      bill.currentStatus === "pass_over_house"
    );
  }
  return false;
}

/**
 * Compute per-chamber passage status. Returns only chambers that are
 * relevant to the bill (i.e. origin or reached).
 */
export function summarizeChamberPassage(
  bill: BillStatusInput,
  rollCalls: RollCallCounts,
): ChamberPassage[] {
  const chambers: ChamberName[] = ["house", "senate"];
  const results: ChamberPassage[] = [];

  for (const chamber of chambers) {
    if (!chamberIsRelevant(chamber, bill)) continue;

    if (!chamberHasPassed(chamber, bill)) {
      results.push({
        chamber,
        status: "pending",
        passageRollCallCount: 0,
        proceduralRollCallCount: 0,
      });
      continue;
    }

    const { passage, procedural } = rollCalls[chamber];
    // Only a passage-category roll call proves the chamber recorded
    // names on final disposition. Procedural roll calls (motion to
    // suspend, motion to recommit, cloture) happen even when the
    // final disposition itself was by voice / unanimous consent.
    results.push({
      chamber,
      status: passage > 0 ? "passed_with_rollcall" : "passed_without_rollcall",
      passageRollCallCount: passage,
      proceduralRollCallCount: procedural,
    });
  }

  return results;
}
