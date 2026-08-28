/**
 * SC-PW-E2E — disposable Perfect Week end-to-end harness library.
 * Reuses gated Schmidt enrollment + established field names; never writes formula outputs.
 */
import { createRequire } from "node:module";
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
const { evaluateWasVideoRequirementMet } = require(
  "../../../lib/config-selection/perfect-week-video-minimum.js"
);

const HERE = dirname(fileURLToPath(import.meta.url));

export const PWTEST_PREFIX = "PWTEST|";
export const PROGRAM_INSTANCE_ID = "rec5mEM0YPqPqq0hZ";
export const GOAL_5000_ID = "recQJRxpaBgwN42Un";
export const PERFECT_WEEK_RULE_KEY = "PERFECT_WEEK";
export const EXPECTED_XP_AMOUNT = 100;
export const SHOTS_PER_DAY = 715;
export const POLL_INTERVAL_MS = 8000;
export const POLL_TIMEOUT_MS = 600000;

export const TABLES = Object.freeze({
  weeks: "Weeks",
  was: "Weekly Athlete Summary",
  submissions: "Submissions",
  videoFeedback: "Video Feedback",
  enrollments: "Enrollments",
  unlocks: "Athlete Achievement Unlocks",
  achievements: "Achievements",
  xpEvents: "XP Events",
  xpRewardRules: "XP Reward Rules",
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
  homeworkAssigned: "Perfect Week Homework Assigned Count",
  eligible: "Perfect Week Eligible?",
  unlock: "Perfect Week Unlock",
  daysLogged: "Days Logged This Week",
  weekEnd: "Week End Date",
});

export const MANIFEST_PATH = resolve(
  ROOT,
  "docs/testing/perfect-week/fixtures/_sc-pw-e2e-last.json"
);

/** @type {Map<string, { id: string, fields: Set<string> }> | null} */
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

export function resolveUnlockSourceKeyField(schema) {
  const unlockFields = schema.get(TABLES.unlocks)?.fields;
  if (!unlockFields) return null;
  if (unlockFields.has("Source Key")) return "Source Key";
  if (unlockFields.has("Milestone Source Key")) return "Milestone Source Key";
  return null;
}

export function resolveUnlockNotesField(schema) {
  const unlockFields = schema.get(TABLES.unlocks)?.fields;
  if (!unlockFields) return null;
  if (unlockFields.has("Notes")) return "Notes";
  if (unlockFields.has("Coach Note")) return "Coach Note";
  return null;
}

function formatAirtableError(err) {
  const body = err.data?.error;
  if (body?.type === "UNKNOWN_FIELD_NAME") {
    return `Unknown field "${body.message?.match(/"([^"]+)"/)?.[1] || "?"}" — schema drift or PAT field scope too narrow`;
  }
  if (err.status === 403) {
    return "PAT forbidden — token may lack table read/write or schema.bases:read";
  }
  return err.message || String(err);
}

/**
 * Fail fast before --apply when PAT permissions or production schema are insufficient.
 */
export async function preflightApplyAccess(token, baseId, caseName) {
  const failures = [];
  let schema;

  try {
    schema = await loadSchemaIndex(token, baseId);
  } catch (err) {
    const hint = formatAirtableError(err);
    const blocked = new Error(
      `SC-PW-E2E preflight: cannot read base schema. ${hint}. ` +
        "Use Mike's production PAT with schema.bases:read and write access to disposable tables."
    );
    blocked.stage = "preflight";
    throw blocked;
  }

  for (const tableName of Object.values(TABLES)) {
    if (!schema.has(tableName)) failures.push(`Missing table: ${tableName}`);
  }

  const submissionFields = schema.get(TABLES.submissions)?.fields || new Set();
  for (const fieldName of [
    "Perfect Week Test Record?",
    "Perfect Week Test Submitted At",
    "Perfect Week Manual Exception?",
    "Enrollment",
    "Week",
    "Activity Date",
    "Shot Total",
    "Weekly Athlete Summary",
  ]) {
    if (!submissionFields.has(fieldName)) {
      failures.push(`Submissions missing field: ${fieldName}`);
    }
  }

  const unlockSourceField = resolveUnlockSourceKeyField(schema);
  if (caseName === "trigger-only" && !unlockSourceField) {
    failures.push(
      "Athlete Achievement Unlocks missing Source Key or Milestone Source Key (trigger-only case)"
    );
  }

  try {
    await verifyGatedEnrollmentActive(token, baseId, GATED_ENROLLMENT_ID);
  } catch (err) {
    failures.push(err.message);
  }

  const anchor = CASE_WEEK_ANCHORS[caseName];
  if (anchor) {
    const weekDates = buildRequiredWeekDates(anchor, 7);
    const todayKey = getDateKeyAmericaDenver(new Date());
    const futureDates = weekDates.filter((dateKey) => dateKey > todayKey);
    if (futureDates.length) {
      failures.push(
        `Case week anchor ${anchor} includes future Activity Dates (${futureDates.join(", ")}). ` +
          "Production formulas set Count This Submission? = 0 for future dates; update CASE_WEEK_ANCHORS to a fully past week."
      );
    }
  }

  if (failures.length) {
    const err = new Error(`SC-PW-E2E preflight failed:\n- ${failures.join("\n- ")}`);
    err.stage = "preflight";
    err.diagnostic = { failures, caseName, unlockSourceField };
    throw err;
  }

  return {
    schema,
    unlockSourceField: unlockSourceField || "Source Key",
    unlockNotesField: resolveUnlockNotesField(schema),
  };
}

// Past Denver week anchors only — future Activity Dates keep Count This Submission? = 0.
// Use July 2026 windows to avoid overlap with prior PWTEST runs on 2026-08-02 week.
const CASE_WEEK_ANCHORS = Object.freeze({
  qualifying: "2026-07-06",
  "nonqualifying-video": "2026-07-13",
  "trigger-only": "2026-07-20",
});

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function assertPwtestLabel(label, context = "record") {
  const text = String(label || "").trim();
  if (!text.startsWith(PWTEST_PREFIX)) {
    throw new Error(`Safety: ${context} must start with ${PWTEST_PREFIX} (got "${text}")`);
  }
  return text;
}

export function denverNoon(dateKey) {
  return `${dateKey}T12:00:00.000-06:00`;
}

export function buildRunContext(caseName) {
  const runAt = new Date().toISOString();
  const runDate = runAt.slice(0, 10);
  const runSuffix = runAt.replace(/[:.]/g, "").slice(11, 17);
  const anchor = CASE_WEEK_ANCHORS[caseName];
  if (!anchor) throw new Error(`Unknown case: ${caseName}`);
  const weekDates = buildRequiredWeekDates(anchor, 7);
  const batchKey = `${PWTEST_PREFIX}${runDate}|SC-PW-E2E|${caseName}`;
  const weekName = `${batchKey}|WEEK|${runSuffix}`;
  const notesLabel = `${batchKey}|${runSuffix}`;
  return {
    caseName,
    runAt,
    runDate,
    runSuffix,
    batchKey,
    weekName,
    notesLabel,
    weekStart: weekDates[0],
    weekEnd: weekDates[6],
    weekDates,
    enrollmentId: GATED_ENROLLMENT_ID,
    programInstanceId: PROGRAM_INSTANCE_ID,
    goalRecordId: GOAL_5000_ID,
    sourceKey: null,
  };
}

export function attachSourceKey(ctx) {
  ctx.sourceKey = buildPerfectWeekSourceKey(ctx.enrollmentId, ctx.weekId);
  return ctx.sourceKey;
}

export function saveManifest(manifest, path = MANIFEST_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}

export function loadManifest(path = MANIFEST_PATH) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function buildDryRunPlan(ctx, { videoCount = 3 } = {}) {
  return {
    mode: "dry-run",
    case: ctx.caseName,
    batchKey: ctx.batchKey,
    weekName: ctx.weekName,
    weekDates: ctx.weekDates,
    enrollmentId: ctx.enrollmentId,
    goalRecordId: ctx.goalRecordId,
    submissionCount: 7,
    videoCount,
    shotsPerDay: SHOTS_PER_DAY,
    wouldCreate: [
      { table: TABLES.weeks, label: ctx.weekName },
      { table: TABLES.was, note: "linked Enrollment + Week + Goal" },
      { table: TABLES.submissions, count: 7 },
      { table: TABLES.videoFeedback, count: videoCount },
    ],
    safety: {
      pwtestPrefix: PWTEST_PREFIX,
      gatedEnrollmentOnly: GATED_ENROLLMENT_ID,
      noFormulaWrites: true,
      noEmailArms: true,
    },
  };
}

async function fetchAchievementId(token, baseId) {
  const rows = await listRecords(token, baseId, TABLES.achievements, {
    filterByFormula: `{Reward Rule Key}='${PERFECT_WEEK_RULE_KEY}'`,
    maxRecords: 5,
    fields: ["Reward Rule Key", "Achievement Name", "Active?"],
  });
  const active = rows.filter((r) => r.fields?.["Active?"] === true);
  if (active.length !== 1) {
    throw new Error(
      `Expected exactly 1 active PERFECT_WEEK achievement, found ${active.length}`
    );
  }
  return active[0].id;
}

async function fetchXpRewardAmount(token, baseId) {
  const rows = await listRecords(token, baseId, TABLES.xpRewardRules, {
    filterByFormula: `AND({Rule Key}='${PERFECT_WEEK_RULE_KEY}',{Active?}=1)`,
    maxRecords: 5,
    fields: ["Rule Key", "XP Amount", "Active?"],
  });
  if (rows.length !== 1) {
    throw new Error(`Expected exactly 1 active PERFECT_WEEK XP rule, found ${rows.length}`);
  }
  const amount = Number(rows[0].fields?.["XP Amount"]);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid PERFECT_WEEK XP Amount on XP Reward Rules");
  }
  return amount;
}

export async function verifyGatedEnrollmentActive(token, baseId, enrollmentId) {
  let row;
  try {
    row = await getRecord(token, baseId, TABLES.enrollments, enrollmentId);
  } catch (error) {
    if (error.status === 404 || /not visible/i.test(error.message)) {
      throw new Error(
        `Gated enrollment ${enrollmentId} is not visible with this PAT. ` +
          "SC-PW-E2E --apply must run with Mike's production token (Enrollments read/write)."
      );
    }
    throw error;
  }
  if (!truthy(row.fields?.["Active?"])) {
    throw new Error(`Gated enrollment ${enrollmentId} is not Active?`);
  }
  return row;
}

export async function createDisposableFixture(token, baseId, ctx, { videoCount = 3 } = {}) {
  assertPwtestLabel(ctx.weekName, "Week Name");
  await verifyGatedEnrollmentActive(token, baseId, ctx.enrollmentId);

  const created = {
    enrollmentId: ctx.enrollmentId,
    weekId: null,
    wasId: null,
    submissionIds: [],
    videoIds: [],
    unlockId: null,
    xpEventIds: [],
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
  ctx.weekId = created.weekId;
  attachSourceKey(ctx);
  console.log(`created Week ${created.weekId} (${ctx.weekName})`);

  const wasRes = await createRecords(token, baseId, TABLES.was, [
    {
      fields: {
        Enrollment: [ctx.enrollmentId],
        Week: [created.weekId],
        "Goal Record": [ctx.goalRecordId],
        [WAS_FIELDS.automationStatus]: "Pending",
      },
    },
  ]);
  created.wasId = wasRes.records[0].id;
  console.log(`created WAS ${created.wasId}`);

  for (const dateKey of ctx.weekDates) {
    const subRes = await createRecords(token, baseId, TABLES.submissions, [
      {
        fields: {
          Enrollment: [ctx.enrollmentId],
          Week: [created.weekId],
          "Activity Date": dateKey,
          "Shot Total": SHOTS_PER_DAY,
          "Perfect Week Test Record?": true,
          "Perfect Week Test Submitted At": denverNoon(dateKey),
          "Perfect Week Manual Exception?": true,
          "Weekly Athlete Summary": [created.wasId],
        },
      },
    ]);
    const subId = subRes.records[0].id;
    created.submissionIds.push(subId);
    console.log(`created Submission ${subId} (${dateKey})`);
  }

  await updateRecords(token, baseId, TABLES.was, [
    {
      id: created.wasId,
      fields: {
        Submissions: created.submissionIds,
        [WAS_FIELDS.automationStatus]: "Pending",
      },
    },
  ]);

  const videoTarget = Math.min(videoCount, created.submissionIds.length);
  for (let i = 0; i < videoTarget; i += 1) {
    const vfRes = await createRecords(token, baseId, TABLES.videoFeedback, [
      {
        fields: {
          Enrollment: [ctx.enrollmentId],
          Submission: [created.submissionIds[i]],
        },
      },
    ]);
    const vfId = vfRes.records[0].id;
    created.videoIds.push(vfId);
    console.log(`created Video Feedback ${vfId}`);
  }

  await updateRecords(token, baseId, TABLES.was, [
    { id: created.wasId, fields: { [WAS_FIELDS.automationStatus]: "Pending" } },
  ]);

  return created;
}

export async function createTriggerOnlyUnlock(token, baseId, ctx, schemaHints = {}) {
  assertPwtestLabel(ctx.weekName, "Week Name");
  await verifyGatedEnrollmentActive(token, baseId, ctx.enrollmentId);

  const unlockSourceField =
    schemaHints.unlockSourceField || resolveUnlockSourceKeyField(schemaHints.schema || new Map()) || "Source Key";
  const unlockNotesField = schemaHints.unlockNotesField ?? resolveUnlockNotesField(schemaHints.schema || new Map());

  const created = {
    enrollmentId: ctx.enrollmentId,
    weekId: null,
    wasId: null,
    submissionIds: [],
    videoIds: [],
    unlockId: null,
    xpEventIds: [],
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
  ctx.weekId = created.weekId;
  attachSourceKey(ctx);
  console.log(`created Week ${created.weekId} (${ctx.weekName})`);

  const achievementId = await fetchAchievementId(token, baseId);
  const sourceKey = ctx.sourceKey;

  const unlockFields = {
    Enrollment: [ctx.enrollmentId],
    Week: [created.weekId],
    Achievement: [achievementId],
    "Active?": true,
    "XP Award Status": "Pending",
    [unlockSourceField]: sourceKey,
  };
  if (unlockNotesField) {
    unlockFields[unlockNotesField] = `${ctx.notesLabel}|trigger-only`;
  }

  const unlockRes = await createRecords(token, baseId, TABLES.unlocks, [{ fields: unlockFields }]);
  created.unlockId = unlockRes.records[0].id;
  console.log(`created Athlete Achievement Unlock ${created.unlockId}`);
  return created;
}

export async function readWasSnapshot(token, baseId, wasId) {
  const row = await getRecord(token, baseId, TABLES.was, wasId);
  const f = row.fields || {};
  return {
    id: wasId,
    automationStatus: f[WAS_FIELDS.automationStatus],
    automationError: f[WAS_FIELDS.automationError],
    dailyMet: f[WAS_FIELDS.dailyMet],
    videoCount: Number(f[WAS_FIELDS.videoCount] || 0),
    videoMet: f[WAS_FIELDS.videoMet],
    zoomMeetings: Number(f[WAS_FIELDS.zoomMeetings] || 0),
    zoomAttendance: Number(f[WAS_FIELDS.zoomAttendance] || 0),
    zoomMet: f[WAS_FIELDS.zoomMet],
    homeworkMet: f[WAS_FIELDS.homeworkMet],
    homeworkAssigned: Number(f[WAS_FIELDS.homeworkAssigned] || 0),
    eligible: f[WAS_FIELDS.eligible],
    unlockIds: (f[WAS_FIELDS.unlock] || []).map((x) => x.id || x),
    daysLogged: Number(f[WAS_FIELDS.daysLogged] || 0),
    weekEndDate: f[WAS_FIELDS.weekEnd] || f["Week End Date"],
    lifetimeXpAfterWeek: f["Total XP After Week"],
    xpEarnedThisWeek: f["XP Earned This Week"],
    xpEventIds: (f["XP Events"] || []).map((x) => x.id || x),
  };
}

export async function readSubmissionSnapshots(token, baseId, submissionIds) {
  const rows = [];
  for (const id of submissionIds) {
    const row = await getRecord(token, baseId, TABLES.submissions, id);
    const f = row.fields || {};
    rows.push({
      id,
      activityDate: f["Activity Date"],
      submittedSameDay: f["Submitted Same Day?"],
      countable: f["Perfect Week Countable Submission?"],
      shotTotal: f["Shot Total"],
    });
  }
  return rows;
}

export async function listXpBySourceKey(token, baseId, sourceKey) {
  return listRecords(token, baseId, TABLES.xpEvents, {
    filterByFormula: `{Source Key}='${sourceKey}'`,
    maxRecords: 20,
    fields: [
      "Source Key",
      "XP Points",
      "XP Activity Date",
      "XP Activity Date Source",
      "Achievement Unlock",
      "Active?",
      "Enrollment",
      "Week",
    ],
  });
}

export async function listUnlocksForWeek(
  token,
  baseId,
  enrollmentId,
  weekId,
  { unlockSourceField, unlockNotesField } = {}
) {
  const fields = [
    "Enrollment",
    "Week",
    "Achievement",
    "Active?",
    "XP Award Status",
    "Shot Milestone",
    "XP Events",
  ];
  if (unlockNotesField) fields.push(unlockNotesField);
  if (unlockSourceField) fields.push(unlockSourceField);
  return listRecords(token, baseId, TABLES.unlocks, {
    filterByFormula: `AND(FIND('${enrollmentId}', ARRAYJOIN({Enrollment})), FIND('${weekId}', ARRAYJOIN({Week})))`,
    maxRecords: 20,
    fields,
  });
}

export async function readEnrollmentLifetimeXp(token, baseId, enrollmentId) {
  const row = await getRecord(token, baseId, TABLES.enrollments, enrollmentId);
  return Number(row.fields?.["Lifetime XP Earned"] || row.fields?.["Lifetime XP Total"] || 0);
}

export async function rearm057(token, baseId, wasId) {
  await updateRecords(token, baseId, TABLES.was, [
    { id: wasId, fields: { [WAS_FIELDS.automationStatus]: "Pending" } },
  ]);
}

function cycleLog(stage, snapshot) {
  console.log(
    JSON.stringify({
      stage,
      at: new Date().toISOString(),
      ...snapshot,
    })
  );
}

export async function pollUntil(token, baseId, stage, predicate, { timeoutMs = POLL_TIMEOUT_MS } = {}) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await predicate();
    cycleLog(stage, last);
    if (last.pass) return { ...last, waitedMs: Date.now() - start };
    if (last.fatal) {
      const err = new Error(`Fatal at stage ${stage}: ${last.reason || "unknown"}`);
      err.diagnostic = last;
      throw err;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  const err = new Error(`Timeout at stage ${stage} after ${timeoutMs}ms`);
  err.diagnostic = last;
  throw err;
}

export async function pollSubmissionFormulas(token, baseId, submissionIds) {
  return pollUntil(token, baseId, "submission-formulas", async () => {
    const subs = await readSubmissionSnapshots(token, baseId, submissionIds);
    const distinctDates = new Set(subs.map((s) => String(s.activityDate).slice(0, 10))).size;
    const allSameDay = subs.every((s) => truthy(s.submittedSameDay));
    const allCountable = subs.every((s) => truthy(s.countable));
    const pass = subs.length === 7 && distinctDates === 7 && allSameDay && allCountable;
    return {
      pass,
      subs,
      distinctDates,
      allSameDay,
      allCountable,
      reason: pass
        ? "seven distinct qualifying submissions"
        : `waiting formulas (distinct=${distinctDates}, sameDay=${allSameDay}, countable=${allCountable})`,
    };
  });
}

export async function pollWasFormulas(token, baseId, wasId, expectations) {
  return pollUntil(token, baseId, "was-formulas", async () => {
    const was = await readWasSnapshot(token, baseId, wasId);
    if (was.automationStatus === "Error") {
      return {
        pass: false,
        fatal: true,
        reason: `057 error: ${was.automationError || "unknown"}`,
        was,
      };
    }
    const checks = evaluateWasExpectations(was, expectations);
    const pass = checks.every((c) => c.pass);
    return {
      pass,
      was,
      checks,
      reason: pass ? "WAS formulas match" : checks.filter((c) => !c.pass).map((c) => c.name).join(", "),
    };
  });
}

export function evaluateWasExpectations(was, expectations) {
  const checks = [];
  const add = (name, pass, expected, actual) => checks.push({ name, pass, expected, actual });

  if (expectations.distinctDates != null) {
    add("distinctDates", was.daysLogged >= expectations.distinctDates, expectations.distinctDates, was.daysLogged);
  }
  if (expectations.dailyMet != null) {
    add("dailyMet", truthy(was.dailyMet) === expectations.dailyMet, expectations.dailyMet, was.dailyMet);
  }
  if (expectations.videoCount != null) {
    add("videoCount", was.videoCount === expectations.videoCount, expectations.videoCount, was.videoCount);
  }
  if (expectations.videoMet != null) {
    add("videoMet", Number(was.videoMet) === expectations.videoMet, expectations.videoMet, was.videoMet);
  }
  if (expectations.homeworkMet != null) {
    const hwPass =
      Number(was.homeworkMet) === expectations.homeworkMet ||
      (expectations.homeworkMet === 1 && truthy(was.homeworkMet));
    add("homeworkMet", hwPass, expectations.homeworkMet, was.homeworkMet);
  }
  if (expectations.zoomMet != null) {
    add("zoomMet", Number(was.zoomMet) === expectations.zoomMet, expectations.zoomMet, was.zoomMet);
  }
  if (expectations.eligible != null) {
    add("eligible", Number(was.eligible) === expectations.eligible, expectations.eligible, was.eligible);
  }
  return checks;
}

export async function poll057Ready(token, baseId, wasId) {
  return pollUntil(token, baseId, "057-ready", async () => {
    const was = await readWasSnapshot(token, baseId, wasId);
    if (was.automationStatus === "Error") {
      return { pass: false, fatal: true, reason: was.automationError, was };
    }
    const pass = was.automationStatus === "Ready";
    return {
      pass,
      was,
      reason: pass ? "057 Ready" : `automationStatus=${was.automationStatus}`,
    };
  });
}

function isPendingAwardStatus(status) {
  return status === "Pending" || (typeof status === "object" && status?.name === "Pending");
}

export async function poll058Unlock(token, baseId, ctx, { expectUnlock }) {
  let sawPending = false;
  return pollUntil(token, baseId, "058-unlock", async () => {
    const was = await readWasSnapshot(token, baseId, ctx.wasId);
    const unlocks = await listUnlocksForWeek(token, baseId, ctx.enrollmentId, ctx.weekId);
    const activeUnlocks = unlocks.filter((u) => u.fields?.["Active?"] === true);
    const unlockCount = activeUnlocks.length;
    const linked = was.unlockIds.length;

    if (expectUnlock) {
      const unlock = activeUnlocks[0];
      const status = unlock?.fields?.["XP Award Status"];
      if (isPendingAwardStatus(status)) sawPending = true;
      const pass = unlockCount === 1 && linked === 1;
      return {
        pass,
        was,
        unlockCount,
        linked,
        unlockId: unlock?.id,
        xpAwardStatus: status,
        pendingBefore059: sawPending || isPendingAwardStatus(status),
        sawPending,
        reason: pass ? "one active unlock" : `unlockCount=${unlockCount}, linked=${linked}`,
      };
    }

    const pass = unlockCount === 0 && linked === 0;
    return {
      pass,
      was,
      unlockCount,
      linked,
      reason: pass ? "no unlock" : `unexpected unlockCount=${unlockCount}`,
    };
  });
}

export async function poll059Xp(token, baseId, ctx, { expectXp, xpAmount = EXPECTED_XP_AMOUNT }) {
  return pollUntil(token, baseId, "059-xp", async () => {
    const xpRows = await listXpBySourceKey(token, baseId, ctx.sourceKey);
    const count = xpRows.length;
    if (expectXp) {
      const pass = count === 1 && Number(xpRows[0].fields?.["XP Points"]) === xpAmount;
      return {
        pass,
        xpCount: count,
        xpId: xpRows[0]?.id,
        xpAmount: xpRows[0]?.fields?.["XP Points"],
        xpActivityDate: xpRows[0]?.fields?.["XP Activity Date"],
        xpActivityDateSource: xpRows[0]?.fields?.["XP Activity Date Source"],
        unlockId: (xpRows[0]?.fields?.["Achievement Unlock"] || [])[0]?.id,
        reason: pass ? "one XP event" : `xpCount=${count}`,
      };
    }
    const pass = count === 0;
    return { pass, xpCount: count, reason: pass ? "no XP" : `xpCount=${count}` };
  });
}

export async function pollTriggerOnly059(token, baseId, ctx, unlockId, { xpAmount = EXPECTED_XP_AMOUNT }) {
  return pollUntil(token, baseId, "059-trigger-only", async () => {
    const unlock = await getRecord(token, baseId, TABLES.unlocks, unlockId);
    const uf = unlock.fields || {};
    const milestone = uf["Shot Milestone"];
    const milestoneBlank = !milestone || (Array.isArray(milestone) && milestone.length === 0);
    const status = uf["XP Award Status"];
    const awarded =
      status === "Awarded" || (typeof status === "object" && status?.name === "Awarded");
    const xpRows = await listXpBySourceKey(token, baseId, ctx.sourceKey);
    const achievement = (uf.Achievement || [])[0];
    let rewardRuleKey = null;
    if (achievement?.id) {
      const ach = await getRecord(token, baseId, TABLES.achievements, achievement.id);
      rewardRuleKey = ach.fields?.["Reward Rule Key"];
    }
    const pass =
      milestoneBlank &&
      awarded &&
      xpRows.length === 1 &&
      Number(xpRows[0].fields?.["XP Points"]) === xpAmount &&
      rewardRuleKey === PERFECT_WEEK_RULE_KEY;
    return {
      pass,
      unlockId,
      xpAwardStatus: status,
      milestoneBlank,
      rewardRuleKey,
      xpCount: xpRows.length,
      xpId: xpRows[0]?.id,
      reason: pass ? "059 processed trigger-only unlock" : "waiting for 059",
    };
  });
}

export async function verifyDuplicateRun(token, baseId, ctx) {
  const xpBefore = await listXpBySourceKey(token, baseId, ctx.sourceKey);
  const unlocksBefore = await listUnlocksForWeek(token, baseId, ctx.enrollmentId, ctx.weekId);
  await rearm057(token, baseId, ctx.wasId);
  await sleep(POLL_INTERVAL_MS * 2);
  const was = await readWasSnapshot(token, baseId, ctx.wasId);
  const xpAfter = await listXpBySourceKey(token, baseId, ctx.sourceKey);
  const unlocksAfter = await listUnlocksForWeek(token, baseId, ctx.enrollmentId, ctx.weekId);
  const pass =
    xpBefore.length === xpAfter.length &&
    unlocksBefore.length === unlocksAfter.length &&
    unlocksAfter.filter((u) => u.fields?.["Active?"]).length === 1;
  return {
    pass,
    xpBefore: xpBefore.length,
    xpAfter: xpAfter.length,
    unlockBefore: unlocksBefore.length,
    unlockAfter: unlocksAfter.length,
    automationStatus: was.automationStatus,
    reason: pass ? "no duplicate unlock or XP" : "duplicate detected after re-arm",
  };
}

export async function verifyLifetimeXpUnchanged(token, baseId, enrollmentId, baseline) {
  const current = await readEnrollmentLifetimeXp(token, baseId, enrollmentId);
  return {
    pass: current === baseline,
    baseline,
    current,
    delta: current - baseline,
  };
}

export function buildFailureReport(error, report) {
  return {
    ...report,
    failed: true,
    failurePoint: error.stage || error.diagnostic?.stage || report.stage || "preflight",
    message: error.message,
    diagnostic: error.diagnostic || null,
  };
}

export async function cleanupPwtestRecords(token, baseId, manifest) {
  if (!manifest?.created) throw new Error("Manifest missing created block");
  const weekRow = manifest.created.weekId
    ? await getRecord(token, baseId, TABLES.weeks, manifest.created.weekId).catch(() => null)
    : null;
  if (weekRow) {
    assertPwtestLabel(weekRow.fields?.["Week Name"], "Week Name cleanup guard");
  }

  const deleted = [];
  const sourceKey =
    manifest.sourceKey ||
    buildPerfectWeekSourceKey(manifest.created.enrollmentId, manifest.created.weekId);

  const xpRows = await listXpBySourceKey(token, baseId, sourceKey);
  for (const row of xpRows) {
    await deleteRecords(token, baseId, TABLES.xpEvents, [row.id]);
    deleted.push({ table: TABLES.xpEvents, id: row.id });
    console.log(`deleted XP Event ${row.id}`);
  }

  const schema = await loadSchemaIndex(token, baseId);
  const unlockSourceField = resolveUnlockSourceKeyField(schema);
  const unlockNotesField = resolveUnlockNotesField(schema);

  const unlocks = manifest.created.weekId
    ? await listUnlocksForWeek(
        token,
        baseId,
        manifest.created.enrollmentId,
        manifest.created.weekId,
        { unlockSourceField, unlockNotesField }
      )
    : [];
  for (const row of unlocks) {
    const notes = String(
      (unlockNotesField && row.fields?.[unlockNotesField]) ||
        row.fields?.Notes ||
        row.fields?.["Coach Note"] ||
        ""
    );
    const weekLinked = (row.fields?.Week || [])[0]?.id === manifest.created.weekId;
    if (!weekLinked && !notes.startsWith(PWTEST_PREFIX)) continue;
    await deleteRecords(token, baseId, TABLES.unlocks, [row.id]);
    deleted.push({ table: TABLES.unlocks, id: row.id });
    console.log(`deleted Unlock ${row.id}`);
  }

  for (const id of manifest.created.videoIds || []) {
    await deleteRecords(token, baseId, TABLES.videoFeedback, [id]);
    deleted.push({ table: TABLES.videoFeedback, id });
    console.log(`deleted Video Feedback ${id}`);
  }

  for (const id of manifest.created.submissionIds || []) {
    await deleteRecords(token, baseId, TABLES.submissions, [id]);
    deleted.push({ table: TABLES.submissions, id });
    console.log(`deleted Submission ${id}`);
  }

  if (manifest.created.wasId) {
    await deleteRecords(token, baseId, TABLES.was, [manifest.created.wasId]);
    deleted.push({ table: TABLES.was, id: manifest.created.wasId });
    console.log(`deleted WAS ${manifest.created.wasId}`);
  }

  if (manifest.created.weekId) {
    await deleteRecords(token, baseId, TABLES.weeks, [manifest.created.weekId]);
    deleted.push({ table: TABLES.weeks, id: manifest.created.weekId });
    console.log(`deleted Week ${manifest.created.weekId}`);
  }

  return { deleted, count: deleted.length };
}

export async function resolveXpRewardAmount(token, baseId) {
  return fetchXpRewardAmount(token, baseId);
}

export { requireToken, GATED_ENROLLMENT_ID, buildPerfectWeekSourceKey, evaluateWasVideoRequirementMet, ROOT };
