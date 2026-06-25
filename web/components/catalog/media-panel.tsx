import { catalogCardClass } from "@/components/catalog/catalog-surface";
import {
  externalLinkHostname,
  shouldOpenExternally,
} from "@/lib/formatters/external-media";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/lib/formatters/video";

type MediaPanelProps = {
  url: string;
  title: string;
  openLabel?: string;
  externalHint?: string;
};

function ExternalDocumentPanel({
  url,
  title,
  openLabel = "Open document",
  externalHint = "Adobe and PDF documents open in a new tab — they cannot be embedded on other websites.",
}: {
  url: string;
  title: string;
  openLabel?: string;
  externalHint?: string;
}) {
  const host = externalLinkHostname(url);

  return (
    <div className={catalogCardClass()}>
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center sm:min-h-[280px]">
        <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-200">
          Hosted on {host}
        </div>
        <p className="max-w-md text-base font-semibold text-foreground">{title}</p>
        <p className="max-w-lg text-sm leading-relaxed text-muted">{externalHint}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-5 py-3 text-sm font-semibold text-accent-soft transition hover:border-accent/50"
        >
          {openLabel} ↗
        </a>
      </div>
    </div>
  );
}

/** Embeds YouTube/Vimeo, plays direct video files, or opens external documents in a new tab. */
export function MediaPanel({
  url,
  title,
  openLabel = "Open link",
  externalHint,
}: MediaPanelProps) {
  const trimmed = url.trim();
  if (!trimmed) return null;

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

  if (isDirectVideoUrl(trimmed)) {
    return (
      <video
        src={trimmed}
        controls
        className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
      />
    );
  }

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-video items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-brand-blue/10 text-lg font-bold text-accent-soft transition hover:border-accent/50"
    >
      {openLabel} ↗
    </a>
  );
}
