/**
 * Verification script for the AI chat rebuild.
 *
 * Exercises:
 *  - parseSectionsFromFullText against real BillTextVersion rows (parsed XML format)
 *  - parseSectionsFromFullText against raw HTML fallback
 *  - empty/null input handling
 *  - section index + filter helpers
 *
 * Run with: npx tsx src/scripts/verify-bill-sections.ts
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  parseSectionsFromFullText,
  buildSectionIndex,
  filterSections,
} from "../lib/bill-sections";

let pass = 0;
let fail = 0;

function assert(cond: unknown, label: string, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    fail++;
  }
}

async function testParsedFormatRealBill() {
  console.log("\n[1] Real BillTextVersion (parsed XML format)");

  // Find a substantive BillTextVersion that does NOT look like raw HTML
  const versions = await prisma.billTextVersion.findMany({
    where: { fullText: { not: null } },
    orderBy: { versionDate: "desc" },
    take: 50,
    include: { bill: { select: { title: true } } },
  });

  const parsed = versions.find(
    (v) =>
      v.fullText &&
      !v.fullText.trimStart().startsWith("<html") &&
      !v.fullText.trimStart().startsWith("<pre"),
  );

  if (!parsed) {
    console.log("  ⚠ no parsed-format BillTextVersion found in DB — skipping");
    return;
  }

  console.log(
    `  using bill: "${parsed.bill.title.slice(0, 70)}" (${parsed.versionCode}, ${parsed.fullText!.length} chars)`,
  );

  const sections = parseSectionsFromFullText(parsed.fullText!);
  assert(sections.length > 0, "produces at least one section");
  assert(
    sections.every((s) => s.heading && s.sectionRef),
    "every section has heading + sectionRef",
  );
  assert(
    sections.some((s) => s.content.length > 0),
    "at least one section has content",
  );

  const sample = sections.slice(0, 3);
  for (const s of sample) {
    console.log(
      `    [${s.sectionRef}] ${s.heading.slice(0, 70)} (${s.content.length} chars)`,
    );
  }

  // Section index
  const index = buildSectionIndex(sections);
  assert(
    index.includes(sections[0].sectionRef),
    "buildSectionIndex includes refs",
  );

  // Filter helper
  const firstRef = sections[0].sectionRef;
  const filtered = filterSections(sections, [firstRef]);
  assert(filtered.length >= 1, "filterSections matches a known ref");
}

async function testHtmlFallback() {
  console.log("\n[2] HTML fallback path");

  // Try a real raw-HTML version first
  const htmlVersion = await prisma.billTextVersion.findFirst({
    where: {
      OR: [
        { fullText: { startsWith: "<html" } },
        { fullText: { startsWith: "<pre" } },
      ],
    },
    include: { bill: { select: { title: true } } },
  });

  if (htmlVersion) {
    console.log(
      `  using real HTML version: ${htmlVersion.bill.title.slice(0, 70)} (${htmlVersion.versionCode})`,
    );
    const sections = parseSectionsFromFullText(htmlVersion.fullText!);
    assert(sections.length > 0, "raw HTML produces at least one section");
    assert(
      sections.every((s) => !s.content.includes("<")),
      "stripped HTML tags from content",
    );
  } else {
    console.log("  no real raw-HTML version in DB — using synthetic");
  }

  // Synthetic test: HTML with SEC. patterns
  const synthHtml = `<html><body><pre>
A BILL

To do something important.

SEC. 1. SHORT TITLE.
This Act may be cited as the "Fake Act".

SEC. 2. DEFINITIONS.
In this Act, the term "Secretary" means the Secretary of Defense.

SEC. 3. AUTHORIZATION.
There is authorized to be appropriated such sums as may be necessary.
</pre></body></html>`;

  const sections = parseSectionsFromFullText(synthHtml);
  assert(
    sections.length >= 3,
    `synthetic HTML extracts 3+ sections (got ${sections.length})`,
  );
  assert(
    sections.some((s) => s.sectionRef === "Section 1"),
    "extracts Section 1 ref",
  );
  assert(
    sections.some((s) => s.sectionRef === "Section 2"),
    "extracts Section 2 ref",
  );
  assert(
    sections.some((s) => s.heading.toUpperCase().includes("DEFINITIONS")),
    "preserves DEFINITIONS heading",
  );
  assert(
    !sections.some(
      (s) => s.content.includes("<pre>") || s.content.includes("</pre>"),
    ),
    "tags fully stripped",
  );

  // HTML with no SEC pattern → single block fallback
  const blob = `<html><body><pre>Just a paragraph with no section markers at all.</pre></body></html>`;
  const blobSections = parseSectionsFromFullText(blob);
  assert(
    blobSections.length === 1,
    "no-section HTML falls back to single block",
  );
  assert(
    blobSections[0].sectionRef === "Full Text",
    "fallback uses 'Full Text' ref",
  );
}

function testEmptyAndEdgeCases() {
  console.log("\n[3] Empty / null / edge cases");

  assert(parseSectionsFromFullText("").length === 0, "empty string → []");
  assert(
    parseSectionsFromFullText("   \n\n  ").length === 0,
    "whitespace-only → []",
  );

  // Orphan text before any heading
  const orphan = "Some intro text\n\nSection 1. Title\nbody";
  const orphanSections = parseSectionsFromFullText(orphan);
  assert(
    orphanSections.some((s) => s.sectionRef === "Preamble"),
    "orphan leading text → Preamble section",
  );
  assert(
    orphanSections.some((s) => s.sectionRef === "Section 1"),
    "real section still parsed after preamble",
  );

  // Hierarchical heading with " > "
  const nested =
    "Section 2. Definitions > (a) In general\nThe term means stuff.";
  const nestedSections = parseSectionsFromFullText(nested);
  assert(
    nestedSections[0]?.sectionRef === "Section 2(a)",
    `nested heading → "Section 2(a)" (got "${nestedSections[0]?.sectionRef}")`,
  );

  // filterSections empty refs
  assert(
    filterSections(nestedSections, []).length === 0,
    "filterSections([]) returns empty",
  );
}

async function main() {
  try {
    await testParsedFormatRealBill();
  } catch (e) {
    console.log(`  ✗ exception: ${(e as Error).message}`);
    fail++;
  }

  try {
    await testHtmlFallback();
  } catch (e) {
    console.log(`  ✗ exception: ${(e as Error).message}`);
    fail++;
  }

  testEmptyAndEdgeCases();

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main();
