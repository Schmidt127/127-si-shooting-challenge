import type { TutorialCatalogData, TutorialCategoryGroup, TutorialItem } from "@/types/tutorials";

import { asNumber, asText } from "./airtable-values";
import { mapAttachments, mapSelectOptions } from "./homework";

/**
 * Fields on canonical table `Tutorials & Assets` (`tblDOTgsWfqPm18bw`).
 * Do not reference the deleted `Tutorials` table.
 */
export type TutorialFields = {
  Name?: unknown;
  /** Live primary field name includes a BOM prefix. */
  "\uFEFFName"?: unknown;
  /** Stable Airtable field ID for the primary Name field. */
  fldduBizp8qAnAMJW?: unknown;
  "Link to Video"?: unknown;
  Athlete?: unknown;
  "Athlete Headshot"?: unknown;
  Thumbnail?: unknown;
  "Display Image"?: unknown;
  "Type of Asset"?: unknown;
  "Associated Program"?: unknown;
  "Brief Descriptions"?: unknown;
  "Detailed Description"?: unknown;
  "Assignment Rationale"?: unknown;
  "OK to Publish on Softr"?: unknown;
  "Sort Order"?: unknown;
};

const SHOOTING_CHALLENGE_PROGRAM = "Shooting Challenge";
const UNCATEGORIZED = "More to explore";

export type TutorialContentKind = "tutorial" | "shoutout" | "article";

function readName(fields: TutorialFields): string {
  return asText(
    fields.Name ?? fields["\uFEFFName"] ?? fields.fldduBizp8qAnAMJW,
    "Tutorial",
  );
}

/**
 * Authoritative catalog video URL from `Link to Video` only.
 * Returns the exact http(s) string from Airtable (query params, encodings, S3
 * paths preserved). Never invents a URL, never reads attachments.
 */
export function extractVideoUrl(value: unknown): string {
  if (typeof value === "string") return firstHttpUrl(value);
  if (Array.isArray(value) && typeof value[0] === "string") {
    return firstHttpUrl(value[0]);
  }
  return "";
}

export function hasCatalogVideoUrl(url: string): boolean {
  return Boolean(url.trim());
}

function firstHttpUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  const exact = asHttpUrl(text);
  if (exact) return exact;

  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? asHttpUrl(match[0]) : "";
}

/** Keep the original character sequence — do not re-serialize via `URL.href`. */
function asHttpUrl(candidate: string): string {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return candidate;
    }
  } catch {
    return "";
  }
  return "";
}

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
  const types = mapSelectOptions(fields["Type of Asset"]);
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
  const displayImage = mapAttachments(fields["Display Image"]);
  const thumbnail = mapAttachments(fields.Thumbnail);
  const headshot = mapAttachments(fields["Athlete Headshot"]);

  return {
    id: record.id,
    name: readName(fields),
    videoUrl: extractVideoUrl(fields["Link to Video"]),
    athlete: asText(fields.Athlete, ""),
    athleteHeadshot: headshot[0] ?? null,
    thumbnail: displayImage[0] ?? thumbnail[0] ?? null,
    tutorialTypes: mapSelectOptions(fields["Type of Asset"]),
    /** Category taxonomy lived only on the deleted Tutorials table. */
    categories: [],
    programs: mapSelectOptions(fields["Associated Program"]),
    briefDescription: asText(fields["Brief Descriptions"], ""),
    detailedDescription: asText(fields["Detailed Description"], ""),
    assignmentRationale: asText(fields["Assignment Rationale"], ""),
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
