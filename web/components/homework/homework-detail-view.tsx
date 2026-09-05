import {
  catalogHeroClass,
  catalogInsetClass,
  catalogPanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { SafeExternalImage } from "@/components/media/safe-external-image";
import { CtaLink, DetailPageShell } from "@/components/site";
import { EmptyState } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { formatHomeworkDueDate } from "@/components/athlete/homework-assignments";
import { withBasePath } from "@/lib/app-config";
import { isEphemeralAirtableAttachmentUrl } from "@/lib/data/homework-resources";
import { cn } from "@/lib/utils";
import type { HomeworkAssignment, HomeworkAttachment } from "@/types/homework";

type HomeworkDetailViewProps = {
  assignment: HomeworkAssignment;
};

function publicHref(href: string): string {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return withBasePath(href);
}

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={publicHref(href)}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "default" })}
      data-testid="homework-detail-resource-link"
    >
      {label}
      <span aria-hidden>↗</span>
    </a>
  );
}

function UnavailableResource({ label }: { label: string }) {
  return (
    <p
      role="status"
      data-testid="homework-detail-resource-unavailable"
      className={cn(
        catalogInsetClass(),
        "px-4 py-3 text-sm text-muted-foreground",
      )}
    >
      {label} is temporarily unavailable. The source file may have been removed or the
      stored link expired — check back after coaches refresh the assignment resources.
    </p>
  );
}

function assertNoEphemeralInHtml(href: string): string {
  // Defense in depth: never emit Airtable CDN hosts into the document.
  if (isEphemeralAirtableAttachmentUrl(href)) return "";
  return href;
}

function DocRow({ doc }: { doc: HomeworkAttachment }) {
  const href = assertNoEphemeralInHtml(doc.url);
  if (doc.availability === "unavailable" || !href) {
    return (
      <li>
        <UnavailableResource label={doc.filename || "Download"} />
      </li>
    );
  }

  return (
    <li>
      <a
        href={publicHref(href)}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="homework-detail-doc-link"
        className={cn(
          catalogInsetClass(),
          "flex min-h-[2.75rem] items-center justify-between px-4 py-3 text-sm transition hover:border-brand-orange/30 hover:text-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40",
        )}
      >
        <span>{doc.filename}</span>
        <span aria-hidden>↓</span>
      </a>
    </li>
  );
}

export function HomeworkDetailView({ assignment }: HomeworkDetailViewProps) {
  const description =
    assignment.fullDescription ||
    assignment.assignmentDescription ||
    assignment.briefDescription;
  const dueLabel = assignment.dueDate
    ? formatHomeworkDueDate(assignment.dueDate)
    : "No due date provided";
  const primaryHref = assertNoEphemeralInHtml(assignment.url);
  const additionalHref = assertNoEphemeralInHtml(assignment.urlAdditional);
  const coverHref =
    assignment.coverImage && assignment.coverImage.availability === "available"
      ? assertNoEphemeralInHtml(assignment.coverImage.url)
      : "";

  const showPrimaryUnavailable =
    assignment.urlAvailability === "unavailable" ||
    (assignment.urlAvailability === "available" && !primaryHref);
  const showAdditionalUnavailable =
    assignment.urlAdditionalAvailability === "unavailable" ||
    (assignment.urlAdditionalAvailability === "available" && !additionalHref);

  return (
    <DetailPageShell backHref="/homework" backLabel="All homework">
      <header className={cn(catalogHeroClass(), "relative")}>
        {coverHref ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-black/40">
            <SafeExternalImage
              src={publicHref(coverHref)}
              alt={assignment.title ? `${assignment.title} cover` : "Homework cover"}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          </div>
        ) : null}

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-blue/35 bg-brand-blue/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
              {assignment.weekName}
            </span>
            {assignment.categoryLabel ? (
              <span className="rounded-md border border-border bg-brand-light-gray px-3 py-1 text-xs font-medium text-foreground">
                {assignment.categoryLabel}
              </span>
            ) : null}
            {assignment.book ? (
              <span className="rounded-md border border-border bg-brand-light-gray px-3 py-1 text-xs font-medium text-foreground">
                {assignment.bookAbbreviation || assignment.book}
              </span>
            ) : null}
          </div>

          <DetailTitle
            className="mt-5"
            overline="Assignment brief"
            title={assignment.title || assignment.displayName}
            accent={assignment.briefDescription || undefined}
          />

          <dl className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider">Due</dt>
              <dd className="mt-0.5 text-foreground">{dueLabel}</dd>
            </div>
            {assignment.submissionRequirement ? (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wider">
                  Submission
                </dt>
                <dd className="mt-0.5 leading-relaxed text-foreground">
                  {assignment.submissionRequirement}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {primaryHref ? <ResourceLink href={primaryHref} label="Open assignment" /> : null}
            {additionalHref ? (
              <ResourceLink href={additionalHref} label="Additional resource" />
            ) : null}
          </div>
          {showPrimaryUnavailable ? (
            <div className="mt-3">
              <UnavailableResource label="Open assignment" />
            </div>
          ) : null}
          {showAdditionalUnavailable ? (
            <div className="mt-3">
              <UnavailableResource label="Additional resource" />
            </div>
          ) : null}
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
          <RichContent text={description} className="text-foreground" />
        </section>
      ) : null}

      {assignment.specificSteps ? (
        <section className={cn(catalogPanelClass({ tint: "accent" }), "mt-8")}>
          <SectionHeading label="Action plan" title="Specific steps" />
          <RichContent text={assignment.specificSteps} className="text-foreground" />
        </section>
      ) : null}

      {assignment.assignmentRationale ? (
        <section className={cn(catalogPanelClass(), "mt-8")}>
          <SectionHeading label="Coaching lens" title="Why this matters" />
          <RichContent text={assignment.assignmentRationale} className="text-foreground" />
        </section>
      ) : null}

      {assignment.docs.length > 0 ? (
        <section className="mt-8">
          <SectionHeading label="Resources" title="Downloads" />
          <ul className="mt-4 space-y-2">
            {assignment.docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} />
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
        titleAs="h1"
        action={
          <CtaLink href="/homework" variant="secondary">
            ← Back to homework
          </CtaLink>
        }
      />
    </DetailPageShell>
  );
}
