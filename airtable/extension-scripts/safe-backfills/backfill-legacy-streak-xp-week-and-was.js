/*
Extension Script: Backfill Legacy Streak XP Week and WAS Links
System: 127 SI Shooting Challenge
Purpose:
  Repairs legacy streak XP Events (STREAK_OCCURRENCE|{id} Source Keys) that have
  Enrollment but no Week / Weekly Athlete Summary. Copies Week from the linked
  Streak Occurrence and links WAS when exactly one summary exists.

  Optionally rewrites Source Key to STREAK_XP|{enrollment}|{achievement}|{date}
  (054 canonical format) when REPAIR_SOURCE_KEY is true.

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE = true to write
  - BATCH_LIMIT = 25; re-run until remainingCount is 0

Setup:
  1. Run audit-orphan-xp-events.js (expect missingEnrollmentOrWeekCount from legacy streak)
  2. Run this script with DRY_RUN = true; review sample
  3. CONFIRM_WRITE = true; re-run until remainingCount is 0
  4. Re-run audit-orphan-xp-events.js until issueTotal is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const REPAIR_SOURCE_KEY = true;
const DEBUG_XP_EVENT_ID = "";

const CONFIG = {
  scriptName: "backfill-legacy-streak-xp-week-and-was",
  version: "v1.0",

  tables: {
    xpEvents: "XP Events",
    streakOccurrences: "Streak Occurrences",
    weeklySummary: "Weekly Athlete Summary",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    streakOccurrence: "Streak Occurrence",
    sourceKey: "Source Key",
    xpPoints: "XP Points",
    xpSource: "XP Source",
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

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    legacyPrefixes: ["STREAK_OCCURRENCE|", "STREAK_OCC|"],
    canonicalPrefix: "STREAK_XP|",
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

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function toDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function linkedCell(ids) {
  return ids.filter(Boolean).map(id => ({ id }));
}

function extractOccurrenceIdFromSourceKey(sourceKey) {
  const raw = String(sourceKey || "").trim();
  for (const prefix of CONFIG.values.legacyPrefixes) {
    if (raw.startsWith(prefix)) {
      const id = raw.slice(prefix.length).trim();
      if (id.startsWith("rec")) return id;
    }
  }
  return "";
}

function buildCanonicalSourceKey(enrollmentId, achievementId, streakEndDateKey) {
  if (!enrollmentId || !achievementId || !streakEndDateKey) return "";
  return `${CONFIG.values.canonicalPrefix}${enrollmentId}|${achievementId}|${streakEndDateKey}`;
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

async function main() {
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const streakTable = base.getTable(CONFIG.tables.streakOccurrences);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));
  const streakFields = Object.values(CONFIG.streakOccurrences).filter(name =>
    fieldExists(streakTable, name)
  );
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [xpQuery, streakQuery, summaryQuery] = await Promise.all([
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    streakTable.selectRecordsAsync({ fields: streakFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    const weekId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week);
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, []);
    summaryIndex.get(key).push(summary.id);
  }

  const candidates = [];
  const skipped = [];
  const skipCounts = {};

  function skip(reason, row) {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
    if (skipped.length < 15) skipped.push({ reason, ...row });
  }

  for (const xpRecord of xpQuery.records) {
    if (DEBUG_XP_EVENT_ID && xpRecord.id !== DEBUG_XP_EVENT_ID) continue;

    const xpWeekId = getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.week);
    if (xpWeekId) continue;

    const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const streakOccurrenceId =
      getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.streakOccurrence) ||
      extractOccurrenceIdFromSourceKey(sourceKey);

    if (!streakOccurrenceId) {
      if (!getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment)) {
        skip("no_enrollment_or_occurrence", { xpEventId: xpRecord.id, sourceKey });
      } else {
        skip("missing_week_non_streak", { xpEventId: xpRecord.id, sourceKey });
      }
      continue;
    }

    if (!isLegacyStreakSourceKey(sourceKey) && !getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.streakOccurrence)) {
      skip("not_legacy_streak_key", { xpEventId: xpRecord.id, sourceKey, streakOccurrenceId });
      continue;
    }

    const occurrence = streakQuery.getRecord(streakOccurrenceId);
    if (!occurrence) {
      skip("occurrence_not_found", { xpEventId: xpRecord.id, streakOccurrenceId, sourceKey });
      continue;
    }

    const occurrenceEnrollmentId = getFirstLinkedId(
      occurrence,
      streakTable,
      CONFIG.streakOccurrences.enrollment
    );
    const occurrenceWeekId = getFirstLinkedId(occurrence, streakTable, CONFIG.streakOccurrences.week);
    const occurrenceAchievementId = getFirstLinkedId(
      occurrence,
      streakTable,
      CONFIG.streakOccurrences.achievement
    );
    const streakEndDateKey = toDateKey(
      fieldExists(streakTable, CONFIG.streakOccurrences.streakEndDate)
        ? occurrence.getCellValue(CONFIG.streakOccurrences.streakEndDate)
        : null
    );

    if (!occurrenceWeekId) {
      skip("occurrence_missing_week", {
        xpEventId: xpRecord.id,
        streakOccurrenceId,
        sourceKey,
      });
      continue;
    }

    const enrollmentId =
      getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment) || occurrenceEnrollmentId;

    if (!enrollmentId) {
      skip("no_enrollment_on_xp_or_occurrence", { xpEventId: xpRecord.id, streakOccurrenceId });
      continue;
    }

    const summaryIds = summaryIndex.get(buildSummaryIndexKey(enrollmentId, occurrenceWeekId)) || [];
    const weeklySummaryId =
      getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.weeklySummary) ||
      (summaryIds.length === 1 ? summaryIds[0] : "");

    if (summaryIds.length > 1) {
      skip("ambiguous_weekly_summary", {
        xpEventId: xpRecord.id,
        enrollmentId,
        weekId: occurrenceWeekId,
        summaryIds,
      });
      continue;
    }

    const canonicalSourceKey = buildCanonicalSourceKey(
      enrollmentId,
      occurrenceAchievementId,
      streakEndDateKey
    );

    const actions = ["link_week"];
    if (weeklySummaryId && !getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
      actions.push("link_was");
    }
    if (!getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.streakOccurrence)) {
      actions.push("link_streak_occurrence");
    }
    if (enrollmentId !== getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment)) {
      actions.push("link_enrollment");
    }
    if (
      REPAIR_SOURCE_KEY &&
      canonicalSourceKey &&
      sourceKey !== canonicalSourceKey &&
      isWritableField(xpEventsTable, CONFIG.xpEvents.sourceKey)
    ) {
      actions.push("repair_source_key");
    }

    candidates.push({
      xpEventId: xpRecord.id,
      name: xpRecord.name,
      sourceKey,
      canonicalSourceKey,
      streakOccurrenceId,
      enrollmentId,
      weekId: occurrenceWeekId,
      weeklySummaryId,
      actions,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const update = {};

      if (row.actions.includes("link_week")) {
        addIfWritable(update, xpEventsTable, CONFIG.xpEvents.week, linkedCell([row.weekId]));
      }
      if (row.actions.includes("link_enrollment")) {
        addIfWritable(update, xpEventsTable, CONFIG.xpEvents.enrollment, linkedCell([row.enrollmentId]));
      }
      if (row.actions.includes("link_streak_occurrence")) {
        addIfWritable(
          update,
          xpEventsTable,
          CONFIG.xpEvents.streakOccurrence,
          linkedCell([row.streakOccurrenceId])
        );
      }
      if (row.actions.includes("link_was") && row.weeklySummaryId) {
        addIfWritable(
          update,
          xpEventsTable,
          CONFIG.xpEvents.weeklySummary,
          linkedCell([row.weeklySummaryId])
        );
      }
      if (row.actions.includes("repair_source_key") && row.canonicalSourceKey) {
        update[CONFIG.xpEvents.sourceKey] = row.canonicalSourceKey;
      }

      if (Object.keys(update).length === 0) {
        skip("no_writable_changes", { xpEventId: row.xpEventId });
        continue;
      }

      if (!DRY_RUN && CONFIRM_WRITE) {
        await xpEventsTable.updateRecordAsync(row.xpEventId, update);
      }

      applied.push({ ...row, dryRun: DRY_RUN || !CONFIRM_WRITE, updateFields: Object.keys(update) });
    } catch (error) {
      errors.push({
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

  console.log("===== BACKFILL LEGACY STREAK XP WEEK AND WAS =====");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        dryRun: DRY_RUN,
        confirmWrite: CONFIRM_WRITE,
        repairSourceKey: REPAIR_SOURCE_KEY,
        batchLimit: BATCH_LIMIT,
        xpEventsChecked: xpQuery.records.length,
        candidateCount: candidates.length,
        batchCount: batch.length,
        appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
        remainingCount: Math.max(0, candidates.length - batch.length),
        skippedCount: Object.values(skipCounts).reduce((sum, n) => sum + n, 0),
        skipCounts,
        actionCounts,
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
