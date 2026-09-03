"use client";

import { useMemo, useState } from "react";

import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import { CtaLink, SectionMarker } from "@/components/site";
import { StatusBadge, scCardInset } from "@/components/ui";
import {
  homeworkBadgeLabel,
  homeworkBadgeTone,
} from "@/lib/data/athlete-dashboard";
import { formatXp } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DashboardHomeworkItem } from "@/types/private-athlete-dashboard";

type DashboardHomeworkSectionProps = {
  items: DashboardHomeworkItem[];
};

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "submitted", label: "Submitted" },
  { id: "needs_revision", label: "Needs revision" },
  { id: "awarded", label: "Awarded" },
] as const;

type FilterId = (typeof FILTER_OPTIONS)[number]["id"];

export function DashboardHomeworkSection({ items }: DashboardHomeworkSectionProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "pending") return items.filter((item) => item.badgeStatus === "pending");
    if (filter === "submitted")
      return items.filter((item) => item.badgeStatus === "submitted" || item.completionStatus === "under_review");
    if (filter === "needs_revision")
      return items.filter((item) => item.badgeStatus === "needs_revision");
    return items.filter((item) => item.badgeStatus === "awarded" || item.badgeStatus === "complete");
  }, [filter, items]);

  return (
    <section id="dashboard-homework" className="scroll-mt-24" aria-labelledby="dashboard-homework-heading">
      <SectionMarker label="Homework" title="Assignments & feedback" />

      <div className="mt-4 flex flex-wrap gap-2" role="toolbar" aria-label="Filter homework">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={cn(
              "min-h-10 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === option.id
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-border bg-card text-muted hover:border-brand-blue/40",
            )}
            aria-pressed={filter === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={cn(catalogPanelClass({ tint: "neutral" }), "mt-4 text-sm text-muted")} role="status">
          {items.length === 0
            ? "No homework assignments are scheduled for your grade band yet."
            : "No assignments match this filter."}
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden" data-testid="dashboard-homework-cards">
            {filtered.map((item) => (
              <HomeworkCard key={item.key} item={item} />
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block" data-testid="dashboard-homework-table">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  <th className="px-3 py-2">Assignment</th>
                  <th className="px-3 py-2">Week</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">XP</th>
                  <th className="px-3 py-2">Links</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.key} className="border-b border-border/70 align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{item.assignmentName}</p>
                      {item.homeworkSlot ? (
                        <p className="text-xs text-muted">{item.homeworkSlot}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-muted">{item.weekLabel}</td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={homeworkBadgeTone(item.badgeStatus)}>
                        {homeworkBadgeLabel(item.badgeStatus)}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {item.submissionDate ?? "—"}
                      {item.lateSubmission ? (
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted">
                          Late · full credit if satisfactory
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-brand-blue">
                      {item.xpAwarded != null ? `+${formatXp(item.xpAwarded)}` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <HomeworkLinks item={item} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function HomeworkCard({ item }: { item: DashboardHomeworkItem }) {
  return (
    <article className={catalogPanelClass({ tint: "neutral" })} data-testid="dashboard-homework-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {item.weekLabel}
            {item.homeworkSlot ? ` · ${item.homeworkSlot}` : ""}
          </p>
          <h3 className="mt-1 text-base font-bold text-foreground">{item.assignmentName}</h3>
        </div>
        <StatusBadge tone={homeworkBadgeTone(item.badgeStatus)}>
          {homeworkBadgeLabel(item.badgeStatus)}
        </StatusBadge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-muted">Due</dt>
          <dd className="font-medium text-foreground">{item.dueDate ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Submitted</dt>
          <dd className="font-medium text-foreground">
            {item.submissionDate ?? "—"}
            {item.lateSubmission ? (
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted">
                Late · full credit if satisfactory
              </span>
            ) : null}
          </dd>
        </div>
        {item.xpAwarded != null ? (
          <div>
            <dt className="text-muted">XP</dt>
            <dd className="font-mono font-semibold text-brand-blue">+{formatXp(item.xpAwarded)}</dd>
          </div>
        ) : null}
        {item.satisfactory != null ? (
          <div>
            <dt className="text-muted">Satisfactory</dt>
            <dd className="font-medium text-foreground">{item.satisfactory ? "Yes" : "Pending"}</dd>
          </div>
        ) : null}
      </dl>

      {item.coachFeedback ? (
        <p className={cn(scCardInset(), "mt-3 text-sm leading-relaxed text-muted")}>{item.coachFeedback}</p>
      ) : null}

      <div className="mt-4">
        <HomeworkLinks item={item} />
      </div>
    </article>
  );
}

function HomeworkLinks({ item, compact = false }: { item: DashboardHomeworkItem; compact?: boolean }) {
  return (
    <div className={cn("flex flex-wrap gap-3", compact ? "text-xs" : "text-sm")}>
      {item.homeworkDetailHref ? (
        <CtaLink href={item.homeworkDetailHref} variant="link" className="px-0">
          Assignment details
        </CtaLink>
      ) : null}
      {item.viewSubmittedHomeworkHref ? (
        <a
          href={item.viewSubmittedHomeworkHref}
          className="font-semibold text-brand-blue underline-offset-2 hover:underline"
          rel="noopener noreferrer"
          target="_blank"
        >
          View submitted work
        </a>
      ) : null}
    </div>
  );
}
