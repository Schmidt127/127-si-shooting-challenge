/**
 * C-025 Stage 17 — Engineering Test Framework (115) downstream helpers.
 *
 * Query-budget conscious design for Airtable's 30 select-per-invocation limit.
 * Never writes Zoom Meetings.Attendees. Does not create Submissions.
 */

const SCENARIO_KEY = "C025_STAGE17_DOWNSTREAM";
const MAX_QUERY_BUDGET = 22;
const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 2500;

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
        resetFixtures: parsed.resetFixtures === true,
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

function createQueryBudget({ max = MAX_QUERY_BUDGET } = {}) {
  const log = [];
  let count = 0;
  return {
    max,
    get count() {
      return count;
    },
    get log() {
      return log.slice();
    },
    remaining() {
      return max - count;
    },
    canQuery(n = 1) {
      return count + n <= max;
    },
    /** @returns {{ ok: true } | { ok: false, error: string }} */
    consume(purpose, n = 1) {
      if (count + n > max) {
        return {
          ok: false,
          error: `Query budget exhausted (${count}/${max}) before: ${purpose}`,
        };
      }
      for (let i = 0; i < n; i += 1) {
        count += 1;
        log.push({ n: count, purpose });
      }
      return { ok: true };
    },
  };
}

/**
 * Worst-case C025 branch query plan (exact-record only; no full-table scans).
 * Main() also uses 1 scenario select outside this branch.
 */
function estimateWorstCaseQueryCount() {
  return {
    maxQueryBudget: MAX_QUERY_BUDGET,
    pollAttempts: POLL_ATTEMPTS,
    pollDelayMs: POLL_DELAY_MS,
    breakdown: {
      initialExactReads: 4, // WAS, ZA, ZM, Enrollment
      poll057ZaOnly: POLL_ATTEMPTS, // max 5
      poll042ZaOnly: POLL_ATTEMPTS, // max 5
      finalExactReads: 4, // WAS, ZA, ZM, Enrollment
    },
    worstCaseBranchTotal: 4 + POLL_ATTEMPTS + POLL_ATTEMPTS + 4, // 18
    mainScenarioSelect: 1,
    worstCaseInvocationTotal: 4 + POLL_ATTEMPTS + POLL_ATTEMPTS + 4 + 1, // 19
    resumesBothDone: 4 + 4, // initial + final = 8
    forbids: ["selectRecordsAsync full table", "unbounded poll loops", "20× dual-record polls"],
  };
}

function planResumeState({ pwApplied, gateApplied, resetFixtures }) {
  if (resetFixtures) {
    return { skip057: false, skip042: false, mode: "explicit_reset" };
  }
  const pw = isTruthyFlag(pwApplied);
  const gate = isTruthyFlag(gateApplied);
  if (pw && gate) return { skip057: true, skip042: true, mode: "resume_both_done" };
  if (pw) return { skip057: true, skip042: false, mode: "resume_after_057" };
  return { skip057: false, skip042: false, mode: "fresh" };
}

function planDownstreamTriggers() {
  return {
    automation057: {
      method: "was_status_toggle",
      description:
        "Set WAS Perfect Week Automation Status Ready then Pending (min updates).",
      fields: ["Perfect Week Automation Status"],
    },
    automation042: {
      method: "level_recalc_needed",
      description: "Set Enrollments.Level Recalc Needed? = true.",
      fields: ["Level Recalc Needed?"],
    },
    neverWrite: ["Attendees", "XP Points", "Minimum Zoom Meetings"],
    poll: {
      attempts: POLL_ATTEMPTS,
      delayMs: POLL_DELAY_MS,
      record: "exact fixture only",
    },
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
  const appliedStableOrConsumed = isTruthyFlag(pwAppliedAfter);
  const countOk = Number(zoomAttendanceCount) === 1;
  const meetingCountOk = Number(zoomMeetingCount) >= 1;
  // Ready is nice-to-have; Applied? + counts are the completion signal (v1.5).
  const pass = attendeesUnchanged && countOk && meetingCountOk && appliedStableOrConsumed;
  return {
    pass,
    attendeesUnchanged,
    effectiveZoomAttendanceCount: Number(zoomAttendanceCount) || 0,
    zoomMeetingCount: Number(zoomMeetingCount) || 0,
    pwAppliedBefore: !!isTruthyFlag(pwAppliedBefore),
    pwAppliedAfter: !!isTruthyFlag(pwAppliedAfter),
    wasAutomationStatus: wasAutomationStatus || "",
    reasons: [
      !attendeesUnchanged ? "Attendees changed" : null,
      !countOk ? `zoomAttendanceCount=${zoomAttendanceCount} expected 1` : null,
      !meetingCountOk ? `zoomMeetingCount=${zoomMeetingCount} expected >=1` : null,
      !appliedStableOrConsumed ? "Perfect Week Credit Applied? not true after 057" : null,
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
      queryBudget: MAX_QUERY_BUDGET,
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

function c025PathMustUseQueryBudget(sourceText) {
  return (
    (sourceText.includes("C025_MAX_QUERY_BUDGET") || sourceText.includes("MAX_QUERY_BUDGET")) &&
    (sourceText.includes("createC025QueryBudget") || sourceText.includes("createQueryBudget")) &&
    sourceText.includes("pollAttempts: 5") &&
    !sourceText.includes("pollAttempts: 20") &&
    sourceText.includes("Refuse Attendees") &&
    sourceText.includes("c025SelectRecord") &&
    !sourceText.includes("waitFor057")
  );
}

module.exports = {
  SCENARIO_KEY,
  MAX_QUERY_BUDGET,
  POLL_ATTEMPTS,
  POLL_DELAY_MS,
  DEFAULT_FIXTURES,
  isTruthyFlag,
  parseFixtureOverrides,
  resolveFixtures,
  isC025Stage17DownstreamScenario,
  createQueryBudget,
  estimateWorstCaseQueryCount,
  planResumeState,
  planDownstreamTriggers,
  evaluatePerfectWeekZoomPhase,
  evaluateGatePhase,
  evaluateDedupeRerun,
  buildActualResultPayload,
  dailySubmissionBranchMustRemainUntouched,
  c025PathMustUseQueryBudget,
};
