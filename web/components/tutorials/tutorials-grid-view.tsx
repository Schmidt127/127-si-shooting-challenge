import Image from "next/image";
import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { IconPlay } from "@/components/icons/shoot-icons";
import { catalogCardClass, catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { formatRelativeUpdate } from "@/lib/formatters";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";

const CATEGORY_ACCENTS: Record<string, string> = {
  Shoot: "from-brand-orange/20 to-brand-orange/5",
  Dribble: "from-brand-blue/20 to-brand-blue/5",
  Character: "from-court-navy/30 to-brand-blue/10",
  Freethrow: "from-brand-blue/15 to-white/[0.03]",
};

function TutorialCard({ tutorial }: { tutorial: TutorialItem }) {
  const accent = CATEGORY_ACCENTS[tutorial.categories[0] ?? ""] ?? "from-white/5 to-white/[0.02]";

  return (
    <Link href={`/tutorials/${tutorial.id}`} className="group block">
      <article className={catalogCardClass()}>
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
              <IconPlay size={56} className="text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
            <span className="rounded-full border border-white/20 bg-black/50 p-3 text-white backdrop-blur-sm">
              <IconPlay size={28} />
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            {tutorial.categories[0] ? (
              <span className="rounded-md border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                {tutorial.categories[0]}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-lg font-bold leading-snug text-foreground transition group-hover:text-accent-soft">
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
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft">
            Watch & read
            <span aria-hidden>→</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

export function TutorialsGridView({ data }: { data: TutorialCatalogData }) {
  return (
    <AmbientPage variant="tutorials">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <DisplayHeading
          eyebrow="Film room"
          title="Skills &"
          titleAccent="storytelling"
          icon={<IconPlay size={32} />}
          subtitle="Shooting tutorials and technique breakdowns — curated for the challenge."
        >
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
            {data.totalTutorials} published · Updated {formatRelativeUpdate(data.updatedAt)}
          </p>
        </DisplayHeading>

        <div className="mt-14 space-y-14">
          {data.categoryGroups.map((group) => (
            <section key={group.category}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                  {group.category}
                </h2>
                <span className="font-mono text-xs text-muted">{group.tutorials.length} clips</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.tutorials.map((tutorial) => (
                  <TutorialCard key={tutorial.id} tutorial={tutorial} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AmbientPage>
  );
}

export function TutorialsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass()}>
        <h1 className="font-display text-2xl text-foreground">No tutorials published yet</h1>
        <p className="mt-3 text-muted">
          Mark tutorials OK to Publish on Softr and they will appear here.
        </p>
        <Link href="/" className="btn-secondary mt-6">
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}

export function TutorialsErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass(true)}>
        <h1 className="font-display text-2xl text-foreground">Could not load tutorials</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
