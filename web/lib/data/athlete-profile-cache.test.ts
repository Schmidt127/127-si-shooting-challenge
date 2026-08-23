import { describe, expect, it, vi } from "vitest";

import { noteCacheLookup, readCacheOutcome } from "@/lib/airtable/cache";

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => {
    let promise: ReturnType<T> | undefined;
    return ((...args: Parameters<T>) => {
      if (!promise) {
        promise = fn(...args) as ReturnType<T>;
      }
      return promise;
    }) as T;
  },
}));

describe("profile cache outcomes", () => {
  it("records cache hits and misses", () => {
    noteCacheLookup("profile:shell:testing-schmidt", "hit");
    expect(readCacheOutcome("profile:shell:testing-schmidt")).toBe("hit");
    noteCacheLookup("profile:shell:testing-schmidt", "miss");
    expect(readCacheOutcome("profile:shell:testing-schmidt")).toBe("miss");
  });
});

describe("athlete profile deduplication", () => {
  it("deduplicates metadata and page requests via React cache", async () => {
    const fetchMock = vi.fn(async () => null);
    vi.doMock("@/lib/airtable/queries", () => ({
      fetchPublicAthleteProfileBySlug: fetchMock,
    }));

    vi.resetModules();
    const { loadAthleteProfileResult } = await import("@/lib/data/athlete-profile");
    await Promise.all([
      loadAthleteProfileResult("testing-schmidt"),
      loadAthleteProfileResult("testing-schmidt"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
