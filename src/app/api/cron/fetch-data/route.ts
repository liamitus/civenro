import { NextResponse } from "next/server";
import { fetchBillsFunction } from "@/scripts/fetch-bills";
import { fetchBillTextFunction } from "@/scripts/fetch-bill-text";
import { fetchBillActionsFunction } from "@/scripts/fetch-bill-actions";
import { fetchVotesFunction } from "@/scripts/fetch-votes";
import { fetchRepresentativesFunction } from "@/scripts/fetch-representatives";

/**
 * Single daily cron that keeps all legislative data fresh.
 *
 * Runs each pipeline in priority order with a time budget so we stay
 * within Vercel Hobby's 60-second function timeout. Each pipeline is
 * designed to be incremental — it fills in gaps since the last run:
 *
 *   1. Bills        — fetches new bills since the most recent in DB
 *   2. Bill text    — fetches text for bills that don't have it yet
 *   3. Bill actions — reconciles statuses for active (non-enacted) bills
 *   4. Votes        — fetches representative votes from the last 7 days
 *   5. Reps         — refreshes the member roster (weekly, Mondays only)
 *
 * Scheduled at 14:00 UTC (10 AM ET) to land after Congress.gov's
 * morning data refresh (~9:45 AM ET).
 */

export const maxDuration = 60;

const TIMEOUT_MS = 55_000; // bail 5s before the hard limit

interface StageResult {
  stage: string;
  status: "ok" | "skipped" | "error" | "timeout";
  ms: number;
  error?: string;
}

async function runWithBudget(
  name: string,
  fn: () => Promise<void>,
  deadline: number,
): Promise<StageResult> {
  const start = Date.now();

  if (start >= deadline) {
    return { stage: name, status: "timeout", ms: 0 };
  }

  try {
    await fn();
    return { stage: name, status: "ok", ms: Date.now() - start };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[fetch-data] ${name} failed:`, msg);
    return { stage: name, status: "error", ms: Date.now() - start, error: msg };
  }
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const deadline = start + TIMEOUT_MS;
  const results: StageResult[] = [];
  const isMonday = new Date().getUTCDay() === 1;

  // 1. New bills — fast: just a few paginated API calls for recent months
  results.push(await runWithBudget("bills", () => fetchBillsFunction(), deadline));

  // 2. Bill text — batch of 5 bills missing text (~3s each w/ rate limiting)
  results.push(
    await runWithBudget("bill-text", () => fetchBillTextFunction(undefined, 5), deadline),
  );

  // 3. Bill actions — batch of 15 active bills (~1s each w/ rate limiting)
  results.push(
    await runWithBudget("bill-actions", () => fetchBillActionsFunction(undefined, 15), deadline),
  );

  // 4. Votes — last 7 days of representative votes
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  results.push(
    await runWithBudget("votes", () => fetchVotesFunction(sevenDaysAgo), deadline),
  );

  // 5. Representatives — weekly refresh (Mondays only)
  if (isMonday) {
    results.push(
      await runWithBudget("representatives", () => fetchRepresentativesFunction(), deadline),
    );
  }

  const totalMs = Date.now() - start;
  console.log(`[fetch-data] completed in ${totalMs}ms:`, JSON.stringify(results));

  return NextResponse.json({
    ok: results.every((r) => r.status === "ok" || r.status === "skipped"),
    totalMs,
    stages: results,
  });
}
