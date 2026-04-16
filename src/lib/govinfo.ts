import axios from "axios";

/**
 * Fallback bill-text fetcher using GPO's GovInfo bulk data service.
 *
 * Context: congress.gov's `/bill/{n}/{type}/{num}/text` API sometimes returns
 * an empty `textVersions` array for bills that ARE published and have text
 * accessible through GovInfo. This module provides a fallback path so we
 * don't leave those bills textless for our AI chat.
 *
 * URL pattern:
 *   https://www.govinfo.gov/content/pkg/BILLS-{congress}{type}{num}{ver}/xml/BILLS-{congress}{type}{num}{ver}.xml
 *
 * Where {ver} is one of ih, is, rh, rs, eh, es, enr, ats, ath, pch, pcs.
 *
 * Error detection: GovInfo returns HTTP 200 with `Content-Type: text/html`
 * for missing packages (a friendly "content not found" page). Real bill XML
 * comes back as `application/xml`. We check Content-Type, not size.
 */

// Version codes ordered by preference — terminal states first so we capture
// the most recent/authoritative text when multiple versions exist. Matches
// the isSubstantive priority in src/lib/version-helpers.ts.
const VERSION_CODES = [
  "enr", // Enrolled — passed both chambers
  "pcs", // Placed on calendar, Senate
  "pch", // Placed on calendar, House
  "eas", // Engrossed amendment, Senate
  "eah", // Engrossed amendment, House
  "es", // Engrossed in Senate
  "eh", // Engrossed in House
  "rs", // Reported in Senate
  "rh", // Reported in House
  "ats", // Agreed to Senate
  "ath", // Agreed to House
  "is", // Introduced in Senate
  "ih", // Introduced in House
] as const;

export interface GovInfoTextResult {
  xml: string;
  versionCode: string; // the code that matched (e.g. "ih")
  url: string;
}

const UA = "Govroll/1.0 (civic transparency; +https://govroll.com)";

/** HEAD probe returning priority-index on hit, -1 on miss. */
async function probeExists(
  url: string,
  priorityIndex: number,
): Promise<number> {
  try {
    const head = await axios.head(url, {
      timeout: 5_000,
      validateStatus: () => true,
      maxRedirects: 5,
      headers: { "User-Agent": UA },
    });
    if (head.status !== 200) return -1;
    const contentType = String(head.headers["content-type"] ?? "").toLowerCase();
    // Real bill XML → application/xml. Error page → text/html.
    if (!contentType.includes("xml")) return -1;
    return priorityIndex;
  } catch {
    return -1;
  }
}

/**
 * Try GovInfo for a bill. Probes all version codes in parallel (HEAD requests)
 * to find which packages exist, then downloads the highest-priority match.
 * Parallel probing keeps per-bill cost to roughly one round-trip instead of
 * serial 13×; total time ~1s rather than ~2-4s, which keeps the per-function
 * budget within Vercel's 60s cap.
 */
export async function fetchBillTextFromGovInfo(
  congress: number,
  apiBillType: string, // must be GovInfo-style: "hr", "s", "hjres", etc.
  billNumber: number,
): Promise<GovInfoTextResult | null> {
  const urls = VERSION_CODES.map((v, idx) => {
    const pkg = `BILLS-${congress}${apiBillType}${billNumber}${v}`;
    return {
      version: v,
      idx,
      url: `https://www.govinfo.gov/content/pkg/${pkg}/xml/${pkg}.xml`,
    };
  });

  // Fire all HEADs in parallel. Each returns its priority index on hit.
  const hits = await Promise.all(
    urls.map((u) => probeExists(u.url, u.idx)),
  );

  // Pick the highest-priority hit (lowest index).
  let bestIdx = Number.POSITIVE_INFINITY;
  for (const h of hits) if (h >= 0 && h < bestIdx) bestIdx = h;
  if (!Number.isFinite(bestIdx)) return null;

  const target = urls[bestIdx];

  try {
    const res = await axios.get<string>(target.url, {
      timeout: 15_000,
      responseType: "text",
      maxRedirects: 5,
      headers: { "User-Agent": UA },
      transformResponse: [(data) => data],
    });
    if (typeof res.data !== "string" || res.data.length < 200) return null;
    const head200 = res.data.slice(0, 200);
    if (!/<\?xml|<bill|<resolution/i.test(head200)) return null;
    return { xml: res.data, versionCode: target.version, url: target.url };
  } catch {
    return null;
  }
}

/** Exported for logging/testing — which codes we try, in order. */
export const GOVINFO_VERSION_PRIORITY: readonly string[] = VERSION_CODES;
