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
  "Unlock Message"?: unknown;
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
    unlockMessage: asText(fields["Unlock Message"], ""),
    gateCriteria: asText(fields["Public Gate Criteria"], ""),
    previousLevelId: getFirstLinkedId(fields["Previous Level"]),
    nextLevelId: getFirstLinkedId(fields["Next Level"]),
  };
}

function compareLevels(a: LevelDefinition, b: LevelDefinition): number {
  if (a.sortOrder !== b.sortOrder) return b.sortOrder - a.sortOrder;
  if (a.rank !== b.rank) return b.rank - a.rank;
  return b.xpRequired - a.xpRequired;
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
