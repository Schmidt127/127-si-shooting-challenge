"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const {
  getBooleanish,
  getRecordId,
  getSelectText,
  getNumber,
  firstLinkedId,
  normalizeBlank,
} = require("../normalize");
const { findDuplicateGroups } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{
 *   achievementUnlocks?: object[],
 *   xpEvents?: object[],
 *   weeklyAthleteSummaries?: object[],
 * }} data
 */
function checkAchievements(data = {}) {
  const unlocks = data.achievementUnlocks || [];
  const xpEvents = data.xpEvents || [];
  const wasRows = data.weeklyAthleteSummaries || [];
  const issues = [];

  const streakUnlocks = unlocks.filter((u) => {
    const f = u.fields || u;
    const key = normalizeBlank(f["Unlock Key"] || f["Source Key"] || f._unlockKey);
    const type = getSelectText(f.Type || f["Achievement Type"]);
    return /streak/i.test(type) || /^STREAK/i.test(key);
  });
  const milestoneUnlocks = unlocks.filter((u) => {
    const f = u.fields || u;
    const key = normalizeBlank(f["Unlock Key"] || f["Source Key"] || f._unlockKey);
    const type = getSelectText(f.Type || f["Achievement Type"]);
    return /milestone|shot/i.test(type) || /^SHOT_MILESTONE/i.test(key);
  });
  const perfectWeekUnlocks = unlocks.filter((u) => {
    const f = u.fields || u;
    const key = normalizeBlank(f["Unlock Key"] || f["Source Key"] || f._unlockKey);
    const type = getSelectText(f.Type || f["Achievement Type"]);
    return /perfect.?week/i.test(type) || /^PERFECT_WEEK/i.test(key);
  });

  // Duplicate streak unlock keys
  for (const dup of findDuplicateGroups(streakUnlocks, keyOf)) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.STREAK_ACHIEVEMENTS,
          sourceTable: "Athlete Achievement Unlocks",
          sourceRecordId: rid,
          sourceKey: dup.key,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "duplicate_streak_unlock_key",
          recommendedAction: "Keep one streak unlock per key; deactivate extras before any XP retry.",
          owningAutomation: OWNING_AUTOMATIONS.streak,
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  for (const u of streakUnlocks) {
    pushUnlockXpPairIssues(u, xpEvents, issues, {
      workflowUnlock: WORKFLOWS.STREAK_ACHIEVEMENTS,
      workflowXp: WORKFLOWS.STREAK_XP,
      owning: OWNING_AUTOMATIONS.streak,
      codePrefix: "streak",
    });
    const threshold = getNumber((u.fields || u)["Streak Threshold"] || (u.fields || u)._threshold);
    if (threshold != null && (threshold <= 0 || !Number.isInteger(threshold))) {
      issues.push(
        fin({
          workflow: WORKFLOWS.STREAK_ACHIEVEMENTS,
          sourceTable: "Athlete Achievement Unlocks",
          sourceRecordId: getRecordId(u),
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "invalid_streak_threshold",
          recommendedAction: "Fix streak threshold to a positive integer from config rules.",
          owningAutomation: OWNING_AUTOMATIONS.streak,
          meta: { dataFixRequired: true },
        })
      );
    }
  }

  for (const dup of findDuplicateGroups(milestoneUnlocks, keyOf)) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SHOT_MILESTONES,
          sourceTable: "Athlete Achievement Unlocks",
          sourceRecordId: rid,
          sourceKey: dup.key,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "duplicate_shot_milestone_unlock",
          recommendedAction: "Deactivate duplicate shot milestone unlocks for same key.",
          owningAutomation: OWNING_AUTOMATIONS.shotMilestones,
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  for (const u of milestoneUnlocks) {
    const f = u.fields || u;
    const enrBand = firstLinkedId(f["Enrollment Grade Band"]) || getSelectText(f["Enrollment Grade Band"]);
    const milestoneBand = firstLinkedId(f["Milestone Grade Band"]) || getSelectText(f["Milestone Grade Band"]);
    if (enrBand && milestoneBand && String(enrBand) !== String(milestoneBand)) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SHOT_MILESTONES,
          sourceTable: "Athlete Achievement Unlocks",
          sourceRecordId: getRecordId(u),
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "milestone_wrong_grade_band",
          recommendedAction: "Detach milestone unlock from wrong grade band; re-run 066 if needed.",
          owningAutomation: OWNING_AUTOMATIONS.shotMilestones,
          evidence: [`enrollmentBand=${enrBand}`, `milestoneBand=${milestoneBand}`],
          meta: { dataFixRequired: true },
        })
      );
    }
    pushUnlockXpPairIssues(u, xpEvents, issues, {
      workflowUnlock: WORKFLOWS.SHOT_MILESTONES,
      workflowXp: WORKFLOWS.SHOT_MILESTONES,
      owning: OWNING_AUTOMATIONS.achievementXp,
      codePrefix: "milestone",
    });
  }

  for (const u of perfectWeekUnlocks) {
    const f = u.fields || u;
    const wasId = firstLinkedId(f["Weekly Athlete Summary"]);
    const eligible = getBooleanish(f._eligible) || getBooleanish(f["Perfect Week Eligible?"]);
    if (!eligible && wasId) {
      const was = wasRows.find((w) => getRecordId(w) === wasId);
      const wf = was ? was.fields || was : {};
      if (!getBooleanish(wf["Perfect Week Eligible?"])) {
        issues.push(
          fin({
            workflow: WORKFLOWS.PERFECT_WEEK,
            sourceTable: "Athlete Achievement Unlocks",
            sourceRecordId: getRecordId(u),
            healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
            code: "perfect_week_unlock_without_eligibility",
            recommendedAction: "Do not keep Perfect Week unlock without 057 eligibility.",
            owningAutomation: OWNING_AUTOMATIONS.perfectWeek,
            meta: { dataFixRequired: true },
          })
        );
      }
    }
    pushUnlockXpPairIssues(u, xpEvents, issues, {
      workflowUnlock: WORKFLOWS.PERFECT_WEEK,
      workflowXp: WORKFLOWS.PERFECT_WEEK,
      owning: OWNING_AUTOMATIONS.achievementXp,
      codePrefix: "perfect_week",
    });
  }

  // Eligibility without unlock
  for (const was of wasRows) {
    const f = was.fields || was;
    if (!getBooleanish(f["Perfect Week Eligible?"])) continue;
    const unlockLink = firstLinkedId(f["Perfect Week Unlock"]);
    if (!unlockLink) {
      issues.push(
        fin({
          workflow: WORKFLOWS.PERFECT_WEEK,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: getRecordId(was),
          enrollmentRecordId: firstLinkedId(f.Enrollment),
          weekRecordId: firstLinkedId(f.Week),
          healthStatus: HEALTH_STATUS.RETRYABLE_ERROR,
          code: "perfect_week_eligible_without_unlock",
          recommendedAction: "Run 058 to create Perfect Week unlock (after eligibility confirmed).",
          owningAutomation: OWNING_AUTOMATIONS.perfectWeek,
        })
      );
    }
  }

  const pwXp = xpEvents.filter((xp) =>
    /^PERFECT_WEEK\|/i.test(normalizeBlank((xp.fields || xp)["Source Key"]))
  );
  for (const dup of findDuplicateGroups(pwXp, (r) =>
    String(normalizeBlank((r.fields || r)["Source Key"]) || "")
  )) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.PERFECT_WEEK,
          sourceTable: "XP Events",
          sourceRecordId: rid,
          sourceKey: dup.key,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "duplicate_perfect_week_xp",
          recommendedAction: "Deactivate duplicate Perfect Week XP for same Source Key.",
          owningAutomation: OWNING_AUTOMATIONS.achievementXp,
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  return issues;
}

function keyOf(r) {
  const f = r.fields || r;
  return String(normalizeBlank(f["Unlock Key"] || f["Source Key"] || f._unlockKey) || "");
}

function pushUnlockXpPairIssues(unlock, xpEvents, issues, opts) {
  const id = getRecordId(unlock);
  const f = unlock.fields || unlock;
  const status = getSelectText(f["XP Award Status"]);
  const awarded = /awarded/i.test(status);
  const hasXp = xpEvents.some((xp) => {
    const xf = xp.fields || xp;
    return firstLinkedId(xf["Athlete Achievement Unlock"]) === id;
  });
  if (awarded && !hasXp) {
    issues.push(
      fin({
        workflow: opts.workflowXp,
        sourceTable: "Athlete Achievement Unlocks",
        sourceRecordId: id,
        healthStatus: HEALTH_STATUS.RETRYABLE_ERROR,
        code: `${opts.codePrefix}_unlock_without_xp`,
        recommendedAction: "Retry 059 only after Source Key uniqueness check.",
        owningAutomation: opts.owning,
      })
    );
  }
  // XP without unlock already covered when XP links missing unlock — detect orphans:
  for (const xp of xpEvents) {
    const xf = xp.fields || xp;
    const linked = firstLinkedId(xf["Athlete Achievement Unlock"]);
    const sk = normalizeBlank(xf["Source Key"]);
    if (linked || !sk) continue;
    if (
      (opts.codePrefix === "streak" && /^STREAK/i.test(sk)) ||
      (opts.codePrefix === "milestone" && /^SHOT_MILESTONE/i.test(sk)) ||
      (opts.codePrefix === "perfect_week" && /^PERFECT_WEEK/i.test(sk))
    ) {
      // only emit once per xp — handled in a Set via meta flag on issues length check below
    }
  }
}

// Orphan achievement XP (no unlock link)
function checkOrphanAchievementXp(xpEvents, issues) {
  for (const xp of xpEvents) {
    const f = xp.fields || xp;
    const sk = normalizeBlank(f["Source Key"]);
    if (!/^(STREAK|SHOT_MILESTONE|PERFECT_WEEK)\|/i.test(sk)) continue;
    if (firstLinkedId(f["Athlete Achievement Unlock"])) continue;
    let workflow = WORKFLOWS.STREAK_XP;
    if (/^SHOT_MILESTONE\|/i.test(sk)) workflow = WORKFLOWS.SHOT_MILESTONES;
    if (/^PERFECT_WEEK\|/i.test(sk)) workflow = WORKFLOWS.PERFECT_WEEK;
    issues.push(
      fin({
        workflow,
        sourceTable: "XP Events",
        sourceRecordId: getRecordId(xp),
        sourceKey: sk,
        healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
        code: "achievement_xp_without_unlock",
        recommendedAction: "Link XP to unlock or deactivate orphan achievement XP.",
        owningAutomation: OWNING_AUTOMATIONS.achievementXp,
        meta: { dataFixRequired: true },
      })
    );
  }
}

function checkAchievementsWithOrphans(data) {
  const issues = checkAchievements(data);
  checkOrphanAchievementXp(data.xpEvents || [], issues);
  return issues;
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = {
  checkAchievements: checkAchievementsWithOrphans,
};
