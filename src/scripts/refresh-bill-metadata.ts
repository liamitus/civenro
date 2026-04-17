import "dotenv/config";
import { fetchBillMetadata } from "../lib/congress-api";
import { parseBillId } from "../lib/parse-bill-id";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();

/**
 * Fast metadata-only refresh. Unlike fetch-bill-text.ts this does NOT download
 * bill XML — it only calls Congress.gov's metadata + summaries endpoints, so
 * each bill takes ~2-3s instead of 5-15s. Safe to run from the daily cron with
 * a larger batch than fetch-bill-text can sustain.
 *
 * Prioritizes bills that have never been backfilled (sponsor IS NULL), then
 * bills missing CRS summaries. Newest bills first so the listing page always
 * shows enriched data on recent legislation.
 */
export async function refreshBillMetadataFunction(limit = 25) {
  const bills = await prisma.bill.findMany({
    where: { OR: [{ sponsor: null }, { shortText: null }] },
    select: { id: true, billId: true },
    orderBy: [
      { sponsor: { sort: "asc", nulls: "first" } },
      { introducedDate: "desc" },
    ],
    take: limit,
  });

  if (bills.length === 0) {
    console.log("[refresh-metadata] no bills need refreshing");
    return;
  }

  console.log(`[refresh-metadata] refreshing ${bills.length} bills`);
  let ok = 0;
  let failed = 0;

  for (const bill of bills) {
    const { congress, apiBillType, billNumber } = parseBillId(bill.billId);
    if (!congress || !apiBillType || !billNumber) {
      failed++;
      continue;
    }
    try {
      const meta = await fetchBillMetadata(congress, apiBillType, billNumber);
      if (!meta) {
        failed++;
        continue;
      }
      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          sponsor: meta.sponsor,
          cosponsorCount: meta.cosponsorCount,
          cosponsorPartySplit: meta.cosponsorPartySplit,
          policyArea: meta.policyArea,
          latestActionText: meta.latestActionText,
          latestActionDate: meta.latestActionDate
            ? new Date(meta.latestActionDate)
            : null,
          shortText: meta.shortText,
        },
      });
      ok++;
    } catch (e) {
      failed++;
      console.warn(
        `[refresh-metadata] ${bill.billId} failed:`,
        (e as Error).message,
      );
    }
  }

  console.log(`[refresh-metadata] done — ${ok} ok, ${failed} failed`);
}

// CLI invocation
if (require.main === module) {
  const limit = parseInt(process.argv[2] || "25", 10);
  refreshBillMetadataFunction(limit)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
