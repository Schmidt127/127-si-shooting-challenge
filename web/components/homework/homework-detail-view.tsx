import {
  catalogHeroClass,
  catalogInsetClass,
  catalogPanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { CtaLink, DetailPageShell } from "@/components/site";
import { EmptyState } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      className={buttonVariants({ variant: "default" })}
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
    <DetailPageShell backHref="/homework" backLabel="All homework">
      <header className={cn(catalogHeroClass(), "relative")}>
        {assignment.coverImage ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assignment.coverImage.url}
              alt={assignment.title ? `${assignment.title} cover` : "Homework cover"}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          </div>
        ) : null}

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-blue/35 bg-brand-blue/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
              {assignment.weekName}
            </span>
            {assignment.homeworkNumber ? (
              <span className="rounded-md border border-border bg-brand-light-gray px-3 py-1 text-xs font-medium text-muted">
                {assignment.homeworkNumber}
              </span>
            ) : null}
            {assignment.book ? (
              <span className="rounded-md border border-border bg-brand-light-gray px-3 py-1 text-xs font-medium text-muted">
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
        <section className="mt-10">
          <SectionHeading label="Focus areas" title="What you'll work on" />
          <div className="flex flex-wrap gap-2">
            {assignment.topics.map((topic) => (
              <span
                key={topic}
                className={cn(catalogInsetClass(), "px-3 py-1.5 text-sm text-foreground")}
              >
                {topic}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {description ? (
        <section className={cn(catalogPanelClass(), "mt-10")}>
          <SectionHeading label="Overview" title="The full assignment" />
          <RichContent text={description} className="text-foreground/90" />
        </section>
      ) : null}

      {assignment.specificSteps ? (
        <section className={cn(catalogPanelClass({ tint: "accent" }), "mt-8")}>
          <SectionHeading label="Action plan" title="Specific steps" />
          <RichContent text={assignment.specificSteps} className="text-foreground/90" />
        </section>
      ) : null}

      {assignment.assignmentRationale ? (
        <section className={cn(catalogPanelClass(), "mt-8")}>
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
                  className={cn(
                    catalogInsetClass(),
                    "flex min-h-[2.75rem] items-center justify-between px-4 py-3 text-sm transition hover:border-brand-orange/30 hover:text-accent-soft",
                  )}
                >
                  <span>{doc.filename}</span>
                  <span aria-hidden>↓</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </DetailPageShell>
  );
}

export function HomeworkNotFoundState() {
  return (
    <DetailPageShell backHref="/homework" backLabel="All homework">
      <EmptyState
        title="Assignment not found"
        description="This homework may be unpublished or the link is incorrect."
        action={
          <CtaLink href="/homework" variant="secondary">
            ← Back to homework
          </CtaLink>
        }
      />
    </DetailPageShell>
  );
}
