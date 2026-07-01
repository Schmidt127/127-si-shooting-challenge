/*
Extension Script: Intake Manual Email Video Feedback Submission
System: 127 SI Shooting Challenge
Purpose:
  Parent emailed video(s) too large for Fillout. This creates normal Submissions
  rows with Video Upload attached so the standard pipeline can run:

    Submission (Video Upload)
      -> 009 Create Submission Assets
      -> 013 Create / link Video Feedback
      -> 070b Send asset to Make (Drive upload)
      -> 022 writeback
      -> coach review -> 114 video XP -> 073 parent email

  Video-only rows do NOT receive daily shooting XP (010 skips zero-shot /
  video-only submissions). That is expected.

Setup:
  1. Edit ATHLETE_ROWS below (names + optional enrollment record IDs).
  2. Set ACTIVITY_DATE_ISO (submission + activity date).
  3. DRY_RUN = true first; review console plan.
  4. CONFIRM_WRITE = true and DRY_RUN = false to create rows.
  5. When prompted, pick each brother's video file from your computer.

  If a file is too large for the extension uploader, set SKIP_FILE_PROMPT = true
  and attach Video Upload manually in Airtable after the shell row is created.

Default: dry run (no writes)
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const SKIP_FILE_PROMPT = false;

const ACTIVITY_DATE_ISO = "2026-06-30";
// If the activity date is outside every Week Start/End range (e.g. program end day),
// the script falls back to this week name. Set WEEK_ID_OVERRIDE to pin a record id.
const FALLBACK_WEEK_NAME = "Week 10";
const WEEK_ID_OVERRIDE = "";
const VIDEO_UPLOAD_NOTE =
  "Manual intake: parent emailed video (Fillout file too large). Coach uploaded via extension script.";

const ATHLETE_ROWS = [
  {
    label: "Lyle Kimm",
    nameMatchers: ["Lyle Kimm", "Kimm, Lyle"],
    enrollmentId: "rec83ku1pTHmPNwRo",
  },
  {
    label: "Koen Kimm",
    nameMatchers: ["Koen Kimm", "Kimm, Koen"],
    enrollmentId: "recZZ4Op05Hg0FpQq",
  },
];

const CONFIG = {
  scriptName: "intake-manual-email-video-feedback-submission",
  version: "v1.1",
  timeZone: "America/Denver",

  tables: {
    submissions: "Submissions",
    enrollments: "Enrollments",
    weeks: "Weeks",
  },

  submissions: {
    enrollment: "Enrollment",
    athlete: "Athlete",
    week: "Week",
    activityDate: "Activity Date",
    videoUpload: "Video Upload",
    videoUploadNote: "Video Upload Note",
    videoCount: "Video Count",
    duplicateReviewStatus: "Duplicate Review Status",
    hasVideo: "Has Video?",
    readyFor009: "Ready for 009 Asset Creation?",
    whyNotReadyFor009: "Why Not Ready for 009?",
    submissionAssets: "Submission Assets",
  },

  enrollments: {
    fullName: "Full Athlete Name",
    athlete: "Athlete",
    active: "Active?",
  },

  weeks: {
    name: "Week Name",
    startDate: "Start Date",
    endDate: "End Date",
    active: "Active Week?",
  },

  values: {
    duplicateCountIt: "Count It",
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

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getRaw(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function toDateKeyFromText(text) {
  const value = String(text || "").trim();
  if (!value) return "";

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const localMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localMatch) {
    const month = localMatch[1].padStart(2, "0");
    const day = localMatch[2].padStart(2, "0");
    const year = localMatch[3];
    return `${year}-${month}-${day}`;
  }

  return "";
}

function toDateKeyFromDateObject(value, timeZone = CONFIG.timeZone) {
  if (!value) return "";

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);

  const year = parts.find(part => part.type === "year")?.value || "";
  const month = parts.find(part => part.type === "month")?.value || "";
  const day = parts.find(part => part.type === "day")?.value || "";

  if (!year || !month || !day) return "";

  return `${year}-${month}-${day}`;
}

function toSafeDateKey(record, table, fieldName) {
  const fromText = toDateKeyFromText(getText(record, table, fieldName));
  if (fromText) return fromText;
  return toDateKeyFromDateObject(getRaw(record, table, fieldName), CONFIG.timeZone);
}

function compareDateKeys(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return String(a).localeCompare(String(b));
}

function linkedCell(ids) {
  return ids.map(id => ({ id }));
}

function choiceCell(table, fieldName, choiceName) {
  if (!fieldExists(table, fieldName) || !choiceName) return undefined;
  try {
    const field = table.getField(fieldName);
    const choices = field.options?.choices || [];
    if (!choices.some(choice => choice.name === choiceName)) return undefined;
    return { name: choiceName };
  } catch {
    return undefined;
  }
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(recordName, matchers) {
  const normalizedRecord = normalizeName(recordName);
  return matchers.some(matcher => {
    const normalizedMatcher = normalizeName(matcher);
    return (
      normalizedRecord === normalizedMatcher ||
      normalizedRecord.includes(normalizedMatcher) ||
      normalizedMatcher.includes(normalizedRecord)
    );
  });
}

function parseActivityDate(isoDate) {
  const parts = String(isoDate || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid ACTIVITY_DATE_ISO: ${isoDate}`);
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function normalizeWeekName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeWeeks(weekRecords, weeksTable) {
  return weekRecords.map(week => ({
    id: week.id,
    name: getText(week, weeksTable, CONFIG.weeks.name),
    startKey: toSafeDateKey(week, weeksTable, CONFIG.weeks.startDate),
    endKey: toSafeDateKey(week, weeksTable, CONFIG.weeks.endDate),
    active: fieldExists(weeksTable, CONFIG.weeks.active)
      ? getBooleanish(week, weeksTable, CONFIG.weeks.active)
      : true,
  }));
}

function findWeekForDateKey(weekRecords, weeksTable, activityDateKey) {
  if (!activityDateKey) return null;

  const matches = weekRecords
    .map(week => ({
      week,
      weekName: getText(week, weeksTable, CONFIG.weeks.name),
      startKey: toSafeDateKey(week, weeksTable, CONFIG.weeks.startDate),
      endKey: toSafeDateKey(week, weeksTable, CONFIG.weeks.endDate),
      isActive: fieldExists(weeksTable, CONFIG.weeks.active)
        ? getBooleanish(week, weeksTable, CONFIG.weeks.active)
        : true,
    }))
    .filter(item => {
      return (
        item.isActive &&
        item.startKey &&
        item.endKey &&
        compareDateKeys(activityDateKey, item.startKey) >= 0 &&
        compareDateKeys(activityDateKey, item.endKey) <= 0
      );
    })
    .sort((a, b) => {
      const startCompare = compareDateKeys(a.startKey, b.startKey);
      if (startCompare !== 0) return startCompare;
      return String(a.weekName || "").localeCompare(String(b.weekName || ""));
    });

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(
      `Multiple active weeks match ${activityDateKey}: ${matches
        .map(item => item.weekName || item.week.id)
        .join(", ")}`
    );
  }

  return { week: matches[0].week, source: "activity_date" };
}

function findWeekByName(weekRecords, weeksTable, weekName) {
  const target = normalizeWeekName(weekName);
  if (!target) return null;

  const matches = weekRecords.filter(week => {
    const name = normalizeWeekName(getText(week, weeksTable, CONFIG.weeks.name));
    return name === target || name.includes(target) || target.includes(name);
  });

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(
      `Multiple weeks match name "${weekName}": ${matches
        .map(week => getText(week, weeksTable, CONFIG.weeks.name) || week.id)
        .join(", ")}`
    );
  }

  return { week: matches[0], source: "fallback_week_name" };
}

function resolveWeek(weekRecords, weeksTable) {
  if (WEEK_ID_OVERRIDE) {
    const byId = weekRecords.find(week => week.id === WEEK_ID_OVERRIDE);
    if (!byId) {
      throw new Error(`WEEK_ID_OVERRIDE not found: ${WEEK_ID_OVERRIDE}`);
    }
    return { week: byId, source: "week_id_override" };
  }

  const byDate = findWeekForDateKey(weekRecords, weeksTable, ACTIVITY_DATE_ISO);
  if (byDate) return byDate;

  if (FALLBACK_WEEK_NAME) {
    const byName = findWeekByName(weekRecords, weeksTable, FALLBACK_WEEK_NAME);
    if (byName) {
      console.log(
        `No active week date range contains ${ACTIVITY_DATE_ISO}. Using fallback week "${FALLBACK_WEEK_NAME}".`
      );
      return byName;
    }
  }

  const summary = summarizeWeeks(weekRecords, weeksTable);
  throw new Error(
    `No Week resolved for activity date ${ACTIVITY_DATE_ISO}. ` +
      `Set FALLBACK_WEEK_NAME or WEEK_ID_OVERRIDE. Known weeks: ${JSON.stringify(summary)}`
  );
}

function findEnrollment(enrollmentRecords, enrollmentsTable, row) {
  if (row.enrollmentId) {
    const byId = enrollmentRecords.find(record => record.id === row.enrollmentId);
    if (byId) return byId;
    throw new Error(`Enrollment not found by id: ${row.enrollmentId} (${row.label})`);
  }

  const activeMatches = enrollmentRecords.filter(record => {
    if (fieldExists(enrollmentsTable, CONFIG.enrollments.active)) {
      if (!getBooleanish(record, enrollmentsTable, CONFIG.enrollments.active)) return false;
    }
    const fullName = getText(record, enrollmentsTable, CONFIG.enrollments.fullName);
    return namesMatch(fullName, row.nameMatchers);
  });

  if (activeMatches.length === 1) return activeMatches[0];
  if (activeMatches.length === 0) {
    throw new Error(`No active enrollment match for ${row.label}`);
  }
  throw new Error(
    `Multiple active enrollments match ${row.label}: ${activeMatches
      .map(record => getText(record, enrollmentsTable, CONFIG.enrollments.fullName) || record.id)
      .join(", ")}`
  );
}

function findExistingVideoSubmission(submissionRecords, submissionsTable, enrollmentId, activityDateKey) {
  return submissionRecords.filter(record => {
    const enrollmentIds = getLinkedIds(record, submissionsTable, CONFIG.submissions.enrollment);
    if (!enrollmentIds.includes(enrollmentId)) return false;
    const activityKey = toSafeDateKey(record, submissionsTable, CONFIG.submissions.activityDate);
    if (!activityKey || activityKey !== activityDateKey) return false;
    const videoCount = getText(record, submissionsTable, CONFIG.submissions.videoUpload);
    return Boolean(videoCount) || getBooleanish(record, submissionsTable, CONFIG.submissions.hasVideo);
  });
}

async function buildSubmissionFields({
  submissionsTable,
  enrollmentRecord,
  enrollmentsTable,
  weekRecord,
  weeksTable,
  activityDate,
  pickedFile,
}) {
  const enrollmentId = enrollmentRecord.id;
  const athleteIds = getLinkedIds(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.athlete);
  const fields = {};

  if (isWritableField(submissionsTable, CONFIG.submissions.enrollment)) {
    fields[CONFIG.submissions.enrollment] = linkedCell([enrollmentId]);
  }
  if (athleteIds.length && isWritableField(submissionsTable, CONFIG.submissions.athlete)) {
    fields[CONFIG.submissions.athlete] = linkedCell([athleteIds[0]]);
  }
  if (isWritableField(submissionsTable, CONFIG.submissions.week)) {
    fields[CONFIG.submissions.week] = linkedCell([weekRecord.id]);
  }
  if (isWritableField(submissionsTable, CONFIG.submissions.activityDate)) {
    fields[CONFIG.submissions.activityDate] = activityDate;
  }
  if (isWritableField(submissionsTable, CONFIG.submissions.videoCount)) {
    fields[CONFIG.submissions.videoCount] = 1;
  }
  if (isWritableField(submissionsTable, CONFIG.submissions.videoUploadNote)) {
    fields[CONFIG.submissions.videoUploadNote] = VIDEO_UPLOAD_NOTE;
  }

  const duplicateChoice = choiceCell(
    submissionsTable,
    CONFIG.submissions.duplicateReviewStatus,
    CONFIG.values.duplicateCountIt
  );
  if (duplicateChoice) {
    fields[CONFIG.submissions.duplicateReviewStatus] = duplicateChoice;
  }

  if (pickedFile?.url && isWritableField(submissionsTable, CONFIG.submissions.videoUpload)) {
    fields[CONFIG.submissions.videoUpload] = [
      {
        url: pickedFile.url,
        filename: pickedFile.name || pickedFile.filename || "video_feedback.mp4",
      },
    ];
  }

  return {
    fields,
    enrollmentId,
    athleteIds,
    weekName: getText(weekRecord, weeksTable, CONFIG.weeks.name),
    enrollmentName: getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.fullName),
  };
}

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true but DRY_RUN is still true. Set DRY_RUN = false to apply writes.");
  }

  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const activityDate = parseActivityDate(ACTIVITY_DATE_ISO);

  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [
      CONFIG.enrollments.fullName,
      CONFIG.enrollments.athlete,
      CONFIG.enrollments.active,
    ].filter(name => fieldExists(enrollmentsTable, name)),
  });

  const weekFields = [
    CONFIG.weeks.name,
    CONFIG.weeks.startDate,
    CONFIG.weeks.endDate,
    CONFIG.weeks.active,
  ].filter(name => fieldExists(weeksTable, name));

  const weekQuery = await weeksTable.selectRecordsAsync({ fields: weekFields });
  const weekResolution = resolveWeek(weekQuery.records, weeksTable);
  const weekRecord = weekResolution.week;

  const submissionQuery = await submissionsTable.selectRecordsAsync({
    fields: [
      CONFIG.submissions.enrollment,
      CONFIG.submissions.activityDate,
      CONFIG.submissions.videoUpload,
      CONFIG.submissions.hasVideo,
      CONFIG.submissions.submissionAssets,
    ].filter(name => fieldExists(submissionsTable, name)),
  });

  const plans = [];

  for (const row of ATHLETE_ROWS) {
    const enrollmentRecord = findEnrollment(enrollmentQuery.records, enrollmentsTable, row);
    const existing = findExistingVideoSubmission(
      submissionQuery.records,
      submissionsTable,
      enrollmentRecord.id,
      ACTIVITY_DATE_ISO
    );

    let pickedFile = null;
    if (!SKIP_FILE_PROMPT) {
      pickedFile = await input.fileAsync(`Pick video file for ${row.label}`);
    }

    const built = await buildSubmissionFields({
      submissionsTable,
      enrollmentRecord,
      enrollmentsTable,
      weekRecord,
      weeksTable,
      activityDate,
      pickedFile,
    });

    plans.push({
      athleteLabel: row.label,
      enrollmentName: built.enrollmentName,
      enrollmentId: built.enrollmentId,
      weekName: built.weekName,
      weekId: weekRecord.id,
      activityDate: ACTIVITY_DATE_ISO,
      fileName: pickedFile?.name || pickedFile?.filename || "(attach manually)",
      existingSameDayVideoCount: existing.length,
      fields: built.fields,
    });
  }

  console.log(
    `Week: ${getText(weekRecord, weeksTable, CONFIG.weeks.name)} (${weekRecord.id}) via ${weekResolution.source}`
  );
  console.log(`Activity date: ${ACTIVITY_DATE_ISO}`);
  if (weekResolution.source !== "activity_date") {
    console.log("Week calendar (for reference):");
    console.log(JSON.stringify(summarizeWeeks(weekQuery.records, weeksTable), null, 2));
  }
  console.log(`Plans: ${plans.length}`);
  console.log(JSON.stringify(plans, null, 2));

  if (DRY_RUN) {
    console.log("\nDRY RUN — no Submissions created.");
    console.log("Set CONFIRM_WRITE = true and DRY_RUN = false, then re-run.");
    return;
  }

  const created = [];

  for (const plan of plans) {
    if (plan.existingSameDayVideoCount > 0) {
      console.log(
        `WARNING: ${plan.athleteLabel} already has ${plan.existingSameDayVideoCount} video submission(s) on ${ACTIVITY_DATE_ISO}. Creating another row anyway.`
      );
    }

    const submissionId = await submissionsTable.createRecordAsync(plan.fields);
    created.push({
      athleteLabel: plan.athleteLabel,
      submissionId,
      enrollmentId: plan.enrollmentId,
    });
  }

  console.log("\nCreated Submissions:");
  console.log(JSON.stringify(created, null, 2));
  console.log("\nNext steps (automations — give them 1–3 minutes):");
  console.log("  1. Submission Assets row appears (009)");
  console.log("  2. Video Feedback row appears (013)");
  console.log("  3. Asset uploads to Drive (070b + Make)");
  console.log("  4. Coach reviews Video Feedback as usual");
  console.log("\nOptional audits after pipeline drains:");
  console.log("  - audit-video-pipeline-integrity.js");
  console.log("  - audit-submission-pipeline-integrity.js");
}

await main();
