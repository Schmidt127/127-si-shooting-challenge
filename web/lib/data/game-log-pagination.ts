import { createHash } from "node:crypto";

import type { XpEventSummary } from "@/types/xp";

export const GAME_LOG_PAGE_SIZE = 12;
export const GAME_LOG_MAX_FETCH = 2000;

export class GameLogCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameLogCursorError";
  }
}

/** Opaque client key — never an Airtable record id. */
export function opaqueGameLogRowKey(recordId: string): string {
  const digest = createHash("sha256").update(recordId).digest("hex").slice(0, 20);
  return `gl-${digest}`;
}

type DecodedCursor = {
  activityDate: string;
  recordId: string;
};

export function encodeGameLogCursor(activityDate: string, recordId: string): string {
  const payload = JSON.stringify({
    v: 1,
    d: activityDate,
    id: recordId,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeGameLogCursor(cursor: string): DecodedCursor | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { v?: number; d?: string; id?: string };
    if (parsed.v !== 1 || !parsed.id?.startsWith("rec")) return null;
    return {
      activityDate: parsed.d ?? "",
      recordId: parsed.id,
    };
  } catch {
    return null;
  }
}

export function paginateSortedXpSummaries(
  sortedRows: XpEventSummary[],
  options: { cursor: string | null; pageSize: number },
): {
  pageRows: XpEventSummary[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  const { cursor, pageSize } = options;
  let start = 0;

  if (cursor) {
    const decoded = decodeGameLogCursor(cursor);
    if (!decoded) {
      throw new GameLogCursorError("Invalid activity cursor.");
    }
    const index = sortedRows.findIndex((row) => row.id === decoded.recordId);
    if (index === -1) {
      throw new GameLogCursorError("Activity cursor is no longer valid.");
    }
    start = index + 1;
  }

  const pageRows = sortedRows.slice(start, start + pageSize);
  const hasMore = start + pageSize < sortedRows.length;
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? encodeGameLogCursor(lastRow.activityDate ?? "", lastRow.id)
      : null;

  return { pageRows, nextCursor, hasMore };
}
