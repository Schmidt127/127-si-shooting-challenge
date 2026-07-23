import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { IconBook } from "@/components/icons/shoot-icons";
import {
  AccentRail,
  CtaLink,
  ProgramPage,
  SectionMarker,
} from "@/components/site";
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
    assignment.homeworkNumber || `Assignment ${assignment.assignmentNumber || index + 1}`;
  const hasExternalUrl = Boolean(assignment.url.trim());

  return (
    <HomeworkCardLink assignment={assignment}>
      <article
        className={catalogCardClass(
          isLatestWeek && index === 0 ? { featured: "accent" } : undefined,
        )}
      >
        <div className="flex flex-col sm:flex-row">
          {assignment.coverImage ? (
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-brand-light-gray sm:aspect-auto sm:h-auto sm:w-44 md:w-52">
              <Image
                src={assignment.coverImage.url}
                alt={assignment.title ? `${assignment.title} cover` : "Homework cover"}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, 208px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/90 sm:bg-gradient-to-t sm:to-card/90" />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center border-b border-border-subtle bg-brand-blue/15 py-10 sm:w-44 sm:border-b-0 sm:border-r md:w-52">
              <span className="font-mono text-4xl font-black text-brand-blue/25">{hwLabel}</span>
            </div>
          )}

          <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-orange/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
                {hwLabel}
              </span>
              {assignment.bookAbbreviation ? (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  {assignment.bookAbbreviation}
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-lg font-bold leading-snug text-foreground transition group-hover:text-accent-soft sm:text-xl">
              {assignment.displayName}
            </h3>

            {assignment.briefDescription ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted">{assignment.briefDescription}</p>
            ) : null}

            {assignment.topics.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {assignment.topics.slice(0, 3).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted"
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
      <div className="mx-auto max-w-4xl space-y-14">
        {data.weekGroups.map((group, groupIndex) => (
          <WeekSection
            key={group.weekId || group.weekName}
            weekName={group.weekName}
            assignments={group.assignments}
            isLatestWeek={groupIndex === 0}
          />
        ))}
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
      <ErrorState
        title="Could not load homework"
        message={message}
        action={
          <CtaLink href="/" variant="secondary">
            ← Shooting Challenge
          </CtaLink>
        }
      />
    </ProgramPage>
  );
}
