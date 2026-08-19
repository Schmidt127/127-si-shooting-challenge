import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { VideoEmbedPlayer } from "@/components/catalog/video-embed-player";
import {
  externalLinkHostname,
  shouldOpenExternally,
} from "@/lib/formatters/external-media";
import {
  getProviderPosterUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
  isValidHttpUrl,
} from "@/lib/formatters/video";

type MediaPanelProps = {
  url: string;
  title: string;
  /** Airtable thumbnail / display image when available. */
  posterUrl?: string | null;
  openLabel?: string;
  externalHint?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

function ExternalDocumentPanel({
  url,
  title,
  openLabel = "Open document",
  externalHint = "This link opens in a new tab — it cannot be played inside this page.",
}: {
  url: string;
  title: string;
  openLabel?: string;
  externalHint?: string;
}) {
  const host = externalLinkHostname(url);

  return (
    <div className={catalogCardClass()} data-canonical-video-url={url} data-video-mode="external">
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center sm:min-h-[280px]">
        <div className="rounded-md border border-brand-blue/35 bg-brand-blue/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">
          Hosted on {host}
        </div>
        <p className="max-w-md text-base font-semibold text-foreground">{title}</p>
        <p className="max-w-lg text-sm leading-relaxed text-foreground">{externalHint}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
          {openLabel}
          <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  );
}

export function VideoComingSoon({
  title = "Video coming soon",
  description = "This clip will appear here when a video link is published.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-site-sm"
      data-video-empty="true"
      role="status"
    >
      <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-brand-light-gray px-6 text-center">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="max-w-md text-sm leading-relaxed text-foreground">{description}</p>
      </div>
    </div>
  );
}

/** Embeds YouTube/Vimeo, plays direct video files, or opens external documents in a new tab. */
export function MediaPanel({
  url,
  title,
  posterUrl,
  openLabel = "Open link",
  externalHint,
  emptyTitle,
  emptyDescription,
}: MediaPanelProps) {
  const trimmed = url.trim();

  if (!trimmed || !isValidHttpUrl(trimmed)) {
    return <VideoComingSoon title={emptyTitle} description={emptyDescription} />;
  }

  if (shouldOpenExternally(trimmed)) {
    return (
      <ExternalDocumentPanel
        url={trimmed}
        title={title}
        openLabel={openLabel}
        externalHint={externalHint}
      />
    );
  }

  const embedUrl = getVideoEmbedUrl(trimmed);
  const resolvedPoster = posterUrl?.trim() || getProviderPosterUrl(trimmed) || null;

  if (embedUrl) {
    return (
      <VideoEmbedPlayer
        embedUrl={embedUrl}
        title={title}
        posterUrl={resolvedPoster}
        canonicalUrl={trimmed}
      />
    );
  }

  if (isDirectVideoUrl(trimmed)) {
    return (
      <video
        src={trimmed}
        controls
        playsInline
        preload="metadata"
        poster={resolvedPoster ?? undefined}
        data-canonical-video-url={trimmed}
        data-video-mode="direct"
        className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black"
      />
    );
  }

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      data-canonical-video-url={trimmed}
      data-video-mode="external"
      className="flex aspect-video items-center justify-center rounded-lg border border-brand-orange/35 bg-court-navy text-lg font-bold text-white transition hover:border-brand-orange/55"
    >
      {openLabel} ↗
    </a>
  );
}
