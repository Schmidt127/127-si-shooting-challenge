import Link from "next/link";

import { HomeworkRetryActions } from "@/components/homework/homework-retry-actions";

import { formatHomeworkDueDate } from "@/components/athlete/homework-assignments";
import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { IconBook } from "@/components/icons/shoot-icons";
import {
  AccentRail,
  CtaLink,
  ProgramPage,
  SectionMarker,
} from "@/components/site";
import { ProgramFeatureBanner } from "@/components/site/program-feature-image";
import { FEATURE_BANNER_ARIA } from "@/lib/seo/program-facts";
import { EmptyState, ErrorState } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRelativeUpdate } from "@/lib/formatters";
import {
  homeworkDueStatusLabel,
  resolveHomeworkDueStatus,
} from "@/lib/data/homework-resources";
import { ACCESSIBILITY_LABELS, EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import { cn } from "@/lib/utils";
import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";

type HomeworkCatalogViewProps = {
  data: HomeworkCatalogData;
};

function dueStatusTone(
  status: ReturnType<typeof resolveHomeworkDueStatus>,
): "neutral" | "warn" | "danger" | "blue" {
  switch (status) {
    case "past_due":
      return "danger";
    case "due_soon":
      return "warn";
    case "upcoming":
      return "blue";
    default:
      return "neutral";
  }
}

function HomeworkCompactRow({
  assignment,
  index,
  isLatestWeek,
}: {
  assignment: HomeworkAssignment;
  index: number;
  isLatestWeek: boolean;
}) {
  const detailHref = `/homework/${assignment.id}`;
  const title = assignment.title || assignment.displayName;
  const dueLabel = assignment.dueDate
    ? formatHomeworkDueDate(assignment.dueDate)
    : "No due date provided";
  const dueStatus = resolveHomeworkDueStatus(assignment.dueDate);
  const dueStatusText = homeworkDueStatusLabel(dueStatus);
  const category = assignment.categoryLabel || "Assignment";

  return (
    <article
      data-testid="homework-catalog-card"
      className={cn(
        catalogCardClass(isLatestWeek && index === 0 ? { featured: "accent" } : undefined),
        "group",
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand-orange/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
              {category}
            </span>
            {dueStatusText ? (
              <StatusBadge tone={dueStatusTone(dueStatus)}>{dueStatusText}</StatusBadge>
            ) : null}
          </div>

          <h3 className="mt-2 text-base font-bold leading-snug text-foreground sm:text-lg">
            <Link
              href={detailHref}
              className="transition hover:text-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            >
              {title}
            </Link>
          </h3>

          <dl className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="min-w-0">
              <dt className="sr-only">Assigned week</dt>
              <dd className="break-words text-foreground" data-testid="homework-catalog-week">
                {assignment.weekName}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="sr-only">Due date</dt>
              <dd className="break-words" data-testid="homework-catalog-due">
                Due {dueLabel}
              </dd>
            </div>
          </dl>
        </div>

        <div className="shrink-0 sm:self-center">
          <Link
            href={detailHref}
            data-testid="homework-catalog-view-assignment"
            className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center gap-1 rounded-md border border-brand-orange/40 bg-brand-orange/10 px-4 text-sm font-semibold text-accent-soft transition hover:border-brand-orange/60 hover:bg-brand-orange/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
          >
            View assignment
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function WeekSection({
  weekName,
  assignments,
  isLatestWeek,
}: {
  weekName: string;
  assignments: HomeworkAssignment[];
  isLatestWeek: boolean;
}) {
  return (
    <section className="relative">
      <SectionMarker
        label={isLatestWeek ? "Current week" : "Week archive"}
        title={weekName}
        countLabel={`${assignments.length} assignment${assignments.length === 1 ? "" : "s"}`}
      />

      <AccentRail tone="orange">
        <ul className="space-y-3" role="list">
          {assignments.map((assignment, index) => (
            <li key={assignment.id}>
              <HomeworkCompactRow
                assignment={assignment}
                index={index}
                isLatestWeek={isLatestWeek}
              />
            </li>
          ))}
        </ul>
      </AccentRail>
    </section>
  );
}

export function HomeworkCatalogView({ data }: HomeworkCatalogViewProps) {
  return (
    <ProgramPage
      eyebrow="Curriculum drop"
      title="Homework HQ"
      description="Film study, faith, and basketball assignments — published from the challenge curriculum. Newest week at the top. Open an assignment for full instructions and resources."
      heroVariant="light"
      ambientVariant="homework"
      meta={
        <>
          {data.totalAssignments} published · Updated {formatRelativeUpdate(data.updatedAt)}
        </>
      }
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Homework"
          caption="Scan the week, then open an assignment for steps, files, and how to submit."
          mark="HW"
          ariaLabel={FEATURE_BANNER_ARIA.homework}
        />
        <div
          className="mx-auto max-w-3xl min-w-0 space-y-12"
          data-testid="homework-catalog-list"
          aria-label={ACCESSIBILITY_LABELS.homeworkCatalog}
        >
          {data.weekGroups.map((group, groupIndex) => (
            <WeekSection
              key={group.weekId || group.weekName}
              weekName={group.weekName}
              assignments={group.assignments}
              isLatestWeek={groupIndex === 0}
            />
          ))}
        </div>
      </div>
    </ProgramPage>
  );
}

export function HomeworkEmptyState() {
  return (
    <ProgramPage
      eyebrow="Curriculum drop"
      title="Homework HQ"
      description="Film study, faith, and basketball assignments — published from the challenge curriculum. Newest week at the top."
      heroVariant="light"
      ambientVariant="homework"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Homework"
          caption="Find the current curriculum and keep every assignment moving forward."
          mark="HW"
          ariaLabel={FEATURE_BANNER_ARIA.homework}
        />
        <div data-testid="homework-catalog-empty">
          <EmptyState
            title={EMPTY_STATE_COPY.homework.title}
            description={EMPTY_STATE_COPY.homework.description}
            icon={<IconBook size={40} />}
            action={
              <CtaLink href="/" variant="secondary">
                ← Shooting Challenge
              </CtaLink>
            }
          />
        </div>
      </div>
    </ProgramPage>
  );
}

export function HomeworkErrorState({
  message,
  retryable = true,
}: {
  message: string;
  retryable?: boolean;
}) {
  return (
    <ProgramPage
      eyebrow="Curriculum drop"
      title="Homework HQ"
      description="Film study, faith, and basketball assignments — published from the challenge curriculum. Newest week at the top."
      heroVariant="light"
      ambientVariant="homework"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Homework"
          caption="Find the current curriculum and keep every assignment moving forward."
          mark="HW"
          ariaLabel={FEATURE_BANNER_ARIA.homework}
        />
        <div data-testid="homework-catalog-error">
          <ErrorState
            title="Could not load homework"
            message={message}
            action={<HomeworkRetryActions retryable={retryable} />}
          />
        </div>
      </div>
    </ProgramPage>
  );
}
