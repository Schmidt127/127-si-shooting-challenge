/*
Extension Script: Audit Orphan XP Events (Missing Weekly Athlete Summary)
System: 127 SI Shooting Challenge
Purpose:
  Read-only report of XP Events that should link to Weekly Athlete Summary but do not.
  Also classifies XP rows missing Enrollment or Week (cannot resolve WAS).

Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const CONFIG = {
  scriptName: "audit-orphan-xp-events",
  version: "v1.1",

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
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
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

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
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

function pushSample(bucket, row) {
  if (bucket.length < SAMPLE_LIMIT) bucket.push(row);
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
    const weekId = getFirstLinkedId(summaryRecord, weeklySummaryTable, CONFIG.weeklySummary.week);

    if (!enrollmentId || !weekId) continue;

    summaryIndex.set(buildSummaryIndexKey(enrollmentId, weekId), summaryRecord.id);
  }

  const missingLinkSample = [];
  const missingSummaryRecordSample = [];
  const missingEnrollmentOrWeekSample = [];
  let okLinkedCount = 0;
  let missingLinkCount = 0;
  let missingSummaryRecordCount = 0;
  let missingEnrollmentOrWeekCount = 0;

  for (const xpRecord of xpQuery.records) {
    const enrollmentId = getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment);
    const weekId = getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.week);
    const weeklySummaryId = getFirstLinkedId(
      xpRecord,
      xpEventsTable,
      CONFIG.xpEvents.weeklySummary
    );

    const baseFinding = {
      id: xpRecord.id,
      name: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.name) || xpRecord.name,
      enrollmentId,
      weekId,
      weeklySummaryId,
      sourceKey: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey),
      xpSource: getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpSource),
      xpBucket: getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpBucket),
      xpPoints: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints),
    };

    if (!enrollmentId || !weekId) {
      missingEnrollmentOrWeekCount += 1;
      pushSample(missingEnrollmentOrWeekSample, {
        ...baseFinding,
        issue: "missing_enrollment_or_week",
        recommendedAction: "Link Enrollment + Week on XP Event, or archive if invalid",
      });
      continue;
    }

    if (weeklySummaryId) {
      okLinkedCount += 1;
      continue;
    }

    const expectedSummaryId = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || "";

    if (expectedSummaryId) {
      missingLinkCount += 1;
      pushSample(missingLinkSample, {
        ...baseFinding,
        expectedSummaryId,
        issue: "missing_weekly_summary_link",
        recommendedAction:
          "Run backfill-xp-event-weekly-summary-links.js or re-run source XP automation",
      });
      continue;
    }

    missingSummaryRecordCount += 1;
    pushSample(missingSummaryRecordSample, {
      ...baseFinding,
      issue: "no_weekly_summary_record_for_enrollment_week",
      recommendedAction: "Run backfill-missing-weekly-summaries-and-xp-links.js first",
    });
  }

  const issueTotal = missingLinkCount + missingSummaryRecordCount + missingEnrollmentOrWeekCount;

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    xpEventsChecked: xpQuery.records.length,
    okLinkedCount,
    issueTotal,
    missingLinkCount,
    missingSummaryRecordCount,
    missingEnrollmentOrWeekCount,
    missingLinkSample,
    missingSummaryRecordSample,
    missingEnrollmentOrWeekSample,
    recommendedAction:
      issueTotal === 0
        ? "No orphan XP Events — WAS linkage is clean."
        : "Fix missing WAS records first, then link XP → WAS via safe backfills.",
  };

  console.log("===== ORPHAN XP EVENT AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
