import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { backfillCosponsors } from "@/scripts/backfill-cosponsors";
import { reportError } from "@/lib/error-reporting";

/**
 * GET /api/cron/backfill-cosponsors
 *
 * Paginated catch-up for the BillCosponsor table. The schema + fetcher
 * shipped with PR #3 but the initial drain never ran, so 1,766 live
 * bills with aggregate cosponsor counts have zero individual records.
 * The rep-interaction UI depends on this table being populated.
 *
 * Protected by CRON_SECRET. Processes up to `limit` live bills per call,
 * oldest-first so the daily cron's new bills stay at the back of the
 * queue. Each call is idempotent (upserts) and self-resuming — keep
 * calling until `remaining: 0`.
 *
 * Cost per bill: one /cosponsors API call (~1s) + DB writes. 15 bills
 * per call fits comfortably within the 55s budget (Hobby 60s cap).
 */

export const maxDuration = 60;
const TIMEOUT_MS = 55_000;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    30,
    parseInt(url.searchParams.get("limit") ?? "15", 10),
  );
  const tiers = (url.searchParams.get("tiers") ?? "ACTIVE,ADVANCING,ENACTED")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const started = Date.now();
  const deadline = started + TIMEOUT_MS;

  // Select live bills that have aggregate cosponsors but no individual rows yet.
  // Newest-first: current-congress bills are what users actually look at. A
  // long tail of old bills whose only cosponsor is a former member (not in our
  // Representative table) will never drain — they'd block the queue forever
  // under ASC order. Pushing them to the tail keeps drain progress steady.
  const batch = await prisma.bill.findMany({
    where: {
      momentumTier: { in: tiers },
      cosponsorCount: { gt: 0 },
      cosponsors: { none: {} },
    },
    orderBy: [{ currentStatusDate: "desc" }],
    select: { billId: true },
    take: limit,
  });

  let processed = 0;
  let timedOut = false;
  const errors: Array<{ billId: string; error: string }> = [];

  for (const b of batch) {
    if (Date.now() >= deadline) {
      timedOut = true;
      break;
    }
    try {
      await backfillCosponsors([b.billId]);
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ billId: b.billId, error: msg });
    }
  }

  const remaining = await prisma.bill.count({
    where: {
      momentumTier: { in: tiers },
      cosponsorCount: { gt: 0 },
      cosponsors: { none: {} },
    },
  });

  const elapsedMs = Date.now() - started;

  if (errors.length > 0) {
    reportError(new Error(`Cosponsor backfill errors: ${errors.length}`), {
      route: "GET /api/cron/backfill-cosponsors",
      errors: errors.slice(0, 10),
    });
  }

  return NextResponse.json({
    ok: true,
    processed,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
    remaining,
    timedOut,
    elapsedMs,
    elapsedSec: Math.round(elapsedMs / 1000),
  });
}
