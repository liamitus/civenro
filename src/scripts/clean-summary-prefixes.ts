import "dotenv/config";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();

/**
 * One-off cleaner for CRS summaries that were ingested before congress-api.ts
 * learned to strip the leading `<p><strong>Popular Name</strong></p>` header.
 *
 * Those early-fetched summaries have the bill's popular name as their first
 * line of plain text, which visibly duplicates the card title. Re-fetching
 * from Congress.gov would burn another rate-limit window — instead, detect
 * the prefix pattern heuristically and slice it off in place.
 *
 * Heuristic: find the earliest standard CRS opener phrase ("This bill...",
 * "This Act...", etc.) in the first ~250 chars. If one exists and sits
 * after position 0, everything before it is the header we want to drop.
 *
 * Usage:
 *   npx tsx src/scripts/clean-summary-prefixes.ts            # clean all
 *   npx tsx src/scripts/clean-summary-prefixes.ts --dry-run  # preview only
 */

const OPENER_PATTERNS: RegExp[] = [
  /\bThis bill\b/,
  /\bThis Act\b/,
  /\bThis joint resolution\b/i,
  /\bThis concurrent resolution\b/i,
  /\bThis resolution\b/,
  /\bThis section\b/,
  /\bThe bill\b/,
  /\bThe Act\b/,
  /\bAmends the\b/,
  /\bEstablishes the\b/,
  /\bAuthorizes appropriations\b/,
  /\bDirects the\b/,
  /\bProhibits\b/,
  /\bRequires the\b/,
  /\bExpresses the\b/,
];

const MAX_HEADER_LENGTH = 250;

function cleanPrefix(text: string): string {
  let earliest = -1;
  for (const pattern of OPENER_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      if (earliest === -1 || match.index < earliest) {
        earliest = match.index;
      }
    }
  }
  if (earliest > 0 && earliest < MAX_HEADER_LENGTH) {
    return text.slice(earliest).trimStart();
  }
  return text;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const bills = await prisma.bill.findMany({
    where: { shortText: { not: null } },
    select: { id: true, billId: true, shortText: true },
  });

  console.log(`Scanning ${bills.length} bills with stored CRS summaries…`);

  let changed = 0;
  let unchanged = 0;
  const examples: Array<{ billId: string; before: string; after: string }> = [];

  for (const bill of bills) {
    const before = bill.shortText!;
    const after = cleanPrefix(before);
    if (after === before) {
      unchanged++;
      continue;
    }
    changed++;
    if (examples.length < 5) {
      examples.push({
        billId: bill.billId,
        before: before.slice(0, 100),
        after: after.slice(0, 100),
      });
    }
    if (!dryRun) {
      await prisma.bill.update({
        where: { id: bill.id },
        data: { shortText: after },
      });
    }
  }

  console.log(`\n${changed} changed, ${unchanged} unchanged.`);
  console.log("\nFirst 5 examples:");
  for (const ex of examples) {
    console.log(`\n  ${ex.billId}`);
    console.log(`    before: "${ex.before}..."`);
    console.log(`    after:  "${ex.after}..."`);
  }
  if (dryRun) {
    console.log("\n(dry run — no DB writes)");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
