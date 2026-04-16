/**
 * Layer 2 — AI moderation via OpenAI's free /moderations endpoint.
 *
 * Used for:
 *  - Donor display names  (checkNameL2)
 *  - Usernames            (checkNameL2)
 *  - Comment content      (checkContentL2)
 *
 * The endpoint is free; we rate-limit by IP + a DB-backed daily cap purely
 * as defense-in-depth against burst abuse. Moderation always fails open on
 * network / quota errors — Layer 1 is the deterministic backstop.
 *
 * Server-only — never import this on the client.
 */

import { recordSpend } from "@/lib/budget";
import {
  assertIpRateLimit,
  assertGlobalDailyLimit,
  RateLimitError,
} from "@/lib/rate-limit";

export type L2Result = {
  ok: boolean;
  flagged: boolean;
  categories?: string[];
  error?: string;
};

interface L2Options {
  /** Shared limit bucket name — used for both the DB daily counter and the AI-spend feature label. */
  limitKey: string;
  /** Per-IP cap per hour. Pass 0 to skip the per-IP guard. */
  maxPerIpPerHour: number;
  /** Global daily cap. */
  maxDaily: number;
}

async function callModerationApi(
  input: string,
  ip: string | undefined,
  opts: L2Options,
): Promise<L2Result> {
  try {
    if (ip && opts.maxPerIpPerHour > 0) {
      assertIpRateLimit(ip, opts.maxPerIpPerHour);
    }
    await assertGlobalDailyLimit(opts.limitKey, opts.maxDaily);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { ok: true, flagged: false, error: "rate_limited" };
    }
    throw err;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: true, flagged: false, error: "no_api_key" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!res.ok) {
      console.error(`OpenAI moderation API error: ${res.status}`);
      return { ok: true, flagged: false, error: `api_${res.status}` };
    }

    const data = await res.json();
    const result = data.results?.[0];

    if (!result) {
      return { ok: true, flagged: false, error: "no_result" };
    }

    try {
      await recordSpend({
        feature: opts.limitKey,
        model: "openai-moderation",
        inputTokens: 0,
        outputTokens: 0,
      });
    } catch {
      // Non-critical — don't block moderation on logging failure
    }

    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([, v]) => v === true)
        .map(([k]) => k);

      return {
        ok: false,
        flagged: true,
        categories: flaggedCategories,
      };
    }

    return { ok: true, flagged: false };
  } catch (err) {
    console.error("OpenAI moderation call failed:", err);
    // Fail open — Layer 1 already passed, and Layer 3 (human) is the backstop
    return { ok: true, flagged: false, error: "network_error" };
  }
}

/**
 * Moderate a short display-name-like string (donor names, usernames).
 *
 * Caps are defense-in-depth, not a billing concern — OpenAI's /moderations
 * endpoint is free. The daily cap bounds abuse-burn; the per-IP cap bounds
 * a single source hammering the system.
 */
export async function checkNameL2(
  name: string,
  ip?: string,
): Promise<L2Result> {
  return callModerationApi(name, ip, {
    limitKey: "moderation",
    maxPerIpPerHour: 15,
    maxDaily: 2000,
  });
}

/**
 * Moderate free-form content (comments, messages).
 *
 * Caller should also enforce an authenticated per-user cap
 * (assertUserRateLimit) — the per-IP cap here is a fast-reject only and
 * doesn't survive across serverless instances.
 */
export async function checkContentL2(
  content: string,
  ip?: string,
): Promise<L2Result> {
  return callModerationApi(content, ip, {
    limitKey: "moderation_content",
    maxPerIpPerHour: 60,
    maxDaily: 20_000,
  });
}
