/**
 * C-025 Stage 17 — Engineering Test Framework (115) downstream scenario helpers.
 *
 * Scenario identity: Test Intake Name or Scenario Requirements contains
 * `C025_STAGE17_DOWNSTREAM` with Scenario Type Other (or Perfect Week).
 *
 * No new Airtable fields. Never writes Zoom Meetings.Attendees.
 * Does not create Submissions (unlike Daily/Homework/Video branches).
 */

const SCENARIO_KEY = "C025_STAGE17_DOWNSTREAM";

const DEFAULT_FIXTURES = {
  enrollmentId: "recgP9qZYjAhE7NXm",
  weekId: "rec7fCckt1zj9CbmP",
  zoomAttendanceId: "reciRsLuiJGYcea3U",
  zoomMeetingId: "recwnEKJAW8hxPSNL",
  wasId: "recvtukGFL7u74Tme",
};

function isTruthyFlag(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (Array.isArray(value) && value.length === 1) return isTruthyFlag(value[0]);
  return false;
}

function parseFixtureOverrides(scenarioRequirementsText = "") {
  const text = String(scenarioRequirementsText || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return {
        enrollmentId: parsed.enrollmentId || parsed.enrollment || undefined,
        weekId: parsed.weekId || parsed.week || undefined,
        zoomAttendanceId: parsed.zoomAttendanceId || parsed.zaId || undefined,
        zoomMeetingId: parsed.zoomMeetingId || parsed.meetingId || undefined,
        wasId: parsed.wasId || parsed.was || undefined,
      };
    }
  } catch {
    // plain-text marker only
  }
  return {};
}

function resolveFixtures({ scenarioRequirementsText = "", overrides = {} } = {}) {
  const fromText = parseFixtureOverrides(scenarioRequirementsText);
  return {
    ...DEFAULT_FIXTURES,
    ...fromText,
    ...overrides,
  };
}

function isC025Stage17DownstreamScenario({ scenarioType, testIntakeName, scenarioRequirements }) {
  const type = String(scenarioType || "").trim();
  if (type !== "Other" && type !== "Perfect Week") return false;
  const blob = `${testIntakeName || ""}\n${scenarioRequirements || ""}`;
  return blob.includes(SCENARIO_KEY);
}

/** Plan for production-like triggers (057 / 042). */
function planDownstreamTriggers() {
  return {
    automation057: {
      method: "was_status_toggle",
      description:
        "Set Weekly Athlete Summary Perfect Week Automation Status to Pending (after Ready/blank exit) so 057 re-enters its normal trigger/view path.",
      fields: ["Perfect Week Automation Status"],
    },
    automation042: {
      method: "level_recalc_needed",
      description:
        "Check Enrollments.Level Recalc Needed? so Enrollment enters view 042 - Needs Level Assignment.",
      fields: ["Level Recalc Needed?"],
    },
    neverWrite: ["Attendees", "XP Points", "Minimum Zoom Meetings"],
  };
}

function evaluatePerfectWeekZoomPhase({
  attendeesBefore = [],
  attendeesAfter = [],
  zoomMeetingCount,
  zoomAttendanceCount,
  pwAppliedBefore,
  pwAppliedAfter,
  wasAutomationStatus,
}) {
  const attendeesUnchanged =
    JSON.stringify(attendeesBefore || []) === JSON.stringify(attendeesAfter || []);
  const appliedConsumed = !isTruthyFlag(pwAppliedBefore) && isTruthyFlag(pwAppliedAfter);
  const appliedStableOrConsumed = isTruthyFlag(pwAppliedAfter);
  const countOk = Number(zoomAttendanceCount) === 1;
  const meetingCountOk = Number(zoomMeetingCount) >= 1;
  const statusReady = String(wasAutomationStatus || "") === "Ready";
  const pass =
    attendeesUnchanged && countOk && meetingCountOk && appliedStableOrConsumed && statusReady;
  return {
    pass,
    attendeesUnchanged,
    effectiveZoomAttendanceCount: Number(zoomAttendanceCount) || 0,
    zoomMeetingCount: Number(zoomMeetingCount) || 0,
    pwAppliedBefore: !!isTruthyFlag(pwAppliedBefore),
    pwAppliedAfter: !!isTruthyFlag(pwAppliedAfter),
    appliedConsumed,
    wasAutomationStatus: wasAutomationStatus || "",
    reasons: [
      !attendeesUnchanged ? "Attendees changed" : null,
      !countOk ? `zoomAttendanceCount=${zoomAttendanceCount} expected 1` : null,
      !meetingCountOk ? `zoomMeetingCount=${zoomMeetingCount} expected >=1` : null,
      !appliedStableOrConsumed ? "Perfect Week Credit Applied? not true after 057" : null,
      !statusReady ? `WAS status=${wasAutomationStatus} expected Ready` : null,
    ].filter(Boolean),
  };
}

function evaluateGatePhase({
  attendeesBefore = [],
  attendeesAfter = [],
  gateAppliedBefore,
  gateAppliedAfter,
  levelRecalcAfter,
  currentLevelBefore,
  currentLevelAfter,
  nextLevelBefore,
  nextLevelAfter,
  formulaTotalZoomAttendances,
}) {
  const attendeesUnchanged =
    JSON.stringify(attendeesBefore || []) === JSON.stringify(attendeesAfter || []);
  const appliedOk = isTruthyFlag(gateAppliedAfter);
  const recalcCleared = !isTruthyFlag(levelRecalcAfter);
  const pass = attendeesUnchanged && appliedOk && recalcCleared;
  return {
    pass,
    attendeesUnchanged,
    gateAppliedBefore: !!isTruthyFlag(gateAppliedBefore),
    gateAppliedAfter: !!isTruthyFlag(gateAppliedAfter),
    levelRecalcCleared: recalcCleared,
    currentLevelBefore: currentLevelBefore || "",
    currentLevelAfter: currentLevelAfter || "",
    nextLevelBefore: nextLevelBefore || "",
    nextLevelAfter: nextLevelAfter || "",
    formulaTotalZoomAttendances,
    note:
      "042 v3.1 uses script combined Zoom count; formula Total Zoom Attendances may remain live-only.",
    reasons: [
      !attendeesUnchanged ? "Attendees changed" : null,
      !appliedOk ? "Gate Credit Applied? not true after 042" : null,
      !recalcCleared ? "Level Recalc Needed? still checked" : null,
    ].filter(Boolean),
  };
}

function evaluateDedupeRerun({
  zoomAttendanceCountFirst,
  zoomAttendanceCountSecond,
  pwAppliedAfterSecond,
  gateAppliedAfterSecond,
  attendeesAfterSecond = [],
}) {
  const countStable =
    Number(zoomAttendanceCountFirst) === Number(zoomAttendanceCountSecond) &&
    Number(zoomAttendanceCountSecond) === 1;
  const flagsStable = isTruthyFlag(pwAppliedAfterSecond) && isTruthyFlag(gateAppliedAfterSecond);
  const attendeesEmpty = !attendeesAfterSecond || attendeesAfterSecond.length === 0;
  return {
    pass: countStable && flagsStable && attendeesEmpty,
    zoomAttendanceCountFirst: Number(zoomAttendanceCountFirst) || 0,
    zoomAttendanceCountSecond: Number(zoomAttendanceCountSecond) || 0,
    flagsStable,
    attendeesEmpty,
  };
}

function buildActualResultPayload(parts) {
  return JSON.stringify(
    {
      scenario: SCENARIO_KEY,
      ...parts,
    },
    null,
    2
  );
}

function dailySubmissionBranchMustRemainUntouched(sourceText) {
  return (
    sourceText.includes("async function runDailySubmissionBranch") &&
    sourceText.includes('dailySubmission: "Daily Submission"') &&
    sourceText.includes("Duplicate Review Status") &&
    sourceText.includes("Count It")
  );
}

module.exports = {
  SCENARIO_KEY,
  DEFAULT_FIXTURES,
  isTruthyFlag,
  parseFixtureOverrides,
  resolveFixtures,
  isC025Stage17DownstreamScenario,
  planDownstreamTriggers,
  evaluatePerfectWeekZoomPhase,
  evaluateGatePhase,
  evaluateDedupeRerun,
  buildActualResultPayload,
  dailySubmissionBranchMustRemainUntouched,
};
