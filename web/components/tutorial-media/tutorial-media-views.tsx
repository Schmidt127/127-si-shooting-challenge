import Image from "next/image";
import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import {
  catalogCardClass,
  catalogHeroClass,
  catalogPanelClass,
  catalogStatePanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, DisplayHeading, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { formatRelativeUpdate } from "@/lib/formatters";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/lib/formatters/video";
import type { TutorialMediaSectionConfig } from "@/lib/tutorial-media/config";
import { cn } from "@/lib/utils";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";

const CATEGORY_ACCENTS: Record<string, string> = {
  Shoot: "from-orange-500/20 to-red-600/5",
  Dribble: "from-cyan-500/20 to-blue-600/5",
  Character: "from-violet-500/20 to-purple-700/5",
  Freethrow: "from-emerald-500/20 to-teal-700/5",
};

function VideoPanel({ url, title }: { url: string; title: string }) {
  const embedUrl = getVideoEmbedUrl(url);

  if (embedUrl) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl border border-white/[0.14] bg-black shadow-[0_12px_40px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isDirectVideoUrl(url)) {
    return (
      <video
        src={url}
        controls
        className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-video items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-brand-blue/10 text-lg font-bold text-accent-soft transition hover:border-accent/50"
    >
      Open video ↗
    </a>
  );
}

function MediaCard({
  item,
  config,
}: {
  item: TutorialItem;
  config: TutorialMediaSectionConfig;
}) {
  const accent = CATEGORY_ACCENTS[item.categories[0] ?? ""] ?? "from-white/5 to-white/[0.02]";

  return (
    <Link href={`${config.basePath}/${item.id}`} className="group block">
      <article className={catalogCardClass()}>
        <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${accent}`}>
          {item.thumbnail ? (
            <Image
              src={item.thumbnail.url}
              alt=""
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-mono text-5xl font-black text-white/10">★</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          {item.categories[0] ? (
            <div className="absolute bottom-3 left-3 right-3">
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                {item.categories[0]}
              </span>
            </div>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="text-lg font-bold leading-snug text-foreground transition group-hover:text-accent-soft">
            {item.name}
          </h3>
          {item.briefDescription ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{item.briefDescription}</p>
          ) : null}
          {item.athlete ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-brand-blue">
              Featuring {item.athlete}
            </p>
          ) : null}
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft">
            {config.catalog.cardCta}
            <span aria-hidden>→</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

export function TutorialMediaGridView({
  data,
  config,
}: {
  data: TutorialCatalogData;
  config: TutorialMediaSectionConfig;
}) {
  return (
    <AmbientPage variant={config.ambientVariant}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <DisplayHeading
          eyebrow={config.catalog.eyebrow}
          title={config.catalog.title}
          titleAccent={config.catalog.titleAccent}
          subtitle={config.catalog.subtitle}
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
                <span className="font-mono text-xs text-muted">
                  {group.tutorials.length} {config.catalog.itemCountLabel}
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.tutorials.map((item) => (
                  <MediaCard key={item.id} item={item} config={config} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AmbientPage>
  );
}

export function TutorialMediaDetailView({
  item,
  config,
}: {
  item: TutorialItem;
  config: TutorialMediaSectionConfig;
}) {
  const hasVideo = Boolean(item.videoUrl.trim());

  return (
    <AmbientPage variant={config.ambientVariant}>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <Link
          href={config.basePath}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-accent-soft"
        >
          <span aria-hidden>←</span> {config.detail.backLabel}
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <DetailTitle
              overline={item.categories[0] ?? item.tutorialTypes[0] ?? config.catalog.title}
              title={item.name}
              accent={item.athlete ? `Featuring ${item.athlete}` : undefined}
            />

            <div className="mt-5 flex flex-wrap gap-2">
              {item.categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  {category}
                </span>
              ))}
            </div>

            {item.briefDescription ? (
              <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">{item.briefDescription}</p>
            ) : null}
          </div>

          {item.athleteHeadshot ? (
            <div className={cn(catalogHeroClass(), "relative mx-auto aspect-square w-full max-w-xs")}>
              <Image
                src={item.athleteHeadshot.url}
                alt={item.athlete || "Athlete"}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              {item.athlete ? (
                <p className="absolute bottom-4 left-4 right-4 text-sm font-bold uppercase tracking-wider text-white">
                  {item.athlete}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasVideo ? (
          <section className="mt-10">
            <SectionHeading label={config.detail.watchLabel} title={config.detail.watchTitle} />
            <VideoPanel url={item.videoUrl} title={item.name} />
          </section>
        ) : null}

        {item.detailedDescription ? (
          <section className={cn(catalogPanelClass(), "mt-10")}>
            <SectionHeading
              label={config.detail.deepDiveLabel}
              title={config.detail.deepDiveTitle}
            />
            <RichContent text={item.detailedDescription} className="text-foreground/90" />
          </section>
        ) : null}

        {hasVideo ? (
          <div className="mt-8">
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-5 py-3 text-sm font-semibold text-accent-soft transition hover:border-accent/50"
            >
              {config.detail.openVideoLabel} ↗
            </a>
          </div>
        ) : null}
      </div>
    </AmbientPage>
  );
}

export function TutorialMediaEmptyState({ config }: { config: TutorialMediaSectionConfig }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass()}>
        <h1 className="text-2xl font-bold text-foreground">{config.empty.title}</h1>
        <p className="mt-3 text-muted">{config.empty.message}</p>
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

export function TutorialMediaErrorState({
  config,
  message,
}: {
  config: TutorialMediaSectionConfig;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass(true)}>
        <h1 className="text-2xl font-bold text-foreground">{config.error.title}</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

export function TutorialMediaNotFoundState({ config }: { config: TutorialMediaSectionConfig }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass()}>
        <h1 className="text-2xl font-bold text-foreground">{config.notFound.title}</h1>
        <p className="mt-3 text-muted">{config.notFound.message}</p>
        <Link
          href={config.basePath}
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          ← {config.detail.backLabel}
        </Link>
      </div>
    </div>
  );
}
