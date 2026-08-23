"use client";

import { useState } from "react";

import { formatShots, formatXp } from "@/lib/formatters";
import type { PublicActivityItem } from "@/types/public-athlete-profile";

const INITIAL_VISIBLE = 12;
const PAGE_SIZE = 12;

type RecentActivityLogProps = {
  items: PublicActivityItem[];
  totalCount?: number;
  notice?: string | null;
};

export function RecentActivityLog({ items, totalCount, notice }: RecentActivityLogProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const total = totalCount ?? items.length;
  const visibleItems = items.slice(0, visibleCount);
  const canLoadMore = visibleCount < items.length;

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
          Showing {visibleItems.length} of {total} XP activity entries (newest first).
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          No approved public activity yet. Counted submissions and XP awards will appear here.
        </p>
      ) : (
        <>
          <ol className="mt-5 divide-y divide-border border border-border bg-card">
            {visibleItems.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 sm:px-5"
                data-testid="recent-activity-row"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.date ?? "Date TBD"}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </p>
                </div>
                <div className="font-mono text-sm font-bold text-accent-soft">
                  {item.xp != null
                    ? `+${formatXp(item.xp)} XP`
                    : item.shots != null
                      ? `${formatShots(item.shots)} shots`
                      : "—"}
                </div>
              </li>
            ))}
          </ol>

          {canLoadMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-brand-light-gray/80"
                data-testid="recent-activity-load-more"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Load more ({items.length - visibleCount} remaining)
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
