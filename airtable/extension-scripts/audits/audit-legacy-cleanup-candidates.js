/*
Extension Script: Audit Legacy Cleanup Candidates
System: 127 SI Shooting Challenge
Purpose:
  Read-only inventory for Stage J/K legacy cleanup:
  - Fields/tables whose names contain LEGACY, DO NOT USE, or ZZZ
  - Orphan Athlete Achievement Unlock rows for Streak Length achievements
    (superseded by Streak Occurrences + 054)

Default: read-only (no writes)

Recommended follow-up:
  - archive-legacy-streak-unlock-records.js for orphan streak unlock rows
  - Manual Airtable UI: hide then delete legacy fields (see stage-j-legacy-cleanup.md)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 15;
const MAX_RECORDS_PER_FIELD_SCAN = 5000;

const LEGACY_NAME_PATTERN = /(LEGACY|DO NOT USE|ZZZ)/i;

const CONFIG = {
  scriptName: "audit-legacy-cleanup-candidates",
  version: "v1.1",

  tables: {
    unlocks: "Athlete Achievement Unlocks",
    achievements: "Achievements",
  },

  unlocks: {
    achievement: "Achievement",
    enrollment: "Enrollment",
    week: "Week",
    xpEvents: "XP Events",
    xpAwardStatus: "XP Award Status",
    shotMilestone: "Shot Milestone",
  },

  achievements: {
    triggerType: "Trigger Type",
    rewardRuleKey: "Reward Rule Key",
    name: "Achievement Name",
  },

  values: {
    streakTriggerType: "Streak Length",
    unlockAwarded: "Awarded",
    unlockPending: "Pending",
    deleteableStatuses: ["", "Skipped"],
  },

  /** Documented manual UI deletes — see docs/airtable/stage-j-legacy-cleanup.md Phase 3 */
  documentedManualFieldDeletes: [
    { table: "Achievements", field: "LEGACY - XP Reward - DO NOT USE" },
    { table: "Weekly Athlete Summary", field: "Weekly Bonus XP Earned - LEGACY DO NOT USE" },
    { table: "Submissions", field: "Legacy - Ready for Daily Email Build?" },
    { table: "Submissions", field: "Legacy - Daily Email Build Status" },
  ],
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw.name) return String(raw.name).trim();
  return "";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function isFieldNonEmpty(record, field) {
  const type = field.type;
  if (type === "multipleRecordLinks") {
    const raw = record.getCellValue(field.name);
    return Array.isArray(raw) && raw.length > 0;
  }
  if (type === "multipleAttachments") {
    const raw = record.getCellValue(field.name);
    return Array.isArray(raw) && raw.length > 0;
  }
  if (type === "checkbox") {
    return record.getCellValue(field.name) === true;
  }
  const text = String(record.getCellValueAsString(field.name) || "").trim();
  return text !== "";
}

function fieldExistsOnTable(tableName, fieldName) {
  try {
    const table = base.getTable(tableName);
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function matchesLegacyName(name) {
  return LEGACY_NAME_PATTERN.test(String(name || ""));
}

function buildManualDeleteReport() {
  return CONFIG.documentedManualFieldDeletes.map(item => ({
    ...item,
    stillPresent: fieldExistsOnTable(item.table, item.field),
    action: "Hide from all views, then delete field in Airtable UI",
  }));
}

async function scanLegacyFields() {
  const results = [];

  for (const table of base.tables) {
    if (matchesLegacyName(table.name)) {
      results.push({
        kind: "table",
        table: table.name,
        field: "",
        fieldType: "",
        isComputed: false,
        filledCount: null,
        scannedCount: null,
        fillRate: null,
        recommendedAction: "Hide table in UI; delete only if empty and no live links",
      });
    }

    for (const field of table.fields) {
      if (!matchesLegacyName(field.name)) continue;

      let filledCount = 0;
      let scannedCount = 0;

      try {
        const query = await table.selectRecordsAsync({
          fields: [field.name],
        });
        scannedCount = Math.min(query.records.length, MAX_RECORDS_PER_FIELD_SCAN);

        for (const record of query.records.slice(0, MAX_RECORDS_PER_FIELD_SCAN)) {
          if (isFieldNonEmpty(record, field)) filledCount += 1;
        }
      } catch (error) {
        results.push({
          kind: "field",
          table: table.name,
          field: field.name,
          fieldType: field.type,
          isComputed: field.isComputed === true,
          filledCount: null,
          scannedCount: null,
          fillRate: null,
          recommendedAction: `Scan failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }

      const fillRate = scannedCount > 0 ? filledCount / scannedCount : 0;
      let recommendedAction = "Hide from all views, then delete field in Airtable UI";

      if (field.isComputed === true) {
        recommendedAction = "Formula/computed — safe to delete if no views/interfaces use it";
      } else if (filledCount === 0) {
        recommendedAction = "0% fill — delete after hiding from views";
      } else if (fillRate > 0) {
        recommendedAction = "Has data — review before delete; may be historical only";
      }

      results.push({
        kind: "field",
        table: table.name,
        field: field.name,
        fieldType: field.type,
        isComputed: field.isComputed === true,
        filledCount,
        scannedCount,
        fillRate: Number(fillRate.toFixed(4)),
        recommendedAction,
      });
    }
  }

  return results;
}

async function scanLegacyStreakUnlocks(unlocksTable, achievementsTable, achievementQuery) {
  const streakAchievementIds = new Set();

  for (const achievement of achievementQuery.records) {
    const triggerType = getSelectName(achievement, achievementsTable, CONFIG.achievements.triggerType);
    if (triggerType === CONFIG.values.streakTriggerType) {
      streakAchievementIds.add(achievement.id);
    }
  }

  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));
  const unlockQuery = await unlocksTable.selectRecordsAsync({ fields: unlockFields });

  const deleteCandidates = [];
  const keepSamples = [];
  const reviewSamples = [];

  for (const unlock of unlockQuery.records) {
    const achievementId = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.achievement)[0] || "";
    if (!streakAchievementIds.has(achievementId)) continue;

    const xpAwardStatus = getSelectName(unlock, unlocksTable, CONFIG.unlocks.xpAwardStatus);
    const xpEventIds = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.xpEvents);
    const shotMilestoneId = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.shotMilestone)[0] || "";

    const row = {
      unlockId: unlock.id,
      name: unlock.name,
      xpAwardStatus: xpAwardStatus || "",
      xpEventCount: xpEventIds.length,
      achievementId,
      shotMilestoneId,
    };

    if (xpAwardStatus === CONFIG.values.unlockAwarded || xpEventIds.length > 0) {
      if (reviewSamples.length < SAMPLE_LIMIT) reviewSamples.push({ ...row, reason: "awarded_or_has_xp" });
      continue;
    }

    if (
      xpAwardStatus === CONFIG.values.unlockPending ||
      CONFIG.values.deleteableStatuses.includes(xpAwardStatus)
    ) {
      deleteCandidates.push({
        ...row,
        reason: xpAwardStatus === CONFIG.values.unlockPending ? "streak_pending_orphan" : "streak_blank_or_skipped",
        recommendedAction: "Delete via archive-legacy-streak-unlock-records.js",
      });
      continue;
    }

    if (reviewSamples.length < SAMPLE_LIMIT) {
      reviewSamples.push({ ...row, reason: "unexpected_status", status: xpAwardStatus });
    }
  }

  return {
    streakAchievementCount: streakAchievementIds.size,
    streakUnlockRowsScanned: unlockQuery.records.filter(unlock => {
      const achievementId = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.achievement)[0] || "";
      return streakAchievementIds.has(achievementId);
    }).length,
    deleteCandidateCount: deleteCandidates.length,
    deleteCandidatesSample: deleteCandidates.slice(0, SAMPLE_LIMIT),
    reviewSample: reviewSamples,
    keepSample: keepSamples,
  };
}

async function main() {
  const legacyFields = await scanLegacyFields();

  let streakUnlockReport = {
    streakAchievementCount: 0,
    streakUnlockRowsScanned: 0,
    deleteCandidateCount: 0,
    deleteCandidatesSample: [],
    reviewSample: [],
    error: "",
  };

  try {
    const unlocksTable = base.getTable(CONFIG.tables.unlocks);
    const achievementsTable = base.getTable(CONFIG.tables.achievements);
    const achievementFields = Object.values(CONFIG.achievements).filter(name =>
      fieldExists(achievementsTable, name)
    );
    const achievementQuery = await achievementsTable.selectRecordsAsync({ fields: achievementFields });
    streakUnlockReport = await scanLegacyStreakUnlocks(
      unlocksTable,
      achievementsTable,
      achievementQuery
    );
  } catch (error) {
    streakUnlockReport.error = error instanceof Error ? error.message : String(error);
  }

  const legacyFieldCount = legacyFields.filter(item => item.kind === "field").length;
  const legacyTableCount = legacyFields.filter(item => item.kind === "table").length;
  const manualFieldDeletes = buildManualDeleteReport();
  const manualFieldsStillPresent = manualFieldDeletes.filter(item => item.stillPresent).length;

  console.log("===== LEGACY CLEANUP CANDIDATES AUDIT =====");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        legacyTableCount,
        legacyFieldCount,
        legacyFields,
        manualFieldDeletes,
        manualFieldsStillPresent,
        streakUnlocks: streakUnlockReport,
        recommendedAction:
          streakUnlockReport.deleteCandidateCount > 0
            ? "Run archive-legacy-streak-unlock-records.js for delete candidates."
            : manualFieldsStillPresent > 0
              ? "Delete manualFieldDeletes rows still present in Airtable UI (Phase 3 in stage-j-legacy-cleanup.md)."
              : "Stage J legacy cleanup looks complete. Re-run audit-field-coverage-report.js.",
      },
      null,
      2
    )
  );
}

await main();
