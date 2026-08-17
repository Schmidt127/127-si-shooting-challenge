"use client";

import { useState } from "react";
import Image from "next/image";

import { IconPlay } from "@/components/icons/shoot-icons";

type VideoEmbedPlayerProps = {
  embedUrl: string;
  title: string;
  posterUrl?: string | null;
};

function appendAutoplay(embedUrl: string): string {
  try {
    const parsed = new URL(embedUrl);
    parsed.searchParams.set("autoplay", "1");
    parsed.searchParams.set("rel", "0");
    return parsed.toString();
  } catch {
    const joiner = embedUrl.includes("?") ? "&" : "?";
    return `${embedUrl}${joiner}autoplay=1`;
  }
}

export function VideoEmbedPlayer({ embedUrl, title, posterUrl }: VideoEmbedPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const resolvedPoster = posterUrl?.trim() || null;

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-[0_10px_36px_-10px_rgba(0,0,0,0.85)]">
        <iframe
          src={appendAutoplay(embedUrl)}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-court-navy text-left shadow-[0_10px_36px_-10px_rgba(0,0,0,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
      aria-label={`Play video: ${title}`}
    >
      {resolvedPoster ? (
        <Image
          src={resolvedPoster}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 800px"
          unoptimized
          priority={false}
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-court-navy via-brand-blue to-brand-blue/80"
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
        <span className="rounded-full border border-white/40 bg-black/55 p-4 text-white backdrop-blur-sm transition group-hover:scale-105 group-hover:border-brand-orange/70">
          <IconPlay size={36} />
        </span>
        <span className="max-w-sm text-center text-sm font-semibold text-white drop-shadow-sm sm:text-base">
          {title}
        </span>
      </span>
    </button>
  );
}
