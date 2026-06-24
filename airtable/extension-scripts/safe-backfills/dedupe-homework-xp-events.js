/*
Extension Script: Dedupe Homework XP Events
System: 127 SI Shooting Challenge
Purpose:
  Removes extra Homework XP Events when a Homework Completion has both a legacy
  HOMEWORK_COMPLETION| event and a newer HOMEWORK_XP| duplicate (or two linked events).
  Keeps the canonical HOMEWORK_XP| record when present; otherwise keeps the best match
  and repairs its Source Key on the next backfill pass.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_DELETE = true to delete duplicate XP Event records
  - Run audit-homework-pipeline-integrity.js first; run this before repair_source_key backfill

Setup:
  1. Run audit-homework-pipeline-integrity.js (duplicate_xp_event > 0)
  2. Run this script with DRY_RUN = true; review keep/delete plan
  3. Set CONFIRM_DELETE = true and re-run until remainingCount is 0
  4. Run backfill-homework-xp-from-reviewed.js for source key + points repairs
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_DELETE = false;
const BATCH_LIMIT = 25;

const CONFIG = {
  scriptName: "dedupe-homework-xp-events",
  version: "v1.1",

  tables: {
    homework: "Homework Completions",
    xpEvents: "XP Events",
  },

  homework: {
    xpEvents: "XP Events",
    totalXp: "Total Homework XP Awarded",
  },

  xpEvents: {
    sourceKey: "Source Key",
    homeworkCompletion: "Homework Completion",
    xpPoints: "XP Points",
  },

  values: {
    sourceKeyPrefix: "HOMEWORK_XP|",
    legacySourceKeyPrefix: "HOMEWORK_COMPLETION|",
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

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function linkedCell(ids) {
  return ids.filter(Boolean).map(id => ({ id }));
}

function buildSourceKey(homeworkId) {
  return `${CONFIG.values.sourceKeyPrefix}${homeworkId}`;
}

function buildLegacySourceKey(homeworkId) {
  return `${CONFIG.values.legacySourceKeyPrefix}${homeworkId}`;
}

function findXpMatches(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();

  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (!xp) continue;
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const linkedHomework = getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.homeworkCompletion);
    if (
      sourceKey === buildSourceKey(homeworkId) ||
      sourceKey === buildLegacySourceKey(homeworkId) ||
      linkedHomework.includes(homeworkId)
    ) {
      ids.add(xpId);
    }
  }

  for (const sourceKey of [buildSourceKey(homeworkId), buildLegacySourceKey(homeworkId)]) {
    for (const xpId of xpBySourceKey.get(sourceKey) || []) {
      ids.add(xpId);
    }
  }

  return [...ids];
}

function scoreXpKeeper(xp, homeworkId, linkedXpIds, homeworkTotalXp, xpEventsTable) {
  const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const points = getNumberish(xp, xpEventsTable, CONFIG.xpEvents.xpPoints);
  const linkIndex = linkedXpIds.indexOf(xp.id);
  const linksBackToHomework = getLinkedIds(
    xp,
    xpEventsTable,
    CONFIG.xpEvents.homeworkCompletion
  ).includes(homeworkId);

  let score = 0;
  let keeperReason = "";

  if (sourceKey === buildSourceKey(homeworkId)) {
    score += 100;
    keeperReason = "canonical_source_key";
  } else if (sourceKey === buildLegacySourceKey(homeworkId)) {
    score += 50;
    keeperReason = "legacy_source_key";
  } else if (linksBackToHomework) {
    score += 25;
    keeperReason = "homework_completion_link";
  }

  if (homeworkTotalXp > 0 && points === homeworkTotalXp) score += 10;
  if (linkIndex === 0) {
    score += 20;
    keeperReason = keeperReason || "primary_homework_link";
  } else if (linkIndex > 0) {
    score += 10 - Math.min(linkIndex, 9);
  }
  if (linksBackToHomework) score += 5;

  return { score, keeperReason: keeperReason || "fallback_rank" };
}

function pickKeeperAndDuplicates(xpIds, homeworkId, linkedXpIds, homeworkTotalXp, xpQuery, xpEventsTable) {
  const ranked = xpIds
    .map(xpId => {
      const xp = xpQuery.getRecord(xpId);
      const scored = xp
        ? scoreXpKeeper(xp, homeworkId, linkedXpIds, homeworkTotalXp, xpEventsTable)
        : { score: -1, keeperReason: "" };
      return {
        xpId,
        score: scored.score,
        keeperReason: scored.keeperReason,
        sourceKey: xp ? getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey) : "",
        points: xp ? getNumberish(xp, xpEventsTable, CONFIG.xpEvents.xpPoints) : 0,
        linkIndex: linkedXpIds.indexOf(xpId),
      };
    })
    .filter(row => row.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.linkIndex >= 0 ? a.linkIndex : 99) - (b.linkIndex >= 0 ? b.linkIndex : 99) ||
        a.xpId.localeCompare(b.xpId)
    );

  const keeper = ranked[0] || null;
  const deleteIds = ranked.slice(1).map(row => row.xpId);
  return { keeper, deleteIds, ranked };
}

async function main() {
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [homeworkQuery, xpQuery] = await Promise.all([
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const candidates = [];

  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkId = homeworkRecord.id;
    const linkedXpIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents);
    const xpIds = findXpMatches(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey);
    if (xpIds.length < 2) continue;

    const totalXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp);
    const { keeper, deleteIds, ranked } = pickKeeperAndDuplicates(
      xpIds,
      homeworkId,
      linkedXpIds,
      totalXp,
      xpQuery,
      xpEventsTable
    );

    if (!keeper || deleteIds.length === 0) continue;

    candidates.push({
      homeworkId,
      name: homeworkRecord.name,
      keeperXpEventId: keeper.xpId,
      keeperSourceKey: keeper.sourceKey,
      keeperReason: keeper.keeperReason,
      keeperPoints: keeper.points,
      deleteXpEventIds: deleteIds,
      ranked,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      if (!DRY_RUN && CONFIRM_DELETE) {
        for (const xpEventId of row.deleteXpEventIds) {
          await xpEventsTable.deleteRecordAsync(xpEventId);
        }

        if (isWritableField(homeworkTable, CONFIG.homework.xpEvents)) {
          await homeworkTable.updateRecordAsync(row.homeworkId, {
            [CONFIG.homework.xpEvents]: linkedCell([row.keeperXpEventId]),
          });
        }
      }

      applied.push({
        ...row,
        dryRun: DRY_RUN || !CONFIRM_DELETE,
      });
    } catch (error) {
      errors.push({
        homeworkId: row.homeworkId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmDelete: CONFIRM_DELETE,
    batchLimit: BATCH_LIMIT,
    candidateCount: candidates.length,
    batchCount: batch.length,
    deleteCountPlanned: batch.reduce((sum, row) => sum + row.deleteXpEventIds.length, 0),
    appliedCount: DRY_RUN || !CONFIRM_DELETE ? 0 : applied.length,
    remainingCount: Math.max(0, candidates.length - batch.length),
    errors,
    sample: applied.slice(0, 15),
  };

  console.log("===== DEDUPE HOMEWORK XP EVENTS =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
