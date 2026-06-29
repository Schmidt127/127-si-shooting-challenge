/*
Extension Script: Final Pre-Close 090F - Athlete Achievement Unlocks Workflow
System: 127 SI Shooting Challenge
Purpose:
  Read-only workflow audit for Athlete Achievement Unlocks scoped to Active? enrollments.
  Checks:
  - missing enrollment / achievement links
  - empty week link classification (shot milestone vs perfect week vs other)
  - XP awarded status parity (missing XP, duplicate XP, XP points mismatch)
  - duplicate unlock-key patterns (Milestone Source Key and enrollment+achievement+week)
  - Week 9 cohort root-cause hypotheses

Reference:
  - 066 does not write Week on shot milestone unlocks.
  - 058 writes Week for perfect-week unlocks.

Schema gate: 20260629_045741
Version: v1.0
Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-090f-athlete-achievement-unlocks-workflow",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    unlocks: "Athlete Achievement Unlocks",
    xpEvents: "XP Events",
  },

  enrollments: {
    active: "Active?",
  },

  unlocks: {
    enrollment: "Enrollment",
    achievement: "Achievement",
    week: "Week",
    shotMilestone: "Shot Milestone",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
    milestoneSourceKey: "Milestone Source Key",
    milestoneActivityDate: "Milestone Activity Date",
    dateUnlocked: "Date Unlocked", // optional schema field
    notesCandidates: ["Notes", "Reason Debug", "Reason Public"],
  },

  xpEvents: {
    xpPoints: "XP Points",
  },

  values: {
    awarded: "Awarded",
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Athlete Achievement Unlocks", "Enrollment"],
  ["Athlete Achievement Unlocks", "Achievement"],
  ["Athlete Achievement Unlocks", "Week"],
  ["Athlete Achievement Unlocks", "Shot Milestone"],
  ["Athlete Achievement Unlocks", "XP Award Status"],
  ["Athlete Achievement Unlocks", "XP Events"],
  ["Athlete Achievement Unlocks", "Milestone Source Key"],
  ["Athlete Achievement Unlocks", "Milestone Activity Date"],
  ["XP Events", "XP Points"],
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
    throw new Error(
      `Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`
    );
  }
}

function getText(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function getBooleanish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getNumberish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(
    String(record.getCellValueAsString(fieldName) || "").replace(/,/g, "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function equalsIgnoreCase(left, right) {
  return normalizeText(left) === normalizeText(right);
}

function bump(issueCounts, issueKey) {
  issueCounts[issueKey] = (issueCounts[issueKey] || 0) + 1;
}

function pushSample(samples, issueKey, row) {
  if (!samples[issueKey]) samples[issueKey] = [];
  if (samples[issueKey].length < SAMPLE_LIMIT) {
    samples[issueKey].push(row);
  }
}

function classifyEmptyWeekReason({ hasShotMilestone, achievementName, sourceKey }) {
  if (hasShotMilestone) return "shot_milestone";

  const achievement = normalizeText(achievementName);
  const key = normalizeText(sourceKey);
  if (
    achievement.includes("perfect week") ||
    key.includes("perfect_week") ||
    key.includes("perfect week")
  ) {
    return "perfect_week";
  }

  return "other";
}

function buildEnrollmentAchievementWeekKey(enrollmentId, achievementId, weekId) {
  return `${enrollmentId || "NONE"}|${achievementId || "NONE"}|${weekId || "NONE"}`;
}

function pickNotesField(unlocksTable) {
  for (const candidate of CONFIG.unlocks.notesCandidates) {
    if (fieldExists(unlocksTable, candidate)) return candidate;
  }
  return "";
}

function isWeek9Label(weekLabel) {
  const normalized = normalizeText(weekLabel);
  if (!normalized) return false;

  if (normalized.includes("week 9")) return true;
  if (normalized.includes("wk 9")) return true;
  if (normalized.includes("w9")) return true;

  return /\b9\b/.test(normalized);
}

function hasWeek9Hint(value) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return (
    normalized.includes("week 9") ||
    normalized.includes("wk 9") ||
    normalized.includes("|9|") ||
    /\b9\b/.test(normalized)
  );
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  requireSchema({
    Enrollments: enrollmentsTable,
    "Athlete Achievement Unlocks": unlocksTable,
    "XP Events": xpEventsTable,
  });

  const hasDateUnlockedField = fieldExists(unlocksTable, CONFIG.unlocks.dateUnlocked);
  const notesField = pickNotesField(unlocksTable);

  const enrollmentFields = [CONFIG.enrollments.active].filter(name =>
    fieldExists(enrollmentsTable, name)
  );

  const unlockFields = [
    CONFIG.unlocks.enrollment,
    CONFIG.unlocks.achievement,
    CONFIG.unlocks.week,
    CONFIG.unlocks.shotMilestone,
    CONFIG.unlocks.xpAwardStatus,
    CONFIG.unlocks.xpEvents,
    CONFIG.unlocks.milestoneSourceKey,
    CONFIG.unlocks.milestoneActivityDate,
    hasDateUnlockedField ? CONFIG.unlocks.dateUnlocked : "",
    notesField,
  ].filter(Boolean).filter(name => fieldExists(unlocksTable, name));

  const xpFields = [CONFIG.xpEvents.xpPoints].filter(name => fieldExists(xpEventsTable, name));

  const [enrollmentQuery, unlockQuery, xpQuery] = await Promise.all([
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
  ]);

  const activeEnrollmentIds = new Set();
  for (const enrollmentRecord of enrollmentQuery.records) {
    if (getBooleanish(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.active)) {
      activeEnrollmentIds.add(enrollmentRecord.id);
    }
  }

  const xpById = new Map(xpQuery.records.map(record => [record.id, record]));

  const issueCounts = {};
  const issuesSample = {};
  const week9CohortSample = [];
  const week9RootCause = {
    totalWeek9Cohort: 0,
    rankedHypotheses: {
      "066_no_week_write": 0,
      manual_correction: 0,
      other: 0,
    },
  };

  const unlockIdsByMilestoneSourceKey = new Map();
  const unlockIdsByEnrollmentAchievementWeek = new Map();

  let scopedUnlockCount = 0;

  for (const unlockRecord of unlockQuery.records) {
    const unlockId = unlockRecord.id;
    const enrollmentId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.enrollment);
    const achievementId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.achievement);
    const achievementName = getText(unlockRecord, unlocksTable, CONFIG.unlocks.achievement);
    const weekId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.week);
    const weekLabel = getText(unlockRecord, unlocksTable, CONFIG.unlocks.week);
    const shotMilestoneId = getFirstLinkedId(unlockRecord, unlocksTable, CONFIG.unlocks.shotMilestone);
    const sourceKey = getText(unlockRecord, unlocksTable, CONFIG.unlocks.milestoneSourceKey);
    const xpAwardStatus = getText(unlockRecord, unlocksTable, CONFIG.unlocks.xpAwardStatus);
    const notesText = notesField ? getText(unlockRecord, unlocksTable, notesField) : "";
    const linkedXpIds = getLinkedIds(unlockRecord, unlocksTable, CONFIG.unlocks.xpEvents);

    const inScope = !enrollmentId || activeEnrollmentIds.has(enrollmentId);
    if (!inScope) continue;

    scopedUnlockCount += 1;

    if (!enrollmentId) {
      bump(issueCounts, "missing_enrollment");
      pushSample(issuesSample, "missing_enrollment", {
        unlockId,
        achievementId,
        achievementName,
        sourceKey,
      });
    }

    if (!achievementId) {
      bump(issueCounts, "missing_achievement");
      pushSample(issuesSample, "missing_achievement", {
        unlockId,
        enrollmentId,
        sourceKey,
      });
    }

    if (!weekId) {
      const emptyWeekCategory = classifyEmptyWeekReason({
        hasShotMilestone: Boolean(shotMilestoneId),
        achievementName,
        sourceKey,
      });
      bump(issueCounts, "empty_week");
      bump(issueCounts, `empty_week_${emptyWeekCategory}`);
      pushSample(issuesSample, "empty_week", {
        unlockId,
        enrollmentId,
        achievementId,
        achievementName,
        sourceKey,
        emptyWeekCategory,
        hasShotMilestone: Boolean(shotMilestoneId),
      });
    }

    const awarded = equalsIgnoreCase(xpAwardStatus, CONFIG.values.awarded);

    if (awarded && linkedXpIds.length === 0) {
      bump(issueCounts, "missing_xp");
      pushSample(issuesSample, "missing_xp", {
        unlockId,
        enrollmentId,
        achievementId,
        xpAwardStatus,
        sourceKey,
      });
    }

    if (awarded && linkedXpIds.length > 1) {
      bump(issueCounts, "duplicate_xp");
      pushSample(issuesSample, "duplicate_xp", {
        unlockId,
        enrollmentId,
        achievementId,
        xpAwardStatus,
        xpEventIds: linkedXpIds,
      });
    }

    if (awarded && linkedXpIds.length > 1) {
      const xpPoints = linkedXpIds.map(xpId => {
        const xpRecord = xpById.get(xpId);
        return xpRecord ? getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints) : 0;
      });
      const uniquePoints = [...new Set(xpPoints)];
      if (uniquePoints.length > 1) {
        bump(issueCounts, "xp_points_mismatch");
        pushSample(issuesSample, "xp_points_mismatch", {
          unlockId,
          enrollmentId,
          achievementId,
          xpEventIds: linkedXpIds,
          xpPoints,
          uniquePoints,
        });
      }
    }

    if (sourceKey) {
      if (!unlockIdsByMilestoneSourceKey.has(sourceKey)) {
        unlockIdsByMilestoneSourceKey.set(sourceKey, []);
      }
      unlockIdsByMilestoneSourceKey.get(sourceKey).push(unlockId);
    }

    if (enrollmentId && achievementId) {
      const comboKey = buildEnrollmentAchievementWeekKey(enrollmentId, achievementId, weekId);
      if (!unlockIdsByEnrollmentAchievementWeek.has(comboKey)) {
        unlockIdsByEnrollmentAchievementWeek.set(comboKey, []);
      }
      unlockIdsByEnrollmentAchievementWeek.get(comboKey).push(unlockId);
    }

    const week9ByWeekLink = weekId && isWeek9Label(weekLabel);
    const week9ByNoWeekHint =
      !weekId &&
      Boolean(shotMilestoneId) &&
      (hasWeek9Hint(achievementName) || hasWeek9Hint(sourceKey));
    const inWeek9Cohort = week9ByWeekLink || week9ByNoWeekHint;
    if (inWeek9Cohort) {
      week9RootCause.totalWeek9Cohort += 1;

      const notesNormalized = normalizeText(notesText);
      const hasManualInNotes =
        notesNormalized.includes("manual") ||
        notesNormalized.includes("backfill") ||
        notesNormalized.includes("hand fix");

      let rootCause = "other";
      if (shotMilestoneId && !weekId) {
        rootCause = "066_no_week_write";
      } else if (weekId && hasManualInNotes) {
        rootCause = "manual_correction";
      } else {
        rootCause = "other";
      }

      week9RootCause.rankedHypotheses[rootCause] += 1;

      if (week9CohortSample.length < SAMPLE_LIMIT) {
        week9CohortSample.push({
          unlockId,
          enrollmentId,
          achievementId,
          achievementName,
          weekLabel,
          sourceKey,
          hasShotMilestone: Boolean(shotMilestoneId),
          week9ByWeekLink,
          week9ByNoWeekHint,
          notesFieldUsed: notesField || null,
          notesText: notesText || "",
          rootCause,
        });
      }
    }
  }

  for (const [sourceKey, unlockIds] of unlockIdsByMilestoneSourceKey.entries()) {
    if (unlockIds.length <= 1) continue;
    bump(issueCounts, "duplicate_unlock_key_source_key");
    pushSample(issuesSample, "duplicate_unlock_key_source_key", {
      sourceKey,
      duplicateCount: unlockIds.length,
      unlockIds,
    });
  }

  for (const [comboKey, unlockIds] of unlockIdsByEnrollmentAchievementWeek.entries()) {
    if (unlockIds.length <= 1) continue;
    bump(issueCounts, "duplicate_unlock_key_enrollment_achievement_week");
    pushSample(issuesSample, "duplicate_unlock_key_enrollment_achievement_week", {
      comboKey,
      duplicateCount: unlockIds.length,
      unlockIds,
    });
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    scope: "Active? enrollments plus missing-enrollment unlocks",
    dateUnlockedFieldPresent: hasDateUnlockedField,
    notesFieldUsed: notesField || null,
    activeEnrollmentCount: activeEnrollmentIds.size,
    scopedUnlockCount,
    issueCounts,
    issuesSample,
    week9CohortSample,
    week9RootCause,
    recommendedAutomationFix:
      "Automation 066 should write Week on shot-milestone unlocks (match 058 pattern where Week is explicitly set).",
  };

  console.log("===== FINAL 090F - ATHLETE ACHIEVEMENT UNLOCKS WORKFLOW =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
