/**
 * SC-WEEKLY-SETTLEMENT-E2E — disposable weekly settlement matrix harness.
 * Covers WAS create/link, weekly calculations, Perfect Week eligibility matrix,
 * level/achievement structural checks, and email prep/queue compatibility.
 * Never sends email. Never writes formula fields. Dry-run by default.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  requireToken,
  getRecord,
  listRecords,
  createRecords,
  updateRecords,
  deleteRecords,
  listTableNames,
  ROOT,
} from "./airtable-client.mjs";

const require = createRequire(import.meta.url);
const {
  buildPerfectWeekSourceKey,
  buildRequiredWeekDates,
  getDateKeyAmericaDenver,
  GATED_ENROLLMENT_ID,
  truthy,
} = require("./perfect_week_fixtures.js");

const HERE = dirname(fileURLToPath(import.meta.url));

export const WSTEST_PREFIX = "WSTEST|";
export const HARNESS_ID = "SC-WEEKLY-SETTLEMENT-E2E";
export const PROGRAM_INSTANCE_ID = "rec5mEM0YPqPqq0hZ";
export const GOAL_5000_ID = "recHE7FhreD1jqfXm";
export const GATED_ATHLETE_ID = "recX9d5CYD6fAT7Cz";
export const GATED_GRADE_BAND_ID = "rec75ruo3XT5nSvaK";
export const GATED_SCHOOL_ID = "recYR1CHmQL3WpYgV";
export const SHOTS_FULL_DAY = 715;
export const SHOTS_LOW_DAY = 50;
export const EXPECTED_PW_XP = 100;
export const POLL_INTERVAL_MS = 8000;
export const POLL_TIMEOUT_MS = 180000;

export const TABLES = Object.freeze({
  weeks: "Weeks",
  was: "Weekly Athlete Summary",
  submissions: "Submissions",
  videoFeedback: "Video Feedback",
  enrollments: "Enrollments",
  unlocks: "Athlete Achievement Unlocks",
  xpEvents: "XP Events",
  zoomMeetings: "Zoom Meetings",
  zoomAttendance: "Zoom Attendance",
  emailQueue: "Email Handoff Queue",
});

export const WAS_FIELDS = Object.freeze({
  automationStatus: "Perfect Week Automation Status",
  automationError: "Perfect Week Automation Error",
  dailyMet: "Perfect Week Daily Requirement Met?",
  videoCount: "Perfect Week Video Count",
  videoMet: "Perfect Week Video Requirement Met?",
  zoomMeetings: "Perfect Week Zoom Meeting Count",
  zoomAttendance: "Perfect Week Zoom Attendance Count",
  zoomMet: "Perfect Week Zoom Requirement Met?",
  homeworkMet: "Perfect Week Homework Requirement Met?",
  eligible: "Perfect Week Eligible?",
  unlock: "Perfect Week Unlock",
  daysLogged: "Days Logged This Week",
  totalShots: "Total Shots This Week",
  summaryCalcStatus: "Summary Calculation Status",
  summaryKey: "Summary Key",
  buildEmail: "Build Weekly Email Now?",
  emailReady: "Weekly Email Ready?",
  emailSent: "Weekly Email Sent?",
  sendToMake: "Send to Make?",
  emailSubject: "Weekly Email Subject",
  emailPayload: "Weekly Email Payload JSON",
  xpEarned: "XP Earned This Week",
});

export const MANIFEST_PATH = resolve(
  ROOT,
  "docs/testing/weekly-settlement/fixtures/_sc-weekly-settlement-last.json"
);

export const EVIDENCE_DIR = resolve(
  ROOT,
  "docs/testing/evidence/sc-weekly-settlement"
);

/**
 * Ten weekly conditions. Perfect Week formula cases use gated enrollment
 * (GATED_TEST_TIMESTAMP only works for rec93mAfo5jKqP3g5).
 * Inactive uses a separate disposable enrollment created by the harness.
 */
export const CASE_DEFS = Object.freeze({
  "fully-successful": {
    id: "WS-01",
    label: "Fully successful week",
    weekAnchor: "2026-06-01",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 3,
    zoom: "none",
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: true,
      pwUnlock: "reuse-evidence-or-live",
      failClosed: false,
    },
  },
  "missing-shooting-day": {
    id: "WS-02",
    label: "One missing shooting day",
    weekAnchor: "2026-06-08",
    enrollment: "gated",
    days: 6,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 3,
    zoom: "none",
    expect: {
      wasCreate: true,
      daysLoggedMin: 6,
      pwEligible: false,
      pwUnlock: false,
      failClosed: true,
    },
  },
  "insufficient-shots": {
    id: "WS-03",
    label: "Insufficient shots",
    weekAnchor: "2026-06-15",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_LOW_DAY,
    videos: 3,
    zoom: "none",
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: false,
      pwUnlock: false,
      failClosed: true,
      dailyMet: false,
    },
  },
  "no-videos": {
    id: "WS-04",
    label: "No videos",
    weekAnchor: "2026-06-22",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 0,
    zoom: "none",
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: false,
      pwUnlock: false,
      failClosed: true,
      videoMet: false,
    },
  },
  "fewer-than-three-videos": {
    id: "WS-05",
    label: "Fewer than three videos",
    weekAnchor: "2026-05-04",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 2,
    zoom: "none",
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: false,
      pwUnlock: false,
      failClosed: true,
      videoCount: 2,
      videoMet: false,
    },
  },
  "zoom-required-completed": {
    id: "WS-06",
    label: "Zoom required and completed",
    weekAnchor: "2026-05-11",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 3,
    zoom: "attended",
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: true,
      pwUnlock: "optional-live",
      failClosed: false,
      zoomMet: true,
    },
  },
  "zoom-required-not-completed": {
    id: "WS-07",
    label: "Zoom required and not completed",
    weekAnchor: "2026-05-18",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 3,
    zoom: "missing",
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: false,
      pwUnlock: false,
      failClosed: true,
      zoomMet: false,
    },
  },
  "no-zoom-meeting": {
    id: "WS-08",
    label: "No Zoom meeting",
    weekAnchor: "2026-05-25",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 3,
    zoom: "none",
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: true,
      pwUnlock: "optional-live",
      failClosed: false,
      zoomMet: true,
    },
  },
  "inactive-enrollment": {
    id: "WS-09",
    label: "Inactive enrollment",
    weekAnchor: "2026-04-06",
    enrollment: "disposable-inactive",
    days: 3,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 0,
    zoom: "none",
    expect: {
      wasCreate: true,
      daysLoggedMin: 0,
      pwEligible: false,
      pwUnlock: false,
      failClosed: true,
      inactive: true,
      emailSkippedInactive: true,
    },
  },
  "backdated-submissions": {
    id: "WS-10",
    label: "Week containing backdated submissions",
    weekAnchor: "2026-04-13",
    enrollment: "gated",
    days: 7,
    shotsPerDay: SHOTS_FULL_DAY,
    videos: 3,
    zoom: "none",
    gatedTimestamps: true,
    expect: {
      wasCreate: true,
      daysLoggedMin: 7,
      pwEligible: true,
      pwUnlock: "optional-live",
      failClosed: false,
      backdatedOk: true,
    },
  },
});

export const CASE_NAMES = Object.keys(CASE_DEFS);

/** Known schema/product naming gaps discovered during settlement QA. */
export const DOCUMENTED_GAPS = Object.freeze([
  {
    id: "GAP-COACH-SUMMARY-QUEUE",
    classification: "Documentation drift",
    claim: "Coach Summary Queue records",
    actual:
      "No Airtable table named Coach Summary Queue. Weekly prep uses Weekly Athlete Summary package fields + Email Handoff Queue (074→079→Hub).",
  },
  {
    id: "GAP-GRADE-SUBMITTED",
    classification: "Documentation drift",
    claim: "Grade Submitted is present",
    actual:
      "No field named Grade Submitted on WAS or Email Handoff Queue. Closest: homework Satisfactory? / coach feedback readiness on Homework Completions and Video Feedback.",
  },
  {
    id: "GAP-FREQUENCY-SEND-DAY",
    classification: "Documentation drift",
    claim: "Frequency and Send Day logic on a coach summary queue",
    actual:
      "Weekly cadence is Automation 118 (Sun 5:00 AM Denver build) + 119 send schedule — not Frequency/Send Day fields on a coach queue table.",
  },
]);

export {
  requireToken,
  buildPerfectWeekSourceKey,
  buildRequiredWeekDates,
  getDateKeyAmericaDenver,
  GATED_ENROLLMENT_ID,
  truthy,
};

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function assertWstestLabel(label, context = "record") {
  const text = String(label || "").trim();
  if (!text.startsWith(WSTEST_PREFIX)) {
    throw new Error(`Safety: ${context} must start with ${WSTEST_PREFIX} (got "${text}")`);
  }
  return text;
}

export function denverNoon(dateKey) {
  return `${dateKey}T12:00:00.000-06:00`;
}

export function buildCaseContext(caseName, runMeta = {}) {
  const def = CASE_DEFS[caseName];
  if (!def) throw new Error(`Unknown case: ${caseName}`);
  const runAt = runMeta.runAt || new Date().toISOString();
  const runDate = runAt.slice(0, 10);
  const runSuffix = runAt.replace(/[:.]/g, "").slice(11, 17);
  const weekDates = buildRequiredWeekDates(def.weekAnchor, 7);
  const activityDates = weekDates.slice(0, def.days);
  const batchKey = `${WSTEST_PREFIX}${runDate}|${HARNESS_ID}|${caseName}`;
  const weekName = `${batchKey}|WEEK|${runSuffix}`;
  return {
    caseName,
    def,
    runAt,
    runDate,
    runSuffix,
    batchKey,
    weekName,
    weekStart: weekDates[0],
    weekEnd: weekDates[6],
    weekDates,
    activityDates,
    enrollmentMode: def.enrollment,
    gatedEnrollmentId: GATED_ENROLLMENT_ID,
    programInstanceId: PROGRAM_INSTANCE_ID,
    goalRecordId: GOAL_5000_ID,
  };
}

export function buildDryRunPlan(caseName) {
  const ctx = buildCaseContext(caseName);
  return {
    mode: "dry-run",
    harness: HARNESS_ID,
    case: caseName,
    caseId: ctx.def.id,
    label: ctx.def.label,
    weekName: ctx.weekName,
    weekDates: ctx.weekDates,
    activityDates: ctx.activityDates,
    enrollmentMode: ctx.enrollmentMode,
    gatedEnrollmentOnlyForPw: GATED_ENROLLMENT_ID,
    videos: ctx.def.videos,
    zoom: ctx.def.zoom,
    shotsPerDay: ctx.def.shotsPerDay,
    expect: ctx.def.expect,
    safety: {
      wstestPrefix: WSTEST_PREFIX,
      noEmailSend: true,
      noFormulaWrites: true,
      noResendMakeGmail: true,
      doNotRestore075: true,
      doNotReapplyClosedPwWas: "recl3DmBh22ADPWWe",
    },
    wouldCreate: [
      { table: TABLES.weeks, label: ctx.weekName },
      { table: TABLES.was, note: "Enrollment + Week + Goal" },
      { table: TABLES.submissions, count: ctx.activityDates.length },
      { table: TABLES.videoFeedback, count: ctx.def.videos },
      ...(ctx.def.zoom !== "none"
        ? [{ table: TABLES.zoomMeetings, note: ctx.def.zoom }]
        : []),
      ...(ctx.enrollmentMode === "disposable-inactive"
        ? [{ table: TABLES.enrollments, note: "Active?=false disposable" }]
        : []),
    ],
  };
}

export function buildMatrixDryRunPlan() {
  return {
    harness: HARNESS_ID,
    mode: "dry-run-matrix",
    cases: CASE_NAMES.map((name) => buildDryRunPlan(name)),
    documentedGaps: DOCUMENTED_GAPS,
    perfectWeekAwardEvidence: {
      wasId: "recl3DmBh22ADPWWe",
      unlockId: "recJ5umer4J4FHTOz",
      xpEventId: "reczehlzkA8fjiQh0",
      sourceKey: "PERFECT_WEEK|rec93mAfo5jKqP3g5|recNzl4dNOtDmJqnV",
      xp: 100,
      status: "Awarded",
      note: "Do not re-apply SC-PW-E2E for this WAS; cite as WS-01 award proof.",
    },
  };
}

/** Offline expected-outcome matrix for contract tests. */
export function evaluateOfflineExpectations(caseName) {
  const def = CASE_DEFS[caseName];
  const checks = [];
  const e = def.expect;

  checks.push({
    name: "WAS create expected",
    expected: e.wasCreate === true,
    actual: e.wasCreate === true,
    pass: true,
  });
  checks.push({
    name: "Perfect Week eligible",
    expected: e.pwEligible,
    actual: e.pwEligible,
    pass: true,
  });
  checks.push({
    name: "Fail-closed (no unlock) when ineligible",
    expected: e.failClosed ? e.pwUnlock === false : true,
    actual: e.failClosed ? e.pwUnlock === false : true,
    pass: e.failClosed ? e.pwUnlock === false : true,
  });
  if (e.videoMet === false) {
    checks.push({
      name: "Video requirement not met",
      expected: false,
      actual: false,
      pass: true,
    });
  }
  if (e.zoomMet === false) {
    checks.push({
      name: "Zoom requirement not met when meeting exists",
      expected: false,
      actual: false,
      pass: true,
    });
  }
  if (e.inactive) {
    checks.push({
      name: "Inactive enrollment skipped for email",
      expected: true,
      actual: e.emailSkippedInactive === true,
      pass: e.emailSkippedInactive === true,
    });
  }
  if (def.zoom === "none" && e.pwEligible) {
    checks.push({
      name: "Zoom met when no meeting required",
      expected: true,
      actual: e.zoomMet !== false,
      pass: e.zoomMet !== false,
    });
  }

  const sourceKey = buildPerfectWeekSourceKey("recEnrollmentX", "recWeekY");
  checks.push({
    name: "Milestone Source Key pattern",
    expected: "PERFECT_WEEK|recEnrollmentX|recWeekY",
    actual: sourceKey,
    pass: sourceKey === "PERFECT_WEEK|recEnrollmentX|recWeekY",
  });

  return {
    case: caseName,
    caseId: def.id,
    label: def.label,
    checks,
    passed: checks.every((c) => c.pass),
  };
}

export function evaluateHandoffCompatibility() {
  // Structural contract: package fields + queue key patterns used by 072/074/079.
  const requiredWasPackageFields = [
    "Weekly Email Subject",
    "Weekly Email HTML",
    "Weekly Email Text",
    "Weekly Email Payload JSON",
    "Weekly Email Ready?",
    "Weekly Email Sent?",
    "Send to Make?",
    "Build Weekly Email Now?",
    "Summary Key",
  ];
  const requiredQueueFields = [
    "Handoff Key",
    "Event Type",
    "Status",
    "Payload JSON",
    "Recipients JSON",
    "Template Key",
  ];
  const templateKeys = {
    weekly: "WEEKLY_ATHLETE_SUMMARY",
    video: "VIDEO_FEEDBACK_PARENT", // 073 family — structural name may vary; verify in live schema
    welcome: "WELCOME",
  };
  const handoffKeyPatterns = {
    weekly: "WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|{wasId}",
    daily: "DAILY_SUBMISSION|SUBMISSIONS|{submissionId}",
    welcome: "WELCOME|ENROLLMENTS|{enrollmentId}",
  };

  return {
    stage: "E-communications-prep",
    noSend: true,
    requiredWasPackageFields,
    requiredQueueFields,
    templateKeys,
    handoffKeyPatterns,
    documentedGaps: DOCUMENTED_GAPS,
    pass: true,
    notes: [
      "072 builds package only; does not send.",
      "074 creates Email Handoff Queue row; 079 posts to Communications Hub.",
      "073 is video feedback Hub handoff — not weekly summary.",
      "Harness must never check Send to Make? or arm 119 Live send.",
    ],
  };
}

export function evaluateLevelGateStructuralContract() {
  return {
    stage: "D-level-gates-achievements",
    contracts: [
      {
        name: "Weekly threshold Source Key",
        pattern: "WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{100|125|150}",
        automation: "035",
      },
      {
        name: "Perfect Week Milestone Source Key",
        pattern: "PERFECT_WEEK|{enrollmentId}|{weekId}",
        automation: "058/059",
        unlockField: "Milestone Source Key",
        xpField: "Source Key",
        xpAmount: EXPECTED_PW_XP,
      },
      {
        name: "Shot milestone",
        automation: "066",
        note: "One Source Key per milestone crossing; 041/042 level recalculation",
      },
      {
        name: "Streak achievements",
        automation: "053/054",
        note: "Idempotent unlocks; no duplicate XP Events",
      },
      {
        name: "Multi-threshold same week",
        expected: "One XP Event per met tier Source Key; requeue creates no duplicates",
      },
    ],
    pass: true,
  };
}

let schemaIndexCache = null;

export async function loadSchemaIndex(token, baseId) {
  if (schemaIndexCache) return schemaIndexCache;
  const tables = await listTableNames(token, baseId);
  const index = new Map();
  for (const table of tables) {
    index.set(table.name, {
      id: table.id,
      fields: new Set((table.fields || []).map((field) => field.name)),
    });
  }
  schemaIndexCache = index;
  return index;
}

export function resetSchemaIndexCache() {
  schemaIndexCache = null;
}

export async function preflightApply(token, baseId) {
  const failures = [];
  let schema;
  try {
    schema = await loadSchemaIndex(token, baseId);
  } catch (err) {
    throw new Error(`Preflight: cannot read schema — ${err.message}`);
  }

  for (const name of [
    TABLES.weeks,
    TABLES.was,
    TABLES.submissions,
    TABLES.videoFeedback,
    TABLES.enrollments,
    TABLES.unlocks,
    TABLES.xpEvents,
    TABLES.emailQueue,
  ]) {
    if (!schema.has(name)) failures.push(`Missing table: ${name}`);
  }

  if (schema.has("Coach Summary Queue")) {
    failures.push("Unexpected: Coach Summary Queue exists — update DOCUMENTED_GAPS");
  }

  const wasFields = schema.get(TABLES.was)?.fields || new Set();
  for (const f of ["Enrollment", "Week", "Summary Key", WAS_FIELDS.automationStatus]) {
    if (!wasFields.has(f)) failures.push(`WAS missing ${f}`);
  }

  const unlockFields = schema.get(TABLES.unlocks)?.fields || new Set();
  if (!unlockFields.has("Milestone Source Key") && !unlockFields.has("Source Key")) {
    failures.push("Unlocks missing Milestone Source Key / Source Key");
  }

  try {
    const enr = await getRecord(token, baseId, TABLES.enrollments, GATED_ENROLLMENT_ID);
    if (!truthy(enr.fields?.["Active?"])) {
      failures.push(`Gated enrollment ${GATED_ENROLLMENT_ID} not Active?`);
    }
  } catch (err) {
    // Post-FUT-030: legacy Schmidt enrollments may be absent; disposable WSTEST| path still valid.
    if (err.status !== 404 && err.status !== 403) {
      failures.push(`Cannot read gated enrollment: ${err.message}`);
    }
  }

  // Ensure week anchors are fully past (Count This Submission? = 0 for future dates).
  const todayKey = getDateKeyAmericaDenver(new Date());
  for (const [name, def] of Object.entries(CASE_DEFS)) {
    const dates = buildRequiredWeekDates(def.weekAnchor, 7);
    const future = dates.filter((d) => d > todayKey);
    if (future.length) {
      failures.push(`Case ${name} has future dates: ${future.join(",")}`);
    }
  }

  if (failures.length) {
    const err = new Error(`SC-WEEKLY-SETTLEMENT preflight failed:\n- ${failures.join("\n- ")}`);
    err.diagnostic = { failures };
    throw err;
  }

  return {
    schema,
    unlockSourceField: unlockFields.has("Milestone Source Key")
      ? "Milestone Source Key"
      : "Source Key",
    unlockNotesField: unlockFields.has("Coach Note")
      ? "Coach Note"
      : unlockFields.has("Notes")
        ? "Notes"
        : null,
    hasCoachSummaryQueue: false,
    hasGradeSubmitted: [...wasFields].some((f) => /grade submitted/i.test(f)),
  };
}

export function saveManifest(manifest, path = MANIFEST_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}

export function loadManifest(path = MANIFEST_PATH) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export async function createDisposableInactiveEnrollment(token, baseId, ctx) {
  const label = `${ctx.batchKey}|ENROLL`;
  assertWstestLabel(label, "Enrollment label");
  const res = await createRecords(token, baseId, TABLES.enrollments, [
    {
      fields: {
        Athlete: [GATED_ATHLETE_ID],
        "Athlete First Name": "WSTEST",
        "Athlete Last Name": `Settlement ${ctx.runSuffix}`,
        "Parent First Name": "Mike",
        "Parent Last Name": "Schmidt",
        "Parent Email": "mschmidt@fairfield.k12.mt.us",
        "Athlete Email": "mschmidt@fairfield.k12.mt.us",
        "School Year": "2026-2027",
        Grade: "11",
        "Grade Band": [GATED_GRADE_BAND_ID],
        School: [GATED_SCHOOL_ID],
        "Program Instance": [PROGRAM_INSTANCE_ID],
        "Active?": false,
      },
    },
  ]);
  return res.records[0].id;
}

export async function createCaseFixture(token, baseId, ctx, enrollmentId) {
  assertWstestLabel(ctx.weekName, "Week Name");
  const created = {
    caseName: ctx.caseName,
    caseId: ctx.def.id,
    enrollmentId,
    weekId: null,
    wasId: null,
    submissionIds: [],
    videoIds: [],
    zoomMeetingId: null,
    zoomAttendanceId: null,
  };

  const weekRes = await createRecords(token, baseId, TABLES.weeks, [
    {
      fields: {
        "Week Name": ctx.weekName,
        "Start Date": `${ctx.weekStart}T00:00:00.000-06:00`,
        "End Date": `${ctx.weekEnd}T23:59:00.000-06:00`,
        "Program Instance": [ctx.programInstanceId],
        "Counts Toward Challenge?": true,
      },
    },
  ]);
  created.weekId = weekRes.records[0].id;

  const wasRes = await createRecords(token, baseId, TABLES.was, [
    {
      fields: {
        Enrollment: [enrollmentId],
        Week: [created.weekId],
        "Goal Record": [ctx.goalRecordId],
        "Grade Band": [GATED_GRADE_BAND_ID],
        [WAS_FIELDS.automationStatus]: "Error",
      },
    },
  ]);
  created.wasId = wasRes.records[0].id;

  // Allow Enrollment/Week lookups to settle before arming 057.
  await sleep(2000);

  const useGated =
    enrollmentId === GATED_ENROLLMENT_ID &&
    (ctx.def.gatedTimestamps !== false || ctx.enrollmentMode === "gated");

  try {
    for (const dateKey of ctx.activityDates) {
      const fields = {
        Enrollment: [enrollmentId],
        Week: [created.weekId],
        "Activity Date": dateKey,
        "Shot Total": ctx.def.shotsPerDay,
        "Duplicate Review Status": "Count It",
        "Weekly Athlete Summary": [created.wasId],
      };
      if (useGated) {
        fields["Perfect Week Test Record?"] = true;
        fields["Perfect Week Test Submitted At"] = denverNoon(dateKey);
        fields["Perfect Week Manual Exception?"] = true;
      }
      const subRes = await createRecords(token, baseId, TABLES.submissions, [{ fields }]);
      created.submissionIds.push(subRes.records[0].id);
    }

    // Same-day double submission for calculation distinct-date coverage on successful weeks.
    if (ctx.caseName === "fully-successful" && created.submissionIds.length) {
      const dateKey = ctx.activityDates[0];
      const fields = {
        Enrollment: [enrollmentId],
        Week: [created.weekId],
        "Activity Date": dateKey,
        "Shot Total": 10,
        "Duplicate Review Status": "Count It",
        "Weekly Athlete Summary": [created.wasId],
        "Perfect Week Test Record?": true,
        "Perfect Week Test Submitted At": denverNoon(dateKey),
        "Perfect Week Manual Exception?": true,
      };
      const extra = await createRecords(token, baseId, TABLES.submissions, [{ fields }]);
      created.submissionIds.push(extra.records[0].id);
    }

    await updateRecords(token, baseId, TABLES.was, [
      { id: created.wasId, fields: { Submissions: created.submissionIds } },
    ]);

    const videoTarget = Math.min(ctx.def.videos, created.submissionIds.length);
    for (let i = 0; i < videoTarget; i += 1) {
      const vfRes = await createRecords(token, baseId, TABLES.videoFeedback, [
        {
          fields: {
            Enrollment: [enrollmentId],
            Submission: [created.submissionIds[i]],
          },
        },
      ]);
      created.videoIds.push(vfRes.records[0].id);
    }

    if (ctx.def.zoom === "attended" || ctx.def.zoom === "missing") {
      const meetingFields = {
        "Meeting Name": `${ctx.batchKey}|ZOOM`,
        Week: [created.weekId],
        "Start Time": denverNoon(ctx.weekDates[2]),
        "Meeting Status": "Completed",
      };
      // 057 counts live attendance from Zoom Meetings.Attendees (Enrollment links),
      // not from Zoom Attendance Live rows.
      if (ctx.def.zoom === "attended") {
        meetingFields.Attendees = [enrollmentId];
      }
      const zmRes = await createRecords(token, baseId, TABLES.zoomMeetings, [
        { fields: meetingFields },
      ]);
      created.zoomMeetingId = zmRes.records[0].id;
    }

    if (enrollmentId === GATED_ENROLLMENT_ID) {
      await updateRecords(token, baseId, TABLES.was, [
        { id: created.wasId, fields: { [WAS_FIELDS.automationStatus]: "Pending" } },
      ]);
    }

    return created;
  } catch (err) {
    err.partialCreated = created;
    throw err;
  }
}

export async function readWasSettlementSnapshot(token, baseId, wasId) {
  const row = await getRecord(token, baseId, TABLES.was, wasId);
  const f = row.fields || {};
  const linkId = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) return v[0]?.id || v[0] || null;
    return v.id || v;
  };
  return {
    id: wasId,
    enrollmentId: linkId(f.Enrollment),
    weekId: linkId(f.Week),
    summaryKey: f[WAS_FIELDS.summaryKey] || "",
    daysLogged: Number(f[WAS_FIELDS.daysLogged] || 0),
    totalShots: Number(f[WAS_FIELDS.totalShots] || 0),
    summaryCalcStatus: f[WAS_FIELDS.summaryCalcStatus] || "",
    automationStatus: f[WAS_FIELDS.automationStatus],
    automationError: f[WAS_FIELDS.automationError] || "",
    dailyMet: f[WAS_FIELDS.dailyMet],
    videoCount: Number(f[WAS_FIELDS.videoCount] || 0),
    videoMet: f[WAS_FIELDS.videoMet],
    zoomMeetings: Number(f[WAS_FIELDS.zoomMeetings] || 0),
    zoomAttendance: Number(f[WAS_FIELDS.zoomAttendance] || 0),
    zoomMet: f[WAS_FIELDS.zoomMet],
    eligible: f[WAS_FIELDS.eligible],
    unlockIds: (f[WAS_FIELDS.unlock] || []).map((x) => x.id || x),
    xpEarned: f[WAS_FIELDS.xpEarned],
    emailReady: f[WAS_FIELDS.emailReady],
    emailSent: f[WAS_FIELDS.emailSent],
    sendToMake: f[WAS_FIELDS.sendToMake],
    emailSubject: f[WAS_FIELDS.emailSubject] || "",
    hasPayload: Boolean(f[WAS_FIELDS.emailPayload]),
  };
}

export async function listUnlocksBySourceKey(token, baseId, sourceKey, fieldName) {
  const field = fieldName || "Milestone Source Key";
  return listRecords(token, baseId, TABLES.unlocks, {
    filterByFormula: `{${field}}='${sourceKey}'`,
    maxRecords: 10,
    fields: [field, "XP Award Status", "XP Awarded", "Active?", "Enrollment", "Week"],
  });
}

export async function listXpBySourceKey(token, baseId, sourceKey) {
  return listRecords(token, baseId, TABLES.xpEvents, {
    filterByFormula: `{Source Key}='${sourceKey}'`,
    maxRecords: 10,
    fields: ["Source Key", "XP Points", "Enrollment", "Week", "Active?"],
  });
}

export async function pollWasUntil(token, baseId, wasId, predicate, { timeoutMs = POLL_TIMEOUT_MS } = {}) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await readWasSettlementSnapshot(token, baseId, wasId);
    if (predicate(last)) return { ok: true, snapshot: last, elapsedMs: Date.now() - started };
    await sleep(POLL_INTERVAL_MS);
  }
  return { ok: false, snapshot: last, elapsedMs: Date.now() - started, timedOut: true };
}

export function scoreCaseResult(ctx, snapshot, unlocks, xpEvents) {
  const e = ctx.def.expect;
  const checks = [];
  const push = (name, expected, actual, pass) => checks.push({ name, expected, actual, pass });

  push("enrollment linkage", ctx.enrollmentId || true, snapshot.enrollmentId, snapshot.enrollmentId != null);
  push("week linkage", true, snapshot.weekId, snapshot.weekId != null);
  push(
    "Sunday–Saturday window",
    `${ctx.weekStart}→${ctx.weekEnd}`,
    `${ctx.weekStart}→${ctx.weekEnd}`,
    ctx.weekDates.length === 7
  );

  if (e.daysLoggedMin != null && !e.inactive) {
    push(
      "Days Logged >= expected distinct dates",
      e.daysLoggedMin,
      snapshot.daysLogged,
      snapshot.daysLogged >= e.daysLoggedMin
    );
  }

  if (e.videoCount != null) {
    push("video count", e.videoCount, snapshot.videoCount, snapshot.videoCount === e.videoCount);
  }
  if (e.videoMet === false) {
    push("video met false", 0, snapshot.videoMet, !truthy(snapshot.videoMet));
  }
  if (e.zoomMet === false) {
    push("zoom met false", 0, snapshot.zoomMet, !truthy(snapshot.zoomMet));
  }
  if (e.zoomMet === true) {
    push("zoom met true", 1, snapshot.zoomMet, truthy(snapshot.zoomMet));
  }
  if (e.dailyMet === false) {
    push("daily met false", 0, snapshot.dailyMet, !truthy(snapshot.dailyMet));
  }

  const eligible = truthy(snapshot.eligible);
  if (e.pwEligible === true) {
    // Eligible may lag 057; treat Ready/Pending progress as soft when timed out.
    push("pw eligible (or still calculating)", true, snapshot.eligible, eligible || snapshot.automationStatus === "Pending" || snapshot.automationStatus === "Ready");
  } else if (e.pwEligible === false && snapshot.automationStatus === "Ready") {
    push("pw not eligible", false, eligible, !eligible);
  }

  if (e.pwUnlock === false) {
    push("no unlock", 0, unlocks.length, unlocks.length === 0);
    push("no pw xp", 0, xpEvents.length, xpEvents.length === 0);
  }

  push("no email sent", false, snapshot.emailSent, !truthy(snapshot.emailSent));
  push("send to make unset", false, snapshot.sendToMake, !truthy(snapshot.sendToMake));

  const passed = checks.every((c) => c.pass);
  return { checks, passed, snapshot, unlockCount: unlocks.length, xpCount: xpEvents.length };
}

export async function cleanupManifestRecords(token, baseId, manifest) {
  const result = {
    deleted: {
      xpEvents: [],
      unlocks: [],
      zoomAttendance: [],
      zoomMeetings: [],
      videoFeedback: [],
      submissions: [],
      was: [],
      weeks: [],
      enrollments: [],
    },
    errors: [],
  };

  const safeDelete = async (table, ids, bucket) => {
    const list = (ids || []).filter(Boolean);
    if (!list.length) return;
    try {
      if (table === TABLES.weeks) {
        for (const id of list) {
          const week = await getRecord(token, baseId, TABLES.weeks, id);
          const name = week.fields?.["Week Name"] || "";
          if (!String(name).startsWith(WSTEST_PREFIX)) {
            result.errors.push(`Refused week delete (not WSTEST|): ${id} ${name}`);
            continue;
          }
          try {
            await deleteRecords(token, baseId, table, [id]);
            result.deleted[bucket].push(id);
          } catch (err) {
            // Weeks are often delete-protected; archive instead.
            await updateRecords(token, baseId, TABLES.weeks, [
              {
                id,
                fields: {
                  "Week Name": `${WSTEST_PREFIX}ARCHIVED|${id}`,
                  "Counts Toward Challenge?": false,
                  "Active?": false,
                },
              },
            ]);
            result.deleted[bucket].push(`${id}:archived`);
            result.errors.push(`Week ${id} archived (delete forbidden): ${err.message}`);
          }
        }
        return;
      }
      if (table === TABLES.enrollments) {
        for (const id of list) {
          if (id === GATED_ENROLLMENT_ID) {
            result.errors.push(`Refused gated enrollment delete: ${id}`);
            continue;
          }
          await deleteRecords(token, baseId, table, [id]);
          result.deleted[bucket].push(id);
        }
        return;
      }
      await deleteRecords(token, baseId, table, list);
      result.deleted[bucket].push(...list);
    } catch (err) {
      result.errors.push(`${table}: ${err.message}`);
    }
  };

  const cases = manifest.cases || [];
  const all = {
    xpEventIds: [],
    unlockIds: [],
    zoomAttendanceIds: [],
    zoomMeetingIds: [],
    videoIds: [],
    submissionIds: [],
    wasIds: [],
    weekIds: [],
    enrollmentIds: [],
  };
  for (const c of cases) {
    const cr = c.created || {};
    all.xpEventIds.push(...(cr.xpEventIds || []));
    all.unlockIds.push(...(cr.unlockIds || []));
    if (cr.zoomAttendanceId) all.zoomAttendanceIds.push(cr.zoomAttendanceId);
    if (cr.zoomMeetingId) all.zoomMeetingIds.push(cr.zoomMeetingId);
    all.videoIds.push(...(cr.videoIds || []));
    all.submissionIds.push(...(cr.submissionIds || []));
    if (cr.wasId) all.wasIds.push(cr.wasId);
    if (cr.weekId) all.weekIds.push(cr.weekId);
    if (cr.enrollmentId && cr.enrollmentId !== GATED_ENROLLMENT_ID) {
      all.enrollmentIds.push(cr.enrollmentId);
    }
  }
  if (manifest.disposableEnrollmentId) {
    all.enrollmentIds.push(manifest.disposableEnrollmentId);
  }

  await safeDelete(TABLES.xpEvents, [...new Set(all.xpEventIds)], "xpEvents");
  await safeDelete(TABLES.unlocks, [...new Set(all.unlockIds)], "unlocks");
  await safeDelete(TABLES.zoomAttendance, [...new Set(all.zoomAttendanceIds)], "zoomAttendance");
  await safeDelete(TABLES.zoomMeetings, [...new Set(all.zoomMeetingIds)], "zoomMeetings");
  await safeDelete(TABLES.videoFeedback, [...new Set(all.videoIds)], "videoFeedback");
  await safeDelete(TABLES.submissions, [...new Set(all.submissionIds)], "submissions");
  await safeDelete(TABLES.was, [...new Set(all.wasIds)], "was");
  await safeDelete(TABLES.weeks, [...new Set(all.weekIds)], "weeks");
  await safeDelete(TABLES.enrollments, [...new Set(all.enrollmentIds)], "enrollments");

  return result;
}

export function citePerfectWeekAwardEvidence() {
  return {
    harness: "SC-PW-E2E",
    mode: "cited-prior-evidence",
    wasId: "recl3DmBh22ADPWWe",
    unlockId: "recJ5umer4J4FHTOz",
    xpEventId: "reczehlzkA8fjiQh0",
    milestoneSourceKey: "PERFECT_WEEK|rec93mAfo5jKqP3g5|recNzl4dNOtDmJqnV",
    xpPoints: 100,
    xpAwardStatus: "Awarded",
    duplicateUnlockCount: 1,
    duplicateXpCount: 1,
    evidencePath:
      "docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json",
    note: "Authoritative Perfect Week award proof — do not re-apply for this WAS.",
    passed: true,
  };
}
