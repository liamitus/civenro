/**
 * Moderation pipeline — orchestrates Layer 1 → Layer 2 → final status.
 *
 * Called from the Stripe webhook handler AFTER payment success. The donation
 * always succeeds regardless of moderation outcome; what changes is whether
 * the donor's name is shown publicly.
 */

import { checkNameL1 } from "./layer1";
import { checkNameL2 } from "./layer2";
import type { DonationModStatus } from "@/generated/prisma/client";

export type ModerationResult = {
  status: DonationModStatus;
  notes: string | null;
  /** The cleaned display name, or null if rejected / anonymous. */
  displayName: string | null;
};

/**
 * Run the full moderation pipeline on a candidate name.
 *
 * @param rawName - The name as submitted by the donor
 * @param ip      - Request IP for rate limiting Layer 2
 * @returns ModerationResult with final status and cleaned name
 */
export async function moderateName(
  rawName: string | null | undefined,
  ip?: string
): Promise<ModerationResult> {
  // No name provided — anonymous donation, no moderation needed
  if (!rawName || rawName.trim().length === 0) {
    return { status: "APPROVED", notes: null, displayName: null };
  }

  const trimmed = rawName.trim();

  // Layer 1 — deterministic, free, instant
  const l1 = checkNameL1(trimmed);
  if (!l1.ok) {
    return {
      status: "REJECTED",
      notes: `L1: ${l1.reason}`,
      displayName: null,
    };
  }

  // Layer 2 — OpenAI moderation, async
  const l2 = await checkNameL2(trimmed, ip);

  if (l2.flagged) {
    return {
      status: "FLAGGED",
      notes: `L2 flagged: ${l2.categories?.join(", ") ?? "unknown"}`,
      displayName: null,
    };
  }

  if (l2.error) {
    // Layer 2 had an issue but didn't flag — approve with a note so
    // human reviewers know L2 was degraded.
    return {
      status: "APPROVED",
      notes: `L2 degraded (${l2.error}), approved on L1 only`,
      displayName: trimmed,
    };
  }

  // Both layers passed
  return {
    status: "APPROVED",
    notes: null,
    displayName: trimmed,
  };
}
