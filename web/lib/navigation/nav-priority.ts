import type { ProductNavItem } from "@/components/layout/product-shell";

/** Always visible in the primary product nav. */
export const PRIMARY_NAV_HREFS = [
  "/",
  "/leaderboard",
  "/homework",
  "/levels",
  "/tutorials",
  "/zoom-meetings",
  "/game-manual",
] as const;

/** Nested under the responsive “More” menu. All routes remain available. */
export const MORE_NAV_HREFS = [
  "/dashboard",
  "/shoutouts",
  "/articles",
  "/achievements",
  "/public-display",
] as const;

const PRIMARY_SET = new Set<string>(PRIMARY_NAV_HREFS);
const MORE_SET = new Set<string>(MORE_NAV_HREFS);

export function splitNavItems(items: ProductNavItem[]): {
  primary: ProductNavItem[];
  more: ProductNavItem[];
} {
  const byHref = new Map(items.map((item) => [item.href, item]));

  const primary = PRIMARY_NAV_HREFS.map((href) => byHref.get(href)).filter(
    (item): item is ProductNavItem => Boolean(item),
  );

  const more = MORE_NAV_HREFS.map((href) => byHref.get(href)).filter(
    (item): item is ProductNavItem => Boolean(item),
  );

  // Preserve any unexpected future nav items rather than dropping routes.
  for (const item of items) {
    if (PRIMARY_SET.has(item.href) || MORE_SET.has(item.href)) continue;
    more.push(item);
  }

  return { primary, more };
}
