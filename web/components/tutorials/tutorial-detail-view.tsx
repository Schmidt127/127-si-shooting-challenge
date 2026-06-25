import Image from "next/image";
import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import {
  catalogHeroClass,
  catalogPanelClass,
  catalogStatePanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/lib/formatters/video";
import { cn } from "@/lib/utils";
import type { TutorialItem } from "@/types/tutorials";

type TutorialDetailViewProps = {
  tutorial: TutorialItem;
};

function VideoPanel({ url }: { url: string }) {
  const embedUrl = getVideoEmbedUrl(url);

  if (embedUrl) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl border border-white/[0.14] bg-black shadow-[0_12px_40px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <iframe
          src={embedUrl}
          title="Tutorial video"
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

export function TutorialDetailView({ tutorial }: TutorialDetailViewProps) {
  const hasVideo = Boolean(tutorial.videoUrl.trim());

  return (
    <AmbientPage variant="tutorials">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <Link
          href="/tutorials"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-accent-soft"
        >
          <span aria-hidden>←</span> All tutorials
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
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
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  {category}
                </span>
              ))}
              {tutorial.tutorialTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-brand-blue/20 bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue"
                >
                  {type}
                </span>
              ))}
            </div>

            {tutorial.briefDescription ? (
              <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">{tutorial.briefDescription}</p>
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
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
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
            <VideoPanel url={tutorial.videoUrl} />
          </section>
        ) : null}

        {tutorial.detailedDescription ? (
          <section className={cn(catalogPanelClass(), "mt-10")}>
            <SectionHeading label="Deep dive" title="Full breakdown" />
            <RichContent text={tutorial.detailedDescription} className="text-foreground/90" />
          </section>
        ) : null}

        {hasVideo ? (
          <div className="mt-8">
            <a
              href={tutorial.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-5 py-3 text-sm font-semibold text-accent-soft transition hover:border-accent/50"
            >
              Open video in new tab ↗
            </a>
          </div>
        ) : null}
      </div>
    </AmbientPage>
  );
}

export function TutorialNotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass()}>
        <h1 className="text-2xl font-bold text-foreground">Tutorial not found</h1>
        <p className="mt-3 text-muted">This clip may be unpublished or the link is incorrect.</p>
        <Link href="/tutorials" className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent">
          ← Back to tutorials
        </Link>
      </div>
    </div>
  );
}
