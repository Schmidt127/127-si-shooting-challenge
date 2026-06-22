/*
Extension Script: Backfill XP Event → Weekly Athlete Summary Links
System: 127 SI Shooting Challenge
Purpose:
  Links XP Events that have Enrollment + Week but no Weekly Athlete Summary link
  when a matching Weekly Athlete Summary record exists.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply links
  - BATCH_LIMIT caps writes per run (default 50); re-run until remainingCount is 0
  - Optional filters: CONFIG.enrollmentRecordId and/or CONFIG.weekRecordId

Setup:
  1. Run audit-orphan-xp-events.js and review missingLinkCount
  2. Run this script with DRY_RUN = true
  3. Set CONFIRM_WRITE = true and re-run in batches until complete
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 50;

const CONFIG = {
  enrollmentRecordId: "",
  weekRecordId: "",

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

function matchesFilter(recordId, filterId) {
  const cleanFilter = String(filterId || "").trim();
  if (!cleanFilter) return true;
  return recordId === cleanFilter;
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

  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

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

    summaryIndex.set(buildSummaryIndexKey(enrollmentId, weekId), summaryRecord.id);
  }

  const toLink = [];
  const alreadyLinked = [];
  const missingSummaryRecord = [];
  const skippedFilter = [];

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

    if (
      !matchesFilter(enrollmentId, CONFIG.enrollmentRecordId) ||
      !matchesFilter(weekId, CONFIG.weekRecordId)
    ) {
      skippedFilter.push(xpRecord.id);
      continue;
    }

    const expectedSummaryId = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || "";

    const baseFinding = {
      id: xpRecord.id,
      name: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.name) || xpRecord.name,
      enrollmentId,
      weekId,
      weeklySummaryId,
      expectedSummaryId,
      sourceKey: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey),
      xpPoints: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints),
    };

    if (weeklySummaryId) {
      alreadyLinked.push(baseFinding);
      continue;
    }

    if (expectedSummaryId) {
      toLink.push({
        ...baseFinding,
        action: DRY_RUN ? "would_link" : CONFIRM_WRITE ? "link" : "report_only",
      });
      continue;
    }

    missingSummaryRecord.push({
      ...baseFinding,
      issue: "no_weekly_summary_record_for_enrollment_week",
      recommendedAction: "Create Weekly Athlete Summary for enrollment + week first",
    });
  }

  const batch = toLink.slice(0, BATCH_LIMIT);
  const remainingAfterBatch = Math.max(0, toLink.length - batch.length);
  const linkedRecords = [];

  if (!DRY_RUN && CONFIRM_WRITE && batch.length > 0) {
    const updates = batch.map(item => ({
      id: item.id,
      fields: {
        [CONFIG.xpEvents.weeklySummary]: [{ id: item.expectedSummaryId }],
      },
    }));

    await xpEventsTable.updateRecordsAsync(updates);

    for (const item of batch) {
      linkedRecords.push({
        id: item.id,
        name: item.name,
        expectedSummaryId: item.expectedSummaryId,
        action: "linked",
      });
    }
  }

  const report = {
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    filters: {
      enrollmentRecordId: CONFIG.enrollmentRecordId || null,
      weekRecordId: CONFIG.weekRecordId || null,
    },
    xpEventsChecked: xpQuery.records.length,
    alreadyLinkedCount: alreadyLinked.length,
    missingLinkCount: toLink.length,
    missingSummaryRecordCount: missingSummaryRecord.length,
    skippedByFilterCount: skippedFilter.length,
    batchPlannedCount: batch.length,
    batchAppliedCount: linkedRecords.length,
    remainingAfterBatch,
    batchPlanned: batch,
    linkedRecords,
    missingSummaryRecord,
  };

  console.log("===== XP EVENT WEEKLY SUMMARY LINK BACKFILL =====");
  console.log(JSON.stringify(report, null, 2));

  if (toLink.length === 0) {
    console.log("No XP Events need Weekly Athlete Summary links.");
    return;
  }

  if (DRY_RUN) {
    console.log("DRY_RUN is true. No records were updated.");
    console.log(`Set DRY_RUN = false and CONFIRM_WRITE = true to link the first ${batch.length} record(s).`);
    return;
  }

  if (!CONFIRM_WRITE) {
    console.log("Set CONFIRM_WRITE = true to apply the links listed above.");
    return;
  }

  console.log(`Linked ${linkedRecords.length} XP Event record(s).`);

  if (remainingAfterBatch > 0) {
    console.log(`${remainingAfterBatch} record(s) remain. Re-run this script until remainingAfterBatch is 0.`);
  }
}

await main();
