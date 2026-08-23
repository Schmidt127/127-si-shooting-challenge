import { describe, expect, it, vi } from "vitest";

import { AirtableApiError } from "@/lib/airtable/errors";

describe("xp-activity loader errors", () => {
  it("returns error status for Airtable 422 responses", async () => {
    vi.resetModules();
    vi.doMock("@/lib/airtable/cache", () => ({
      PROFILE_CACHE_TTL_SECONDS: 120,
      cachedSegment: async (_key: string, _tags: string[], _ttl: number, loader: () => Promise<unknown>) =>
        loader(),
      profileXpCacheKey: (slug: string, cursor: string) => `profile:xp:${slug}:page:${cursor || "initial"}`,
      readCacheOutcome: () => "miss" as const,
    }));
    vi.doMock("@/lib/airtable/profile-queries", () => ({
      resolvePublicEnrollmentBySlug: vi.fn(async () => ({
        status: "ok",
        slug: "testing-schmidt",
        enrollment: { id: "recEnrollment00001", fields: {} },
      })),
    }));
    vi.doMock("@/lib/airtable/client", () => ({
      listAirtableRecords: vi.fn(async () => {
        throw new AirtableApiError(422, "Invalid formula");
      }),
    }));

    const { loadXpActivityPageForSlug } = await import("@/lib/data/xp-activity-loader");
    const result = await loadXpActivityPageForSlug("testing-schmidt", null);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toContain("422");
    }
  });

  it("returns error status for Airtable 500 responses", async () => {
    vi.resetModules();
    vi.doMock("@/lib/airtable/cache", () => ({
      PROFILE_CACHE_TTL_SECONDS: 120,
      cachedSegment: async (_key: string, _tags: string[], _ttl: number, loader: () => Promise<unknown>) =>
        loader(),
      profileXpCacheKey: (slug: string, cursor: string) => `profile:xp:${slug}:page:${cursor || "initial"}`,
      readCacheOutcome: () => "miss" as const,
    }));
    vi.doMock("@/lib/airtable/profile-queries", () => ({
      resolvePublicEnrollmentBySlug: vi.fn(async () => ({
        status: "ok",
        slug: "testing-schmidt",
        enrollment: { id: "recEnrollment00001", fields: {} },
      })),
    }));
    vi.doMock("@/lib/airtable/client", () => ({
      listAirtableRecords: vi.fn(async () => {
        throw new AirtableApiError(500, "Server error");
      }),
    }));

    const { loadXpActivityPageForSlug } = await import("@/lib/data/xp-activity-loader");
    const result = await loadXpActivityPageForSlug("testing-schmidt", null);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toContain("500");
    }
  });
});
