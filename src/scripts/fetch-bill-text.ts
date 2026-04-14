import "dotenv/config";
import {
  fetchAllTextVersions,
  downloadTextFormats,
  parseXmlIntoSections,
  fetchOfficialBillTitle,
  fetchBillMetadata,
} from "../lib/congress-api";
import type { TextVersionMeta } from "../lib/congress-api";
import { extractVersionCode, isSubstantiveVersion } from "../lib/version-helpers";
import { parseBillId } from "../lib/parse-bill-id";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();

/**
 * Parse raw XML or text into a consolidated fullText string.
 */
async function parseToFullText(
  rawXml: string | null,
  rawText: string | null,
  billId: string,
): Promise<string> {
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
      console.warn(`XML parse failed for ${billId}, using raw text.`);
    }
  }
  return fullText;
}

/**
 * Fetch bill text versions from congress.gov and store each version.
 * Also updates Bill.fullText with the latest version's text for backward compatibility.
 */
export async function fetchBillTextFunction(targetBillId?: string, limit = 10) {
  console.log(
    `Fetching bill text for: ${targetBillId || `up to ${limit} bills without text`}`,
  );
  try {
    const bills = targetBillId
      ? await prisma.bill.findMany({ where: { billId: targetBillId }, take: 1 })
      : await prisma.bill.findMany({
          where: { fullText: null },
          orderBy: { introducedDate: "desc" },
          take: limit,
        });

    console.log(`Found ${bills.length} bills to process.`);

    for (const bill of bills) {
      try {
        const { congress, apiBillType, billNumber } = parseBillId(bill.billId);
        if (!congress || !apiBillType || !billNumber) {
          console.warn(`Skipping bill ${bill.billId} — invalid parse.`);
          continue;
        }

        // Pull official title + metadata from Congress.gov (authoritative source).
        // The title cross-check catches GovTrack stale data; metadata feeds AI chat.
        const [officialTitle, metadata] = await Promise.all([
          fetchOfficialBillTitle(congress, apiBillType, billNumber),
          fetchBillMetadata(congress, apiBillType, billNumber),
        ]);

        const updates: Record<string, unknown> = {};
        if (
          officialTitle &&
          officialTitle.trim() &&
          officialTitle.trim() !== bill.title.trim()
        ) {
          console.warn(
            `  Title mismatch for ${bill.billId}:\n    stored:   ${bill.title}\n    official: ${officialTitle}\n  Updating stored title to match Congress.gov.`,
          );
          updates.title = officialTitle;
        }
        if (metadata) {
          updates.sponsor = metadata.sponsor;
          updates.cosponsorCount = metadata.cosponsorCount;
          updates.cosponsorPartySplit = metadata.cosponsorPartySplit;
          updates.policyArea = metadata.policyArea;
          updates.latestActionText = metadata.latestActionText;
          updates.latestActionDate = metadata.latestActionDate
            ? new Date(metadata.latestActionDate)
            : null;
          updates.shortText = metadata.shortText;
        }
        if (Object.keys(updates).length > 0) {
          await prisma.bill.update({ where: { id: bill.id }, data: updates });
          if (updates.title) bill.title = updates.title as string;
        }

        const allVersions = await fetchAllTextVersions(congress, apiBillType, billNumber);
        if (allVersions.length === 0) {
          console.warn(`No text versions found for ${bill.billId}.`);
          continue;
        }

        let latestFullText = "";
        let newVersionsCount = 0;

        for (const version of allVersions) {
          const versionCode = extractVersionCode(version.formats);
          if (!versionCode) {
            console.warn(`Could not extract version code for ${bill.billId} version: ${version.type}`);
            continue;
          }

          // Check if we already have this version
          const existing = await prisma.billTextVersion.findUnique({
            where: { billId_versionCode: { billId: bill.id, versionCode } },
          });

          if (existing?.fullText) {
            // Already have this version with text — skip download, but track for latestFullText
            latestFullText = existing.fullText;
            continue;
          }

          // Download and parse text for this version
          const fullText = await downloadAndParse(version, bill.billId);

          // Upsert the version record
          await prisma.billTextVersion.upsert({
            where: { billId_versionCode: { billId: bill.id, versionCode } },
            update: {
              fullText: fullText || undefined,
              versionType: version.type,
              versionDate: version.date ? new Date(version.date) : new Date(),
            },
            create: {
              billId: bill.id,
              versionCode,
              versionType: version.type,
              versionDate: version.date ? new Date(version.date) : new Date(),
              fullText,
              isSubstantive: isSubstantiveVersion(versionCode),
            },
          });

          if (fullText) latestFullText = fullText;
          newVersionsCount++;

          console.log(
            `  ${versionCode.toUpperCase()} (${version.type}) — ${fullText ? `${fullText.length} chars` : "no text"}`,
          );

          // Rate limit between downloads
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Update Bill.fullText with the latest version's text
        if (latestFullText) {
          await prisma.bill.update({
            where: { id: bill.id },
            data: { fullText: latestFullText },
          });
        }

        console.log(
          `${bill.billId}: ${allVersions.length} versions total, ${newVersionsCount} new.`,
        );
      } catch (error: unknown) {
        console.error(
          `Error processing bill ${bill.billId}:`,
          error instanceof Error ? error.message : error,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Finished fetching bill texts.");
  } catch (error: unknown) {
    console.error(
      "Error in fetchBillText:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Download text formats for a version and parse into a string.
 */
async function downloadAndParse(
  version: TextVersionMeta,
  billId: string,
): Promise<string | null> {
  // Need a TextVersion-compatible object for downloadTextFormats
  const textVersion = {
    date: version.date || "",
    formats: version.formats,
  };

  const { rawXml, rawText } = await downloadTextFormats(textVersion, billId);
  if (!rawXml && !rawText) return null;

  const fullText = await parseToFullText(rawXml, rawText, billId);
  return fullText || null;
}

if (require.main === module) {
  // Usage:
  //   tsx fetch-bill-text.ts                        → 10 bills without text
  //   tsx fetch-bill-text.ts <billId>               → just that bill
  //   tsx fetch-bill-text.ts --limit 100            → 100 bills without text
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || "10", 10) : 10;
  const billId =
    limitIdx === 0 ? undefined : args[0]?.startsWith("--") ? undefined : args[0];
  fetchBillTextFunction(billId, limit);
}
