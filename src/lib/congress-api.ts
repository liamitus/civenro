import axios from "axios";
import dayjs from "dayjs";
import { parseStringPromise } from "xml2js";
import { BillXmlParser, type ParsedChunk } from "./bill-xml-parser";

interface TextVersion {
  date: string;
  formats: { type: string; url: string }[];
}

/**
 * Fetch the latest text version of a bill from congress.gov.
 */
export async function fetchLatestTextVersion(
  congress: number,
  apiBillType: string,
  billNumber: number
): Promise<TextVersion | null> {
  try {
    const response = await axios.get(
      `https://api.congress.gov/v3/bill/${congress}/${apiBillType}/${billNumber}/text`,
      { params: { api_key: process.env.CONGRESS_DOT_GOV_API_KEY } }
    );

    const textVersions = response.data?.textVersions as TextVersion[];
    if (!textVersions || textVersions.length === 0) return null;

    const sorted = textVersions
      .filter((tv) => !!tv.date)
      .sort(
        (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
      );

    return sorted.length > 0 ? sorted[0] : textVersions[0];
  } catch (error: unknown) {
    console.error(
      "Failed to fetch text versions:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Download the Formatted XML and Formatted Text for a bill.
 */
export async function downloadTextFormats(
  latestVersion: TextVersion,
  billId: string
): Promise<{ rawXml: string | null; rawText: string | null }> {
  const xmlFormat = latestVersion.formats.find(
    (fmt) => fmt.type === "Formatted XML"
  );
  const textFormat = latestVersion.formats.find(
    (fmt) => fmt.type === "Formatted Text"
  );

  if (!xmlFormat?.url) {
    console.warn(`No Formatted XML URL found for ${billId}`);
    return { rawXml: null, rawText: null };
  }

  try {
    const { data: rawXml } = await axios.get(xmlFormat.url);
    let rawText: string | null = null;
    if (textFormat?.url) {
      const { data } = await axios.get(textFormat.url);
      rawText = typeof data === "string" ? data : null;
    }
    return {
      rawXml: typeof rawXml === "string" ? rawXml : null,
      rawText,
    };
  } catch (error: unknown) {
    console.error(
      `Error downloading text for ${billId}:`,
      error instanceof Error ? error.message : error
    );
    return { rawXml: null, rawText: null };
  }
}

/**
 * Parse XML into structured sections using BillXmlParser.
 */
export async function parseXmlIntoSections(
  rawXml: string
): Promise<ParsedChunk[]> {
  const xmlObj = await parseStringPromise(rawXml, {
    preserveChildrenOrder: true,
    explicitChildren: true,
    charsAsChildren: true,
    trim: true,
    includeWhiteChars: false,
  });
  return BillXmlParser.extractSections(xmlObj);
}
