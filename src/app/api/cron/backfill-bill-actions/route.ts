import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchBillActions } from "@/lib/congress-api";
import { parseBillId } from "@/lib/parse-bill-id";
import { reportError } from "@/lib/error-reporting";

/**
 * GET /api/cron/backfill-bill-actions
 *
 * Paginated catch-up for the BillAction table. Action history drives the
 * bill-journey timeline on /bills/[id] and feeds status reconciliation
 * (GovTrack sometimes misreports passed_bill when reconciliation is still
 * happening; congress.gov actions reveal the truth).
 *
 * Before this endpoint: 95.7% of live bills had zero BillAction rows.
 * Daily cron processes 15 bills/day which would take ~140 days to drain
 * the backlog.
 *
 * Protected by CRON_SECRET. Oldest-by-status-date first (so the daily
 * cron's newer bills stay at the back). Each call is idempotent —
 * fetchBillActions upserts on (billId, actionDate, text).
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
  // Actions are ~1s each (one API call). Batch of 20 fits in ~30s with overhead.
  const limit = Math.min(30, parseInt(url.searchParams.get("limit") ?? "20", 10));
  const tiers = (url.searchParams.get("tiers") ?? "ACTIVE,ADVANCING,ENACTED")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const started = Date.now();
  const deadline = started + TIMEOUT_MS;

  // Select live bills that have no actions yet. Oldest by currentStatusDate
  // first — they're most likely to have stable, fully-published action
  // histories on congress.gov.
  const batch = await prisma.bill.findMany({
    where: {
      momentumTier: { in: tiers },
      actions: { none: {} },
    },
    orderBy: [{ currentStatusDate: "asc" }],
    select: { id: true, billId: true },
    take: limit,
  });

  let processed = 0;
  let timedOut = false;
  const errors: Array<{ billId: string; error: string }> = [];

  // Call the lib directly (avoids the script wrapper's extra Prisma query
  // and the 1s-per-bill sleep, which burns half our budget on nothing).
  for (const b of batch) {
    if (Date.now() >= deadline) {
      timedOut = true;
      break;
    }
    try {
      const parsed = parseBillId(b.billId);
      if (!parsed.congress || !parsed.apiBillType || !parsed.billNumber) {
        errors.push({ billId: b.billId, error: "invalid bill id" });
        continue;
      }
      const actions = await fetchBillActions(
        parsed.congress,
        parsed.apiBillType,
        parsed.billNumber,
      );
      if (!actions || actions.length === 0) {
        // No actions yet — still count as processed so we don't loop on the
        // same bills. Mark the absence of actions doesn't happen via a flag;
        // instead the WHERE `actions: { none: {} }` keeps it in the pool
        // until the daily cron re-tries when actions appear.
        processed++;
        continue;
      }
      // Batch-upsert all actions for this bill concurrently
      await Promise.all(
        actions
          .filter((a) => a.actionDate && a.text)
          .map((a) =>
            prisma.billAction.upsert({
              where: {
                billId_actionDate_text: {
                  billId: b.id,
                  actionDate: new Date(a.actionDate),
                  text: a.text,
                },
              },
              update: {},
              create: {
                billId: b.id,
                actionDate: new Date(a.actionDate),
                chamber: a.chamber,
                text: a.text,
                actionType: a.type,
              },
            }),
          ),
      );
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ billId: b.billId, error: msg });
    }
  }

  const remaining = await prisma.bill.count({
    where: {
      momentumTier: { in: tiers },
      actions: { none: {} },
    },
  });

  const elapsedMs = Date.now() - started;

  if (errors.length > 0) {
    reportError(new Error(`Action backfill errors: ${errors.length}`), {
      route: "GET /api/cron/backfill-bill-actions",
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
