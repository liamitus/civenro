import "dotenv/config";
import { createStandalonePrisma } from "../lib/prisma-standalone";
import {
  computeMomentum,
  getCurrentCongress,
  type MomentumTier,
} from "../lib/momentum";

const prisma = createStandalonePrisma();

/**
 * Recomputes the momentum signal on Bill. Pulls only the fields needed, so a
 * full sweep over ~15k bills stays cheap.
 *
 * Run modes:
 *   - Default: incremental. Processes bills whose momentum is stale (>20h old)
 *     or never computed, plus all bills that had any activity in the last 7d.
 *   - `full`: recomputes every bill. Use after deploying a scoring change.
 */
export async function computeMomentumFunction(
  limit = 2000,
  mode: "incremental" | "full" = "incremental",
): Promise<{ ok: number; failed: number }> {
  const now = new Date();
  const currentCongress = getCurrentCongress(now);

  const staleCutoff = new Date(now.getTime() - 20 * 3600_000);
  const recentActivityCutoff = new Date(now.getTime() - 7 * 86_400_000);

  const where =
    mode === "full"
      ? {}
      : {
          OR: [
            { momentumComputedAt: null },
            { momentumComputedAt: { lt: staleCutoff } },
            { latestActionDate: { gte: recentActivityCutoff } },
          ],
        };

  const bills = await prisma.bill.findMany({
    where,
    select: {
      id: true,
      billId: true,
      currentStatus: true,
      currentStatusDate: true,
      latestActionDate: true,
      congressNumber: true,
      cosponsorCount: true,
      cosponsorPartySplit: true,
      _count: {
        select: {
          votes: true,
          publicVotes: true,
          comments: true,
          textVersions: true,
        },
      },
      textVersions: {
        where: { isSubstantive: true },
        select: { id: true },
      },
    },
    // Prioritize never-computed bills, then oldest-first so recently-touched
    // bills get recomputed before the stale pile.
    orderBy: [
      { momentumComputedAt: { sort: "asc", nulls: "first" } },
      { latestActionDate: { sort: "desc", nulls: "last" } },
    ],
    take: limit,
  });

  if (bills.length === 0) {
    console.log("[momentum] nothing to compute");
    return { ok: 0, failed: 0 };
  }

  console.log(
    `[momentum] computing ${bills.length} bills (mode=${mode}, congress=${currentCongress})`,
  );

  // Batch the updates. Prisma doesn't offer a typed bulk-update with per-row
  // values, so we issue them in parallel-ish chunks.
  const CHUNK = 50;
  let ok = 0;
  let failed = 0;
  const tierCounts = new Map<MomentumTier | "ENACTED", number>();

  for (let i = 0; i < bills.length; i += CHUNK) {
    const chunk = bills.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      chunk.map(async (bill) => {
        const result = computeMomentum(
          {
            billId: bill.billId,
            currentStatus: bill.currentStatus,
            congressNumber: bill.congressNumber,
            latestActionDate: bill.latestActionDate,
            currentStatusDate: bill.currentStatusDate,
            cosponsorCount: bill.cosponsorCount,
            cosponsorPartySplit: bill.cosponsorPartySplit,
            substantiveVersions: bill.textVersions.length,
            engagementCount:
              bill._count.votes + bill._count.publicVotes + bill._count.comments,
          },
          currentCongress,
          now,
        );

        tierCounts.set(result.tier, (tierCounts.get(result.tier) ?? 0) + 1);

        await prisma.bill.update({
          where: { id: bill.id },
          data: {
            momentumScore: result.score,
            momentumTier: result.tier,
            daysSinceLastAction: result.daysSinceLastAction,
            deathReason: result.deathReason,
            momentumComputedAt: now,
          },
        });
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") ok++;
      else {
        failed++;
        console.warn("[momentum] update failed:", r.reason);
      }
    }
  }

  const tierSummary = Array.from(tierCounts.entries())
    .map(([t, c]) => `${t}=${c}`)
    .join(" ");
  console.log(`[momentum] done — ${ok} ok, ${failed} failed [${tierSummary}]`);
  return { ok, failed };
}

if (require.main === module) {
  const mode = (process.argv[2] === "full" ? "full" : "incremental") as
    | "incremental"
    | "full";
  const limit = parseInt(process.argv[3] || "2000", 10);
  computeMomentumFunction(limit, mode)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
