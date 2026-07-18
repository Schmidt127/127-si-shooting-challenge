/**
 * C-025 Stage 17 — combined Zoom credit (live ∪ recording) for Perfect Week + level gates.
 *
 * Live path: Zoom Meetings.Attendees (Automation 101).
 * Recording path: Zoom Attendance Recording Quiz rows (never write Attendees).
 *
 * Dedupe key: Enrollment RID + Zoom Meeting RID (at most one credit per meeting).
 * Precedence: valid live attendance wins when both exist for the same meeting.
 */

const LIVE_SOURCE = "live_attendees";
const RECORDING_SOURCE = "recording_quiz";

function isTruthyFlag(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (Array.isArray(value) && value.length === 1) return isTruthyFlag(value[0]);
  return false;
}

/** Recording row qualifies for Perfect Week Zoom requirement. */
function isQualifyingRecordingForPerfectWeek(row = {}) {
  if (String(row.attendanceMethod || "") !== "Recording Quiz") return false;
  if (!row.enrollmentId || !row.meetingId) return false;
  if (isTruthyFlag(row.conflict)) return false;
  if (!isTruthyFlag(row.approved)) return false;
  if (!isTruthyFlag(row.effectiveCountsForPerfectWeek)) return false;
  if (String(row.reviewStatus || "") === "Needs Correction") return false;
  return true;
}

/** Recording row qualifies for level-gate Zoom count. */
function isQualifyingRecordingForGate(row = {}) {
  if (String(row.attendanceMethod || "") !== "Recording Quiz") return false;
  if (!row.enrollmentId || !row.meetingId) return false;
  if (isTruthyFlag(row.conflict)) return false;
  if (!isTruthyFlag(row.approved)) return false;
  if (!isTruthyFlag(row.gateCreditEarned)) return false;
  if (String(row.reviewStatus || "") === "Needs Correction") return false;
  return true;
}

/**
 * Build per-meeting credit map for one enrollment.
 * Live wins when both live and recording exist for the same meeting.
 */
function combineEnrollmentMeetingCredits({ liveMeetingIds = [], recordingRows = [] } = {}) {
  const byMeeting = {};
  for (const mid of liveMeetingIds) {
    if (!mid) continue;
    byMeeting[mid] = { source: LIVE_SOURCE };
  }
  const countedRecordingIds = [];
  for (const row of recordingRows || []) {
    const mid = row && row.meetingId;
    if (!mid) continue;
    if (byMeeting[mid]) continue; // prefer live
    byMeeting[mid] = {
      source: RECORDING_SOURCE,
      zoomAttendanceId: row.zoomAttendanceId || null,
    };
    if (row.zoomAttendanceId) countedRecordingIds.push(row.zoomAttendanceId);
  }
  const meetingIds = Object.keys(byMeeting).sort();
  return {
    meetingIds,
    byMeeting,
    countedRecordingIds,
    count: meetingIds.length,
  };
}

/**
 * Perfect Week week-scoped attendance among meetings linked to the week.
 */
function countPerfectWeekZoomAttendance({
  weekMeetingIds = [],
  liveAttendedMeetingIds = [],
  qualifyingRecordingMeetingIds = [],
} = {}) {
  const weekSet = new Set((weekMeetingIds || []).filter(Boolean));
  const attended = new Set();
  for (const mid of liveAttendedMeetingIds || []) {
    if (weekSet.has(mid)) attended.add(mid);
  }
  for (const mid of qualifyingRecordingMeetingIds || []) {
    if (weekSet.has(mid)) attended.add(mid);
  }
  return {
    zoomMeetingCount: weekSet.size,
    zoomAttendanceCount: attended.size,
    attendedMeetingIds: [...attended].sort(),
  };
}

/**
 * Applied? flags must reflect downstream consumption, not mere eligibility.
 */
function planAppliedFlagUpdate({ alreadyApplied, countedByDownstream }) {
  if (!countedByDownstream) {
    return { setApplied: false, action: "not_consumed_downstream" };
  }
  if (alreadyApplied) {
    return { setApplied: false, action: "already_applied" };
  }
  return { setApplied: true, action: "mark_applied_after_downstream_count" };
}

function orchestratorMustNotSetAppliedFlags() {
  return {
    gateAppliedOwner: "042",
    perfectWeekAppliedOwner: "057",
    orchestratorSetsApplied: false,
  };
}

module.exports = {
  LIVE_SOURCE,
  RECORDING_SOURCE,
  isTruthyFlag,
  isQualifyingRecordingForPerfectWeek,
  isQualifyingRecordingForGate,
  combineEnrollmentMeetingCredits,
  countPerfectWeekZoomAttendance,
  planAppliedFlagUpdate,
  orchestratorMustNotSetAppliedFlags,
};
