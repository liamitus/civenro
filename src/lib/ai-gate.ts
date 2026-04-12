import { getBudgetSnapshot, type BudgetSnapshot } from "@/lib/budget";

/**
 * Thrown by `assertAiEnabled` when AI features are currently unavailable.
 * API routes should catch this and return a structured 503 so the frontend
 * can render the "supported by readers" degraded state.
 */
export class AiDisabledError extends Error {
  readonly reason: "budget" | "manual";
  readonly snapshot: BudgetSnapshot;
  readonly donateUrl = "/support";

  constructor(snapshot: BudgetSnapshot) {
    super(`AI features are currently paused (${snapshot.aiDisabledReason ?? "unknown"})`);
    this.name = "AiDisabledError";
    this.reason = snapshot.aiDisabledReason === "manual" ? "manual" : "budget";
    this.snapshot = snapshot;
  }

  toJSON() {
    return {
      error: "ai_disabled",
      reason: this.reason,
      message:
        "Govroll's AI features are funded by readers and are currently paused for this period.",
      donateUrl: this.donateUrl,
      budget: {
        incomeCents: this.snapshot.incomeCents,
        spendCents: this.snapshot.spendCents,
        reserveCents: this.snapshot.reserveCents,
        period: this.snapshot.period,
      },
    };
  }
}

/**
 * In-process cache of the latest budget read. The hourly cron is authoritative;
 * this cache is a backstop so API routes don't hit the DB on every AI call.
 */
let cache: { snapshot: BudgetSnapshot; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

async function readSnapshot(): Promise<BudgetSnapshot> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.snapshot;
  const snapshot = await getBudgetSnapshot();
  cache = { snapshot, fetchedAt: now };
  return snapshot;
}

/** Force the next read to hit the database. Call after webhook income ticks. */
export function invalidateAiGateCache() {
  cache = null;
}

/**
 * Throws `AiDisabledError` if AI features are currently off. Call at the top
 * of any API route that spends tokens.
 */
export async function assertAiEnabled(_feature: string): Promise<BudgetSnapshot> {
  const snapshot = await readSnapshot();
  if (!snapshot.aiEnabled) throw new AiDisabledError(snapshot);
  return snapshot;
}
