import type { TutorialCatalogData, TutorialCategoryGroup, TutorialItem } from "@/types/tutorials";

import { asNumber, asText } from "./airtable-values";
import { mapAttachments, mapSelectOptions } from "./homework";

export type TutorialFields = {
  Name?: unknown;
  "Link to Video"?: unknown;
  Athlete?: unknown;
  "Athlete Headshot - Lkp"?: unknown;
  Thumbnail?: unknown;
  "Website Image Resolved"?: unknown;
  "Tutorial Type"?: unknown;
  "Tutorial - Category"?: unknown;
  "Associated Program"?: unknown;
  "Brief Description"?: unknown;
  "Detailed Description"?: unknown;
  "OK to Publish on Softr"?: unknown;
  "Sort Order"?: unknown;
};

const SHOOTING_CHALLENGE_PROGRAM = "Shooting Challenge";
const UNCATEGORIZED = "More to explore";

export type TutorialContentKind = "tutorial" | "shoutout" | "article";

function normalizeTutorialType(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, "");
}

export function matchesTutorialContentKind(
  types: string[],
  kind: TutorialContentKind,
): boolean {
  return types.some((type) => {
    const normalized = normalizeTutorialType(type);
    if (kind === "tutorial") return normalized === "tutorial";
    if (kind === "shoutout") return normalized.includes("shout");
    return normalized.includes("article") || normalized.includes("fbcarticlebook");
  });
}

export function hasTutorialContentKind(
  fields: TutorialFields,
  kind: TutorialContentKind,
): boolean {
  const types = mapSelectOptions(fields["Tutorial Type"]);
  return matchesTutorialContentKind(types, kind);
}

export function isPublishedTutorialMedia(
  fields: TutorialFields,
  kind: TutorialContentKind,
): boolean {
  return isShootingChallengeTutorial(fields) && hasTutorialContentKind(fields, kind);
}

export function mapTutorialRecord(record: { id: string; fields: TutorialFields }): TutorialItem {
  const fields = record.fields;
  const resolvedImage = mapAttachments(fields["Website Image Resolved"]);
  const thumbnail = mapAttachments(fields.Thumbnail);
  const headshot = mapAttachments(fields["Athlete Headshot - Lkp"]);

  return {
    id: record.id,
    name: asText(fields.Name, "Tutorial"),
    videoUrl: asText(fields["Link to Video"], ""),
    athlete: asText(fields.Athlete, ""),
    athleteHeadshot: headshot[0] ?? null,
    thumbnail: resolvedImage[0] ?? thumbnail[0] ?? null,
    tutorialTypes: mapSelectOptions(fields["Tutorial Type"]),
    categories: mapSelectOptions(fields["Tutorial - Category"]),
    programs: mapSelectOptions(fields["Associated Program"]),
    briefDescription: asText(fields["Brief Description"], ""),
    detailedDescription: asText(fields["Detailed Description"], ""),
    sortOrder: asNumber(fields["Sort Order"]),
  };
}

function compareTutorials(a: TutorialItem, b: TutorialItem): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function groupTutorialsByCategory(tutorials: TutorialItem[]): TutorialCategoryGroup[] {
  const buckets = new Map<string, TutorialItem[]>();

  for (const tutorial of tutorials) {
    const category = tutorial.categories[0] || UNCATEGORIZED;
    const list = buckets.get(category) ?? [];
    list.push(tutorial);
    buckets.set(category, list);
  }

  const groups = [...buckets.entries()].map(([category, items]) => ({
    category,
    tutorials: [...items].sort(compareTutorials),
  }));

  groups.sort((a, b) => {
    if (a.category === UNCATEGORIZED) return 1;
    if (b.category === UNCATEGORIZED) return -1;
    return a.category.localeCompare(b.category, undefined, { sensitivity: "base" });
  });

  return groups;
}

export function buildTutorialCatalog(
  records: Array<{ id: string; fields: TutorialFields }>,
  kind: TutorialContentKind = "tutorial",
): TutorialCatalogData {
  const tutorials = records
    .filter((record) => hasTutorialContentKind(record.fields, kind))
    .map(mapTutorialRecord)
    .sort(compareTutorials);

  return {
    categoryGroups: groupTutorialsByCategory(tutorials),
    totalTutorials: tutorials.length,
    updatedAt: new Date().toISOString(),
  };
}

export function isShootingChallengeTutorial(fields: TutorialFields): boolean {
  const programs = mapSelectOptions(fields["Associated Program"]);
  if (programs.length === 0) return true;
  return programs.some(
    (program) => program.toLowerCase() === SHOOTING_CHALLENGE_PROGRAM.toLowerCase(),
  );
}
