// @ts-nocheck

/*
Extension Script: Final Pre-Close 090C — Streaks / Milestones / Perfect Week XP
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity audit for awarded Athlete Achievement Unlocks (059) and
  Streak Occurrences (054) against XP Events, scoped to Active? enrollments only.
  Includes 090C-specific checks for unlock_empty_week and unlock_pending_with_xp.

Schema gate: 20260629_045741
Default: read-only (no writes)
*/

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-090c-streaks-milestones-perfect-week-xp",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    unlocks: "Athlete Achievement Unlocks",
    streakOccurrences: "Streak Occurrences",
    xpEvents: "XP Events",
  },

  enrollments: {
    active: "Active?",
  },

  unlocks: {
    enrollment: "Enrollment",
    week: "Week",
    shotMilestone: "Shot Milestone",
    sourceKey: "Source Key",
    milestoneSourceKey: "Milestone Source Key",
    xpAwardStatus: "XP Award Status",
    xpAwarded: "XP Awarded",
    xpEvents: "XP Events",
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
    xpPoints: "XP Points",
  },

  values: {
    unlockAwarded: "Awarded",
    unlockPending: "Pending",
    streakAwarded: "Awarded",
    perfectWeekPrefix: "PERFECT_WEEK|",
    shotMilestonePrefix: "SHOT_MILESTONE|",
    streakPrefix: "STREAK_XP|",
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Athlete Achievement Unlocks", "Enrollment"],
  ["Athlete Achievement Unlocks", "XP Award Status"],
  ["Athlete Achievement Unlocks", "XP Events"],
  ["Streak Occurrences", "Enrollment"],
  ["Streak Occurrences", "Source Status"],
  ["Streak Occurrences", "XP Events"],
  ["XP Events", "Source Key"],
  ["XP Events", "Achievement Unlock"],
  ["XP Events", "Streak Occurrence"],
  ["XP Events", "Enrollment"],
];

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
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
    if (!fieldExists(table, fieldName)) missing.push(`${tableName}.${fieldName}`);
  }
  if (missing.length) {
    throw new Error(`Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`);
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

function actionForIssue(issue) {
  if (
    issue === "unlock_missing_xp" ||
    issue === "unlock_source_key_mismatch" ||
    issue === "unlock_pending_with_xp" ||
    issue === "streak_missing_xp" ||
    issue === "streak_source_key_mismatch"
  ) {
    return "safe_auto_fix_later";
  }
  if (issue === "unlock_empty_week") return "needs_manual_review";
  if (issue === "unlock_duplicate_xp" || issue === "unlock_xp_points_mismatch") {
    return "needs_manual_review";
  }
  if (issue === "streak_duplicate_xp") return "needs_manual_review";
  return "needs_manual_review";
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const streakTable = base.getTable(CONFIG.tables.streakOccurrences);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  requireSchema({
    Enrollments: enrollmentsTable,
    "Athlete Achievement Unlocks": unlocksTable,
    "Streak Occurrences": streakTable,
    "XP Events": xpEventsTable,
  });

  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.active],
  });
  const activeEnrollmentIds = new Set();
  for (const enrollment of enrollmentQuery.records) {
    if (getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) {
      activeEnrollmentIds.add(enrollment.id);
    }
  }

  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));
  const streakFields = Object.values(CONFIG.streakOccurrences).filter(name =>
    fieldExists(streakTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [unlockQuery, streakQuery, xpQuery] = await Promise.all([
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
    streakTable.selectRecordsAsync({ fields: streakFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const issueCounts = {};
  const samples = {
    issues: [],
    excluded: [],
    clean: [],
  };

  function bump(key) {
    issueCounts[key] = (issueCounts[key] || 0) + 1;
  }

  function pushIssue(row) {
    bump(row.issue);
    if (samples.issues.length < SAMPLE_LIMIT) samples.issues.push(row);
  }

  function pushExcluded(row) {
    bump("excluded_not_ready");
    if (samples.excluded.length < SAMPLE_LIMIT) samples.excluded.push(row);
  }

  function pushClean(row) {
    bump("clean");
    if (samples.clean.length < Math.min(10, SAMPLE_LIMIT)) samples.clean.push(row);
  }

  let unlocksChecked = 0;
  let streaksChecked = 0;

  for (const unlockRecord of unlockQuery.records) {
    const enrollmentId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.enrollment);
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) continue;

    unlocksChecked += 1;

    const unlockId = unlockRecord.id;
    const awardStatus = getSelectName(unlockRecord, unlocksTable, CONFIG.unlocks.xpAwardStatus);
    const weekId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.week);
    const shotMilestoneId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.shotMilestone);
    const expectedKey = buildUnlockExpectedSourceKey(unlockRecord, unlocksTable);
    const linkedXpIds = getLinkedIds(unlockRecord, unlocksTable, CONFIG.unlocks.xpEvents);
    const keyXpIds = expectedKey ? xpBySourceKey.get(expectedKey) || [] : [];
    const xpIds = [...new Set([...linkedXpIds, ...keyXpIds])].filter(xpId => {
      const xp = xpQuery.getRecord(xpId);
      return xp && xpBelongsToUnlock(xp, xpEventsTable, unlockId, expectedKey);
    });
    const expectedXp = getNumberish(unlockRecord, unlocksTable, CONFIG.unlocks.xpAwarded);

    if (awardStatus === CONFIG.values.unlockPending && xpIds.length > 0) {
      pushIssue({
        entityType: "unlock",
        entityId: unlockId,
        enrollmentId,
        classification: "issue",
        issue: "unlock_pending_with_xp",
        xpAwardStatus: awardStatus,
        xpEventIds: xpIds,
        recommendedAction: actionForIssue("unlock_pending_with_xp"),
      });
      continue;
    }

    if (awardStatus !== CONFIG.values.unlockAwarded) {
      pushExcluded({
        entityType: "unlock",
        entityId: unlockId,
        enrollmentId,
        classification: "excluded",
        reason: "not_ready_unlock_not_awarded",
        xpAwardStatus: awardStatus,
      });
      continue;
    }

    if (!weekId && !shotMilestoneId) {
      pushIssue({
        entityType: "unlock",
        entityId: unlockId,
        enrollmentId,
        classification: "issue",
        issue: "unlock_empty_week",
        expectedSourceKey: expectedKey,
        recommendedAction: actionForIssue("unlock_empty_week"),
      });
      continue;
    }

    if (xpIds.length === 0) {
      pushIssue({
        entityType: "unlock",
        entityId: unlockId,
        enrollmentId,
        classification: "issue",
        issue: "unlock_missing_xp",
        expectedSourceKey: expectedKey,
        recommendedAction: actionForIssue("unlock_missing_xp"),
      });
      continue;
    }

    if (xpIds.length > 1) {
      pushIssue({
        entityType: "unlock",
        entityId: unlockId,
        enrollmentId,
        classification: "issue",
        issue: "unlock_duplicate_xp",
        xpEventIds: xpIds,
        recommendedAction: actionForIssue("unlock_duplicate_xp"),
      });
      continue;
    }

    const primaryXp = xpQuery.getRecord(xpIds[0]);
    const primarySourceKey = getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const primaryPoints = getNumberish(primaryXp, xpEventsTable, CONFIG.xpEvents.xpPoints);

    if (expectedKey && primarySourceKey !== expectedKey) {
      pushIssue({
        entityType: "unlock",
        entityId: unlockId,
        enrollmentId,
        classification: "issue",
        issue: "unlock_source_key_mismatch",
        expectedSourceKey: expectedKey,
        actualSourceKey: primarySourceKey,
        xpEventId: primaryXp.id,
        recommendedAction: actionForIssue("unlock_source_key_mismatch"),
      });
      continue;
    }

    if (expectedXp > 0 && primaryPoints !== expectedXp) {
      pushIssue({
        entityType: "unlock",
        entityId: unlockId,
        enrollmentId,
        classification: "issue",
        issue: "unlock_xp_points_mismatch",
        expectedXp,
        xpEventPoints: primaryPoints,
        xpEventId: primaryXp.id,
        recommendedAction: actionForIssue("unlock_xp_points_mismatch"),
      });
      continue;
    }

    pushClean({
      entityType: "unlock",
      entityId: unlockId,
      enrollmentId,
      classification: "clean",
      xpEventId: primaryXp.id,
    });
  }

  for (const occurrenceRecord of streakQuery.records) {
    const enrollmentId = getFirstLinkedId(
      occurrenceRecord,
      streakTable,
      CONFIG.streakOccurrences.enrollment
    );
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) continue;

    streaksChecked += 1;

    const occurrenceId = occurrenceRecord.id;
    const sourceStatus = getSelectName(occurrenceRecord, streakTable, CONFIG.streakOccurrences.sourceStatus);
    const expectedKey = buildStreakExpectedSourceKey(occurrenceRecord, streakTable);
    const linkedXpIds = getLinkedIds(occurrenceRecord, streakTable, CONFIG.streakOccurrences.xpEvents);
    const keyXpIds = expectedKey ? xpBySourceKey.get(expectedKey) || [] : [];
    const xpIds = [...new Set([...linkedXpIds, ...keyXpIds])].filter(xpId => {
      const xp = xpQuery.getRecord(xpId);
      return xp && xpBelongsToStreak(xp, xpEventsTable, occurrenceId, expectedKey);
    });

    if (sourceStatus !== CONFIG.values.streakAwarded) {
      pushExcluded({
        entityType: "streak",
        entityId: occurrenceId,
        enrollmentId,
        classification: "excluded",
        reason: "not_ready_streak_not_awarded",
        sourceStatus,
      });
      continue;
    }

    if (xpIds.length === 0) {
      pushIssue({
        entityType: "streak",
        entityId: occurrenceId,
        enrollmentId,
        classification: "issue",
        issue: "streak_missing_xp",
        expectedSourceKey: expectedKey,
        recommendedAction: actionForIssue("streak_missing_xp"),
      });
      continue;
    }

    if (xpIds.length > 1) {
      pushIssue({
        entityType: "streak",
        entityId: occurrenceId,
        enrollmentId,
        classification: "issue",
        issue: "streak_duplicate_xp",
        xpEventIds: xpIds,
        recommendedAction: actionForIssue("streak_duplicate_xp"),
      });
      continue;
    }

    const primaryXp = xpQuery.getRecord(xpIds[0]);
    const primarySourceKey = getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (expectedKey && primarySourceKey !== expectedKey) {
      pushIssue({
        entityType: "streak",
        entityId: occurrenceId,
        enrollmentId,
        classification: "issue",
        issue: "streak_source_key_mismatch",
        expectedSourceKey: expectedKey,
        actualSourceKey: primarySourceKey,
        xpEventId: primaryXp.id,
        recommendedAction: actionForIssue("streak_source_key_mismatch"),
      });
      continue;
    }

    pushClean({
      entityType: "streak",
      entityId: occurrenceId,
      enrollmentId,
      classification: "clean",
      xpEventId: primaryXp.id,
    });
  }

  const issueTotal = Object.entries(issueCounts)
    .filter(([key]) => key !== "clean" && key !== "excluded_not_ready")
    .reduce((sum, [, count]) => sum + count, 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    scope: "Active? enrollments only",
    activeEnrollmentCount: activeEnrollmentIds.size,
    unlocksChecked,
    streaksChecked,
    cleanCount: issueCounts.clean || 0,
    excludedNotReadyCount: issueCounts.excluded_not_ready || 0,
    issueTotal,
    issueCounts,
    samples,
  };

  console.log("===== FINAL 090C — STREAKS / MILESTONES / PERFECT WEEK XP =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
