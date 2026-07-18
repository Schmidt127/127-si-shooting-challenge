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
      trigger057QueueReentry: 1, // confirm After Queue? left (Skipped); status from initial WAS
      poll057ZaOnly: POLL_ATTEMPTS, // max 5
      trigger042ViewReentry: 2, // read Level Recalc + confirm after uncheck (worst)
      poll042ZaOnly: POLL_ATTEMPTS, // max 5
      finalExactReads: 4, // WAS, ZA, ZM, Enrollment
    },
    // 4 + 1 + 5 + 2 + 5 + 4 = 21 branch; +1 scenario select = 22
    worstCaseBranchTotal: 4 + 1 + POLL_ATTEMPTS + 2 + POLL_ATTEMPTS + 4,
    mainScenarioSelect: 1,
    worstCaseInvocationTotal: 4 + 1 + POLL_ATTEMPTS + 2 + POLL_ATTEMPTS + 4 + 1,
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

/** Statuses that keep formula Perfect Week Calculation Queue? = 1 (when links present). */
const QUEUE_MATCH_STATUSES = ["Pending", "Ready"];

/** Valid non-queue leave value (Queue?=0). Prefer Skipped over Error for a temporary ETF leave. */
const QUEUE_LEAVE_STATUS = "Skipped";
const QUEUE_ARM_STATUS = "Pending";

function isQueueMatchStatus(statusName) {
  const name = String(statusName || "").trim();
  return QUEUE_MATCH_STATUSES.includes(name);
}

function planDownstreamTriggers() {
  return {
    automation057: {
      method: "was_queue_reentry_via_automation_status",
      description:
        "Force Perfect Week Calculation Queue? 0→1 by writing Automation Status " +
        "Skipped (leave) → confirm → Pending (arm). Ready↔Pending keeps Queue?=1 and never re-matches.",
      triggerCondition: "Perfect Week Calculation Queue? = 1",
      fields: ["Perfect Week Automation Status"],
      leaveStatus: QUEUE_LEAVE_STATUS,
      armStatus: QUEUE_ARM_STATUS,
    },
    automation042: {
      method: "view_reentry_level_recalc_needed",
      description:
        "Force Enrollment to leave/re-enter view 042 (Level Recalc Needed? checked). " +
        "If already checked: unchecked → confirm → checked. If unchecked: checked once.",
      view: "042",
      viewCondition: "Level Recalc Needed? is checked",
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

/**
 * Plan WAS Perfect Week Automation Status transition that forces Automation 057
 * (When record matches conditions: Perfect Week Calculation Queue? = 1) to fire.
 *
 * Queue? is a formula: 1 when links present AND status is Pending OR Ready.
 * Ready→Pending keeps Queue?=1 and does NOT re-match. Must leave via Skipped/Created/Error first.
 */
function plan057QueueReentryTransition({
  automationStatusCurrently,
  pwApplied = false,
  resetFixtures = false,
} = {}) {
  if (isTruthyFlag(pwApplied) && !resetFixtures) {
    return {
      skip: true,
      triggerOnce: false,
      steps: [],
      transition: "skip_already_applied",
      previous: String(automationStatusCurrently || "").trim() || null,
      leaveValue: null,
      armedValue: null,
      reason: "Perfect Week Credit Applied? already true — skip 057 retrigger",
    };
  }
  const previous = String(automationStatusCurrently || "").trim();
  if (isQueueMatchStatus(previous)) {
    return {
      skip: false,
      triggerOnce: true,
      steps: ["set_skipped", "confirm_left_queue", "set_pending"],
      transition: `${previous || "queue-match"} → Skipped → Pending`,
      previous: previous || null,
      leaveValue: QUEUE_LEAVE_STATUS,
      armedValue: QUEUE_ARM_STATUS,
      reason: "Force Queue? leave (0) then re-enter (1) for 057 condition match",
    };
  }
  return {
    skip: false,
    triggerOnce: true,
    steps: ["set_pending"],
    transition: `${previous || "non-queue"} → Pending`,
    previous: previous || null,
    leaveValue: null,
    armedValue: QUEUE_ARM_STATUS,
    reason: "Enter Queue?=1 by setting Automation Status Pending",
  };
}

/**
 * Plan the Enrollment.Level Recalc Needed? transition that forces Automation 042
 * (When record enters view `042`) to fire exactly once.
 *
 * Writing checked→checked does NOT re-enter the view.
 */
function plan042ViewReentryTransition({
  levelRecalcNeededCurrently,
  gateApplied = false,
  resetFixtures = false,
} = {}) {
  if (isTruthyFlag(gateApplied) && !resetFixtures) {
    return {
      skip: true,
      triggerOnce: false,
      steps: [],
      transition: "skip_already_applied",
      previous: !!isTruthyFlag(levelRecalcNeededCurrently),
      resetValue: null,
      armedValue: null,
      reason: "Gate Credit Applied? already true — skip 042 retrigger",
    };
  }
  const previous = !!isTruthyFlag(levelRecalcNeededCurrently);
  if (previous) {
    return {
      skip: false,
      triggerOnce: true,
      steps: ["uncheck", "confirm_unchecked", "check"],
      transition: "checked → unchecked → checked",
      previous: true,
      resetValue: false,
      armedValue: true,
      reason: "Force leave/re-enter view 042",
    };
  }
  return {
    skip: false,
    triggerOnce: true,
    steps: ["check"],
    transition: "unchecked → checked",
    previous: false,
    resetValue: null,
    armedValue: true,
    reason: "Enter view 042 by checking Level Recalc Needed?",
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
  const wasReady = String(wasAutomationStatus || "").trim() === "Ready";
  const applied = isTruthyFlag(pwAppliedAfter);
  const countOk = Number(zoomAttendanceCount) === 1;
  const meetingCountOk = Number(zoomMeetingCount) >= 1;
  // v1.8: 057 completion signal is WAS Status=Ready (not ZA Applied?).
  // Applied? remains an expected Zoom-credit side effect when recording was newly counted.
  const pass = attendeesUnchanged && countOk && meetingCountOk && wasReady;
  return {
    pass,
    attendeesUnchanged,
    effectiveZoomAttendanceCount: Number(zoomAttendanceCount) || 0,
    zoomMeetingCount: Number(zoomMeetingCount) || 0,
    pwAppliedBefore: !!isTruthyFlag(pwAppliedBefore),
    pwAppliedAfter: !!applied,
    wasAutomationStatus: wasAutomationStatus || "",
    wasReady,
    reasons: [
      !attendeesUnchanged ? "Attendees changed" : null,
      !countOk ? `zoomAttendanceCount=${zoomAttendanceCount} expected 1` : null,
      !meetingCountOk ? `zoomMeetingCount=${zoomMeetingCount} expected >=1` : null,
      !wasReady
        ? `Perfect Week Automation Status="${wasAutomationStatus || ""}" expected Ready`
        : null,
      wasReady && !applied
        ? "note: Perfect Week Credit Applied? still false after Ready (recording may not have been newly counted)"
        : null,
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
    !sourceText.includes("waitFor057") &&
    (sourceText.includes("checked → unchecked → checked") ||
      sourceText.includes("plan042ViewReentry") ||
      sourceText.includes("viewReentry042")) &&
    (sourceText.includes("Skipped → Pending") ||
      sourceText.includes("plan057QueueReentry") ||
      sourceText.includes("queueReentry057") ||
      sourceText.includes("confirm057 left Queue")) &&
    (sourceText.includes("poll057 WAS") ||
      sourceText.includes("wasAutomationStatus") ||
      sourceText.includes("Status=Ready"))
  );
}

module.exports = {
  SCENARIO_KEY,
  MAX_QUERY_BUDGET,
  POLL_ATTEMPTS,
  POLL_DELAY_MS,
  DEFAULT_FIXTURES,
  QUEUE_MATCH_STATUSES,
  QUEUE_LEAVE_STATUS,
  QUEUE_ARM_STATUS,
  isTruthyFlag,
  isQueueMatchStatus,
  parseFixtureOverrides,
  resolveFixtures,
  isC025Stage17DownstreamScenario,
  createQueryBudget,
  estimateWorstCaseQueryCount,
  planResumeState,
  planDownstreamTriggers,
  plan057QueueReentryTransition,
  plan042ViewReentryTransition,
  evaluatePerfectWeekZoomPhase,
  evaluateGatePhase,
  evaluateDedupeRerun,
  buildActualResultPayload,
  dailySubmissionBranchMustRemainUntouched,
  c025PathMustUseQueryBudget,
};
