#!/usr/bin/env node
/**
 * PROD live probe / controlled test harness for Automation 005 v4.1.
 *
 * Requires: AIRTABLE_API_TOKEN (and optional AIRTABLE_BASE_ID).
 *
 * Modes:
 *   node tools/testing/probe_005_program_instance_week_scope.mjs
 *     → read-only inspection of the live Submission + expected Week graph
 *
 *   node tools/testing/probe_005_program_instance_week_scope.mjs --clear-week
 *     → clears Submissions.Week on the live test Submission so 005 can re-assign
 *       (does NOT run the Airtable automation — Mike/OMNI must Test automation 005)
 *
 *   node tools/testing/probe_005_program_instance_week_scope.mjs --verify
 *     → asserts Week == Early Bird after 005 ran
 *
 * Controlled fixture writes for Tests 2–6 require --write-fixtures (explicit).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { matchWeekByActivityDateScoped } from "./lib/005_week_match.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const BASE = process.env.AIRTABLE_BASE_ID || "appn84sqPw03zEbTT";

const LIVE = {
  submissionId: "recElDBcFvuE6jWwc",
  enrollmentId: "recCyFEPeATOVNlr9",
  programInstanceId: "rec5mEM0YPqPqq0hZ",
  expectedWeekId: "recWeVrSabnsYaHc2",
  expectedWeekName: "Early Bird",
  activityDateKey: "2026-08-05",
};

const EVIDENCE_DIR = resolve(
  ROOT,
  "docs/testing/evidence/2026-08-06-005-program-instance-week-scope"
);

function loadEnvLocal() {
  for (const p of [
    resolve(ROOT, ".env.local"),
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env"),
    resolve(ROOT, "tools/airtable/.env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

function linkIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => v?.id || v).filter(Boolean);
}

function firstLink(value) {
  return linkIds(value)[0] || "";
}

function dateKey(value) {
  if (!value) return "";
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return text.slice(0, 10);
}

async function api(path, { method = "GET", body } = {}) {
  const token = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
  if (!token) {
    return { ok: false, status: 0, data: { error: "AIRTABLE_API_TOKEN missing" } };
  }
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 800) };
  }
  return { ok: res.ok, status: res.status, data };
}

async function getRecord(table, id, fields) {
  const qs = new URLSearchParams();
  for (const f of fields) qs.append("fields[]", f);
  return api(`${encodeURIComponent(table)}/${id}?${qs}`);
}

async function listWeeks() {
  const fields = [
    "Week Name",
    "Start Date",
    "End Date",
    "Program Instance",
    "Active Week?",
  ];
  const all = [];
  let offset;
  do {
    const qs = new URLSearchParams({ pageSize: "100" });
    for (const f of fields) qs.append("fields[]", f);
    if (offset) qs.set("offset", offset);
    const res = await api(`${encodeURIComponent("Weeks")}?${qs}`);
    if (!res.ok) return res;
    all.push(...(res.data.records || []));
    offset = res.data.offset;
  } while (offset);
  return { ok: true, status: 200, data: { records: all } };
}

function mapWeekRecord(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    weekName: f["Week Name"] || "",
    startKey: dateKey(f["Start Date"]),
    endKey: dateKey(f["End Date"]),
    programInstanceId: firstLink(f["Program Instance"]),
    isActive:
      f["Active Week?"] === undefined || f["Active Week?"] === null
        ? true
        : Boolean(f["Active Week?"]),
  };
}

async function main() {
  loadEnvLocal();
  const args = new Set(process.argv.slice(2));
  const tokenPresent = Boolean(
    process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN
  );

  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const evidence = {
    generatedAt: new Date().toISOString(),
    baseId: BASE,
    tokenPresent,
    live: LIVE,
    args: [...args],
    steps: [],
  };

  if (!tokenPresent) {
    evidence.blocked = true;
    evidence.blocker =
      "AIRTABLE_API_TOKEN missing in this environment. Offline contracts still pass; live PROD Tests 1–7 require PAT + paste of 005 v4.1.";
    writeFileSync(
      resolve(EVIDENCE_DIR, "PROD-PROBE-BLOCKED.json"),
      JSON.stringify(evidence, null, 2)
    );
    console.error("BLOCKED: AIRTABLE_API_TOKEN missing");
    console.error(
      `Wrote ${resolve(EVIDENCE_DIR, "PROD-PROBE-BLOCKED.json")}`
    );
    process.exitCode = 2;
    return;
  }

  const sub = await getRecord("Submissions", LIVE.submissionId, [
    "Enrollment",
    "Week",
    "Activity Date",
    "Homework Name 1",
    "Homework Name 2",
    "Week Assignment Status",
  ]);
  evidence.steps.push({ step: "load_submission", status: sub.status, ok: sub.ok });

  if (!sub.ok) {
    evidence.error = sub.data;
    writeFileSync(
      resolve(EVIDENCE_DIR, "PROD-PROBE-ERROR.json"),
      JSON.stringify(evidence, null, 2)
    );
    console.error("Failed to load Submission", sub.status, sub.data);
    process.exitCode = 1;
    return;
  }

  const sf = sub.data.fields || {};
  const enrollmentId = firstLink(sf.Enrollment);
  const weekIds = linkIds(sf.Week);
  const activityDateKey = dateKey(sf["Activity Date"]);
  const homework1 = firstLink(sf["Homework Name 1"]);
  const homework2 = firstLink(sf["Homework Name 2"]);

  evidence.submission = {
    id: LIVE.submissionId,
    enrollmentId,
    weekIds,
    activityDateKey,
    homework1,
    homework2,
    weekAssignmentStatus: sf["Week Assignment Status"] || "",
  };

  const enr = await getRecord("Enrollments", enrollmentId || LIVE.enrollmentId, [
    "Program Instance",
    "Active?",
    "School Year",
  ]);
  evidence.steps.push({ step: "load_enrollment", status: enr.status, ok: enr.ok });
  const ef = enr.ok ? enr.data.fields || {} : {};
  const programInstanceId = firstLink(ef["Program Instance"]);
  evidence.enrollment = {
    id: enrollmentId || LIVE.enrollmentId,
    programInstanceId,
    active: ef["Active?"],
    schoolYear: ef["School Year"],
  };

  const weeksRes = await listWeeks();
  evidence.steps.push({
    step: "list_weeks",
    status: weeksRes.status,
    ok: weeksRes.ok,
    count: weeksRes.data?.records?.length,
  });

  const weeks = (weeksRes.data?.records || []).map(mapWeekRecord);
  const dateOverlaps = weeks.filter(
    (w) =>
      w.startKey &&
      w.endKey &&
      w.startKey <= LIVE.activityDateKey &&
      LIVE.activityDateKey <= w.endKey
  );

  evidence.dateOverlappingWeeks = dateOverlaps.map((w) => ({
    id: w.id,
    weekName: w.weekName,
    programInstanceId: w.programInstanceId,
    startKey: w.startKey,
    endKey: w.endKey,
  }));

  const match = matchWeekByActivityDateScoped({
    activityDateKey: activityDateKey || LIVE.activityDateKey,
    submissionProgramInstanceId: programInstanceId || LIVE.programInstanceId,
    weeks,
  });
  evidence.scopedMatch = {
    status: match.status,
    selectedWeekId: match.week?.id || null,
    selectedWeekName: match.week?.weekName || null,
    candidateIds: match.candidates.map((c) => c.id),
    excludedOtherProgramInstanceCount: match.excludedOtherProgramInstanceCount,
  };

  evidence.expectations = {
    enrollmentMatches: enrollmentId === LIVE.enrollmentId,
    programInstanceMatches: programInstanceId === LIVE.programInstanceId,
    activityDateMatches: (activityDateKey || "") === LIVE.activityDateKey,
    scopedSelectsEarlyBird:
      match.status === "match" && match.week?.id === LIVE.expectedWeekId,
  };

  if (args.has("--clear-week")) {
    const patch = await api(
      `${encodeURIComponent("Submissions")}/${LIVE.submissionId}`,
      { method: "PATCH", body: { fields: { Week: [] } } }
    );
    evidence.steps.push({
      step: "clear_week",
      status: patch.status,
      ok: patch.ok,
      data: patch.data,
    });
    console.log(
      "Cleared Week on Submission. Paste 005 v4.1 if needed, then Run Test with recordId=",
      LIVE.submissionId
    );
  }

  if (args.has("--verify")) {
    const ok =
      weekIds.length === 1 &&
      weekIds[0] === LIVE.expectedWeekId &&
      evidence.expectations.scopedSelectsEarlyBird;
    evidence.verify = {
      ok,
      weekIds,
      expectedWeekId: LIVE.expectedWeekId,
    };
    if (!ok) process.exitCode = 1;
  }

  writeFileSync(
    resolve(EVIDENCE_DIR, "PROD-PROBE.json"),
    JSON.stringify(evidence, null, 2)
  );
  console.log(JSON.stringify(evidence, null, 2));
  console.log(`Wrote ${resolve(EVIDENCE_DIR, "PROD-PROBE.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
