/*
Extension Script: Backfill Shot Milestone XP Week and WAS Links
System: 127 SI Shooting Challenge
Purpose:
  Repairs Shot Milestone XP Events (SHOT_MILESTONE|{enrollment}|{milestoneId})
  that have Enrollment but no Week / Weekly Athlete Summary.

  Shot Milestone unlocks from 066 do not populate Week — only Milestone Activity Date.
  This script resolves Week from that activity date (053 week-range logic), links XP,
  and optionally backfills Week on the unlock record.

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE = true to write
  - BATCH_LIMIT = 25; re-run until remainingCount is 0

Setup:
  1. Run backfill-legacy-streak-xp-week-and-was.js first (legacy streak rows)
  2. Run this script with DRY_RUN = true; review sample (expect ~14 rows)
  3. CONFIRM_WRITE = true; re-run until remainingCount is 0
  4. Re-run audit-orphan-xp-events.js until issueTotal is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const WRITE_UNLOCK_WEEK = true;
const DEBUG_XP_EVENT_ID = "";

const CONFIG = {
  scriptName: "backfill-shot-milestone-xp-week-and-was",
  version: "v1.1",

  tables: {
    xpEvents: "XP Events",
    unlocks: "Athlete Achievement Unlocks",
    weeklySummary: "Weekly Athlete Summary",
    weeks: "Weeks",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    achievementUnlock: "Achievement Unlock",
    shotMilestones: "Shot Milestones",
    sourceKey: "Source Key",
  },

  unlocks: {
    enrollment: "Enrollment",
    week: "Week",
    shotMilestone: "Shot Milestone",
    milestoneSourceKey: "Milestone Source Key",
    milestoneActivityDate: "Milestone Activity Date",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  weeks: {
    startDate: "Start Date",
    endDate: "End Date",
  },

  values: {
    sourceKeyPrefix: "SHOT_MILESTONE|",
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

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function linkedCell(ids) {
  return ids.filter(Boolean).map(id => ({ id }));
}

function parseShotMilestoneSourceKey(sourceKey) {
  const raw = String(sourceKey || "").trim();
  if (!raw.startsWith(CONFIG.values.sourceKeyPrefix)) {
    return { enrollmentId: "", shotMilestoneId: "" };
  }

  const parts = raw.slice(CONFIG.values.sourceKeyPrefix.length).split("|");
  const enrollmentId = String(parts[0] || "").trim();
  const shotMilestoneId = String(parts[1] || "").trim();

  return {
    enrollmentId: enrollmentId.startsWith("rec") ? enrollmentId : "",
    shotMilestoneId: shotMilestoneId.startsWith("rec") ? shotMilestoneId : "",
  };
}

function buildShotMilestoneSourceKey(enrollmentId, shotMilestoneId) {
  if (!enrollmentId || !shotMilestoneId) return "";
  return `${CONFIG.values.sourceKeyPrefix}${enrollmentId}|${shotMilestoneId}`;
}

function toDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function findWeekForDate(weekRecords, weeksTable, dateKey) {
  if (!dateKey) return null;

  const target = new Date(`${dateKey}T12:00:00.000Z`);

  for (const week of weekRecords) {
    const startRaw = fieldExists(weeksTable, CONFIG.weeks.startDate)
      ? week.getCellValue(CONFIG.weeks.startDate)
      : null;
    const endRaw = fieldExists(weeksTable, CONFIG.weeks.endDate)
      ? week.getCellValue(CONFIG.weeks.endDate)
      : null;

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

function resolveWeekForUnlock(unlock, unlocksTable, weeksTable, weekRecords) {
  const linkedWeekId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.week);
  if (linkedWeekId) {
    return { weekId: linkedWeekId, weekResolveSource: "unlock_week_link" };
  }

  const activityDate = fieldExists(unlocksTable, CONFIG.unlocks.milestoneActivityDate)
    ? unlock.getCellValue(CONFIG.unlocks.milestoneActivityDate)
    : null;
  const dateKey = toDateKey(activityDate);
  const weekRecord = findWeekForDate(weekRecords, weeksTable, dateKey);

  if (weekRecord) {
    return {
      weekId: weekRecord.id,
      weekResolveSource: "milestone_activity_date",
      activityDateKey: dateKey,
    };
  }

  return {
    weekId: "",
    weekResolveSource: "",
    activityDateKey: dateKey,
  };
}

function addIfWritable(update, table, fieldName, value) {
  if (value === undefined || value === null) return;
  if (fieldName === "" || !isWritableField(table, fieldName)) return;
  if (Array.isArray(value) && value.length === 0) return;
  update[fieldName] = value;
}

async function main() {
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));
  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );
  const weekFields = Object.values(CONFIG.weeks).filter(name => fieldExists(weeksTable, name));

  const [xpQuery, unlockQuery, summaryQuery, weeksQuery] = await Promise.all([
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
    weeksTable.selectRecordsAsync({ fields: weekFields }),
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

  const unlockBySourceKey = new Map();
  const unlockByXpEventId = new Map();
  const unlockByEnrollmentMilestone = new Map();

  for (const unlock of unlockQuery.records) {
    const enrollmentId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.enrollment);
    const shotMilestoneId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.shotMilestone);
    const milestoneSourceKey = getText(unlock, unlocksTable, CONFIG.unlocks.milestoneSourceKey);
    const builtSourceKey = buildShotMilestoneSourceKey(enrollmentId, shotMilestoneId);

    for (const key of [milestoneSourceKey, builtSourceKey].filter(Boolean)) {
      if (!unlockBySourceKey.has(key)) unlockBySourceKey.set(key, unlock.id);
    }

    if (enrollmentId && shotMilestoneId) {
      const pairKey = buildSummaryIndexKey(enrollmentId, shotMilestoneId);
      if (!unlockByEnrollmentMilestone.has(pairKey)) {
        unlockByEnrollmentMilestone.set(pairKey, []);
      }
      unlockByEnrollmentMilestone.get(pairKey).push(unlock.id);
    }

    for (const xpEventId of getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.xpEvents)) {
      if (!unlockByXpEventId.has(xpEventId)) unlockByXpEventId.set(xpEventId, unlock.id);
    }
  }

  function resolveUnlockId(xpRecord, sourceKey, enrollmentId, shotMilestoneId) {
    const linkedUnlockId = getFirstLinkedId(
      xpRecord,
      xpEventsTable,
      CONFIG.xpEvents.achievementUnlock
    );
    if (linkedUnlockId && unlockQuery.getRecord(linkedUnlockId)) {
      return { unlockId: linkedUnlockId, source: "xp_achievement_unlock_link" };
    }

    const fromXpIndex = unlockByXpEventId.get(xpRecord.id);
    if (fromXpIndex && unlockQuery.getRecord(fromXpIndex)) {
      return { unlockId: fromXpIndex, source: "unlock_xp_events_link" };
    }

    const fromSourceKey = unlockBySourceKey.get(sourceKey);
    if (fromSourceKey && unlockQuery.getRecord(fromSourceKey)) {
      return { unlockId: fromSourceKey, source: "source_key_index" };
    }

    const pairMatches =
      unlockByEnrollmentMilestone.get(buildSummaryIndexKey(enrollmentId, shotMilestoneId)) || [];
    if (pairMatches.length === 1) {
      return { unlockId: pairMatches[0], source: "enrollment_shot_milestone_pair" };
    }

    return { unlockId: "", source: "", pairMatchCount: pairMatches.length };
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
    const { enrollmentId: parsedEnrollmentId, shotMilestoneId } = parseShotMilestoneSourceKey(sourceKey);

    if (!parsedEnrollmentId || !shotMilestoneId) {
      skip("not_shot_milestone_source_key", { xpEventId: xpRecord.id, sourceKey });
      continue;
    }

    const enrollmentId =
      getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment) || parsedEnrollmentId;

    const { unlockId, source: unlockResolveSource, pairMatchCount } = resolveUnlockId(
      xpRecord,
      sourceKey,
      enrollmentId,
      shotMilestoneId
    );

    if (!unlockId) {
      skip(pairMatchCount > 1 ? "ambiguous_unlock_match" : "unlock_not_found", {
        xpEventId: xpRecord.id,
        sourceKey,
        enrollmentId,
        shotMilestoneId,
        pairMatchCount: pairMatchCount || 0,
      });
      continue;
    }

    const unlock = unlockQuery.getRecord(unlockId);
    const { weekId: unlockWeekId, weekResolveSource, activityDateKey } = resolveWeekForUnlock(
      unlock,
      unlocksTable,
      weeksTable,
      weeksQuery.records
    );

    if (!unlockWeekId) {
      skip(activityDateKey ? "week_not_found_for_activity_date" : "unlock_missing_activity_date", {
        xpEventId: xpRecord.id,
        unlockId,
        sourceKey,
        activityDateKey: activityDateKey || "",
      });
      continue;
    }

    const needsUnlockWeek =
      WRITE_UNLOCK_WEEK &&
      weekResolveSource === "milestone_activity_date" &&
      !getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.week);

    const summaryIds = summaryIndex.get(buildSummaryIndexKey(enrollmentId, unlockWeekId)) || [];
    const unlockSummaryId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.weeklySummary);
    const weeklySummaryId =
      getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.weeklySummary) ||
      unlockSummaryId ||
      (summaryIds.length === 1 ? summaryIds[0] : "");

    if (summaryIds.length > 1 && !unlockSummaryId) {
      skip("ambiguous_weekly_summary", {
        xpEventId: xpRecord.id,
        enrollmentId,
        weekId: unlockWeekId,
        summaryIds,
      });
      continue;
    }

    const actions = ["link_week"];
    if (weeklySummaryId && !getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
      actions.push("link_was");
    }
    if (!getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.achievementUnlock)) {
      actions.push("link_achievement_unlock");
    }
    if (
      shotMilestoneId &&
      !getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.shotMilestones)
    ) {
      actions.push("link_shot_milestone");
    }
    if (enrollmentId !== getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment)) {
      actions.push("link_enrollment");
    }
    if (needsUnlockWeek) {
      actions.push("link_unlock_week");
    }

    candidates.push({
      xpEventId: xpRecord.id,
      name: xpRecord.name,
      sourceKey,
      unlockId,
      unlockResolveSource,
      weekResolveSource,
      activityDateKey: activityDateKey || "",
      enrollmentId,
      weekId: unlockWeekId,
      shotMilestoneId,
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
      if (row.actions.includes("link_achievement_unlock")) {
        addIfWritable(
          update,
          xpEventsTable,
          CONFIG.xpEvents.achievementUnlock,
          linkedCell([row.unlockId])
        );
      }
      if (row.actions.includes("link_shot_milestone")) {
        addIfWritable(
          update,
          xpEventsTable,
          CONFIG.xpEvents.shotMilestones,
          linkedCell([row.shotMilestoneId])
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

      if (Object.keys(update).length === 0) {
        skip("no_writable_changes", { xpEventId: row.xpEventId });
        continue;
      }

      if (!DRY_RUN && CONFIRM_WRITE) {
        await xpEventsTable.updateRecordAsync(row.xpEventId, update);

        if (row.actions.includes("link_unlock_week")) {
          const unlockUpdate = {};
          addIfWritable(
            unlockUpdate,
            unlocksTable,
            CONFIG.unlocks.week,
            linkedCell([row.weekId])
          );
          if (Object.keys(unlockUpdate).length > 0) {
            await unlocksTable.updateRecordAsync(row.unlockId, unlockUpdate);
          }
        }
      }

      applied.push({
        ...row,
        dryRun: DRY_RUN || !CONFIRM_WRITE,
        updateFields: Object.keys(update),
        unlockUpdate: row.actions.includes("link_unlock_week") ? ["Week"] : [],
      });
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

  console.log("===== BACKFILL SHOT MILESTONE XP WEEK AND WAS =====");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        dryRun: DRY_RUN,
        confirmWrite: CONFIRM_WRITE,
        writeUnlockWeek: WRITE_UNLOCK_WEEK,
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
