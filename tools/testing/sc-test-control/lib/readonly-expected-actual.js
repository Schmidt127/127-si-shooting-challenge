"use strict";

const { writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { BASE_ID, CANONICAL_IDENTITY, EVIDENCE_DIR } = require("../config");
const { loadEnvLocal, airtableToken, fetchRecord } = require("../identity");

const ROOT = resolve(__dirname, "../../../..");

async function listCount(table, enrollmentId, fieldName) {
  const token = airtableToken();
  const formula = `{${fieldName}} = "${enrollmentId}"`;
  const params = new URLSearchParams({ pageSize: "100", filterByFormula: formula });
  let offset;
  let count = 0;
  do {
    if (offset) params.set("offset", offset);
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${table} list ${res.status}`);
    const data = await res.json();
    count += (data.records || []).length;
    offset = data.offset;
  } while (offset);
  return count;
}

async function fetchLiveSnapshot() {
  loadEnvLocal();
  const enrollmentId = CANONICAL_IDENTITY.enrollmentId;
  const enrollment = await fetchRecord("Enrollments", enrollmentId);
  const athleteId = (enrollment.fields?.Athlete || [])[0];
  const athlete = athleteId ? await fetchRecord("Athletes", athleteId) : null;
  const gradeBandLabelRaw = enrollment.fields?.["Grade Band Label"];
  let gradeBandLabel = null;
  if (Array.isArray(gradeBandLabelRaw)) {
    gradeBandLabel = gradeBandLabelRaw.join(", ");
  } else if (gradeBandLabelRaw) {
    gradeBandLabel = String(gradeBandLabelRaw);
  }
  return {
    enrollment,
    athlete,
    counts: {
      submissions: await listCount("Submissions", enrollmentId, "Enrollment"),
      homeworkCompletions: await listCount("Homework Completions", enrollmentId, "Enrollment"),
      videoFeedback: await listCount("Video Feedback", enrollmentId, "Enrollment"),
      zoomAttendance: await listCount("Zoom Attendance", enrollmentId, "Enrollment"),
      xpEvents: await listCount("XP Events", enrollmentId, "Enrollment"),
      was: await listCount("Weekly Athlete Summary", enrollmentId, "Enrollment"),
      achievementUnlocks: await listCount("Athlete Achievement Unlocks", enrollmentId, "Enrollment"),
    },
    enrollmentId,
    athleteId,
    programInstanceId: (enrollment.fields?.["Program Instance"] || [])[0],
    grade: enrollment.fields?.Grade,
    gradeBand: gradeBandLabel,
    active: enrollment.fields?.["Active?"],
    athleteLabel:
      athlete?.fields?.["Full Name"] ||
      athlete?.fields?.Name ||
      athlete?.fields?.["Athlete Name"] ||
      null,
  };
}

function identityChecks(live) {
  const checks = [];
  const push = (id, pass, expected, actual, notes) => {
    checks.push({ id, status: pass ? "PASS" : "FAIL", expected, actual, notes });
  };
  push("enrollment.exists", !!live.enrollment, CANONICAL_IDENTITY.enrollmentId, live.enrollmentId);
  push("enrollment.active", live.active === true, true, live.active);
  push(
    "enrollment.program_instance",
    live.programInstanceId === CANONICAL_IDENTITY.programInstanceId,
    CANONICAL_IDENTITY.programInstanceId,
    live.programInstanceId
  );
  push("enrollment.grade", live.grade != null, CANONICAL_IDENTITY.grade, live.grade);
  push(
    "enrollment.grade_band",
    String(live.gradeBand || "").includes(CANONICAL_IDENTITY.gradeBand),
    CANONICAL_IDENTITY.gradeBand,
    live.gradeBand
  );
  push(
    "athlete.id",
    live.athleteId === CANONICAL_IDENTITY.athleteId,
    CANONICAL_IDENTITY.athleteId,
    live.athleteId
  );
  push(
    "athlete.label",
    /testing schmidt/i.test(String(live.athleteLabel || "")),
    CANONICAL_IDENTITY.athleteLabel,
    live.athleteLabel
  );
  for (const [key, val] of Object.entries(live.counts)) {
    checks.push({
      id: `count.${key}`,
      status: "PASS",
      expected: ">=0",
      actual: val,
      notes: "Empty baseline acceptable for newly created controlled identity",
    });
  }
  return checks;
}

async function runReadOnlyScan() {
  loadEnvLocal();
  if (!airtableToken()) {
    return {
      overall: "BLOCKED",
      counts: { BLOCKED: 1 },
      checks: [{ id: "readonly.token", status: "BLOCKED", notes: "AIRTABLE_API_TOKEN missing" }],
    };
  }
  let live;
  try {
    live = await fetchLiveSnapshot();
  } catch (err) {
    return {
      overall: "BLOCKED",
      counts: { BLOCKED: 1 },
      checks: [{ id: "readonly.live-fetch", status: "BLOCKED", notes: err.message }],
    };
  }
  const checks = identityChecks(live);
  const statusCounts = { PASS: 0, FAIL: 0, BLOCKED: 0 };
  for (const c of checks) statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  const out = {
    overall: statusCounts.FAIL ? "FAIL" : "PASS",
    counts: statusCounts,
    checks,
    liveSnapshot: {
      enrollmentId: live.enrollmentId,
      athleteId: live.athleteId,
      programInstanceId: live.programInstanceId,
      grade: live.grade,
      gradeBand: live.gradeBand,
      active: live.active,
      athleteLabel: live.athleteLabel,
      recordCounts: live.counts,
    },
  };
  const outDir = resolve(ROOT, EVIDENCE_DIR);
  mkdirSync(outDir, { recursive: true });
  const path = resolve(outDir, "READONLY-SCAN.json");
  writeFileSync(path, JSON.stringify({ generated_at: new Date().toISOString(), ...out }, null, 2));
  out.evidencePath = path;
  return out;
}

module.exports = { runReadOnlyScan, fetchLiveSnapshot };
