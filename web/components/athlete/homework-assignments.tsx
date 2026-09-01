import React from "react";
import Image from "next/image";
import Link from "next/link";

import { CoachFeedbackQuote } from "@/components/coach-feedback-quote";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import {
  scCardEmpty,
  scCardSectionEyebrow,
  scCardSectionTitle,
  scCardStandalone,
} from "@/components/ui/sc-card";
import { withBasePath } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import { formatXp } from "@/lib/formatters";
import { PROFILE_HOMEWORK_UNAVAILABLE_MESSAGE } from "@/lib/formatters/profile-freshness";
import type {
  PublicHomeworkAssignment,
  PublicHomeworkCompletionStatus,
} from "@/types/public-athlete-profile";

type HomeworkAssignmentsProps = {
  assignments: PublicHomeworkAssignment[];
  loadUnavailable?: boolean;
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

export function HomeworkAssignments({
  assignments,
  loadUnavailable = false,
}: HomeworkAssignmentsProps) {
  return (
    <section aria-labelledby="homework-assignments-heading" data-testid="homework-assignments">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={scCardSectionEyebrow()}>Homework</p>
          <h2
            id="homework-assignments-heading"
            className={scCardSectionTitle()}
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

      {loadUnavailable ? (
        <p
          className="mt-4 rounded-[var(--sc-card-radius)] border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-950"
          role="status"
          data-testid="homework-assignments-unavailable"
        >
          {PROFILE_HOMEWORK_UNAVAILABLE_MESSAGE}
        </p>
      ) : assignments.length === 0 ? (
        <p
          className={cn(scCardEmpty(), "mt-4")}
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
                className={cn(
                  scCardStandalone(),
                  "grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] sm:items-start",
                )}
              >
                <div className="min-w-0">
                  {title}
                  <p className="mt-1 text-xs text-muted">{assignment.weekLabel}</p>
                  {assignment.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {assignment.description}
                    </p>
                  ) : null}
                  <CoachFeedbackQuote feedback={assignment.coachFeedback} />
                  {assignment.viewSubmittedHomeworkHref ? (
                    <a
                      href={assignment.viewSubmittedHomeworkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-blue underline-offset-2 hover:text-accent-soft hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                      data-testid="view-submitted-homework-cta"
                    >
                      View Submitted Homework
                    </a>
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
