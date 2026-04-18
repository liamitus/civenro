import { PrismaClient } from "@/generated/prisma/client";
import type { Chamber, Signal } from "./types";

/**
 * Vote-recency signal: "last roll-call vote in chamber X was <N> minutes ago"
 * is a reliable proxy for "chamber X is currently on the floor."
 *
 * Thresholds:
 *   < 2h   → `voting`     (actively taking roll calls)
 *   < 8h   → `in_session` (gaveled in today, between votes)
 *   else   → null         (waterfall falls through to calendar)
 *
 * Chamber filtering: `RepresentativeVote.chamber` is stored as the raw
 * congress.gov value ("Senate" / "House"), case-insensitive match below.
 *
 * This runs against our own DB and is the only signal guaranteed to work
 * — scrapers can 403, calendars go stale. It also has the desirable
 * property that it reflects *actual* voting behavior, not a published
 * schedule.
 */

const VOTING_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2h
const IN_SESSION_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8h

export async function getVoteRecencySignal(
  prisma: PrismaClient,
  chamber: Chamber,
  now: Date = new Date(),
): Promise<Signal | null> {
  const chamberPattern = chamber === "house" ? "House" : "Senate";
  const rows = await prisma.$queryRaw<{ votedAt: Date | null }[]>`
    SELECT "votedAt"
    FROM "RepresentativeVote"
    WHERE "chamber" ILIKE ${chamberPattern}
      AND "votedAt" IS NOT NULL
    ORDER BY "votedAt" DESC
    LIMIT 1
  `;
  const latest = rows[0]?.votedAt;
  if (!latest) return null;

  const ageMs = now.getTime() - latest.getTime();
  if (ageMs < 0) return null; // clock skew — ignore

  if (ageMs < VOTING_THRESHOLD_MS) {
    return {
      status: "voting",
      observedAt: latest,
      detail: `Roll call vote ${formatAge(ageMs)} ago`,
      source: "vote_recency",
    };
  }
  if (ageMs < IN_SESSION_THRESHOLD_MS) {
    return {
      status: "in_session",
      observedAt: latest,
      detail: `Last vote ${formatAge(ageMs)} ago`,
      source: "vote_recency",
    };
  }
  return null;
}

function formatAge(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  return `${hours}h`;
}
