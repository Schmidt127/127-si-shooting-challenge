import React from "react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import { withBasePath } from "@/lib/app-config";
import { formatXp } from "@/lib/formatters";
import type {
  PublicHomeworkAssignment,
  PublicHomeworkCompletionStatus,
} from "@/types/public-athlete-profile";

type HomeworkAssignmentsProps = {
  assignments: PublicHomeworkAssignment[];
};

export function formatHomeworkDueDate(dateKey: string | null): string {
  if (!dateKey) return "No due date";
  const parsed = Date.parse(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed)) return dateKey;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatHomeworkXp(assignment: PublicHomeworkAssignment): string {
  if (assignment.xpAwarded == null) {
    return assignment.completionStatus === "not_started" ? "Pending" : "—";
  }
  return formatXp(assignment.xpAwarded);
}

function statusTone(status: PublicHomeworkCompletionStatus): StatusBadgeTone {
  switch (status) {
    case "approved":
      return "success";
    case "submitted":
    case "under_review":
      return "blue";
    case "needs_revision":
      return "warn";
    case "not_accepted":
      return "danger";
    default:
      return "neutral";
  }
}

function creditLabel(assignment: PublicHomeworkAssignment): string | null {
  if (assignment.creditEligible === true) return "Credit earned";
  if (assignment.creditEligible === false) {
    if (assignment.lateSubmission) return "Late — no credit";
    if (assignment.pastDue && assignment.completionStatus === "not_started") {
      return "Past due";
    }
    return "No credit";
  }
  return null;
}

export function HomeworkAssignments({ assignments }: HomeworkAssignmentsProps) {
  return (
    <section aria-labelledby="homework-assignments-heading" data-testid="homework-assignments">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">Homework</p>
          <h2
            id="homework-assignments-heading"
            className="mt-1 text-xl font-bold text-foreground sm:text-2xl"
          >
            Assignments
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Every active challenge assignment for this athlete&apos;s grade band, with submission status
            and coach feedback.
          </p>
        </div>
        <div className="relative mx-auto h-20 w-20 shrink-0 sm:mx-0 sm:h-24 sm:w-24" aria-hidden="true">
          <Image
            src={withBasePath("/images/shooting-challenge-homework.webp")}
            alt=""
            fill
            className="object-contain"
            sizes="96px"
          />
        </div>
      </div>

      {assignments.length === 0 ? (
        <p
          className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted"
          data-testid="homework-assignments-empty"
        >
          No homework assignments are scheduled yet for this athlete&apos;s grade band.
        </p>
      ) : (
        <ul className="mt-5 space-y-3" data-testid="homework-assignments-list">
          {assignments.map((assignment) => {
            const credit = creditLabel(assignment);
            const title = assignment.homeworkDetailHref ? (
              <Link
                href={assignment.homeworkDetailHref}
                className="font-semibold text-foreground underline-offset-2 hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                {assignment.assignmentName}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{assignment.assignmentName}</span>
            );

            return (
              <li
                key={assignment.key}
                data-testid="homework-assignment-row"
                data-assignment-name={assignment.assignmentName}
                className="grid gap-3 border border-border bg-card px-4 py-4 sm:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] sm:items-start sm:px-5"
              >
                <div className="min-w-0">
                  {title}
                  <p className="mt-1 text-xs text-muted">{assignment.weekLabel}</p>
                  {assignment.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {assignment.description}
                    </p>
                  ) : null}
                  {assignment.coachFeedback ? (
                    <p className="mt-2 text-sm text-foreground/90">
                      <span className="font-medium text-muted">Coach feedback: </span>
                      {assignment.coachFeedback}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm">
                  <span className="block text-[10px] uppercase tracking-wider text-muted">Due</span>
                  <span className="font-medium">{formatHomeworkDueDate(assignment.dueDate)}</span>
                </p>
                <p className="text-sm">
                  <span className="block text-[10px] uppercase tracking-wider text-muted">Status</span>
                  <StatusBadge tone={statusTone(assignment.completionStatus)} className="mt-1">
                    {assignment.completionStatusLabel}
                  </StatusBadge>
                </p>
                <p className="text-sm">
                  <span className="block text-[10px] uppercase tracking-wider text-muted">XP</span>
                  <span className="font-mono font-bold text-accent-soft">
                    {formatHomeworkXp(assignment)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="block text-[10px] uppercase tracking-wider text-muted">Credit</span>
                  <span className="font-medium">{credit ?? "—"}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
