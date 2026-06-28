import type { AchievementCatalogData, AchievementDefinition } from "@/types/achievements";

import { asBoolean, asNumber, asText } from "./airtable-values";

export type AchievementFields = {
  "Achievement Name"?: unknown;
  Description?: unknown;
  "Achievement Type"?: unknown;
  Category?: unknown;
  Rarity?: unknown;
  "Trigger Type"?: unknown;
  "Trigger Threshold"?: unknown;
  "Sort Order"?: unknown;
  "Badge Icon Name"?: unknown;
  "Repeatable?"?: unknown;
  "One-Time Unlock?"?: unknown;
  "Week-Specific?"?: unknown;
  "Active?"?: unknown;
  "Visible?"?: unknown;
};

function mapSelectName(value: unknown): string {
  if (value && typeof value === "object" && "name" in value) {
    return asText((value as { name?: unknown }).name, "");
  }
  return asText(value, "");
}

export function mapAchievementRecord(record: {
  id: string;
  fields: AchievementFields;
}): AchievementDefinition {
  const fields = record.fields;

  return {
    id: record.id,
    name: asText(fields["Achievement Name"], "Achievement"),
    description: asText(fields.Description, ""),
    type: mapSelectName(fields["Achievement Type"]),
    category: mapSelectName(fields.Category),
    rarity: mapSelectName(fields.Rarity) || "Common",
    triggerType: mapSelectName(fields["Trigger Type"]),
    triggerThreshold: asNumber(fields["Trigger Threshold"]) || null,
    sortOrder: asNumber(fields["Sort Order"]),
    badgeIconName: asText(fields["Badge Icon Name"], ""),
    repeatable: asBoolean(fields["Repeatable?"]),
    oneTimeUnlock: asBoolean(fields["One-Time Unlock?"]),
    weekSpecific: asBoolean(fields["Week-Specific?"]),
  };
}

function compareAchievements(a: AchievementDefinition, b: AchievementDefinition): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

export function buildAchievementCatalog(
  records: Array<{ id: string; fields: AchievementFields }>,
): AchievementCatalogData {
  const achievements = records.map(mapAchievementRecord).sort(compareAchievements);

  return {
    achievements,
    totalAchievements: achievements.length,
    updatedAt: new Date().toISOString(),
  };
}
