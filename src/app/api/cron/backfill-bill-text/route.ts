import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchBillTextFunction } from "@/scripts/fetch-bill-text";
import { reportError } from "@/lib/error-reporting";

/**
 * POST /api/cron/backfill-bill-text
 *
 * Paginated backfill for bills missing fullText. Unlike the daily fetch-data
 * cron which does 10 bills/run, this endpoint is for one-off catch-up runs
 * against a large backlog (~2k live bills without text).
 *
 * Protected by CRON_SECRET. Each call processes up to `limit` bills
 * (default 50) selected from live bills (ACTIVE / ADVANCING / ENACTED) with
 * no fullText and no associated BillTextVersion. Each call is idempotent
 * and self-resuming — keep calling until `remaining: 0`.
 *
 * Vercel default maxDuration is 300s per the current platform default;
 * at ~3s per bill we comfortably fit 50 bills per invocation.
 */

// Hobby plan cap is 60s. We budget 55s and bail early if approaching.
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
  // Each bill takes ~5-10s (congress.gov title + metadata + text, plus
  // GovInfo probes). 6 bills × ~8s = ~48s, safely within the 55s budget.
  // Larger batches hit FUNCTION_INVOCATION_TIMEOUT.
  const limit = Math.min(15, parseInt(url.searchParams.get("limit") ?? "6", 10));
  const tiers = (url.searchParams.get("tiers") ?? "ACTIVE,ADVANCING,ENACTED")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const started = Date.now();
  const deadline = started + TIMEOUT_MS;
  // Oldest-first — bills introduced weeks/months ago are much more likely to
  // have published text available (both congress.gov and GovInfo). Very
  // recent bills go to the back where the daily cron can pick them up later.
  const batch = await prisma.bill.findMany({
    where: {
      momentumTier: { in: tiers },
      fullText: null,
      textVersions: { none: { fullText: { not: null } } },
    },
    orderBy: [{ introducedDate: "asc" }],
    select: { billId: true },
    take: limit,
  });

  let processed = 0;
  const errors: Array<{ billId: string; error: string }> = [];

  let timedOut = false;
  for (const b of batch) {
    if (Date.now() >= deadline) {
      timedOut = true;
      break;
    }
    try {
      await fetchBillTextFunction(b.billId, 1);
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ billId: b.billId, error: msg });
    }
  }

  const remaining = await prisma.bill.count({
    where: {
      momentumTier: { in: tiers },
      fullText: null,
      textVersions: { none: { fullText: { not: null } } },
    },
  });

  const elapsedMs = Date.now() - started;

  if (errors.length > 0) {
    reportError(new Error(`Backfill errors: ${errors.length}`), {
      route: "GET /api/cron/backfill-bill-text",
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
