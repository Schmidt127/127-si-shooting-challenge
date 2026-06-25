import Link from "next/link";

import { splitRichTextBlocks } from "@/lib/formatters/rich-text";
import { formatRelativeUpdate } from "@/lib/formatters";
import type { HomeworkAssignment } from "@/types/homework";

type HomeworkRichTextProps = {
  text: string;
  className?: string;
};

export function HomeworkRichText({ text, className = "" }: HomeworkRichTextProps) {
  const blocks = splitRichTextBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-4 text-sm leading-relaxed text-muted sm:text-base ${className}`}>
      {blocks.map((block) => (
        <p key={block.slice(0, 48)} className="whitespace-pre-wrap">
          {block}
        </p>
      ))}
    </div>
  );
}

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
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-blue/15 blur-3xl" />
        <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <Link
          href="/homework"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-accent-soft"
        >
          <span aria-hidden>←</span> All homework
        </Link>

        <header className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-card/60 backdrop-blur-md">
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

            <h1 className="mt-5 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {assignment.displayName}
            </h1>

            {assignment.briefDescription ? (
              <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
                {assignment.briefDescription}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {assignment.url ? (
                <ResourceLink href={assignment.url} label="Open assignment" />
              ) : null}
              {assignment.urlAdditional ? (
                <ResourceLink href={assignment.urlAdditional} label="Additional resource" />
              ) : null}
            </div>
          </div>
        </header>

        {assignment.topics.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-soft">
              Topics
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
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
            <h2 className="text-lg font-bold text-foreground">Assignment overview</h2>
            <div className="mt-4">
              <HomeworkRichText text={description} />
            </div>
          </section>
        ) : null}

        {assignment.specificSteps ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground">Specific steps</h2>
            <div className="mt-4">
              <HomeworkRichText text={assignment.specificSteps} />
            </div>
          </section>
        ) : null}

        {assignment.assignmentRationale ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground">Why this assignment</h2>
            <div className="mt-4">
              <HomeworkRichText text={assignment.assignmentRationale} />
            </div>
          </section>
        ) : null}

        {assignment.docs.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-foreground">Downloads</h2>
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

        <p className="mt-12 text-center text-xs text-muted">
          Catalog sync {formatRelativeUpdate(new Date().toISOString())}
        </p>
      </div>
    </div>
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
