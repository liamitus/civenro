import { NextResponse } from "next/server";
import { fetchBillsFunction } from "@/scripts/fetch-bills";
import { fetchBillTextFunction } from "@/scripts/fetch-bill-text";
import { fetchBillActionsFunction } from "@/scripts/fetch-bill-actions";
import { fetchVotesFunction } from "@/scripts/fetch-votes";
import { fetchRepresentativesFunction } from "@/scripts/fetch-representatives";
import { refreshBillMetadataFunction } from "@/scripts/refresh-bill-metadata";
import { generateChangeSummariesFunction } from "@/scripts/generate-change-summaries";
import { computeMomentumFunction } from "@/scripts/compute-momentum";
import { reportError } from "@/lib/error-reporting";

/**
 * Single daily cron that keeps all legislative data fresh.
 *
 * Runs each pipeline in priority order with a time budget so we stay
 * within Vercel Hobby's 60-second function timeout. Each pipeline is
 * designed to be incremental — it fills in gaps since the last run:
 *
 *   1. Bills          — fetches new bills since the most recent in DB
 *   2. Bill metadata  — fast metadata-only refresh (sponsor, policyArea, CRS summary)
 *   3. Bill text      — fetches text for bills that don't have it yet
 *   4. Bill actions   — reconciles statuses for active (non-enacted) bills
 *   5. Votes          — fetches representative votes from the last 7 days
 *   6. Reps           — refreshes the member roster (weekly, Mondays only)
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

  // 2. Bill metadata — metadata-only refresh, no text download (~2-3s per bill).
  // Covers sponsor, policyArea, latestAction, and CRS summary — the fields shown
  // on the bills listing card. Larger batch than bill-text because it's faster.
  results.push(
    await runWithBudget(
      "bill-metadata",
      () => refreshBillMetadataFunction(25),
      deadline,
    ),
  );

  // 3. Bill text — batch of 5 bills missing text (~3s each w/ rate limiting)
  results.push(
    await runWithBudget("bill-text", () => fetchBillTextFunction(undefined, 5), deadline),
  );

  // 4. Change summaries — AI-generated narratives of what changed between bill
  // versions. Only runs when AI is enabled in the budget ledger; gates itself
  // internally. Uses Claude Haiku for cost (~$0.02 per summary). Small batch
  // because each call costs money and takes a few seconds.
  results.push(
    await runWithBudget(
      "change-summaries",
      () => generateChangeSummariesFunction(undefined, 3),
      deadline,
    ),
  );

  // 5. Bill actions — batch of 15 active bills (~1s each w/ rate limiting)
  results.push(
    await runWithBudget("bill-actions", () => fetchBillActionsFunction(undefined, 15), deadline),
  );

  // 6. Momentum — recomputes the alive/dormant/dead signal for every bill whose
  // data just changed (plus a slice of the stale pile). Cheap: no external API,
  // ~2000 bills/run processed from Postgres directly.
  results.push(
    await runWithBudget(
      "momentum",
      () => computeMomentumFunction(2000).then(() => undefined),
      deadline,
    ),
  );

  // 7. Votes — last 7 days of representative votes
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  results.push(
    await runWithBudget("votes", () => fetchVotesFunction(sevenDaysAgo), deadline),
  );

  // 8. Representatives — weekly refresh (Mondays only)
  if (isMonday) {
    results.push(
      await runWithBudget("representatives", () => fetchRepresentativesFunction(), deadline),
    );
  }

  const totalMs = Date.now() - start;
  console.log(`[fetch-data] completed in ${totalMs}ms:`, JSON.stringify(results));

  const failures = results.filter((r) => r.status === "error");
  if (failures.length > 0) {
    await reportError(
      new Error(`fetch-data cron: ${failures.map((f) => f.stage).join(", ")} failed`),
      { stages: results, totalMs }
    );
  }

  return NextResponse.json({
    ok: results.every((r) => r.status === "ok" || r.status === "skipped"),
    totalMs,
    stages: results,
  });
}
