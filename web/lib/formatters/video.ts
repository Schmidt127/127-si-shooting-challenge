/** YouTube / Vimeo embed helpers for tutorial video links. */

export function isValidHttpUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").split("/")[0];
      return id || null;
    }

    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtube-nocookie.com")) {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery) return fromQuery;

      const embedMatch = parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/);
      if (embedMatch?.[1]) return embedMatch[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function getVimeoVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes("vimeo.com")) return null;
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function getVideoEmbedUrl(url: string): string | null {
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
  }

  const vimeoId = getVimeoVideoId(url);
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}`;
  }

  return null;
}

/**
 * Provider poster URL when Airtable has no thumbnail.
 * YouTube: official static thumbnail. Vimeo: no reliable static URL without API.
 */
export function getProviderPosterUrl(url: string): string | null {
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  return null;
}

export function isDirectVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const path = decodeURIComponent(new URL(trimmed).pathname);
    return /\.(mp4|webm|mov|m4v)$/i.test(path);
  } catch {
    return /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(trimmed);
  }
}

/** True when the catalog URL can play in-page (YouTube, Vimeo, or a video file). */
export function isInPageVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!isValidHttpUrl(trimmed)) return false;
  return Boolean(getVideoEmbedUrl(trimmed) || isDirectVideoUrl(trimmed));
}
