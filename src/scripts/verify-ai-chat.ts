/**
 * End-to-end smoke test for the AI chat pipeline.
 * Calls the same code paths the API route uses, against the SAVE Act.
 *
 * Run: npx tsx src/scripts/verify-ai-chat.ts
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { parseSectionsFromFullText } from "../lib/bill-sections";
import { generateBillChatAnswer } from "../lib/ai";

async function main() {
  // Find the SAVE Act
  // Find any bill that has at least one BillTextVersion with text. Prefer SAVE.
  const candidates = await prisma.bill.findMany({
    where: { textVersions: { some: { fullText: { not: null } } } },
    include: {
      textVersions: {
        where: { fullText: { not: null } },
        orderBy: { versionDate: "desc" },
        take: 5,
      },
    },
    take: 50,
  });
  if (candidates.length === 0) {
    console.log("No bills with text versions found");
    process.exit(1);
  }
  const bill =
    candidates.find((b) =>
      /Safeguard American Voter|SAVE America/i.test(b.title),
    ) || candidates[0];
  console.log(`Bill: ${bill.title}`);
  console.log(
    `Versions with text: ${bill.textVersions.map((v) => v.versionCode).join(", ")}`,
  );

  // Prefer the parsed (es) version over raw HTML (eah)
  const preferred =
    bill.textVersions.find(
      (v) =>
        !v.fullText!.trimStart().startsWith("<html") &&
        !v.fullText!.trimStart().startsWith("<pre"),
    ) || bill.textVersions[0];

  console.log(
    `Using version: ${preferred.versionCode} (${preferred.fullText!.length} chars)`,
  );

  const sections = parseSectionsFromFullText(preferred.fullText!);
  console.log(`Parsed into ${sections.length} sections\n`);

  const questions = [
    "What documents count as proof of citizenship under this bill?",
    "Does this bill apply to people who are already registered to vote?",
  ];

  for (const q of questions) {
    console.log(`─── Q: ${q} ───`);
    const start = Date.now();
    const result = await generateBillChatAnswer(bill.title, sections, [], q);
    const answer = result.content;
    const ms = Date.now() - start;
    console.log(answer);
    console.log(`\n[${ms}ms, ${answer.length} chars]`);

    // Heuristic checks
    const hasBlockquote = answer.includes(">");
    const hasSectionRef = /Section\s+\d/i.test(answer);
    console.log(
      `checks: blockquote=${hasBlockquote ? "✓" : "✗"} section-ref=${hasSectionRef ? "✓" : "✗"}\n`,
    );
  }

  // Test the no-sections fallback
  console.log("─── Q (no sections): generic question with empty bill text ───");
  const emptyResult = await generateBillChatAnswer(
    bill.title,
    null,
    [],
    "What is this bill about?",
  );
  const emptyAnswer = emptyResult.content;
  console.log(emptyAnswer.slice(0, 400));
  const disclaimed = /cannot|don't have|no.*text|without/i.test(emptyAnswer);
  console.log(`\nfallback disclaims missing text: ${disclaimed ? "✓" : "✗"}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
