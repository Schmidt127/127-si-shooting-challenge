import type { Metadata } from "next";

import {
  APP_BASE_PATH,
  PUBLIC_LANDING_ORIGIN,
  SHOOTING_CHALLENGE,
  SITE_URL,
  withBasePath,
} from "@/lib/app-config";
import { BRAND_LOGOS, BRAND_ORG_NAME } from "@/lib/brand";

/**
 * Program listing routes eligible for sitemap.xml.
 * Excludes dashboard, athlete profiles, admin, public-display, and API surfaces.
 */
export const SITEMAP_PUBLIC_ROUTES = [
  "",
  "/leaderboard",
  "/homework",
  "/levels",
  "/achievements",
  "/tutorials",
  "/shoutouts",
  "/articles",
  "/zoom-meetings",
  "/game-manual",
] as const;

/** Paths that must stay out of crawl even when public indexing is enabled. */
export const ROBOTS_DISALLOW_PATHS = [
  "/admin",
  "/api/",
  "/dashboard",
  "/athletes/",
  "/public-display",
] as const;

/** Client-visible flag — must be set at build time (`NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`). */
export function isSearchIndexingEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ALLOW_SEARCH_INDEXING?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export const DEFAULT_ROBOTS_NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export const DEFAULT_ROBOTS_INDEX: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
  },
};

/** Explicit noindex for athlete profiles, dashboards, admin, previews, and 404 shells. */
export const PRIVATE_ROBOTS_NOINDEX: Metadata["robots"] = DEFAULT_ROBOTS_NOINDEX;

export function resolvePublicRobots(): Metadata["robots"] {
  return isSearchIndexingEnabled() ? DEFAULT_ROBOTS_INDEX : DEFAULT_ROBOTS_NOINDEX;
}

/** Build absolute disallow paths for robots.txt (includes basePath). */
export function robotsDisallowPaths(basePath: string = APP_BASE_PATH): string[] {
  return ROBOTS_DISALLOW_PATHS.map((segment) => `${basePath}${segment}`);
}

/** Canonical public URL for a program route (`path` without basePath prefix). */
export function canonicalUrl(path: string = ""): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return SITE_URL;
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${SITE_URL}${normalized}`;
}

/** Absolute URL for a static asset under `/public` (respects basePath). */
export function absolutePublicAssetUrl(assetPath: string): string {
  const href = withBasePath(assetPath.startsWith("/") ? assetPath : `/${assetPath}`);
  return new URL(href, PUBLIC_LANDING_ORIGIN).href;
}

export function defaultOpenGraphImage(): { url: string; alt: string } {
  const alt = `${SHOOTING_CHALLENGE.name} — ${BRAND_ORG_NAME}`;
  return {
    url: absolutePublicAssetUrl(BRAND_LOGOS.horizontal),
    alt,
  };
}

type BuildPageMetadataInput = {
  title: string;
  description: string;
  /** Route path without basePath, e.g. `/leaderboard` or empty for home. */
  path?: string;
  /** When true, `title` is emitted as an absolute document title (home page). */
  titleAbsolute?: boolean;
  robots?: Metadata["robots"];
  openGraph?: Partial<Metadata["openGraph"]>;
  twitter?: Partial<Metadata["twitter"]>;
  /** When false, canonical is omitted (404 and error shells). */
  includeCanonical?: boolean;
};

function resolveDocumentTitle(title: string, titleAbsolute?: boolean): Metadata["title"] {
  if (titleAbsolute) return { absolute: title };
  return title;
}

function resolveOpenGraphTitle(title: string, titleAbsolute?: boolean): string {
  if (titleAbsolute) return title;
  return `${title} | ${SHOOTING_CHALLENGE.name}`;
}

/**
 * Shared metadata builder for public program pages.
 * Defaults to indexable robots when `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`.
 */
export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const pageUrl = canonicalUrl(input.path ?? "");
  const ogImage = defaultOpenGraphImage();
  const ogTitle = input.openGraph?.title ?? resolveOpenGraphTitle(input.title, input.titleAbsolute);
  const ogDescription = input.openGraph?.description ?? input.description;
  const twitterTitle = input.twitter?.title ?? ogTitle;
  const twitterDescription = input.twitter?.description ?? input.description;

  const openGraphOverrides = input.openGraph;
  const twitterOverrides = input.twitter;
  const ogType =
    openGraphOverrides &&
    typeof openGraphOverrides === "object" &&
    "type" in openGraphOverrides &&
    openGraphOverrides.type
      ? openGraphOverrides.type
      : "website";
  const twitterCard =
    twitterOverrides &&
    typeof twitterOverrides === "object" &&
    "card" in twitterOverrides &&
    twitterOverrides.card
      ? twitterOverrides.card
      : "summary_large_image";

  const metadata: Metadata = {
    title: resolveDocumentTitle(input.title, input.titleAbsolute),
    description: input.description,
    robots: input.robots ?? resolvePublicRobots(),
    openGraph: {
      ...openGraphOverrides,
      title: ogTitle,
      description: ogDescription,
      url: pageUrl,
      siteName: BRAND_ORG_NAME,
      locale: "en_US",
      type: ogType,
      images: openGraphOverrides?.images ?? [ogImage],
    },
    twitter: {
      ...twitterOverrides,
      card: twitterCard,
      title: twitterTitle,
      description: twitterDescription,
      images: twitterOverrides?.images ?? [ogImage.url],
    },
  };

  if (input.includeCanonical !== false) {
    metadata.alternates = { canonical: pageUrl };
  }

  return metadata;
}

/** Safe WebSite + Organization JSON-LD for the program home page only. */
export function buildProgramHomeJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${PUBLIC_LANDING_ORIGIN}/#organization`,
        name: BRAND_ORG_NAME,
        url: PUBLIC_LANDING_ORIGIN,
        logo: absolutePublicAssetUrl(BRAND_LOGOS.horizontal),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SHOOTING_CHALLENGE.name,
        description: SHOOTING_CHALLENGE.description,
        publisher: { "@id": `${PUBLIC_LANDING_ORIGIN}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };
}
