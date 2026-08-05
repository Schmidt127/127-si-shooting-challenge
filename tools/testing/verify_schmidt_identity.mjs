#!/usr/bin/env node
/**
 * SC-004 Schmidt permanent testing identity verifier (PROD, read-only).
 *
 *   node tools/testing/verify_schmidt_identity.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifySchmidtIdentity,
  STATUSES,
} from "./lib/expected_actual.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const BASE = "appn84sqPw03zEbTT";
const IDS = {
  athlete: "recgqVstObQRzgXJF",
  enrollment: "recgP9qZYjAhE7NXm",
  foundationWeek: "recVDKiYATgzsfpmE",
  scenario: "recPdyfYRFgDtpzQ8",
  homeworkCompletion: "recrBnHbLvDpFyIeO",
  homeworkXp: "rec6xE4V1t0atiTIP",
};

function loadEnvLocal() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2];
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

async function getOne(table, id) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`,
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` } }
  );
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${table}/${id} ${res.status}: ${text.slice(0, 240)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

async function listByFormula(table, filterByFormula, fields) {
  const params = new URLSearchParams();
  params.set("pageSize", "100");
  params.set("filterByFormula", filterByFormula);
  if (fields) for (const f of fields) params.append("fields[]", f);
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`,
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` } }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text).records || [];
}

function safe(promise) {
  return promise.then((r) => r).catch((e) => ({ __error: String(e.message || e), status: e.status }));
}

async function main() {
  loadEnvLocal();
  if (!process.env.AIRTABLE_API_TOKEN) throw new Error("AIRTABLE_API_TOKEN missing");

  const athlete = await getOne("Athletes", IDS.athlete);
  const enrollment = await getOne("Enrollments", IDS.enrollment);
  const foundationWeek = await safe(getOne("Weeks", IDS.foundationWeek));
  const scenario = await safe(getOne("Testing Scenarios", IDS.scenario));
  const homeworkCompletion = await safe(getOne("Homework Completions", IDS.homeworkCompletion));
  const homeworkXp = await safe(getOne("XP Events", IDS.homeworkXp));

  const submissionIds = enrollment.fields?.Submissions || [];
  const wasIds = enrollment.fields?.["Weekly Athlete Summary"] || [];
  const vfIds = enrollment.fields?.["Video Feedback"] || [];
  const zaIds = enrollment.fields?.["Zoom Attendance"] || [];

  const submissions = [];
  for (const id of submissionIds) {
    submissions.push(await getOne("Submissions", id));
  }
  const wasRecords = [];
  for (const id of wasIds) {
    wasRecords.push(await getOne("Weekly Athlete Summary", id));
  }

  const xpBySubmission = [];
  for (const sub of submissions) {
    const key = `SUBMISSION_XP|${sub.id}`;
    const events = await listByFormula("XP Events", `{Source Key}="${key}"`, [
      "Source Key",
      "XP Points",
      "Enrollment",
      "Submission",
    ]);
    xpBySubmission.push({ submissionId: sub.id, sourceKey: key, events });
  }

  const result = verifySchmidtIdentity({
    athlete,
    enrollment,
    foundationWeek: foundationWeek.__error ? null : foundationWeek,
    scenario: scenario.__error ? null : scenario,
    submissions,
    wasRecords,
    xpBySubmission,
    homeworkCompletion: homeworkCompletion.__error ? null : homeworkCompletion,
    homeworkXp: homeworkXp.__error ? null : homeworkXp,
    videoFeedbackIds: vfIds,
    zoomAttendanceIds: zaIds,
    expect: {
      athleteId: IDS.athlete,
      enrollmentId: IDS.enrollment,
      foundationWeekId: IDS.foundationWeek,
      requireActiveEnrollment: true,
      requirePublicStandingsVisibilityPolicy: true,
    },
  });

  const outPath = resolve(
    ROOT,
    "docs/testing/evidence/2026-08-04-sc-003-006-testing-control-center/SCHMIDT-IDENTITY-VERIFY.json"
  );
  mkdirSync(dirname(outPath), { recursive: true });
  const payload = {
    generated_at: new Date().toISOString(),
    base_id: BASE,
    read_only: true,
    ids: IDS,
    live_links: {
      submission_ids: submissionIds,
      was_ids: wasIds,
      video_feedback_ids: vfIds,
      zoom_attendance_ids: zaIds,
      homework_completion_ids: enrollment.fields?.["Homework Completions"] || [],
    },
    foundation_week_fetch: foundationWeek.__error || { ok: true, id: IDS.foundationWeek },
    result,
    policy: {
      hide_schmidt_from_public_standings: false,
      note: "Completion master SC-004: keep Schmidt visible unless Mike changes the decision.",
    },
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        wrote: outPath,
        overall: result.overall,
        counts: result.counts,
        failed: result.checks.filter((c) => c.status === STATUSES.FAIL).map((c) => c.id),
      },
      null,
      2
    )
  );
  if (result.overall === STATUSES.FAIL || result.overall === STATUSES.BLOCKED) process.exitCode = 2;
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
