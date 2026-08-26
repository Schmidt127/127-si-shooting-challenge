import { afterEach, describe, expect, it, vi } from "vitest";

import { PUBLIC_SITE_ORIGIN } from "@/lib/app-config";

import {
  buildFaqPageJsonLd,
  buildPageMetadata,
  buildProgramHomeJsonLd,
  buildSportsProgramJsonLd,
  canonicalUrl,
  DEFAULT_ROBOTS_INDEX,
  DEFAULT_ROBOTS_NOINDEX,
  isSearchIndexingEnabled,
  PRIVATE_ROBOTS_NOINDEX,
  resolvePublicRobots,
  robotsDisallowPaths,
  SITEMAP_PUBLIC_ROUTES,
} from "./metadata";
import { PROGRAM_FAQ_ITEMS } from "./faq-content";
import { HOME_PAGE_TITLE, SITE_DESCRIPTION } from "./program-facts";

describe("isSearchIndexingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to false when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "");
    expect(isSearchIndexingEnabled()).toBe(false);
  });

  it("enables indexing for true or 1", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    expect(isSearchIndexingEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "1");
    expect(isSearchIndexingEnabled()).toBe(true);
  });

  it("stays disabled for false values", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "false");
    expect(isSearchIndexingEnabled()).toBe(false);
  });
});

describe("resolvePublicRobots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns noindex when the flag is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "");
    expect(resolvePublicRobots()).toEqual(DEFAULT_ROBOTS_NOINDEX);
  });

  it("returns indexable robots when the flag is true", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    expect(resolvePublicRobots()).toEqual(DEFAULT_ROBOTS_INDEX);
  });
});

describe("canonicalUrl", () => {
  it("returns SITE_URL for home", () => {
    expect(canonicalUrl()).toBe(PUBLIC_SITE_ORIGIN);
    expect(canonicalUrl("")).toBe(PUBLIC_SITE_ORIGIN);
    expect(canonicalUrl("/")).toBe(PUBLIC_SITE_ORIGIN);
  });

  it("builds canonical paths under /shoot", () => {
    expect(canonicalUrl("/leaderboard")).toBe(`${PUBLIC_SITE_ORIGIN}/leaderboard`);
    expect(canonicalUrl("homework")).toBe(`${PUBLIC_SITE_ORIGIN}/homework`);
  });
});

describe("robotsDisallowPaths", () => {
  it("includes private routes under basePath", () => {
    const paths = robotsDisallowPaths("/shoot");
    expect(paths).toContain("/shoot/admin");
    expect(paths).toContain("/shoot/api/");
    expect(paths).toContain("/shoot/dashboard");
    expect(paths).toContain("/shoot/athletes/");
    expect(paths).toContain("/shoot/public-display");
  });
});

describe("SITEMAP_PUBLIC_ROUTES", () => {
  it("excludes dashboard, athlete profiles, and public display", () => {
    expect(SITEMAP_PUBLIC_ROUTES).not.toContain("/dashboard");
    expect(SITEMAP_PUBLIC_ROUTES).not.toContain("/athletes/[slug]");
    expect(SITEMAP_PUBLIC_ROUTES).not.toContain("/public-display");
    expect(SITEMAP_PUBLIC_ROUTES).toContain("/leaderboard");
    expect(SITEMAP_PUBLIC_ROUTES).toContain("/homework");
    expect(SITEMAP_PUBLIC_ROUTES).toContain("/faq");
  });
});

describe("buildPageMetadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to noindex when indexing flag is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "");
    const metadata = buildPageMetadata({
      title: "Leaderboard",
      description: "Season standings.",
      path: "/leaderboard",
    });

    expect(metadata.robots).toEqual(DEFAULT_ROBOTS_NOINDEX);
    expect(metadata.alternates?.canonical).toBe(`${PUBLIC_SITE_ORIGIN}/leaderboard`);
    expect(metadata.openGraph?.url).toBe(`${PUBLIC_SITE_ORIGIN}/leaderboard`);
    expect(metadata.openGraph?.title).toBe("Leaderboard | Shooting Challenge");
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("defaults to indexable robots when the flag is true", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    const metadata = buildPageMetadata({
      title: "Homework",
      description: "Assignments.",
      path: "/homework",
    });

    expect(metadata.robots).toEqual(DEFAULT_ROBOTS_INDEX);
  });

  it("honors explicit private robots overrides", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    const metadata = buildPageMetadata({
      title: "Dashboard",
      description: "Private dashboard.",
      path: "/dashboard",
      robots: PRIVATE_ROBOTS_NOINDEX,
    });

    expect(metadata.robots).toEqual(PRIVATE_ROBOTS_NOINDEX);
  });

  it("supports absolute home titles", () => {
    const metadata = buildPageMetadata({
      title: HOME_PAGE_TITLE,
      titleAbsolute: true,
      description: SITE_DESCRIPTION,
      path: "",
    });

    expect(metadata.title).toEqual({
      absolute: HOME_PAGE_TITLE,
    });
    expect(metadata.openGraph?.title).toBe(HOME_PAGE_TITLE);
  });

  it("omits canonical when includeCanonical is false", () => {
    const metadata = buildPageMetadata({
      title: "Page not found",
      description: "Missing page.",
      includeCanonical: false,
      robots: PRIVATE_ROBOTS_NOINDEX,
    });

    expect(metadata.alternates).toBeUndefined();
  });
});

describe("buildProgramHomeJsonLd", () => {
  it("uses public program URLs without athlete data", () => {
    const jsonLd = buildProgramHomeJsonLd();
    const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(graph.some((node) => node["@type"] === "WebSite")).toBe(true);
    expect(graph.some((node) => node["@type"] === "Organization")).toBe(true);
    expect(graph.some((node) => node["@type"] === "SportsOrganization")).toBe(true);

    const serialized = JSON.stringify(jsonLd);
    expect(serialized).toContain(PUBLIC_SITE_ORIGIN);
    expect(serialized).toMatch(/Fairfield/i);
    expect(serialized).not.toMatch(/hoopchallenges/i);
    expect(serialized).not.toMatch(/rec[a-zA-Z0-9]{14}/);
  });
});

describe("buildFaqPageJsonLd", () => {
  it("emits FAQPage questions without private data", () => {
    const jsonLd = buildFaqPageJsonLd(PROGRAM_FAQ_ITEMS);
    expect(jsonLd["@type"]).toBe("FAQPage");
    const entities = jsonLd.mainEntity as Array<Record<string, unknown>>;
    expect(entities.length).toBe(PROGRAM_FAQ_ITEMS.length);
    expect(JSON.stringify(jsonLd)).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(JSON.stringify(jsonLd)).not.toMatch(/rec[a-zA-Z0-9]{14}/);
  });
});

describe("buildSportsProgramJsonLd", () => {
  it("includes basketball sport and Fairfield location", () => {
    const node = buildSportsProgramJsonLd();
    expect(node.sport).toBe("Basketball");
    expect(JSON.stringify(node)).toMatch(/Fairfield/i);
  });
});
