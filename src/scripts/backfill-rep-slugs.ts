/**
 * Backfill slugs for all representatives that don't have one.
 *
 * Generates slugs like "alexandria-ocasio-cortez". If a name collision occurs
 * (e.g. two "John Smith" reps), appends the state: "john-smith-fl".
 *
 * Usage:
 *   npx tsx src/scripts/backfill-rep-slugs.ts
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import { nameToSlug } from "../lib/slug";

async function main() {
  const reps = await prisma.representative.findMany({
    where: { slug: null },
    select: { id: true, firstName: true, lastName: true, state: true },
  });

  if (reps.length === 0) {
    console.log("All representatives already have slugs.");
    return;
  }

  console.log(`Backfilling slugs for ${reps.length} representatives...`);

  // First pass: generate base slugs, detect collisions
  const slugMap = new Map<string, typeof reps>();
  for (const rep of reps) {
    const base = nameToSlug(rep.firstName, rep.lastName);
    if (!slugMap.has(base)) slugMap.set(base, []);
    slugMap.get(base)!.push(rep);
  }

  let updated = 0;
  for (const [base, group] of slugMap) {
    const needsDisambiguation = group.length > 1;

    for (const rep of group) {
      const slug = needsDisambiguation
        ? `${base}-${rep.state.toLowerCase()}`
        : base;

      await prisma.representative.update({
        where: { id: rep.id },
        data: { slug },
      });
      updated++;
    }
  }

  console.log(`Done. Updated ${updated} representatives.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
