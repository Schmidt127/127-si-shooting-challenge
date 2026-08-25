import { describe, expect, it } from "vitest";

import {
  decodeGameLogCursor,
  encodeGameLogCursor,
  GAME_LOG_PAGE_SIZE,
  opaqueGameLogRowKey,
  paginateSortedXpSummaries,
} from "@/lib/data/game-log-pagination";
import { sortXpEventsNewestFirst } from "@/lib/data/xp-activity-loader";
import type { XpEventSummary } from "@/types/xp";

function row(
  id: string,
  activityDate: string,
  sourceLabel = "Submission Base",
): XpEventSummary {
  return {
    id,
    points: 20,
    sourceLabel,
    activityDate,
  };
}

describe("opaqueGameLogRowKey", () => {
  it("does not expose Airtable record ids", () => {
    const key = opaqueGameLogRowKey("recABCDEFGHIJKLMN");
    expect(key).toMatch(/^gl-[a-f0-9]{20}$/);
    expect(key).not.toContain("rec");
  });
});

describe("paginateSortedXpSummaries", () => {
  const sorted = sortXpEventsNewestFirst([
    row("recPage0000000001", "2026-08-20", "Submission Base"),
    row("recPage0000000002", "2026-08-20", "Shot Milestone"),
    row("recPage0000000003", "2026-08-18"),
    row("recPage0000000004", "2026-08-15"),
    row("recPage0000000005", "2026-08-14"),
    row("recPage0000000006", "2026-08-12"),
    row("recPage0000000007", "2026-08-11"),
    row("recPage0000000008", "2026-08-10"),
    row("recPage0000000009", "2026-08-09"),
    row("recPage0000000010", "2026-08-08"),
    row("recPage0000000011", "2026-08-07"),
    row("recPage0000000012", "2026-08-06"),
    row("recPage0000000013", "2026-08-05"),
  ]);

  it("returns the first page in reverse chronological order", () => {
    const page = paginateSortedXpSummaries(sorted, {
      cursor: null,
      pageSize: GAME_LOG_PAGE_SIZE,
    });
    expect(page.pageRows).toHaveLength(GAME_LOG_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    expect(page.pageRows[0].id).toBe("recPage0000000001");
    expect(page.pageRows[1].id).toBe("recPage0000000002");
  });

  it("returns the second page without duplicates", () => {
    const first = paginateSortedXpSummaries(sorted, {
      cursor: null,
      pageSize: GAME_LOG_PAGE_SIZE,
    });
    const second = paginateSortedXpSummaries(sorted, {
      cursor: first.nextCursor,
      pageSize: GAME_LOG_PAGE_SIZE,
    });

    const firstIds = new Set(first.pageRows.map((item) => item.id));
    for (const item of second.pageRows) {
      expect(firstIds.has(item.id)).toBe(false);
    }
    expect(second.pageRows[0].id).toBe("recPage0000000013");
    expect(second.hasMore).toBe(false);
  });

  it("keeps submission before milestone on the same day", () => {
    const sameDay = sortXpEventsNewestFirst([
      row("recMilestone00001", "2026-08-20", "Shot Milestone"),
      row("recSubmission0001", "2026-08-20", "Submission Base"),
    ]);
    const page = paginateSortedXpSummaries(sameDay, { cursor: null, pageSize: 2 });
    expect(page.pageRows[0].id).toBe("recSubmission0001");
    expect(page.pageRows[1].id).toBe("recMilestone00001");
  });

  it("handles empty ledger", () => {
    const page = paginateSortedXpSummaries([], { cursor: null, pageSize: 12 });
    expect(page.pageRows).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it("encodes and decodes cursors", () => {
    const cursor = encodeGameLogCursor("2026-08-10", "recPage0000000008");
    const decoded = decodeGameLogCursor(cursor);
    expect(decoded).toEqual({
      activityDate: "2026-08-10",
      recordId: "recPage0000000008",
    });
  });
});
