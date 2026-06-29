/*
Extension Script: Repair Final 090F — Unlock Week from Source Date
System: 127 SI Shooting Challenge
Purpose:
  Repairs Athlete Achievement Unlocks with an empty Week by deriving the correct
  Week from Milestone Activity Date and Weeks date ranges.

Safety:
  - DRY_RUN defaults to true (read/report only)
  - Set DRY_RUN = false and CONFIRM_WRITE = true to apply writes
  - NEVER overwrites non-empty Athlete Achievement Unlocks.Week
  - BATCH_LIMIT = 25; re-run until remainingCount is 0
  - Optional Active? enrollment scope filter is configurable

Notes:
  - Week resolution mirrors backfill-shot-milestone-xp-week-and-was.js
  - This script only updates Athlete Achievement Unlocks.Week
  - No deletes; no XP/Event writes; no external calls
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const ACTIVE_ENROLLMENT_SCOPE_ONLY = true;
const SCHEMA_SNAPSHOT = "20260629_090f_stub";
const SAMPLE_LIMIT = 25;

const CONFIG = {
  scriptName: "repair-final-090f-unlock-week-from-source",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    unlocks: "Athlete Achievement Unlocks",
    weeks: "Weeks",
    enrollments: "Enrollments",
  },

  unlocks: {
    enrollment: "Enrollment",
    week: "Week",
    milestoneActivityDate: "Milestone Activity Date",
  },

  weeks: {
    startDate: "Start Date",
    endDate: "End Date",
  },

  enrollments: {
    active: "Active?",
  },
};

const REQUIRED_FIELDS = [
  ["Athlete Achievement Unlocks", "Enrollment"],
  ["Athlete Achievement Unlocks", "Week"],
  ["Athlete Achievement Unlocks", "Milestone Activity Date"],
  ["Weeks", "Start Date"],
  ["Weeks", "End Date"],
];

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

function requireSchema(tables) {
  const missing = [];

  for (const [tableName, fieldName] of REQUIRED_FIELDS) {
    const table = tables[tableName];
    if (!table) {
      missing.push(`table:${tableName}`);
      continue;
    }
    if (!fieldExists(table, fieldName)) {
      missing.push(`${tableName}.${fieldName}`);
    }
  }

  if (ACTIVE_ENROLLMENT_SCOPE_ONLY) {
    const enrollments = tables[CONFIG.tables.enrollments];
    if (!enrollments) {
      missing.push(`table:${CONFIG.tables.enrollments}`);
    } else if (!fieldExists(enrollments, CONFIG.enrollments.active)) {
      missing.push(`${CONFIG.tables.enrollments}.${CONFIG.enrollments.active}`);
    }
  }

  if (missing.length) {
    throw new Error(`Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`);
  }
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

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function toDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function linkedCell(ids) {
  return ids.filter(Boolean).map(id => ({ id }));
}

function findWeekForDate(weekRecords, weeksTable, dateKey) {
  if (!dateKey) return null;

  const target = new Date(`${dateKey}T12:00:00.000Z`);

  for (const week of weekRecords) {
    const startRaw = week.getCellValue(CONFIG.weeks.startDate);
    const endRaw = week.getCellValue(CONFIG.weeks.endDate);
    if (!startRaw || !endRaw) continue;

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const startDateOnly = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0)
    );
    const endDateOnly = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999)
    );

    if (target >= startDateOnly && target <= endDateOnly) {
      return week;
    }
  }

  return null;
}

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true while DRY_RUN is true. Set DRY_RUN = false to write.");
  }

  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  requireSchema({
    [CONFIG.tables.unlocks]: unlocksTable,
    [CONFIG.tables.weeks]: weeksTable,
    [CONFIG.tables.enrollments]: enrollmentsTable,
  });

  if (!isWritableField(unlocksTable, CONFIG.unlocks.week)) {
    throw new Error(
      `Field is not writable: ${CONFIG.tables.unlocks}.${CONFIG.unlocks.week}`
    );
  }

  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));
  const weekFields = Object.values(CONFIG.weeks).filter(name => fieldExists(weeksTable, name));

  const [unlockQuery, weekQuery, enrollmentQuery] = await Promise.all([
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
    weeksTable.selectRecordsAsync({ fields: weekFields }),
    enrollmentsTable.selectRecordsAsync({
      fields: fieldExists(enrollmentsTable, CONFIG.enrollments.active) ? [CONFIG.enrollments.active] : [],
    }),
  ]);

  const activeEnrollmentIds = new Set();
  if (ACTIVE_ENROLLMENT_SCOPE_ONLY) {
    for (const enrollment of enrollmentQuery.records) {
      if (getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) {
        activeEnrollmentIds.add(enrollment.id);
      }
    }
  }

  const candidates = [];
  const skipped = [];
  const skipCounts = {};

  function skip(reason, details) {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
    if (skipped.length < SAMPLE_LIMIT) skipped.push({ reason, ...details });
  }

  for (const unlock of unlockQuery.records) {
    const enrollmentId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.enrollment);
    const existingWeekId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.week);

    if (!enrollmentId) {
      skip("missing_enrollment", { unlockId: unlock.id, name: unlock.name });
      continue;
    }

    if (ACTIVE_ENROLLMENT_SCOPE_ONLY && !activeEnrollmentIds.has(enrollmentId)) {
      skip("excluded_inactive_enrollment", { unlockId: unlock.id, enrollmentId });
      continue;
    }

    if (existingWeekId) {
      skip("already_has_week", { unlockId: unlock.id, enrollmentId, weekId: existingWeekId });
      continue;
    }

    const activityDateRaw = unlock.getCellValue(CONFIG.unlocks.milestoneActivityDate);
    const activityDateKey = toDateKey(activityDateRaw);

    if (!activityDateKey) {
      skip("missing_or_invalid_milestone_activity_date", {
        unlockId: unlock.id,
        enrollmentId,
      });
      continue;
    }

    const resolvedWeek = findWeekForDate(weekQuery.records, weeksTable, activityDateKey);
    if (!resolvedWeek) {
      skip("week_not_found_for_milestone_activity_date", {
        unlockId: unlock.id,
        enrollmentId,
        activityDateKey,
      });
      continue;
    }

    candidates.push({
      unlockId: unlock.id,
      unlockName: unlock.name,
      enrollmentId,
      activityDateKey,
      resolvedWeekId: resolvedWeek.id,
      resolvedWeekName: resolvedWeek.name,
      action: "link_week_from_milestone_activity_date",
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const update = {
        [CONFIG.unlocks.week]: linkedCell([row.resolvedWeekId]),
      };

      if (!DRY_RUN && CONFIRM_WRITE) {
        await unlocksTable.updateRecordAsync(row.unlockId, update);
      }

      applied.push({
        ...row,
        dryRun: DRY_RUN || !CONFIRM_WRITE,
        updateFields: Object.keys(update),
      });
    } catch (error) {
      errors.push({
        unlockId: row.unlockId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: CONFIG.schemaSnapshot,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    activeEnrollmentScopeOnly: ACTIVE_ENROLLMENT_SCOPE_ONLY,
    batchLimit: BATCH_LIMIT,
    unlocksChecked: unlockQuery.records.length,
    activeEnrollmentCount: activeEnrollmentIds.size,
    candidateCount: candidates.length,
    batchCount: batch.length,
    appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
    remainingCount: Math.max(0, candidates.length - batch.length),
    skippedCount: Object.values(skipCounts).reduce((sum, n) => sum + n, 0),
    skipCounts,
    errors,
    sample: applied.slice(0, SAMPLE_LIMIT),
    skippedSample: skipped,
  };

  console.log("===== FINAL 090F — REPAIR UNLOCK WEEK FROM SOURCE DATE =====");
  console.log(JSON.stringify(report, null, 2));

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("Read-only mode active. No records were updated.");
    console.log(
      `To apply: set DRY_RUN = false and CONFIRM_WRITE = true (writes capped at ${BATCH_LIMIT} per run).`
    );
  }
}

await main();
