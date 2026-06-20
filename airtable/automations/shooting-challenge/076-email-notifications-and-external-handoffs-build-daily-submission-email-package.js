/*
Automation: 076 - Email, Notifications, and External Handoffs - Build Daily Submission Email Package
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

/*
076 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
Build Daily Submission Email Package

Version: v6.4
Date First Written: 2026-05-23
Last Updated: 2026-06-13

PURPOSE
Runs from one Submissions record.
Reads the linked Enrollment record.
Reads the linked Week record.
Reads the linked Weekly Athlete Summary record when available.
Builds a Version 3 branded daily submission receipt email package.
Combines Parent Email - Cleaned and Athlete Email - Cleaned into one deduped recipient CSV.
Lists homework/video attachments received with the submission.
Pulls weekly homework assignment names directly from FBC Curriculum - SYNC by Week.
Uses Grade Band matching when available.
Lists homework grading/satisfactory status when available.
Reads Current Shooting Streak fields from Enrollments.
Uses linked XP Events as the preferred source for XP values when available.
Falls back to baseSubmissionXp only when XP Events are not yet linked.
Uses Weekly Athlete Summary as the official source for weekly shots when available.
Falls back to scanning Submissions only if Weekly Athlete Summary shots are blank.
Writes the generated subject, HTML, recipient list, version, and send-ready statuses back to the Submissions record.
Checks Send Daily Email to Make Now? after a successful build so Automation 077 runs next.
Does NOT send directly to Make.com or Gmail.

VERSION 6.4 CHANGES
Fixes percent formatting for over-goal values.
Example: 1500 shots / 556 target now displays as 270%, not 3%.
Changes parent-facing display to: Weekly Goal Completion: 270% of goal.

VERSION 6.3 CHANGES
Uses Weekly Athlete Summary → Total Shots This Week as the primary weekly shot total.
Falls back to scanning Submissions only if Weekly Athlete Summary shot total is blank.
Adds debug logging for weekly shot calculation.
Keeps Makes This Week removed from the email card.

VERSION 6.2 CHANGES
Removes Makes This Week from the This Week So Far card.
For broken streaks, changes streak wording to:
- Most Recent Streak
- Last Counted Date
- Streak Status

VERSION 6.1 CHANGES
Fixes footer links to the correct Daily Submission form and Shooting Challenge Website.
Renames Goal Completion to Weekly Goal Completion.
Adds Weekly Shot Target to the This Week So Far card.
Replaces unclear Streak As Of wording with Current Streak, Streak Window, and Streak Status.

AUTOMATION NAME
076 - Email, Notifications, and External Handoffs - Build Daily Submission Email Package

TRIGGER TABLE
Submissions

REQUIRED INPUT VARIABLE
recordId = Airtable record ID from the triggering Submissions record

OPTIONAL INPUT VARIABLES
emailVersion = v3
baseSubmissionXp = 20
*/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
========================================================= */

const CONFIG = {
  scriptName: "076 - Email, Notifications, and External Handoffs - Build Daily Submission Email Package",
  version: "v6.4",
  timeZone: "America/Denver",

  tables: {
    submissions: "Submissions",
    enrollments: "Enrollments",
    weeklySummary: "Weekly Athlete Summary",
    weeks: "Weeks",
    xpEvents: "XP Events",
    homeworkCompletions: "Homework Completions",
    fbcCurriculum: "FBC Curriculum - SYNC",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",

    activityDate: "Activity Date",
    activityDateKey: "Activity Date Key",
    statMode: "Submission Stat Mode",
    countThisSubmission: "Count This Submission?",

    totalShotsCanonical: "Total Shots Canonical",
    totalMakesCanonical: "Total Makes Canonical",
    totalShotsCounted: "Total Shots Counted",
    totalMakesCounted: "Total Makes Counted",

    hwSub1: "HW Sub 1",
    hwSub2: "HW Sub 2",
    videoUpload: "Video Upload",
    videoCount: "Video Count",
    homeworkName1: "Homework Name 1",
    homeworkName2: "Homework Name 2",
    homeworkCompletions: "Homework Completions",
    xpEvents: "XP Events",

    buildDailyEmailNow: "Build Daily Email Now?",
    sendDailyEmailToMakeNow: "Send Daily Email to Make Now?",

    dailyEmailSubject: "Daily Email Subject",
    dailyEmailHtml: "Daily Email HTML",
    dailyEmailTo: "Daily Email To",
    dailyEmailVersion: "Daily Email Version",
    dailyEmailStatus: "Daily Email Status",
    dailyEmailSentAt: "Daily Email Sent At",
    dailyEmailSentToMakeStatus: "Daily Email Sent to Make.com Status",
    dailyEmailSentToMakeAt: "Daily Email Sent to Make.com At",
  },

  enrollments: {
    parentEmail: "Parent Email",
    parentEmailCleaned: "Parent Email - Cleaned",
    athleteEmail: "Athlete Email",
    athleteEmailCleaned: "Athlete Email - Cleaned",

    fullName: "Full Athlete Name",
    fullNameBackward: "Full Athlete Name - Backward",
    athleteFirstName: "Athlete First Name",
    gradeBand: "Grade Band",

    currentShootingStreak: "Current Shooting Streak",
    currentShootingStreakAsOf: "Current Shooting Streak As Of",
    currentShootingStreakStatus: "Current Shooting Streak Status",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    homework: "Homework",
    homeworkCompletionsLink: "Homework Completions Link",
    submissions: "Submissions",
    xpEvents: "XP Events",

    totalShots: "Total Shots This Week",
    totalMakes: "Total Makes This Week",
    goalCompletion: "Goal Completion %",
    weeklyGoalShotsTarget: "Weekly Goal Shots Target",
    weekDisplay: "Week - Display",
  },

  weeks: {
    weekName: "Week Name",
    startDate: "Start Date",
    endDate: "End Date",
  },

  xpEvents: {
    xpPoints: "XP Points",
    xpSource: "XP Source",
    xpReason: "XP Reason",
    enrollment: "Enrollment",
    week: "Week",
    submission: "Submission",
    weeklySummary: "Weekly Athlete Summary",
  },

  homeworkCompletions: {
    homework: "Homework",
    satisfactory: "Satisfactory?",
    completionSummary: "Completion Summary",
    completionStatus: "Completion Status",
    coachFeedback: "Coach Feedback",
    reviewedAt: "Reviewed At",
    itemType: "Item Type",
    itemSlot: "Item Slot",
    originalFileName: "Original File Name",
  },

  fbcCurriculum: {
    assignmentFullName: "Assignment Full Name",
    assignmentTitle: "Assignment Title",
    week: "Week",
    gradeBand: "Grade Band",
    active: "Active?",
    order: "Order",
    assignmentNumber: "Assignment Number",
    published: "Published?",
    url: "URL",
  },

  status: {
    ready: "Ready",
    error: "Error",
    sent: "Sent",
    sentToMake: "Sent to Make.com",
  },

  brand: {
    name: "127 Sports Intensity - Shooting Challenge",
    title: "Daily Submission Summary",
    subtitle: "Submission Receipt and Weekly Progress Update",

    logoUrl: "https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/BlueOrangeCircleLogo.png",
    dailySubmissionsUrl: "https://form.fillout.com/t/iwzyzj5zeMus",
    teamWebsiteUrl: "https://www.fairfieldbasketballclub.com/leaderboard",

    primaryBlue: "#0034B7",
    primaryOrange: "#FF8B00",
    lightGray: "#F2F2F2",
    darkText: "#262626",
    mediumGray: "#C4C4C4",
    secondaryGray: "#666666",
    white: "#ffffff",

    outerPadding: "20px 0",
    cardWidth: "620",
    cardMaxWidth: "94%",
  },
};

/* =========================================================
   SECTION 2: TABLE REFERENCES
========================================================= */

const submissionsTable = base.getTable(CONFIG.tables.submissions);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
const weeksTable = base.getTable(CONFIG.tables.weeks);
const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
const homeworkCompletionsTable = base.getTable(CONFIG.tables.homeworkCompletions);
const fbcCurriculumTable = base.getTable(CONFIG.tables.fbcCurriculum);

/* =========================================================
   SECTION 3: HELPERS
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

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName, fallback = 0) {
  const raw = getRaw(record, table, fieldName);

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  const text = String(raw ?? "")
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();

  if (!text) return fallback;

  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}

function getNullableNumber(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  const text = String(raw ?? "")
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();

  if (!text) return null;

  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function getCheckbox(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (raw === true) return true;
  if (raw === false) return false;

  const text = String(raw ?? "").trim().toLowerCase();
  return ["true", "yes", "checked", "1"].includes(text);
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

function firstNonBlank(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function firstValidNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function cleanCsvEmails(value) {
  const emails = String(value || "")
    .split(/[,\n;]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(emails)].join(",");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "0";

  return Math.round(n).toLocaleString("en-US");
}

function formatXp(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "0 XP";

  return `${Math.round(n).toLocaleString("en-US")} XP`;
}

function formatPercent(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "";

  if (n <= 0) {
    return "0%";
  }

  // Decimal-style percent:
  // 0.75 = 75%
  // 1.25 = 125%
  // 2.70 = 270%
  if (n <= 10) {
    return `${Math.round(n * 100)}%`;
  }

  // Already percent-style:
  // 75 = 75%
  // 125 = 125%
  return `${Math.round(n)}%`;
}

function formatDate(value) {
  if (!value) return "";

  const text = String(value || "").trim();
  if (!text) return "";

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getDateOnlyUtc(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    ));
  }

  const text = String(value || "").trim();
  if (!text) return null;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(Date.UTC(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  ));
}

function buildStreakWindow(streakDays, asOfRaw) {
  const days = Number(streakDays || 0);
  const asOfDate = getDateOnlyUtc(asOfRaw);

  if (!Number.isFinite(days) || days <= 0 || !asOfDate) {
    return "";
  }

  const startDate = new Date(asOfDate);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);

  return `${formatDate(startDate)} - ${formatDate(asOfDate)}`;
}

function buildDateRange(startRaw, endRaw) {
  const start = formatDate(startRaw);
  const end = formatDate(endRaw);

  if (start && end) return `${start} - ${end}`;
  return start || end || "";
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

function addIfFieldExists(payload, table, fieldName, value) {
  if (!fieldExists(table, fieldName)) return;
  if (value === undefined || value === null) return;

  payload[fieldName] = value;
}

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore output mapping errors.
  }
}

async function writeSubmissionUpdates(recordId, fields) {
  const safeFields = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    if (fieldExists(submissionsTable, fieldName)) {
      safeFields[fieldName] = value;
    }
  }

  if (Object.keys(safeFields).length) {
    await submissionsTable.updateRecordAsync(recordId, safeFields);
  }
}

async function writeErrorStatus(recordId, message) {
  const updateFields = {};

  if (fieldExists(submissionsTable, CONFIG.submissions.dailyEmailStatus)) {
    updateFields[CONFIG.submissions.dailyEmailStatus] = buildSingleSelectValue(
      submissionsTable,
      CONFIG.submissions.dailyEmailStatus,
      CONFIG.status.error
    );
  }

  if (fieldExists(submissionsTable, CONFIG.submissions.dailyEmailSentToMakeStatus)) {
    updateFields[CONFIG.submissions.dailyEmailSentToMakeStatus] = buildSingleSelectValue(
      submissionsTable,
      CONFIG.submissions.dailyEmailSentToMakeStatus,
      CONFIG.status.error
    );
  }

  if (fieldExists(submissionsTable, CONFIG.submissions.buildDailyEmailNow)) {
    updateFields[CONFIG.submissions.buildDailyEmailNow] = false;
  }

  if (fieldExists(submissionsTable, CONFIG.submissions.sendDailyEmailToMakeNow)) {
    updateFields[CONFIG.submissions.sendDailyEmailToMakeNow] = false;
  }

  await writeSubmissionUpdates(recordId, updateFields);

  setOutputSafe("errorOut", message);
}

/* =========================================================
   SECTION 4: DATA HELPERS
========================================================= */

function getAttachmentList(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .map((file, index) => String(file?.filename || `Attachment ${index + 1}`).trim())
    .filter(Boolean);
}

function buildSubmittedItems(submissionRecord, homeworkAssignedItems) {
  const items = [];

  const hw1Files = getAttachmentList(
    submissionRecord,
    submissionsTable,
    CONFIG.submissions.hwSub1
  );

  const hw2Files = getAttachmentList(
    submissionRecord,
    submissionsTable,
    CONFIG.submissions.hwSub2
  );

  const videoFiles = getAttachmentList(
    submissionRecord,
    submissionsTable,
    CONFIG.submissions.videoUpload
  );

  const homework1Label = homeworkAssignedItems?.[0]
    ? homeworkAssignedItems[0].replace(/^Homework\s*1:\s*/i, "")
    : "Homework 1";

  const homework2Label = homeworkAssignedItems?.[1]
    ? homeworkAssignedItems[1].replace(/^Homework\s*2:\s*/i, "")
    : "Homework 2";

  if (hw1Files.length) {
    items.push(`${homework1Label} submitted: ${hw1Files.join(", ")}`);
  }

  if (hw2Files.length) {
    items.push(`${homework2Label} submitted: ${hw2Files.join(", ")}`);
  }

  videoFiles.forEach((filename, index) => {
    items.push(`Video ${index + 1} submitted: ${filename}`);
  });

  if (!items.length) {
    items.push("No homework or video attachments were included with this submission.");
  }

  return items;
}

async function sumXpEventsByIds(xpEventIds) {
  const ids = [...new Set((xpEventIds || []).filter(Boolean))];

  if (!ids.length) return 0;

  const query = await xpEventsTable.selectRecordsAsync({
    fields: [CONFIG.xpEvents.xpPoints].filter(fieldName =>
      fieldExists(xpEventsTable, fieldName)
    ),
  });

  let total = 0;

  for (const id of ids) {
    const record = query.getRecord(id);
    if (!record) continue;

    total += getNumber(record, xpEventsTable, CONFIG.xpEvents.xpPoints, 0);
  }

  return total;
}

async function getSubmissionXpInfo(submissionRecord, countThis, fallbackBaseXp) {
  const xpEventIds = getLinkedIds(
    submissionRecord,
    submissionsTable,
    CONFIG.submissions.xpEvents
  );

  if (xpEventIds.length) {
    const total = await sumXpEventsByIds(xpEventIds);

    return {
      xp: total,
    };
  }

  return {
    xp: countThis ? fallbackBaseXp : 0,
  };
}

async function getWeeklyXpInfo(enrollmentId, weekId, weeklySummaryRecord, minimumCurrentSubmissionXp) {
  let linkedSummaryXp = 0;

  if (weeklySummaryRecord) {
    const weeklyXpEventIds = getLinkedIds(
      weeklySummaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.xpEvents
    );

    if (weeklyXpEventIds.length) {
      linkedSummaryXp = await sumXpEventsByIds(weeklyXpEventIds);
    }
  }

  if (!enrollmentId || !weekId) {
    return {
      xp: Math.max(linkedSummaryXp, Number(minimumCurrentSubmissionXp || 0)),
    };
  }

  const fieldsToLoad = [
    CONFIG.xpEvents.xpPoints,
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.week,
  ].filter(fieldName => fieldExists(xpEventsTable, fieldName));

  const query = await xpEventsTable.selectRecordsAsync({
    fields: fieldsToLoad,
  });

  let directWeekXp = 0;

  for (const record of query.records) {
    const eventEnrollmentIds = getLinkedIds(
      record,
      xpEventsTable,
      CONFIG.xpEvents.enrollment
    );

    const eventWeekIds = getLinkedIds(
      record,
      xpEventsTable,
      CONFIG.xpEvents.week
    );

    if (!eventEnrollmentIds.includes(enrollmentId)) continue;
    if (!eventWeekIds.includes(weekId)) continue;

    directWeekXp += getNumber(record, xpEventsTable, CONFIG.xpEvents.xpPoints, 0);
  }

  return {
    xp: Math.max(
      linkedSummaryXp,
      directWeekXp,
      Number(minimumCurrentSubmissionXp || 0)
    ),
  };
}

async function getWeekSubmissionTotalsForEnrollmentWeek(enrollmentId, weekId, currentSubmissionRecord) {
  const currentSubmissionId = currentSubmissionRecord?.id || "";

  const currentShots = firstValidNumber(
    getNullableNumber(currentSubmissionRecord, submissionsTable, CONFIG.submissions.totalShotsCounted),
    getNullableNumber(currentSubmissionRecord, submissionsTable, CONFIG.submissions.totalShotsCanonical)
  );

  const currentMakes = firstValidNumber(
    getNullableNumber(currentSubmissionRecord, submissionsTable, CONFIG.submissions.totalMakesCounted),
    getNullableNumber(currentSubmissionRecord, submissionsTable, CONFIG.submissions.totalMakesCanonical)
  );

  if (!enrollmentId || !weekId) {
    return {
      shots: currentShots,
      makes: currentMakes,
    };
  }

  const fieldsToLoad = [
    CONFIG.submissions.enrollment,
    CONFIG.submissions.week,
    CONFIG.submissions.countThisSubmission,
    CONFIG.submissions.totalShotsCounted,
    CONFIG.submissions.totalShotsCanonical,
    CONFIG.submissions.totalMakesCounted,
    CONFIG.submissions.totalMakesCanonical,
  ].filter(fieldName => fieldExists(submissionsTable, fieldName));

  const query = await submissionsTable.selectRecordsAsync({
    fields: fieldsToLoad,
  });

  let shots = 0;
  let makes = 0;
  let includedCurrentSubmission = false;

  for (const record of query.records) {
    const recordEnrollmentIds = getLinkedIds(
      record,
      submissionsTable,
      CONFIG.submissions.enrollment
    );

    const recordWeekIds = getLinkedIds(
      record,
      submissionsTable,
      CONFIG.submissions.week
    );

    if (!recordEnrollmentIds.includes(enrollmentId)) continue;
    if (!recordWeekIds.includes(weekId)) continue;

    const countThis = getCheckbox(
      record,
      submissionsTable,
      CONFIG.submissions.countThisSubmission
    );

    if (!countThis) continue;

    if (record.id === currentSubmissionId) {
      includedCurrentSubmission = true;
    }

    const recordShots = firstValidNumber(
      getNullableNumber(record, submissionsTable, CONFIG.submissions.totalShotsCounted),
      getNullableNumber(record, submissionsTable, CONFIG.submissions.totalShotsCanonical)
    );

    const recordMakes = firstValidNumber(
      getNullableNumber(record, submissionsTable, CONFIG.submissions.totalMakesCounted),
      getNullableNumber(record, submissionsTable, CONFIG.submissions.totalMakesCanonical)
    );

    shots += recordShots;
    makes += recordMakes;
  }

  if (
    !includedCurrentSubmission &&
    getCheckbox(currentSubmissionRecord, submissionsTable, CONFIG.submissions.countThisSubmission)
  ) {
    shots += currentShots;
    makes += currentMakes;
  }

  return {
    shots,
    makes,
  };
}

async function getHomeworkAssignedItemsFromCurriculum(weekId, gradeBandId) {
  if (!weekId) {
    return ["No week is linked yet, so weekly homework could not be found."];
  }

  const fieldsToLoad = [
    CONFIG.fbcCurriculum.assignmentFullName,
    CONFIG.fbcCurriculum.assignmentTitle,
    CONFIG.fbcCurriculum.week,
    CONFIG.fbcCurriculum.gradeBand,
    CONFIG.fbcCurriculum.active,
    CONFIG.fbcCurriculum.order,
    CONFIG.fbcCurriculum.assignmentNumber,
    CONFIG.fbcCurriculum.published,
  ].filter(fieldName => fieldExists(fbcCurriculumTable, fieldName));

  const query = await fbcCurriculumTable.selectRecordsAsync({
    fields: fieldsToLoad,
  });

  const gradeBandMatches = [];
  const weekOnlyMatches = [];

  for (const record of query.records) {
    const linkedWeekIds = getLinkedIds(record, fbcCurriculumTable, CONFIG.fbcCurriculum.week);

    if (!linkedWeekIds.includes(weekId)) continue;

    if (
      fieldExists(fbcCurriculumTable, CONFIG.fbcCurriculum.active) &&
      !getCheckbox(record, fbcCurriculumTable, CONFIG.fbcCurriculum.active)
    ) {
      continue;
    }

    const label = firstNonBlank(
      getText(record, fbcCurriculumTable, CONFIG.fbcCurriculum.assignmentTitle),
      getText(record, fbcCurriculumTable, CONFIG.fbcCurriculum.assignmentFullName),
      record.name
    );

    if (!label) continue;

    const linkedGradeBandIds = getLinkedIds(
      record,
      fbcCurriculumTable,
      CONFIG.fbcCurriculum.gradeBand
    );

    const item = {
      id: record.id,
      label,
      order: getNumber(record, fbcCurriculumTable, CONFIG.fbcCurriculum.order, 9999),
      assignmentNumber: getNumber(record, fbcCurriculumTable, CONFIG.fbcCurriculum.assignmentNumber, 9999),
      name: label,
    };

    const hasNoGradeBandRestriction = linkedGradeBandIds.length === 0;
    const gradeBandMatchesThisRecord = gradeBandId && linkedGradeBandIds.includes(gradeBandId);

    if (hasNoGradeBandRestriction || gradeBandMatchesThisRecord) {
      gradeBandMatches.push(item);
    }

    weekOnlyMatches.push(item);
  }

  function sortAssignments(items) {
    return items.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.assignmentNumber !== b.assignmentNumber) return a.assignmentNumber - b.assignmentNumber;
      return a.name.localeCompare(b.name);
    });
  }

  const selected = [];
  const usedIds = new Set();

  for (const item of sortAssignments(gradeBandMatches)) {
    if (usedIds.has(item.id)) continue;
    selected.push(item);
    usedIds.add(item.id);
    if (selected.length >= 2) break;
  }

  if (selected.length < 2) {
    for (const item of sortAssignments(weekOnlyMatches)) {
      if (usedIds.has(item.id)) continue;
      selected.push(item);
      usedIds.add(item.id);
      if (selected.length >= 2) break;
    }
  }

  const items = selected
    .slice(0, 2)
    .map((item, index) => `Homework ${index + 1}: ${item.label}`);

  if (!items.length) {
    items.push("No active homework assignments were found in FBC Curriculum - SYNC for this week.");
  }

  return items;
}

async function getHomeworkSatisfactoryItems(submissionRecord, weeklySummaryRecord) {
  const weeklyCompletionIds = weeklySummaryRecord
    ? getLinkedIds(
        weeklySummaryRecord,
        weeklySummaryTable,
        CONFIG.weeklySummary.homeworkCompletionsLink
      )
    : [];

  const submissionCompletionIds = getLinkedIds(
    submissionRecord,
    submissionsTable,
    CONFIG.submissions.homeworkCompletions
  );

  const completionIds = [...new Set([
    ...weeklyCompletionIds,
    ...submissionCompletionIds,
  ].filter(Boolean))];

  if (!completionIds.length) {
    return ["No homework has been graded yet for this week."];
  }

  const fieldsToLoad = [
    CONFIG.homeworkCompletions.homework,
    CONFIG.homeworkCompletions.satisfactory,
    CONFIG.homeworkCompletions.completionSummary,
    CONFIG.homeworkCompletions.completionStatus,
    CONFIG.homeworkCompletions.coachFeedback,
    CONFIG.homeworkCompletions.itemType,
    CONFIG.homeworkCompletions.itemSlot,
    CONFIG.homeworkCompletions.originalFileName,
  ].filter(fieldName => fieldExists(homeworkCompletionsTable, fieldName));

  const query = await homeworkCompletionsTable.selectRecordsAsync({
    fields: fieldsToLoad,
  });

  const items = [];

  for (const id of completionIds) {
    const record = query.getRecord(id);
    if (!record) continue;

    const homeworkName = firstNonBlank(
      getText(record, homeworkCompletionsTable, CONFIG.homeworkCompletions.homework),
      getText(record, homeworkCompletionsTable, CONFIG.homeworkCompletions.itemSlot),
      getText(record, homeworkCompletionsTable, CONFIG.homeworkCompletions.originalFileName),
      "Homework"
    );

    const satisfactory = getCheckbox(
      record,
      homeworkCompletionsTable,
      CONFIG.homeworkCompletions.satisfactory
    );

    const completionStatus = getText(
      record,
      homeworkCompletionsTable,
      CONFIG.homeworkCompletions.completionStatus
    );

    const coachFeedback = getText(
      record,
      homeworkCompletionsTable,
      CONFIG.homeworkCompletions.coachFeedback
    );

    let statusText = "";

    if (satisfactory) {
      statusText = "Graded - Satisfactory";
    } else if (completionStatus && completionStatus.toLowerCase().includes("review")) {
      statusText = "Graded";
    } else if (completionStatus && completionStatus.toLowerCase().includes("graded")) {
      statusText = "Graded";
    } else {
      statusText = "Ungraded";
    }

    if (coachFeedback) {
      items.push(`${homeworkName}: ${statusText} — ${coachFeedback}`);
    } else {
      items.push(`${homeworkName}: ${statusText}`);
    }
  }

  return items.length ? items : ["No homework has been graded yet for this week."];
}

/* =========================================================
   SECTION 5: HTML HELPERS
========================================================= */

function v3InfoRows(rows) {
  const filtered = (rows || []).filter(row => {
    const label = String(row?.label ?? "").trim();
    const value = String(row?.value ?? "").trim();
    return label && value && value !== "0 days";
  });

  if (!filtered.length) return "";

  return filtered.map(row => `
<div style="font-size:12px;line-height:19px;color:${CONFIG.brand.darkText};margin-top:5px;">
  ${escapeHtml(row.label)}: <strong>${escapeHtml(row.value)}</strong>
</div>
`).join("");
}

function v3ItemLines(items) {
  const safeItems = (items || [])
    .map(item => String(item || "").trim())
    .filter(Boolean);

  if (!safeItems.length) return "";

  return safeItems.map(item => `
<div style="font-size:12px;line-height:19px;color:${CONFIG.brand.darkText};margin-top:5px;">
  ${escapeHtml(item)}
</div>
`).join("");
}

function v3Callout(label, primaryValue, detailsHtml = "") {
  const safeLabel = String(label || "").trim();
  const safePrimaryValue = String(primaryValue || "").trim();

  if (!safeLabel && !safePrimaryValue && !String(detailsHtml || "").trim()) return "";

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${CONFIG.brand.lightGray};border:1px solid ${CONFIG.brand.mediumGray};border-left:6px solid ${CONFIG.brand.primaryOrange};border-radius:12px;margin:16px 0;">
  <tr>
    <td style="padding:14px 16px;">
      ${safeLabel ? `
      <div style="font-family:'Magistral','Maven Pro',Arial,Helvetica,sans-serif;font-size:11px;color:${CONFIG.brand.primaryBlue};font-weight:900;text-transform:uppercase;letter-spacing:1px;">
        ${escapeHtml(safeLabel)}
      </div>
      ` : ""}
      ${safePrimaryValue ? `
      <div style="font-size:12px;line-height:19px;color:${CONFIG.brand.darkText};font-weight:800;margin-top:4px;">
        ${escapeHtml(safePrimaryValue)}
      </div>
      ` : ""}
      ${detailsHtml || ""}
    </td>
  </tr>
</table>
`;
}

function v3Button(buttonText, buttonUrl) {
  const safeText = String(buttonText || "").trim();
  const safeUrl = String(buttonUrl || "").trim();

  if (!safeText || !safeUrl) return "";

  return `
<div style="text-align:center;margin:22px 0 10px 0;">
  <a href="${escapeHtml(safeUrl)}" style="display:inline-block;background:${CONFIG.brand.primaryOrange};color:${CONFIG.brand.white};text-decoration:none;font-family:'Magistral','Maven Pro',Arial,Helvetica,sans-serif;font-weight:900;font-size:12px;letter-spacing:.25px;padding:8px 14px;border-radius:7px;border:2px solid ${CONFIG.brand.primaryOrange};">
    ${escapeHtml(safeText)}
  </a>
</div>
`;
}

function v3SupportingNote(text) {
  const safeText = String(text || "").trim();

  if (!safeText) return "";

  return `
<p style="font-size:12px;line-height:19px;color:${CONFIG.brand.secondaryGray};margin:16px 0 0 0;text-align:center;">
  ${escapeHtml(safeText)}
</p>
`;
}

function v3Header(title, subtitle) {
  const safeTitle = String(title || CONFIG.brand.title || "").trim();
  const safeSubtitle = String(subtitle || CONFIG.brand.subtitle || "").trim();

  return `
<tr>
  <td style="background:${CONFIG.brand.primaryBlue};padding:20px 24px;border-bottom:5px solid ${CONFIG.brand.primaryOrange};border-radius:14px 14px 0 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-spacing:0;">
      <tr>
        <td style="vertical-align:top;padding:0;">
          <div style="font-family:'Magistral','Maven Pro',Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1.3px;color:${CONFIG.brand.lightGray};font-weight:800;">
            ${escapeHtml(CONFIG.brand.name)}
          </div>
          <div style="font-family:'Magistral','Maven Pro',Arial,Helvetica,sans-serif;font-size:23px;line-height:28px;color:${CONFIG.brand.white};font-weight:900;margin-top:5px;">
            ${escapeHtml(safeTitle)}
          </div>
          <div style="font-size:12px;line-height:18px;color:${CONFIG.brand.lightGray};margin-top:7px;font-weight:600;">
            ${escapeHtml(safeSubtitle)}
          </div>
        </td>
        <td align="right" style="vertical-align:top;padding:0 0 0 14px;width:68px;">
          <div style="background:${CONFIG.brand.white};border-radius:50%;width:62px;height:62px;display:inline-block;text-align:center;line-height:62px;">
            <img src="${escapeHtml(CONFIG.brand.logoUrl)}" alt="127 Sports Intensity Logo" width="52" height="52" style="display:inline-block;vertical-align:middle;border:0;outline:none;text-decoration:none;border-radius:50%;">
          </div>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;
}

function v3Footer() {
  return `
<tr>
  <td style="background:${CONFIG.brand.primaryBlue};padding:14px 24px;text-align:center;border-top:4px solid ${CONFIG.brand.primaryOrange};border-left:1px solid ${CONFIG.brand.mediumGray};border-right:1px solid ${CONFIG.brand.mediumGray};border-bottom:1px solid ${CONFIG.brand.mediumGray};border-radius:0 0 14px 14px;">
    <div style="font-size:11px;line-height:17px;color:${CONFIG.brand.lightGray};font-weight:600;">
      ${escapeHtml(CONFIG.brand.name)}
    </div>
    <div style="font-size:11px;line-height:17px;color:${CONFIG.brand.mediumGray};margin-top:3px;">
      🔗 <a href="${escapeHtml(CONFIG.brand.dailySubmissionsUrl)}" style="color:${CONFIG.brand.lightGray};text-decoration:none;font-weight:600;">Daily Submissions</a>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      🔗 <a href="${escapeHtml(CONFIG.brand.teamWebsiteUrl)}" style="color:${CONFIG.brand.lightGray};text-decoration:none;font-weight:600;">Shooting Challenge Website</a>
    </div>
  </td>
</tr>
`;
}

function buildEmailHtml({
  athleteName,
  firstName,
  activityDateText,
  weekLabel,
  statMode,
  shots,
  makes,
  submissionXp,
  weeklyXp,
  submittedItems,
  homeworkAssignedItems,
  homeworkSatisfactoryItems,
  weekShots,
  weeklyGoalTarget,
  goalPercent,
  currentShootingStreak,
  currentShootingStreakAsOf,
  currentShootingStreakWindow,
  currentShootingStreakStatus,
}) {
  const greetingName = firstName || athleteName || "Athlete";

  const streakRows = [];
  const streakStatusText = String(currentShootingStreakStatus || "").trim();
  const streakStatusLower = streakStatusText.toLowerCase();
  const isBrokenStreak = streakStatusLower.includes("broken");

  if (Number(currentShootingStreak || 0) > 0) {
    streakRows.push({
      label: isBrokenStreak ? "Most Recent Streak" : "Current Streak",
      value: `${formatNumber(currentShootingStreak)} days`,
    });
  }

  if (isBrokenStreak) {
    if (String(currentShootingStreakAsOf || "").trim()) {
      streakRows.push({
        label: "Last Counted Date",
        value: currentShootingStreakAsOf,
      });
    }
  } else if (String(currentShootingStreakWindow || "").trim()) {
    streakRows.push({
      label: "Streak Window",
      value: currentShootingStreakWindow,
    });
  } else if (String(currentShootingStreakAsOf || "").trim()) {
    streakRows.push({
      label: "Current Through",
      value: currentShootingStreakAsOf,
    });
  }

  if (streakStatusText) {
    streakRows.push({
      label: "Streak Status",
      value: streakStatusText,
    });
  }

  const thisSubmissionDetails = v3InfoRows([
    { label: "Activity Date", value: activityDateText },
    { label: "Week", value: weekLabel },
    { label: "Submission Type", value: statMode },
    { label: "Shots", value: formatNumber(shots) },
    { label: "Makes", value: formatNumber(makes) },
    { label: "XP From Submission", value: formatXp(submissionXp) },
  ]);

  const weekSoFarDetails = v3InfoRows([
    { label: "Shots This Week", value: formatNumber(weekShots) },
    {
      label: "Weekly Shot Target",
      value: Number(weeklyGoalTarget || 0) > 0
        ? `${formatNumber(weeklyGoalTarget)} shots`
        : "",
    },
    {
      label: "Weekly Goal Completion",
      value: goalPercent ? `${goalPercent} of goal` : "",
    },
    { label: "Weekly XP", value: formatXp(weeklyXp) },
    ...streakRows,
  ]);

  const submittedDetails = v3ItemLines(submittedItems);
  const homeworkAssignedDetails = v3ItemLines(homeworkAssignedItems);
  const homeworkStatusDetails = v3ItemLines(homeworkSatisfactoryItems);

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeHtml(CONFIG.brand.title)}</title>
</head>
<body style="margin:0;padding:0;background:${CONFIG.brand.lightGray};font-family:'Maven Pro',Arial,Helvetica,sans-serif;color:${CONFIG.brand.darkText};">
  <div style="margin:0;padding:0;background:${CONFIG.brand.lightGray};font-family:'Maven Pro',Arial,Helvetica,sans-serif;color:${CONFIG.brand.darkText};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${CONFIG.brand.lightGray};padding:${CONFIG.brand.outerPadding};">
      <tr>
        <td align="center">
          <table role="presentation" width="${CONFIG.brand.cardWidth}" cellspacing="0" cellpadding="0" style="width:${CONFIG.brand.cardWidth}px;max-width:${CONFIG.brand.cardMaxWidth};background:${CONFIG.brand.white};border-radius:14px;overflow:hidden;border-collapse:collapse;border-spacing:0;">

            ${v3Header(CONFIG.brand.title, CONFIG.brand.subtitle)}

            <tr>
              <td style="padding:22px 24px;background:${CONFIG.brand.white};border-left:1px solid ${CONFIG.brand.mediumGray};border-right:1px solid ${CONFIG.brand.mediumGray};">
                <p style="font-size:12px;line-height:19px;margin:0 0 12px 0;color:${CONFIG.brand.darkText};">
                  Hi <strong>${escapeHtml(greetingName)}</strong>,
                </p>

                <p style="font-size:12px;line-height:19px;margin:0 0 12px 0;color:${CONFIG.brand.darkText};">
                  Your daily submission has been received and recorded.
                </p>

                <p style="font-size:12px;line-height:19px;margin:0 0 16px 0;color:${CONFIG.brand.darkText};">
                  Below is a summary of what was submitted and your current weekly progress.
                </p>

                ${v3Callout("This Submission", "Submission Received", thisSubmissionDetails)}

                ${v3Callout("Submitted With This Entry", "Attachments and Uploads", submittedDetails)}

                ${v3Callout("Homework Assigned This Week", "Current Homework", homeworkAssignedDetails)}

                ${v3Callout("Homework Grading Status", "Current Review Status", homeworkStatusDetails)}

                ${v3Callout("This Week So Far", "Weekly Progress", weekSoFarDetails)}

                <p style="font-size:12px;line-height:19px;margin:0 0 16px 0;color:${CONFIG.brand.darkText};">
                  Keep building strong habits one day at a time. Consistent work is what makes progress show up.
                </p>

                ${v3Button("Submit Shots", CONFIG.brand.dailySubmissionsUrl)}

                ${v3SupportingNote("Keep working, keep submitting, and keep building consistency.")}
              </td>
            </tr>

            ${v3Footer()}

          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`.trim();
}

/* =========================================================
   SECTION 6: VALIDATION
========================================================= */

function validateRequiredFields() {
  requireField(submissionsTable, CONFIG.submissions.enrollment);
  requireField(submissionsTable, CONFIG.submissions.week);
  requireField(submissionsTable, CONFIG.submissions.activityDate);
  requireField(submissionsTable, CONFIG.submissions.dailyEmailSubject);
  requireField(submissionsTable, CONFIG.submissions.dailyEmailHtml);
  requireField(submissionsTable, CONFIG.submissions.dailyEmailTo);
  requireField(submissionsTable, CONFIG.submissions.dailyEmailStatus);
  requireField(submissionsTable, CONFIG.submissions.dailyEmailSentToMakeStatus);
  requireField(submissionsTable, CONFIG.submissions.sendDailyEmailToMakeNow);

  requireField(enrollmentsTable, CONFIG.enrollments.parentEmail);
  requireField(enrollmentsTable, CONFIG.enrollments.fullName);

  requireField(xpEventsTable, CONFIG.xpEvents.xpPoints);

  requireField(fbcCurriculumTable, CONFIG.fbcCurriculum.assignmentFullName);
  requireField(fbcCurriculumTable, CONFIG.fbcCurriculum.week);
}

/* =========================================================
   SECTION 7: MAIN
========================================================= */

async function main() {
  const cfg = input.config();

  const recordId = String(cfg.recordId || "").trim();
  const emailVersion = String(cfg.emailVersion || "v3").trim() || "v3";
  const baseSubmissionXp = Number(cfg.baseSubmissionXp || 20);

  if (!recordId) {
    throw new Error("Missing required input: recordId");
  }

  try {
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

    const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);

    if (!enrollmentRecord) {
      throw new Error(`Enrollment record not found: ${enrollmentId}`);
    }

    const gradeBandId = getFirstLinkedId(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.gradeBand
    );

    const weekId = getFirstLinkedId(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.week
    );

    const weekRecord = weekId
      ? await weeksTable.selectRecordAsync(weekId)
      : null;

    const weeklySummaryId = getFirstLinkedId(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.weeklySummary
    );

    const weeklySummaryRecord = weeklySummaryId
      ? await weeklySummaryTable.selectRecordAsync(weeklySummaryId)
      : null;

    const parentEmailCleaned = getText(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.parentEmailCleaned
    );

    const athleteEmailCleaned = getText(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.athleteEmailCleaned
    );

    const parentEmail = getText(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.parentEmail
    );

    const athleteEmail = getText(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.athleteEmail
    );

    const parentRecipient = firstNonBlank(parentEmailCleaned, parentEmail);
    const athleteRecipient = firstNonBlank(athleteEmailCleaned, athleteEmail);

    const recipientCsv = cleanCsvEmails([
      parentRecipient,
      athleteRecipient,
    ].filter(Boolean).join(","));

    if (!recipientCsv) {
      throw new Error("No parent or athlete email found on linked Enrollment.");
    }

    const athleteName = firstNonBlank(
      getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.fullName),
      getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.fullNameBackward),
      "Athlete"
    );

    const firstName = getText(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.athleteFirstName
    );

    const currentShootingStreak = getNumber(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.currentShootingStreak,
      0
    );

    const currentShootingStreakAsOfRaw = getRaw(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.currentShootingStreakAsOf
    );

    const currentShootingStreakAsOf = formatDate(currentShootingStreakAsOfRaw);

    const currentShootingStreakWindow = buildStreakWindow(
      currentShootingStreak,
      currentShootingStreakAsOfRaw
    );

    const currentShootingStreakStatus = getText(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.currentShootingStreakStatus
    );

    const activityDateText = formatDate(
      getText(submissionRecord, submissionsTable, CONFIG.submissions.activityDate)
    );

    const weekLabel = firstNonBlank(
      weeklySummaryRecord
        ? getText(weeklySummaryRecord, weeklySummaryTable, CONFIG.weeklySummary.weekDisplay)
        : "",
      weekRecord
        ? getText(weekRecord, weeksTable, CONFIG.weeks.weekName)
        : "",
      weekRecord
        ? buildDateRange(
            getText(weekRecord, weeksTable, CONFIG.weeks.startDate),
            getText(weekRecord, weeksTable, CONFIG.weeks.endDate)
          )
        : ""
    );

    const statMode = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.statMode
    );

    const countThis = getCheckbox(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.countThisSubmission
    );

    const submissionShots = firstValidNumber(
      getNullableNumber(submissionRecord, submissionsTable, CONFIG.submissions.totalShotsCounted),
      getNullableNumber(submissionRecord, submissionsTable, CONFIG.submissions.totalShotsCanonical)
    );

    const submissionMakes = firstValidNumber(
      getNullableNumber(submissionRecord, submissionsTable, CONFIG.submissions.totalMakesCounted),
      getNullableNumber(submissionRecord, submissionsTable, CONFIG.submissions.totalMakesCanonical)
    );

    const submissionXpInfo = await getSubmissionXpInfo(
      submissionRecord,
      countThis,
      baseSubmissionXp
    );

    const weeklyXpInfo = await getWeeklyXpInfo(
      enrollmentId,
      weekId,
      weeklySummaryRecord,
      submissionXpInfo.xp
    );

    const homeworkAssignedItems = await getHomeworkAssignedItemsFromCurriculum(
      weekId,
      gradeBandId
    );

    const submittedItems = buildSubmittedItems(
      submissionRecord,
      homeworkAssignedItems
    );

    const homeworkSatisfactoryItems = await getHomeworkSatisfactoryItems(
      submissionRecord,
      weeklySummaryRecord
    );

    const scannedWeekTotals = await getWeekSubmissionTotalsForEnrollmentWeek(
      enrollmentId,
      weekId,
      submissionRecord
    );

    const weeklySummaryShots = weeklySummaryRecord
      ? getNullableNumber(
          weeklySummaryRecord,
          weeklySummaryTable,
          CONFIG.weeklySummary.totalShots
        )
      : null;

    const weeklySummaryMakes = weeklySummaryRecord
      ? getNullableNumber(
          weeklySummaryRecord,
          weeklySummaryTable,
          CONFIG.weeklySummary.totalMakes
        )
      : null;

    const weekShots = weeklySummaryShots !== null
      ? weeklySummaryShots
      : scannedWeekTotals.shots;

    const weekMakes = weeklySummaryMakes !== null
      ? weeklySummaryMakes
      : scannedWeekTotals.makes;

    const weeklyGoalTarget = weeklySummaryRecord
      ? getNumber(
          weeklySummaryRecord,
          weeklySummaryTable,
          CONFIG.weeklySummary.weeklyGoalShotsTarget,
          0
        )
      : 0;

    const goalCompletionRaw = weeklySummaryRecord
      ? getRaw(
          weeklySummaryRecord,
          weeklySummaryTable,
          CONFIG.weeklySummary.goalCompletion
        )
      : null;

    const goalPercent = weeklyGoalTarget > 0
      ? formatPercent(weekShots / weeklyGoalTarget)
      : goalCompletionRaw !== null && goalCompletionRaw !== undefined
        ? formatPercent(goalCompletionRaw)
        : "";

    console.log("Weekly shot calculation debug:", {
      athleteName,
      weekLabel,
      enrollmentId,
      weekId,
      weeklySummaryId,
      weeklySummaryShots,
      scannedWeekShots: scannedWeekTotals.shots,
      finalWeekShotsUsed: weekShots,
      weeklySummaryMakes,
      scannedWeekMakes: scannedWeekTotals.makes,
      finalWeekMakesUsed: weekMakes,
      weeklyGoalTarget,
      goalPercent,
    });

    const subject = `Daily Submission Received - ${athleteName} - ${activityDateText || "Submission"}`;

    const html = buildEmailHtml({
      athleteName,
      firstName,
      activityDateText,
      weekLabel,
      statMode,
      shots: submissionShots,
      makes: submissionMakes,
      submissionXp: submissionXpInfo.xp,
      weeklyXp: weeklyXpInfo.xp,
      submittedItems,
      homeworkAssignedItems,
      homeworkSatisfactoryItems,
      weekShots,
      weeklyGoalTarget,
      goalPercent,
      currentShootingStreak,
      currentShootingStreakAsOf,
      currentShootingStreakWindow,
      currentShootingStreakStatus,
    });

    const updateFields = {};

    addIfFieldExists(updateFields, submissionsTable, CONFIG.submissions.dailyEmailSubject, subject);
    addIfFieldExists(updateFields, submissionsTable, CONFIG.submissions.dailyEmailHtml, html);
    addIfFieldExists(updateFields, submissionsTable, CONFIG.submissions.dailyEmailTo, recipientCsv);
    addIfFieldExists(updateFields, submissionsTable, CONFIG.submissions.dailyEmailVersion, emailVersion);

    if (fieldExists(submissionsTable, CONFIG.submissions.buildDailyEmailNow)) {
      updateFields[CONFIG.submissions.buildDailyEmailNow] = false;
    }

    updateFields[CONFIG.submissions.sendDailyEmailToMakeNow] = true;

    updateFields[CONFIG.submissions.dailyEmailStatus] = buildSingleSelectValue(
      submissionsTable,
      CONFIG.submissions.dailyEmailStatus,
      CONFIG.status.ready
    );

    updateFields[CONFIG.submissions.dailyEmailSentToMakeStatus] = buildSingleSelectValue(
      submissionsTable,
      CONFIG.submissions.dailyEmailSentToMakeStatus,
      CONFIG.status.ready
    );

    if (fieldExists(submissionsTable, CONFIG.submissions.dailyEmailSentToMakeAt)) {
      updateFields[CONFIG.submissions.dailyEmailSentToMakeAt] = null;
    }

    await writeSubmissionUpdates(recordId, updateFields);

    setOutputSafe("statusOut", "success");
    setOutputSafe("recordId", recordId);
    setOutputSafe("enrollmentId", enrollmentId);
    setOutputSafe("weekId", weekId);
    setOutputSafe("weeklySummaryId", weeklySummaryId);
    setOutputSafe("subjectOut", subject);
    setOutputSafe("htmlOut", html);
    setOutputSafe("dailyEmailTo", recipientCsv);
    setOutputSafe("recipientsCsv", recipientCsv);
    setOutputSafe("emailVersion", emailVersion);
    setOutputSafe("submissionXp", submissionXpInfo.xp);
    setOutputSafe("weeklyXp", weeklyXpInfo.xp);
    setOutputSafe("weekShots", weekShots);
    setOutputSafe("weekMakes", weekMakes);
    setOutputSafe("weeklySummaryShots", weeklySummaryShots);
    setOutputSafe("scannedWeekShots", scannedWeekTotals.shots);
    setOutputSafe("finalWeekShotsUsed", weekShots);
    setOutputSafe("weeklyGoalTarget", weeklyGoalTarget);
    setOutputSafe("goalPercent", goalPercent);
    setOutputSafe("currentShootingStreak", currentShootingStreak);
    setOutputSafe("currentShootingStreakAsOf", currentShootingStreakAsOf);
    setOutputSafe("currentShootingStreakWindow", currentShootingStreakWindow);
    setOutputSafe("currentShootingStreakStatus", currentShootingStreakStatus);
    setOutputSafe("errorOut", "");

    console.log(JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      statusOut: "success",
      recordId,
      enrollmentId,
      weekId,
      weeklySummaryId,
      subjectOut: subject,
      dailyEmailTo: recipientCsv,
      emailVersion,
      submissionXp: submissionXpInfo.xp,
      weeklyXp: weeklyXpInfo.xp,
      weeklySummaryShots,
      scannedWeekShots: scannedWeekTotals.shots,
      finalWeekShotsUsed: weekShots,
      weeklySummaryMakes,
      scannedWeekMakes: scannedWeekTotals.makes,
      finalWeekMakesUsed: weekMakes,
      weeklyGoalTarget,
      goalPercent,
      currentShootingStreak,
      currentShootingStreakAsOf,
      currentShootingStreakWindow,
      currentShootingStreakStatus,
      submittedItems,
      homeworkAssignedItems,
      homeworkSatisfactoryItems,
      nextAutomationTriggerChecked: true,
    }, null, 2));

  } catch (error) {
    const message = String(error.message || error);

    await writeErrorStatus(recordId, message);

    setOutputSafe("statusOut", "error");
    setOutputSafe("recordId", recordId);
    setOutputSafe("errorOut", message);

    throw error;
  }
}

/* =========================================================
   SECTION 8: RUN
========================================================= */

await main();
