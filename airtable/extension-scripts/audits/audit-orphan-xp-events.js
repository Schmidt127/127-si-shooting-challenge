/*
Extension Script: Audit Orphan XP Events (Missing Weekly Athlete Summary)
System: 127 SI Shooting Challenge
Purpose:
  Read-only report of XP Events that should link to Weekly Athlete Summary but do not.

Default: read-only (no writes)
*/

// @ts-nocheck

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
    active: "Active?",
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

async function main() {
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

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

  const missingLink = [];
  const missingSummaryRecord = [];
  const okLinked = [];

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
      okLinked.push(baseFinding);
      continue;
    }

    if (expectedSummaryId) {
      missingLink.push({
        ...baseFinding,
        issue: "missing_weekly_summary_link",
        recommendedAction: "Re-run source XP automation or safe backfill link",
      });
      continue;
    }

    missingSummaryRecord.push({
      ...baseFinding,
      issue: "no_weekly_summary_record_for_enrollment_week",
      recommendedAction: "Create Weekly Athlete Summary for enrollment + week first",
    });
  }

  const report = {
    dryRun: true,
    xpEventsChecked: xpQuery.records.length,
    okLinkedCount: okLinked.length,
    missingLinkCount: missingLink.length,
    missingSummaryRecordCount: missingSummaryRecord.length,
    missingLink,
    missingSummaryRecord,
  };

  console.log("===== ORPHAN XP EVENT AUDIT =====");
  console.log(JSON.stringify(report, null, 2));

  if (missingLink.length === 0 && missingSummaryRecord.length === 0) {
    console.log("No orphan XP Events found.");
  }
}

await main();
