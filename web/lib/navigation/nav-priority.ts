import type { ProductNavItem } from "@/components/layout/product-shell";

/** Always visible in the primary product nav. */
export const PRIMARY_NAV_HREFS = [
  "/",
  "/leaderboard",
  "/homework",
  "/levels",
  "/zoom-meetings",
] as const;

/** Nested under the responsive “Resources” menu. */
export const RESOURCES_NAV_HREFS = ["/tutorials", "/shoutouts", "/articles"] as const;

/** Nested under the responsive “More” menu. All listed routes remain available. */
export const MORE_NAV_HREFS = [
  "/game-manual",
  "/faq",
  "/achievements",
  "/dashboard/sign-in",
] as const;

const PRIMARY_SET = new Set<string>(PRIMARY_NAV_HREFS);
const RESOURCES_SET = new Set<string>(RESOURCES_NAV_HREFS);
const MORE_SET = new Set<string>(MORE_NAV_HREFS);

export function splitNavItems(items: ProductNavItem[]): {
  primary: ProductNavItem[];
  resources: ProductNavItem[];
  more: ProductNavItem[];
} {
  const byHref = new Map(items.map((item) => [item.href, item]));

  const primary = PRIMARY_NAV_HREFS.map((href) => byHref.get(href)).filter(
    (item): item is ProductNavItem => Boolean(item),
  );

  const resources = RESOURCES_NAV_HREFS.map((href) => byHref.get(href)).filter(
    (item): item is ProductNavItem => Boolean(item),
  );

  const more = MORE_NAV_HREFS.map((href) => byHref.get(href)).filter(
    (item): item is ProductNavItem => Boolean(item),
  );

  // Preserve any unexpected future nav items rather than dropping routes.
  for (const item of items) {
    if (
      PRIMARY_SET.has(item.href) ||
      RESOURCES_SET.has(item.href) ||
      MORE_SET.has(item.href)
    ) {
      continue;
    }
    more.push(item);
  }

  return { primary, resources, more };
}
