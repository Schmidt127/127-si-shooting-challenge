import Image from "next/image";
import Link from "next/link";

import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { IconPlay } from "@/components/icons/shoot-icons";
import { CtaLink, ProgramPage } from "@/components/site";
import { EmptyState, ErrorState } from "@/components/ui";
import { formatRelativeUpdate } from "@/lib/formatters";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";

const CATEGORY_ACCENTS: Record<string, string> = {
  Shoot: "from-brand-orange/20 to-brand-orange/5",
  Dribble: "from-brand-blue/20 to-brand-blue/5",
  Character: "from-court-navy/30 to-brand-blue/10",
  Freethrow: "from-brand-blue/15 to-brand-light-gray",
};

function TutorialCard({ tutorial }: { tutorial: TutorialItem }) {
  const accent = CATEGORY_ACCENTS[tutorial.categories[0] ?? ""] ?? "from-brand-light-gray to-brand-medium-gray/30";

  return (
    <Link
      href={`/tutorials/${tutorial.id}`}
      className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
      aria-label={`Open tutorial: ${tutorial.name}`}
    >
      <article className={`${catalogCardClass()} h-full overflow-hidden rounded-lg`}>
        <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${accent}`}>
          {tutorial.thumbnail ? (
            <Image
              src={tutorial.thumbnail.url}
              alt={tutorial.name ? `${tutorial.name} thumbnail` : "Tutorial thumbnail"}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <IconPlay size={56} className="text-brand-blue/25" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3">
            {tutorial.categories[0] ? (
              <span className="rounded-md border border-white/30 bg-court-navy/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                {tutorial.categories[0]}
              </span>
            ) : null}
          </div>
          <span className="absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/35 bg-black/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition group-hover:border-brand-orange group-hover:bg-court-navy">
            <IconPlay size={16} aria-hidden />
            Watch & read
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-xl leading-[1.08] text-foreground transition group-hover:text-accent-soft">
            {tutorial.name}
          </h3>
          {tutorial.briefDescription ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{tutorial.briefDescription}</p>
          ) : null}
          {tutorial.athlete ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-brand-blue">
              Featuring {tutorial.athlete}
            </p>
          ) : null}
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft">
            Open playbook
            <span aria-hidden>→</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

export function TutorialsGridView({ data }: { data: TutorialCatalogData }) {
  return (
    <ProgramPage
      eyebrow="Film room"
      title="The Shooting Playbook"
      description="Practical technique, film study, and athlete features built to turn the next workout into focused work."
      heroVariant="contrast"
      ambientVariant="tutorials"
      aside={
        <div className="max-w-xs border border-white/20 bg-court-navy/70 p-5 shadow-site-lg">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-orange">Film room index</p>
          <p className="mt-3 font-mono text-3xl font-bold text-brand-white">{data.totalTutorials}</p>
          <p className="mt-1 text-sm text-contrast-muted">
            published {data.totalTutorials === 1 ? "tutorial" : "tutorials"}
          </p>
          <p className="mt-5 border-t border-white/15 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-contrast-muted">
            Updated {formatRelativeUpdate(data.updatedAt)}
          </p>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
        {data.categoryGroups.map((group, index) => (
          <section key={group.category} aria-labelledby={`tutorial-category-${index}`}>
            <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-brand-blue pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
                  Training category
                </p>
                <h2
                  id={`tutorial-category-${index}`}
                  className="font-display mt-1 text-2xl text-foreground sm:text-3xl"
                >
                  {group.category}
                </h2>
              </div>
              <p className="shrink-0 font-mono text-sm font-bold text-brand-blue">
                {group.tutorials.length} {group.tutorials.length === 1 ? "clip" : "clips"}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.tutorials.map((tutorial) => (
                <TutorialCard key={tutorial.id} tutorial={tutorial} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ProgramPage>
  );
}

export function TutorialsEmptyState() {
  return (
    <ProgramPage
      eyebrow="Film room"
      title="Skills & storytelling"
      description="Shooting tutorials and technique breakdowns — curated for the challenge."
      heroVariant="light"
      ambientVariant="tutorials"
    >
      <EmptyState
        title={EMPTY_STATE_COPY.tutorials.title}
        description={EMPTY_STATE_COPY.tutorials.description}
        icon={<IconPlay size={40} />}
        action={
          <CtaLink href="/" variant="secondary">
            ← Shooting Challenge
          </CtaLink>
        }
      />
    </ProgramPage>
  );
}

export function TutorialsErrorState({ message }: { message: string }) {
  return (
    <ProgramPage
      eyebrow="Film room"
      title="Skills & storytelling"
      description="Shooting tutorials and technique breakdowns — curated for the challenge."
      heroVariant="light"
      ambientVariant="tutorials"
    >
      <ErrorState
        title="Could not load tutorials"
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
