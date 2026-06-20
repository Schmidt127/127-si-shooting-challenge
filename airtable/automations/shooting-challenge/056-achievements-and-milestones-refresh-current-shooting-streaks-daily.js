/*
Automation: 056 - Achievements and Milestones - Refresh Current Shooting Streaks Daily
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
To be confirmed from production script.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
To be confirmed from production script.

Important Fields:
To be confirmed from production script.

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * 056 - ACHIEVEMENTS AND MILESTONES
 * Refresh Current Shooting Streaks Daily
 *
 * Version: v1.2
 * Date First Written: 2026-05-26
 * Last Updated: 2026-05-26
 *
 * PURPOSE
 * - Runs once per day on a schedule.
 * - Reads all active Enrollments.
 * - Reads all counted Submissions.
 * - Uses Activity Date, not Submitted At or created time.
 * - Safely parses Airtable date-only fields without timezone shifting.
 * - Calculates each athlete’s current active shooting streak through yesterday.
 * - Writes the result to Enrollments:
 *   - Current Shooting Streak
 *   - Current Shooting Streak As Of
 *   - Current Shooting Streak Status
 *   - Current Shooting Streak Last Checked At
 *
 * IMPORTANT LOGIC
 * - This is the daily truth-check.
 * - It checks through yesterday because today may still be in progress.
 * - If the athlete has a counted Activity Date for yesterday, it counts backward from yesterday.
 * - If the athlete does not have a counted Activity Date for yesterday, it sets Current Shooting Streak = 0.
 * - Back-dated submissions are included because the script uses Activity Date.
 * - Multiple submissions on the same Activity Date count as one streak day.
 *
 * FOLDER
 * - 05 - Achievements and Milestones
 *
 * AUTOMATION NAME
 * - 056 - Achievements and Milestones - Refresh Current Shooting Streaks Daily
 *
 * TRIGGER TYPE
 * - Scheduled time
 *
 * RECOMMENDED SCHEDULE
 * - Daily at 3:15 AM America/Denver
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
========================================================= */

const CONFIG = {
  scriptName: "056 - Achievements and Milestones - Refresh Current Shooting Streaks Daily",
  version: "v1.2",
  timeZone: "America/Denver",

  tables: {
    submissions: "Submissions",
    enrollments: "Enrollments",
  },

  submissions: {
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    countThisSubmission: "Count This Submission?",
  },

  enrollments: {
    active: "Active?",
    currentStreak: "Current Shooting Streak",
    currentStreakAsOf: "Current Shooting Streak As Of",
    currentStreakStatus: "Current Shooting Streak Status",
    currentStreakLastCheckedAt: "Current Shooting Streak Last Checked At",
  },

  statuses: {
    active: "Active",
    broken: "Broken",
    noSubmissions: "No Submissions",
  },
};

/* =========================================================
   SECTION 2: TABLE REFERENCES
========================================================= */

const submissionsTable = base.getTable(CONFIG.tables.submissions);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

/* =========================================================
   SECTION 3: HELPER FUNCTIONS
========================================================= */

function fieldExists(table, fieldName) {
  if (!table || !fieldName) return false;

  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
  }
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getLinkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => item?.id)
    .filter(Boolean);
}

function isTruthyValue(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (raw === true) return true;
  if (raw === false) return false;

  if (typeof raw === "number") {
    return raw > 0;
  }

  const text = String(raw ?? "").trim().toLowerCase();

  return ["true", "yes", "checked", "1", "count", "counted"].includes(text);
}

function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(part => part.type === "year")?.value;
  const month = parts.find(part => part.type === "month")?.value;
  const day = parts.find(part => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not determine today's date key.");
  }

  return `${year}-${month}-${day}`;
}

function subtractOneDayFromDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "")
    .split("-")
    .map(value => Number(value));

  if (!year || !month || !day) return "";

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getYesterdayDateKey() {
  return subtractOneDayFromDateKey(getTodayDateKey());
}

function dateKeyToAirtableDate(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);

  if (!year || !month || !day) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getActivityDateKey(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";

  const text = String(record.getCellValueAsString(fieldName) || "").trim();

  if (!text) return "";

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];

    return `${year}-${month}-${day}`;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const raw = getRaw(record, table, fieldName);

  if (raw) {
    const rawText = String(raw || "").trim();
    const rawIsoMatch = rawText.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (rawIsoMatch) {
      return `${rawIsoMatch[1]}-${rawIsoMatch[2]}-${rawIsoMatch[3]}`;
    }
  }

  throw new Error(`Could not parse Activity Date: "${text}"`);
}

function findMostRecentDateKey(dateKeys) {
  const sorted = [...dateKeys].sort();
  return sorted.length ? sorted[sorted.length - 1] : "";
}

function buildSingleSelectValue(table, fieldName, optionName) {
  if (!fieldExists(table, fieldName)) return optionName;

  const field = table.getField(fieldName);

  if (field.type !== "singleSelect") {
    return optionName;
  }

  const choices = field?.options?.choices || [];

  const match = choices.find(choice =>
    String(choice?.name || "").trim().toLowerCase() ===
    String(optionName || "").trim().toLowerCase()
  );

  if (!match) {
    throw new Error(`Missing single-select option "${optionName}" in ${table.name}.${fieldName}`);
  }

  return { id: match.id };
}

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore output mapping errors.
  }
}

function validateRequiredFields() {
  requireField(submissionsTable, CONFIG.submissions.enrollment);
  requireField(submissionsTable, CONFIG.submissions.activityDate);
  requireField(submissionsTable, CONFIG.submissions.countThisSubmission);

  requireField(enrollmentsTable, CONFIG.enrollments.active);
  requireField(enrollmentsTable, CONFIG.enrollments.currentStreak);
  requireField(enrollmentsTable, CONFIG.enrollments.currentStreakAsOf);
  requireField(enrollmentsTable, CONFIG.enrollments.currentStreakStatus);
  requireField(enrollmentsTable, CONFIG.enrollments.currentStreakLastCheckedAt);
}

async function updateRecordsInBatches(table, updates) {
  let remaining = [...updates];

  while (remaining.length > 0) {
    const batch = remaining.slice(0, 50);
    await table.updateRecordsAsync(batch);
    remaining = remaining.slice(50);
  }
}

/* =========================================================
   SECTION 4: STREAK LOGIC
========================================================= */

function calculateStreakEndingAt(dateKeys, anchorDateKey) {
  if (!anchorDateKey || !dateKeys.has(anchorDateKey)) {
    return 0;
  }

  let streak = 0;
  let currentDateKey = anchorDateKey;

  while (dateKeys.has(currentDateKey)) {
    streak += 1;
    currentDateKey = subtractOneDayFromDateKey(currentDateKey);
  }

  return streak;
}

/* =========================================================
   SECTION 5: MAIN
========================================================= */

async function main() {
  validateRequiredFields();

  const todayKey = getTodayDateKey();
  const anchorDateKey = getYesterdayDateKey();
  const checkedAt = new Date().toISOString();

  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [
      CONFIG.enrollments.active,
      CONFIG.enrollments.currentStreak,
      CONFIG.enrollments.currentStreakAsOf,
      CONFIG.enrollments.currentStreakStatus,
      CONFIG.enrollments.currentStreakLastCheckedAt,
    ],
  });

  const submissionQuery = await submissionsTable.selectRecordsAsync({
    fields: [
      CONFIG.submissions.enrollment,
      CONFIG.submissions.activityDate,
      CONFIG.submissions.countThisSubmission,
    ],
  });

  const dateKeysByEnrollmentId = new Map();

  for (const submission of submissionQuery.records) {
    const shouldCount = isTruthyValue(
      submission,
      submissionsTable,
      CONFIG.submissions.countThisSubmission
    );

    if (!shouldCount) continue;

    const linkedEnrollmentIds = getLinkedIds(
      submission,
      submissionsTable,
      CONFIG.submissions.enrollment
    );

    if (!linkedEnrollmentIds.length) continue;

    const activityDateKey = getActivityDateKey(
      submission,
      submissionsTable,
      CONFIG.submissions.activityDate
    );

    if (!activityDateKey) continue;

    for (const enrollmentId of linkedEnrollmentIds) {
      if (!dateKeysByEnrollmentId.has(enrollmentId)) {
        dateKeysByEnrollmentId.set(enrollmentId, new Set());
      }

      dateKeysByEnrollmentId.get(enrollmentId).add(activityDateKey);
    }
  }

  const updates = [];

  let processedCount = 0;
  let activeStreakCount = 0;
  let brokenCount = 0;
  let noSubmissionCount = 0;
  let skippedInactiveCount = 0;

  for (const enrollment of enrollmentQuery.records) {
    const isActive = isTruthyValue(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.active
    );

    if (!isActive) {
      skippedInactiveCount += 1;
      continue;
    }

    const dateKeys = dateKeysByEnrollmentId.get(enrollment.id) || new Set();

    const fields = {
      [CONFIG.enrollments.currentStreakLastCheckedAt]: checkedAt,
    };

    if (!dateKeys.size) {
      fields[CONFIG.enrollments.currentStreak] = 0;
      fields[CONFIG.enrollments.currentStreakAsOf] = null;
      fields[CONFIG.enrollments.currentStreakStatus] = buildSingleSelectValue(
        enrollmentsTable,
        CONFIG.enrollments.currentStreakStatus,
        CONFIG.statuses.noSubmissions
      );

      updates.push({
        id: enrollment.id,
        fields,
      });

      processedCount += 1;
      noSubmissionCount += 1;
      continue;
    }

    const mostRecentDateKey = findMostRecentDateKey(dateKeys);

    if (!dateKeys.has(anchorDateKey)) {
      fields[CONFIG.enrollments.currentStreak] = 0;
      fields[CONFIG.enrollments.currentStreakAsOf] = dateKeyToAirtableDate(mostRecentDateKey);
      fields[CONFIG.enrollments.currentStreakStatus] = buildSingleSelectValue(
        enrollmentsTable,
        CONFIG.enrollments.currentStreakStatus,
        CONFIG.statuses.broken
      );

      updates.push({
        id: enrollment.id,
        fields,
      });

      processedCount += 1;
      brokenCount += 1;
      continue;
    }

    const currentStreak = calculateStreakEndingAt(dateKeys, anchorDateKey);

    fields[CONFIG.enrollments.currentStreak] = currentStreak;
    fields[CONFIG.enrollments.currentStreakAsOf] = dateKeyToAirtableDate(anchorDateKey);
    fields[CONFIG.enrollments.currentStreakStatus] = buildSingleSelectValue(
      enrollmentsTable,
      CONFIG.enrollments.currentStreakStatus,
      CONFIG.statuses.active
    );

    updates.push({
      id: enrollment.id,
      fields,
    });

    processedCount += 1;
    activeStreakCount += 1;
  }

  await updateRecordsInBatches(enrollmentsTable, updates);

  setOutputSafe("statusOut", "success");
  setOutputSafe("todayKey", todayKey);
  setOutputSafe("anchorDateKey", anchorDateKey);
  setOutputSafe("processedCount", processedCount);
  setOutputSafe("activeStreakCount", activeStreakCount);
  setOutputSafe("brokenCount", brokenCount);
  setOutputSafe("noSubmissionCount", noSubmissionCount);
  setOutputSafe("skippedInactiveCount", skippedInactiveCount);
  setOutputSafe("updateCount", updates.length);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: "success",
    todayKey,
    anchorDateKey,
    processedCount,
    activeStreakCount,
    brokenCount,
    noSubmissionCount,
    skippedInactiveCount,
    updateCount: updates.length,
  }, null, 2));
}

/* =========================================================
   SECTION 6: RUN
========================================================= */

await main();
