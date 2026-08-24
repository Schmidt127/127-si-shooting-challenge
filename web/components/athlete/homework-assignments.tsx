import Link from "next/link";

import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import { formatXp } from "@/lib/formatters";
import type {
  PublicHomeworkAssignment,
  PublicHomeworkCompletionStatus,
} from "@/types/public-athlete-profile";

type HomeworkAssignmentsProps = {
  assignments: PublicHomeworkAssignment[];
};

function formatDueDate(dateKey: string | null): string {
  if (!dateKey) return "—";
  const parsed = Date.parse(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed)) return dateKey;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    if (assignment.pastDue && assignment.completionStatus === "not_started") return "Past due";
    return "No credit";
  }
  return null;
}

export function HomeworkAssignments({ assignments }: HomeworkAssignmentsProps) {
  return (
    <section aria-labelledby="homework-assignments-heading" data-testid="homework-assignments">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">Homework</p>
      <h2 id="homework-assignments-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Assignments
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Every active challenge assignment for this athlete&apos;s grade band, with submission status and coach feedback.
      </p>

      {assignments.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          No homework assignments are scheduled yet for this athlete&apos;s grade band.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
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
                className="grid gap-3 border border-border bg-card px-4 py-4 sm:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] sm:items-start sm:px-5"
              >
                <div className="min-w-0">
                  {title}
                  <p className="mt-1 text-xs text-muted">{assignment.weekLabel}</p>
                  {assignment.coachFeedback ? (
                    <p className="mt-2 text-sm text-foreground/90">{assignment.coachFeedback}</p>
                  ) : null}
                </div>
                <p className="text-sm">
                  <span className="block text-[10px] uppercase tracking-wider text-muted">Due</span>
                  <span className="font-medium">{formatDueDate(assignment.dueDate)}</span>
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
                    {assignment.xpAwarded == null ? "—" : formatXp(assignment.xpAwarded)}
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
