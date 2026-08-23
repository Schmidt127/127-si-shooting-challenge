import { describe, expect, it, vi } from "vitest";

import {
  buildRowKeyToRecordId,
  decodeXpActivityCursor,
  encodeXpActivityCursor,
  mapXpEventToActivityRow,
  mergeXpActivityPages,
  orderXpActivityRows,
  paginateOrderedXpRows,
  toHydrationContext,
  XP_ACTIVITY_INITIAL_PAGE_SIZE,
} from "@/lib/data/xp-activity";
import type { XpActivityRow } from "@/types/xp-activity";

function row(overrides: Partial<XpActivityRow>): XpActivityRow {
  return {
    key: "xp-00000001",
    kind: "other",
    activityDate: "2026-08-01T00:00:00.000Z",
    title: "XP",
    detail: null,
    xp: 10,
    sourceLabel: "Submission Base",
    bucket: "Shooting Base",
    sortDateMs: Date.parse("2026-08-01T00:00:00.000Z"),
    sortRank: 9,
    parentKey: null,
    ...overrides,
  };
}

describe("xp-activity ordering", () => {
  it("orders newest activity first", () => {
    const ordered = orderXpActivityRows([
      row({ key: "xp-old", sortDateMs: 1, activityDate: "2026-07-01T00:00:00.000Z" }),
      row({ key: "xp-new", sortDateMs: 3, activityDate: "2026-08-03T00:00:00.000Z" }),
      row({ key: "xp-mid", sortDateMs: 2, activityDate: "2026-08-02T00:00:00.000Z" }),
    ]);
    expect(ordered.map((item) => item.key)).toEqual(["xp-new", "xp-mid", "xp-old"]);
  });

  it("keeps parent submission before dependent milestone", () => {
    const ordered = orderXpActivityRows([
      row({
        key: "xp-milestone",
        kind: "shot_milestone",
        parentKey: "submission-abc12345",
        sortDateMs: 100,
      }),
      row({
        key: "submission-abc12345",
        kind: "shooting_submission",
        sortDateMs: 100,
      }),
    ]);
    expect(ordered.map((item) => item.key)).toEqual([
      "submission-abc12345",
      "xp-milestone",
    ]);
  });

  it("keeps separate rows for multiple submissions on the same day", () => {
    const ordered = orderXpActivityRows([
      row({ key: "xp-a", kind: "shooting_submission", sortDateMs: 100 }),
      row({ key: "xp-b", kind: "shooting_submission", sortDateMs: 100 }),
    ]);
    expect(ordered).toHaveLength(2);
  });
});

describe("xp-activity pagination", () => {
  it("returns initial 75-row page", () => {
    const rows = Array.from({ length: 120 }, (_, index) =>
      row({
        key: `xp-${String(index).padStart(8, "0")}`,
        sortDateMs: 1_000 - index,
      }),
    );
    const rowKeyToRecordId = new Map(
      rows.map((item, index) => [item.key, `rec${String(index).padStart(14, "0")}`]),
    );
    const page = paginateOrderedXpRows(rows, rowKeyToRecordId, XP_ACTIVITY_INITIAL_PAGE_SIZE, null);
    expect(page.rows).toHaveLength(75);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBeTruthy();
  });

  it("prevents duplicate rows across merged pages", () => {
    const merged = mergeXpActivityPages(
      [row({ key: "xp-one", xp: 10 })],
      [row({ key: "xp-one", xp: 10 }), row({ key: "xp-two", xp: 5 })],
    );
    expect(merged).toHaveLength(2);
  });

  it("supports parent on page one and milestone on page two", () => {
    const rows = orderXpActivityRows([
      row({ key: "submission-parent", kind: "shooting_submission", sortDateMs: 200 }),
      row({
        key: "xp-child",
        kind: "shot_milestone",
        parentKey: "submission-parent",
        sortDateMs: 200,
      }),
      ...Array.from({ length: 74 }, (_, index) =>
        row({ key: `xp-fill-${index}`, sortDateMs: 100 - index }),
      ),
    ]);
    const rowKeyToRecordId = new Map(
      rows.map((item, index) => [item.key, `rec${String(index).padStart(14, "0")}`]),
    );
    const pageOne = paginateOrderedXpRows(rows, rowKeyToRecordId, 75, null);
    const pageTwo = paginateOrderedXpRows(
      rows,
      rowKeyToRecordId,
      75,
      decodeXpActivityCursor(pageOne.nextCursor),
    );
    const keys = [...pageOne.rows, ...pageTwo.rows].map((item) => item.key);
    expect(keys).toContain("submission-parent");
    expect(keys).toContain("xp-child");
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("xp-activity mapping", () => {
  it("hides inactive XP events", () => {
    const mapped = mapXpEventToActivityRow(
      {
        id: "recInactive0000001",
        fields: { "Active?": false, "Active XP Points": 10 },
      },
      toHydrationContext({}),
    );
    expect(mapped).toBeNull();
  });

  it("maps zoom meetings using Meeting Name and Meeting Display Name", () => {
    const mapped = mapXpEventToActivityRow(
      {
        id: "recZoom00000000001",
        fields: {
          "Active?": true,
          "Active XP Points": 25,
          "XP Source": "Zoom Meeting Attendance Base",
          "XP Bucket": "Zoom Attendance",
          "Zoom Meeting": ["recMeeting000001"],
          "XP Activity Date": "2026-08-10T00:00:00.000Z",
        },
      },
      toHydrationContext({
        zoomMeetings: [
          {
            id: "recMeeting000001",
            fields: {
              "Meeting Name": "Week 3 Live Session",
              "Meeting Display Name": "Week 3 Live Session | Aug 10, 2026",
            },
          },
        ],
      }),
    );
    expect(mapped?.detail).toBe("Week 3 Live Session | Aug 10, 2026");
  });

  it("uses grade-band percentage language for shot milestones", () => {
    const mapped = mapXpEventToActivityRow(
      {
        id: "recMilestone000001",
        fields: {
          "Active?": true,
          "Active XP Points": 15,
          "XP Source": "Shot Milestone",
          "XP Bucket": "Shot Milestone",
          "Shot Milestones": ["recShotMs0000001"],
          "XP Activity Date": "2026-08-09T00:00:00.000Z",
        },
      },
      toHydrationContext({
        milestones: [
          {
            id: "recShotMs0000001",
            fields: {
              "Milestone Percent": 50,
              "Grade Band": ["Middle School (6–8)"],
            },
          },
        ],
      }),
    );
    expect(mapped?.detail).toContain("50%");
  });
});

describe("xp-activity cursor", () => {
  it("round-trips opaque cursor payloads", () => {
    const encoded = encodeXpActivityCursor({
      v: 1,
      afterDateMs: 123,
      afterId: "recABCDEFGHIJKLMN",
    });
    expect(decodeXpActivityCursor(encoded)).toEqual({
      v: 1,
      afterDateMs: 123,
      afterId: "recABCDEFGHIJKLMN",
    });
  });
});

describe("xp-activity loader integration", () => {
  it("returns empty history without error", async () => {
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
      listAirtableRecords: vi.fn(async () => ({ records: [] })),
    }));
    const { loadXpActivityPageForSlug } = await import("@/lib/data/xp-activity-loader");
    const result = await loadXpActivityPageForSlug("testing-schmidt", null);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.rows).toEqual([]);
      expect(result.data.hasMore).toBe(false);
    }
  });
});
