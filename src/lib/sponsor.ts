/**
 * Sponsor string parsing for bill detail pages.
 *
 * The `Bill.sponsor` column stores the sponsor as a display-formatted text
 * string from Congress.gov, e.g.:
 *
 *   "Rep. Arrington, Jodey C. [R-TX-19]"
 *   "Sen. Ernst, Joni [R-IA]"
 *   "Del. Norton, Eleanor Holmes [D-DC]"
 *
 * We parse this to find the matching Representative row so the UI can
 * render a real photo + link to the rep's profile. Best-effort only —
 * if the match fails (prior-Congress sponsor, data drift) the caller
 * should fall back to rendering the raw string.
 */

export interface ParsedSponsor {
  chamberPrefix: "Rep." | "Sen." | "Del." | "Res.Comm." | null;
  firstName: string;
  lastName: string;
  party: string; // "R" | "D" | "I" | "L" | "G" — single letter
  state: string; // "TX" | "DC" | "PR" ...
  district: string | null; // "19" for house; null for senate
  raw: string;
}

/** Parse the "Rep. Last, First X. [P-ST-##]" / "Sen. Last, First [P-ST]" form. */
export function parseSponsorString(raw: string | null): ParsedSponsor | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Match: <prefix>. LastName, FirstName (optional middle) [Party-State[-District]]
  // Prefix can be Rep | Sen | Del (delegate) | Res.Comm. (resident commissioner)
  const m =
    /^(Rep|Sen|Del|Res\.Comm)\.\s+([^,]+?),\s+([^\[]+?)\s*\[([A-Z])-([A-Z]{2})(?:-([^\]]+))?\]\s*$/.exec(
      trimmed,
    );
  if (!m) return null;

  const [, prefix, lastName, firstNameFull, party, state, district] = m;

  // Strip middle initial / middle name from first (e.g. "Jodey C." → "Jodey")
  const firstName = firstNameFull.trim().split(/\s+/)[0].replace(/\.$/, "");

  return {
    chamberPrefix: `${prefix}.` as ParsedSponsor["chamberPrefix"],
    firstName,
    lastName: lastName.trim(),
    party,
    state,
    district: district?.trim() || null,
    raw: trimmed,
  };
}

/**
 * Map the single-letter party code from a sponsor string to the full-name
 * format stored on `Representative.party`. We check multiple spellings
 * because the Representative table uses "Democrat" in some rows and
 * "Democratic" in others (historical drift).
 */
export function partyCodeToNames(code: string): string[] {
  switch (code.toUpperCase()) {
    case "D":
      return ["Democrat", "Democratic"];
    case "R":
      return ["Republican"];
    case "I":
      return ["Independent"];
    case "L":
      return ["Libertarian"];
    case "G":
      return ["Green"];
    default:
      return [code];
  }
}
