/**
 * DB-backed per-user rate limiting for AI endpoints.
 *
 * Uses the existing AiUsageEvent table to count recent requests — no Redis or
 * new infrastructure required. Because the count is in Postgres, limits persist
 * across serverless cold starts and concurrent instances.
 */

import { prisma } from "@/lib/prisma";

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(limitName: string, retryAfterSeconds: number) {
    super(`Rate limit exceeded: ${limitName}`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }

  toJSON() {
    return {
      error: "rate_limited",
      message: this.message,
      retryAfterSeconds: this.retryAfterSeconds,
    };
  }
}

/**
 * Assert that the user hasn't exceeded their per-hour request limit for a
 * given AI feature. Throws `RateLimitError` if exceeded.
 */
export async function assertUserRateLimit(
  userId: string,
  feature: string,
  maxPerHour: number,
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const count = await prisma.aiUsageEvent.count({
    where: {
      userId,
      feature,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (count >= maxPerHour) {
    throw new RateLimitError(
      `${maxPerHour} ${feature} requests per hour`,
      Math.ceil(60 - (Date.now() - oneHourAgo.getTime()) / 60_000),
    );
  }
}

/**
 * Assert that a given feature hasn't exceeded a global daily call limit.
 * Useful for endpoints like moderation where per-user doesn't apply.
 */
export async function assertGlobalDailyLimit(
  feature: string,
  maxPerDay: number,
): Promise<void> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const count = await prisma.aiUsageEvent.count({
    where: {
      feature,
      createdAt: { gte: todayStart },
    },
  });

  if (count >= maxPerDay) {
    throw new RateLimitError(`${maxPerDay} ${feature} calls per day`, 3600);
  }
}

/**
 * Assert that an IP hasn't exceeded the hourly limit for a feature.
 * For endpoints where auth isn't required (e.g. moderation on donations).
 *
 * Uses a lightweight in-process counter as a first pass, then falls back to
 * the global daily limit in the DB. This is intentionally simple — the daily
 * DB check is the real safety net; the IP map is just a fast-reject layer.
 */
const ipCounts = new Map<string, { count: number; resetAt: number }>();

export function assertIpRateLimit(
  ip: string,
  maxPerHour: number,
): void {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return;
  }
  if (entry.count >= maxPerHour) {
    throw new RateLimitError(
      `${maxPerHour} requests per hour per IP`,
      Math.ceil((entry.resetAt - now) / 1000),
    );
  }
  entry.count++;
}
