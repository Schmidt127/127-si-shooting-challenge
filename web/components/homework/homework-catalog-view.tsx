import Link from "next/link";
import type { ReactNode } from "react";

import { formatHomeworkDueDate } from "@/components/athlete/homework-assignments";
import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { IconBook } from "@/components/icons/shoot-icons";
import { SafeExternalImage } from "@/components/media/safe-external-image";
import {
  AccentRail,
  CtaLink,
  ProgramPage,
  SectionMarker,
} from "@/components/site";
import { ProgramFeatureBanner } from "@/components/site/program-feature-image";
import { EmptyState, ErrorState } from "@/components/ui";
import { formatRelativeUpdate } from "@/lib/formatters";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";

type HomeworkCatalogViewProps = {
  data: HomeworkCatalogData;
};

function HomeworkCardLink({
  assignment,
  children,
}: {
  assignment: HomeworkAssignment;
  children: ReactNode;
}) {
  const externalUrl = assignment.url.trim();

  if (externalUrl) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="group relative block">
        {children}
      </a>
    );
  }

  return (
    <Link href={`/homework/${assignment.id}`} className="group relative block">
      {children}
    </Link>
  );
}

function HomeworkCard({
  assignment,
  index,
  isLatestWeek,
}: {
  assignment: HomeworkAssignment;
  index: number;
  isLatestWeek: boolean;
}) {
  const hwLabel =
    assignment.homeworkSlot ||
    assignment.homeworkNumber ||
    (assignment.assignmentNumber ? `Assignment ${assignment.assignmentNumber}` : `Assignment ${index + 1}`);
  const hasExternalUrl = Boolean(assignment.url.trim());
  const dueLabel = assignment.dueDate
    ? formatHomeworkDueDate(assignment.dueDate)
    : "No due date provided";
  const gradeBandLabel =
    assignment.gradeBands.length > 0
      ? assignment.gradeBands.join(", ")
      : assignment.gradeBandLabel.trim() || null;

  return (
    <HomeworkCardLink assignment={assignment}>
      <article
        data-testid="homework-catalog-card"
        className={catalogCardClass(
          isLatestWeek && index === 0 ? { featured: "accent" } : undefined,
        )}
      >
        <div className="flex min-w-0 flex-col sm:flex-row">
          {assignment.coverImage ? (
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-brand-light-gray sm:aspect-auto sm:h-auto sm:w-44 md:w-52">
              <SafeExternalImage
                src={assignment.coverImage.url}
                alt={assignment.title ? `${assignment.title} cover` : "Homework cover"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                fallback={
                  <div className="flex h-full min-h-[8.5rem] w-full items-center justify-center bg-brand-blue/15">
                    <span className="font-mono text-4xl font-black text-brand-blue/25">{hwLabel}</span>
                  </div>
                }
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-card/90 sm:bg-gradient-to-t sm:to-card/90" />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center border-b border-border-subtle bg-brand-blue/15 py-10 sm:w-44 sm:border-b-0 sm:border-r md:w-52">
              <span className="font-mono text-4xl font-black text-brand-blue/25">{hwLabel}</span>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-orange/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
                {hwLabel}
              </span>
              {assignment.order > 0 ? (
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Order {assignment.order}
                </span>
              ) : null}
              {assignment.bookAbbreviation ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {assignment.bookAbbreviation}
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-lg font-bold leading-snug text-foreground transition group-hover:text-accent-soft sm:text-xl">
              {assignment.displayName}
            </h3>

            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground">
              {assignment.instructionsPreview}
            </p>

            <dl className="mt-4 grid min-w-0 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Week</dt>
                <dd className="mt-0.5 break-words text-sm text-foreground">{assignment.weekName}</dd>
              </div>
              <div className="min-w-0">
                <dt className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Due</dt>
                <dd className="mt-0.5 break-words text-sm text-foreground">{dueLabel}</dd>
              </div>
              {gradeBandLabel ? (
                <div className="min-w-0">
                  <dt className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Grade band</dt>
                  <dd className="mt-0.5 break-words text-sm text-foreground">{gradeBandLabel}</dd>
                </div>
              ) : null}
              {assignment.submissionRequirement ? (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Submission</dt>
                  <dd className="mt-0.5 break-words text-sm leading-relaxed text-foreground">
                    {assignment.submissionRequirement}
                  </dd>
                </div>
              ) : null}
            </dl>

            {assignment.operatorNotes ? (
              <p className="mt-3 min-w-0 break-words rounded-md border border-border-subtle bg-brand-light-gray/60 px-3 py-2 text-xs leading-relaxed text-foreground">
                <span className="font-semibold text-muted-foreground">Coach note: </span>
                {assignment.operatorNotes}
              </p>
            ) : null}

            {assignment.topics.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {assignment.topics.slice(0, 4).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-md border border-border bg-brand-light-gray/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
              {hasExternalUrl ? "Open assignment" : "View details"}
              <span aria-hidden>{hasExternalUrl ? "↗" : "→"}</span>
            </span>
          </div>
        </div>
      </article>
    </HomeworkCardLink>
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
        {assignments.map((assignment, index) => (
          <HomeworkCard
            key={assignment.id}
            assignment={assignment}
            index={index}
            isLatestWeek={isLatestWeek}
          />
        ))}
      </AccentRail>
    </section>
  );
}

export function HomeworkCatalogView({ data }: HomeworkCatalogViewProps) {
  return (
    <ProgramPage
      eyebrow="Curriculum drop"
      title="Homework HQ"
      description="Film study, faith, and basketball assignments — published from the challenge curriculum. Newest week at the top."
      heroVariant="light"
      ambientVariant="homework"
      meta={
        <>
          {data.totalAssignments} published · Updated {formatRelativeUpdate(data.updatedAt)}
        </>
      }
    >
      <div className="space-y-8">
        <ProgramFeatureBanner title="Homework" caption="Find the current curriculum and keep every assignment moving forward." mark="HW" />
        <div className="mx-auto max-w-4xl min-w-0 space-y-14" data-testid="homework-catalog-list">
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
        <ProgramFeatureBanner title="Homework" caption="Find the current curriculum and keep every assignment moving forward." mark="HW" />
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

export function HomeworkErrorState({ message }: { message: string }) {
  return (
    <ProgramPage
      eyebrow="Curriculum drop"
      title="Homework HQ"
      description="Film study, faith, and basketball assignments — published from the challenge curriculum. Newest week at the top."
      heroVariant="light"
      ambientVariant="homework"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner title="Homework" caption="Find the current curriculum and keep every assignment moving forward." mark="HW" />
        <div data-testid="homework-catalog-error">
          <ErrorState
            title="Could not load homework"
            message={message}
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
