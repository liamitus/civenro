/**
 * Generate a civic-themed pseudonym for new users.
 *
 * Format: "Citizen-XXXX" where XXXX is a 4-digit number.
 * Deterministic when given a Supabase user ID (last 4 hex digits → decimal),
 * random otherwise. This means the same user always gets the same fallback ID
 * without needing a database lookup.
 */
export function generateCitizenId(userId?: string): string {
  if (userId) {
    // Use last 4 hex chars of the UUID for a stable, unique-ish number
    const hex = userId.replace(/-/g, "").slice(-4);
    const num = parseInt(hex, 16) % 10000;
    return `Citizen-${String(num).padStart(4, "0")}`;
  }
  // Fallback: random 4-digit number
  const num = Math.floor(Math.random() * 10000);
  return `Citizen-${String(num).padStart(4, "0")}`;
}

/**
 * Resolve a display name for a user, with fallback chain:
 * 1. Explicit username from user_metadata
 * 2. Full name from OAuth provider (first name only)
 * 3. Generated Citizen-XXXX
 */
export function resolveUsername(user: {
  id: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};

  // Explicitly set username (from signup or account settings)
  const username = meta.username as string | undefined;
  if (username && username !== "Anonymous" && username.trim()) {
    return username.trim();
  }

  // OAuth full_name / name — extract first name only for privacy
  const fullName = (meta.full_name ?? meta.name) as string | undefined;
  if (fullName && fullName.trim()) {
    const firstName = fullName.trim().split(/\s+/)[0];
    if (firstName.length >= 2) return firstName;
  }

  // Deterministic fallback
  return generateCitizenId(user.id);
}
