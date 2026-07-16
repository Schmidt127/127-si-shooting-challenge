/**
 * Offline harness helpers for Automation 066 shot-milestone crossing expectations.
 * Mirrors production Source Key + crossing semantics without Airtable.
 */

"use strict";

function buildMilestoneSourceKey(enrollmentId, shotMilestoneId) {
  return `SHOT_MILESTONE|${enrollmentId}|${shotMilestoneId}`;
}

function detectCrossings({
  enrollmentId,
  previousShotTotal,
  currentShotTotal,
  milestones = [],
  unlockedSourceKeys = [],
}) {
  const prev = Number(previousShotTotal) || 0;
  const curr = Number(currentShotTotal) || 0;
  const unlocked = new Set(unlockedSourceKeys);
  const crossings = [];
  for (const milestone of milestones) {
    const threshold = Number(milestone.threshold) || 0;
    if (!(prev < threshold && curr >= threshold)) continue;
    const sourceKey = buildMilestoneSourceKey(enrollmentId, milestone.id);
    if (unlocked.has(sourceKey)) continue;
    crossings.push({
      milestoneId: milestone.id,
      name: milestone.name || "",
      threshold,
      sourceKey,
      expectAction: "create",
    });
  }
  return crossings;
}

function summarizeRerun(firstCrossings, unlockedAfterFirst) {
  return detectCrossings({
    enrollmentId: "recEnrollment0001",
    previousShotTotal: 0,
    currentShotTotal: 999999,
    milestones: firstCrossings.map((c) => ({
      id: c.milestoneId,
      threshold: c.threshold,
      name: c.name,
    })),
    unlockedSourceKeys: unlockedAfterFirst,
  });
}

module.exports = {
  buildMilestoneSourceKey,
  detectCrossings,
  summarizeRerun,
};
