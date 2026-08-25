"use client";

import { useEffect, useState, type ReactNode } from "react";

type SafeExternalImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Optional fallback when the remote asset 404/410s (common for expired Airtable URLs). */
  fallback?: ReactNode;
};

/**
 * Remote catalog images (especially Airtable attachment URLs) can expire.
 * Hide broken images instead of leaving a browser broken-image icon.
 *
 * Loads after mount so SSR and the first client paint both render `fallback`,
 * avoiding hydration mismatches when edge caches or image probes differ by host.
 */
export function SafeExternalImage({
  src,
  alt,
  className,
  fallback = null,
}: SafeExternalImageProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const trimmed = src?.trim();
    if (!trimmed) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setReady(true);
    };
    probe.onerror = () => {
      if (!cancelled) setReady(false);
    };
    probe.src = trimmed;

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src?.trim() || !ready) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote Airtable/S3 URLs; avoid optimizer cache of expired signed links
    <img src={src} alt={alt} className={className} />
  );
}
