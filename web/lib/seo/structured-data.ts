import { SHOOTING_CHALLENGE, SITE_URL } from "@/lib/app-config";

import { canonicalUrl } from "./metadata";

export type BreadcrumbCrumb = {
  name: string;
  /** Route path without basePath, e.g. `/homework` or empty string for home. */
  path: string;
};

/** Catalog sections with stable breadcrumb and CollectionPage labels. */
export const CATALOG_SEO_SECTIONS = {
  leaderboard: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Leaderboard", path: "/leaderboard" },
    ],
    collection: {
      name: "Season Leaderboard",
      description:
        "Live youth basketball shooting challenge rankings with XP, levels, and total shots.",
      path: "/leaderboard",
    },
  },
  homework: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Homework", path: "/homework" },
    ],
    collection: {
      name: "Weekly Homework",
      description:
        "Published Shooting Challenge homework assignments for youth basketball skill development.",
      path: "/homework",
    },
  },
  tutorials: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Tutorials", path: "/tutorials" },
    ],
    collection: {
      name: "Shooting Tutorials",
      description:
        "Youth basketball shooting tutorials and technique videos for the Shooting Challenge.",
      path: "/tutorials",
    },
  },
  shoutouts: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Shoutouts", path: "/shoutouts" },
    ],
    collection: {
      name: "Athlete Shoutouts",
      description:
        "Athlete shoutouts and highlights from the youth basketball Shooting Challenge.",
      path: "/shoutouts",
    },
  },
  articles: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Articles", path: "/articles" },
    ],
    collection: {
      name: "FBC Articles",
      description:
        "Fairfield Basketball Club article readings and basketball education content.",
      path: "/articles",
    },
  },
  zoomMeetings: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Zoom Meetings", path: "/zoom-meetings" },
    ],
    collection: {
      name: "Zoom Meetings",
      description:
        "Shooting Challenge Zoom schedules, agendas, and recordings for remote coaching check-ins.",
      path: "/zoom-meetings",
    },
  },
  levels: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Levels", path: "/levels" },
    ],
    collection: {
      name: "XP Levels",
      description:
        "Shooting Challenge level ladder from Beginner to G.O.A.T. with XP thresholds for every tier.",
      path: "/levels",
    },
  },
  achievements: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Achievements", path: "/achievements" },
    ],
    collection: {
      name: "Achievements",
      description:
        "Shooting Challenge achievements, streaks, and milestone badges earned through daily practice.",
      path: "/achievements",
    },
  },
  gameManual: {
    breadcrumbs: [
      { name: "Shooting Challenge", path: "" },
      { name: "Game Manual", path: "/game-manual" },
    ],
    collection: {
      name: "Game Manual",
      description:
        "Official Shooting Challenge game manual — scoring rules, XP reward rules, and program reference.",
      path: "/game-manual",
    },
  },
} as const satisfies Record<
  string,
  { breadcrumbs: readonly BreadcrumbCrumb[]; collection: { name: string; description: string; path: string } }
>;

export type CatalogSeoSection = keyof typeof CATALOG_SEO_SECTIONS;

/** BreadcrumbList JSON-LD for public program pages. */
export function buildBreadcrumbListJsonLd(crumbs: readonly BreadcrumbCrumb[]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl(crumbs[crumbs.length - 1]?.path ?? "")}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  };
}

/** CollectionPage JSON-LD for catalog listing routes. */
export function buildCollectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  const pageUrl = canonicalUrl(input.path);
  return {
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    name: input.name,
    description: input.description,
    url: pageUrl,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#sports-program` },
    inLanguage: "en-US",
  };
}

/** WebPage JSON-LD for detail routes (homework, tutorials, levels, etc.). */
export function buildWebPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  const pageUrl = canonicalUrl(input.path);
  return {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    name: input.name,
    description: input.description,
    url: pageUrl,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  };
}

/** @graph bundle for catalog listing pages. */
export function buildCatalogRouteJsonLd(section: CatalogSeoSection): Record<string, unknown> {
  const config = CATALOG_SEO_SECTIONS[section];
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildCollectionPageJsonLd(config.collection),
      buildBreadcrumbListJsonLd(config.breadcrumbs),
    ],
  };
}

/** @graph bundle for detail pages with a parent catalog section. */
export function buildDetailRouteJsonLd(input: {
  section: CatalogSeoSection;
  itemName: string;
  itemDescription: string;
  itemPath: string;
}): Record<string, unknown> {
  const sectionConfig = CATALOG_SEO_SECTIONS[input.section];
  const breadcrumbs: BreadcrumbCrumb[] = [
    ...sectionConfig.breadcrumbs,
    { name: input.itemName, path: input.itemPath },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageJsonLd({
        name: input.itemName,
        description: input.itemDescription,
        path: input.itemPath,
      }),
      buildBreadcrumbListJsonLd(breadcrumbs),
    ],
  };
}

/** Program home breadcrumb root label for reuse in tests. */
export const PROGRAM_HOME_CRUMB_NAME = SHOOTING_CHALLENGE.name;
