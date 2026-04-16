/**
 * Populate Representative.phone from the community-maintained
 * unitedstates/congress-legislators dataset.
 *
 * Usage:  npx tsx prisma/seed-phones.ts
 *
 * Safe to re-run — overwrites with the latest phone for each bioguideId.
 */

import "dotenv/config";
import { createStandalonePrisma } from "../src/lib/prisma-standalone";
import { parse as parseYaml } from "yaml";

const prisma = createStandalonePrisma();

const LEGISLATORS_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml";

interface Legislator {
  id: { bioguide: string };
  terms: { phone?: string }[];
}

async function main() {
  console.log("Fetching legislators-current.yaml …");
  const res = await fetch(LEGISLATORS_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const text = await res.text();
  const legislators: Legislator[] = parseYaml(text);
  console.log(`Fetched ${legislators.length} legislators.`);

  let updated = 0;
  let skipped = 0;

  for (const leg of legislators) {
    const bioguideId = leg.id.bioguide;
    const phone = leg.terms[leg.terms.length - 1]?.phone ?? null;

    if (!phone) {
      skipped++;
      continue;
    }

    const result = await prisma.representative.updateMany({
      where: { bioguideId },
      data: { phone },
    });

    if (result.count > 0) updated++;
    else skipped++;
  }

  console.log(`Done. Updated ${updated} reps, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
