import "dotenv/config";
import axios from "axios";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();
const BASE_URL = "https://www.govtrack.us/api/v2";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfill() {
  // Get all distinct roll call numbers + chambers that are missing categories
  const votesWithoutCategory = await prisma.representativeVote.findMany({
    where: { category: null, rollCallNumber: { not: null } },
    select: { rollCallNumber: true, chamber: true },
    distinct: ["rollCallNumber", "chamber"],
  });

  console.log(
    `Found ${votesWithoutCategory.length} distinct roll calls to backfill`,
  );

  for (const { rollCallNumber, chamber } of votesWithoutCategory) {
    if (!rollCallNumber || !chamber) continue;

    try {
      // Look up this roll call vote on GovTrack
      const res = await axios.get(`${BASE_URL}/vote`, {
        params: {
          chamber,
          number: rollCallNumber,
          congress: 119,
          session: 2025,
          limit: 1,
        },
      });

      const voteObj = res.data.objects?.[0];
      if (!voteObj?.category) {
        console.log(
          `  No category found for ${chamber} roll call #${rollCallNumber}`,
        );
        continue;
      }

      const updated = await prisma.representativeVote.updateMany({
        where: { rollCallNumber, chamber },
        data: { category: voteObj.category },
      });

      console.log(
        `  ${chamber} #${rollCallNumber}: ${voteObj.category} (${updated.count} records)`,
      );

      await delay(300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Error for ${chamber} #${rollCallNumber}: ${msg}`);
    }
  }

  console.log("Backfill complete.");
  await prisma.$disconnect();
}

backfill();
