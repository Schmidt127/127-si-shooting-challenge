"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const {
  getBooleanish,
  getField,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
  toDateKey,
} = require("../normalize");
const { findDuplicateGroups } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{
 *   zoomAttendance?: object[],
 *   zoomMeetings?: object[],
 *   xpEvents?: object[],
 *   weeks?: object[],
 * }} data
 */
function checkZoom(data = {}) {
  const attendance = data.zoomAttendance || [];
  const meetingsById = indexById(data.zoomMeetings || []);
  const weeksById = indexById(data.weeks || []);
  const xpEvents = data.xpEvents || [];
  const issues = [];

  for (const row of attendance) {
    const id = getRecordId(row);
    const f = row.fields || row;
    const meetingId = firstLinkedId(f["Zoom Meeting"] || f.Meeting);
    const enrollmentId = firstLinkedId(f.Enrollment);
    const sourceDate = normalizeBlank(f["Source Date"] || f["Attendance Date"] || f._sourceDate);
    const weekId = firstLinkedId(f.Week);
    const requireMeeting = getBooleanish(f._zoomRequirementApplied);

    if (!meetingId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.ZOOM_ATTENDANCE,
          sourceTable: "Zoom Attendance",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "zoom_attendance_without_meeting",
          recommendedAction: "Link Zoom Meeting; do not invent attendance without a meeting.",
          owningAutomation: OWNING_AUTOMATIONS.zoomAttendance,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!enrollmentId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.ZOOM_ATTENDANCE,
          sourceTable: "Zoom Attendance",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "zoom_attendance_without_enrollment",
          recommendedAction: "Link Enrollment on Zoom Attendance.",
          owningAutomation: OWNING_AUTOMATIONS.zoomAttendance,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!sourceDate) {
      issues.push(
        fin({
          workflow: WORKFLOWS.ZOOM_ATTENDANCE,
          sourceTable: "Zoom Attendance",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "zoom_missing_source_date",
          recommendedAction: "Set Zoom source/attendance date for week mapping and XP.",
          owningAutomation: OWNING_AUTOMATIONS.zoomAttendance,
          meta: { dataFixRequired: true },
        })
      );
    }

    if (meetingId && weekId && meetingsById[meetingId] && weeksById[weekId]) {
      const meeting = meetingsById[meetingId].fields || meetingsById[meetingId];
      const week = weeksById[weekId].fields || weeksById[weekId];
      const meetDate = toDateKey(meeting["Meeting Date"] || meeting.Date || meeting._date);
      const start = toDateKey(week["Week Start Date"] || week.startDate);
      const end = toDateKey(week["Week End Date"] || week.endDate);
      if (meetDate && start && end && (meetDate < start || meetDate > end)) {
        issues.push(
          fin({
            workflow: WORKFLOWS.ZOOM_ATTENDANCE,
            sourceTable: "Zoom Attendance",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            weekRecordId: weekId,
            healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
            code: "zoom_meeting_wrong_week",
            recommendedAction: "Relink Week so scheduled meeting date falls inside week bounds.",
            owningAutomation: OWNING_AUTOMATIONS.zoomAttendance,
            evidence: [`meetingDate=${meetDate}`, `week=${start}..${end}`],
            meta: { dataFixRequired: true },
          })
        );
      }
    }

    if (requireMeeting && !meetingId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.ZOOM_ATTENDANCE,
          sourceTable: "Zoom Attendance",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "zoom_requirement_without_meeting",
          recommendedAction:
            "Do not apply Zoom requirement/credit when no meeting exists for the week.",
          owningAutomation: OWNING_AUTOMATIONS.zoomXp,
        })
      );
    }
  }

  const zoomXp = xpEvents.filter((xp) =>
    /zoom/i.test(getSelectText((xp.fields || xp)["XP Source"]))
  );
  const xpDups = findDuplicateGroups(zoomXp, (r) => {
    const f = r.fields || r;
    return String(normalizeBlank(f["Source Key"]) || "");
  });
  for (const dup of xpDups) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.ZOOM_XP,
          sourceTable: "XP Events",
          sourceRecordId: rid,
          sourceKey: dup.key,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "zoom_xp_awarded_twice",
          recommendedAction:
            "Deactivate duplicate Zoom XP; never write Zoom Meetings.Attendees from recording path.",
          owningAutomation: OWNING_AUTOMATIONS.zoomXp,
          evidence: [`count=${dup.count}`],
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  return issues;
}

function indexById(rows) {
  const map = {};
  for (const r of rows) {
    const id = getRecordId(r);
    if (id) map[id] = r;
  }
  return map;
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = { checkZoom };
