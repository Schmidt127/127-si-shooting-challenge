/*
Automation: 057 - Achievements and Milestones - Calculate Perfect Week Eligibility
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

/***************************************************************************************************
 * 057 - Achievements and Milestones - Calculate Perfect Week Eligibility
 * Version: 1.3
 * Date written: 2026-05-30
 * Last updated: 2026-07-18
 *
 * Purpose:
 * Calculates Perfect Week helper fields on one Weekly Athlete Summary record.
 *
 * Version 1.3 updates (C-025 Stage 17):
 * - Zoom attendance count = live Attendees ∪ qualifying Recording Quiz credits.
 * - Never writes Zoom Meetings.Attendees.
 * - Prefer live when both live and recording exist for the same meeting.
 * - Sets Perfect Week Credit Applied? on Zoom Attendance rows actually counted.
 *
 * Version 1.2 updates:
 * - Keeps official Sunday-Saturday week logic from Version 1.1.
 * - Keeps same-day submission requirement.
 * - Keeps conditional Zoom requirement.
 * - Rewrites homework requirement:
 *   Perfect Week now requires 100% of assigned homework for the week to be satisfactorily completed.
 *
 * Perfect Week requirements calculated by this script:
 * 1. Athlete must have one qualifying same-day shooting submission day for each official day
 *    of the linked Week, Sunday through Saturday.
 * 2. Each official day must meet at least 1/7 of the weekly shot goal.
 * 3. Athlete must have at least 3 qualifying Video Feedback records for the week.
 * 4. Athlete must attend Zoom if a Zoom meeting exists for the linked Week
 *    (live Attendees OR Stage 17 approved recording credit that counts for Perfect Week).
 * 5. Athlete must satisfactorily complete 100% of homework assignments assigned for the week.
 *
 * Notes:
 * - This script only calculates helper fields.
 * - It does not create the Perfect Week unlock.
 * - It expects the automation input variable to be named recordId.
 ***************************************************************************************************/

/***************************************************************************************************
 * 1. Configuration
 ***************************************************************************************************/

const CONFIG = {
  timezone: "America/Denver",

  tables: {
    weekly: "Weekly Athlete Summary",
    submissions: "Submissions",
    homeworkCompletions: "Homework Completions",
    video: "Video Feedback",
    zoom: "Zoom Meetings",
    zoomAttendance: "Zoom Attendance",
    weeks: "Weeks",
  },

  weeklyFields: {
    enrollment: "Enrollment",
    week: "Week",
    gradeBand: "Grade Band",
    goalRecord: "Goal Record",

    weeklyGoal: "Weekly Goal Shots Target",
    fallbackGoal: "Goal Shots Target",

    submissions: "Submissions",

    homeworkAssigned: "Homework",
    homeworkCompletionsLink: "Homework Completions Link",

    dailyStatus: "Perfect Week Daily Check Status",
    dailyDetail: "Perfect Week Daily Check Detail",
    dailyMet: "Perfect Week Daily Requirement Met?",

    videoCount: "Perfect Week Video Count",

    zoomMeetingCount: "Perfect Week Zoom Meeting Count",
    zoomAttendanceCount: "Perfect Week Zoom Attendance Count",

    homeworkAssignedCount: "Perfect Week Homework Assigned Count",
    homeworkSatisfactoryCount: "Perfect Week Homework Satisfactory Count",
    homeworkMet: "Perfect Week Homework Requirement Met?",

    automationStatus: "Perfect Week Automation Status",
    automationError: "Perfect Week Automation Error",
  },

  weekFields: {
    startDate: "Start Date",
  },

  submissionFields: {
    activityDate: "Activity Date",
    totalShotsCounted: "Total Shots Counted",
    perfectWeekCountable: "Perfect Week Countable Submission?",
  },

  homeworkCompletionFields: {
    homework: "Homework",
    satisfactory: "Satisfactory?",
    completionStatus: "Completion Status",
  },

  videoFields: {
    enrollment: "Enrollment",
    submission: "Submission",
  },

  zoomFields: {
    week: "Week",
    attendees: "Attendees",
  },

  zoomAttendanceFields: {
    attendanceMethod: "Attendance Method",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    approved: "Zoom Credit Approved?",
    conflict: "Zoom Credit Conflict?",
    pwFlag: "Effective Recording Counts for Perfect Week?",
    pwApplied: "Perfect Week Credit Applied?",
    reviewStatus: "Recording Quiz Review Status",
  },

  recordingMethod: "Recording Quiz",
  reviewNeedsCorrection: "Needs Correction",

  requiredVideoCount: 3,
  requiredDailyCount: 7,
};

/***************************************************************************************************
 * 2. Helper Functions
 ***************************************************************************************************/

function getFirstLinkedId(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value) || value.length === 0) return null;
  return value[0].id;
}

function getLinkedIds(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id);
}

function getLinkedNames(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.name || item.id);
}

function uniqueArray(values) {
  return [...new Set(values.filter(Boolean))];
}

function getNumber(record, fieldName) {
  const value = record.getCellValue(fieldName);

  if (typeof value === "number") return value;

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "number") return first;
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getText(record, fieldName) {
  try {
    const v = record.getCellValueAsString(fieldName);
    return v == null ? "" : String(v).trim();
  } catch (e) {
    return "";
  }
}

function isTruthyFlag(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (v === true || v === 1 || v === "1") return true;
  if (Array.isArray(v) && v.length === 1) {
    const first = v[0];
    return first === true || first === 1 || first === "1";
  }
  return false;
}

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch (e) {
    return false;
  }
}

function getDateKeyFromDateOnly(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

function addDaysToDateKey(dateKey, daysToAdd) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function buildRequiredWeekDates(startDateKey) {
  const dates = [];
  for (let i = 0; i < CONFIG.requiredDailyCount; i += 1) {
    dates.push(addDaysToDateKey(startDateKey, i));
  }
  return dates;
}

function isTruthyNumber(record, fieldName) {
  const value = record.getCellValue(fieldName);
  return value === 1 || value === true || value === "1";
}

function isHomeworkSatisfactory(record) {
  const satisfactory = record.getCellValue(CONFIG.homeworkCompletionFields.satisfactory);
  if (satisfactory === true) return true;

  const status = record.getCellValueAsString(CONFIG.homeworkCompletionFields.completionStatus);
  return status.toLowerCase().includes("satisfactory");
}

async function updateWeekly(fields) {
  await weeklyTable.updateRecordAsync(weeklyRecord.id, fields);
}

/***************************************************************************************************
 * 3. Load Tables and Trigger Record
 ***************************************************************************************************/

const inputConfig = input.config();
const recordId = inputConfig.recordId;

if (!recordId) {
  throw new Error("Missing input variable: recordId");
}

const weeklyTable = base.getTable(CONFIG.tables.weekly);
const submissionsTable = base.getTable(CONFIG.tables.submissions);
const homeworkCompletionsTable = base.getTable(CONFIG.tables.homeworkCompletions);
const videoTable = base.getTable(CONFIG.tables.video);
const zoomTable = base.getTable(CONFIG.tables.zoom);
const zoomAttendanceTable = base.getTable(CONFIG.tables.zoomAttendance);
const weeksTable = base.getTable(CONFIG.tables.weeks);

const weeklyRecord = await weeklyTable.selectRecordAsync(recordId);

if (!weeklyRecord) {
  throw new Error(`Weekly Athlete Summary record not found: ${recordId}`);
}

/***************************************************************************************************
 * 4. Main Processing
 ***************************************************************************************************/

try {
  const enrollmentId = getFirstLinkedId(weeklyRecord, CONFIG.weeklyFields.enrollment);
  const weekId = getFirstLinkedId(weeklyRecord, CONFIG.weeklyFields.week);

  if (!enrollmentId || !weekId) {
    await updateWeekly({
      [CONFIG.weeklyFields.dailyStatus]: { name: "Needs Review" },
      [CONFIG.weeklyFields.dailyDetail]: "Missing Enrollment or Week.",
      [CONFIG.weeklyFields.dailyMet]: false,
      [CONFIG.weeklyFields.videoCount]: 0,
      [CONFIG.weeklyFields.zoomMeetingCount]: 0,
      [CONFIG.weeklyFields.zoomAttendanceCount]: 0,
      [CONFIG.weeklyFields.homeworkAssignedCount]: 0,
      [CONFIG.weeklyFields.homeworkSatisfactoryCount]: 0,
      [CONFIG.weeklyFields.homeworkMet]: 0,
      [CONFIG.weeklyFields.automationStatus]: { name: "Error" },
      [CONFIG.weeklyFields.automationError]: "Missing Enrollment or Week.",
    });

    return;
  }

  const weekRecord = await weeksTable.selectRecordAsync(weekId, {
    fields: [CONFIG.weekFields.startDate],
  });

  if (!weekRecord) {
    await updateWeekly({
      [CONFIG.weeklyFields.dailyStatus]: { name: "Needs Review" },
      [CONFIG.weeklyFields.dailyDetail]: "Linked Week record could not be found.",
      [CONFIG.weeklyFields.dailyMet]: false,
      [CONFIG.weeklyFields.automationStatus]: { name: "Error" },
      [CONFIG.weeklyFields.automationError]: "Linked Week record could not be found.",
    });

    return;
  }

  const weekStartDateKey = getDateKeyFromDateOnly(
    weekRecord.getCellValue(CONFIG.weekFields.startDate)
  );

  if (!weekStartDateKey) {
    await updateWeekly({
      [CONFIG.weeklyFields.dailyStatus]: { name: "Needs Review" },
      [CONFIG.weeklyFields.dailyDetail]: "Missing Week Start Date.",
      [CONFIG.weeklyFields.dailyMet]: false,
      [CONFIG.weeklyFields.automationStatus]: { name: "Error" },
      [CONFIG.weeklyFields.automationError]: "Missing Weeks -> Start Date.",
    });

    return;
  }

  const requiredDateKeys = buildRequiredWeekDates(weekStartDateKey);
  const requiredDateSet = new Set(requiredDateKeys);

  let weeklyGoal = getNumber(weeklyRecord, CONFIG.weeklyFields.weeklyGoal);

  if (!weeklyGoal) {
    weeklyGoal = getNumber(weeklyRecord, CONFIG.weeklyFields.fallbackGoal);
  }

  if (!weeklyGoal) {
    await updateWeekly({
      [CONFIG.weeklyFields.dailyStatus]: { name: "Needs Review" },
      [CONFIG.weeklyFields.dailyDetail]: "Missing weekly shot goal.",
      [CONFIG.weeklyFields.dailyMet]: false,
      [CONFIG.weeklyFields.automationStatus]: { name: "Error" },
      [CONFIG.weeklyFields.automationError]: "Missing Weekly Goal Shots Target / Goal Shots Target.",
    });

    return;
  }

  const roundedWeeklyGoal = Math.ceil(weeklyGoal);
  const dailyMinimum = Math.ceil(weeklyGoal / CONFIG.requiredDailyCount);

  /*************************************************************************************************
   * 4A. Daily Shooting Requirement
   *************************************************************************************************/

  const linkedSubmissionIds = getLinkedIds(weeklyRecord, CONFIG.weeklyFields.submissions);

  let submissionRecords = [];

  if (linkedSubmissionIds.length > 0) {
    const submissionsQuery = await submissionsTable.selectRecordsAsync({
      fields: [
        CONFIG.submissionFields.activityDate,
        CONFIG.submissionFields.totalShotsCounted,
        CONFIG.submissionFields.perfectWeekCountable,
      ],
    });

    submissionRecords = linkedSubmissionIds
      .map((id) => submissionsQuery.getRecord(id))
      .filter(Boolean);
  }

  const dayMap = new Map();
  let ignoredCount = 0;
  let outsideOfficialWeekCount = 0;

  for (const sub of submissionRecords) {
    const isCountable = isTruthyNumber(sub, CONFIG.submissionFields.perfectWeekCountable);

    if (!isCountable) {
      ignoredCount += 1;
      continue;
    }

    const dateKey = getDateKeyFromDateOnly(
      sub.getCellValue(CONFIG.submissionFields.activityDate)
    );

    if (!dateKey) {
      ignoredCount += 1;
      continue;
    }

    if (!requiredDateSet.has(dateKey)) {
      outsideOfficialWeekCount += 1;
      continue;
    }

    const shots = getNumber(sub, CONFIG.submissionFields.totalShotsCounted);

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, 0);
    }

    dayMap.set(dateKey, dayMap.get(dateKey) + shots);
  }

  const missingDays = [];
  const failingDays = [];
  const passingDays = [];

  for (const dateKey of requiredDateKeys) {
    const shots = dayMap.get(dateKey) || 0;

    if (shots <= 0) {
      missingDays.push(dateKey);
    } else if (shots < dailyMinimum) {
      failingDays.push(`${dateKey}: ${shots}/${dailyMinimum}`);
    } else {
      passingDays.push(`${dateKey}: ${shots}/${dailyMinimum}`);
    }
  }

  const allOfficialDaysPresent = missingDays.length === 0;
  const allDaysMeetMinimum = failingDays.length === 0;
  const dailyMet = allOfficialDaysPresent && allDaysMeetMinimum;

  const dailyStatusName = dailyMet ? "Pass" : "Fail";

  const dailyDetailLines = [];
  dailyDetailLines.push(`Official week: ${requiredDateKeys[0]} through ${requiredDateKeys[6]}`);
  dailyDetailLines.push(`Weekly goal: ${roundedWeeklyGoal}`);
  dailyDetailLines.push(`Daily minimum: ${dailyMinimum}`);
  dailyDetailLines.push(`Passing official days: ${passingDays.length}/7`);
  dailyDetailLines.push(`Ignored non-countable submissions: ${ignoredCount}`);
  dailyDetailLines.push(`Ignored countable submissions outside official week: ${outsideOfficialWeekCount}`);

  if (passingDays.length > 0) {
    dailyDetailLines.push(`Passing days: ${passingDays.join("; ")}`);
  }

  if (missingDays.length > 0) {
    dailyDetailLines.push(`FAIL: Missing official week days: ${missingDays.join("; ")}`);
  }

  if (failingDays.length > 0) {
    dailyDetailLines.push(`FAIL: Below daily minimum: ${failingDays.join("; ")}`);
  }

  if (dailyMet) {
    dailyDetailLines.push("PASS: All seven official Sunday-Saturday dates met the same-day daily shooting requirement.");
  }

  /*************************************************************************************************
   * 4B. Homework Requirement
   *
   * Rule:
   * Perfect Week requires 100% of assigned homework to be satisfactorily completed.
   *
   * Source of assigned homework:
   * - Weekly Athlete Summary -> Homework
   *
   * Source of completed homework:
   * - Weekly Athlete Summary -> Homework Completions Link
   *
   * If no homework is assigned, homework is treated as not required and therefore passed.
   *************************************************************************************************/

  const assignedHomeworkIds = uniqueArray(
    getLinkedIds(weeklyRecord, CONFIG.weeklyFields.homeworkAssigned)
  );

  const linkedHomeworkCompletionIds = uniqueArray(
    getLinkedIds(weeklyRecord, CONFIG.weeklyFields.homeworkCompletionsLink)
  );

  let assignedHomeworkCount = assignedHomeworkIds.length;
  let satisfactoryHomeworkCount = 0;

  if (linkedHomeworkCompletionIds.length > 0) {
    const homeworkQuery = await homeworkCompletionsTable.selectRecordsAsync({
      fields: [
        CONFIG.homeworkCompletionFields.homework,
        CONFIG.homeworkCompletionFields.satisfactory,
        CONFIG.homeworkCompletionFields.completionStatus,
      ],
    });

    const satisfactoryAssignedHomeworkIds = new Set();
    let satisfactoryUnmatchedCompletionCount = 0;

    for (const id of linkedHomeworkCompletionIds) {
      const hwCompletion = homeworkQuery.getRecord(id);
      if (!hwCompletion) continue;

      if (!isHomeworkSatisfactory(hwCompletion)) continue;

      const completionHomeworkIds = getLinkedIds(
        hwCompletion,
        CONFIG.homeworkCompletionFields.homework
      );

      if (assignedHomeworkIds.length === 0) {
        satisfactoryUnmatchedCompletionCount += 1;
        continue;
      }

      for (const homeworkId of completionHomeworkIds) {
        if (assignedHomeworkIds.includes(homeworkId)) {
          satisfactoryAssignedHomeworkIds.add(homeworkId);
        }
      }
    }

    if (assignedHomeworkIds.length > 0) {
      satisfactoryHomeworkCount = satisfactoryAssignedHomeworkIds.size;
    } else {
      satisfactoryHomeworkCount = satisfactoryUnmatchedCompletionCount;
    }
  }

  /*
   * Fallback:
   * If Weekly Athlete Summary -> Homework is empty but linked homework completions exist,
   * use the unique Homework records from those linked completions as the assigned count.
   * This prevents older weekly summaries with linked completions but missing assigned homework
   * from always appearing as "No Homework This Week."
   */
  if (assignedHomeworkCount === 0 && linkedHomeworkCompletionIds.length > 0) {
    const homeworkQuery = await homeworkCompletionsTable.selectRecordsAsync({
      fields: [
        CONFIG.homeworkCompletionFields.homework,
        CONFIG.homeworkCompletionFields.satisfactory,
        CONFIG.homeworkCompletionFields.completionStatus,
      ],
    });

    const homeworkIdsFromCompletions = new Set();
    const satisfactoryHomeworkIdsFromCompletions = new Set();

    for (const id of linkedHomeworkCompletionIds) {
      const hwCompletion = homeworkQuery.getRecord(id);
      if (!hwCompletion) continue;

      const completionHomeworkIds = getLinkedIds(
        hwCompletion,
        CONFIG.homeworkCompletionFields.homework
      );

      for (const homeworkId of completionHomeworkIds) {
        homeworkIdsFromCompletions.add(homeworkId);

        if (isHomeworkSatisfactory(hwCompletion)) {
          satisfactoryHomeworkIdsFromCompletions.add(homeworkId);
        }
      }
    }

    assignedHomeworkCount = homeworkIdsFromCompletions.size;
    satisfactoryHomeworkCount = satisfactoryHomeworkIdsFromCompletions.size;
  }

  const homeworkMet =
    assignedHomeworkCount === 0 || satisfactoryHomeworkCount >= assignedHomeworkCount
      ? 1
      : 0;

  /*************************************************************************************************
   * 4C. Video Requirement
   *************************************************************************************************/

  const videoQuery = await videoTable.selectRecordsAsync({
    fields: [
      CONFIG.videoFields.enrollment,
      CONFIG.videoFields.submission,
    ],
  });

  let videoCount = 0;

  for (const video of videoQuery.records) {
    const videoEnrollmentId = getFirstLinkedId(video, CONFIG.videoFields.enrollment);
    if (videoEnrollmentId !== enrollmentId) continue;

    const videoSubmissionId = getFirstLinkedId(video, CONFIG.videoFields.submission);
    if (!linkedSubmissionIds.includes(videoSubmissionId)) continue;

    videoCount += 1;
  }

  /*************************************************************************************************
   * 4D. Zoom Requirement (live Attendees ∪ Stage 17 recording credit)
   * Never writes Zoom Meetings.Attendees.
   *************************************************************************************************/

  const zoomQuery = await zoomTable.selectRecordsAsync({
    fields: [
      CONFIG.zoomFields.week,
      CONFIG.zoomFields.attendees,
    ],
  });

  const weekMeetingIds = [];
  const liveAttendedMeetingIds = [];

  for (const zoom of zoomQuery.records) {
    const zoomWeekId = getFirstLinkedId(zoom, CONFIG.zoomFields.week);
    if (zoomWeekId !== weekId) continue;

    weekMeetingIds.push(zoom.id);

    const attendeeIds = getLinkedIds(zoom, CONFIG.zoomFields.attendees);
    if (attendeeIds.includes(enrollmentId)) {
      liveAttendedMeetingIds.push(zoom.id);
    }
  }

  const weekMeetingSet = new Set(weekMeetingIds);
  const attendedMeetingSet = new Set(liveAttendedMeetingIds);
  const recordingZaToMarkApplied = [];

  const zaFieldNames = Object.values(CONFIG.zoomAttendanceFields).filter((n) =>
    fieldExists(zoomAttendanceTable, n)
  );
  const zaQuery = await zoomAttendanceTable.selectRecordsAsync({ fields: zaFieldNames });

  for (const za of zaQuery.records) {
    if (getText(za, CONFIG.zoomAttendanceFields.attendanceMethod) !== CONFIG.recordingMethod) continue;
    const zaEnrollmentId = getFirstLinkedId(za, CONFIG.zoomAttendanceFields.enrollment);
    if (zaEnrollmentId !== enrollmentId) continue;
    const meetingId = getFirstLinkedId(za, CONFIG.zoomAttendanceFields.zoomMeeting);
    if (!meetingId || !weekMeetingSet.has(meetingId)) continue;
    if (isTruthyFlag(za, CONFIG.zoomAttendanceFields.conflict)) continue;
    if (!isTruthyFlag(za, CONFIG.zoomAttendanceFields.approved)) continue;
    if (!isTruthyFlag(za, CONFIG.zoomAttendanceFields.pwFlag)) continue;
    if (getText(za, CONFIG.zoomAttendanceFields.reviewStatus) === CONFIG.reviewNeedsCorrection) continue;

    // Prefer live: if already live-attended, do not double-count; still may mark applied if we counted recording-only.
    if (!attendedMeetingSet.has(meetingId)) {
      attendedMeetingSet.add(meetingId);
      recordingZaToMarkApplied.push(za.id);
    }
  }

  try {
    zaQuery.unloadData();
  } catch (e) {
    /* older runtimes */
  }

  const zoomMeetingCount = weekMeetingIds.length;
  const zoomAttendanceCount = attendedMeetingSet.size;

  // Applied? = actually consumed by this Perfect Week calculation (not mere eligibility).
  for (const zaId of recordingZaToMarkApplied) {
    if (!fieldExists(zoomAttendanceTable, CONFIG.zoomAttendanceFields.pwApplied)) break;
    const zaRec = await zoomAttendanceTable.selectRecordAsync(zaId, {
      fields: [CONFIG.zoomAttendanceFields.pwApplied],
    });
    if (zaRec && !isTruthyFlag(zaRec, CONFIG.zoomAttendanceFields.pwApplied)) {
      await zoomAttendanceTable.updateRecordAsync(zaId, {
        [CONFIG.zoomAttendanceFields.pwApplied]: true,
      });
    }
  }

  /*************************************************************************************************
   * 4E. Write Results
   *************************************************************************************************/

  await updateWeekly({
    [CONFIG.weeklyFields.dailyStatus]: { name: dailyStatusName },
    [CONFIG.weeklyFields.dailyDetail]: dailyDetailLines.join("\n"),
    [CONFIG.weeklyFields.dailyMet]: dailyMet,

    [CONFIG.weeklyFields.videoCount]: videoCount,

    [CONFIG.weeklyFields.zoomMeetingCount]: zoomMeetingCount,
    [CONFIG.weeklyFields.zoomAttendanceCount]: zoomAttendanceCount,

    [CONFIG.weeklyFields.homeworkAssignedCount]: assignedHomeworkCount,
    [CONFIG.weeklyFields.homeworkSatisfactoryCount]: satisfactoryHomeworkCount,
    [CONFIG.weeklyFields.homeworkMet]: homeworkMet,

    [CONFIG.weeklyFields.automationStatus]: { name: "Ready" },
    [CONFIG.weeklyFields.automationError]: "",
  });

} catch (error) {
  await updateWeekly({
    [CONFIG.weeklyFields.dailyStatus]: { name: "Needs Review" },
    [CONFIG.weeklyFields.dailyMet]: false,
    [CONFIG.weeklyFields.automationStatus]: { name: "Error" },
    [CONFIG.weeklyFields.automationError]: error.message,
  });

  throw error;
}
