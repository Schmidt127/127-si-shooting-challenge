import { describe, expect, it, vi, beforeEach } from "vitest";

import { fetchPublicGameLogPage } from "@/lib/data/public-game-log";

const resolveSlugMock = vi.fn();
const loadXpMock = vi.fn();

vi.mock("@/lib/airtable/queries", () => ({
  resolvePublicEnrollmentIdBySlug: (...args: unknown[]) => resolveSlugMock(...args),
}));

vi.mock("@/lib/data/xp-activity-loader", () => ({
  loadXpActivityForEnrollment: (...args: unknown[]) => loadXpMock(...args),
}));

describe("fetchPublicGameLogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found for unknown slug", async () => {
    resolveSlugMock.mockResolvedValue(null);
    const result = await fetchPublicGameLogPage("missing-athlete", null);
    expect(result.status).toBe("not_found");
  });

  it("scopes loads to the resolved enrollment id", async () => {
    resolveSlugMock.mockResolvedValue("recEnrollment0001");
    loadXpMock.mockResolvedValue({
      rows: [
        {
          id: "recXp00000000001",
          points: 10,
          sourceLabel: "Submission Base",
          activityDate: "2026-08-10",
        },
      ],
      totalAvailableRows: 1,
      strategy: "enrollment_record_id",
      reconciliation: [],
      missingXpSubmissionIds: [],
    });

    const result = await fetchPublicGameLogPage("testing-schmidt", null, 12);
    expect(result.status).toBe("ok");
    expect(loadXpMock).toHaveBeenCalledWith(
      "recEnrollment0001",
      expect.objectContaining({ maxRows: null }),
    );
    if (result.status === "ok") {
      expect(result.page.rows).toHaveLength(1);
      expect(result.page.rows[0].key).toMatch(/^gl-/);
      expect(result.page.totalCount).toBe(1);
      expect(result.page.hasMore).toBe(false);
      expect(result.page.category).toBeNull();
    }
  });

  it("filters by category slug before pagination", async () => {
    resolveSlugMock.mockResolvedValue("recEnrollment0001");
    loadXpMock.mockResolvedValue({
      rows: [
        {
          id: "recXpHomework0001",
          points: 50,
          sourceLabel: "Homework Completion",
          activityDate: "2026-08-11",
        },
        {
          id: "recXpShoot0000001",
          points: 10,
          sourceLabel: "Submission Base",
          activityDate: "2026-08-10",
        },
      ],
      totalAvailableRows: 2,
      strategy: "enrollment_record_id",
      reconciliation: [],
      missingXpSubmissionIds: [],
    });

    const result = await fetchPublicGameLogPage("testing-schmidt", {
      category: "homework",
      pageSize: 12,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.page.category).toBe("homework");
      expect(result.page.totalCount).toBe(1);
      expect(result.page.rows).toHaveLength(1);
      expect(result.page.rows[0].title).toMatch(/Homework/i);
      expect(result.page.rows[0].key).toMatch(/^gl-/);
      expect(result.page.rows[0].key).not.toMatch(/^rec/);
    }
  });
});
