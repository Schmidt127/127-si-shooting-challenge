import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import type { HomeworkAssignment } from "@/types/homework";

type HomeworkDetailViewProps = {
  assignment: HomeworkAssignment;
};

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent-soft transition hover:border-accent/50 hover:bg-accent/15"
    >
      {label}
      <span aria-hidden>↗</span>
    </a>
  );
}

export function HomeworkDetailView({ assignment }: HomeworkDetailViewProps) {
  const description =
    assignment.fullDescription ||
    assignment.assignmentDescription ||
    assignment.briefDescription;

  return (
    <AmbientPage>
      <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <Link
          href="/homework"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-accent-soft"
        >
          <span aria-hidden>←</span> All homework
        </Link>

        <header className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-card/60 backdrop-blur-md">
          {assignment.coverImage ? (
            <div className="relative aspect-[21/9] w-full overflow-hidden bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assignment.coverImage.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
                {assignment.weekName}
              </span>
              {assignment.homeworkNumber ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted">
                  {assignment.homeworkNumber}
                </span>
              ) : null}
              {assignment.book ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted">
                  {assignment.bookAbbreviation || assignment.book}
                </span>
              ) : null}
            </div>

            <DetailTitle
              className="mt-5"
              overline="Assignment brief"
              title={assignment.displayName}
              accent={assignment.briefDescription || undefined}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              {assignment.url ? <ResourceLink href={assignment.url} label="Open assignment" /> : null}
              {assignment.urlAdditional ? (
                <ResourceLink href={assignment.urlAdditional} label="Additional resource" />
              ) : null}
            </div>
          </div>
        </header>

        {assignment.topics.length > 0 ? (
          <section className="mt-8">
            <SectionHeading label="Focus areas" title="What you'll work on" />
            <div className="flex flex-wrap gap-2">
              {assignment.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground"
                >
                  {topic}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {description ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <SectionHeading label="Overview" title="The full assignment" />
            <RichContent text={description} className="text-foreground/90" />
          </section>
        ) : null}

        {assignment.specificSteps ? (
          <section className="mt-8 rounded-2xl border border-accent/15 bg-accent/5 p-6 sm:p-8">
            <SectionHeading label="Action plan" title="Specific steps" />
            <RichContent text={assignment.specificSteps} className="text-foreground/90" />
          </section>
        ) : null}

        {assignment.assignmentRationale ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <SectionHeading label="Coaching lens" title="Why this matters" />
            <RichContent text={assignment.assignmentRationale} className="text-foreground/90" />
          </section>
        ) : null}

        {assignment.docs.length > 0 ? (
          <section className="mt-8">
            <SectionHeading label="Resources" title="Downloads" />
            <ul className="mt-4 space-y-2">
              {assignment.docs.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-card/50 px-4 py-3 text-sm transition hover:border-accent/30 hover:text-accent-soft"
                  >
                    <span>{doc.filename}</span>
                    <span aria-hidden>↓</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AmbientPage>
  );
}

export function HomeworkNotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground">Assignment not found</h1>
        <p className="mt-3 text-muted">
          This homework may be unpublished or the link is incorrect.
        </p>
        <Link
          href="/homework"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          ← Back to homework
        </Link>
      </div>
    </div>
  );
}
