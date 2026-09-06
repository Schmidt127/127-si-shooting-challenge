#!/usr/bin/env node
/**
 * Offline contract tests for canonical Automation 117 (Hub handoff).
 * Does NOT test Stage 17 orchestrator (design-alt only).
 *
 * Run: node tools/testing/tests/test_117_email_handoff_offline.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT_PATH = resolve(
  ROOT,
  "airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js"
);

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, error: e?.message || String(e) });
  }
}

const src = readFileSync(SCRIPT_PATH, "utf8");

await test("117 is Hub handoff v2.2 (not Make webhook)", async () => {
  assert.match(src, /version: "v2\.2"/);
  assert.match(src, /Version: v2\.2/);
  assert.match(src, /Email Handoff Queue/);
  assert.match(src, /ZOOM_RECORDING_APPROVAL\|ZOOM_ATTENDANCE\|/);
  assert.match(src, /templateKey: "ZOOM_RECORDING_APPROVED"/);
  assert.doesNotMatch(src, /makeWebhookUrl|webhookUrl|hook\.us1\.make\.com|remoteFetchAsync/);
  assert.doesNotMatch(src, /automationNumber\s*[:=]/);
});

await test("117 meetingName prefers Meeting Name without Display Name substitute", async () => {
  assert.match(src, /meetingName: "Meeting Name"/);
  assert.match(src, /Prefer Meeting Name only/);
  assert.match(src, /meetingDisplayName: "Meeting Display Name"/);
  assert.match(src, /payload\.meetingDisplayName/);
  assert.match(src, /meetingDisplayName !== meetingName/);
});

await test("117 payload includes athleteFirstName and proof/review timestamps", async () => {
  assert.match(src, /athleteFirst: "Athlete First Name"/);
  assert.match(src, /payload\.athleteFirstName/);
  assert.match(src, /recordingQuizSubmittedAt: "Recording Quiz Submitted At"/);
  assert.match(src, /recordingQuizReviewedAt: "Recording Quiz Reviewed At"/);
  assert.match(src, /payload\.proofSubmittedAt/);
  assert.match(src, /payload\.recordingQuizSubmittedAt/);
  assert.match(src, /payload\.reviewedAt/);
  assert.match(src, /payload\.recordingQuizReviewedAt/);
});

await test("117 dateText uses America/Denver", async () => {
  assert.match(src, /const TZ = "America\/Denver"/);
  assert.match(src, /timeZone: TZ/);
});

await test("117 creates Email Handoff Queue rows", async () => {
  assert.match(src, /createRecordAsync/);
  assert.match(src, /created_handoff/);
  assert.match(src, /existing_handoff/);
});

await test("script parses with node --check (await in top-level ok)", async () => {
  const result = spawnSync(process.execPath, ["--check", SCRIPT_PATH], { encoding: "utf8" });
  if (result.status !== 0) {
    const err = `${result.stderr || ""}${result.stdout || ""}`;
    assert.ok(/await is only valid in async functions/.test(err), err || "node --check failed");
  }
});

const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    {
      suite: "117-email-handoff-offline",
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: failed.length,
      results,
    },
    null,
    2
  )
);
process.exit(failed.length ? 1 : 0);
