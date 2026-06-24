/*
Extension Script: Audit Achievement XP Pipeline Integrity
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity check for awarded achievement unlocks (059) and streak
  occurrences (054) vs XP Events: missing XP, duplicates, Source Key drift,
  points mismatch, and missing Weekly Athlete Summary on XP.

Default: read-only (no writes)

Recommended follow-up:
  Re-run 059 / 054 on stuck rows, or build backfill scripts after audit is clean.
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const CONFIG = {
  scriptName: "audit-achievement-xp-pipeline-integrity",
  version: "v1.0",

  tables: {
    unlocks: "Athlete Achievement Unlocks",
    streakOccurrences: "Streak Occurrences",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  unlocks: {
    achievement: "Achievement",
    enrollment: "Enrollment",
    week: "Week",
    shotMilestone: "Shot Milestone",
    sourceKey: "Source Key",
    milestoneSourceKey: "Milestone Source Key",
    xpAwardStatus: "XP Award Status",
    xpAwarded: "XP Awarded",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  streakOccurrences: {
    enrollment: "Enrollment",
    achievement: "Achievement",
    week: "Week",
    streakEndDate: "Streak End Date",
    sourceStatus: "Source Status",
    xpEvents: "XP Events",
    occurrenceKey: "Streak Occurrence Key",
  },

  xpEvents: {
    sourceKey: "Source Key",
    achievementUnlock: "Achievement Unlock",
    streakOccurrence: "Streak Occurrence",
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpPoints: "XP Points",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    unlockAwarded: "Awarded",
    streakAwarded: "Awarded",
    perfectWeekPrefix: "PERFECT_WEEK|",
    shotMilestonePrefix: "SHOT_MILESTONE|",
    streakPrefix: "STREAK_XP|",
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

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
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

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function pushSample(bucket, row) {
  if (bucket.length < SAMPLE_LIMIT) bucket.push(row);
}

function buildUnlockExpectedSourceKey(unlockRecord, unlocksTable) {
  const stored =
    getText(unlockRecord, unlocksTable, CONFIG.unlocks.sourceKey) ||
    getText(unlockRecord, unlocksTable, CONFIG.unlocks.milestoneSourceKey);
  if (stored) return stored;

  const enrollmentId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.enrollment);
  const shotMilestoneId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.shotMilestone);
  const weekId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.week);

  if (enrollmentId && shotMilestoneId) {
    return `${CONFIG.values.shotMilestonePrefix}${enrollmentId}|${shotMilestoneId}`;
  }
  if (enrollmentId && weekId) {
    return `${CONFIG.values.perfectWeekPrefix}${enrollmentId}|${weekId}`;
  }
  return "";
}

function buildStreakExpectedSourceKey(occurrenceRecord, streakTable) {
  const enrollmentId = getFirstLinkedId(
    occurrenceRecord,
    streakTable,
    CONFIG.streakOccurrences.enrollment
  );
  const achievementId = getFirstLinkedId(
    occurrenceRecord,
    streakTable,
    CONFIG.streakOccurrences.achievement
  );
  const streakEndDateKey = toDateKey(
    fieldExists(streakTable, CONFIG.streakOccurrences.streakEndDate)
      ? occurrenceRecord.getCellValue(CONFIG.streakOccurrences.streakEndDate)
      : null
  );

  if (!enrollmentId || !achievementId || !streakEndDateKey) return "";
  return `${CONFIG.values.streakPrefix}${enrollmentId}|${achievementId}|${streakEndDateKey}`;
}

function xpBelongsToUnlock(xpRecord, xpEventsTable, unlockId, expectedKey) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  if (expectedKey && sourceKey === expectedKey) return true;
  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.achievementUnlock).includes(unlockId);
}

function xpBelongsToStreak(xpRecord, xpEventsTable, occurrenceId, expectedKey) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  if (expectedKey && sourceKey === expectedKey) return true;
  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.streakOccurrence).includes(
    occurrenceId
  );
}

function getXpIdsForSourceKey(expectedKey, xpBySourceKey) {
  return expectedKey ? xpBySourceKey.get(expectedKey) || [] : [];
}

function resolveWeeklySummaryId({ sourceWeeklySummaryIds, enrollmentId, weekId, summaryIndex }) {
  if (sourceWeeklySummaryIds.length === 1) return sourceWeeklySummaryIds[0];
  if (!enrollmentId || !weekId) return "";
  return summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || "";
}

async function main() {
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const streakTable = base.getTable(CONFIG.tables.streakOccurrences);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));
  const streakFields = Object.values(CONFIG.streakOccurrences).filter(name =>
    fieldExists(streakTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [unlockQuery, streakQuery, xpQuery, summaryQuery] = await Promise.all([
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
    streakTable.selectRecordsAsync({ fields: streakFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    const weekId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week);
    if (!enrollmentId || !weekId) continue;
    summaryIndex.set(buildSummaryIndexKey(enrollmentId, weekId), summary.id);
  }

  const issueCounts = {};
  const buckets = {
    unlock_ok: [],
    unlock_not_ready: [],
    unlock_missing_xp: [],
    unlock_duplicate_xp: [],
    unlock_source_key_mismatch: [],
    unlock_xp_points_mismatch: [],
    unlock_missing_was_on_xp: [],
    streak_ok: [],
    streak_not_ready: [],
    streak_missing_xp: [],
    streak_duplicate_xp: [],
    streak_source_key_mismatch: [],
    streak_missing_was_on_xp: [],
  };

  function recordIssue(issue) {
    bump(issueCounts, issue);
  }

  for (const unlockRecord of unlockQuery.records) {
    const unlockId = unlockRecord.id;
    const awardStatus = getSelectName(unlockRecord, unlocksTable, CONFIG.unlocks.xpAwardStatus);

    if (awardStatus !== CONFIG.values.unlockAwarded) {
      recordIssue("unlock_not_ready");
      pushSample(buckets.unlock_not_ready, {
        unlockId,
        name: unlockRecord.name,
        xpAwardStatus: awardStatus,
      });
      continue;
    }

    const expectedKey = buildUnlockExpectedSourceKey(unlockRecord, unlocksTable);
    const linkedXpIds = getLinkedIds(unlockRecord, unlocksTable, CONFIG.unlocks.xpEvents);
    const keyXpIds = getXpIdsForSourceKey(expectedKey, xpBySourceKey);
    const xpIds = [...new Set([...linkedXpIds, ...keyXpIds])].filter(xpId => {
      const xp = xpQuery.getRecord(xpId);
      return xp && xpBelongsToUnlock(xp, xpEventsTable, unlockId, expectedKey);
    });

    const expectedXp = getNumberish(unlockRecord, unlocksTable, CONFIG.unlocks.xpAwarded);
    const enrollmentId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.enrollment);
    const weekId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.week);
    const unlockWasIds = getLinkedIds(unlockRecord, unlocksTable, CONFIG.unlocks.weeklySummary);
    const weeklySummaryId = resolveWeeklySummaryId({
      sourceWeeklySummaryIds: unlockWasIds,
      enrollmentId,
      weekId,
      summaryIndex,
    });

    let hasIssue = false;

    if (xpIds.length === 0) {
      recordIssue("unlock_missing_xp");
      pushSample(buckets.unlock_missing_xp, {
        unlockId,
        name: unlockRecord.name,
        expectedSourceKey: expectedKey,
        expectedXp,
        recommendedAction: "Re-run 059 or build achievement XP backfill",
      });
      continue;
    }

    if (xpIds.length > 1) {
      recordIssue("unlock_duplicate_xp");
      pushSample(buckets.unlock_duplicate_xp, {
        unlockId,
        name: unlockRecord.name,
        xpEventIds: xpIds,
      });
      hasIssue = true;
    }

    const primaryXpId = xpIds[0];
    const primaryXp = xpQuery.getRecord(primaryXpId);
    const primarySourceKey = getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const primaryPoints = getNumberish(primaryXp, xpEventsTable, CONFIG.xpEvents.xpPoints);
    const primaryWasId = getFirstLinkedId(primaryXp, xpEventsTable, CONFIG.xpEvents.weeklySummary);

    if (expectedKey && primarySourceKey !== expectedKey) {
      recordIssue("unlock_source_key_mismatch");
      pushSample(buckets.unlock_source_key_mismatch, {
        unlockId,
        name: unlockRecord.name,
        xpEventId: primaryXpId,
        expectedSourceKey: expectedKey,
        actualSourceKey: primarySourceKey,
      });
      hasIssue = true;
    }

    if (expectedXp > 0 && primaryPoints !== expectedXp) {
      recordIssue("unlock_xp_points_mismatch");
      pushSample(buckets.unlock_xp_points_mismatch, {
        unlockId,
        name: unlockRecord.name,
        xpEventId: primaryXpId,
        expectedXp,
        xpEventPoints: primaryPoints,
      });
      hasIssue = true;
    }

    if (weeklySummaryId && !primaryWasId) {
      recordIssue("unlock_missing_was_on_xp");
      pushSample(buckets.unlock_missing_was_on_xp, {
        unlockId,
        name: unlockRecord.name,
        xpEventId: primaryXpId,
        expectedWeeklySummaryId: weeklySummaryId,
      });
      hasIssue = true;
    }

    if (!hasIssue) {
      recordIssue("unlock_ok");
      if (buckets.unlock_ok.length < 5) {
        pushSample(buckets.unlock_ok, { unlockId, name: unlockRecord.name, xpEventId: primaryXpId });
      }
    }
  }

  for (const occurrenceRecord of streakQuery.records) {
    const occurrenceId = occurrenceRecord.id;
    const sourceStatus = getSelectName(
      occurrenceRecord,
      streakTable,
      CONFIG.streakOccurrences.sourceStatus
    );

    if (sourceStatus !== CONFIG.values.streakAwarded) {
      recordIssue("streak_not_ready");
      pushSample(buckets.streak_not_ready, {
        occurrenceId,
        name: occurrenceRecord.name,
        sourceStatus,
      });
      continue;
    }

    const expectedKey = buildStreakExpectedSourceKey(occurrenceRecord, streakTable);
    const linkedXpIds = getLinkedIds(occurrenceRecord, streakTable, CONFIG.streakOccurrences.xpEvents);
    const keyXpIds = getXpIdsForSourceKey(expectedKey, xpBySourceKey);
    const xpIds = [...new Set([...linkedXpIds, ...keyXpIds])].filter(xpId => {
      const xp = xpQuery.getRecord(xpId);
      return xp && xpBelongsToStreak(xp, xpEventsTable, occurrenceId, expectedKey);
    });

    const enrollmentId = getFirstLinkedId(
      occurrenceRecord,
      streakTable,
      CONFIG.streakOccurrences.enrollment
    );
    const weekId = getFirstLinkedId(occurrenceRecord, streakTable, CONFIG.streakOccurrences.week);
    const weeklySummaryId = resolveWeeklySummaryId({
      sourceWeeklySummaryIds: [],
      enrollmentId,
      weekId,
      summaryIndex,
    });

    let hasIssue = false;

    if (xpIds.length === 0) {
      recordIssue("streak_missing_xp");
      pushSample(buckets.streak_missing_xp, {
        occurrenceId,
        name: occurrenceRecord.name,
        expectedSourceKey: expectedKey,
        recommendedAction: "Re-run 054 or build streak XP backfill",
      });
      continue;
    }

    if (xpIds.length > 1) {
      recordIssue("streak_duplicate_xp");
      pushSample(buckets.streak_duplicate_xp, {
        occurrenceId,
        name: occurrenceRecord.name,
        xpEventIds: xpIds,
      });
      hasIssue = true;
    }

    const primaryXpId = xpIds[0];
    const primaryXp = xpQuery.getRecord(primaryXpId);
    const primarySourceKey = getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const primaryWasId = getFirstLinkedId(primaryXp, xpEventsTable, CONFIG.xpEvents.weeklySummary);

    if (expectedKey && primarySourceKey !== expectedKey) {
      recordIssue("streak_source_key_mismatch");
      pushSample(buckets.streak_source_key_mismatch, {
        occurrenceId,
        name: occurrenceRecord.name,
        xpEventId: primaryXpId,
        expectedSourceKey: expectedKey,
        actualSourceKey: primarySourceKey,
      });
      hasIssue = true;
    }

    if (weeklySummaryId && !primaryWasId) {
      recordIssue("streak_missing_was_on_xp");
      pushSample(buckets.streak_missing_was_on_xp, {
        occurrenceId,
        name: occurrenceRecord.name,
        xpEventId: primaryXpId,
        expectedWeeklySummaryId: weeklySummaryId,
      });
      hasIssue = true;
    }

    if (!hasIssue) {
      recordIssue("streak_ok");
      if (buckets.streak_ok.length < 5) {
        pushSample(buckets.streak_ok, {
          occurrenceId,
          name: occurrenceRecord.name,
          xpEventId: primaryXpId,
        });
      }
    }
  }

  const repairIssues = Object.entries(issueCounts).filter(
    ([issue]) => !issue.endsWith("_ok") && !issue.endsWith("_not_ready")
  );
  const issueTotal = repairIssues.reduce((sum, [, count]) => sum + count, 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    unlocksChecked: unlockQuery.records.length,
    streakOccurrencesChecked: streakQuery.records.length,
    unlockOkCount: issueCounts.unlock_ok || 0,
    streakOkCount: issueCounts.streak_ok || 0,
    issueTotal,
    issueCounts,
    unlockMissingXpSample: buckets.unlock_missing_xp,
    unlockDuplicateXpSample: buckets.unlock_duplicate_xp,
    unlockSourceKeyMismatchSample: buckets.unlock_source_key_mismatch,
    unlockXpPointsMismatchSample: buckets.unlock_xp_points_mismatch,
    unlockMissingWasSample: buckets.unlock_missing_was_on_xp,
    streakMissingXpSample: buckets.streak_missing_xp,
    streakDuplicateXpSample: buckets.streak_duplicate_xp,
    streakSourceKeyMismatchSample: buckets.streak_source_key_mismatch,
    streakMissingWasSample: buckets.streak_missing_was_on_xp,
    unlockNotReadySample: buckets.unlock_not_ready,
    streakNotReadySample: buckets.streak_not_ready,
    unlockOkSample: buckets.unlock_ok,
    streakOkSample: buckets.streak_ok,
  };

  console.log("===== ACHIEVEMENT XP PIPELINE INTEGRITY AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
