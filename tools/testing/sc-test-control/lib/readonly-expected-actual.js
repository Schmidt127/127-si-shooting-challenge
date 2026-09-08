"use strict";

const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = resolve(__dirname, "../../..");

async function loadExpectedActual() {
  const mod = await import(pathToFileURL(resolve(ROOT, "tools/testing/lib/expected_actual.js")).href);
  return mod;
}

/**
 * Read-only expected-vs-actual scan (Wave B). No Airtable writes.
 * Returns aggregated PASS/WARN/FAIL/UNKNOWN counts.
 */
async function runReadOnlyScan(snapshot = {}) {
  const ea = await loadExpectedActual();
  const checks = [];

  if (snapshot.enrollment && snapshot.athlete) {
    const idResult = ea.verifySchmidtIdentity({
      athlete: snapshot.athlete,
      enrollment: snapshot.enrollment,
      foundationWeek: snapshot.foundationWeek || null,
      scenario: snapshot.scenario || null,
      submissions: snapshot.submissions || [],
      wasRecords: snapshot.wasRecords || [],
      xpBySubmission: snapshot.xpBySubmission || [],
      homeworkCompletion: snapshot.homeworkCompletion || null,
      homeworkXp: snapshot.homeworkXp || null,
      videoFeedbackIds: snapshot.videoFeedbackIds || [],
      zoomAttendanceIds: snapshot.zoomAttendanceIds || [],
      expect: snapshot.expect || {},
    });
    checks.push(...idResult.checks);
  } else {
    checks.push({
      id: "readonly.no-snapshot",
      status: ea.STATUSES.BLOCKED,
      notes: "Provide enrollment+athlete snapshot or run identity verify with PAT",
    });
  }

  const policy = ea.airtableWritebackPolicy();
  checks.push({
    id: "writeback.policy",
    status: policy.enabled ? ea.STATUSES.WARN : ea.STATUSES.PASS,
    expected: false,
    actual: policy.enabled,
    notes: policy.reason,
  });

  const counts = { PASS: 0, WARN: 0, FAIL: 0, BLOCKED: 0, UNKNOWN: 0, NOT_TESTED: 0, MANUAL_REQUIRED: 0 };
  for (const c of checks) {
    counts[c.status] = (counts[c.status] || 0) + 1;
  }

  let overall = ea.STATUSES.PASS;
  if (counts.FAIL) overall = ea.STATUSES.FAIL;
  else if (counts.BLOCKED) overall = ea.STATUSES.BLOCKED;
  else if (counts.WARN) overall = ea.STATUSES.WARN;

  return { overall, counts, checks, writebackPolicy: policy };
}

module.exports = { runReadOnlyScan, loadExpectedActual };
