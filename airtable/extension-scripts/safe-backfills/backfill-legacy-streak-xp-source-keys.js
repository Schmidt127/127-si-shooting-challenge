/*
Extension Script: Backfill Legacy Streak XP Source Keys
System: 127 SI Shooting Challenge
Purpose:
  Migrates legacy streak XP Source Keys (STREAK_OCC| / STREAK_OCCURRENCE|) to the
  canonical 054 format: STREAK_XP|{enrollment}|{achievement}|{streakEndDate}.

  Use after backfill-legacy-streak-xp-week-and-was.js and a clean orphan XP audit.
  Targets Awarded Streak Occurrences whose linked XP still uses a legacy key.

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE = true to write
  - BATCH_LIMIT = 25; re-run until remainingCount is 0
  - Skips when canonical key already exists on a different XP Event

Setup:
  1. audit-orphan-xp-events.js → issueTotal 0
  2. Run this script DRY_RUN=true (expect ~167 candidates)
  3. CONFIRM_WRITE=true; re-run until remainingCount is 0
  4. audit-achievement-xp-pipeline-integrity.js → issueTotal 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const ONLY_AWARDED_OCCURRENCES = true;
const DEBUG_OCCURRENCE_ID = "";

const CONFIG = {
  scriptName: "backfill-legacy-streak-xp-source-keys",
  version: "v1.0",

  tables: {
    xpEvents: "XP Events",
    streakOccurrences: "Streak Occurrences",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    streakOccurrence: "Streak Occurrence",
    sourceKey: "Source Key",
    xpBucket: "XP Bucket",
  },

  streakOccurrences: {
    enrollment: "Enrollment",
    achievement: "Achievement",
    week: "Week",
    streakEndDate: "Streak End Date",
    sourceStatus: "Source Status",
    xpEvents: "XP Events",
  },

  values: {
    legacyPrefixes: ["STREAK_OCCURRENCE|", "STREAK_OCC|"],
    canonicalPrefix: "STREAK_XP|",
    streakAwarded: "Awarded",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  try {
    return table.getField(fieldName).isComputed !== true;
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

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function linkedCell(ids) {
  return ids.filter(Boolean).map(id => ({ id }));
}

function toDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildCanonicalSourceKey(enrollmentId, achievementId, streakEndDateKey) {
  if (!enrollmentId || !achievementId || !streakEndDateKey) return "";
  return `${CONFIG.values.canonicalPrefix}${enrollmentId}|${achievementId}|${streakEndDateKey}`;
}

function buildLegacySourceKeys(occurrenceId) {
  return CONFIG.values.legacyPrefixes.map(prefix => `${prefix}${occurrenceId}`);
}

function isLegacyStreakSourceKey(sourceKey) {
  const raw = String(sourceKey || "").trim();
  return CONFIG.values.legacyPrefixes.some(prefix => raw.startsWith(prefix));
}

function addIfWritable(update, table, fieldName, value) {
  if (value === undefined || value === null) return;
  if (fieldName === "" || !isWritableField(table, fieldName)) return;
  if (Array.isArray(value) && value.length === 0) return;
  update[fieldName] = value;
}

function xpBelongsToOccurrence(xpRecord, xpEventsTable, occurrenceId, legacyKeys) {
  if (getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.streakOccurrence).includes(occurrenceId)) {
    return true;
  }
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  return legacyKeys.includes(sourceKey);
}

async function main() {
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const streakTable = base.getTable(CONFIG.tables.streakOccurrences);

  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));
  const streakFields = Object.values(CONFIG.streakOccurrences).filter(name =>
    fieldExists(streakTable, name)
  );

  const [xpQuery, streakQuery] = await Promise.all([
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    streakTable.selectRecordsAsync({ fields: streakFields }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const candidates = [];
  const skipped = [];
  const skipCounts = {};

  function skip(reason, row) {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
    if (skipped.length < 15) skipped.push({ reason, ...row });
  }

  for (const occurrence of streakQuery.records) {
    if (DEBUG_OCCURRENCE_ID && occurrence.id !== DEBUG_OCCURRENCE_ID) continue;

    const sourceStatus = getSelectName(occurrence, streakTable, CONFIG.streakOccurrences.sourceStatus);
    if (ONLY_AWARDED_OCCURRENCES && sourceStatus !== CONFIG.values.streakAwarded) {
      skip("occurrence_not_awarded", { occurrenceId: occurrence.id, sourceStatus });
      continue;
    }

    const enrollmentId = getFirstLinkedId(
      occurrence,
      streakTable,
      CONFIG.streakOccurrences.enrollment
    );
    const achievementId = getFirstLinkedId(
      occurrence,
      streakTable,
      CONFIG.streakOccurrences.achievement
    );
    const streakEndDateKey = toDateKey(
      fieldExists(streakTable, CONFIG.streakOccurrences.streakEndDate)
        ? occurrence.getCellValue(CONFIG.streakOccurrences.streakEndDate)
        : null
    );

    const canonicalSourceKey = buildCanonicalSourceKey(
      enrollmentId,
      achievementId,
      streakEndDateKey
    );

    if (!canonicalSourceKey) {
      skip("occurrence_missing_canonical_parts", {
        occurrenceId: occurrence.id,
        enrollmentId,
        achievementId,
        streakEndDateKey,
      });
      continue;
    }

    const legacyKeys = buildLegacySourceKeys(occurrence.id);
    const linkedXpIds = getLinkedIds(occurrence, streakTable, CONFIG.streakOccurrences.xpEvents);
    const legacyXpIds = legacyKeys.flatMap(key => xpBySourceKey.get(key) || []);
    const xpIds = [...new Set([...linkedXpIds, ...legacyXpIds])].filter(xpId => {
      const xp = xpQuery.getRecord(xpId);
      return xp && xpBelongsToOccurrence(xp, xpEventsTable, occurrence.id, legacyKeys);
    });

    if (xpIds.length === 0) {
      skip("missing_xp_for_occurrence", {
        occurrenceId: occurrence.id,
        canonicalSourceKey,
      });
      continue;
    }

    if (xpIds.length > 1) {
      skip("duplicate_xp_for_occurrence", {
        occurrenceId: occurrence.id,
        xpEventIds: xpIds,
      });
      continue;
    }

    const xpEventId = xpIds[0];
    const xpRecord = xpQuery.getRecord(xpEventId);
    const actualSourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);

    if (actualSourceKey === canonicalSourceKey) {
      skip("already_canonical", { occurrenceId: occurrence.id, xpEventId, actualSourceKey });
      continue;
    }

    const canonicalOwners = (xpBySourceKey.get(canonicalSourceKey) || []).filter(id => id !== xpEventId);
    if (canonicalOwners.length > 0) {
      skip("canonical_key_collision", {
        occurrenceId: occurrence.id,
        xpEventId,
        canonicalSourceKey,
        existingXpEventIds: canonicalOwners,
      });
      continue;
    }

    if (!isWritableField(xpEventsTable, CONFIG.xpEvents.sourceKey)) {
      skip("source_key_not_writable", { occurrenceId: occurrence.id, xpEventId });
      continue;
    }

    const actions = ["repair_source_key"];
    if (!getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.streakOccurrence)) {
      actions.push("link_streak_occurrence");
    }

    candidates.push({
      occurrenceId: occurrence.id,
      xpEventId,
      name: xpRecord.name,
      actualSourceKey,
      canonicalSourceKey,
      legacyKeyFormat: isLegacyStreakSourceKey(actualSourceKey)
        ? actualSourceKey.split("|")[0] + "|"
        : "non_legacy_mismatch",
      actions,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const update = {};

      if (row.actions.includes("repair_source_key")) {
        update[CONFIG.xpEvents.sourceKey] = row.canonicalSourceKey;
      }
      if (row.actions.includes("link_streak_occurrence")) {
        addIfWritable(
          update,
          xpEventsTable,
          CONFIG.xpEvents.streakOccurrence,
          linkedCell([row.occurrenceId])
        );
      }

      if (Object.keys(update).length === 0) {
        skip("no_writable_changes", { occurrenceId: row.occurrenceId, xpEventId: row.xpEventId });
        continue;
      }

      if (!DRY_RUN && CONFIRM_WRITE) {
        await xpEventsTable.updateRecordAsync(row.xpEventId, update);
      }

      applied.push({
        ...row,
        dryRun: DRY_RUN || !CONFIRM_WRITE,
        updateFields: Object.keys(update),
      });
    } catch (error) {
      errors.push({
        occurrenceId: row.occurrenceId,
        xpEventId: row.xpEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const actionCounts = {};
  for (const row of candidates) {
    for (const action of row.actions) {
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    }
  }

  const legacyFormatCounts = {};
  for (const row of candidates) {
    legacyFormatCounts[row.legacyKeyFormat] = (legacyFormatCounts[row.legacyKeyFormat] || 0) + 1;
  }

  console.log("===== BACKFILL LEGACY STREAK XP SOURCE KEYS =====");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        dryRun: DRY_RUN,
        confirmWrite: CONFIRM_WRITE,
        onlyAwardedOccurrences: ONLY_AWARDED_OCCURRENCES,
        batchLimit: BATCH_LIMIT,
        streakOccurrencesChecked: streakQuery.records.length,
        candidateCount: candidates.length,
        batchCount: batch.length,
        appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
        remainingCount: Math.max(0, candidates.length - batch.length),
        skippedCount: Object.values(skipCounts).reduce((sum, n) => sum + n, 0),
        skipCounts,
        actionCounts,
        legacyFormatCounts,
        errors,
        skippedSample: skipped,
        sample: applied.slice(0, 15),
      },
      null,
      2
    )
  );
}

await main();
