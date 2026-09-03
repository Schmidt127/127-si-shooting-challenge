/**
 * Public athlete Game Log — enrollment-scoped XP activity with server pagination.
 */

import { resolvePublicEnrollmentIdBySlug } from "@/lib/airtable/queries";
import {
  filterXpRowsByCategory,
  parseGameLogCategoryParam,
  type GameLogCategoryId,
} from "@/lib/data/game-log-categories";
import { mapXpSummariesToPublicActivity } from "@/lib/data/public-athlete-profile";
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
  /** Active public-safe category filter, or null for All. */
  category: GameLogCategoryId | null;
};

export type PublicGameLogPageResult =
  | { status: "ok"; page: PublicGameLogPage }
  | { status: "not_found" }
  | { status: "invalid_cursor"; message: string }
  | { status: "error"; message: string };

function parsePageSize(raw: string | null): number {
  if (!raw) return GAME_LOG_PAGE_SIZE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return GAME_LOG_PAGE_SIZE;
  return Math.min(Math.floor(parsed), 50);
}

export async function fetchPublicGameLogPage(
  rawSlug: string,
  cursor: string | null,
  pageSize = GAME_LOG_PAGE_SIZE,
  category: GameLogCategoryId | null = null,
): Promise<PublicGameLogPageResult> {
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

    const filteredRows = filterXpRowsByCategory(xpActivity.rows, category);

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

export function parseGameLogCategoryFromQuery(raw: string | null): GameLogCategoryId | null {
  return parseGameLogCategoryParam(raw);
}
