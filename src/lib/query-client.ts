import {
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import { cache } from "react";

/**
 * Factory used on both server and client. Centralised so every consumer
 * gets the same defaults (staleTime, retry policy, dehydrate predicate).
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 30s staleTime means a prefetched page 1 served from an RSC is
        // trusted for ~30s on the client before any refetch, which is
        // enough for initial paint and back-nav but still short enough
        // that a user who leaves a tab open gets fresh data when they
        // interact.
        staleTime: 30_000,
        // Don't refetch on mount if we already have cached data — the
        // RSC prefetch covers first paint.
        refetchOnMount: false,
      },
      dehydrate: {
        // Include in-flight queries so streaming SSR can hand off mid-flight
        // promises to the client.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

/**
 * Per-request QueryClient for RSC prefetching. `cache()` ensures every
 * component inside a single request sees the same instance, so a page
 * can prefetch multiple queries without dehydrating separate clients.
 */
export const getServerQueryClient = cache(makeQueryClient);
