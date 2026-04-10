/**
 * Layer 2 — AI-powered name moderation via OpenAI's free /moderations endpoint.
 *
 * Only called on names that pass Layer 1. Rate-limited per IP to prevent
 * abuse, with a daily spend cap for safety (though the endpoint is free).
 *
 * Server-only — never import this on the client.
 */

import { recordSpend } from "@/lib/budget";

export type L2Result = {
  ok: boolean;
  flagged: boolean;
  categories?: string[];
  error?: string;
};

/** IP-based in-memory rate limiter (simple, no Redis required for v1). */
const ipCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_CHECKS_PER_IP_PER_HOUR = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= MAX_CHECKS_PER_IP_PER_HOUR) return false;
  entry.count++;
  return true;
}

/** Daily call counter — circuit breaker if something goes haywire. */
let dailyCalls = { count: 0, date: "" };
const MAX_DAILY_CALLS = 500;

function checkDailyLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyCalls.date !== today) {
    dailyCalls = { count: 0, date: today };
  }
  if (dailyCalls.count >= MAX_DAILY_CALLS) return false;
  dailyCalls.count++;
  return true;
}

/**
 * Call OpenAI's free /moderations endpoint to check a name.
 * Falls back to "pass" on network errors so a moderation outage
 * never blocks a donation.
 */
export async function checkNameL2(
  name: string,
  ip?: string
): Promise<L2Result> {
  // Rate limiting
  if (ip && !checkRateLimit(ip)) {
    return { ok: true, flagged: false, error: "rate_limited" };
  }
  if (!checkDailyLimit()) {
    return { ok: true, flagged: false, error: "daily_limit" };
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
