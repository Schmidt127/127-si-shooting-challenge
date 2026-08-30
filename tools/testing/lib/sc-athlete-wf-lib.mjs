/**
 * SC-ATHLETE-WF-001 — individual athlete workflow harness library.
 *
 * Disposable Testing3 Schmidt path only. Dry-run default. No email arms.
 * Distinct from SC-PW-E2E and season simulation.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requireToken,
  getRecord,
  listRecords,
  createRecords,
  updateRecords,
  deleteRecords,
  ROOT,
} from "./airtable-client.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export const ATHWF_PREFIX = "ATHWF|";
/** Testing3 Schmidt — disposable; not Perfect Week Testing / Xavier / Curtis. */
export const GATED_ENROLLMENT_ID = "recNu6fcBpF1GG3u5";
export const GATED_ATHLETE_ID = "rec82GY2ECcbWaDpf";
export const PROGRAM_INSTANCE_ID = "rec5mEM0YPqPqq0hZ";
export const GRADE_BAND_5_6_ID = "recv9aWnHanY2sRgk";

/** Past Sun–Sat week in June 2026 — avoids PWTEST July anchors and future-date Count? = 0. */
export const WEEK_ANCHOR = "2026-06-01";

export const POLL_INTERVAL_MS = 8000;
export const POLL_TIMEOUT_MS = 180000;

export const TABLES = Object.freeze({
  weeks: "Weeks",
  was: "Weekly Athlete Summary",
  submissions: "Submissions",
  submissionAssets: "Submission Assets",
  homeworkCompletions: "Homework Completions",
  videoFeedback: "Video Feedback",
  enrollments: "Enrollments",
  streakOccurrences: "Streak Occurrences",
  unlocks: "Athlete Achievement Unlocks",
  xpEvents: "XP Events",
});

export const MANIFEST_PATH = resolve(
  ROOT,
  "docs/testing/athlete-workflow/fixtures/_sc-athlete-wf-last.json"
);

export const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/sc-athlete-wf");

export const VALID_CASES = Object.freeze([
  "full",
  "submissions",
  "homework-video",
  "streaks-levels",
  "was",
  "negatives",
]);

export { requireToken, ROOT };

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function assertAthwfLabel(label, context = "record") {
  const text = String(label || "").trim();
  if (!text.startsWith(ATHWF_PREFIX)) {
    throw new Error(`Safety: ${context} must start with ${ATHWF_PREFIX} (got "${text}")`);
  }
  return text;
}

/** America/Denver noon ISO for a YYYY-MM-DD key (mirrors SC-PW-E2E denverNoon). */
export function denverNoon(dateKey) {
  const key = String(dateKey).slice(0, 10);
  const [y, m, d] = key.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 18, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    timeZoneName: "shortOffset",
  }).formatToParts(probe);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-6";
  const match = tz.match(/GMT([+-])(\d+)(?::(\d+))?/);
  let offset = "-06:00";
  if (match) {
    const sign = match[1];
    const hh = String(match[2]).padStart(2, "0");
    const mm = String(match[3] || "0").padStart(2, "0");
    offset = `${sign}${hh}:${mm}`;
  }
  return `${key}T12:00:00.000${offset}`;
}

export function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function buildWeekDates(anchor = WEEK_ANCHOR, count = 7) {
  return Array.from({ length: count }, (_, i) => addDaysToDateKey(anchor, i));
}

export function submissionXpKey(submissionId) {
  return `SUBMISSION_XP|${submissionId}`;
}

export function homeworkXpKey(hcId) {
  return `HOMEWORK_XP|${hcId}`;
}

export function videoXpKey(vfId) {
  return `VIDEO_SUBMISSION|${vfId}`;
}

export function streakXpKey(enrollmentId, achievementId, streakEndDate) {
  return `STREAK_XP|${enrollmentId}|${achievementId}|${streakEndDate}`;
}

/**
 * Engine rule: at most one counted shooting XP day per enrollment per Denver date.
 * Multiple submissions same day may each get SUBMISSION_XP|{id} if Count It —
 * that is a known SC-005 B3 policy open item, not inventing product behavior.
 */
export function evaluateCountedDayXpPolicy(xpEventsForEnrollmentDay) {
  const active = (xpEventsForEnrollmentDay || []).filter(
    (e) => e.active !== false && String(e.sourceKey || "").startsWith("SUBMISSION_XP|")
  );
  return {
    submissionXpCount: active.length,
    note:
      active.length > 1
        ? "Multiple SUBMISSION_XP on same Denver day — SC-005 B3 policy open (product-decision)"
        : "At most one SUBMISSION_XP for this day inventory slice",
    policyOpen: active.length > 1,
  };
}

/**
 * Automation 065 does NOT fire on Satisfactory? alone.
 * Positive award needs Reconciliation Needed?=1 (formula), review eligibility,
 * Total Homework XP Awarded > 0 (064), and PHA identity when PHA is linked.
 * ATHWF default HC create is a negative/skip probe unless phaLinked + awardReady.
 */
export function evaluateHomework065Eligibility({
  satisfactory = false,
  reviewComplete = false,
  reconcileNeeded = false,
  totalHomeworkXpAwarded = 0,
  phaLinked = false,
  hasSubmissionLink = false,
} = {}) {
  const blockers = [];
  if (!satisfactory) blockers.push("Satisfactory?=false");
  if (!reviewComplete) blockers.push("Review Complete missing");
  if (!reconcileNeeded) blockers.push("Homework XP Reconciliation Needed? != 1");
  if (!(Number(totalHomeworkXpAwarded) > 0)) blockers.push("Total Homework XP Awarded <= 0");
  if (!phaLinked) blockers.push("Program Homework Assignment not linked (PHA-first path)");
  if (!hasSubmissionLink) blockers.push("Submission link missing for new XP create");
  return {
    expectXp: blockers.length === 0,
    blockers,
    note:
      blockers.length === 0
        ? "065 positive path preconditions met"
        : `065 expected skip/no award: ${blockers.join("; ")}`,
  };
}

/** Stages included for each --case (apply create/verify scope). */
export function stagesForCase(caseName) {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  switch (caseName) {
    case "submissions":
      return [1, 2, 3, 4, 5, 15, 16];
    case "homework-video":
      return [1, 2, 6, 7, 8, 9, 10, 15, 16, 17];
    case "streaks-levels":
      return [1, 2, 3, 4, 11, 12, 13, 15];
    case "was":
      return [1, 2, 3, 4, 14, 15];
    case "negatives":
      return [17];
    case "full":
    default:
      return all;
  }
}

/**
 * Streak calendar: consecutive Denver dates with ≥1 counted submission.
 * Multi same-day counts as one streak day. Gap of one missed date breaks streak.
 */
export function computeStreakFromDates(dateKeysSortedUnique) {
  const dates = [...new Set((dateKeysSortedUnique || []).filter(Boolean))].sort();
  if (!dates.length) return { current: 0, longest: 0, segments: [] };
  let longest = 1;
  let current = 1;
  const segments = [[dates[0]]];
  for (let i = 1; i < dates.length; i += 1) {
    const prev = dates[i - 1];
    const cur = dates[i];
    const expected = addDaysToDateKey(prev, 1);
    if (cur === expected) {
      current += 1;
      segments[segments.length - 1].push(cur);
      longest = Math.max(longest, current);
    } else {
      current = 1;
      segments.push([cur]);
    }
  }
  return { current, longest, segments, dates };
}

export function buildRunContext(caseName, { runDate = null } = {}) {
  if (!VALID_CASES.includes(caseName)) {
    throw new Error(`Unknown case "${caseName}". Valid: ${VALID_CASES.join(", ")}`);
  }
  const day = runDate || new Date().toISOString().slice(0, 10);
  const weekDates = buildWeekDates(WEEK_ANCHOR, 7);
  const batchKey = `${ATHWF_PREFIX}${day}|SC-ATHLETE-WF|${caseName}`;
  const weekName = `${ATHWF_PREFIX}${day}|${caseName}|WEEK`;
  assertAthwfLabel(weekName, "weekName");
  assertAthwfLabel(batchKey, "batchKey");

  const submissionPlan = [
      { tag: "same-day-a", date: weekDates[0], shots: 50, mode: "Simple Total", review: "Count It" },
      { tag: "same-day-b", date: weekDates[0], shots: 25, mode: "Simple Total", review: "Count It" },
      { tag: "day-2", date: weekDates[1], shots: 100, mode: "Simple Total", review: "Count It" },
      { tag: "day-3", date: weekDates[2], shots: 75, mode: "Simple Total", review: "Count It" },
      { tag: "miss-gap", date: weekDates[4], shots: 40, mode: "Simple Total", review: "Count It" },
      { tag: "backdated", date: weekDates[3], shots: 60, mode: "Simple Total", review: "Count It" },
      { tag: "day-6", date: weekDates[5], shots: 80, mode: "Simple Total", review: "Count It" },
    ];
    // mode is expectation only — Submission Stat Mode is a formula (Shot Total → Simple Total).

  return {
    caseName,
    enrollmentId: GATED_ENROLLMENT_ID,
    athleteId: GATED_ATHLETE_ID,
    programInstanceId: PROGRAM_INSTANCE_ID,
    gradeBandId: GRADE_BAND_5_6_ID,
    weekAnchor: WEEK_ANCHOR,
    weekStart: weekDates[0],
    weekEnd: weekDates[6],
    weekDates,
    weekName,
    batchKey,
    submissionPlan,
    safety: {
      prefix: ATHWF_PREFIX,
      gatedEnrollmentOnly: GATED_ENROLLMENT_ID,
      noEmail: true,
      noFormulaWrites: true,
      noSeasonSimulation: true,
      noScPwE2eApply: true,
    },
  };
}

export function buildDryRunPlan(ctx) {
  const uniqueDates = [...new Set(ctx.submissionPlan.map((s) => s.date))].sort();
  const streak = computeStreakFromDates(uniqueDates);
  return {
    mode: "dry-run",
    harness: "SC-ATHLETE-WF-001",
    case: ctx.caseName,
    enrollmentId: ctx.enrollmentId,
    weekName: ctx.weekName,
    weekDates: ctx.weekDates,
    submissionCount: ctx.submissionPlan.length,
    uniqueActivityDates: uniqueDates.length,
    streakExpectation: streak,
    creates: [
      "Weeks (ATHWF| labeled)",
      "Weekly Athlete Summary",
      `${ctx.submissionPlan.length} Submissions`,
      "Video Feedback (disposable)",
      "Homework Completions (disposable satisfactory)",
    ],
    neverCreates: [
      "Email Handoff Queue",
      "Communications Hub send",
      "Resend / Make / Gmail",
      "Real athlete enrollments",
      "Operational Weeks (non-ATHWF)",
    ],
    stages: [
      { id: 1, name: "enrollment", planned: true },
      { id: 2, name: "week-was", planned: true },
      { id: 3, name: "submissions", planned: true },
      { id: 4, name: "submission-variants", planned: true },
      { id: 5, name: "submission-xp-verify", planned: true },
      { id: 6, name: "assets", planned: ctx.caseName === "full" || ctx.caseName === "homework-video" },
      { id: 7, name: "asset-routing", planned: ctx.caseName === "full" || ctx.caseName === "homework-video" },
      { id: 8, name: "homework-dedupe", planned: ctx.caseName === "full" || ctx.caseName === "homework-video" },
      { id: 9, name: "homework-xp", planned: ctx.caseName === "full" || ctx.caseName === "homework-video" },
      { id: 10, name: "video-xp", planned: ctx.caseName === "full" || ctx.caseName === "homework-video" },
      { id: 11, name: "streaks", planned: ctx.caseName === "full" || ctx.caseName === "streaks-levels" },
      { id: 12, name: "streak-xp", planned: ctx.caseName === "full" || ctx.caseName === "streaks-levels" },
      { id: 13, name: "levels", planned: ctx.caseName === "full" || ctx.caseName === "streaks-levels" },
      { id: 14, name: "was-values", planned: ctx.caseName === "full" || ctx.caseName === "was" },
      { id: 15, name: "xp-event-fields", planned: true },
      { id: 16, name: "replay-dedupe", planned: true },
      { id: 17, name: "negatives", planned: ctx.caseName === "full" || ctx.caseName === "negatives" },
    ],
    safety: ctx.safety,
  };
}

export function buildNegativeCaseMatrix() {
  return [
    {
      id: "NEG-01",
      name: "missing-enrollment",
      stage: 17,
      expected: "010/005 skip or error; no orphan XP",
      harnessAction: "plan-only",
      severityIfBroken: "P0",
    },
    {
      id: "NEG-02",
      name: "missing-week",
      stage: 17,
      expected: "031/005 fail closed or skip without inventing Week",
      harnessAction: "plan-only",
      severityIfBroken: "P0",
    },
    {
      id: "NEG-03",
      name: "invalid-asset-destination",
      stage: 17,
      expected: "020/112 skip or error; no HC/VF create",
      harnessAction: "plan-only",
      severityIfBroken: "P1",
    },
    {
      id: "NEG-04",
      name: "duplicate-submission-replay",
      stage: 17,
      expected: "010 skip/repair; same Source Key; no second XP",
      harnessAction: "apply-poll",
      severityIfBroken: "P0",
    },
    {
      id: "NEG-05",
      name: "incomplete-homework",
      stage: 17,
      expected: "065 does not award HOMEWORK_XP when not satisfactory",
      harnessAction: "apply-poll",
      severityIfBroken: "P1",
    },
    {
      id: "NEG-06",
      name: "ineligible-perfect-week",
      stage: 17,
      expected: "057 does not set Eligible; no 058/059 award",
      harnessAction: "plan-only (SC-PW-E2E owns live PW)",
      severityIfBroken: "P1",
    },
    {
      id: "NEG-07",
      name: "inactive-enrollment",
      stage: 17,
      expected: "writers skip; no XP against inactive enrollment",
      harnessAction: "plan-only (do not deactivate gated enrollment)",
      severityIfBroken: "P0",
    },
    {
      id: "NEG-08",
      name: "outside-season-window",
      stage: 17,
      expected: "future Activity Date → Count This Submission? = 0; no counted XP",
      harnessAction: "offline-eval",
      severityIfBroken: "P1",
    },
  ];
}

export function makeCheck({ id, expected, actual, pass, stage = null, notes = null }) {
  return {
    id,
    stage,
    expected,
    actual,
    pass: Boolean(pass),
    status: pass ? "PASS" : "FAIL",
    notes,
  };
}

export function evaluateXpEventShape(xp, {
  sourceKey,
  enrollmentId,
  activityDateKey = null,
  bucketContains = null,
}) {
  const f = xp?.fields || xp || {};
  const checks = [];
  const actualKey = String(f["Source Key"] || "");
  checks.push(
    makeCheck({
      id: "xp.source_key",
      expected: sourceKey,
      actual: actualKey,
      pass: actualKey === sourceKey,
      stage: 15,
    })
  );
  const enr = Array.isArray(f.Enrollment)
    ? f.Enrollment.map((x) => x.id || x)
    : [];
  checks.push(
    makeCheck({
      id: "xp.enrollment",
      expected: enrollmentId,
      actual: enr,
      pass: enr.includes(enrollmentId),
      stage: 15,
    })
  );
  if (activityDateKey) {
    const ad = String(f["XP Activity Date"] || "").slice(0, 10);
    checks.push(
      makeCheck({
        id: "xp.activity_date",
        expected: activityDateKey,
        actual: ad,
        pass: ad === activityDateKey,
        stage: 15,
      })
    );
  }
  if (bucketContains) {
    const bucket = String(f["XP Bucket"] || f["XP Source"] || "");
    checks.push(
      makeCheck({
        id: "xp.bucket_or_source",
        expected: `contains ${bucketContains}`,
        actual: bucket,
        pass: bucket.toLowerCase().includes(String(bucketContains).toLowerCase()),
        stage: 15,
      })
    );
  }
  const active = f["Active?"];
  checks.push(
    makeCheck({
      id: "xp.active",
      expected: true,
      actual: active,
      pass: active === true || active === 1,
      stage: 15,
    })
  );
  return checks;
}

export function evaluateWasSnapshot(was, expectations) {
  const f = was?.fields || was || {};
  const num = (name) => {
    const v = f[name];
    if (typeof v === "number") return v;
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const checks = [];
  if (expectations.daysLogged != null) {
    checks.push(
      makeCheck({
        id: "was.days_logged",
        stage: 14,
        expected: expectations.daysLogged,
        actual: num("Days Logged This Week"),
        pass: num("Days Logged This Week") === expectations.daysLogged,
      })
    );
  }
  if (expectations.minShots != null) {
    const shots = num("Shots This Week") ?? num("Total Shots This Week");
    checks.push(
      makeCheck({
        id: "was.shots_min",
        stage: 14,
        expected: `>= ${expectations.minShots}`,
        actual: shots,
        pass: shots != null && shots >= expectations.minShots,
      })
    );
  }
  if (expectations.summaryStatusIncludes) {
    const status = String(f["Summary Calculation Status"] || f["Calculation Status"] || "");
    checks.push(
      makeCheck({
        id: "was.summary_status",
        stage: 14,
        expected: expectations.summaryStatusIncludes,
        actual: status,
        pass: status.toLowerCase().includes(String(expectations.summaryStatusIncludes).toLowerCase()),
        notes: status ? null : "Field may be named differently — treat empty as BLOCKED not FAIL in live report",
      })
    );
  }
  return checks;
}

export function buildDefect({
  severity,
  stage,
  title,
  steps,
  expected,
  actual,
  likelyCause,
  recommendedFix,
  fixOwner,
}) {
  return {
    severity,
    workflowStage: stage,
    title,
    reproductionSteps: steps,
    expectedResult: expected,
    actualResult: actual,
    likelyCause,
    recommendedFix,
    fixOwner,
  };
}

export function saveManifest(manifest, path = MANIFEST_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return path;
}

export function loadManifest(path = MANIFEST_PATH) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeEvidence(report, outPath = null) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "").replace("Z", "");
  const path =
    outPath ||
    resolve(EVIDENCE_DIR, `${report.mode || "run"}-${report.case || "case"}-${stamp}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2) + "\n", "utf8");
  return path;
}

export async function verifyGatedEnrollmentActive(token, baseId, enrollmentId = GATED_ENROLLMENT_ID) {
  let row;
  try {
    row = await getRecord(token, baseId, TABLES.enrollments, enrollmentId);
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      throw new Error(
        `Gated enrollment ${enrollmentId} is not visible with this PAT (MRW-I04 class). ` +
          "Use a token with Enrollments read; live --apply remains BLOCKED."
      );
    }
    throw err;
  }
  if (!row.fields?.["Active?"]) {
    throw new Error(`Gated enrollment ${enrollmentId} is not Active?`);
  }
  return row;
}

export async function fetchXpBySourceKey(token, baseId, sourceKey) {
  return listRecords(token, baseId, TABLES.xpEvents, {
    filterByFormula: `{Source Key}="${sourceKey}"`,
    fields: [
      "Source Key",
      "XP Points",
      "XP Bucket",
      "XP Source",
      "Active?",
      "XP Activity Date",
      "Enrollment",
      "Week",
    ],
    maxRecords: 10,
  });
}

export async function createDisposableFixture(token, baseId, ctx) {
  await verifyGatedEnrollmentActive(token, baseId, ctx.enrollmentId);

  const created = {
    weekId: null,
    wasId: null,
    submissionIds: [],
    submissionMeta: [],
    videoId: null,
    homeworkId: null,
    incompleteHomeworkId: null,
    batchKey: ctx.batchKey,
    weekName: ctx.weekName,
    enrollmentId: ctx.enrollmentId,
  };

  try {
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
          Enrollment: [ctx.enrollmentId],
          Week: [created.weekId],
          "Perfect Week Automation Status": "Error",
        },
      },
    ]);
    created.wasId = wasRes.records[0].id;

    for (const plan of ctx.submissionPlan) {
      // Submission Stat Mode is a formula (Shot Total → Simple Total). Do not write it.
      const res = await createRecords(token, baseId, TABLES.submissions, [
        {
          fields: {
            Enrollment: [ctx.enrollmentId],
            Athlete: [ctx.athleteId],
            Week: [created.weekId],
            "Weekly Athlete Summary": [created.wasId],
            "Activity Date": denverNoon(plan.date),
            "Shot Total": plan.shots,
            "Duplicate Review Status": plan.review,
            "Daily Email Subject": `${ctx.batchKey}|${plan.tag}`,
          },
        },
      ]);
      const id = res.records[0].id;
      created.submissionIds.push(id);
      created.submissionMeta.push({ id, ...plan, modeImplied: "Simple Total (formula from Shot Total)" });
    }

    const videoRes = await createRecords(token, baseId, TABLES.videoFeedback, [
      {
        fields: {
          Enrollment: [ctx.enrollmentId],
          Submission: [created.submissionIds[0]],
          "Active?": true,
          "Award Status": "Pending",
          "Video Feedback Key": `${ctx.batchKey}|VF1`,
          "Video URL or Drive Link": `https://example.invalid/athwf/${ctx.batchKey}`,
        },
      },
    ]);
    created.videoId = videoRes.records[0].id;

    const hcRes = await createRecords(token, baseId, TABLES.homeworkCompletions, [
      {
        fields: {
          Enrollment: [ctx.enrollmentId],
          Week: [created.weekId],
          "Satisfactory?": true,
          "Review Complete": true,
          "Coach Feedback": `${ctx.batchKey}|HC-satisfactory-skip-probe`,
        },
      },
    ]);
    created.homeworkId = hcRes.records[0].id;
    created.homeworkEligibility = evaluateHomework065Eligibility({
      satisfactory: true,
      reviewComplete: true,
      reconcileNeeded: false,
      totalHomeworkXpAwarded: 0,
      phaLinked: false,
      hasSubmissionLink: false,
    });

    const incompleteHcRes = await createRecords(token, baseId, TABLES.homeworkCompletions, [
      {
        fields: {
          Enrollment: [ctx.enrollmentId],
          Week: [created.weekId],
          "Satisfactory?": false,
          "Review Complete": false,
        },
      },
    ]);
    created.incompleteHomeworkId = incompleteHcRes.records[0].id;

    saveManifest({
      harness: "SC-ATHLETE-WF-001",
      createdAt: new Date().toISOString(),
      ...created,
    });

    return created;
  } catch (err) {
    saveManifest({
      harness: "SC-ATHLETE-WF-001",
      createdAt: new Date().toISOString(),
      partial: true,
      error: err.message,
      ...created,
    });
    err.partialCreated = created;
    throw err;
  }
}

export async function pollSubmissionXp(token, baseId, submissionIds, { timeoutMs = POLL_TIMEOUT_MS } = {}) {
  const started = Date.now();
  const results = {};
  while (Date.now() - started < timeoutMs) {
    let allSeen = true;
    for (const id of submissionIds) {
      if (results[id]?.count > 0) continue;
      const rows = await fetchXpBySourceKey(token, baseId, submissionXpKey(id));
      results[id] = {
        count: rows.length,
        ids: rows.map((r) => r.id),
        points: rows.map((r) => r.fields?.["XP Points"]),
        active: rows.map((r) => r.fields?.["Active?"]),
      };
      if (!rows.length) allSeen = false;
    }
    if (allSeen) break;
    await sleep(POLL_INTERVAL_MS);
  }
  return results;
}

export async function pollHomeworkXp(token, baseId, hcId, { expectXp = true, timeoutMs = POLL_TIMEOUT_MS } = {}) {
  const started = Date.now();
  let last = { count: 0, ids: [] };
  while (Date.now() - started < timeoutMs) {
    const rows = await fetchXpBySourceKey(token, baseId, homeworkXpKey(hcId));
    last = { count: rows.length, ids: rows.map((r) => r.id), rows };
    if (expectXp && rows.length >= 1) return last;
    if (!expectXp && Date.now() - started > 20000) return last;
    await sleep(POLL_INTERVAL_MS);
  }
  return last;
}

export async function readWasSnapshot(token, baseId, wasId) {
  const row = await getRecord(token, baseId, TABLES.was, wasId);
  return { id: wasId, fields: row.fields || {} };
}

export async function readEnrollmentSnapshot(token, baseId, enrollmentId) {
  const row = await getRecord(token, baseId, TABLES.enrollments, enrollmentId);
  const f = row.fields || {};
  return {
    id: enrollmentId,
    active: f["Active?"],
    lifetimeXp: f["Lifetime XP Earned"] ?? f["Lifetime XP Total"],
    currentLevel: f["Current Level"],
    nextLevel: f["Next Level"],
    currentStreak: f["Current Shooting Streak"],
    gradeBand: f["Grade Band"],
  };
}

export async function verifyNoDuplicateSourceKeys(token, baseId, sourceKeys) {
  const out = [];
  for (const key of sourceKeys) {
    const rows = await fetchXpBySourceKey(token, baseId, key);
    out.push({
      sourceKey: key,
      count: rows.length,
      pass: rows.length <= 1,
      ids: rows.map((r) => r.id),
    });
  }
  return out;
}

export async function cleanupAthwfRecords(token, baseId, manifest) {
  if (!manifest) throw new Error("No manifest — nothing to clean");
  assertAthwfLabel(manifest.weekName || manifest.batchKey, "cleanup manifest label");
  if (manifest.weekId) {
    const weekRow = await getRecord(token, baseId, TABLES.weeks, manifest.weekId);
    assertAthwfLabel(weekRow.fields?.["Week Name"], "Week Name cleanup guard");
  }

  const actions = [];
  const deleteSafe = async (table, ids) => {
    const list = [...new Set((ids || []).filter(Boolean))];
    if (!list.length) return;
    try {
      await deleteRecords(token, baseId, table, list);
      actions.push({ table, deleted: list, status: "deleted" });
    } catch (err) {
      actions.push({
        table,
        attempted: list,
        status: "failed",
        error: err.message,
      });
    }
  };

  const xpIds = [];
  for (const subId of manifest.submissionIds || []) {
    const rows = await fetchXpBySourceKey(token, baseId, submissionXpKey(subId));
    xpIds.push(...rows.map((r) => r.id));
  }
  if (manifest.homeworkId) {
    const rows = await fetchXpBySourceKey(token, baseId, homeworkXpKey(manifest.homeworkId));
    xpIds.push(...rows.map((r) => r.id));
  }
  if (manifest.videoId) {
    const rows = await fetchXpBySourceKey(token, baseId, videoXpKey(manifest.videoId));
    xpIds.push(...rows.map((r) => r.id));
  }

  await deleteSafe(TABLES.xpEvents, [...new Set(xpIds)]);
  await deleteSafe(TABLES.videoFeedback, [manifest.videoId]);
  await deleteSafe(TABLES.homeworkCompletions, [
    manifest.homeworkId,
    manifest.incompleteHomeworkId,
  ]);
  await deleteSafe(TABLES.submissions, manifest.submissionIds);
  await deleteSafe(TABLES.was, [manifest.wasId]);
  await deleteSafe(TABLES.weeks, [manifest.weekId]);

  const failed = actions.filter((a) => a.status === "failed");
  return {
    actions,
    cleanedAt: new Date().toISOString(),
    complete: failed.length === 0,
    refusedOrPartial: failed.length > 0,
    note:
      failed.length === 0
        ? "All manifest deletes succeeded"
        : "Partial cleanup — use MCP or broader PAT for failed tables (often XP Events DELETE 403)",
  };
}

export async function readonlyProbe(token, baseId, ctx) {
  const enrollment = await readEnrollmentSnapshot(token, baseId, ctx.enrollmentId);
  const recentSubs = await listRecords(token, baseId, TABLES.submissions, {
    filterByFormula: `FIND("${ctx.enrollmentId}", ARRAYJOIN({Enrollment}))`,
    fields: ["Activity Date", "Shot Total", "Week", "Enrollment", "Duplicate Review Status"],
    maxRecords: 25,
  });
  return {
    mode: "readonly",
    enrollment,
    recentSubmissionCount: recentSubs.length,
    sampleSubmissionIds: recentSubs.slice(0, 5).map((r) => r.id),
  };
}
