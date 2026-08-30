/**
 * MRW-F07 — weekly email positive-arm harness library.
 * Chain: 118 → 072 → 119 → 074 → 079 (Hub → Resend plane).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requireToken,
  getRecord,
  listRecords,
  updateRecords,
  ROOT,
} from "./airtable-client.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));

export const HARNESS_ID = "MRW-F07";
export const WETEST_PREFIX = "WETEST|";

/** Schmidt / disposable test enrollments (118/119 default exclude unless override). */
export const DISPOSABLE_ENROLLMENT_IDS = new Set([
  "recCyFEPeATOVNlr9",
  "recgP9qZYjAhE7NXm",
]);

export const TABLES = Object.freeze({
  was: "Weekly Athlete Summary",
  queue: "Email Handoff Queue",
  weeks: "Weeks",
  enrollments: "Enrollments",
});

export const WAS_FIELDS = Object.freeze({
  enrollment: "Enrollment",
  week: "Week",
  summaryKey: "Summary Key",
  buildNow: "Build Weekly Email Now?",
  ready: "Weekly Email Ready?",
  sent: "Weekly Email Sent?",
  sendToMake: "Send to Make?",
  subject: "Weekly Email Subject",
  html: "Weekly Email HTML",
  text: "Weekly Email Text",
  payload: "Weekly Email Payload JSON",
  error: "Weekly Email Error",
});

export const QUEUE_FIELDS = Object.freeze({
  handoffKey: "Handoff Key",
  eventType: "Event Type",
  status: "Status",
  payload: "Payload JSON",
});

export const CHAIN_STAGES = Object.freeze([
  { id: "WE-01", automation: "118", label: "Build arm", field: WAS_FIELDS.buildNow },
  { id: "WE-02", automation: "072", label: "Package built", field: WAS_FIELDS.ready },
  { id: "WE-03", automation: "119", label: "Send arm", field: WAS_FIELDS.sendToMake },
  { id: "WE-04", automation: "074", label: "Queue row", table: TABLES.queue },
  { id: "WE-05", automation: "079", label: "Hub dispatch", table: TABLES.queue },
]);

export const EVIDENCE_DIR = resolve(
  ROOT,
  "docs/testing/evidence/mrw-f07-weekly-email"
);

export const MANIFEST_PATH = resolve(
  ROOT,
  "docs/testing/weekly-email/fixtures/_mrw-f07-last.json"
);

export function truthy(value) {
  if (value === true || value === 1) return true;
  if (Array.isArray(value) && value.length) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "checked"].includes(text);
}

export function linkedIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : item?.id)).filter(Boolean);
}

export function buildWeeklyHandoffKey(wasId) {
  return `WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|${wasId}`;
}

export function evaluateChainSnapshot(fields, wasId, queueRows = []) {
  const handoffKey = buildWeeklyHandoffKey(wasId);
  const matchingQueue = queueRows.filter(
    (row) => String(row.fields?.[QUEUE_FIELDS.handoffKey] || "") === handoffKey
  );
  const packageBuilt =
    truthy(fields[WAS_FIELDS.ready]) &&
    Boolean(String(fields[WAS_FIELDS.subject] || "").trim()) &&
    Boolean(fields[WAS_FIELDS.payload] || fields[WAS_FIELDS.html]);

  const stages = [
    {
      id: "WE-01",
      pass: truthy(fields[WAS_FIELDS.buildNow]),
      detail: fields[WAS_FIELDS.buildNow] ? "Build Weekly Email Now? checked" : "not armed",
    },
    {
      id: "WE-02",
      pass: packageBuilt,
      detail: packageBuilt ? "Weekly Email Ready? + package fields" : "package incomplete",
    },
    {
      id: "WE-03",
      pass: truthy(fields[WAS_FIELDS.sendToMake]),
      detail: fields[WAS_FIELDS.sendToMake] ? "Send to Make? checked" : "send not armed",
    },
    {
      id: "WE-04",
      pass: matchingQueue.length > 0,
      detail: matchingQueue.length
        ? `${matchingQueue.length} queue row(s) for ${handoffKey}`
        : "no queue row",
    },
    {
      id: "WE-05",
      pass: matchingQueue.some((row) => {
        const status = String(row.fields?.[QUEUE_FIELDS.status] || "");
        return ["Accepted", "Sent", "Ready"].includes(status);
      }),
      detail: matchingQueue.length
        ? matchingQueue.map((row) => row.fields?.[QUEUE_FIELDS.status]).join(", ")
        : "no dispatch state",
    },
  ];

  return {
    wasId,
    handoffKey,
    weeklyEmailSent: truthy(fields[WAS_FIELDS.sent]),
    summaryKey: String(fields[WAS_FIELDS.summaryKey] || ""),
    stages,
    passed: stages.every((stage) => stage.pass),
    furthestStage: stages.filter((s) => s.pass).length,
  };
}

export function buildDryRunPlan({ wasId, armBuild = false, armSend = false }) {
  const actions = [];
  if (armBuild) {
    actions.push({
      step: "WE-01",
      table: TABLES.was,
      recordId: wasId,
      fields: { [WAS_FIELDS.buildNow]: true },
      expectAutomation: "072",
      expectFields: [WAS_FIELDS.ready, WAS_FIELDS.subject, WAS_FIELDS.payload],
    });
  }
  if (armSend) {
    actions.push({
      step: "WE-03",
      table: TABLES.was,
      recordId: wasId,
      fields: { [WAS_FIELDS.sendToMake]: true },
      expectAutomation: "074",
      expectQueueKey: buildWeeklyHandoffKey(wasId),
    });
  }
  return {
    harness: HARNESS_ID,
    wasId,
    armBuild,
    armSend,
    actions,
    safety: [
      "Disposable enrollment or WETEST| week only unless --force",
      "Weekly Email Sent? must be false",
      "074 production sends require testMode=false — harness does not change automation inputs",
      "Prefer Schmidt enrollment; 119 excludes Schmidt on schedule unless includeSchmidt=true",
    ],
  };
}

export async function loadWasSnapshot(token, baseId, wasId) {
  const fields = Object.values(WAS_FIELDS);
  const was = await getRecord(token, baseId, TABLES.was, wasId);
  const handoffKey = buildWeeklyHandoffKey(wasId);
  const queueRows = await listRecords(token, baseId, TABLES.queue, {
    filterByFormula: `{${QUEUE_FIELDS.handoffKey}} = "${handoffKey.replace(/"/g, '\\"')}"`,
    maxRecords: 5,
    fields: [QUEUE_FIELDS.handoffKey, QUEUE_FIELDS.status, QUEUE_FIELDS.eventType],
  });
  return evaluateChainSnapshot(was.fields || {}, wasId, queueRows);
}

export async function assertDisposableWas(token, baseId, wasId, { force = false } = {}) {
  const was = await getRecord(token, baseId, TABLES.was, wasId);
  const fields = was.fields || {};
  if (truthy(fields[WAS_FIELDS.sent])) {
    throw new Error(`Safety: WAS ${wasId} already has Weekly Email Sent? — pick an unsent row`);
  }
  const summaryKey = String(fields[WAS_FIELDS.summaryKey] || "").trim();
  if (!summaryKey) {
    throw new Error(`Safety: WAS ${wasId} Summary Key unsettled — wait for formulas`);
  }

  const enrollmentIds = linkedIds(fields[WAS_FIELDS.enrollment]);
  const weekIds = linkedIds(fields[WAS_FIELDS.week]);
  let weekName = "";
  if (weekIds[0]) {
    try {
      const week = await getRecord(token, baseId, TABLES.weeks, weekIds[0]);
      weekName = String(week.fields?.Name || week.fields?.["Week Name"] || "");
    } catch {
      /* week name optional */
    }
  }

  const disposableEnrollment = enrollmentIds.some((id) => DISPOSABLE_ENROLLMENT_IDS.has(id));
  const wetestWeek = weekName.startsWith(WETEST_PREFIX);
  if (!force && !disposableEnrollment && !wetestWeek) {
    throw new Error(
      `Safety: WAS ${wasId} is not disposable (enrollment=${enrollmentIds.join(",")}, week=${weekName || weekIds[0] || "?"}). Use --force to override.`,
    );
  }

  return { was, enrollmentIds, weekIds, weekName, disposableEnrollment, wetestWeek };
}

export function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

export async function pollWasChain(token, baseId, wasId, predicate, { timeoutMs = 120000, intervalMs = 4000 } = {}) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    last = await loadWasSnapshot(token, baseId, wasId);
    if (await predicate(last)) return last;
    await sleep(intervalMs);
  }
  const err = new Error(`Timeout waiting for WAS ${wasId} chain condition`);
  err.lastSnapshot = last;
  throw err;
}

export async function applyBuildArm(token, baseId, wasId) {
  await updateRecords(token, baseId, TABLES.was, [
    { id: wasId, fields: { [WAS_FIELDS.buildNow]: true } },
  ]);
  return pollWasChain(
    token,
    baseId,
    wasId,
    (snap) => snap.stages.find((s) => s.id === "WE-02")?.pass === true,
  );
}

export async function applySendArm(token, baseId, wasId) {
  const before = await loadWasSnapshot(token, baseId, wasId);
  if (!before.stages.find((s) => s.id === "WE-02")?.pass) {
    throw new Error("072 package not ready — run build arm first or wait for Weekly Email Ready?");
  }
  await updateRecords(token, baseId, TABLES.was, [
    { id: wasId, fields: { [WAS_FIELDS.sendToMake]: true } },
  ]);
  return pollWasChain(
    token,
    baseId,
    wasId,
    (snap) => snap.stages.find((s) => s.id === "WE-04")?.pass === true,
  );
}

export function evaluateOfflineContract() {
  return {
    harness: HARNESS_ID,
    chain: "118 → 072 → 119 → 074 → 079 → Communications Hub → Resend",
    handoffKeyPattern: "WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|{wasId}",
    githubVersions: { "072": "v4.8", "119": "v1.7", "074": "v3.3", "079": "v2.5" },
    sentOwnership: "Hub/Resend writeback — 074/079 do not set Weekly Email Sent?",
    pass: true,
  };
}
