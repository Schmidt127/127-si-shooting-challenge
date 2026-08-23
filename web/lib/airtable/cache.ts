/**
 * Server-side caching helpers for public athlete profile segments.
 */

import { unstable_cache } from "next/cache";

export const PROFILE_CACHE_TTL_SECONDS = 120;

export type CacheOutcome = "hit" | "miss";

const cacheOutcomeByKey = new Map<string, CacheOutcome>();
let lastExecutedCacheKey: string | null = null;

export function noteCacheLookup(key: string, outcome: CacheOutcome): void {
  cacheOutcomeByKey.set(key, outcome);
}

export function readCacheOutcome(key: string): CacheOutcome {
  return cacheOutcomeByKey.get(key) ?? "miss";
}

export function profileShellCacheKey(slug: string): string {
  return `profile:shell:${slug}`;
}

export function profileXpCacheKey(slug: string, cursor: string): string {
  return `profile:xp:${slug}:page:${cursor || "initial"}`;
}

export function leaderboardCacheKey(): string {
  return "leaderboard:season";
}

export function cachedSegment<T>(
  key: string,
  tags: string[],
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(
    async () => {
      lastExecutedCacheKey = key;
      return loader();
    },
    [key],
    {
      revalidate: ttlSeconds,
      tags,
    },
  );

  return cached().then((value) => {
    const outcome: CacheOutcome = lastExecutedCacheKey === key ? "miss" : "hit";
    noteCacheLookup(key, outcome);
    if (lastExecutedCacheKey === key) {
      lastExecutedCacheKey = null;
    }
    return value;
  });
}
