/*
Extension Script: Audit Achievement XP Pipeline Integrity
System: 127 SI Shooting Challenge
Purpose: read-only reconciliation of achievement-unlock and streak-occurrence
lifecycle records with their exact canonical XP Events. Corrected history is
reported, never repaired: unsupported sources and their exact XP Events remain
inactive; duplicate and ownership ambiguity fail closed.
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const CONFIG = {
  scriptName: "audit-achievement-xp-pipeline-integrity",
  version: "v2.1",
  tables: {
    unlocks: "Athlete Achievement Unlocks",
    streakOccurrences: "Streak Occurrences",
    achievements: "Achievements",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },
  unlocks: {
    active: "Active?", achievement: "Achievement", enrollment: "Enrollment", week: "Week",
    shotMilestone: "Shot Milestone", sourceKey: "Source Key",
    milestoneSourceKey: "Milestone Source Key", xpAwardStatus: "XP Award Status",
    xpAwarded: "XP Awarded", xpEvents: "XP Events", weeklySummary: "Weekly Athlete Summary",
  },
  streakOccurrences: {
    active: "Active?", enrollment: "Enrollment", achievement: "Achievement", week: "Week",
    streakEndDate: "Streak End Date", sourceStatus: "Source Status",
    xpEvents: "XP Events", occurrenceKey: "Streak Occurrence Key",
  },
  achievements: {
    name: "Achievement Name",
  },
  xpEvents: {
    active: "Active?", sourceKey: "Source Key", achievementUnlock: "Achievement Unlock",
    streakOccurrence: "Streak Occurrence", enrollment: "Enrollment", week: "Week",
    weeklySummary: "Weekly Athlete Summary", xpPoints: "XP Points", xpSource: "XP Source",
    xpBucket: "XP Bucket",
  },
  weeklySummary: { enrollment: "Enrollment", week: "Week" },
  values: {
    awarded: "Awarded",
    perfectWeekPrefix: "PERFECT_WEEK|",
    shotMilestonePrefix: "SHOT_MILESTONE|",
    streakPrefix: "STREAK_XP|",
  },
};

function fieldExists(table, fieldName) {
  try { return Boolean(table.getField(fieldName)); } catch { return false; }
}
function getText(record, table, fieldName) {
  return fieldExists(table, fieldName) ? String(record.getCellValueAsString(fieldName) || "").trim() : "";
}
function getSelectName(record, table, fieldName) {
  const raw = fieldExists(table, fieldName) ? record.getCellValue(fieldName) : null;
  return String(raw?.name || raw || "").trim();
}
function getLinkedIds(record, table, fieldName) {
  const raw = fieldExists(table, fieldName) ? record.getCellValue(fieldName) : null;
  return Array.isArray(raw) ? raw.map(item => item?.id).filter(Boolean) : [];
}
function getOneLinkedId(record, table, fieldName) {
  const ids = getLinkedIds(record, table, fieldName);
  return ids.length === 1 ? ids[0] : "";
}
function getNumber(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const text = String(record.getCellValueAsString(fieldName) || "").replace(/,/g, "").trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
function booleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return true;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || raw?.name === "Active" || String(raw || "").toLowerCase() === "true";
}
function toDateKey(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}
function keyType(sourceKey) {
  if (sourceKey.startsWith(CONFIG.values.perfectWeekPrefix)) return "unlock_perfect_week";
  if (sourceKey.startsWith(CONFIG.values.shotMilestonePrefix)) return "unlock_shot_milestone";
  if (sourceKey.startsWith(CONFIG.values.streakPrefix)) return "streak";
  return "";
}
function pairKey(enrollmentId, weekId) { return `${enrollmentId}|${weekId}`; }
function expectedUnlockKey(record, table) {
  const stored = getText(record, table, CONFIG.unlocks.sourceKey) ||
    getText(record, table, CONFIG.unlocks.milestoneSourceKey);
  if (stored) return stored;
  const enrollmentId = getOneLinkedId(record, table, CONFIG.unlocks.enrollment);
  const milestoneId = getOneLinkedId(record, table, CONFIG.unlocks.shotMilestone);
  const weekId = getOneLinkedId(record, table, CONFIG.unlocks.week);
  if (enrollmentId && milestoneId) return `${CONFIG.values.shotMilestonePrefix}${enrollmentId}|${milestoneId}`;
  return enrollmentId && weekId ? `${CONFIG.values.perfectWeekPrefix}${enrollmentId}|${weekId}` : "";
}
function expectedStreakKey(record, table) {
  const enrollmentId = getOneLinkedId(record, table, CONFIG.streakOccurrences.enrollment);
  const achievementId = getOneLinkedId(record, table, CONFIG.streakOccurrences.achievement);
  const dateKey = toDateKey(fieldExists(table, CONFIG.streakOccurrences.streakEndDate)
    ? record.getCellValue(CONFIG.streakOccurrences.streakEndDate) : null);
  return enrollmentId && achievementId && dateKey
    ? `${CONFIG.values.streakPrefix}${enrollmentId}|${achievementId}|${dateKey}` : "";
}

async function main() {
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const streakTable = base.getTable(CONFIG.tables.streakOccurrences);
  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  const achievementsTable = base.getTable(CONFIG.tables.achievements);
  const wasTable = base.getTable(CONFIG.tables.weeklySummary);
  const fieldsFor = (table, config) => [...new Set(Object.values(config).filter(name => fieldExists(table, name)))];
  // Every field read below is explicitly included in its table query.
  const [unlocks, streaks, achievements, xps, summaries] = await Promise.all([
    unlocksTable.selectRecordsAsync({ fields: fieldsFor(unlocksTable, CONFIG.unlocks) }),
    streakTable.selectRecordsAsync({ fields: fieldsFor(streakTable, CONFIG.streakOccurrences) }),
    achievementsTable.selectRecordsAsync({ fields: fieldsFor(achievementsTable, CONFIG.achievements) }),
    xpTable.selectRecordsAsync({ fields: fieldsFor(xpTable, CONFIG.xpEvents) }),
    wasTable.selectRecordsAsync({ fields: fieldsFor(wasTable, CONFIG.weeklySummary) }),
  ]);

  const issues = {};
  const samples = {};
  const add = (kind, row) => {
    issues[kind] = (issues[kind] || 0) + 1;
    if (!samples[kind]) samples[kind] = [];
    if (samples[kind].length < SAMPLE_LIMIT) samples[kind].push(row);
  };
  const xpByKey = new Map();
  const xpById = new Map();
  const achievementNameById = new Map();
  for (const achievement of achievements.records) {
    achievementNameById.set(
      achievement.id,
      getText(achievement, achievementsTable, CONFIG.achievements.name),
    );
  }
  for (const xp of xps.records) {
    xpById.set(xp.id, xp);
    const sourceKey = getText(xp, xpTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpByKey.has(sourceKey)) xpByKey.set(sourceKey, []);
    xpByKey.get(sourceKey).push(xp);
  }
  const wasByPair = new Map();
  for (const was of summaries.records) {
    const pair = pairKey(
      getOneLinkedId(was, wasTable, CONFIG.weeklySummary.enrollment),
      getOneLinkedId(was, wasTable, CONFIG.weeklySummary.week)
    );
    if (pair !== "|") (wasByPair.get(pair) || wasByPair.set(pair, []).get(pair)).push(was);
  }

  const sourcesByKey = new Map();
  const registerSource = (source) => {
    if (!source.key) {
      add("source_missing_canonical_key", { sourceKind: source.kind, sourceId: source.id, name: source.name });
      return;
    }
    if (!keyType(source.key)) {
      add("source_unknown_prefix", { sourceKind: source.kind, sourceId: source.id, sourceKey: source.key });
      return;
    }
    if (!sourcesByKey.has(source.key)) sourcesByKey.set(source.key, []);
    sourcesByKey.get(source.key).push(source);
  };
  for (const row of unlocks.records) {
    const key = expectedUnlockKey(row, unlocksTable);
    registerSource({
      kind: "unlock", id: row.id, name: row.name, key,
      active: booleanish(row, unlocksTable, CONFIG.unlocks.active),
      supported: getSelectName(row, unlocksTable, CONFIG.unlocks.xpAwardStatus) === CONFIG.values.awarded,
      xpIds: getLinkedIds(row, unlocksTable, CONFIG.unlocks.xpEvents),
      enrollmentId: getOneLinkedId(row, unlocksTable, CONFIG.unlocks.enrollment),
      weekId: getOneLinkedId(row, unlocksTable, CONFIG.unlocks.week),
      expectedPoints: getNumber(row, unlocksTable, CONFIG.unlocks.xpAwarded),
      expectedSource: key.startsWith(CONFIG.values.perfectWeekPrefix) ? "Perfect Week" : "Shot Milestone",
      expectedBucket: key.startsWith(CONFIG.values.perfectWeekPrefix) ? "Perfect Week" : "Shot Milestone",
    });
  }
  for (const row of streaks.records) {
    const key = expectedStreakKey(row, streakTable);
    const achievementId = getOneLinkedId(row, streakTable, CONFIG.streakOccurrences.achievement);
    registerSource({
      kind: "streak", id: row.id, name: row.name, key,
      active: booleanish(row, streakTable, CONFIG.streakOccurrences.active),
      supported: getSelectName(row, streakTable, CONFIG.streakOccurrences.sourceStatus) === CONFIG.values.awarded,
      xpIds: getLinkedIds(row, streakTable, CONFIG.streakOccurrences.xpEvents),
      enrollmentId: getOneLinkedId(row, streakTable, CONFIG.streakOccurrences.enrollment),
      weekId: getOneLinkedId(row, streakTable, CONFIG.streakOccurrences.week),
      expectedPoints: null,
      expectedSource: achievementNameById.get(achievementId) || "",
      expectedBucket: "Streak",
    });
  }

  for (const [key, sourceRows] of sourcesByKey) {
    const exactXp = xpByKey.get(key) || [];
    if (sourceRows.length > 1) add("duplicate_canonical_source_key", {
      sourceKey: key, sourceIds: sourceRows.map(row => row.id), sourceKinds: sourceRows.map(row => row.kind),
    });
    if (exactXp.length > 1) add("duplicate_canonical_xp_source_key", {
      sourceKey: key, xpEventIds: exactXp.map(row => row.id),
    });
    for (const source of sourceRows) {
      if (exactXp.length === 0) add(`${source.kind}_missing_exact_xp`, {
        sourceId: source.id, sourceKey: key, active: source.active, supported: source.supported,
      });
      for (const xpId of source.xpIds) {
        const linkedXp = xpById.get(xpId);
        if (!linkedXp || getText(linkedXp, xpTable, CONFIG.xpEvents.sourceKey) !== key) {
          add("wrong_xp_backlink_on_source", {
            sourceKind: source.kind, sourceId: source.id, xpEventId: xpId, expectedSourceKey: key,
            actualSourceKey: linkedXp ? getText(linkedXp, xpTable, CONFIG.xpEvents.sourceKey) : "",
          });
        }
      }
      for (const xp of exactXp) {
        if (!source.xpIds.includes(xp.id)) add("missing_xp_backlink_on_source", {
          sourceKind: source.kind, sourceId: source.id, xpEventId: xp.id, sourceKey: key,
        });
        const sourceField = source.kind === "unlock"
          ? CONFIG.xpEvents.achievementUnlock : CONFIG.xpEvents.streakOccurrence;
        const sourceIds = getLinkedIds(xp, xpTable, sourceField);
        if (sourceIds.length !== 1 || sourceIds[0] !== source.id) add("wrong_or_multiple_source_links", {
          sourceKind: source.kind, sourceId: source.id, xpEventId: xp.id, sourceKey: key, sourceIds,
        });
        const xpActive = booleanish(xp, xpTable, CONFIG.xpEvents.active);
        const sourceShouldBeActive = source.active && source.supported;
        if (xpActive !== sourceShouldBeActive) add("active_state_drift", {
          sourceKind: source.kind, sourceId: source.id, xpEventId: xp.id, sourceKey: key,
          sourceActive: source.active, sourceSupported: source.supported, xpActive,
        });
        if (!sourceShouldBeActive && xpActive) add("inactive_source_supporting_active_xp", {
          sourceKind: source.kind, sourceId: source.id, xpEventId: xp.id, sourceKey: key,
        });
        if (getText(xp, xpTable, CONFIG.xpEvents.xpSource) !== source.expectedSource ||
            getText(xp, xpTable, CONFIG.xpEvents.xpBucket) !== source.expectedBucket) {
          add("wrong_xp_source_or_bucket", {
            sourceId: source.id, xpEventId: xp.id, sourceKey: key,
            expectedSource: source.expectedSource, actualSource: getText(xp, xpTable, CONFIG.xpEvents.xpSource),
            expectedBucket: source.expectedBucket, actualBucket: getText(xp, xpTable, CONFIG.xpEvents.xpBucket),
          });
        }
        if (source.expectedPoints !== null && getNumber(xp, xpTable, CONFIG.xpEvents.xpPoints) !== source.expectedPoints) {
          add("wrong_xp_points", {
            sourceId: source.id, xpEventId: xp.id, sourceKey: key,
            expectedPoints: source.expectedPoints, actualPoints: getNumber(xp, xpTable, CONFIG.xpEvents.xpPoints),
          });
        }
        const expectedWas = wasByPair.get(pairKey(source.enrollmentId, source.weekId)) || [];
        const wasIds = getLinkedIds(xp, xpTable, CONFIG.xpEvents.weeklySummary);
        if (expectedWas.length === 0) add("missing_canonical_was", {
          sourceId: source.id, xpEventId: xp.id, enrollmentId: source.enrollmentId, weekId: source.weekId,
        });
        if (expectedWas.length > 1) add("multiple_canonical_was", {
          sourceId: source.id, xpEventId: xp.id, wasIds: expectedWas.map(row => row.id),
        });
        if (wasIds.length !== 1 || (expectedWas.length === 1 && wasIds[0] !== expectedWas[0].id)) {
          add("missing_wrong_or_multiple_was_on_xp", {
            sourceId: source.id, xpEventId: xp.id, wasIds, expectedWasIds: expectedWas.map(row => row.id),
          });
        }
      }
    }
  }

  for (const xp of xps.records) {
    const key = getText(xp, xpTable, CONFIG.xpEvents.sourceKey);
    const type = keyType(key);
    const linkedUnlocks = getLinkedIds(xp, xpTable, CONFIG.xpEvents.achievementUnlock);
    const linkedStreaks = getLinkedIds(xp, xpTable, CONFIG.xpEvents.streakOccurrence);
    if (!type && (linkedUnlocks.length || linkedStreaks.length)) {
      add("unknown_prefix_on_linked_xp", { xpEventId: xp.id, sourceKey: key, linkedUnlocks, linkedStreaks });
      continue;
    }
    if (!type) continue; // Unrelated XP families are deliberately out of scope.
    const expectedKind = type === "streak" ? "streak" : "unlock";
    const canonicalSources = sourcesByKey.get(key) || [];
    if (canonicalSources.length === 0) add("orphan_canonical_xp", {
      xpEventId: xp.id, sourceKey: key, expectedKind, linkedUnlocks, linkedStreaks,
    });
    const relevantLinks = expectedKind === "unlock" ? linkedUnlocks : linkedStreaks;
    const oppositeLinks = expectedKind === "unlock" ? linkedStreaks : linkedUnlocks;
    if (relevantLinks.length !== 1 || oppositeLinks.length) add("wrong_or_multiple_source_links", {
      xpEventId: xp.id, sourceKey: key, expectedKind, relevantLinks, oppositeLinks,
    });
  }

  const report = {
    script: CONFIG.scriptName, version: CONFIG.version, dryRun: true,
    unlocksChecked: unlocks.records.length, streakOccurrencesChecked: streaks.records.length,
    xpEventsChecked: xps.records.length, weeklySummariesChecked: summaries.records.length,
    issueTotal: Object.values(issues).reduce((sum, count) => sum + count, 0),
    issueCounts: issues, samples,
  };
  console.log("===== ACHIEVEMENT XP PIPELINE INTEGRITY AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
