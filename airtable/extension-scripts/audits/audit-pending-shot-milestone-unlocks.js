/*
Extension Script: Audit Pending Shot Milestone Unlocks (059 Readiness)
System: 127 SI Shooting Challenge
Purpose:
  Diagnoses why Athlete Achievement Unlock rows are stuck Pending and why
  automation 059 / monitoring views may not show them.

  Reports per-row readiness flags and a blockingReason.

Default: read-only
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const CONFIG = {
  scriptName: "audit-pending-shot-milestone-unlocks",
  version: "v1.1",

  tables: {
    unlocks: "Athlete Achievement Unlocks",
    achievements: "Achievements",
  },

  unlocks: {
    achievement: "Achievement",
    enrollment: "Enrollment",
    week: "Week",
    shotMilestone: "Shot Milestone",
    xpEvents: "XP Events",
    xpAwardStatus: "XP Award Status",
    milestoneActivityDate: "Milestone Activity Date",
    readyFor059: "Ready for 059 XP?",
    notes: "Notes",
  },

  achievements: {
    rewardRuleKey: "Reward Rule Key",
    active: "Active?",
  },

  values: {
    pending: "Pending",
    shotMilestoneRule: "SHOT_MILESTONE",
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

function getReadyFor059(record, table) {
  if (!fieldExists(table, CONFIG.unlocks.readyFor059)) return null;
  const raw = record.getCellValue(CONFIG.unlocks.readyFor059);
  if (typeof raw === "number") return raw;
  const parsed = Number(getText(record, table, CONFIG.unlocks.readyFor059));
  return Number.isFinite(parsed) ? parsed : null;
}

function hasDate(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw !== null && raw !== undefined && raw !== "";
}

async function main() {
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const achievementsTable = base.getTable(CONFIG.tables.achievements);

  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlocksTable, name));
  const achievementFields = Object.values(CONFIG.achievements).filter(name =>
    fieldExists(achievementsTable, name)
  );

  const [unlockQuery, achievementQuery] = await Promise.all([
    unlocksTable.selectRecordsAsync({ fields: unlockFields }),
    achievementsTable.selectRecordsAsync({ fields: achievementFields }),
  ]);

  const achievementRuleById = new Map();
  for (const achievement of achievementQuery.records) {
    achievementRuleById.set(
      achievement.id,
      getText(achievement, achievementsTable, CONFIG.achievements.rewardRuleKey)
    );
  }

  const buckets = {
    pending_shot_ready: [],
    pending_shot_xp_linked_not_awarded: [],
    pending_shot_blocked: [],
    pending_perfect_week: [],
    pending_other: [],
    not_pending: [],
  };

  const blockCounts = {};

  function bump(reason) {
    blockCounts[reason] = (blockCounts[reason] || 0) + 1;
  }

  for (const unlock of unlockQuery.records) {
    const xpAwardStatus = getSelectName(unlock, unlocksTable, CONFIG.unlocks.xpAwardStatus);
    const shotMilestoneId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.shotMilestone);
    const enrollmentId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.enrollment);
    const achievementId = getFirstLinkedId(unlock, unlocksTable, CONFIG.unlocks.achievement);
    const xpEventIds = getLinkedIds(unlock, unlocksTable, CONFIG.unlocks.xpEvents);
    const readyFor059 = getReadyFor059(unlock, unlocksTable);
    const activityDatePresent = hasDate(unlock, unlocksTable, CONFIG.unlocks.milestoneActivityDate);
    const ruleKey = achievementRuleById.get(achievementId) || "";

    const isShotMilestone = Boolean(shotMilestoneId) || ruleKey === CONFIG.values.shotMilestoneRule;
    const isPending =
      xpAwardStatus === CONFIG.values.pending || xpAwardStatus === "";

    if (!isPending) {
      if (buckets.not_pending.length < 3) buckets.not_pending.push({ unlockId: unlock.id, xpAwardStatus });
      continue;
    }

    const row = {
      unlockId: unlock.id,
      name: unlock.name,
      xpAwardStatus: xpAwardStatus || "",
      readyFor059,
      enrollmentId,
      achievementId,
      shotMilestoneId,
      xpEventCount: xpEventIds.length,
      activityDatePresent,
      ruleKey,
    };

    if (!isShotMilestone) {
      buckets.pending_perfect_week.push(row);
      continue;
    }

    const hasXpLinked = xpEventIds.length > 0;
    const repairableXpLinkedPending =
      hasXpLinked &&
      xpAwardStatus === CONFIG.values.pending &&
      xpEventIds.length === 1 &&
      enrollmentId &&
      achievementId &&
      shotMilestoneId;

    if (repairableXpLinkedPending) {
      bump("xp_linked_status_still_pending");
      if (buckets.pending_shot_xp_linked_not_awarded.length < SAMPLE_LIMIT) {
        buckets.pending_shot_xp_linked_not_awarded.push({
          ...row,
          xpEventId: xpEventIds[0],
          diagnosis:
            "059 likely created XP (reverse-linked to unlock) but never set XP Award Status = Awarded.",
        });
      }
      continue;
    }

    const blockers = [];
    if (!enrollmentId) blockers.push("missing_enrollment");
    if (!achievementId) blockers.push("missing_achievement");
    if (!shotMilestoneId) blockers.push("missing_shot_milestone_link");
    if (!activityDatePresent) blockers.push("missing_milestone_activity_date");
    if (hasXpLinked) blockers.push("xp_already_linked");
    if (xpAwardStatus !== CONFIG.values.pending) blockers.push("xp_award_status_not_exact_pending");
    if (readyFor059 === 0) blockers.push("ready_for_059_formula_is_0");

    if (blockers.length === 0) {
      buckets.pending_shot_ready.push(row);
    } else {
      for (const blocker of blockers) bump(blocker);
      if (buckets.pending_shot_blocked.length < SAMPLE_LIMIT) {
        buckets.pending_shot_blocked.push({ ...row, blockers });
      }
    }
  }

  console.log("===== AUDIT PENDING SHOT MILESTONE UNLOCKS =====");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        unlocksChecked: unlockQuery.records.length,
        pendingShotReadyCount: buckets.pending_shot_ready.length,
        pendingShotXpLinkedNotAwardedCount: buckets.pending_shot_xp_linked_not_awarded.length,
        pendingShotBlockedCount:
          unlockQuery.records.length -
          buckets.not_pending.length -
          buckets.pending_perfect_week.length -
          buckets.pending_shot_ready.length -
          buckets.pending_shot_xp_linked_not_awarded.length,
        pendingPerfectWeekCount: buckets.pending_perfect_week.length,
        blockCounts,
        automationNotes: [
          "Ready for 059 XP? = 1 only when Pending AND XP Events is empty.",
          "If 059 creates XP first, the unlock auto-gets an XP Events link and the formula flips to 0.",
          "If 059 then fails before setting Awarded, rows are stuck: Pending + XP linked + formula 0.",
          "Those rows will NOT appear in views/triggers filtered on Ready for 059 XP? = 1.",
          "Repair: backfill-shot-milestone-unlock-mark-awarded.js (not a create-XP backfill).",
          "Going forward: 059 trigger = When record is CREATED; do not require Ready for 059 XP? or XP Events empty.",
        ],
        pendingShotReadySample: buckets.pending_shot_ready.slice(0, SAMPLE_LIMIT),
        pendingShotXpLinkedNotAwardedSample: buckets.pending_shot_xp_linked_not_awarded,
        pendingShotBlockedSample: buckets.pending_shot_blocked,
        pendingPerfectWeekSample: buckets.pending_perfect_week.slice(0, 5),
        recommendedAction:
          buckets.pending_shot_xp_linked_not_awarded.length > 0
            ? "Run backfill-shot-milestone-unlock-mark-awarded.js (DRY_RUN, then CONFIRM_WRITE)."
            : buckets.pending_shot_ready.length > 0
              ? "Run 059 or create-XP backfill for unlocks with no XP yet."
              : "Review pendingShotBlockedSample blockers.",
      },
      null,
      2
    )
  );
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

await main();
