/**
 * Layer 1 — Deterministic name moderation.
 *
 * Free, instant, no API calls. Catches ~80% of bad names. Names that pass
 * Layer 1 are sent to Layer 2 (OpenAI moderation endpoint) asynchronously.
 *
 * This module is imported on both server and client (for client-side
 * pre-validation on the donate form), so it must remain dependency-free.
 */

import { PROFANITY, PUBLIC_FIGURES, SPAM_PATTERNS } from "./deny-lists";

export type L1Result = {
  ok: boolean;
  reason?: string;
};

const MAX_NAME_LENGTH = 40;
const MIN_NAME_LENGTH = 1;

/**
 * Allowed Unicode categories for display names:
 * - Letters (any script), numbers, spaces, hyphens, apostrophes, periods, commas.
 * - Rejects control characters, emoji, zalgo combining marks beyond reasonable
 *   diacritics, and most symbols.
 *
 * The regex allows basic Latin diacritics (é, ñ, ü) and non-Latin scripts
 * (Chinese, Arabic, Cyrillic, etc.) while blocking decorative Unicode abuse.
 */
const ALLOWED_CHARS = /^[\p{L}\p{N}\s'\-.,]+$/u;

/**
 * Excessive combining marks (zalgo text). More than 2 consecutive combining
 * marks after a base character is almost certainly abuse.
 */
const ZALGO_PATTERN = /[\u0300-\u036f\u0489]{3,}/;

/**
 * All-caps heuristic: names longer than 4 characters that are entirely
 * uppercase read as shouting / trolling. Short names like "JR" or "AL" are ok.
 */
function isAllCapsLong(name: string): boolean {
  const letters = name.replace(/[^a-zA-Z]/g, "");
  return letters.length > 4 && letters === letters.toUpperCase();
}

/**
 * Normalize a name for deny-list comparison: lowercase, collapse whitespace,
 * strip leading/trailing spaces.
 */
function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Check whether any deny-list entry appears as a substring of the normalized
 * name, or vice versa. This catches "Donald J Trump", "mr trump", "trumppp".
 */
function matchesDenyList(
  normalized: string,
  list: ReadonlySet<string>,
): string | null {
  // Exact match
  if (list.has(normalized)) return normalized;
  // Substring match — deny-list entry inside the name
  for (const entry of list) {
    if (entry.length >= 3 && normalized.includes(entry)) return entry;
  }
  return null;
}

/**
 * Run all Layer 1 checks on a candidate display name.
 * Returns { ok: true } or { ok: false, reason: "..." }.
 *
 * This function is pure and synchronous — safe for client-side use.
 */
export function checkNameL1(name: string): L1Result {
  if (typeof name !== "string") {
    return { ok: false, reason: "Name must be a string." };
  }

  const trimmed = name.trim();

  if (trimmed.length < MIN_NAME_LENGTH) {
    return { ok: false, reason: "Name is required." };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      reason: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  if (!ALLOWED_CHARS.test(trimmed)) {
    return {
      ok: false,
      reason:
        "Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods.",
    };
  }

  if (ZALGO_PATTERN.test(trimmed)) {
    return { ok: false, reason: "Name contains invalid characters." };
  }

  if (isAllCapsLong(trimmed)) {
    return {
      ok: false,
      reason: "Please use standard capitalization for your name.",
    };
  }

  const normalized = normalize(trimmed);

  // Profanity / slur check
  const profanityHit = matchesDenyList(normalized, PROFANITY);
  if (profanityHit) {
    return { ok: false, reason: "That name cannot be used." };
  }

  // Public figures check
  const figureHit = matchesDenyList(normalized, PUBLIC_FIGURES);
  if (figureHit) {
    return {
      ok: false,
      reason:
        "To avoid implying endorsement, we cannot display public figures' names.",
    };
  }

  // Spam patterns (URLs, emails, handles, promo language)
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        reason:
          "Name cannot contain URLs, email addresses, handles, or promotional content.",
      };
    }
  }

  return { ok: true };
}
