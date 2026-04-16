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

/**
 * Try GovInfo for a bill. Iterates version codes in priority order, returning
 * the first hit. Each probe uses HEAD first to avoid downloading the HTML
 * error page; only GETs when Content-Type is XML.
 */
export async function fetchBillTextFromGovInfo(
  congress: number,
  apiBillType: string, // must be GovInfo-style: "hr", "s", "hjres", etc.
  billNumber: number,
): Promise<GovInfoTextResult | null> {
  for (const version of VERSION_CODES) {
    const pkg = `BILLS-${congress}${apiBillType}${billNumber}${version}`;
    const url = `https://www.govinfo.gov/content/pkg/${pkg}/xml/${pkg}.xml`;

    try {
      // HEAD first — fast check for Content-Type. GovInfo 302-redirects to the
      // real file; axios follows by default. If the destination is HTML it's
      // the error page. If XML, this package exists.
      const head = await axios.head(url, {
        timeout: 8_000,
        validateStatus: () => true, // Don't throw on 4xx/5xx, we check manually
        maxRedirects: 5,
        headers: {
          "User-Agent": "Govroll/1.0 (civic transparency; +https://govroll.com)",
        },
      });

      if (head.status !== 200) continue;

      const contentType = String(head.headers["content-type"] ?? "").toLowerCase();
      // Real bill XML comes as application/xml or text/xml. The "content not
      // found" HTML page comes as text/html.
      if (!contentType.includes("xml")) continue;

      // Package exists — download the XML.
      const res = await axios.get<string>(url, {
        timeout: 15_000,
        responseType: "text",
        maxRedirects: 5,
        headers: {
          "User-Agent": "Govroll/1.0 (civic transparency; +https://govroll.com)",
        },
        // Keep string, don't parse as JSON
        transformResponse: [(data) => data],
      });

      if (typeof res.data !== "string" || res.data.length < 200) continue;

      // Sanity check: starts with <?xml or <bill
      const head100 = res.data.slice(0, 200);
      if (!/<\?xml|<bill|<resolution/i.test(head100)) continue;

      return { xml: res.data, versionCode: version, url };
    } catch {
      // Network error on this version — try the next one
      continue;
    }

    // Small spacing between probes to be polite to GovInfo
    await new Promise((r) => setTimeout(r, 150));
  }

  return null;
}

/** Exported for logging/testing — which codes we try, in order. */
export const GOVINFO_VERSION_PRIORITY: readonly string[] = VERSION_CODES;
