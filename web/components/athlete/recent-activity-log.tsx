"use client";

import { useCallback, useRef, useState } from "react";

import { withBasePath } from "@/lib/app-config";
import { formatShots, formatXp } from "@/lib/formatters";
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
              <li
                key={item.key}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2 sm:px-5"
                data-testid="recent-activity-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.date ?? "Date TBD"}
                    {item.detail ? (
                      <>
                        <span aria-hidden> · </span>
                        <span className="text-foreground/80">{item.detail}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="font-mono text-sm font-bold text-accent-soft sm:shrink-0 sm:text-right">
                  {item.xp != null
                    ? `+${formatXp(item.xp)} XP`
                    : item.shots != null
                      ? `${formatShots(item.shots)} shots`
                      : "—"}
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
