"use client";

import { useCallback, useRef, useState } from "react";

import { withBasePath } from "@/lib/app-config";
import {
  formatGameLogDateLine,
  formatGameLogDisplayDate,
} from "@/lib/data/game-log-presentation";
import { formatXp } from "@/lib/formatters";
import type { PublicActivityItem } from "@/types/public-athlete-profile";

type GameLogApiResponse = {
  rows: PublicActivityItem[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
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
  totalCount,
  hasMore: initialHasMore = false,
  nextCursor: initialNextCursor = null,
  notice,
}: RecentActivityLogProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef(false);

  const total = totalCount ?? items.length;
  const visibleCount = items.length;

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || inflightRef.current) return;

    inflightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      const response = await fetch(
        withBasePath(`/api/athletes/${encodeURIComponent(slug)}/game-log?${params.toString()}`),
      );

      if (!response.ok) {
        throw new Error("load_failed");
      }

      const data = (await response.json()) as GameLogApiResponse;

      setItems((current) => {
        const existingKeys = new Set(current.map((item) => item.key));
        const appended = data.rows.filter((row) => !existingKeys.has(row.key));
        return [...current, ...appended];
      });
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      setError("Could not load more activity. Try again.");
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, [hasMore, nextCursor, slug]);

  return (
    <section aria-labelledby="activity-heading" data-testid="recent-activity">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">Game log</p>
      <h2 id="activity-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Recent activity
      </h2>

      {notice ? (
        <p
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="recent-activity-notice"
        >
          {notice}
        </p>
      ) : null}

      {total > 0 ? (
        <p className="mt-3 text-xs text-muted" data-testid="recent-activity-count">
          Showing {visibleCount} of {total} XP activity entries (newest first).
        </p>
      ) : null}

      {items.length === 0 ? (
        <p
          className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted"
          data-testid="recent-activity-empty"
        >
          No approved public activity yet. Counted submissions and XP awards will appear here.
        </p>
      ) : (
        <>
          <ol className="mt-5 divide-y divide-border border border-border bg-card">
            {items.map((item) => (
              <li key={item.key} className="px-4 py-3 sm:px-5" data-testid="recent-activity-row">
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
              </li>
            ))}
          </ol>

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
                onClick={() => loadMore()}
              >
                Retry
              </button>
            </div>
          ) : null}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-brand-light-gray/80 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="recent-activity-load-more"
                disabled={loading}
                aria-busy={loading}
                onClick={() => loadMore()}
              >
                {loading ? "Loading…" : `Load more (${total - visibleCount} remaining)`}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
