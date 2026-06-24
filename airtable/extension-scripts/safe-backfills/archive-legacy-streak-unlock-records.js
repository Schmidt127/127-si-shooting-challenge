/*
Extension Script: Archive Legacy Streak Unlock Records
System: 127 SI Shooting Challenge
Purpose:
  Deletes orphan Athlete Achievement Unlock rows for Streak Length achievements.
  Streak XP now flows through Streak Occurrences (053) + 054 — these unlock rows
  are legacy cruft (blank / Skipped / Pending with no XP).

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_DELETE = true to delete
  - BATCH_LIMIT = 25; re-run until remainingCount is 0
  - Never deletes Awarded unlocks or any unlock with linked XP Events

Setup:
  1. audit-legacy-cleanup-candidates.js (review deleteCandidateCount)
  2. DRY_RUN=true, then CONFIRM_DELETE=true in batches
  3. Re-run audit-achievement-xp-pipeline-integrity.js (unlock_not_ready should drop)
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_DELETE = false;
const BATCH_LIMIT = 25;
const DEBUG_UNLOCK_ID = "";

const CONFIG = {
  scriptName: "archive-legacy-streak-unlock-records",
  version: "v1.0",

  tables: {
    unlocks: "Athlete Achievement Unlocks",
    achievements: "Achievements",
  },

  unlocks: {
    achievement: "Achievement",
    xpEvents: "XP Events",
    xpAwardStatus: "XP Award Status",
    shotMilestone: "Shot Milestone",
  },

  achievements: {
    triggerType: "Trigger Type",
    rewardRuleKey: "Reward Rule Key",
  },

  values: {
    streakTriggerType: "Streak Length",
    unlockAwarded: "Awarded",
    unlockPending: "Pending",
    deletableStatuses: ["", "Skipped", "Pending"],
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

async function main() {
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const achievementsTable = base.getTable(CONFIG.tables.achievements);

  const achievementFields = Object.values(CONFIG.achievements).filter(name =>
    fieldExists(achievementsTable, name)
  );
  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));

  const [achievementQuery, unlockQuery] = await Promise.all([
    achievementsTable.selectRecordsAsync({ fields: achievementFields }),
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
  ]);

  const streakAchievementIds = new Set();
  for (const achievement of achievementQuery.records) {
    const triggerType = getSelectName(achievement, achievementsTable, CONFIG.achievements.triggerType);
    if (triggerType === CONFIG.values.streakTriggerType) {
      streakAchievementIds.add(achievement.id);
    }
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

    const achievementId = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.achievement)[0] || "";
    if (!streakAchievementIds.has(achievementId)) {
      skip("not_streak_achievement_unlock", { unlockId: unlock.id });
      continue;
    }

    const xpAwardStatus = getSelectName(unlock, unlocksTable, CONFIG.unlocks.xpAwardStatus);
    const xpEventIds = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.xpEvents);

    if (xpAwardStatus === CONFIG.values.unlockAwarded) {
      skip("unlock_awarded", { unlockId: unlock.id, xpAwardStatus });
      continue;
    }

    if (xpEventIds.length > 0) {
      skip("has_linked_xp", { unlockId: unlock.id, xpEventIds });
      continue;
    }

    if (!CONFIG.values.deletableStatuses.includes(xpAwardStatus)) {
      skip("unexpected_status", { unlockId: unlock.id, xpAwardStatus });
      continue;
    }

    candidates.push({
      unlockId: unlock.id,
      name: unlock.name,
      xpAwardStatus: xpAwardStatus || "",
      achievementId,
      action: DRY_RUN || !CONFIRM_DELETE ? "would_delete" : "delete",
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const deleted = [];
  const errors = [];

  if (!DRY_RUN && CONFIRM_DELETE && batch.length > 0) {
    try {
      await unlocksTable.deleteRecordsAsync(batch.map(row => row.unlockId));
      deleted.push(...batch.map(row => ({ ...row, action: "deleted" })));
    } catch (error) {
      for (const row of batch) {
        try {
          await unlocksTable.deleteRecordAsync(row.unlockId);
          deleted.push({ ...row, action: "deleted" });
        } catch (innerError) {
          errors.push({
            unlockId: row.unlockId,
            error: innerError instanceof Error ? innerError.message : String(innerError),
          });
        }
      }
      if (errors.length === 0 && deleted.length === 0) {
        errors.push({
          unlockId: "",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  console.log("===== ARCHIVE LEGACY STREAK UNLOCK RECORDS =====");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        dryRun: DRY_RUN,
        confirmDelete: CONFIRM_DELETE,
        batchLimit: BATCH_LIMIT,
        streakAchievementCount: streakAchievementIds.size,
        unlocksChecked: unlockQuery.records.length,
        candidateCount: candidates.length,
        batchCount: batch.length,
        deletedCount: DRY_RUN || !CONFIRM_DELETE ? 0 : deleted.length,
        remainingCount: Math.max(0, candidates.length - batch.length),
        skippedCount: Object.values(skipCounts).reduce((sum, n) => sum + n, 0),
        skipCounts,
        errors,
        skippedSample: skipped,
        sample: (DRY_RUN || !CONFIRM_DELETE ? batch : deleted).slice(0, 15),
      },
      null,
      2
    )
  );
}

await main();
