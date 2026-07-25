"use client";

import { useState, type ReactNode } from "react";

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
 */
export function SafeExternalImage({
  src,
  alt,
  className,
  fallback = null,
}: SafeExternalImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote Airtable/S3 URLs; avoid optimizer cache of expired signed links
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
