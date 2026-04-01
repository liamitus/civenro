import "dotenv/config";
import {
  fetchLatestTextVersion,
  downloadTextFormats,
  parseXmlIntoSections,
} from "../lib/congress-api";
import { parseBillId } from "../lib/parse-bill-id";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();

/**
 * Fetch bill text from congress.gov and store the full text in the Bill record.
 * Unlike the old approach (separate BillText chunks + S3), we store fullText directly.
 */
export async function fetchBillTextFunction(targetBillId?: string) {
  console.log("Fetching bill text for:", targetBillId || "bills without text");
  try {
    const billsNeedingText = targetBillId
      ? await prisma.bill.findMany({ where: { billId: targetBillId }, take: 1 })
      : await prisma.bill.findMany({ where: { fullText: null }, take: 10 });

    console.log(`Found ${billsNeedingText.length} bills needing text.`);

    for (const bill of billsNeedingText) {
      try {
        const { congress, apiBillType, billNumber } = parseBillId(bill.billId);
        if (!congress || !apiBillType || !billNumber) {
          console.warn(`Skipping bill ${bill.billId} — invalid parse.`);
          continue;
        }

        const latestVersion = await fetchLatestTextVersion(
          congress,
          apiBillType,
          billNumber
        );
        if (!latestVersion) {
          console.warn(`No text versions found for ${bill.billId}.`);
          continue;
        }

        const { rawXml, rawText } = await downloadTextFormats(
          latestVersion,
          bill.billId
        );
        if (!rawXml && !rawText) {
          console.warn(`No text content for ${bill.billId}. Skipping.`);
          continue;
        }

        // Try to build structured text from XML sections, fall back to raw text
        let fullText = rawText || "";
        if (rawXml) {
          try {
            const sections = await parseXmlIntoSections(rawXml);
            if (sections.length > 0) {
              fullText = sections
                .map((s) => {
                  const heading = s.path.length > 0 ? s.path.join(" > ") + "\n" : "";
                  return heading + s.content;
                })
                .join("\n\n");
            }
          } catch {
            console.warn(`XML parse failed for ${bill.billId}, using raw text.`);
          }
        }

        await prisma.bill.update({
          where: { id: bill.id },
          data: { fullText },
        });

        console.log(`Saved text for Bill ${bill.billId} (${fullText.length} chars).`);
      } catch (error: unknown) {
        console.error(
          `Error processing bill ${bill.billId}:`,
          error instanceof Error ? error.message : error
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Finished fetching bill texts.");
  } catch (error: unknown) {
    console.error(
      "Error in fetchBillText:",
      error instanceof Error ? error.message : error
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const billId = process.argv[2];
  fetchBillTextFunction(billId);
}
