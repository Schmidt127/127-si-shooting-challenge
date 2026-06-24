/*
Extension Script: Backfill Shot Milestone Unlock Mark Awarded (059 repair)
System: 127 SI Shooting Challenge
Purpose:
  Repairs Athlete Achievement Unlock rows stuck at XP Award Status = Pending when
  an XP Event is already linked - the state 059 leaves if XP is created but the
  final unlock update fails.

  Mirrors 059 v3.5 action existing_linked_xp_event:
  - Mark XP Award Status = Awarded
  - Set XP Awarded from linked XP points
  - Ensure XP unlock and WAS links are consistent
  - Does NOT create duplicate XP

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE = true to apply
  - BATCH_LIMIT = 25; re-run until remainingCount is 0

Setup:
  - Run audit-pending-shot-milestone-unlocks.js
  - Run this script with DRY_RUN = true
  - Set CONFIRM_WRITE = true and re-run until remainingCount is 0
  - Re-run audit-achievement-xp-pipeline-integrity.js
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const DEBUG_UNLOCK_ID = "";

const CONFIG = {
  scriptName: "backfill-shot-milestone-unlock-mark-awarded",
  version: "v1.1",

  tables: {
    unlocks: "Athlete Achievement Unlocks",
    achievements: "Achievements",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  unlocks: {
    achievement: "Achievement",
    enrollment: "Enrollment",
    week: "Week",
    shotMilestone: "Shot Milestone",
    xpEvents: "XP Events",
    xpAwardStatus: "XP Award Status",
    xpAwarded: "XP Awarded",
    weeklySummary: "Weekly Athlete Summary",
    milestoneSourceKey: "Milestone Source Key",
    notes: "Notes",
  },

  achievements: {
    rewardRuleKey: "Reward Rule Key",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    achievementUnlock: "Achievement Unlock",
    shotMilestones: "Shot Milestones",
    sourceKey: "Source Key",
    xpPoints: "XP Points",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    pending: "Pending",
    awarded: "Awarded",
    shotMilestoneRule: "SHOT_MILESTONE",
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

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw.name) return String(raw.name).trim();
  return "";
}

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = Number(getText(record, table, fieldName).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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

function buildCellValueForField(table, fieldName, value) {
  const field = table.getField(fieldName);
  if (field.type === "singleSelect") return { name: value };
  return value;
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function buildShotMilestoneSourceKey(enrollmentId, shotMilestoneId, fallbackKey) {
  if (fallbackKey) return fallbackKey;
  if (!enrollmentId || !shotMilestoneId) return "";
  return `${CONFIG.values.sourceKeyPrefix}${enrollmentId}|${shotMilestoneId}`;
}

function addIfWritable(update, table, fieldName, value) {
  if (value === undefined || value === null) return;
  if (!fieldName || !isWritableField(table, fieldName)) return;
  if (Array.isArray(value) && value.length === 0) return;
  update[fieldName] = value;
}

function resolveWeeklySummaryId({ sourceWeeklySummaryIds, enrollmentId, weekId, summaryIndex }) {
  const uniqueSummaryIds = [...new Set((sourceWeeklySummaryIds || []).filter(Boolean))];
  if (uniqueSummaryIds.length === 1) return uniqueSummaryIds[0];
  if (uniqueSummaryIds.length > 1) {
    throw new Error(`Ambiguous Weekly Athlete Summary links: ${uniqueSummaryIds.join(", ")}`);
  }
  if (!enrollmentId || !weekId) return "";
  return summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || "";
}

function pickPrimaryXpId(unlock, unlocksTable, xpQuery, xpEventsTable, expectedSourceKey) {
  const linkedXpIds = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.xpEvents);
  const unlockId = unlock.id;

  const scored = [];

  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (!xp) continue;

    let score = 0;
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const unlockLinkId = getFirstLinkedId(xp, xpEventsTable, CONFIG.xpEvents.achievementUnlock);

    if (expectedSourceKey && sourceKey === expectedSourceKey) score += 10;
    if (unlockLinkId === unlockId) score += 5;
    if (sourceKey.startsWith(CONFIG.values.sourceKeyPrefix)) score += 2;

    scored.push({ xpId, score, sourceKey });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0] || { xpId: "", score: 0, sourceKey: "" };
}

async function main() {
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const achievementsTable = base.getTable(CONFIG.tables.achievements);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));
  const achievementFields = Object.values(CONFIG.achievements).filter(name =>
    fieldExists(achievementsTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [unlockQuery, achievementQuery, xpQuery, summaryQuery] = await Promise.all([
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
    achievementsTable.selectRecordsAsync({ fields: achievementFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const achievementRuleById = new Map();
  for (const achievement of achievementQuery.records) {
    achievementRuleById.set(
      achievement.id,
      getText(achievement, achievementsTable, CONFIG.achievements.rewardRuleKey)
    );
  }

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    const weekId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week);
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, summary.id);
  }

  const candidates = [];
  const skipped = [];
  const skipCounts = {};

  function skip(reason, row) {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
    if (skipped.length < 15) skipped.push({ reason, ...row });
  }

  for (const unlock of unlockQuery.records) {
    if (DEBUG_UNLOCK_ID && unlock.id !== DEBUG_UNLOCK_ID) continue;

    const awardStatus = getSelectName(unlock, unlocksTable, CONFIG.unlocks.xpAwardStatus);
    if (awardStatus !== CONFIG.values.pending) {
      skip("skipped_not_pending", { unlockId: unlock.id, awardStatus });
      continue;
    }

    const shotMilestoneId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.shotMilestone);
    const achievementId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.achievement);
    const ruleKey = achievementRuleById.get(achievementId) || "";
    const isShotMilestone =
      Boolean(shotMilestoneId) || ruleKey === CONFIG.values.shotMilestoneRule;

    if (!isShotMilestone) {
      skip("skipped_not_shot_milestone", { unlockId: unlock.id, ruleKey });
      continue;
    }

    const linkedXpIds = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.xpEvents);
    if (linkedXpIds.length === 0) {
      skip("skipped_no_xp_linked", {
        unlockId: unlock.id,
        name: unlock.name,
        recommendedAction: "Use a create-XP backfill or re-run 059 on new unlocks only",
      });
      continue;
    }

    if (linkedXpIds.length > 1) {
      skip("skipped_multiple_xp_linked", {
        unlockId: unlock.id,
        name: unlock.name,
        xpEventIds: linkedXpIds,
        recommendedAction: "Resolve duplicate XP manually before marking Awarded",
      });
      continue;
    }

    const enrollmentId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.enrollment);
    const weekId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.week);
    const milestoneSourceKey = getText(unlock, unlocksTable, CONFIG.unlocks.milestoneSourceKey);
    const expectedSourceKey = buildShotMilestoneSourceKey(
      enrollmentId,
      shotMilestoneId,
      milestoneSourceKey
    );

    const { xpId: primaryXpId, sourceKey: primarySourceKey } = pickPrimaryXpId(
      unlock,
      unlocksTable,
      xpQuery,
      xpEventsTable,
      expectedSourceKey
    );

    if (!primaryXpId) {
      skip("skipped_xp_record_missing", { unlockId: unlock.id, linkedXpIds });
      continue;
    }

    const primaryXp = xpQuery.getRecord(primaryXpId);
    const xpPoints = getNumberish(primaryXp, xpEventsTable, CONFIG.xpEvents.xpPoints);
    const unlockWasIds = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.weeklySummary);
    const xpWasId = getFirstLinkedId(primaryXp, xpEventsTable, CONFIG.xpEvents.weeklySummary);

    let weeklySummaryId = "";
    try {
      weeklySummaryId = resolveWeeklySummaryId({
        sourceWeeklySummaryIds: unlockWasIds,
        enrollmentId,
        weekId,
        summaryIndex,
      });
    } catch (error) {
      skip("skipped_ambiguous_weekly_summary", {
        unlockId: unlock.id,
        name: unlock.name,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const currentXpAwarded = getNumberish(unlock, unlocksTable, CONFIG.unlocks.xpAwarded);
    const needsAwardStatus = awardStatus !== CONFIG.values.awarded;
    const needsXpAwarded = xpPoints > 0 && currentXpAwarded !== xpPoints;
    const needsXpUnlockLink =
      fieldExists(xpEventsTable, CONFIG.xpEvents.achievementUnlock) &&
      getFirstLinkedId(primaryXp, xpEventsTable, CONFIG.xpEvents.achievementUnlock) !== unlock.id;
    const needsXpWasLink = weeklySummaryId && !xpWasId;

    if (!needsAwardStatus && !needsXpAwarded && !needsXpUnlockLink && !needsXpWasLink) {
      skip("skipped_already_synced", { unlockId: unlock.id, name: unlock.name });
      continue;
    }

    const actions = [];
    if (needsAwardStatus) actions.push("mark_awarded");
    if (needsXpAwarded) actions.push("set_xp_awarded");
    if (needsXpUnlockLink) actions.push("link_xp_achievement_unlock");
    if (needsXpWasLink) actions.push("link_xp_was");

    candidates.push({
      unlockId: unlock.id,
      name: unlock.name,
      xpEventId: primaryXpId,
      xpPoints,
      expectedSourceKey,
      actualSourceKey: primarySourceKey,
      weeklySummaryId,
      actions,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const unlockUpdate = {};
      addIfWritable(
        unlockUpdate,
        unlocksTable,
        CONFIG.unlocks.xpAwardStatus,
        buildCellValueForField(unlocksTable, CONFIG.unlocks.xpAwardStatus, CONFIG.values.awarded)
      );
      if (row.xpPoints > 0) {
        addIfWritable(unlockUpdate, unlocksTable, CONFIG.unlocks.xpAwarded, row.xpPoints);
      }
      addIfWritable(
        unlockUpdate,
        unlocksTable,
        CONFIG.unlocks.notes,
        `Backfill marked Awarded: XP Event ${row.xpEventId} was already linked (059 repair).`
      );

      const xpUpdate = {};
      addIfWritable(
        xpUpdate,
        xpEventsTable,
        CONFIG.xpEvents.achievementUnlock,
        linkedCell([row.unlockId])
      );
      if (row.weeklySummaryId) {
        addIfWritable(
          xpUpdate,
          xpEventsTable,
          CONFIG.xpEvents.weeklySummary,
          linkedCell([row.weeklySummaryId])
        );
      }

      if (!DRY_RUN && CONFIRM_WRITE) {
        if (Object.keys(unlockUpdate).length > 0) {
          await unlocksTable.updateRecordAsync(row.unlockId, unlockUpdate);
        }
        if (Object.keys(xpUpdate).length > 0) {
          await xpEventsTable.updateRecordAsync(row.xpEventId, xpUpdate);
        }
      }

      applied.push(row);
    } catch (error) {
      errors.push({
        unlockId: row.unlockId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("===== BACKFILL SHOT MILESTONE UNLOCK MARK AWARDED =====");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        dryRun: DRY_RUN,
        confirmWrite: CONFIRM_WRITE,
        batchLimit: BATCH_LIMIT,
        candidateCount: candidates.length,
        remainingCount: Math.max(0, candidates.length - batch.length),
        skipCounts,
        skippedSample: skipped,
        batchSample: batch,
        appliedCount: applied.length,
        appliedSample: applied,
        errorCount: errors.length,
        errors,
        recommendedAction:
          candidates.length === 0
            ? "No Pending shot-milestone unlocks with linked XP need repair."
            : DRY_RUN || !CONFIRM_WRITE
              ? "Review batchSample, then set CONFIRM_WRITE = true and re-run."
              : "Re-run until remainingCount is 0, then audit-achievement-xp-pipeline-integrity.js.",
      },
      null,
      2
    )
  );
}

await main();
