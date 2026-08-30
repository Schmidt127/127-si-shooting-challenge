import type { ReactNode } from "react";
import Link from "next/link";

import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { IconMegaphone, IconPlay } from "@/components/icons/shoot-icons";
import { SafeExternalImage } from "@/components/media/safe-external-image";
import { AccentRail, CtaLink, ProgramPage, SectionMarker } from "@/components/site";
import { ProgramFeatureBanner } from "@/components/site/program-feature-image";
import { EmptyState, ErrorState } from "@/components/ui";
import { hasCatalogVideoUrl } from "@/lib/data/tutorials";
import {
  buildTutorialCatalogDisplay,
  getTutorialCardCta,
  getTutorialMediaDelivery,
  getTutorialMediaDeliveryHint,
  type TutorialDisplayGroup,
} from "@/lib/data/tutorial-presentation";
import { formatRelativeUpdate } from "@/lib/formatters";
import { isAdobeDocumentUrl, isPdfUrl } from "@/lib/formatters/external-media";
import { isInPageVideoUrl } from "@/lib/formatters/video";
import { FEATURE_BANNER_ARIA } from "@/lib/seo/program-facts";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import { TUTORIALS_SECTION } from "@/lib/tutorial-media/config";
import { cn } from "@/lib/utils";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";

import { TUTORIALS_MEDIA_GUIDE, TUTORIALS_ORIENTATION_STEPS } from "./tutorials-orientation";

const CATEGORY_ACCENTS: Record<string, string> = {
  Shoot: "from-brand-orange/20 to-brand-orange/5",
  Dribble: "from-brand-blue/20 to-brand-blue/5",
  Character: "from-court-navy/30 to-brand-blue/10",
  Freethrow: "from-brand-blue/15 to-brand-light-gray",
};

function TutorialsMediaGuide() {
  return (
    <section aria-labelledby="tutorials-media-guide-heading" data-testid="tutorials-media-guide">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
          How clips work
        </p>
        <h2 id="tutorials-media-guide-heading" className="font-display mt-1 text-2xl text-foreground">
          In-page video vs external links
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground">
          Cards are labeled so families know what to expect before opening a tutorial. In-page clips
          play here; external resources open in a new tab.
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {TUTORIALS_MEDIA_GUIDE.map((item) => (
          <div
            key={item.term}
            className="rounded-lg border border-border bg-card p-4 shadow-site-sm"
          >
            <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-foreground">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TutorialsOrientation() {
  return (
    <section aria-labelledby="tutorials-orientation-heading">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
          Film room workflow
        </p>
        <h2 id="tutorials-orientation-heading" className="font-display mt-1 text-2xl text-foreground">
          How to use this catalog
        </h2>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TUTORIALS_ORIENTATION_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-lg border border-border bg-card p-4 shadow-site-sm"
          >
            <p className="font-mono text-xs font-semibold text-brand-blue">0{index + 1}</p>
            <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MediaCardLink({
  item,
  children,
}: {
  item: TutorialItem;
  children: ReactNode;
}) {
  const externalUrl = item.videoUrl.trim();
  const config = TUTORIALS_SECTION;

  if (hasCatalogVideoUrl(externalUrl) && (isAdobeDocumentUrl(externalUrl) || isPdfUrl(externalUrl))) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={`${config.basePath}/${item.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
    >
      {children}
    </Link>
  );
}

function DeliveryBadge({ item }: { item: TutorialItem }) {
  const delivery = getTutorialMediaDelivery(item.videoUrl);
  const tone =
    delivery === "in-page"
      ? "bg-brand-orange/15 text-accent-soft ring-brand-orange/30"
      : delivery === "external"
        ? "bg-brand-blue/15 text-brand-blue ring-brand-blue/30"
        : "bg-brand-light-gray text-muted-foreground ring-border";

  return (
    <span
      className={cn(
        "rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1",
        tone,
      )}
    >
      {delivery === "in-page"
        ? "In-page video"
        : delivery === "external"
          ? "External link"
          : configUnavailableLabel()}
    </span>
  );
}

function configUnavailableLabel() {
  return TUTORIALS_SECTION.detail.unavailableTitle;
}

function TutorialCard({
  item,
  index,
  featured,
}: {
  item: TutorialItem;
  index: number;
  featured?: boolean;
}) {
  const config = TUTORIALS_SECTION;
  const videoUrl = item.videoUrl.trim();
  const hasVideo = hasCatalogVideoUrl(videoUrl);
  const delivery = getTutorialMediaDelivery(videoUrl);
  const playable = isInPageVideoUrl(videoUrl);
  const cta = getTutorialCardCta(delivery, config.catalog);
  const accent =
    CATEGORY_ACCENTS[item.categories[0] ?? ""] ?? "from-brand-light-gray to-brand-medium-gray/30";
  const deliveryHint = getTutorialMediaDeliveryHint(delivery, videoUrl);

  return (
    <MediaCardLink item={item}>
      <article
        className={catalogCardClass(featured && index === 0 ? { featured: "accent" } : undefined)}
        data-testid="tutorials-catalog-card"
        data-has-video={hasVideo ? "true" : "false"}
        data-canonical-video-url={hasVideo ? videoUrl : undefined}
        data-media-delivery={delivery}
      >
        <div className="flex min-w-0 flex-col sm:flex-row">
          <div
            className={cn(
              "relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-gradient-to-br sm:aspect-auto sm:h-auto sm:w-44 md:w-52",
              accent,
            )}
          >
            {item.thumbnail ? (
              <SafeExternalImage
                src={item.thumbnail.url}
                alt={item.name ? `${item.name} thumbnail` : "Tutorial thumbnail"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                fallback={
                  <div className="flex h-full min-h-[8.5rem] w-full items-center justify-center">
                    <IconMegaphone size={40} className="text-foreground/20" />
                  </div>
                }
              />
            ) : (
              <div className="flex h-full min-h-[8.5rem] w-full items-center justify-center">
                <IconMegaphone size={40} className="text-foreground/20" />
              </div>
            )}
            {playable ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full border border-brand-medium-gray bg-black/50 p-3 text-white backdrop-blur-sm">
                  <IconPlay size={24} />
                </span>
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-card/90 sm:bg-gradient-to-t sm:to-card/90" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <DeliveryBadge item={item} />
              {item.categories[0] ? (
                <span className="rounded-md border border-border bg-brand-light-gray/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.categories[0]}
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-lg font-bold leading-snug text-foreground transition group-hover:text-accent-soft sm:text-xl">
              {item.name}
            </h3>

            {item.briefDescription ? (
              <p
                className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground"
                data-testid="tutorials-catalog-brief"
              >
                {item.briefDescription}
              </p>
            ) : null}

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{deliveryHint}</p>

            {item.athlete ? (
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-brand-blue">
                Featuring {item.athlete}
              </p>
            ) : null}

            <span className="mt-4 inline-flex min-h-[2.25rem] items-center gap-1 text-sm font-semibold text-accent-soft transition group-hover:translate-x-0.5">
              {cta}
              <span aria-hidden>
                {delivery === "external" || (hasVideo && (isAdobeDocumentUrl(videoUrl) || isPdfUrl(videoUrl)))
                  ? "↗"
                  : "→"}
              </span>
            </span>
          </div>
        </div>
      </article>
    </MediaCardLink>
  );
}

function TutorialGroupSection({
  group,
  isFirstGroup,
}: {
  group: TutorialDisplayGroup;
  isFirstGroup: boolean;
}) {
  return (
    <section
      className={cn("relative", group.deemphasized && "opacity-90")}
      data-testid={group.deemphasized ? "tutorials-cross-program-section" : undefined}
    >
      <SectionMarker
        label={group.label}
        title={group.title}
        countLabel={`${group.tutorials.length} ${TUTORIALS_SECTION.catalog.itemCountLabel}`}
      />
      {group.deemphasized ? (
        <p className="-mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          These clips are also tagged for the Dribbling Challenge in Airtable. They remain available
          here when dual-tagged; Mike can retag or unpublish in the base (EXT-QA-003).
        </p>
      ) : null}

      <AccentRail tone={group.deemphasized ? "blue" : "orange"}>
        {group.tutorials.map((item, index) => (
          <TutorialCard
            key={item.id}
            item={item}
            index={index}
            featured={isFirstGroup && !group.deemphasized}
          />
        ))}
      </AccentRail>
    </section>
  );
}

function catalogPageTitle() {
  const config = TUTORIALS_SECTION;
  return [config.catalog.title, config.catalog.titleAccent].filter(Boolean).join(" ");
}

type TutorialsCatalogShellProps = {
  meta?: React.ReactNode;
  children: React.ReactNode;
};

function TutorialsCatalogShell({ meta, children }: TutorialsCatalogShellProps) {
  const config = TUTORIALS_SECTION;

  return (
    <ProgramPage
      eyebrow={config.catalog.eyebrow}
      title={
        <>
          Skills & Technique{" "}
          <span className="text-accent-soft">Tutorials</span>
        </>
      }
      description={config.catalog.subtitle}
      heroVariant="light"
      ambientVariant={config.ambientVariant}
      meta={meta}
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Tutorials"
          caption="Film breakdowns and technique clips curated for Shooting Challenge families."
          mark="FR"
          ariaLabel={FEATURE_BANNER_ARIA.tutorials}
        />
        {children}
      </div>
    </ProgramPage>
  );
}

export function TutorialsCatalogView({ data }: { data: TutorialCatalogData }) {
  const display = buildTutorialCatalogDisplay(data);

  return (
    <TutorialsCatalogShell
      meta={
        <span data-testid="tutorials-catalog-meta">
          {display.totalTutorials} published · Updated {formatRelativeUpdate(display.updatedAt)}
        </span>
      }
    >
      <TutorialsMediaGuide />
      <TutorialsOrientation />
      <div className="mx-auto max-w-4xl min-w-0 space-y-14" data-testid="tutorials-catalog-list">
        {display.groups.map((group, groupIndex) => (
          <TutorialGroupSection key={group.id} group={group} isFirstGroup={groupIndex === 0} />
        ))}
      </div>
    </TutorialsCatalogShell>
  );
}

export function TutorialsEmptyState() {
  return (
    <TutorialsCatalogShell>
      <div data-testid="tutorials-catalog-empty">
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
      </div>
    </TutorialsCatalogShell>
  );
}

export function TutorialsErrorState({ message }: { message: string }) {
  const config = TUTORIALS_SECTION;

  return (
    <TutorialsCatalogShell>
      <div data-testid="tutorials-catalog-error">
        <ErrorState
          title={config.error.title}
          message={message}
          action={
            <CtaLink href="/" variant="secondary">
              ← Shooting Challenge
            </CtaLink>
          }
        />
      </div>
    </TutorialsCatalogShell>
  );
}

// Keep catalogPageTitle exported for tests/metadata parity if needed elsewhere.
export { catalogPageTitle };
