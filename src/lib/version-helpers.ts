/**
 * Helpers for bill text version tracking.
 *
 * Congress.gov publishes bill text at each stage with version codes embedded
 * in the URL filenames (e.g., BILLS-119s1383rs.xml → "rs").
 */

/**
 * Version codes that represent substantive text changes.
 * These are the transitions where a user's vote may become stale.
 */
const SUBSTANTIVE_CODES = new Set([
  "rh", "rs",       // Reported by committee (may be entirely rewritten)
  "eh", "es",       // Engrossed (floor amendments incorporated)
  "eah", "eas",     // Engrossed amendment from other chamber
  "enr",            // Enrolled (final bicameral text)
  "cph", "cps",     // Considered and passed
  "ath", "ats",     // Agreed to (resolutions)
]);

/**
 * Version codes that are procedural or baseline — no text change from prior.
 */
const PROCEDURAL_CODES = new Set([
  "ih", "is",       // Introduced (baseline, not a "change")
  "rfh", "rfs",     // Referred to committee (routing only)
  "rdh", "rds",     // Received in other chamber (acknowledgment)
  "rch", "rcs",     // Re-referred to different committee
  "pch", "pcs",     // Placed on calendar (scheduling)
  "hdh", "hds",     // Held at desk
  "sc",             // Sponsor change (metadata only)
  "pp",             // Public print
]);

/**
 * Determine if a version code represents a substantive text change.
 * Defaults to true for unknown codes (safer to flag than to miss).
 */
export function isSubstantiveVersion(versionCode: string): boolean {
  const code = versionCode.toLowerCase();
  if (PROCEDURAL_CODES.has(code)) return false;
  return true; // substantive or unknown — err on the side of flagging
}

/**
 * Extract the version code from a congress.gov format URL.
 *
 * URL patterns:
 *   https://www.congress.gov/119/bills/s1383/BILLS-119s1383is.htm → "is"
 *   https://www.congress.gov/119/bills/s1383/BILLS-119s1383rs.xml → "rs"
 *   https://www.congress.gov/119/bills/hr5376/BILLS-117hr5376eh.pdf → "eh"
 */
export function extractVersionCode(
  formats: { type: string; url: string }[],
): string | null {
  // Prefer XML URL, fall back to any format
  const url =
    formats.find((f) => f.type === "Formatted XML")?.url ||
    formats.find((f) => f.type === "Formatted Text")?.url ||
    formats.find((f) => f.type === "PDF")?.url;

  if (!url) return null;

  // Match the version code suffix before the file extension
  // BILLS-119s1383rs.xml → capture "rs"
  // BILLS-117hr5376eh.pdf → capture "eh"
  const match = url.match(/BILLS-\d+[a-z]+\d+([a-z]+)\.\w+$/i);
  return match ? match[1].toLowerCase() : null;
}
