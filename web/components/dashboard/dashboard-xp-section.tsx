"use client";

import { useMemo, useState } from "react";

import { XpActivityTable } from "@/components/dashboard/xp-activity-table";
import { cn } from "@/lib/utils";
import type { XpEventSummary } from "@/types/xp";

type DashboardXpSectionProps = {
  rows: XpEventSummary[];
  warning?: string;
  totalAvailableRows?: number;
};

const XP_FILTERS = [
  { id: "all", label: "All", match: () => true },
  {
    id: "submissions",
    label: "Submissions",
    match: (row: XpEventSummary) => /submission|shooting base/i.test(row.sourceLabel ?? ""),
  },
  {
    id: "homework",
    label: "Homework",
    match: (row: XpEventSummary) => /homework/i.test(row.sourceLabel ?? ""),
  },
  {
    id: "video",
    label: "Video",
    match: (row: XpEventSummary) => /video/i.test(row.sourceLabel ?? ""),
  },
  {
    id: "zoom",
    label: "Zoom",
    match: (row: XpEventSummary) => /zoom/i.test(row.sourceLabel ?? ""),
  },
  {
    id: "streaks",
    label: "Streaks",
    match: (row: XpEventSummary) => /streak/i.test(row.sourceLabel ?? ""),
  },
  {
    id: "milestones",
    label: "Milestones",
    match: (row: XpEventSummary) => /milestone|threshold|weekly threshold/i.test(row.sourceLabel ?? ""),
  },
  {
    id: "awards",
    label: "Awards",
    match: (row: XpEventSummary) =>
      /perfect week|manual bonus|achievement/i.test(row.sourceLabel ?? row.reasonPublic ?? ""),
  },
] as const;

type FilterId = (typeof XP_FILTERS)[number]["id"];

export function DashboardXpSection({ rows, warning, totalAvailableRows }: DashboardXpSectionProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filteredRows = useMemo(() => {
    const matcher = XP_FILTERS.find((item) => item.id === filter)?.match ?? XP_FILTERS[0].match;
    return rows.filter(matcher);
  }, [filter, rows]);

  return (
    <section id="dashboard-xp" className="scroll-mt-24" aria-labelledby="dashboard-xp-heading">
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Filter XP activity">
        {XP_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={cn(
              "min-h-10 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === option.id
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-border bg-card text-muted hover:border-brand-orange/40",
            )}
            aria-pressed={filter === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <XpActivityTable
          rows={filteredRows}
          warning={warning}
          totalAvailableRows={totalAvailableRows}
          emptyMessage={
            filter === "all"
              ? "No XP events to show yet."
              : "No XP events match this filter yet."
          }
        />
      </div>
    </section>
  );
}
