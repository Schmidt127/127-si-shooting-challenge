/*
Extension Script: Final Pre-Close 090G - Weekly summary email workflow audit
System: 127 SI Shooting Challenge
Purpose:
  Read-only audit of Weekly Athlete Summary email packaging and sending workflow:
  - Automation 072 (build package)
  - Automation 074 (send to Make)
  Active enrollment scope only, with category classification and trigger simulation.

Schema gate: 20260629_045741
Version: v1.0
Default: read-only (no writes, no fetch/webhooks)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 15;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-090g-weekly-summary-email-workflow",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    weeklySummary: "Weekly Athlete Summary",
    enrollments: "Enrollments",
    weeks: "Weeks",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    buildNow: "Build Weekly Email Now?",
    emailReady: "Weekly Email Ready?",
    emailSent: "Weekly Email Sent?",
    sendToMake: "Send to Make?",
    emailSubject: "Weekly Email Subject",
    emailRecipients: "Weekly Email Recipients",
    emailHtml: "Weekly Email HTML",
    emailError: "Weekly Email Error",
    summaryCalculationStatus: "Summary Calculation Status", // optional
  },

  enrollments: {
    active: "Active?",
    parentEmailCleaned: "Parent Email - Cleaned",
    athleteEmailCleaned: "Athlete Email - Cleaned",
  },

  weekEndDateCandidates: ["End Date", "Week End Date", "Ends On", "Week Ending", "End"],
};

const REQUIRED_FIELDS = [
  ["Weekly Athlete Summary", "Enrollment"],
  ["Weekly Athlete Summary", "Week"],
  ["Weekly Athlete Summary", "Build Weekly Email Now?"],
  ["Weekly Athlete Summary", "Weekly Email Ready?"],
  ["Weekly Athlete Summary", "Weekly Email Sent?"],
  ["Weekly Athlete Summary", "Send to Make?"],
  ["Weekly Athlete Summary", "Weekly Email Subject"],
  ["Weekly Athlete Summary", "Weekly Email Recipients"],
  ["Weekly Athlete Summary", "Weekly Email HTML"],
  ["Weekly Athlete Summary", "Weekly Email Error"],
  ["Enrollments", "Active?"],
  ["Enrollments", "Parent Email - Cleaned"],
  ["Enrollments", "Athlete Email - Cleaned"],
];

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function requireSchema(tables) {
  const missing = [];
  for (const [tableName, fieldName] of REQUIRED_FIELDS) {
    const table = tables[tableName];
    if (!table) {
      missing.push(`table:${tableName}`);
      continue;
    }
    if (!fieldExists(table, fieldName)) missing.push(`${tableName}.${fieldName}`);
  }
  if (missing.length) {
    throw new Error(
      `Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`
    );
  }
}

function getText(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getBooleanish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  if (raw === true || raw === 1) return true;
  return String(raw || "").toLowerCase() === "true";
}

function toDateOrNull(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function getAnyDate(record, table, candidateFieldNames) {
  for (const fieldName of candidateFieldNames) {
    if (!fieldExists(table, fieldName)) continue;
    const raw = record.getCellValue(fieldName);
    const dateObj = toDateOrNull(raw);
    if (dateObj) return dateObj;
  }
  return null;
}

function isBlank(text) {
  return !String(text || "").trim();
}

function hasAllPackageParts(subject, recipients, html) {
  return !isBlank(subject) && !isBlank(recipients) && !isBlank(html);
}

function getWeekEligibilityStatus(weekRecord, weeksTable, now) {
  if (!weekRecord || !weeksTable) return { eligible: false, reason: "week_lookup_unavailable" };

  const endDate = getAnyDate(weekRecord, weeksTable, CONFIG.weekEndDateCandidates);
  if (!endDate) return { eligible: false, reason: "week_end_date_missing" };

  return {
    eligible: endDate.getTime() <= now.getTime(),
    reason: endDate.getTime() <= now.getTime() ? "week_ended" : "week_not_ended",
    weekEndDate: endDate.toISOString(),
  };
}

function initCategoryMap() {
  return {
    clean_and_sent: 0,
    should_have_sent_never_built: 0,
    package_built_not_sent: 0,
    missing_recipient: 0,
    missing_enrollment_or_week: 0,
    not_eligible: 0,
    error_blocked: 0,
    needs_manual_review: 0,
  };
}

function emptyCategorySamples() {
  return {
    clean_and_sent: [],
    should_have_sent_never_built: [],
    package_built_not_sent: [],
    missing_recipient: [],
    missing_enrollment_or_week: [],
    not_eligible: [],
    error_blocked: [],
    needs_manual_review: [],
  };
}

function pushCategorySample(samplesByCategory, category, sample) {
  const bucket = samplesByCategory[category];
  if (!bucket) return;
  if (bucket.length < SAMPLE_LIMIT) bucket.push(sample);
}

async function main() {
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  let weeksTable = null;
  try {
    weeksTable = base.getTable(CONFIG.tables.weeks);
  } catch {
    weeksTable = null;
  }

  requireSchema({
    "Weekly Athlete Summary": weeklySummaryTable,
    Enrollments: enrollmentsTable,
  });

  const hasSummaryCalculationStatusField = fieldExists(
    weeklySummaryTable,
    CONFIG.weeklySummary.summaryCalculationStatus
  );

  const enrollmentFields = Object.values(CONFIG.enrollments).filter(name =>
    fieldExists(enrollmentsTable, name)
  );
  const weeklySummaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [enrollmentQuery, weeklySummaryQuery] = await Promise.all([
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: weeklySummaryFields }),
  ]);

  const enrollmentById = new Map();
  const activeEnrollmentIds = new Set();

  for (const enrollment of enrollmentQuery.records) {
    const isActive = getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active);
    const parentEmail = getText(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.parentEmailCleaned
    );
    const athleteEmail = getText(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.athleteEmailCleaned
    );

    enrollmentById.set(enrollment.id, {
      id: enrollment.id,
      isActive,
      parentEmail,
      athleteEmail,
      hasAnyRecipientEmail: !isBlank(parentEmail) || !isBlank(athleteEmail),
    });

    if (isActive) activeEnrollmentIds.add(enrollment.id);
  }

  const weekById = new Map();
  if (weeksTable) {
    const weekFields = CONFIG.weekEndDateCandidates.filter(name => fieldExists(weeksTable, name));
    if (weekFields.length) {
      const weeksQuery = await weeksTable.selectRecordsAsync({ fields: weekFields });
      for (const week of weeksQuery.records) {
        weekById.set(week.id, week);
      }
    }
  }

  const now = new Date();
  const categoryCounts = initCategoryMap();
  const categorySamples = emptyCategorySamples();

  let scopedWeeklySummariesChecked = 0;
  let skippedInactiveEnrollment = 0;

  let trigger072EligibleCount = 0;
  let trigger074EligibleCount = 0;
  const trigger072Sample = [];
  const trigger074Sample = [];

  for (const was of weeklySummaryQuery.records) {
    const enrollmentId = getLinkedIds(
      was,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment
    )[0] || "";
    const weekId = getLinkedIds(was, weeklySummaryTable, CONFIG.weeklySummary.week)[0] || "";

    if (!enrollmentId) {
      // If no enrollment link we still audit it (cannot determine Active?).
    } else {
      const enrollmentMeta = enrollmentById.get(enrollmentId);
      if (enrollmentMeta && !enrollmentMeta.isActive) {
        skippedInactiveEnrollment += 1;
        continue;
      }
    }

    scopedWeeklySummariesChecked += 1;

    const emailReady = getBooleanish(was, weeklySummaryTable, CONFIG.weeklySummary.emailReady);
    const emailSent = getBooleanish(was, weeklySummaryTable, CONFIG.weeklySummary.emailSent);
    const buildNow = getBooleanish(was, weeklySummaryTable, CONFIG.weeklySummary.buildNow);
    const sendToMake = getBooleanish(was, weeklySummaryTable, CONFIG.weeklySummary.sendToMake);

    const subject = getText(was, weeklySummaryTable, CONFIG.weeklySummary.emailSubject);
    const recipients = getText(was, weeklySummaryTable, CONFIG.weeklySummary.emailRecipients);
    const html = getText(was, weeklySummaryTable, CONFIG.weeklySummary.emailHtml);
    const emailError = getText(was, weeklySummaryTable, CONFIG.weeklySummary.emailError);
    const summaryCalculationStatus = hasSummaryCalculationStatusField
      ? getSelectName(was, weeklySummaryTable, CONFIG.weeklySummary.summaryCalculationStatus) ||
        getText(was, weeklySummaryTable, CONFIG.weeklySummary.summaryCalculationStatus)
      : "";

    const hasPackage = hasAllPackageParts(subject, recipients, html);

    const enrollmentMeta = enrollmentId ? enrollmentById.get(enrollmentId) : null;
    const hasAnyRecipientEmail = enrollmentMeta ? enrollmentMeta.hasAnyRecipientEmail : false;

    const weekRecord = weekId ? weekById.get(weekId) : null;
    const eligibility = getWeekEligibilityStatus(weekRecord, weeksTable, now);

    const trigger072Eligible =
      buildNow === true &&
      emailSent === false &&
      Boolean(enrollmentId) &&
      Boolean(weekId);

    const trigger074Eligible =
      emailReady === true &&
      emailSent === false &&
      sendToMake === true &&
      hasPackage;

    if (trigger072Eligible) {
      trigger072EligibleCount += 1;
      if (trigger072Sample.length < SAMPLE_LIMIT) {
        trigger072Sample.push({
          weeklyAthleteSummaryId: was.id,
          enrollmentId,
          weekId,
          buildWeeklyEmailNow: true,
          weeklyEmailSent: false,
        });
      }
    }

    if (trigger074Eligible) {
      trigger074EligibleCount += 1;
      if (trigger074Sample.length < SAMPLE_LIMIT) {
        trigger074Sample.push({
          weeklyAthleteSummaryId: was.id,
          enrollmentId,
          weekId,
          weeklyEmailReady: true,
          weeklyEmailSent: false,
          sendToMake: true,
          hasSubject: !isBlank(subject),
          hasRecipients: !isBlank(recipients),
          hasHtml: !isBlank(html),
        });
      }
    }

    let sendStatusCategory = "needs_manual_review";

    if (!enrollmentId || !weekId) {
      sendStatusCategory = "missing_enrollment_or_week";
    } else if (!isBlank(emailError)) {
      sendStatusCategory = "error_blocked";
    } else if (!hasAnyRecipientEmail) {
      sendStatusCategory = "missing_recipient";
    } else if (emailSent) {
      sendStatusCategory = "clean_and_sent";
    } else if (
      emailReady === true &&
      emailSent === false &&
      hasPackage
    ) {
      sendStatusCategory = "package_built_not_sent";
    } else if (eligibility.eligible && isBlank(html)) {
      sendStatusCategory = "should_have_sent_never_built";
    } else if (!eligibility.eligible) {
      sendStatusCategory = "not_eligible";
    }

    categoryCounts[sendStatusCategory] += 1;
    pushCategorySample(categorySamples, sendStatusCategory, {
      weeklyAthleteSummaryId: was.id,
      enrollmentId,
      weekId,
      sendStatusCategory,
      trigger072Eligible,
      trigger074Eligible,
      weeklyEmailReady: emailReady,
      weeklyEmailSent: emailSent,
      sendToMake,
      buildWeeklyEmailNow: buildNow,
      hasSubject: !isBlank(subject),
      hasRecipients: !isBlank(recipients),
      hasHtml: !isBlank(html),
      hasAnyEnrollmentRecipientEmail: hasAnyRecipientEmail,
      weeklyEmailError: emailError,
      summaryCalculationStatus: summaryCalculationStatus || "",
      eligibilityReason: eligibility.reason,
      weekEndDate: eligibility.weekEndDate || "",
    });
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    readOnly: true,
    noFetchOrWebhooks: true,
    scope: "Weekly Athlete Summary records where Enrollment is Active? (plus records missing enrollment link)",
    activeEnrollmentCount: activeEnrollmentIds.size,
    scopedWeeklySummariesChecked,
    skippedInactiveEnrollment,
    optionalFieldPresence: {
      summaryCalculationStatus: hasSummaryCalculationStatusField,
    },
    triggerSimulation: {
      automation072BuildEligibleCount: trigger072EligibleCount,
      automation072BuildEligibleSample: trigger072Sample,
      automation074SendEligibleCount: trigger074EligibleCount,
      automation074SendEligibleSample: trigger074Sample,
    },
    sendStatusCategoryCounts: categoryCounts,
    sendStatusCategorySamples: categorySamples,
    backfillStrategyNote:
      "Recommend one final challenge summary per family rather than sending N missed weeklies.",
  };

  console.log("===== FINAL 090G - WEEKLY SUMMARY EMAIL WORKFLOW =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
