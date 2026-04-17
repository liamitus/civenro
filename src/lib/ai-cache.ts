/**
 * AI response cache — deduplicates identical first-question queries on the
 * same bill so we don't pay for the same answer twice.
 *
 * Cache key: SHA-256 of (userMessage). Scoped per bill via the DB unique
 * constraint (billId, promptHash). Only caches first-turn messages (no
 * conversation history) since those are the most commonly duplicated.
 */

import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Compute a hex hash of the user's prompt for cache lookup.
 * Uses the Web Crypto API (available in Node 18+ and edge runtimes).
 */
async function hashPrompt(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text.toLowerCase().trim());
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type CachedResponse = {
  response: string;
  model: string;
};

/**
 * Look up a cached AI response for a bill + prompt combination.
 * Returns null on cache miss or if the cached entry has expired.
 */
export async function getCachedResponse(
  billId: number,
  userMessage: string,
): Promise<CachedResponse | null> {
  const promptHash = await hashPrompt(userMessage);

  const cached = await prisma.aiResponseCache.findUnique({
    where: { billId_promptHash: { billId, promptHash } },
  });

  if (!cached || cached.expiresAt < new Date()) {
    // Expired — clean up lazily
    if (cached) {
      await prisma.aiResponseCache
        .delete({
          where: { id: cached.id },
        })
        .catch(() => {});
    }
    return null;
  }

  return { response: cached.response, model: cached.model };
}

/**
 * Store an AI response in the cache. Overwrites any existing entry for the
 * same bill + prompt.
 */
export async function setCachedResponse(
  billId: number,
  userMessage: string,
  response: string,
  model: string,
): Promise<void> {
  const promptHash = await hashPrompt(userMessage);

  await prisma.aiResponseCache.upsert({
    where: { billId_promptHash: { billId, promptHash } },
    create: {
      billId,
      promptHash,
      response,
      model,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
    update: {
      response,
      model,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
  });
}
