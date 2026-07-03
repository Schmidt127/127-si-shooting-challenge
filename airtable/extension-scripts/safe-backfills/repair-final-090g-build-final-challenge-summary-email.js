/*
Extension Script: Repair Final 090G — Build Final Challenge Summary Email (Staging)
System: 127 SI Shooting Challenge
Purpose:
  Builds a one-page Final Challenge Summary email package per Active? enrollment:
  shooting days, homework done vs missed, streaks, milestones, videos, awards, and
  season requirement counters (e.g. 8/18 homework).

Safety:
  - DRY_RUN defaults to true (read-only planning mode)
  - Set DRY_RUN = false and CONFIRM_BUILD = true to write staging fields
  - Does NOT send emails or call webhooks
  - BATCH_LIMIT = 25 for optional staging writes

Staging:
  - Writes Weekly Email Subject / HTML / Text / Payload JSON on latest WAS per enrollment
  - Staff reviews HTML, then arms Send to Make? and uses automation 074

Schema gate: 20260629_045741
Version: v2.0.3
Last Updated: 2026-07-03 — skip final email when Total Shots Counted ≤ 50
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_BUILD = false;
const BATCH_LIMIT = 25;
const SAMPLE_LIMIT = 10;
const MIN_SHOTS_FOR_FINAL_EMAIL = 50;

/** Set to rec... to build only one enrollment (dry-run testing). */
const PREVIEW_ENROLLMENT_RECORD_ID = "";

const SCHEMA_SNAPSHOT = "20260629_045741";
const TIME_ZONE = "America/Denver";

const CONFIG = {
  scriptName: "repair-final-090g-build-final-challenge-summary-email",
  version: "v2.0.3",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  branding: {
    brandName: "127 Sports Intensity",
    blue: "#0034B7",
    orange: "#FF8B00",
    bg: "#F2F2F2",
    text: "#262626",
    card: "#FFFFFF",
    border: "#D9DDE8",
    muted: "#5E667A",
    done: "#1B7F3A",
    missed: "#B3261E",
    width: "720px",
  },

  tables: {
    enrollments: "Enrollments",
    weeklySummary: "Weekly Athlete Summary",
    weeks: "Weeks",
    submissions: "Submissions",
    homeworkCompletions: "Homework Completions",
    curriculum: "FBC Curriculum - SYNC",
    streakOccurrences: "Streak Occurrences",
    achievementUnlocks: "Athlete Achievement Unlocks",
    achievements: "Achievements",
    shotMilestones: "Shot Milestones",
    videoFeedback: "Video Feedback",
    awardRecipients: "Award Recipients",
    awards: "Awards",
    zoomMeetings: "Zoom Meetings",
    config: "Config",
  },

  enrollments: {
    active: "Active?",
    firstName: "Athlete First Name",
    fullNameCandidates: ["Full Athlete Name", "Full Athlete Name - Backward"],
    parentEmailCleaned: "Parent Email - Cleaned",
    athleteEmailCleaned: "Athlete Email - Cleaned",
    gradeBand: "Grade Band",
    currentLevelCandidates: [
      "Current Level - Public Facing Display",
      "DELETE PROBABLY - Level Name with Color (from Current Level)",
      "Level Status",
    ],
    lifetimeXpTotal: "Lifetime XP Total",
    totalShotsCounted: "Total Shots Counted",
    totalSubmissions: "Total Submissions",
    totalHomeworkCompletions: "Total Homework Completions",
    totalVideoSubmissions: "Total Video Submissions",
    totalZoomAttendances: "Total Zoom Attendances",
    longestStreakDays: "Longest Streak Days",
    targetGoalShots: "Target Goal Shots",
    gateMinHomework: "Gate Minimum: Homework",
    gateMinSubmissions: "Gate Minimum: Submissions",
    gateMinVideos: "Gate Minimum: Videos",
    gateMinZoom: "Gate Minimum: Zoom Meetings",
    gateMinStreak: "Gate Minimum: Streak Days",
    publicGateMissing: "Public Gate Missing Reason",
    submissions: "Submissions",
    homeworkCompletions: "Homework Completions",
    streakOccurrences: "Streak Occurrences",
    achievementUnlocks: "Athlete Achievement Unlocks",
    videoFeedback: "Video Feedback",
    awardRecipients: "Award Recipients",
    zoomMeetings: "Zoom Meetings",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    weekDisplay: "Week - Display",
    weeklyEmailSubject: "Weekly Email Subject",
    weeklyEmailHtml: "Weekly Email HTML",
    weeklyEmailText: "Weekly Email Text",
    weeklyEmailPayloadJson: "Weekly Email Payload JSON",
    weeklyEmailRevision: "Weekly Email Revision",
    weeklyEmailLastBuiltAt: "Weekly Email Last Built At",
    weeklyEmailReady: "Weekly Email Ready?",
  },

  weeks: {
    weekName: "Week Name",
    startDate: "Start Date",
    endDate: "End Date",
    weekNumber: "Week Number",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    countThis: "Count This Submission?",
    activityDateKey: "Activity Date Key",
    activityDate: "Activity Date",
  },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    satisfactory: "Satisfactory?",
    completionStatus: "Completion Status",
    assignmentTitleLookup: "Assignment Title (from Homework)",
  },

  curriculum: {
    week: "Week",
    gradeBand: "Grade Band",
    assignmentTitle: "Assignment Title",
    assignmentFullName: "Assignment Full Name",
    displayName: "Assignment Full Name - Display",
    homeworkNumber: "Homework Number",
    assignmentNumber: "Assignment Number",
    order: "Order",
    active: "Active?",
    published: "Published?",
  },

  streaks: {
    enrollment: "Enrollment",
    achievement: "Achievement",
    streakDays: "Streak Days",
    streakEndDate: "Streak End Date",
    active: "Active?",
    sourceStatus: "Source Status",
  },

  unlocks: {
    enrollment: "Enrollment",
    achievement: "Achievement",
    week: "Week",
    shotMilestone: "Shot Milestone",
    dateUnlocked: "Date Unlocked",
    milestoneActivityDate: "Milestone Activity Date",
    active: "Active?",
  },

  achievements: {
    name: "Achievement Name",
  },

  shotMilestones: {
    label: "Milestone Label",
  },

  video: {
    enrollment: "Enrollment",
    submission: "Submission",
    feedbackPosted: "Feedback Posted?",
    awardStatus: "Award Status",
  },

  awardRecipients: {
    enrollment: "Enrollment",
    award: "Award",
    week: "Week",
    awardStatus: "Award Status",
    dateAwarded: "Date Awarded",
    awardScope: "Award Scope",
  },

  awards: {
    name: "Award Name",
    emailDisplayName: "Email Display Name",
    emailDisplayShort: "Email Display Short Name",
    eligibleOverall: "Eligible for Overall Summary?",
  },

  zoom: {
    meetingName: "Meeting Name",
    week: "Week",
    attendees: "Attendees",
  },

  config: {
    challengeWeekCount: "Challenge Week Count",
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Weekly Athlete Summary", "Enrollment"],
  ["Weeks", "Start Date"],
  ["Weeks", "End Date"],
  ["Submissions", "Enrollment"],
  ["Submissions", "Count This Submission?"],
  ["Homework Completions", "Enrollment"],
  ["Homework Completions", "Homework"],
  ["FBC Curriculum - SYNC", "Week"],
  ["Streak Occurrences", "Enrollment"],
  ["Athlete Achievement Unlocks", "Enrollment"],
  ["Video Feedback", "Enrollment"],
  ["Award Recipients", "Enrollment"],
];

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
    throw new Error(`Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`);
  }
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldName || !fieldExists(table, fieldName)) return "";
  try {
    return String(record.getCellValueAsString(fieldName) || "").trim();
  } catch {
    return "";
  }
}

function getNumber(record, table, fieldName, fallback = 0) {
  if (!record || !fieldExists(table, fieldName)) return fallback;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
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

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function firstNonBlank(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function firstExistingField(table, candidateFields) {
  for (const fieldName of candidateFields || []) {
    if (fieldExists(table, fieldName)) return fieldName;
  }
  return "";
}

/** Flatten CONFIG section values; expands *Candidates arrays into query field lists. */
function flattenConfigFieldNames(configSection, table) {
  const names = [];
  const seen = new Set();
  for (const value of Object.values(configSection || {})) {
    const candidates = Array.isArray(value) ? value : [value];
    for (const fieldName of candidates) {
      if (!fieldName || typeof fieldName !== "string") continue;
      if (seen.has(fieldName)) continue;
      if (!fieldExists(table, fieldName)) continue;
      seen.add(fieldName);
      names.push(fieldName);
    }
  }
  return names;
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
    .replace(/"/g, "&quot;");
}

function formatNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "0";
}

function formatRatio(actual, expected) {
  const a = Number(actual || 0);
  const e = Number(expected || 0);
  if (!e) return `${formatNumber(a)}`;
  return `${formatNumber(a)}/${formatNumber(e)}`;
}

/** Longest calendar run of consecutive counted submission days (not XP milestone rollup). */
function longestConsecutiveRunFromDateKeys(dateKeys) {
  const keys = [...dateKeys].filter(Boolean).sort();
  if (!keys.length) return { days: 0, startKey: "", endKey: "" };

  let bestLen = 1;
  let bestStart = keys[0];
  let bestEnd = keys[0];
  let curStart = keys[0];
  let curLen = 1;

  for (let i = 1; i < keys.length; i++) {
    const prev = parseIsoDateOnly(keys[i - 1]);
    const cur = parseIsoDateOnly(keys[i]);
    const gapDays = prev && cur ? Math.round((cur.getTime() - prev.getTime()) / 86400000) : NaN;
    if (gapDays === 1) {
      curLen += 1;
    } else {
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
        bestEnd = keys[i - 1];
      }
      curStart = keys[i];
      curLen = 1;
    }
  }

  if (curLen > bestLen) {
    bestLen = curLen;
    bestStart = curStart;
    bestEnd = keys[keys.length - 1];
  }

  return { days: bestLen, startKey: bestStart, endKey: bestEnd };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseIsoDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDenverDateKey(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find(p => p.type === "year")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

function addUtcDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function buildChallengeDateKeys(weekRecords, weeksTable) {
  const keys = new Set();
  for (const week of weekRecords) {
    const start = parseIsoDateOnly(getRaw(week, weeksTable, CONFIG.weeks.startDate));
    const end = parseIsoDateOnly(getRaw(week, weeksTable, CONFIG.weeks.endDate));
    if (!start || !end) continue;
    for (let d = new Date(start.getTime()); d.getTime() <= end.getTime(); d = addUtcDays(d, 1)) {
      keys.add(toDenverDateKey(d));
    }
  }
  return keys;
}

function weekSortTimestamp(weekRecord, weeksTable) {
  if (!weekRecord) return 0;
  const end = parseIsoDateOnly(getRaw(weekRecord, weeksTable, CONFIG.weeks.endDate));
  if (end) return end.getTime();
  const start = parseIsoDateOnly(getRaw(weekRecord, weeksTable, CONFIG.weeks.startDate));
  if (start) return start.getTime();
  return getNumber(weekRecord, weeksTable, CONFIG.weeks.weekNumber, 0);
}

function groupRecordsByEnrollment(records, table, enrollmentField) {
  const map = new Map();
  for (const record of records) {
    const enrollmentId = getFirstLinkedId(record, table, enrollmentField);
    if (!enrollmentId) continue;
    if (!map.has(enrollmentId)) map.set(enrollmentId, []);
    map.get(enrollmentId).push(record);
  }
  return map;
}

function isHomeworkSatisfactory(record, homeworkTable) {
  if (getBooleanish(record, homeworkTable, CONFIG.homework.satisfactory)) return true;
  const status = getText(record, homeworkTable, CONFIG.homework.completionStatus);
  return normalizeText(status) === "satisfactory";
}

function curriculumMatchesGradeBand(curriculumRecord, curriculumTable, gradeBandId) {
  if (!gradeBandId) return true;
  const bandIds = getLinkedIds(curriculumRecord, curriculumTable, CONFIG.curriculum.gradeBand);
  if (!bandIds.length) return true;
  return bandIds.includes(gradeBandId);
}

function buildExpectedHomeworkRows({
  curriculumRecords,
  curriculumTable,
  weekRecords,
  weeksTable,
  gradeBandId,
  challengeWeekIds,
}) {
  const weekById = new Map(weekRecords.map(w => [w.id, w]));
  return curriculumRecords
    .filter(record => {
      const weekId = getFirstLinkedId(record, curriculumTable, CONFIG.curriculum.week);
      if (challengeWeekIds?.size && (!weekId || !challengeWeekIds.has(weekId))) return false;
      return curriculumMatchesGradeBand(record, curriculumTable, gradeBandId);
    })
    .filter(record => {
      if (fieldExists(curriculumTable, CONFIG.curriculum.active)) {
        if (!getBooleanish(record, curriculumTable, CONFIG.curriculum.active)) return false;
      }
      if (fieldExists(curriculumTable, CONFIG.curriculum.published)) {
        if (!getBooleanish(record, curriculumTable, CONFIG.curriculum.published)) return false;
      }
      return true;
    })
    .map(record => {
      const weekId = getFirstLinkedId(record, curriculumTable, CONFIG.curriculum.week);
      const week = weekById.get(weekId);
      return {
        id: record.id,
        title: firstNonBlank(
          getText(record, curriculumTable, CONFIG.curriculum.displayName),
          getText(record, curriculumTable, CONFIG.curriculum.assignmentTitle),
          getText(record, curriculumTable, CONFIG.curriculum.assignmentFullName)
        ),
        weekLabel: week ? getText(week, weeksTable, CONFIG.weeks.weekName) : "",
        assignmentNumber: getNumber(record, curriculumTable, CONFIG.curriculum.assignmentNumber, 999),
        order: getNumber(record, curriculumTable, CONFIG.curriculum.order, 999),
      };
    })
    .sort((a, b) => {
      if (a.assignmentNumber !== b.assignmentNumber) return a.assignmentNumber - b.assignmentNumber;
      return a.order - b.order;
    });
}

function matchHomeworkCompletion(expectedId, homeworkRecords, homeworkTable) {
  for (const record of homeworkRecords) {
    const hwId = getFirstLinkedId(record, homeworkTable, CONFIG.homework.homework);
    if (hwId !== expectedId) continue;
    if (!isHomeworkSatisfactory(record, homeworkTable)) continue;
    return record;
  }
  return null;
}

function recordDisplay(record, table) {
  try {
    return String(record.name || "").trim();
  } catch {
    return "";
  }
}

function buildNameMap(records, table, fieldName) {
  const map = new Map();
  for (const record of records) {
    const name = fieldExists(table, fieldName)
      ? getText(record, table, fieldName)
      : recordDisplay(record, table);
    if (name) map.set(record.id, name);
  }
  return map;
}

const BRAND = CONFIG.branding;

function renderCard(title, bodyHtml) {
  if (!bodyHtml || !String(bodyHtml).trim()) return "";
  return `
    <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:10px;padding:10px 12px;margin:0 0 8px 0;">
      <div style="font-size:12px;line-height:1.2;font-weight:800;color:${BRAND.orange};margin:0 0 6px 0;">${escapeHtml(title)}</div>
      <div style="font-size:9px;line-height:1.35;color:${BRAND.text};">${bodyHtml}</div>
    </div>`;
}

function renderStatGrid(stats) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      <tr>
        ${stats
          .map(
            stat => `
          <td style="width:${100 / stats.length}%;padding:4px;vertical-align:top;">
            <div style="background:#F7F9FC;border:1px solid ${BRAND.border};border-radius:8px;padding:6px 7px;text-align:center;">
              <div style="font-size:7px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.25px;">${escapeHtml(stat.label)}</div>
              <div style="font-size:12px;font-weight:800;color:${BRAND.blue};margin-top:2px;">${escapeHtml(stat.value)}</div>
            </div>
          </td>`
          )
          .join("")}
      </tr>
    </table>`;
}

function renderRequirementRows(rows) {
  if (!rows.length) {
    return `<div style="color:${BRAND.muted};">No requirement counters available.</div>`;
  }
  const body = rows
    .map(row => {
      const met = row.met !== false;
      const color = met ? BRAND.done : BRAND.missed;
      return `
        <tr>
          <td style="padding:3px 6px 3px 0;font-size:9px;color:${BRAND.text};">${escapeHtml(row.label)}</td>
          <td style="padding:3px 0;font-size:9px;font-weight:700;color:${color};text-align:right;white-space:nowrap;">${escapeHtml(row.value)}</td>
        </tr>`;
    })
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      ${body}
    </table>`;
}

function renderTwoColumnLists(leftTitle, leftItems, rightTitle, rightItems) {
  const renderList = (items, emptyText, color) => {
    if (!items.length) {
      return `<div style="color:${BRAND.muted};font-size:9px;">${escapeHtml(emptyText)}</div>`;
    }
    return `<ul style="margin:0;padding-left:14px;">${items
      .map(
        item =>
          `<li style="margin:0 0 3px 0;font-size:9px;color:${color};line-height:1.3;">${escapeHtml(item)}</li>`
      )
      .join("")}</ul>`;
  };

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:6px;">
          <div style="font-size:9px;font-weight:700;color:${BRAND.done};margin:0 0 4px 0;">${escapeHtml(leftTitle)}</div>
          ${renderList(leftItems, "None", BRAND.done)}
        </td>
        <td style="width:50%;vertical-align:top;padding-left:6px;">
          <div style="font-size:9px;font-weight:700;color:${BRAND.missed};margin:0 0 4px 0;">${escapeHtml(rightTitle)}</div>
          ${renderList(rightItems, "None", BRAND.missed)}
        </td>
      </tr>
    </table>`;
}

function renderBulletList(items, emptyText) {
  if (!items.length) {
    return `<div style="color:${BRAND.muted};font-size:9px;">${escapeHtml(emptyText)}</div>`;
  }
  return `<ul style="margin:0;padding-left:14px;">${items
    .map(item => `<li style="margin:0 0 3px 0;font-size:9px;line-height:1.3;">${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function buildFinalSummaryPackage(ctx) {
  const {
    athleteName,
    firstName,
    currentLevel,
    lifetimeXp,
    challengeDayCount,
    daysShot,
    daysMissed,
    requirementRows,
    homeworkDone,
    homeworkMissed,
    streakLines,
    milestoneLines,
    videoSubmitted,
    videoMissed,
    awardLines,
    zoomAttended,
    zoomMissed,
    gateNote,
    seasonLabel,
  } = ctx;

  const greeting = firstName || athleteName || "Athlete";
  const subject = `Final Shooting Challenge Summary — ${athleteName}`;

  const stats = [
    { label: "Days in Challenge", value: formatNumber(challengeDayCount) },
    { label: "Days Shot", value: formatNumber(daysShot) },
    { label: "Days Missed", value: formatNumber(daysMissed) },
    { label: "Lifetime XP", value: formatNumber(lifetimeXp) },
  ];

  const introHtml = `
    <p style="margin:0 0 6px 0;font-size:9px;">Hi ${escapeHtml(greeting)},</p>
    <p style="margin:0;font-size:9px;">
      Here is your <strong>${escapeHtml(seasonLabel)}</strong> final summary.
      Current level: <strong>${escapeHtml(currentLevel || "Unknown")}</strong>.
      ${gateNote ? `Next-level note: ${escapeHtml(gateNote)}.` : ""}
    </p>`;

  const htmlOut = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
  <div style="background:${BRAND.bg};padding:12px 8px;">
    <div style="max-width:${BRAND.width};margin:0 auto;">
      <div style="background:${BRAND.blue};border-radius:12px;padding:14px 16px;margin:0 0 8px 0;color:#FFFFFF;">
        <div style="font-size:8px;letter-spacing:.4px;text-transform:uppercase;opacity:.95;margin:0 0 3px 0;">Final Challenge Summary</div>
        <div style="font-size:18px;line-height:1.15;font-weight:800;margin:0 0 4px 0;">${escapeHtml(athleteName)}</div>
        <div style="font-size:10px;line-height:1.35;opacity:.95;">${escapeHtml(seasonLabel)} • Level ${escapeHtml(currentLevel || "—")}</div>
      </div>

      <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:10px;padding:10px 12px;margin:0 0 8px 0;">
        ${renderStatGrid(stats)}
      </div>

      ${renderCard("Season Requirements", renderRequirementRows(requirementRows))}
      ${renderCard("Welcome", introHtml)}
      ${renderCard(
        "Homework",
        renderTwoColumnLists(
          `Completed (${homeworkDone.length})`,
          homeworkDone,
          `Not Completed (${homeworkMissed.length})`,
          homeworkMissed
        )
      )}
      ${renderCard("Streaks Earned", renderBulletList(streakLines, "No streak awards recorded."))}
      ${renderCard("Milestones & Achievements", renderBulletList(milestoneLines, "No milestones recorded."))}
      ${renderCard(
        "Video Feedback",
        renderTwoColumnLists(
          `Submitted (${videoSubmitted.length})`,
          videoSubmitted,
          `Not Submitted (${videoMissed.length})`,
          videoMissed
        )
      )}
      ${renderCard(
        "Zoom Meetings",
        renderTwoColumnLists(
          `Attended (${zoomAttended.length})`,
          zoomAttended,
          `Missed (${zoomMissed.length})`,
          zoomMissed
        )
      )}
      ${renderCard("Awards Won", renderBulletList(awardLines, "No awards recorded for this season."))}

      <div style="background:${BRAND.blue};border-radius:10px;padding:10px 12px;color:#FFFFFF;">
        <div style="font-size:9px;font-weight:700;margin:0 0 2px 0;">${escapeHtml(BRAND.brandName)}</div>
        <div style="font-size:8px;line-height:1.35;opacity:.95;">Final Challenge Summary • Review your season and celebrate the work you put in.</div>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

  const textOut = [
    "Final Challenge Summary",
    athleteName,
    seasonLabel,
    `Level: ${currentLevel || "Unknown"}`,
    `Days in Challenge: ${challengeDayCount}`,
    `Days Shot: ${daysShot}`,
    `Days Missed: ${daysMissed}`,
    `Lifetime XP: ${lifetimeXp}`,
    "",
    "Season Requirements",
    ...requirementRows.map(row => `- ${row.label}: ${row.value}`),
    "",
    `Homework Completed (${homeworkDone.length})`,
    ...homeworkDone.map(line => `  + ${line}`),
    `Homework Not Completed (${homeworkMissed.length})`,
    ...homeworkMissed.map(line => `  - ${line}`),
    "",
    "Streaks Earned",
    ...streakLines.map(line => `  + ${line}`),
    "",
    "Milestones & Achievements",
    ...milestoneLines.map(line => `  + ${line}`),
    "",
    `Videos Submitted (${videoSubmitted.length})`,
    ...videoSubmitted.map(line => `  + ${line}`),
    `Videos Not Submitted (${videoMissed.length})`,
    ...videoMissed.map(line => `  - ${line}`),
    "",
    `Zoom Attended (${zoomAttended.length})`,
    ...zoomAttended.map(line => `  + ${line}`),
    `Zoom Missed (${zoomMissed.length})`,
    ...zoomMissed.map(line => `  - ${line}`),
    "",
    "Awards Won",
    ...awardLines.map(line => `  + ${line}`),
    gateNote ? `\nGate note: ${gateNote}` : "",
  ]
    .filter((line, index, arr) => !(line === "" && arr[index + 1] === ""))
    .join("\n");

  return { subject, htmlOut, textOut };
}

async function main() {
  if (CONFIRM_BUILD && DRY_RUN) {
    throw new Error("CONFIRM_BUILD is true while DRY_RUN is true. Set DRY_RUN = false to stage writes.");
  }

  const tables = {
    enrollments: base.getTable(CONFIG.tables.enrollments),
    weeklySummary: base.getTable(CONFIG.tables.weeklySummary),
    weeks: base.getTable(CONFIG.tables.weeks),
    submissions: base.getTable(CONFIG.tables.submissions),
    homework: base.getTable(CONFIG.tables.homeworkCompletions),
    curriculum: base.getTable(CONFIG.tables.curriculum),
    streaks: base.getTable(CONFIG.tables.streakOccurrences),
    unlocks: base.getTable(CONFIG.tables.achievementUnlocks),
    achievements: base.getTable(CONFIG.tables.achievements),
    shotMilestones: base.getTable(CONFIG.tables.shotMilestones),
    video: base.getTable(CONFIG.tables.videoFeedback),
    awardRecipients: base.getTable(CONFIG.tables.awardRecipients),
    awards: base.getTable(CONFIG.tables.awards),
    zoom: base.getTable(CONFIG.tables.zoomMeetings),
    config: base.getTable(CONFIG.tables.config),
  };

  requireSchema({
    [CONFIG.tables.enrollments]: tables.enrollments,
    [CONFIG.tables.weeklySummary]: tables.weeklySummary,
    [CONFIG.tables.weeks]: tables.weeks,
    [CONFIG.tables.submissions]: tables.submissions,
    [CONFIG.tables.homeworkCompletions]: tables.homework,
    [CONFIG.tables.curriculum]: tables.curriculum,
    [CONFIG.tables.streakOccurrences]: tables.streaks,
    [CONFIG.tables.achievementUnlocks]: tables.unlocks,
    [CONFIG.tables.videoFeedback]: tables.video,
    [CONFIG.tables.awardRecipients]: tables.awardRecipients,
  });

  const enrollmentFieldList = flattenConfigFieldNames(CONFIG.enrollments, tables.enrollments);

  const [
    enrollmentQuery,
    summaryQuery,
    weekQuery,
    submissionQuery,
    homeworkQuery,
    curriculumQuery,
    streakQuery,
    unlockQuery,
    achievementQuery,
    shotMilestoneQuery,
    awardQuery,
    videoQuery,
    awardRecipientQuery,
    zoomQuery,
    configQuery,
  ] = await Promise.all([
    tables.enrollments.selectRecordsAsync({ fields: enrollmentFieldList }),
    tables.weeklySummary.selectRecordsAsync({
      fields: Object.values(CONFIG.weeklySummary).filter(f => fieldExists(tables.weeklySummary, f)),
    }),
    tables.weeks.selectRecordsAsync({
      fields: Object.values(CONFIG.weeks).filter(f => fieldExists(tables.weeks, f)),
    }),
    tables.submissions.selectRecordsAsync({
      fields: Object.values(CONFIG.submissions).filter(f => fieldExists(tables.submissions, f)),
    }),
    tables.homework.selectRecordsAsync({
      fields: Object.values(CONFIG.homework).filter(f => fieldExists(tables.homework, f)),
    }),
    tables.curriculum.selectRecordsAsync({
      fields: Object.values(CONFIG.curriculum).filter(f => fieldExists(tables.curriculum, f)),
    }),
    tables.streaks.selectRecordsAsync({
      fields: Object.values(CONFIG.streaks).filter(f => fieldExists(tables.streaks, f)),
    }),
    tables.unlocks.selectRecordsAsync({
      fields: Object.values(CONFIG.unlocks).filter(f => fieldExists(tables.unlocks, f)),
    }),
    tables.achievements.selectRecordsAsync({
      fields: Object.values(CONFIG.achievements).filter(f => fieldExists(tables.achievements, f)),
    }),
    tables.shotMilestones.selectRecordsAsync({
      fields: Object.values(CONFIG.shotMilestones).filter(f => fieldExists(tables.shotMilestones, f)),
    }),
    tables.awards.selectRecordsAsync({
      fields: Object.values(CONFIG.awards).filter(f => fieldExists(tables.awards, f)),
    }),
    tables.video.selectRecordsAsync({
      fields: Object.values(CONFIG.video).filter(f => fieldExists(tables.video, f)),
    }),
    tables.awardRecipients.selectRecordsAsync({
      fields: Object.values(CONFIG.awardRecipients).filter(f => fieldExists(tables.awardRecipients, f)),
    }),
    tables.zoom.selectRecordsAsync({
      fields: Object.values(CONFIG.zoom).filter(f => fieldExists(tables.zoom, f)),
    }),
    tables.config.selectRecordsAsync({
      fields: Object.values(CONFIG.config).filter(f => fieldExists(tables.config, f)),
    }),
  ]);

  const challengeWeekCountFromConfig = configQuery.records.length
    ? getNumber(configQuery.records[0], tables.config, CONFIG.config.challengeWeekCount, 0)
    : 0;

  const achievementNameById = buildNameMap(
    achievementQuery.records,
    tables.achievements,
    CONFIG.achievements.name
  );
  const shotMilestoneLabelById = buildNameMap(
    shotMilestoneQuery.records,
    tables.shotMilestones,
    CONFIG.shotMilestones.label
  );
  const awardDisplayById = new Map();
  for (const award of awardQuery.records) {
    const display = firstNonBlank(
      getText(award, tables.awards, CONFIG.awards.emailDisplayName),
      getText(award, tables.awards, CONFIG.awards.emailDisplayShort),
      getText(award, tables.awards, CONFIG.awards.name),
      recordDisplay(award, tables.awards)
    );
    if (display) awardDisplayById.set(award.id, display);
  }

  const weekRecords = [...weekQuery.records].sort(
    (a, b) => weekSortTimestamp(a, tables.weeks) - weekSortTimestamp(b, tables.weeks)
  );
  const challengeWeeks =
    challengeWeekCountFromConfig > 0
      ? weekRecords.slice(0, challengeWeekCountFromConfig)
      : weekRecords;
  const challengeWeekIds = new Set(challengeWeeks.map(w => w.id));
  const weekNameById = new Map(
    weekRecords.map(week => [week.id, getText(week, tables.weeks, CONFIG.weeks.weekName)])
  );
  const submissionWeekById = new Map();
  for (const submission of submissionQuery.records) {
    const weekId = getFirstLinkedId(submission, tables.submissions, CONFIG.submissions.week);
    if (weekId) submissionWeekById.set(submission.id, weekId);
  }
  const challengeDateKeys = buildChallengeDateKeys(challengeWeeks, tables.weeks);
  const seasonLabel =
    challengeWeeks.length > 0
      ? `${getText(challengeWeeks[0], tables.weeks, CONFIG.weeks.weekName)} – ${getText(
          challengeWeeks[challengeWeeks.length - 1],
          tables.weeks,
          CONFIG.weeks.weekName
        )}`
      : "2025–26 Shooting Challenge";

  const submissionsByEnrollment = groupRecordsByEnrollment(
    submissionQuery.records,
    tables.submissions,
    CONFIG.submissions.enrollment
  );
  const homeworkByEnrollment = groupRecordsByEnrollment(
    homeworkQuery.records,
    tables.homework,
    CONFIG.homework.enrollment
  );
  const streaksByEnrollment = groupRecordsByEnrollment(
    streakQuery.records,
    tables.streaks,
    CONFIG.streaks.enrollment
  );
  const unlocksByEnrollment = groupRecordsByEnrollment(
    unlockQuery.records,
    tables.unlocks,
    CONFIG.unlocks.enrollment
  );
  const videosByEnrollment = groupRecordsByEnrollment(
    videoQuery.records,
    tables.video,
    CONFIG.video.enrollment
  );
  const awardsByEnrollment = groupRecordsByEnrollment(
    awardRecipientQuery.records,
    tables.awardRecipients,
    CONFIG.awardRecipients.enrollment
  );

  const summariesByEnrollment = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, tables.weeklySummary, CONFIG.weeklySummary.enrollment);
    if (!enrollmentId) continue;
    if (!summariesByEnrollment.has(enrollmentId)) summariesByEnrollment.set(enrollmentId, []);
    summariesByEnrollment.get(enrollmentId).push(summary);
  }

  const fullNameField = firstExistingField(tables.enrollments, CONFIG.enrollments.fullNameCandidates);
  const levelField = firstExistingField(tables.enrollments, CONFIG.enrollments.currentLevelCandidates);

  let activeEnrollments = enrollmentQuery.records.filter(enrollment =>
    getBooleanish(enrollment, tables.enrollments, CONFIG.enrollments.active)
  );
  if (PREVIEW_ENROLLMENT_RECORD_ID) {
    activeEnrollments = activeEnrollments.filter(e => e.id === PREVIEW_ENROLLMENT_RECORD_ID);
  }

  const candidates = [];
  const excluded = [];
  const exclusionCounts = {};

  function exclude(reason, details) {
    exclusionCounts[reason] = (exclusionCounts[reason] || 0) + 1;
    if (excluded.length < SAMPLE_LIMIT) excluded.push({ reason, ...details });
  }

  for (const enrollment of activeEnrollments) {
    const enrollmentId = enrollment.id;
    const summaries = summariesByEnrollment.get(enrollmentId) || [];
    if (!summaries.length) {
      exclude("missing_weekly_summary", { enrollmentId, enrollmentName: enrollment.name });
      continue;
    }

    const sortedSummaries = [...summaries].sort((a, b) => {
      const aWeekId = getFirstLinkedId(a, tables.weeklySummary, CONFIG.weeklySummary.week);
      const bWeekId = getFirstLinkedId(b, tables.weeklySummary, CONFIG.weeklySummary.week);
      const aWeek = weekRecords.find(w => w.id === aWeekId);
      const bWeek = weekRecords.find(w => w.id === bWeekId);
      return weekSortTimestamp(bWeek, tables.weeks) - weekSortTimestamp(aWeek, tables.weeks);
    });
    const latestSummary = sortedSummaries[0];

    const athleteName = firstNonBlank(
      fullNameField ? getText(enrollment, tables.enrollments, fullNameField) : "",
      enrollment.name
    );
    const firstName = getText(enrollment, tables.enrollments, CONFIG.enrollments.firstName);
    const parentEmail = getText(enrollment, tables.enrollments, CONFIG.enrollments.parentEmailCleaned);
    const athleteEmail = getText(enrollment, tables.enrollments, CONFIG.enrollments.athleteEmailCleaned);
    const recipientsCsv = cleanCsvEmails([parentEmail, athleteEmail].filter(Boolean).join(","));
    if (!recipientsCsv) {
      exclude("missing_recipients", { enrollmentId, enrollmentName: athleteName, latestSummaryId: latestSummary.id });
      continue;
    }

    const totalShotsEarly = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.totalShotsCounted, 0);
    if (totalShotsEarly <= MIN_SHOTS_FOR_FINAL_EMAIL) {
      exclude("shots_at_or_below_minimum", {
        enrollmentId,
        enrollmentName: athleteName,
        totalShotsCounted: totalShotsEarly,
        minimumRequired: MIN_SHOTS_FOR_FINAL_EMAIL,
      });
      continue;
    }

    const gradeBandId = getFirstLinkedId(enrollment, tables.enrollments, CONFIG.enrollments.gradeBand);
    const currentLevel = levelField ? getText(enrollment, tables.enrollments, levelField) : "";
    const lifetimeXp = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.lifetimeXpTotal, 0);
    const gateNote = fieldExists(tables.enrollments, CONFIG.enrollments.publicGateMissing)
      ? getText(enrollment, tables.enrollments, CONFIG.enrollments.publicGateMissing)
      : "";

    const enrollmentSubmissions = submissionsByEnrollment.get(enrollmentId) || [];
    const shotDateKeys = new Set();
    for (const submission of enrollmentSubmissions) {
      if (!getBooleanish(submission, tables.submissions, CONFIG.submissions.countThis)) continue;
      const dateKey = getText(submission, tables.submissions, CONFIG.submissions.activityDateKey);
      if (!dateKey) continue;
      if (challengeDateKeys.size && !challengeDateKeys.has(dateKey)) continue;
      shotDateKeys.add(dateKey);
    }

    const challengeDayCount = challengeDateKeys.size || 0;
    const daysShot = shotDateKeys.size;
    const daysMissed = challengeDayCount > 0 ? Math.max(0, challengeDayCount - daysShot) : 0;

    const expectedHomework = buildExpectedHomeworkRows({
      curriculumRecords: curriculumQuery.records,
      curriculumTable: tables.curriculum,
      weekRecords: challengeWeeks,
      weeksTable: tables.weeks,
      gradeBandId,
      challengeWeekIds,
    });
    const enrollmentHomework = homeworkByEnrollment.get(enrollmentId) || [];
    const homeworkDone = [];
    const homeworkMissed = [];
    for (const expected of expectedHomework) {
      const completion = matchHomeworkCompletion(expected.id, enrollmentHomework, tables.homework);
      const label = expected.weekLabel ? `${expected.weekLabel} — ${expected.title}` : expected.title;
      if (completion) homeworkDone.push(label);
      else homeworkMissed.push(label);
    }

    const enrollmentStreaks = (streaksByEnrollment.get(enrollmentId) || [])
      .filter(record => {
        if (fieldExists(tables.streaks, CONFIG.streaks.active)) {
          if (!getBooleanish(record, tables.streaks, CONFIG.streaks.active)) return false;
        }
        return true;
      })
      .sort((a, b) => getNumber(b, tables.streaks, CONFIG.streaks.streakDays, 0) - getNumber(a, tables.streaks, CONFIG.streaks.streakDays, 0));

    const streakLines = enrollmentStreaks.map(record => {
      const achievementId = getFirstLinkedId(record, tables.streaks, CONFIG.streaks.achievement);
      const name = achievementNameById.get(achievementId) || "Streak";
      const days = getNumber(record, tables.streaks, CONFIG.streaks.streakDays, 0);
      const endDate = getText(record, tables.streaks, CONFIG.streaks.streakEndDate);
      return endDate ? `${name} (${days} days, ended ${endDate})` : `${name} (${days} days)`;
    });

    const consecutiveRun = longestConsecutiveRunFromDateKeys(shotDateKeys);
    const longestStreak = consecutiveRun.days;
    if (longestStreak > 0 && consecutiveRun.startKey && consecutiveRun.endKey) {
      streakLines.unshift(
        `Longest consecutive shooting run — ${longestStreak} days (${consecutiveRun.startKey} – ${consecutiveRun.endKey})`
      );
    }

    const enrollmentUnlocks = (unlocksByEnrollment.get(enrollmentId) || []).filter(record => {
      if (fieldExists(tables.unlocks, CONFIG.unlocks.active)) {
        return getBooleanish(record, tables.unlocks, CONFIG.unlocks.active);
      }
      return true;
    });

    const milestoneLines = enrollmentUnlocks
      .map(record => {
        const achievementId = getFirstLinkedId(record, tables.unlocks, CONFIG.unlocks.achievement);
        const shotMilestoneId = getFirstLinkedId(record, tables.unlocks, CONFIG.unlocks.shotMilestone);
        const weekId = getFirstLinkedId(record, tables.unlocks, CONFIG.unlocks.week);
        const achievementName = achievementNameById.get(achievementId) || "Achievement";
        const milestoneLabel = shotMilestoneLabelById.get(shotMilestoneId) || "";
        const weekName = weekNameById.get(weekId) || "";
        const dateLabel = firstNonBlank(
          getText(record, tables.unlocks, CONFIG.unlocks.milestoneActivityDate),
          getText(record, tables.unlocks, CONFIG.unlocks.dateUnlocked)
        );
        const parts = [milestoneLabel || achievementName];
        if (weekName) parts.push(weekName);
        if (dateLabel) parts.push(dateLabel);
        return parts.join(" • ");
      })
      .sort();

    const enrollmentVideos = videosByEnrollment.get(enrollmentId) || [];
    const videoSubmitted = [];
    const videoWeeksWithSubmission = new Set();
    for (const record of enrollmentVideos) {
      const submissionId = getFirstLinkedId(record, tables.video, CONFIG.video.submission);
      const weekId = submissionWeekById.get(submissionId) || "";
      const weekLabel = weekNameById.get(weekId) || "Video";
      const status = getText(record, tables.video, CONFIG.video.awardStatus) || "Submitted";
      videoSubmitted.push(`${weekLabel} (${status})`);
      if (weekLabel) videoWeeksWithSubmission.add(normalizeText(weekLabel));
    }
    const videoMissed = challengeWeeks
      .map(week => getText(week, tables.weeks, CONFIG.weeks.weekName))
      .filter(weekName => weekName && !videoWeeksWithSubmission.has(normalizeText(weekName)));

    const zoomAttended = [];
    const zoomMissed = [];
    for (const meeting of zoomQuery.records) {
      const weekId = getFirstLinkedId(meeting, tables.zoom, CONFIG.zoom.week);
      if (challengeWeekIds.size && weekId && !challengeWeekIds.has(weekId)) continue;
      const attendees = getLinkedIds(meeting, tables.zoom, CONFIG.zoom.attendees);
      const weekLabel = weekNameById.get(weekId) || "";
      const title = firstNonBlank(
        getText(meeting, tables.zoom, CONFIG.zoom.meetingName),
        weekLabel,
        "Zoom Meeting"
      );
      const line = weekLabel ? `${weekLabel} — ${title}` : title;
      if (attendees.includes(enrollmentId)) zoomAttended.push(line);
      else zoomMissed.push(line);
    }

    const awardLines = (awardsByEnrollment.get(enrollmentId) || [])
      .filter(record => normalizeText(getText(record, tables.awardRecipients, CONFIG.awardRecipients.awardStatus)) !== "cancelled")
      .map(record => {
        const awardId = getFirstLinkedId(record, tables.awardRecipients, CONFIG.awardRecipients.award);
        const awardName = awardDisplayById.get(awardId) || "Award";
        const weekId = getFirstLinkedId(record, tables.awardRecipients, CONFIG.awardRecipients.week);
        const weekName = weekNameById.get(weekId) || "";
        const scope = getText(record, tables.awardRecipients, CONFIG.awardRecipients.awardScope);
        const dateAwarded = getText(record, tables.awardRecipients, CONFIG.awardRecipients.dateAwarded);
        const parts = [awardName];
        if (scope) parts.push(scope);
        if (weekName) parts.push(weekName);
        if (dateAwarded) parts.push(dateAwarded);
        return parts.join(" • ");
      })
      .sort();

    const totalShots = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.totalShotsCounted, 0);
    const targetShots = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.targetGoalShots, 0);
    const totalSubs = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.totalSubmissions, 0);
    const totalHw = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.totalHomeworkCompletions, 0);
    const totalVid = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.totalVideoSubmissions, 0);
    const totalZoom = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.totalZoomAttendances, 0);

    const expectedHw = expectedHomework.length;
    const expectedVid = challengeWeeks.length;
    const expectedZoom = zoomQuery.records.filter(meeting => {
      const weekId = getFirstLinkedId(meeting, tables.zoom, CONFIG.zoom.week);
      return !challengeWeekIds.size || (weekId && challengeWeekIds.has(weekId));
    }).length;

    const gateMinHw = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.gateMinHomework, 0);
    const gateMinSubs = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.gateMinSubmissions, 0);
    const gateMinVid = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.gateMinVideos, 0);
    const gateMinZoom = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.gateMinZoom, 0);
    const gateMinStreak = getNumber(enrollment, tables.enrollments, CONFIG.enrollments.gateMinStreak, 0);

    const requirementRows = [
      { label: "Homework (season)", value: formatRatio(homeworkDone.length, expectedHw), met: homeworkDone.length >= expectedHw },
      { label: "Homework (Pro gate)", value: formatRatio(totalHw, gateMinHw), met: !gateMinHw || totalHw >= gateMinHw },
      { label: "Submissions", value: formatRatio(totalSubs, gateMinSubs), met: !gateMinSubs || totalSubs >= gateMinSubs },
      { label: "Videos", value: formatRatio(totalVid, expectedVid || gateMinVid), met: totalVid >= (expectedVid || gateMinVid) },
      { label: "Zoom meetings", value: formatRatio(totalZoom, expectedZoom || gateMinZoom), met: totalZoom >= (expectedZoom || gateMinZoom) },
      { label: "Longest streak (days)", value: formatRatio(longestStreak, gateMinStreak), met: !gateMinStreak || longestStreak >= gateMinStreak },
      { label: "Shots counted", value: formatRatio(totalShots, targetShots), met: !targetShots || totalShots >= targetShots },
      { label: "Shooting days", value: formatRatio(daysShot, challengeDayCount), met: challengeDayCount > 0 && daysShot >= challengeDayCount },
    ];

    const summaryPackage = buildFinalSummaryPackage({
      athleteName,
      firstName,
      currentLevel,
      lifetimeXp,
      challengeDayCount,
      daysShot,
      daysMissed,
      requirementRows,
      homeworkDone,
      homeworkMissed,
      streakLines,
      milestoneLines,
      videoSubmitted,
      videoMissed,
      awardLines,
      zoomAttended,
      zoomMissed,
      gateNote,
      seasonLabel,
    });

    const payload = {
      script: CONFIG.scriptName,
      version: CONFIG.version,
      buildMode: DRY_RUN ? "planning_read_only" : CONFIRM_BUILD ? "staging_write" : "report_only",
      enrollmentId,
      enrollmentName: athleteName,
      latestWeeklySummaryId: latestSummary.id,
      recipientsCsv,
      seasonLabel,
      counts: {
        challengeDayCount,
        daysShot,
        daysMissed,
        homeworkDone: homeworkDone.length,
        homeworkExpected: expectedHw,
        streakCount: streakLines.length,
        milestoneCount: milestoneLines.length,
        videoSubmitted: videoSubmitted.length,
        videoExpected: expectedVid,
        awardsWon: awardLines.length,
        zoomAttended: zoomAttended.length,
        zoomExpected: expectedZoom,
        lifetimeXp,
      },
      lists: {
        homeworkDone,
        homeworkMissed,
        streakLines,
        milestoneLines,
        videoSubmitted,
        videoMissed,
        awardLines,
        zoomAttended,
        zoomMissed,
      },
      requirementRows,
      gateNote,
    };

    candidates.push({
      enrollmentId,
      enrollmentName: athleteName,
      latestWeeklySummaryId: latestSummary.id,
      recipientsCsv,
      subject: summaryPackage.subject,
      textBody: summaryPackage.textOut,
      htmlBody: summaryPackage.htmlOut,
      payloadJson: JSON.stringify(payload, null, 2),
      counts: payload.counts,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const staged = [];
  const errors = [];

  for (const row of batch) {
    try {
      const update = {};
      if (isWritableField(tables.weeklySummary, CONFIG.weeklySummary.weeklyEmailSubject)) {
        update[CONFIG.weeklySummary.weeklyEmailSubject] = row.subject;
      }
      if (isWritableField(tables.weeklySummary, CONFIG.weeklySummary.weeklyEmailText)) {
        update[CONFIG.weeklySummary.weeklyEmailText] = row.textBody;
      }
      if (isWritableField(tables.weeklySummary, CONFIG.weeklySummary.weeklyEmailPayloadJson)) {
        update[CONFIG.weeklySummary.weeklyEmailPayloadJson] = row.payloadJson;
      }
      if (isWritableField(tables.weeklySummary, CONFIG.weeklySummary.weeklyEmailHtml)) {
        update[CONFIG.weeklySummary.weeklyEmailHtml] = row.htmlBody;
      }
      if (isWritableField(tables.weeklySummary, CONFIG.weeklySummary.weeklyEmailRevision)) {
        update[CONFIG.weeklySummary.weeklyEmailRevision] = CONFIG.version;
      }
      if (isWritableField(tables.weeklySummary, CONFIG.weeklySummary.weeklyEmailLastBuiltAt)) {
        update[CONFIG.weeklySummary.weeklyEmailLastBuiltAt] = new Date();
      }
      if (isWritableField(tables.weeklySummary, CONFIG.weeklySummary.weeklyEmailReady)) {
        update[CONFIG.weeklySummary.weeklyEmailReady] = true;
      }

      if (!DRY_RUN && CONFIRM_BUILD && Object.keys(update).length > 0) {
        await tables.weeklySummary.updateRecordAsync(row.latestWeeklySummaryId, update);
      }

      staged.push({
        enrollmentId: row.enrollmentId,
        enrollmentName: row.enrollmentName,
        latestWeeklySummaryId: row.latestWeeklySummaryId,
        recipientsCsv: row.recipientsCsv,
        counts: row.counts,
        dryRun: DRY_RUN || !CONFIRM_BUILD,
      });
    } catch (error) {
      errors.push({
        enrollmentId: row.enrollmentId,
        latestWeeklySummaryId: row.latestWeeklySummaryId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: CONFIG.schemaSnapshot,
    dryRun: DRY_RUN,
    confirmBuild: CONFIRM_BUILD,
    previewEnrollmentRecordId: PREVIEW_ENROLLMENT_RECORD_ID || null,
    challengeWeekCount: challengeWeeks.length,
    challengeCalendarDays: challengeDateKeys.size,
    seasonLabel,
    activeEnrollmentCount: activeEnrollments.length,
    candidateCount: candidates.length,
    batchCount: batch.length,
    stagedCount: DRY_RUN || !CONFIRM_BUILD ? 0 : staged.length,
    remainingCount: Math.max(0, candidates.length - batch.length),
    excludedCount: Object.values(exclusionCounts).reduce((sum, n) => sum + n, 0),
    exclusionCounts,
    previewSample: candidates.slice(0, SAMPLE_LIMIT).map(row => ({
      enrollmentId: row.enrollmentId,
      enrollmentName: row.enrollmentName,
      latestWeeklySummaryId: row.latestWeeklySummaryId,
      recipientsCsv: row.recipientsCsv,
      counts: row.counts,
      subject: row.subject,
      textPreview: row.textBody.slice(0, 1200),
    })),
    stagedSample: staged.slice(0, SAMPLE_LIMIT),
    excludedSample: excluded,
    errors,
  };

  console.log("===== FINAL 090G — BUILD FINAL CHALLENGE SUMMARY EMAIL =====");
  console.log(JSON.stringify(report, null, 2));

  if (DRY_RUN) {
    console.log("Read-only planning mode: no records were updated.");
    return;
  }
  if (!CONFIRM_BUILD) {
    console.log("CONFIRM_BUILD is false. Reporting only; no staging writes were applied.");
  }
}

await main();
