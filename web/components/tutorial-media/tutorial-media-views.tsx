import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  catalogCardClass,
  catalogHeroClass,
  catalogPanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { MediaPanel } from "@/components/catalog/media-panel";
import { RichContent } from "@/components/catalog/rich-content";
import { IconMegaphone, IconPlay } from "@/components/icons/shoot-icons";
import { CtaLink, DetailPageShell, ProgramPage, SectionMarker } from "@/components/site";
import { EmptyState, ErrorState } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { formatRelativeUpdate } from "@/lib/formatters";
import { shouldOpenExternally } from "@/lib/formatters/external-media";
import type { TutorialMediaSectionConfig } from "@/lib/tutorial-media/config";
import { cn } from "@/lib/utils";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";

const CATEGORY_ACCENTS: Record<string, string> = {
  Shoot: "from-brand-orange/20 to-brand-orange/5",
  Dribble: "from-brand-blue/20 to-brand-blue/5",
  Character: "from-court-navy/30 to-brand-blue/10",
  Freethrow: "from-brand-blue/15 to-brand-light-gray",
};

function catalogPageTitle(config: TutorialMediaSectionConfig) {
  return [config.catalog.title, config.catalog.titleAccent].filter(Boolean).join(" ");
}

function MediaCardLink({
  item,
  config,
  children,
}: {
  item: TutorialItem;
  config: TutorialMediaSectionConfig;
  children: ReactNode;
}) {
  const externalUrl = item.videoUrl.trim();

  if (shouldOpenExternally(externalUrl)) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="group block">
        {children}
      </a>
    );
  }

  return (
    <Link href={`${config.basePath}/${item.id}`} className="group block">
      {children}
    </Link>
  );
}

function MediaCard({
  item,
  config,
}: {
  item: TutorialItem;
  config: TutorialMediaSectionConfig;
}) {
  const accent = CATEGORY_ACCENTS[item.categories[0] ?? ""] ?? "from-brand-light-gray to-brand-medium-gray/30";

  return (
    <MediaCardLink item={item} config={config}>
      <article className={catalogCardClass()}>
        <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${accent}`}>
          {item.thumbnail ? (
            <Image
              src={item.thumbnail.url}
              alt={item.name ? `${item.name} thumbnail` : "Media thumbnail"}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <IconMegaphone size={56} className="text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
            <span className="rounded-full border border-brand-medium-gray bg-black/50 p-3 text-white backdrop-blur-sm">
              <IconPlay size={28} />
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {item.categories[0] ? (
            <div className="absolute bottom-3 left-3 right-3">
              <span className="rounded-md border border-border bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
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
    </MediaCardLink>
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
    <ProgramPage
      eyebrow={config.catalog.eyebrow}
      title={catalogPageTitle(config)}
      description={config.catalog.subtitle}
      heroVariant="light"
      ambientVariant={config.ambientVariant}
      meta={
        <>
          {data.totalTutorials} published · Updated {formatRelativeUpdate(data.updatedAt)}
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-14">
        {data.categoryGroups.map((group) => (
          <section key={group.category}>
            <SectionMarker
              label="Category"
              title={group.category}
              countLabel={`${group.tutorials.length} ${config.catalog.itemCountLabel}`}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.tutorials.map((item) => (
                <MediaCard key={item.id} item={item} config={config} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ProgramPage>
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
    <DetailPageShell
      backHref={config.basePath}
      backLabel={config.detail.backLabel}
      ambientVariant={config.ambientVariant}
      className="max-w-5xl"
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
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
                className="rounded-md border border-border bg-brand-light-gray px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {category}
              </span>
            ))}
          </div>

          {item.briefDescription ? (
            <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">
              {item.briefDescription}
            </p>
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
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
          <MediaPanel
            url={item.videoUrl}
            title={item.name}
            openLabel={config.detail.openVideoLabel}
            externalHint={config.detail.externalDocumentHint}
          />
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

      {hasVideo && shouldOpenExternally(item.videoUrl) ? null : hasVideo ? (
        <div className="mt-8">
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "secondary" })}
          >
            {config.detail.openVideoLabel} ↗
          </a>
        </div>
      ) : null}
    </DetailPageShell>
  );
}

export function TutorialMediaEmptyState({ config }: { config: TutorialMediaSectionConfig }) {
  return (
    <ProgramPage
      eyebrow={config.catalog.eyebrow}
      title={catalogPageTitle(config)}
      description={config.catalog.subtitle}
      heroVariant="light"
      ambientVariant={config.ambientVariant}
    >
      <EmptyState
        title={config.empty.title}
        description={config.empty.message}
        icon={
          config.ambientVariant === "shoutouts" ? (
            <IconMegaphone size={40} />
          ) : (
            <IconPlay size={40} />
          )
        }
        action={
          <CtaLink href="/" variant="secondary">
            ← Shooting Challenge
          </CtaLink>
        }
      />
    </ProgramPage>
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
    <ProgramPage
      eyebrow={config.catalog.eyebrow}
      title={catalogPageTitle(config)}
      description={config.catalog.subtitle}
      heroVariant="light"
      ambientVariant={config.ambientVariant}
    >
      <ErrorState
        title={config.error.title}
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

export function TutorialMediaNotFoundState({ config }: { config: TutorialMediaSectionConfig }) {
  return (
    <DetailPageShell
      backHref={config.basePath}
      backLabel={config.detail.backLabel}
      ambientVariant={config.ambientVariant}
      className="max-w-5xl"
    >
      <EmptyState
        title={config.notFound.title}
        description={config.notFound.message}
        action={
          <CtaLink href={config.basePath} variant="secondary">
            ← {config.detail.backLabel}
          </CtaLink>
        }
      />
    </DetailPageShell>
  );
}
