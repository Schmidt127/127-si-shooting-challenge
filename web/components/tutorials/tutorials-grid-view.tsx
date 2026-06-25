import Image from "next/image";
import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { formatRelativeUpdate } from "@/lib/formatters";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";

const CATEGORY_ACCENTS: Record<string, string> = {
  Shoot: "from-orange-500/20 to-red-600/5",
  Dribble: "from-cyan-500/20 to-blue-600/5",
  Character: "from-violet-500/20 to-purple-700/5",
  Freethrow: "from-emerald-500/20 to-teal-700/5",
};

function TutorialCard({ tutorial }: { tutorial: TutorialItem }) {
  const accent = CATEGORY_ACCENTS[tutorial.categories[0] ?? ""] ?? "from-white/5 to-white/[0.02]";

  return (
    <Link href={`/tutorials/${tutorial.id}`} className="group block">
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-card/50 transition duration-300 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-[0_20px_60px_-24px_rgba(255,139,0,0.35)]">
        <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${accent}`}>
          {tutorial.thumbnail ? (
            <Image
              src={tutorial.thumbnail.url}
              alt=""
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-mono text-5xl font-black text-white/10">▶</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            {tutorial.categories[0] ? (
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
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
          subtitle="Shooting tutorials, technique breakdowns, and athlete shout-outs — curated for the challenge."
        >
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
            {data.totalTutorials} published · Updated {formatRelativeUpdate(data.updatedAt)}
          </p>
        </DisplayHeading>

        <div className="mt-14 space-y-14">
          {data.categoryGroups.map((group) => (
            <section key={group.category}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    {group.category}
                  </span>
                </h2>
                <span className="text-xs font-mono text-muted">{group.tutorials.length} clips</span>
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
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground">No tutorials published yet</h1>
        <p className="mt-3 text-muted">Mark tutorials OK to Publish on Softr and they will appear here.</p>
        <Link href="/shooting-challenge" className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent">
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}

export function TutorialsErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-red-500/20 bg-card/80 p-8 text-center backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground">Could not load tutorials</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
