import { hasCatalogVideoUrl } from "@/lib/data/tutorials";
import { externalLinkHostname, shouldOpenExternally } from "@/lib/formatters/external-media";
import { isInPageVideoUrl, isValidHttpUrl } from "@/lib/formatters/video";
import type { TutorialCatalogData, TutorialCategoryGroup, TutorialItem } from "@/types/tutorials";

/** Skill taxonomy from the retired Tutorials table — still used when categories are populated. */
export const TUTORIAL_CATEGORY_ORDER = ["Shoot", "Freethrow", "Character", "Dribble"] as const;

export const TUTORIAL_UNCATEGORIZED = "More to explore";

const DRIBBLING_CHALLENGE_PROGRAM = "Dribbling Challenge";

export type TutorialMediaDelivery = "in-page" | "external" | "unavailable";

export type TutorialDisplayGroup = {
  id: string;
  label: string;
  title: string;
  tutorials: TutorialItem[];
  /** When true, section is visually de-emphasized (cross-program audit). */
  deemphasized?: boolean;
};

export type TutorialCatalogDisplay = {
  groups: TutorialDisplayGroup[];
  totalTutorials: number;
  hiddenCrossProgramCount: number;
  updatedAt: string;
};

export function getTutorialMediaDelivery(videoUrl: string): TutorialMediaDelivery {
  const trimmed = videoUrl.trim();
  if (!hasCatalogVideoUrl(trimmed)) return "unavailable";
  if (isInPageVideoUrl(trimmed)) return "in-page";
  if (shouldOpenExternally(trimmed) || isValidHttpUrl(trimmed)) return "external";
  return "unavailable";
}

export function getTutorialMediaDeliveryLabel(delivery: TutorialMediaDelivery): string {
  switch (delivery) {
    case "in-page":
      return "Watch in-page";
    case "external":
      return "Open externally";
    default:
      return "Details available";
  }
}

export function getTutorialMediaDeliveryHint(
  delivery: TutorialMediaDelivery,
  videoUrl: string,
): string {
  switch (delivery) {
    case "in-page":
      return "Plays on the tutorial page when you open it.";
    case "external":
      return `Hosted on ${externalLinkHostname(videoUrl)} — opens in a new tab.`;
    default:
      return "Read the breakdown now; video link publishes when ready.";
  }
}

export function getTutorialCardCta(
  delivery: TutorialMediaDelivery,
  config: { cardCta: string; cardCtaUnavailable: string },
): string {
  if (delivery === "unavailable") return config.cardCtaUnavailable;
  if (delivery === "external") return "Open tutorial";
  return config.cardCta;
}

/** Hide rows tagged only for the Dribbling Challenge program (EXT-QA-003 belt-and-suspenders). */
export function isDribblingChallengeOnlyProgram(item: TutorialItem): boolean {
  if (item.programs.length === 0) return false;
  return item.programs.every(
    (program) => program.toLowerCase() === DRIBBLING_CHALLENGE_PROGRAM.toLowerCase(),
  );
}

/**
 * Cross-program dribble audit: items tagged for Dribbling Challenge that still appear
 * on the Shooting Challenge catalog (dual-tagged rows). Safe to de-emphasize at display
 * layer; Mike should retag in Airtable when category taxonomy returns (EXT-QA-003).
 */
export function isCrossProgramDribbleCandidate(item: TutorialItem): boolean {
  if (isDribblingChallengeOnlyProgram(item)) return false;
  return item.programs.some(
    (program) => program.toLowerCase() === DRIBBLING_CHALLENGE_PROGRAM.toLowerCase(),
  );
}

function compareTutorials(a: TutorialItem, b: TutorialItem): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function sortCategoryGroups(groups: TutorialCategoryGroup[]): TutorialCategoryGroup[] {
  return [...groups].sort((a, b) => {
    if (a.category === TUTORIAL_UNCATEGORIZED) return 1;
    if (b.category === TUTORIAL_UNCATEGORIZED) return -1;

    const aIndex = TUTORIAL_CATEGORY_ORDER.indexOf(
      a.category as (typeof TUTORIAL_CATEGORY_ORDER)[number],
    );
    const bIndex = TUTORIAL_CATEGORY_ORDER.indexOf(
      b.category as (typeof TUTORIAL_CATEGORY_ORDER)[number],
    );

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.category.localeCompare(b.category, undefined, { sensitivity: "base" });
  });
}

function groupByMediaDelivery(items: TutorialItem[]): TutorialDisplayGroup[] {
  const buckets = new Map<TutorialMediaDelivery, TutorialItem[]>();
  const order: TutorialMediaDelivery[] = ["in-page", "external", "unavailable"];

  for (const item of items) {
    const delivery = getTutorialMediaDelivery(item.videoUrl);
    const list = buckets.get(delivery) ?? [];
    list.push(item);
    buckets.set(delivery, list);
  }

  return order
    .filter((delivery) => (buckets.get(delivery)?.length ?? 0) > 0)
    .map((delivery) => ({
      id: `delivery-${delivery}`,
      label: "Format",
      title: getTutorialMediaDeliveryLabel(delivery),
      tutorials: [...(buckets.get(delivery) ?? [])].sort(compareTutorials),
    }));
}

function hasNamedCategories(groups: TutorialCategoryGroup[]): boolean {
  return groups.some((group) => group.category !== TUTORIAL_UNCATEGORIZED);
}

function partitionCrossProgramItems(items: TutorialItem[]): {
  primary: TutorialItem[];
  crossProgram: TutorialItem[];
  hiddenCount: number;
} {
  const primary: TutorialItem[] = [];
  const crossProgram: TutorialItem[] = [];
  let hiddenCount = 0;

  for (const item of items) {
    if (isDribblingChallengeOnlyProgram(item)) {
      hiddenCount += 1;
      continue;
    }
    if (isCrossProgramDribbleCandidate(item)) {
      crossProgram.push(item);
    } else {
      primary.push(item);
    }
  }

  return { primary, crossProgram, hiddenCount };
}

/** Prepare catalog data for the portfolio tutorials page (display-only; no query changes). */
export function buildTutorialCatalogDisplay(data: TutorialCatalogData): TutorialCatalogDisplay {
  const allItems = data.categoryGroups.flatMap((group) => group.tutorials);
  const { primary, crossProgram, hiddenCount: initiallyHidden } = partitionCrossProgramItems(allItems);
  let hiddenCount = initiallyHidden;

  const groups: TutorialDisplayGroup[] = [];

  if (hasNamedCategories(data.categoryGroups)) {
    const sorted = sortCategoryGroups(data.categoryGroups);
    for (const group of sorted) {
      const visible = group.tutorials.filter((item) => !isDribblingChallengeOnlyProgram(item));
      hiddenCount += group.tutorials.length - visible.length;
      const scoped = visible.filter((item) => !isCrossProgramDribbleCandidate(item));
      if (scoped.length === 0) continue;
      groups.push({
        id: `category-${group.category}`,
        label: "Skill area",
        title: group.category,
        tutorials: [...scoped].sort(compareTutorials),
      });
    }
  } else {
    groups.push(...groupByMediaDelivery(primary));
  }

  if (crossProgram.length > 0) {
    groups.push({
      id: "cross-program-dribble",
      label: "Cross-program",
      title: "Also tagged for Dribbling Challenge",
      tutorials: [...crossProgram].sort(compareTutorials),
      deemphasized: true,
    });
  }

  return {
    groups,
    totalTutorials: primary.length + crossProgram.length,
    hiddenCrossProgramCount: hiddenCount,
    updatedAt: data.updatedAt,
  };
}
