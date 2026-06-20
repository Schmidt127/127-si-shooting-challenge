/*
Automation: 055 - Achievements and Milestones - Recalculate Current Shooting Streak from Submission
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
 * 055 - ACHIEVEMENTS AND MILESTONES
 * Recalculate Current Shooting Streak from Submission
 *
 * Version: v3.2
 * Date First Written: 2026-05-26
 * Last Updated: 2026-05-26
 *
 * PURPOSE
 * - Runs from one counted Submissions record.
 * - Reads the linked Enrollment.
 * - Reads all counted Submissions for that Enrollment.
 * - Uses Activity Date, not Submitted At or created time.
 * - Safely parses Airtable date-only fields without timezone shifting.
 * - Finds the most recent counted Activity Date for the Enrollment.
 * - Counts backward one calendar day at a time until a missed day is found.
 * - Writes the result to Enrollments:
 *   - Current Shooting Streak
 *   - Current Shooting Streak As Of
 *   - Current Shooting Streak Status
 *   - Current Shooting Streak Last Checked At
 *
 * IMPORTANT LOGIC
 * - If the most recent counted Activity Date is today or yesterday, the streak is Active.
 * - If the most recent counted Activity Date is older than yesterday, the streak is Broken and set to 0.
 * - Back-dated submissions are handled because the script recalculates from all Activity Dates.
 * - Multiple submissions on the same Activity Date count as one streak day.
 *
 * FOLDER
 * - 05 - Achievements and Milestones
 *
 * AUTOMATION NAME
 * - 055 - Achievements and Milestones - Recalculate Current Shooting Streak from Submission
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Enrollment is not empty
 * - Activity Date is not empty
 * - Count This Submission? = 1
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submissions record
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
========================================================= */

const CONFIG = {
  scriptName: "055 - Achievements and Milestones - Recalculate Current Shooting Streak from Submission",
  version: "v3.2",
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

function getFirstLinkedId(record, table, fieldName) {
  const ids = getLinkedIds(record, table, fieldName);
  return ids[0] || "";
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

  requireField(enrollmentsTable, CONFIG.enrollments.currentStreak);
  requireField(enrollmentsTable, CONFIG.enrollments.currentStreakAsOf);
  requireField(enrollmentsTable, CONFIG.enrollments.currentStreakStatus);
  requireField(enrollmentsTable, CONFIG.enrollments.currentStreakLastCheckedAt);
}

/* =========================================================
   SECTION 4: STREAK LOGIC
========================================================= */

async function getCountedSubmissionDateKeysForEnrollment(enrollmentId) {
  const query = await submissionsTable.selectRecordsAsync({
    fields: [
      CONFIG.submissions.enrollment,
      CONFIG.submissions.activityDate,
      CONFIG.submissions.countThisSubmission,
    ],
  });

  const dateKeys = new Set();

  for (const record of query.records) {
    const linkedEnrollmentIds = getLinkedIds(
      record,
      submissionsTable,
      CONFIG.submissions.enrollment
    );

    if (!linkedEnrollmentIds.includes(enrollmentId)) continue;

    const shouldCount = isTruthyValue(
      record,
      submissionsTable,
      CONFIG.submissions.countThisSubmission
    );

    if (!shouldCount) continue;

    const dateKey = getActivityDateKey(
      record,
      submissionsTable,
      CONFIG.submissions.activityDate
    );

    if (dateKey) {
      dateKeys.add(dateKey);
    }
  }

  return dateKeys;
}

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
  const cfg = input.config();

  const recordId = String(cfg.recordId || "").trim();

  if (!recordId) {
    throw new Error("Missing required input: recordId");
  }

  validateRequiredFields();

  const submissionRecord = await submissionsTable.selectRecordAsync(recordId);

  if (!submissionRecord) {
    throw new Error(`Submission record not found: ${recordId}`);
  }

  const enrollmentId = getFirstLinkedId(
    submissionRecord,
    submissionsTable,
    CONFIG.submissions.enrollment
  );

  if (!enrollmentId) {
    throw new Error("Submission is missing linked Enrollment.");
  }

  const triggerCounts = isTruthyValue(
    submissionRecord,
    submissionsTable,
    CONFIG.submissions.countThisSubmission
  );

  if (!triggerCounts) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("recordId", recordId);
    setOutputSafe("enrollmentId", enrollmentId);
    setOutputSafe("messageOut", "Skipped because Count This Submission? is not true.");
    return;
  }

  const countedDateKeys = await getCountedSubmissionDateKeysForEnrollment(enrollmentId);

  const todayKey = getTodayDateKey();
  const yesterdayKey = getYesterdayDateKey();
  const mostRecentDateKey = findMostRecentDateKey(countedDateKeys);
  const checkedAt = new Date().toISOString();

  const updateFields = {
    [CONFIG.enrollments.currentStreakLastCheckedAt]: checkedAt,
  };

  if (!mostRecentDateKey) {
    updateFields[CONFIG.enrollments.currentStreak] = 0;
    updateFields[CONFIG.enrollments.currentStreakAsOf] = null;
    updateFields[CONFIG.enrollments.currentStreakStatus] = buildSingleSelectValue(
      enrollmentsTable,
      CONFIG.enrollments.currentStreakStatus,
      CONFIG.statuses.noSubmissions
    );

    await enrollmentsTable.updateRecordAsync(enrollmentId, updateFields);

    setOutputSafe("statusOut", "success");
    setOutputSafe("recordId", recordId);
    setOutputSafe("enrollmentId", enrollmentId);
    setOutputSafe("currentShootingStreak", 0);
    setOutputSafe("currentShootingStreakStatus", CONFIG.statuses.noSubmissions);

    return;
  }

  const streakIsStillCurrent =
    mostRecentDateKey === todayKey ||
    mostRecentDateKey === yesterdayKey ||
    mostRecentDateKey > todayKey;

  if (!streakIsStillCurrent) {
    updateFields[CONFIG.enrollments.currentStreak] = 0;
    updateFields[CONFIG.enrollments.currentStreakAsOf] = dateKeyToAirtableDate(mostRecentDateKey);
    updateFields[CONFIG.enrollments.currentStreakStatus] = buildSingleSelectValue(
      enrollmentsTable,
      CONFIG.enrollments.currentStreakStatus,
      CONFIG.statuses.broken
    );

    await enrollmentsTable.updateRecordAsync(enrollmentId, updateFields);

    setOutputSafe("statusOut", "success");
    setOutputSafe("recordId", recordId);
    setOutputSafe("enrollmentId", enrollmentId);
    setOutputSafe("todayKey", todayKey);
    setOutputSafe("yesterdayKey", yesterdayKey);
    setOutputSafe("anchorDateKey", mostRecentDateKey);
    setOutputSafe("currentShootingStreak", 0);
    setOutputSafe("currentShootingStreakStatus", CONFIG.statuses.broken);
    setOutputSafe("countedSubmissionDays", countedDateKeys.size);

    console.log(JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      statusOut: "success",
      recordId,
      enrollmentId,
      todayKey,
      yesterdayKey,
      mostRecentDateKey,
      currentShootingStreak: 0,
      currentShootingStreakStatus: CONFIG.statuses.broken,
      countedSubmissionDays: countedDateKeys.size,
      countedDates: [...countedDateKeys].sort(),
    }, null, 2));

    return;
  }

  const currentStreak = calculateStreakEndingAt(countedDateKeys, mostRecentDateKey);

  updateFields[CONFIG.enrollments.currentStreak] = currentStreak;
  updateFields[CONFIG.enrollments.currentStreakAsOf] = dateKeyToAirtableDate(mostRecentDateKey);
  updateFields[CONFIG.enrollments.currentStreakStatus] = buildSingleSelectValue(
    enrollmentsTable,
    CONFIG.enrollments.currentStreakStatus,
    CONFIG.statuses.active
  );

  await enrollmentsTable.updateRecordAsync(enrollmentId, updateFields);

  setOutputSafe("statusOut", "success");
  setOutputSafe("recordId", recordId);
  setOutputSafe("enrollmentId", enrollmentId);
  setOutputSafe("todayKey", todayKey);
  setOutputSafe("yesterdayKey", yesterdayKey);
  setOutputSafe("anchorDateKey", mostRecentDateKey);
  setOutputSafe("currentShootingStreak", currentStreak);
  setOutputSafe("currentShootingStreakStatus", CONFIG.statuses.active);
  setOutputSafe("countedSubmissionDays", countedDateKeys.size);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: "success",
    recordId,
    enrollmentId,
    todayKey,
    yesterdayKey,
    anchorDateKey: mostRecentDateKey,
    currentShootingStreak: currentStreak,
    currentShootingStreakStatus: CONFIG.statuses.active,
    countedSubmissionDays: countedDateKeys.size,
    countedDates: [...countedDateKeys].sort(),
  }, null, 2));
}

/* =========================================================
   SECTION 6: RUN
========================================================= */

await main();
