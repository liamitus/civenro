/**
 * Layer 2 — AI-powered name moderation via OpenAI's free /moderations endpoint.
 *
 * Only called on names that pass Layer 1. Rate-limited per IP to prevent
 * abuse, with a DB-backed daily cap for safety (though the endpoint is free).
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

const MAX_CHECKS_PER_IP_PER_HOUR = 10;
const MAX_DAILY_CALLS = 500;

/**
 * Call OpenAI's free /moderations endpoint to check a name.
 * Falls back to "pass" on network errors so a moderation outage
 * never blocks a donation.
 */
export async function checkNameL2(
  name: string,
  ip?: string
): Promise<L2Result> {
  // Rate limiting — IP check is in-memory (fast reject), daily is DB-backed.
  try {
    if (ip) assertIpRateLimit(ip, MAX_CHECKS_PER_IP_PER_HOUR);
    await assertGlobalDailyLimit("moderation", MAX_DAILY_CALLS);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { ok: true, flagged: false, error: "rate_limited" };
    }
    throw err;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No key configured — pass through (Layer 1 already checked)
    return { ok: true, flagged: false, error: "no_api_key" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: name,
      }),
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

    // Log as zero-cost usage event for tracking purposes
    try {
      await recordSpend({
        feature: "moderation",
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
