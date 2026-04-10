import "dotenv/config";
import { generateChangeSummary } from "../lib/ai";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();

/**
 * Generate AI-powered change summaries for bill text versions that don't have one yet.
 * Compares each version to its predecessor and stores a plain-language summary.
 */
export async function generateChangeSummariesFunction(targetBillId?: number) {
  console.log(
    "Generating change summaries for:",
    targetBillId ? `bill ${targetBillId}` : "all bills with missing summaries",
  );

  try {
    // Find bills that have versions without summaries
    const billFilter = targetBillId ? { id: targetBillId } : {};
    const bills = await prisma.bill.findMany({
      where: {
        ...billFilter,
        textVersions: {
          some: { changeSummary: null },
        },
      },
      select: {
        id: true,
        title: true,
        textVersions: {
          orderBy: { versionDate: "asc" },
          select: {
            id: true,
            versionCode: true,
            versionType: true,
            versionDate: true,
            fullText: true,
            changeSummary: true,
            isSubstantive: true,
          },
        },
      },
    });

    console.log(`Found ${bills.length} bills with missing summaries.`);

    let generated = 0;

    for (const bill of bills) {
      console.log(`\n${bill.title.slice(0, 60)}...`);

      for (let i = 0; i < bill.textVersions.length; i++) {
        const version = bill.textVersions[i];

        // Skip if already has a summary
        if (version.changeSummary) continue;

        // First version — set baseline summary, no AI needed
        if (i === 0) {
          await prisma.billTextVersion.update({
            where: { id: version.id },
            data: { changeSummary: "Initial version of the bill as introduced." },
          });
          console.log(`  ${version.versionCode.toUpperCase()} — baseline (no AI)`);
          continue;
        }

        const previous = bill.textVersions[i - 1];

        // Need text from both versions to generate a meaningful summary
        if (!previous.fullText || !version.fullText) {
          const msg = "Text comparison unavailable — one or both versions are missing full text.";
          await prisma.billTextVersion.update({
            where: { id: version.id },
            data: { changeSummary: msg },
          });
          console.log(`  ${version.versionCode.toUpperCase()} — no text available`);
          continue;
        }

        // Generate AI summary
        try {
          console.log(
            `  ${version.versionCode.toUpperCase()} (${previous.versionCode} → ${version.versionCode}) — generating...`,
          );

          const summaryResult = await generateChangeSummary(
            bill.title,
            previous.fullText,
            version.fullText,
            previous.versionType,
            version.versionType,
          );

          await prisma.billTextVersion.update({
            where: { id: version.id },
            data: { changeSummary: summaryResult.content },
          });

          console.log(`    "${summaryResult.content.slice(0, 100)}..."`);
          generated++;
        } catch (error: unknown) {
          console.error(
            `  ${version.versionCode.toUpperCase()} — AI error:`,
            error instanceof Error ? error.message : error,
          );
        }

        // Rate limit: ~1 AI call per 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`\nDone. Generated ${generated} change summaries.`);
  } catch (error: unknown) {
    console.error(
      "Error in generateChangeSummaries:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const billId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  generateChangeSummariesFunction(billId);
}
