import Image from "next/image";

import {
  catalogHeroClass,
  catalogPanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { MediaPanel } from "@/components/catalog/media-panel";
import { RichContent } from "@/components/catalog/rich-content";
import { CtaLink, DetailPageShell } from "@/components/site";
import { EmptyState } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { shouldOpenExternally } from "@/lib/formatters/external-media";
import { cn } from "@/lib/utils";
import type { TutorialItem } from "@/types/tutorials";

type TutorialDetailViewProps = {
  tutorial: TutorialItem;
};

export function TutorialDetailView({ tutorial }: TutorialDetailViewProps) {
  const hasVideo = Boolean(tutorial.videoUrl.trim());

  return (
    <DetailPageShell
      backHref="/tutorials"
      backLabel="All tutorials"
      ambientVariant="tutorials"
      className="max-w-5xl"
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <DetailTitle
            overline={tutorial.categories[0] ?? tutorial.tutorialTypes[0] ?? "Tutorial"}
            title={tutorial.name}
            accent={tutorial.athlete ? `Featuring ${tutorial.athlete}` : undefined}
          />

          <div className="mt-5 flex flex-wrap gap-2">
            {tutorial.categories.map((category) => (
              <span
                key={category}
                className="rounded-md border border-border bg-brand-light-gray px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {category}
              </span>
            ))}
            {tutorial.tutorialTypes.map((type) => (
              <span
                key={type}
                className="rounded-md border border-brand-blue/30 bg-brand-blue/15 px-3 py-1 text-xs font-semibold text-brand-blue"
              >
                {type}
              </span>
            ))}
          </div>

          {tutorial.briefDescription ? (
            <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">
              {tutorial.briefDescription}
            </p>
          ) : null}
        </div>

        {tutorial.athleteHeadshot ? (
          <div className={cn(catalogHeroClass(), "relative mx-auto aspect-square w-full max-w-xs")}>
            <Image
              src={tutorial.athleteHeadshot.url}
              alt={tutorial.athlete || "Athlete"}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
            {tutorial.athlete ? (
              <p className="absolute bottom-4 left-4 right-4 text-sm font-bold uppercase tracking-wider text-white">
                {tutorial.athlete}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasVideo ? (
        <section className="mt-10">
          <SectionHeading label="Watch" title="Technique in motion" />
          <MediaPanel url={tutorial.videoUrl} title={tutorial.name} openLabel="Open video" />
        </section>
      ) : null}

      {tutorial.detailedDescription ? (
        <section className={cn(catalogPanelClass(), "mt-10")}>
          <SectionHeading label="Deep dive" title="Full breakdown" />
          <RichContent text={tutorial.detailedDescription} className="text-foreground/90" />
        </section>
      ) : null}

      {hasVideo && !shouldOpenExternally(tutorial.videoUrl) ? (
        <div className="mt-8">
          <a
            href={tutorial.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "secondary" })}
          >
            Open video in new tab ↗
          </a>
        </div>
      ) : null}
    </DetailPageShell>
  );
}

export function TutorialNotFoundState() {
  return (
    <DetailPageShell
      backHref="/tutorials"
      backLabel="All tutorials"
      ambientVariant="tutorials"
      className="max-w-5xl"
    >
      <EmptyState
        title="Tutorial not found"
        description="This clip may be unpublished or the link is incorrect."
        action={
          <CtaLink href="/tutorials" variant="secondary">
            ← Back to tutorials
          </CtaLink>
        }
      />
    </DetailPageShell>
  );
}
