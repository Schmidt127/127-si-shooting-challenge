"use client";

import { useCallback, useRef, useState } from "react";

import { GameLogCategoryToolbar, type GameLogFilterSelection } from "@/components/athlete/game-log-category-toolbar";
import {
  ScCardList,
  ScCardRowItem,
  ScCardSectionHeader,
  scCardEmpty,
} from "@/components/ui/sc-card";
import { withBasePath } from "@/lib/app-config";
import {
  PUBLIC_GAME_LOG_CATEGORY_OPTIONS,
  gameLogCategoryLabel,
  type GameLogCategoryId,
} from "@/lib/data/game-log-categories";
import {
  formatGameLogDateLine,
  formatGameLogDisplayDate,
} from "@/lib/data/game-log-presentation";
import { formatXp } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { PublicActivityItem } from "@/types/public-athlete-profile";

type GameLogApiResponse = {
  rows: PublicActivityItem[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  category?: GameLogCategoryId | null;
};

type RecentActivityLogProps = {
  slug: string;
  items: PublicActivityItem[];
  totalCount?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  notice?: string | null;
};

export function RecentActivityLog({
  slug,
  items: initialItems,
  totalCount: initialTotalCount,
  hasMore: initialHasMore = false,
  nextCursor: initialNextCursor = null,
  notice,
}: RecentActivityLogProps) {
  const [filter, setFilter] = useState<GameLogFilterSelection>("all");
  const [items, setItems] = useState(initialItems);
  const [totalCount, setTotalCount] = useState(initialTotalCount ?? initialItems.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef(false);

  const visibleCount = items.length;
  const categoryParam = filter === "all" ? null : filter;

  const fetchPage = useCallback(
    async (options: { cursor: string | null; replace: boolean; category: GameLogCategoryId | null }) => {
      if (inflightRef.current) return;

      inflightRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (options.cursor) params.set("cursor", options.cursor);
        if (options.category) params.set("category", options.category);

        const response = await fetch(
          withBasePath(`/api/athletes/${encodeURIComponent(slug)}/game-log?${params.toString()}`),
        );

        if (!response.ok) {
          throw new Error("load_failed");
        }

        const data = (await response.json()) as GameLogApiResponse;

        setItems((current) => {
          if (options.replace) return data.rows;
          const existingKeys = new Set(current.map((item) => item.key));
          const appended = data.rows.filter((row) => !existingKeys.has(row.key));
          return [...current, ...appended];
        });
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch {
        setError(
          options.replace
            ? "Could not load activity for this filter. Try again."
            : "Could not load more activity. Try again.",
        );
      } finally {
        setLoading(false);
        inflightRef.current = false;
      }
    },
    [slug],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor) return;
    await fetchPage({ cursor: nextCursor, replace: false, category: categoryParam });
  }, [categoryParam, fetchPage, hasMore, nextCursor]);

  const onFilterChange = useCallback(
    (next: GameLogFilterSelection) => {
      setFilter(next);
      const nextCategory = next === "all" ? null : next;
      if (next === "all") {
        setItems(initialItems);
        setTotalCount(initialTotalCount ?? initialItems.length);
        setHasMore(initialHasMore);
        setNextCursor(initialNextCursor);
        setError(null);
        return;
      }
      void fetchPage({ cursor: null, replace: true, category: nextCategory });
    },
    [fetchPage, initialHasMore, initialItems, initialNextCursor, initialTotalCount],
  );

  const emptyMessage =
    filter === "all"
      ? "No approved public activity yet. Counted submissions and XP awards will appear here."
      : `No ${gameLogCategoryLabel(categoryParam).toLowerCase()} activity yet.`;

  return (
    <section aria-labelledby="activity-heading" data-testid="recent-activity">
      <ScCardSectionHeader eyebrow="Game log" title="Recent activity" titleId="activity-heading" />

      <div className="mt-3">
        <GameLogCategoryToolbar
          options={PUBLIC_GAME_LOG_CATEGORY_OPTIONS}
          value={filter}
          onChange={onFilterChange}
          ariaLabel="Filter public game log by category"
          testId="public-game-log-category-toolbar"
        />
      </div>

      {notice ? (
        <p
          className="mt-3 rounded-[var(--sc-card-radius)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="recent-activity-notice"
        >
          {notice}
        </p>
      ) : null}

      {totalCount > 0 ? (
        <p className="mt-3 text-xs text-muted" data-testid="recent-activity-count">
          Showing {visibleCount} of {totalCount} XP activity entries
          {filter === "all" ? "" : ` · ${gameLogCategoryLabel(categoryParam)}`} (newest first).
        </p>
      ) : null}

      {items.length === 0 && !loading ? (
        <p className={cn(scCardEmpty(), "mt-4")} data-testid="recent-activity-empty">
          {emptyMessage}
        </p>
      ) : items.length === 0 && loading ? (
        <p className={cn(scCardEmpty(), "mt-4")} data-testid="recent-activity-loading">
          Loading activity…
        </p>
      ) : (
        <>
          <ScCardList>
            {items.map((item) => (
              <ScCardRowItem key={item.key} testId="recent-activity-row">
                <div
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem_minmax(4.5rem,auto)] items-baseline gap-x-3 gap-y-0.5"
                  data-testid="recent-activity-event-grid"
                >
                  <p className="col-start-1 row-start-1 min-w-0 break-words text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <span
                    aria-hidden="true"
                    className="col-start-2 row-start-1"
                    data-testid="recent-activity-middle"
                  />
                  <p className="col-start-3 row-start-1 whitespace-nowrap text-right font-mono text-sm font-bold text-accent-soft">
                    {item.xp != null ? `+${formatXp(item.xp)} XP` : "—"}
                  </p>
                  {item.dateOnSecondRowRight ? (
                    <>
                      <p
                        className="col-start-1 row-start-2 min-w-0 break-words text-xs text-muted"
                        data-testid="recent-activity-subline"
                      >
                        {item.subline}
                      </p>
                      <span
                        aria-hidden="true"
                        className="col-start-2 row-start-2"
                        data-testid="recent-activity-middle-row-2"
                      />
                      <p
                        className="col-start-3 row-start-2 whitespace-nowrap text-right text-xs text-muted"
                        data-testid="recent-activity-date"
                      >
                        {formatGameLogDisplayDate(item.date)}
                      </p>
                    </>
                  ) : (
                    <p
                      className="col-start-1 row-start-2 min-w-0 break-words text-xs text-muted"
                      data-testid="recent-activity-date"
                    >
                      {formatGameLogDateLine(item.date, item.dateTagline)}
                    </p>
                  )}
                </div>
              </ScCardRowItem>
            ))}
          </ScCardList>

          {error ? (
            <div
              className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              role="alert"
              data-testid="recent-activity-error"
            >
              {error}
              <button
                type="button"
                className="ml-2 font-semibold underline underline-offset-2"
                onClick={() =>
                  nextCursor
                    ? loadMore()
                    : fetchPage({ cursor: null, replace: true, category: categoryParam })
                }
              >
                Retry
              </button>
            </div>
          ) : null}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="rounded-[var(--sc-card-radius)] border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-brand-light-gray/80 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="recent-activity-load-more"
                disabled={loading}
                aria-busy={loading}
                onClick={() => loadMore()}
              >
                {loading ? "Loading…" : `Load more (${totalCount - visibleCount} remaining)`}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
