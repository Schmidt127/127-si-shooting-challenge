/**
 * Public surface inventory for tests and release hygiene.
 * Keep in sync with web/docs/site-hierarchy.md — does not change runtime routing.
 */

import { isSearchIndexingEnabled } from "@/lib/seo/metadata";

export const PUBLIC_APP_ROUTES = [
  "/",
  "/faq",
  "/dashboard",
  "/leaderboard",
  "/homework",
  "/tutorials",
  "/shoutouts",
  "/articles",
  "/zoom-meetings",
  "/game-manual",
  "/levels",
  "/achievements",
  "/public-display",
  "/athletes/[slug]",
  "/admin",
  "/api/airtable",
] as const;

/** Routes that must remain demo/mock or gated until auth + cutover work. */
export const NON_CUTOVER_READY_ROUTES = ["/dashboard", "/athletes/[slug]", "/admin"] as const;

/**
 * Reachable by URL but excluded from ProductShell nav + homepage hub cards.
 * Dashboard: demo until SC-112. Public display: gym/kiosk standings, not family chrome.
 */
export const PUBLIC_CHROME_EXCLUDED_ROUTES = ["/dashboard", "/public-display"] as const;

/** Softr dual-run indicators still present in the web app by design. */
export const SOFTR_CUTOVER_INDICATORS = {
  publishField: "OK to Publish on Softr",
  levelSortField: "Level Sort Order - For Softr",
  sitewideNoindexUntilCutover: !isSearchIndexingEnabled(),
} as const;

/** Product names that must never appear in Shooting Challenge nav or public copy modules. */
export const FORBIDDEN_CROSSOVER_PRODUCTS = [
  "team shot tracker",
  "team-shot-tracker",
  "shot tracker",
  "127si-brackets",
  "jr ref",
  "jr-ref",
] as const;

export const ADMIN_PLACEHOLDER = {
  title: "Admin",
  /** Safe public copy — no participant diagnostics without auth. */
  description:
    "Staff tools are not enabled yet. Authentication is required before any enrollment, XP, or email diagnostics can be shown.",
  exposesParticipantData: false,
  allowsWrites: false,
} as const;

/** SC-112 — athlete sign-in not implemented; do not show mock or live private data. */
export const DASHBOARD_PLACEHOLDER = {
  title: "Athlete dashboard coming soon",
  description:
    "Personal XP history, weekly progress, homework status, and coach feedback will appear here after athlete sign-in is enabled. Until then, use the season leaderboard and your published athlete profile when available.",
  exposesParticipantData: false,
} as const;

export const EMPTY_STATE_COPY = {
  leaderboard: {
    title: "Leaderboard warming up",
    description: "Published athlete standings will appear here when available.",
  },
  homework: {
    title: "No homework published yet",
    description: "Published homework assignments will appear here when available.",
  },
  tutorials: {
    title: "No tutorials published yet",
    description: "Published tutorials will appear here when available.",
  },
  shoutouts: {
    title: "No shoutouts published yet",
    description: "Published shoutouts will appear here when available.",
  },
  articles: {
    title: "No articles published yet",
    description: "Published articles will appear here when available.",
  },
  levels: {
    title: "Levels coming soon",
    description: "The level ladder will appear here when published levels are available.",
  },
  achievements: {
    title: "Achievements coming online",
    description: "Published achievements will appear here when available.",
  },
  zoom: {
    title: "No zoom meetings yet",
    description: "Published Zoom meetings will appear here when available.",
  },
  publicDisplay: {
    title: "Display warming up",
    description: "Leaderboard entries will appear on the public display when available.",
  },
} as const;

export const LOADING_LABELS = {
  leaderboard: "Loading leaderboard… First load can take 10–20 seconds.",
  homework: "Loading homework…",
  tutorials: "Loading tutorials…",
  levels: "Loading levels…",
  achievements: "Loading achievements…",
  zoom: "Loading Zoom meetings…",
  publicDisplay: "Loading public display…",
  default: "Loading…",
} as const;

/**
 * Family-facing catalog paths that must stay in Playwright + HTTP smoke suites.
 * Operator-only routes (`dashboard`, `public-display`) are tested separately.
 */
export const FAMILY_FACING_SMOKE_PATHS = [
  ".",
  "faq",
  "leaderboard",
  "homework",
  "tutorials",
  "shoutouts",
  "articles",
  "levels",
  "achievements",
  "zoom-meetings",
  "game-manual",
] as const;

export const ACCESSIBILITY_LABELS = {
  productNav: "Shooting Challenge",
  gradeBandFilter: "Filter leaderboard by grade band",
  moreNav: "More navigation sections",
  mobileMenuOpen: "Open navigation menu",
  mobileMenuClose: "Close navigation menu",
  mobileMenuDialog: "Shooting Challenge mobile navigation",
  homeworkCatalog: "Published homework assignments by week",
  achievementsCatalog: "Achievement definitions by category",
  zoomCatalog: "Zoom meetings by week",
  gameManualConfig: "Live game manual configuration sections",
} as const;

/** User-facing gate copy shared across levels catalog and detail pages (SC-106). */
export const LEVEL_GATE_COPY = {
  cardLabel: "Advance requirements",
  cardFallback:
    "No extra gates for this tier — reach the lifetime XP threshold shown above to advance.",
  detailEmpty:
    "No published advance requirements beyond XP for this tier. Lifetime XP thresholds still apply; Zoom, Perfect Week, or other gates appear here when configured for the season.",
  notFoundTitle: "Level unavailable",
  notFoundDescription:
    "This tier is not published, may have been retired, or the link is outdated. Browse the level ladder for active tiers.",
} as const;
