import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { catalogCardClass, catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { formatRelativeUpdate } from "@/lib/formatters";
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
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block"
      >
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
  const hwLabel = assignment.homeworkNumber || `Assignment ${assignment.assignmentNumber || index + 1}`;
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
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-black/30 sm:aspect-auto sm:h-auto sm:w-44 md:w-52">
              <Image
                src={assignment.coverImage.url}
                alt=""
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 208px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/80 sm:bg-gradient-to-t sm:to-card/90" />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center border-b border-white/5 bg-gradient-to-br from-brand-blue/20 to-transparent py-10 sm:w-44 sm:border-b-0 sm:border-r md:w-52">
              <span className="font-mono text-4xl font-black text-white/20">{hwLabel}</span>
            </div>
          )}

          <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
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
                    className="rounded-md border border-white/5 px-2 py-0.5 text-[11px] text-muted"
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
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
            {isLatestWeek ? "Current week" : "Week archive"}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {weekName}
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted">
          {assignments.length} assignment{assignments.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="relative space-y-4 pl-0 sm:pl-8">
        <div
          className="absolute bottom-2 left-3 top-2 hidden w-px bg-gradient-to-b from-accent/50 via-white/10 to-transparent sm:block"
          aria-hidden
        />
        {assignments.map((assignment, index) => (
          <HomeworkCard
            key={assignment.id}
            assignment={assignment}
            index={index}
            isLatestWeek={isLatestWeek}
          />
        ))}
      </div>
    </section>
  );
}

export function HomeworkCatalogView({ data }: HomeworkCatalogViewProps) {
  return (
    <AmbientPage>
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <DisplayHeading
          eyebrow="Curriculum drop"
          title="Homework"
          titleAccent="HQ"
          subtitle="Film study, faith, and basketball assignments — published from the challenge curriculum. Newest week at the top."
        >
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
            {data.totalAssignments} published · Updated {formatRelativeUpdate(data.updatedAt)}
          </p>
        </DisplayHeading>

        <div className="mt-14 space-y-14">
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
    </AmbientPage>
  );
}

export function HomeworkEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass()}>
        <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <h1 className="mt-6 text-2xl font-bold text-foreground">No homework published yet</h1>
        <p className="mt-3 text-muted">
          Check back soon — new assignments appear here when marked Published in Airtable.
        </p>
        <Link
          href="/shooting-challenge"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}

export function HomeworkErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass(true)}>
        <h1 className="text-2xl font-bold text-foreground">Could not load homework</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <Link
          href="/shooting-challenge"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}
