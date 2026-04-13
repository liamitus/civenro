import axios from "axios";
import dayjs from "dayjs";
import { parseStringPromise } from "xml2js";
import { BillXmlParser, type ParsedChunk } from "./bill-xml-parser";

const CONGRESS_API_KEY =
  process.env.CONGRESS_DOT_GOV_API_KEY || "DEMO_KEY";

/**
 * Retry wrapper with linear backoff for transient API failures.
 * Used by cron pipeline calls — not user-facing requests.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1000,
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

const congressApiClient = axios.create({
  baseURL: "https://api.congress.gov/v3",
  timeout: 15_000,
  headers: { "User-Agent": "Govroll/1.0 (civic transparency platform)" },
  // format=json is required — the API defaults to XML when omitted, which silently
  // breaks every JSON-shaped response handler in this file.
  params: { api_key: CONGRESS_API_KEY, format: "json" },
});

export interface TextVersionMeta {
  date: string | null;
  type: string;
  formats: { type: string; url: string }[];
}

interface TextVersion {
  date: string;
  formats: { type: string; url: string }[];
}

/**
 * Fetch ALL text versions of a bill from congress.gov.
 * Returns versions sorted oldest-first.
 */
export async function fetchAllTextVersions(
  congress: number,
  apiBillType: string,
  billNumber: number,
): Promise<TextVersionMeta[]> {
  try {
    const response = await withRetry(() =>
      congressApiClient.get(`/bill/${congress}/${apiBillType}/${billNumber}/text`),
    );

    const versions = response.data?.textVersions as TextVersionMeta[];
    if (!Array.isArray(versions)) return [];

    // Sort oldest-first by date (null dates go last)
    return [...versions].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
    });
  } catch (error: unknown) {
    console.error(
      "Failed to fetch all text versions:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
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
    const response = await withRetry(() =>
      congressApiClient.get(`/bill/${congress}/${apiBillType}/${billNumber}/text`),
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
    const { data: rawXml } = await axios.get(xmlFormat.url, { timeout: 15_000 });
    let rawText: string | null = null;
    if (textFormat?.url) {
      const { data } = await axios.get(textFormat.url, { timeout: 15_000 });
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
 * Fetch legislative actions for a bill from congress.gov.
 * Returns actions sorted newest-first.
 */
export interface CongressAction {
  actionDate: string;
  text: string;
  type: string | null;
  chamber: string | null; // "Senate" | "House" | null
}

export async function fetchBillActions(
  congress: number,
  apiBillType: string,
  billNumber: number,
): Promise<CongressAction[] | null> {
  try {
    const response = await withRetry(() =>
      congressApiClient.get(`/bill/${congress}/${apiBillType}/${billNumber}/actions`, {
        params: { limit: 250 },
      }),
    );

    const actions = response.data?.actions;
    if (!Array.isArray(actions)) return null;

    return actions.map(
      (a: { actionDate?: string; text?: string; type?: string; sourceSystem?: { name?: string } }) => ({
        actionDate: a.actionDate ?? "",
        text: a.text ?? "",
        type: a.type ?? null,
        chamber: a.sourceSystem?.name === "Senate"
          ? "Senate"
          : a.sourceSystem?.name?.includes("House")
            ? "House"
            : null,
      }),
    );
  } catch (error: unknown) {
    console.error(
      "Failed to fetch bill actions:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Fetch the official title for a bill from Congress.gov.
 * Used to cross-check titles against GovTrack, which has been observed
 * to return wrong titles for some bill IDs.
 */
export async function fetchOfficialBillTitle(
  congress: number,
  apiBillType: string,
  billNumber: number,
): Promise<string | null> {
  try {
    const response = await withRetry(() =>
      congressApiClient.get(`/bill/${congress}/${apiBillType}/${billNumber}`),
    );
    return response.data?.bill?.title || null;
  } catch (error: unknown) {
    console.error(
      "Failed to fetch official bill title:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Bill metadata for AI chat context — sponsor, cosponsors, status, latest action.
 * Fetched on-demand from Congress.gov.
 */
export interface BillMetadata {
  sponsor: string | null;          // "Sen. Rick Scott (R-FL)"
  cosponsorCount: number | null;
  cosponsorPartySplit: string | null; // "5 D, 3 R"
  policyArea: string | null;
  latestActionDate: string | null;
  latestActionText: string | null;
}

export async function fetchBillMetadata(
  congress: number,
  apiBillType: string,
  billNumber: number,
): Promise<BillMetadata | null> {
  try {
    const [billRes, cosponsorsRes] = await Promise.all([
      withRetry(() =>
        congressApiClient.get(`/bill/${congress}/${apiBillType}/${billNumber}`),
      ),
      withRetry(() =>
        congressApiClient.get(`/bill/${congress}/${apiBillType}/${billNumber}/cosponsors`, {
          params: { limit: 250 },
        }),
      ).catch(() => null),
    ]);

    const bill = billRes.data?.bill;
    if (!bill) return null;

    const sponsorItem = Array.isArray(bill.sponsors) ? bill.sponsors[0] : null;
    const sponsor = sponsorItem
      ? `${sponsorItem.fullName ?? ""}`.trim() || null
      : null;

    type Cosponsor = { party?: string };
    const cosponsorList: Cosponsor[] = cosponsorsRes?.data?.cosponsors ?? [];
    let partySplit: string | null = null;
    if (cosponsorList.length > 0) {
      const counts: Record<string, number> = {};
      for (const c of cosponsorList) {
        const p = (c.party || "?").toUpperCase();
        counts[p] = (counts[p] || 0) + 1;
      }
      partySplit = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([p, n]) => `${n} ${p}`)
        .join(", ");
    }

    return {
      sponsor,
      cosponsorCount:
        bill.cosponsors?.count ?? cosponsorList.length ?? null,
      cosponsorPartySplit: partySplit,
      policyArea: bill.policyArea?.name ?? null,
      latestActionDate: bill.latestAction?.actionDate ?? null,
      latestActionText: bill.latestAction?.text ?? null,
    };
  } catch (error: unknown) {
    console.error(
      "Failed to fetch bill metadata:",
      error instanceof Error ? error.message : error,
    );
    return null;
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
