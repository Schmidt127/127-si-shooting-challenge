/*
Extension Script: Backfill Missing Weekly Summaries + XP Links
System: 127 SI Shooting Challenge
Purpose:
  One-time repair for XP Events that cannot link because no Weekly Athlete Summary
  exists for their Enrollment + Week. Creates the missing summary row(s), then links
  the orphan XP Events.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to create summaries and apply XP links
  - Creates a summary only when zero exist for Enrollment + Week
  - Skips XP links when two or more summaries already exist for the pair
  - XP link writes are capped at BATCH_LIMIT (50) per run; re-run until done

Setup:
  1. Run audit-orphan-xp-events.js and confirm missingSummaryRecordCount > 0
  2. Run this script with DRY_RUN = true
  3. Set CONFIRM_WRITE = true and re-run until remainingXpLinkCount is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 50;

const CONFIG = {
  tables: {
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  xpEvents: {
    name: "XP Event Name",
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    sourceKey: "Source Key",
    xpPoints: "XP Points",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    summaryCalculationStatus: "Summary Calculation Status",
  },

  statusValues: {
    complete: "Complete",
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
    const field = table.getField(fieldName);
    return field.isComputed !== true;
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

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function buildSingleSelectValue(table, fieldName, optionName) {
  if (!fieldExists(table, fieldName)) return undefined;

  const field = table.getField(fieldName);
  if (field.type !== "singleSelect") return optionName;

  const cleanOptionName = String(optionName || "").trim();
  const choices = field?.options?.choices || [];
  const match = choices.find(
    choice => String(choice.name || "").trim().toLowerCase() === cleanOptionName.toLowerCase()
  );

  return match ? { id: match.id } : undefined;
}

function buildSummaryCreateFields(table, enrollmentId, weekId) {
  const fields = {
    [CONFIG.weeklySummary.enrollment]: [{ id: enrollmentId }],
    [CONFIG.weeklySummary.week]: [{ id: weekId }],
  };

  const statusValue = buildSingleSelectValue(
    table,
    CONFIG.weeklySummary.summaryCalculationStatus,
    CONFIG.statusValues.complete
  );

  if (statusValue !== undefined) {
    fields[CONFIG.weeklySummary.summaryCalculationStatus] = statusValue;
  }

  const safeFields = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    if (!fieldExists(table, fieldName)) continue;
    if (!isWritableField(table, fieldName)) continue;
    safeFields[fieldName] = value;
  }

  return safeFields;
}

async function main() {
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  if (!fieldExists(xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
    throw new Error(`Missing field: ${CONFIG.tables.xpEvents}.${CONFIG.xpEvents.weeklySummary}`);
  }

  if (!isWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
    throw new Error(`Field is not writable: ${CONFIG.tables.xpEvents}.${CONFIG.xpEvents.weeklySummary}`);
  }

  const xpFields = Object.values(CONFIG.xpEvents).filter(name =>
    fieldExists(xpEventsTable, name)
  );

  const summaryFields = [
    CONFIG.weeklySummary.enrollment,
    CONFIG.weeklySummary.week,
    CONFIG.weeklySummary.summaryCalculationStatus,
  ].filter(name => fieldExists(weeklySummaryTable, name));

  const [xpQuery, summaryQuery] = await Promise.all([
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const summaryIndex = new Map();

  for (const summaryRecord of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment
    );
    const weekId = getFirstLinkedId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.week
    );

    if (!enrollmentId || !weekId) continue;

    const key = buildSummaryIndexKey(enrollmentId, weekId);

    if (!summaryIndex.has(key)) {
      summaryIndex.set(key, []);
    }

    summaryIndex.get(key).push(summaryRecord.id);
  }

  const orphanXpByPair = new Map();
  const alreadyLinked = [];
  const ambiguousSummaryMatch = [];

  for (const xpRecord of xpQuery.records) {
    const enrollmentId = getFirstLinkedId(
      xpRecord,
      xpEventsTable,
      CONFIG.xpEvents.enrollment
    );
    const weekId = getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.week);
    const weeklySummaryId = getFirstLinkedId(
      xpRecord,
      xpEventsTable,
      CONFIG.xpEvents.weeklySummary
    );

    if (!enrollmentId || !weekId) continue;

    const pairKey = buildSummaryIndexKey(enrollmentId, weekId);
    const existingSummaryIds = summaryIndex.get(pairKey) || [];

    const xpFinding = {
      id: xpRecord.id,
      name: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.name) || xpRecord.name,
      enrollmentId,
      weekId,
      weeklySummaryId,
      sourceKey: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey),
      xpPoints: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints),
    };

    if (weeklySummaryId) {
      alreadyLinked.push(xpFinding);
      continue;
    }

    if (existingSummaryIds.length > 1) {
      ambiguousSummaryMatch.push({
        ...xpFinding,
        existingSummaryIds,
        issue: "multiple_weekly_summary_records_for_enrollment_week",
        recommendedAction: "Review duplicate Weekly Athlete Summary records before linking XP Events",
      });
      continue;
    }

    if (!orphanXpByPair.has(pairKey)) {
      orphanXpByPair.set(pairKey, {
        enrollmentId,
        weekId,
        existingSummaryIds: [...existingSummaryIds],
        xpEvents: [],
      });
    }

    orphanXpByPair.get(pairKey).xpEvents.push(xpFinding);
  }

  const summariesToCreate = [];
  const summariesAlreadyExist = [];
  const xpEventsToLink = [];

  for (const [pairKey, pairData] of orphanXpByPair.entries()) {
    if (pairData.existingSummaryIds.length === 1) {
      const summaryId = pairData.existingSummaryIds[0];
      summariesAlreadyExist.push({
        pairKey,
        enrollmentId: pairData.enrollmentId,
        weekId: pairData.weekId,
        summaryId,
        xpEventCount: pairData.xpEvents.length,
      });

      for (const xpFinding of pairData.xpEvents) {
        xpEventsToLink.push({
          ...xpFinding,
          expectedSummaryId: summaryId,
          action: DRY_RUN ? "would_link" : CONFIRM_WRITE ? "link" : "report_only",
        });
      }
      continue;
    }

    summariesToCreate.push({
      pairKey,
      enrollmentId: pairData.enrollmentId,
      weekId: pairData.weekId,
      xpEventCount: pairData.xpEvents.length,
      xpEvents: pairData.xpEvents,
      action: DRY_RUN ? "would_create_summary" : CONFIRM_WRITE ? "create_summary" : "report_only",
    });

    for (const xpFinding of pairData.xpEvents) {
      xpEventsToLink.push({
        ...xpFinding,
        expectedSummaryId: "",
        pendingSummaryCreateForPair: pairKey,
        action: DRY_RUN ? "would_link_after_create" : CONFIRM_WRITE ? "link_after_create" : "report_only",
      });
    }
  }

  const createdSummaries = [];
  const createdSummaryIdByPair = new Map();

  if (!DRY_RUN && CONFIRM_WRITE) {
    for (const planned of summariesToCreate) {
      const createFields = buildSummaryCreateFields(
        weeklySummaryTable,
        planned.enrollmentId,
        planned.weekId
      );

      if (Object.keys(createFields).length === 0) {
        throw new Error(
          `No writable fields available to create Weekly Athlete Summary for pair ${planned.pairKey}.`
        );
      }

      const summaryId = await weeklySummaryTable.createRecordAsync(createFields);

      createdSummaries.push({
        pairKey: planned.pairKey,
        enrollmentId: planned.enrollmentId,
        weekId: planned.weekId,
        summaryId,
        xpEventCount: planned.xpEventCount,
        action: "created_summary",
      });

      createdSummaryIdByPair.set(planned.pairKey, summaryId);

      const existing = summaryIndex.get(planned.pairKey) || [];
      existing.push(summaryId);
      summaryIndex.set(planned.pairKey, existing);
    }
  }

  function resolveSummaryIdForLink(item) {
    if (item.expectedSummaryId) return item.expectedSummaryId;

    if (!DRY_RUN && CONFIRM_WRITE) {
      return createdSummaryIdByPair.get(item.pendingSummaryCreateForPair) || "";
    }

    if (item.pendingSummaryCreateForPair) {
      return `NEW_SUMMARY_FOR_${item.pendingSummaryCreateForPair}`;
    }

    return "";
  }

  const plannedLinks = xpEventsToLink.map(item => ({
    ...item,
    resolvedSummaryId: resolveSummaryIdForLink(item),
  }));

  const linkBatch = plannedLinks
    .filter(item => item.resolvedSummaryId)
    .slice(0, BATCH_LIMIT);

  const linkedRecords = [];

  if (!DRY_RUN && CONFIRM_WRITE && linkBatch.length > 0) {
    const updates = linkBatch.map(item => ({
      id: item.id,
      fields: {
        [CONFIG.xpEvents.weeklySummary]: [{ id: item.resolvedSummaryId }],
      },
    }));

    await xpEventsTable.updateRecordsAsync(updates);

    for (const item of linkBatch) {
      linkedRecords.push({
        id: item.id,
        name: item.name,
        expectedSummaryId: item.resolvedSummaryId,
        action: "linked",
      });
    }
  }

  const remainingXpLinkCount = Math.max(0, plannedLinks.length - linkBatch.length);

  const report = {
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    xpEventsChecked: xpQuery.records.length,
    alreadyLinkedCount: alreadyLinked.length,
    orphanPairCount: orphanXpByPair.size,
    summariesToCreateCount: summariesToCreate.length,
    summariesAlreadyExistCount: summariesAlreadyExist.length,
    xpEventsToLinkCount: xpEventsToLink.length,
    ambiguousSummaryMatchCount: ambiguousSummaryMatch.length,
    summariesCreatedCount: createdSummaries.length,
    xpLinksPlannedCount: linkBatch.length,
    xpLinksAppliedCount: linkedRecords.length,
    remainingXpLinkCount,
    summariesToCreate,
    summariesAlreadyExist,
    createdSummaries,
    xpEventsToLink: plannedLinks,
    linkedRecords,
    ambiguousSummaryMatch,
  };

  console.log("===== MISSING WEEKLY SUMMARY + XP LINK BACKFILL =====");
  console.log(JSON.stringify(report, null, 2));

  if (
    summariesToCreate.length === 0 &&
    xpEventsToLink.length === 0 &&
    ambiguousSummaryMatch.length === 0
  ) {
    console.log("No orphan XP Events need missing Weekly Athlete Summary repair.");
    return;
  }

  if (DRY_RUN) {
    console.log("DRY_RUN is true. No records were created or updated.");
    console.log(
      `Set DRY_RUN = false and CONFIRM_WRITE = true to create ${summariesToCreate.length} summary row(s) and link up to ${Math.min(xpEventsToLink.length, BATCH_LIMIT)} XP Event(s).`
    );
    return;
  }

  if (!CONFIRM_WRITE) {
    console.log("Set CONFIRM_WRITE = true to apply the changes listed above.");
    return;
  }

  console.log(`Created ${createdSummaries.length} Weekly Athlete Summary record(s).`);
  console.log(`Linked ${linkedRecords.length} XP Event record(s).`);

  if (remainingXpLinkCount > 0) {
    console.log(`${remainingXpLinkCount} XP Event link(s) remain. Re-run until remainingXpLinkCount is 0.`);
  }
}

await main();
