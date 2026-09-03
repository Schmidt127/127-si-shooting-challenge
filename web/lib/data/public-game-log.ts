/**
 * Public athlete Game Log — enrollment-scoped XP activity with server pagination.
 */

import { resolvePublicEnrollmentIdBySlug } from "@/lib/airtable/queries";
import { mapXpSummariesToPublicActivity } from "@/lib/data/public-athlete-profile";
import {
  filterXpSummariesByCategory,
  parseGameLogCategoryParam,
  type GameLogCategoryId,
} from "@/lib/data/game-log-categories";
import {
  GAME_LOG_MAX_FETCH,
  GAME_LOG_PAGE_SIZE,
  GameLogCursorError,
  paginateSortedXpSummaries,
} from "@/lib/data/game-log-pagination";
import { loadXpActivityForEnrollment } from "@/lib/data/xp-activity-loader";
import type { PublicActivityItem } from "@/types/public-athlete-profile";

const REVALIDATE_SECONDS = 120;

export type PublicGameLogPage = {
  rows: PublicActivityItem[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  /** Active category filter slug, or null for all public-safe activity. */
  category: GameLogCategoryId | null;
};

export type PublicGameLogPageResult =
  | { status: "ok"; page: PublicGameLogPage }
  | { status: "not_found" }
  | { status: "invalid_cursor"; message: string }
  | { status: "invalid_category"; message: string }
  | { status: "error"; message: string };

export type FetchPublicGameLogPageOptions = {
  cursor?: string | null;
  pageSize?: number;
  /** Stable category slug from `?category=` — never an Airtable id. */
  category?: GameLogCategoryId | null;
};

function parsePageSize(raw: string | null): number {
  if (!raw) return GAME_LOG_PAGE_SIZE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return GAME_LOG_PAGE_SIZE;
  return Math.min(Math.floor(parsed), 50);
}

export async function fetchPublicGameLogPage(
  rawSlug: string,
  cursorOrOptions: string | null | FetchPublicGameLogPageOptions = null,
  pageSizeArg = GAME_LOG_PAGE_SIZE,
): Promise<PublicGameLogPageResult> {
  const options: FetchPublicGameLogPageOptions =
    cursorOrOptions && typeof cursorOrOptions === "object"
      ? cursorOrOptions
      : { cursor: cursorOrOptions ?? null, pageSize: pageSizeArg };

  const cursor = options.cursor ?? null;
  const pageSize = options.pageSize ?? GAME_LOG_PAGE_SIZE;
  const category = options.category ?? null;

  try {
    const enrollmentId = await resolvePublicEnrollmentIdBySlug(rawSlug);
    if (!enrollmentId) {
      return { status: "not_found" };
    }

    const xpActivity = await loadXpActivityForEnrollment(enrollmentId, {
      maxRows: null,
      maxFetch: GAME_LOG_MAX_FETCH,
      revalidateSeconds: REVALIDATE_SECONDS,
    });

    const filteredRows = filterXpSummariesByCategory(xpActivity.rows, category);
    const paginated = paginateSortedXpSummaries(filteredRows, {
      cursor,
      pageSize,
    });

    return {
      status: "ok",
      page: {
        rows: mapXpSummariesToPublicActivity(paginated.pageRows),
        totalCount: filteredRows.length,
        hasMore: paginated.hasMore,
        nextCursor: paginated.nextCursor,
        category,
      },
    };
  } catch (error) {
    if (error instanceof GameLogCursorError) {
      return { status: "invalid_cursor", message: error.message };
    }
    return {
      status: "error",
      message: "Something went wrong loading activity.",
    };
  }
}

export function parseGameLogPageSizeFromQuery(raw: string | null): number {
  return parsePageSize(raw);
}

export { parseGameLogCategoryParam };
