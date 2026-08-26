import type { LevelDefinition, LevelLadderData } from "@/types/levels";

import { asNumber, asText } from "./airtable-values";
import { getFirstLinkedId, mapAttachments } from "./homework";

export type LevelFields = {
  "Level Name"?: unknown;
  "Level Name with Color"?: unknown;
  "Cover Image"?: unknown;
  "XP Required (Cumulative)"?: unknown;
  "XP From Previous Level"?: unknown;
  "Previous Level"?: unknown;
  "Next Level"?: unknown;
  "Sort Order"?: unknown;
  Rank?: unknown;
  "Public Gate Criteria"?: unknown;
  "Active?"?: unknown;
};

export function mapLevelRecord(record: { id: string; fields: LevelFields }): LevelDefinition {
  const fields = record.fields;
  const coverImages = mapAttachments(fields["Cover Image"]);
  const colorName = asText(fields["Level Name with Color"], "");
  const baseName = asText(fields["Level Name"], "Level");

  return {
    id: record.id,
    name: baseName,
    displayName: colorName && colorName !== "—" ? colorName : baseName,
    sortOrder: asNumber(fields["Sort Order"]),
    rank: asNumber(fields.Rank),
    xpRequired: asNumber(fields["XP Required (Cumulative)"]),
    xpFromPrevious: asNumber(fields["XP From Previous Level"]),
    coverImage: coverImages[0] ?? null,
    gateCriteria: asText(fields["Public Gate Criteria"], ""),
    previousLevelId: getFirstLinkedId(fields["Previous Level"]),
    nextLevelId: getFirstLinkedId(fields["Next Level"]),
  };
}

/** Ascending ladder order — Level 1 first, pinnacle last. */
export function compareLevels(a: LevelDefinition, b: LevelDefinition): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.xpRequired - b.xpRequired;
}

/** Display number for ladder cards — prefers configured Sort Order. */
export function getLevelDisplayNumber(level: LevelDefinition): number | null {
  if (level.sortOrder > 0) return level.sortOrder;
  if (level.rank > 0) return level.rank;
  return null;
}

/** Short gate preview for catalog cards; full text stays on the detail page. */
export function summarizeGateCriteria(gateCriteria: string, maxLength = 120): string {
  const normalized = gateCriteria.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildLevelLadder(
  records: Array<{ id: string; fields: LevelFields }>,
): LevelLadderData {
  const levels = records.map(mapLevelRecord).sort(compareLevels);
  const maxXp = levels.reduce((max, level) => Math.max(max, level.xpRequired), 0);

  return {
    levels,
    totalLevels: levels.length,
    maxXp,
    updatedAt: new Date().toISOString(),
  };
}
