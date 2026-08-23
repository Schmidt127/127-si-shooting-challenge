"use client";

import { useCallback, useMemo, useState } from "react";

import { ErrorState } from "@/components/ui";
import { formatXp } from "@/lib/formatters";
import { mergeXpActivityPages } from "@/lib/data/xp-activity";
import type {
  XpActivityPage,
  XpActivityRow,
  XpActivityRowKind,
  XpActivitySortDirection,
  XpActivitySortField,
} from "@/types/xp-activity";

type XpActivityTableProps = {
  slug: string;
  initialPage: XpActivityPage;
  basePath?: string;
};

const KIND_LABELS: Record<XpActivityRowKind, string> = {
  shooting_submission: "Shooting",
  homework: "Homework",
  video: "Video",
  shot_milestone: "Milestone",
  achievement: "Achievement",
  streak: "Streak",
  perfect_week: "Perfect Week",
  zoom: "Zoom",
  weekly_threshold: "Weekly threshold",
  manual: "Manual",
  other: "Other",
};

function formatActivityDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sortRows(
  rows: XpActivityRow[],
  field: XpActivitySortField,
  direction: XpActivitySortDirection,
): XpActivityRow[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (field === "date") {
      return (a.sortDateMs - b.sortDateMs) * factor;
    }
    if (field === "xp") {
      return (a.xp - b.xp) * factor;
    }
    return a.title.localeCompare(b.title) * factor;
  });
}

export function XpActivityTable({
  slug,
  initialPage,
  basePath = "",
}: XpActivityTableProps) {
  const [rows, setRows] = useState(initialPage.rows);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<XpActivityRowKind | "all">("all");
  const [sortField, setSortField] = useState<XpActivitySortField>("date");
  const [sortDirection, setSortDirection] = useState<XpActivitySortDirection>("desc");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = `${row.title} ${row.detail ?? ""} ${row.sourceLabel ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
    return sortRows(filtered, sortField, sortDirection);
  }, [rows, query, kindFilter, sortField, sortDirection]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(
        `${basePath}/api/athletes/${encodeURIComponent(slug)}/xp-activity?cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const payload = (await response.json()) as XpActivityPage;
      setRows((current) => mergeXpActivityPages(current, payload.rows));
      setNextCursor(payload.nextCursor);
      setHasMore(payload.hasMore);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load more XP activity.",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [basePath, hasMore, loadingMore, nextCursor, slug]);

  const retry = useCallback(() => {
    setError(null);
    void loadMore();
  }, [loadMore]);

  return (
    <section aria-labelledby="xp-activity-heading" data-testid="xp-activity-table">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">XP history</p>
      <h2 id="xp-activity-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        XP activity
      </h2>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter activity"
            className="min-h-11 rounded-md border border-border bg-card px-3 text-sm normal-case text-foreground"
          />
        </label>
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Type
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as XpActivityRowKind | "all")}
            className="min-h-11 rounded-md border border-border bg-card px-3 text-sm normal-case text-foreground"
          >
            <option value="all">All types</option>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Sort
          <select
            value={`${sortField}:${sortDirection}`}
            onChange={(event) => {
              const [field, direction] = event.target.value.split(":") as [
                XpActivitySortField,
                XpActivitySortDirection,
              ];
              setSortField(field);
              setSortDirection(direction);
            }}
            className="min-h-11 rounded-md border border-border bg-card px-3 text-sm normal-case text-foreground"
          >
            <option value="date:desc">Newest first</option>
            <option value="date:asc">Oldest first</option>
            <option value="xp:desc">Highest XP</option>
            <option value="xp:asc">Lowest XP</option>
            <option value="title:asc">Title A–Z</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorState
            title="Could not load more XP activity"
            message={error}
            action={
              <button
                type="button"
                onClick={retry}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-bold text-white"
              >
                Retry
              </button>
            }
          />
        </div>
      ) : null}

      {filteredRows.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          No XP activity matches your filters yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-border bg-card text-left text-sm">
            <thead className="bg-brand-light-gray/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3 font-semibold sm:px-4">Date</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Activity</th>
                <th className="px-3 py-3 font-semibold sm:px-4">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((row) => (
                <tr key={row.key} data-testid="xp-activity-row">
                  <td className="whitespace-nowrap px-3 py-3 text-muted sm:px-4">
                    {formatActivityDate(row.activityDate)}
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <p className="font-semibold text-foreground">{row.title}</p>
                    {row.detail ? (
                      <p className="mt-0.5 text-xs text-muted">{row.detail}</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono font-bold text-accent-soft sm:px-4">
                    +{formatXp(row.xp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-bold text-foreground disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
