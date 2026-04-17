import axios from "axios";
import dayjs from "dayjs";
import { parseStringPromise } from "xml2js";
import { BillXmlParser, type ParsedChunk } from "./bill-xml-parser";

const CONGRESS_API_KEY = process.env.CONGRESS_DOT_GOV_API_KEY || "DEMO_KEY";

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
      congressApiClient.get(
        `/bill/${congress}/${apiBillType}/${billNumber}/text`,
      ),
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
  billNumber: number,
): Promise<TextVersion | null> {
  try {
    const response = await withRetry(() =>
      congressApiClient.get(
        `/bill/${congress}/${apiBillType}/${billNumber}/text`,
      ),
    );

    const textVersions = response.data?.textVersions as TextVersion[];
    if (!textVersions || textVersions.length === 0) return null;

    const sorted = textVersions
      .filter((tv) => !!tv.date)
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    return sorted.length > 0 ? sorted[0] : textVersions[0];
  } catch (error: unknown) {
    console.error(
      "Failed to fetch text versions:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Download the Formatted XML and Formatted Text for a bill.
 */
export async function downloadTextFormats(
  latestVersion: TextVersion,
  billId: string,
): Promise<{ rawXml: string | null; rawText: string | null }> {
  const xmlFormat = latestVersion.formats.find(
    (fmt) => fmt.type === "Formatted XML",
  );
  const textFormat = latestVersion.formats.find(
    (fmt) => fmt.type === "Formatted Text",
  );

  if (!xmlFormat?.url) {
    console.warn(`No Formatted XML URL found for ${billId}`);
    return { rawXml: null, rawText: null };
  }

  try {
    const { data: rawXml } = await axios.get(xmlFormat.url, {
      timeout: 15_000,
    });
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
      error instanceof Error ? error.message : error,
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
    const raw = await fetchAllPages<Record<string, unknown>>(
      `/bill/${congress}/${apiBillType}/${billNumber}/actions`,
      "actions",
    );
    if (raw === null) return null;

    return raw.map((a) => {
      const actionDate = typeof a.actionDate === "string" ? a.actionDate : "";
      const text = typeof a.text === "string" ? a.text : "";
      const type = typeof a.type === "string" ? a.type : null;
      const sourceName =
        typeof (a.sourceSystem as { name?: unknown })?.name === "string"
          ? (a.sourceSystem as { name: string }).name
          : "";
      const chamber: string | null =
        sourceName === "Senate"
          ? "Senate"
          : sourceName.includes("House")
            ? "House"
            : null;
      return { actionDate, text, type, chamber };
    });
  } catch (error: unknown) {
    console.error(
      "Failed to fetch bill actions:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Fetch every page of a Congress.gov list endpoint by following the
 * `pagination.next` link (or incrementing offset when next is absent).
 * Caps total rows so a runaway response doesn't blow out memory.
 * Returns whatever was collected when a mid-sequence page fails — partial
 * data beats no data for cosponsor/action enrichment.
 */
const PAGE_LIMIT = 250;
const MAX_PAGES = 20; // 5,000 rows max per resource — way above anything Congress publishes.

async function fetchAllPages<T>(
  path: string,
  arrayKey: string,
): Promise<T[] | null> {
  const collected: T[] = [];
  let offset = 0;
  let shapeOk = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    let res;
    try {
      res = await withRetry(() =>
        congressApiClient.get(path, {
          params: { limit: PAGE_LIMIT, offset },
        }),
      );
    } catch (err) {
      // Bail with partial data if a mid-sequence page fails — calling code
      // already tolerates empty results, and we've at least captured the
      // pages we successfully fetched before the failure.
      if (page === 0) throw err;
      break;
    }

    const arr = res.data?.[arrayKey];
    if (!Array.isArray(arr)) {
      return shapeOk ? collected : null;
    }
    shapeOk = true;
    collected.push(...(arr as T[]));

    // Stop when the server returns fewer than a full page — there can't be more.
    if (arr.length < PAGE_LIMIT) break;

    const nextUrl: unknown = res.data?.pagination?.next;
    if (typeof nextUrl !== "string" || nextUrl.length === 0) break;
    offset += PAGE_LIMIT;
  }

  return collected;
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
  sponsor: string | null; // "Sen. Rick Scott (R-FL)"
  cosponsorCount: number | null;
  cosponsorPartySplit: string | null; // "5 D, 3 R"
  policyArea: string | null;
  latestActionDate: string | null;
  latestActionText: string | null;
  /** Plain-text CRS summary, most recent version. Null if none published. */
  shortText: string | null;
}

/**
 * Individual cosponsor record from Congress.gov, keyed by bioguideId for
 * joining to our Representative table. Includes the signals we care about
 * beyond the count: when they signed on, whether they were original
 * cosponsors (signed at introduction), and whether they later withdrew.
 */
export interface BillCosponsorRecord {
  bioguideId: string;
  firstName: string | null;
  lastName: string | null;
  party: string | null;
  state: string | null;
  district: number | null;
  sponsorshipDate: string | null;
  sponsorshipWithdrawnDate: string | null;
  isOriginalCosponsor: boolean;
}

/**
 * Fetch every individual cosponsor for a bill from Congress.gov, paginating
 * past the 250-per-request ceiling. Returns whatever was successfully
 * collected on mid-sequence failure; returns an empty array on full failure —
 * this is a supplementary signal, not core metadata.
 */
export async function fetchBillCosponsors(
  congress: number,
  apiBillType: string,
  billNumber: number,
): Promise<BillCosponsorRecord[]> {
  try {
    const raw = await fetchAllPages<Record<string, unknown>>(
      `/bill/${congress}/${apiBillType}/${billNumber}/cosponsors`,
      "cosponsors",
    );
    if (raw === null) return [];
    return raw
      .map((c) => {
        const bioguideId =
          typeof c.bioguideId === "string" ? c.bioguideId : null;
        if (!bioguideId) return null;
        return {
          bioguideId,
          firstName: typeof c.firstName === "string" ? c.firstName : null,
          lastName: typeof c.lastName === "string" ? c.lastName : null,
          party: typeof c.party === "string" ? c.party : null,
          state: typeof c.state === "string" ? c.state : null,
          district: typeof c.district === "number" ? c.district : null,
          sponsorshipDate:
            typeof c.sponsorshipDate === "string" ? c.sponsorshipDate : null,
          sponsorshipWithdrawnDate:
            typeof c.sponsorshipWithdrawnDate === "string"
              ? c.sponsorshipWithdrawnDate
              : null,
          isOriginalCosponsor: c.isOriginalCosponsor === true,
        } satisfies BillCosponsorRecord;
      })
      .filter((c): c is BillCosponsorRecord => c !== null);
  } catch (error: unknown) {
    console.error(
      "Failed to fetch bill cosponsors:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

/**
 * Extract plain text from Congress.gov summary HTML.
 * Summaries come wrapped in `<p>` tags with inline markup; strip it all for
 * display on the bills listing card.
 *
 * Congress.gov summaries conventionally start with the bill's popular name
 * wrapped as `<p><strong>Popular Bill Name</strong></p>` before the actual
 * summary body. On the bill detail page the displayed title is often the
 * same text, causing a visible duplicate. Strip that leading header if
 * present so the summary begins with the body ("This bill...").
 */
function stripHtml(html: string): string {
  const withoutLeadingHeader = html.replace(
    /^\s*<p>\s*<(?:strong|b)>[^<]+<\/(?:strong|b)>\s*<\/p>\s*/i,
    "",
  );
  return withoutLeadingHeader
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch the most recent CRS summary for a bill from Congress.gov.
 * Summaries are non-partisan plain-language abstracts written by the
 * Congressional Research Service. Returns null if none published yet
 * (CRS coverage is incomplete — newly introduced bills often lack summaries).
 */
async function fetchBillSummary(
  congress: number,
  apiBillType: string,
  billNumber: number,
): Promise<string | null> {
  try {
    const res = await withRetry(() =>
      congressApiClient.get(
        `/bill/${congress}/${apiBillType}/${billNumber}/summaries`,
      ),
    );
    const summaries: Array<{
      text?: string;
      updateDate?: string;
      actionDate?: string;
    }> = res.data?.summaries ?? [];
    if (summaries.length === 0) return null;

    // Pick the most recent summary by updateDate (falls back to actionDate).
    const sorted = [...summaries].sort((a, b) => {
      const aDate = a.updateDate || a.actionDate || "";
      const bDate = b.updateDate || b.actionDate || "";
      return bDate.localeCompare(aDate);
    });
    const latest = sorted[0];
    if (!latest.text) return null;

    const plain = stripHtml(latest.text);
    return plain || null;
  } catch {
    return null;
  }
}

export async function fetchBillMetadata(
  congress: number,
  apiBillType: string,
  billNumber: number,
): Promise<BillMetadata | null> {
  try {
    const [billRes, cosponsorList, summary] = await Promise.all([
      withRetry(() =>
        congressApiClient.get(`/bill/${congress}/${apiBillType}/${billNumber}`),
      ),
      // Full list, paginated — cosponsorCount below is taken from the bill
      // endpoint, but partySplit derives from the actual list we've fetched
      // so we need the full roster to avoid undercounting big bills.
      fetchAllPages<{ party?: string }>(
        `/bill/${congress}/${apiBillType}/${billNumber}/cosponsors`,
        "cosponsors",
      ).catch(() => null),
      fetchBillSummary(congress, apiBillType, billNumber),
    ]);

    const bill = billRes.data?.bill;
    if (!bill) return null;

    const sponsorItem = Array.isArray(bill.sponsors) ? bill.sponsors[0] : null;
    const sponsor = sponsorItem
      ? `${sponsorItem.fullName ?? ""}`.trim() || null
      : null;

    const safeCosponsorList = cosponsorList ?? [];
    let partySplit: string | null = null;
    if (safeCosponsorList.length > 0) {
      const counts: Record<string, number> = {};
      for (const c of safeCosponsorList) {
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
        bill.cosponsors?.count ?? safeCosponsorList.length ?? null,
      cosponsorPartySplit: partySplit,
      policyArea: bill.policyArea?.name ?? null,
      latestActionDate: bill.latestAction?.actionDate ?? null,
      latestActionText: bill.latestAction?.text ?? null,
      shortText: summary,
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
  rawXml: string,
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
