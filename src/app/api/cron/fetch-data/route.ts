import { NextResponse } from "next/server";

/**
 * @deprecated 2026-04-17
 *
 * The monolithic fetch-data cron has been retired. Vercel Hobby's
 * once-per-day cron limit forced every stage into a single 60s window,
 * which meant lower-priority stages (votes, momentum) got starved when
 * earlier stages ran long.
 *
 * Ingestion now runs from GitHub Actions (.github/workflows/ingest.yml)
 * which has no frequency cap. Each stage has its own endpoint and
 * schedule — see that workflow for the canonical cadence.
 *
 * This route is kept as a 410 Gone so external monitors or forgotten
 * Vercel cron entries get a clear signal instead of silently no-oping.
 * Remove after 2026-07-01 (90 days).
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "gone",
      message:
        "The fetch-data monolithic cron has been retired. Ingestion moved to GitHub Actions — see .github/workflows/ingest.yml. Individual endpoints live at /api/cron/{fetch-bills,fetch-votes,compute-momentum,...}.",
    },
    { status: 410 },
  );
}
