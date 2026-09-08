#!/usr/bin/env node
/**
 * Automation 071 v4.5 — Structured Curriculum HC-only vs Submission-backed topology.
 * Pure oracle mirrors the asset Submission ownership gates in 071 (no Airtable runtime).
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js"
);
const source = fs.readFileSync(SCRIPT_PATH, "utf8");

const HC = "recCGcgvS2c8vJsiZ";
const ASSET = "recN8hYQFWzO8HOJB";
const ENR = "recn54wbxTjygydqa";
const SUB = "recSUBMISSION00001";
const HANDOFF_KEY = `HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|${HC}`;

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

/**
 * Mirrors 071 asset topology gates after HC readiness / PHA / Enrollment already passed.
 * @returns {{ ok: true, handoffKey: string } | { ok: false, error: string }}
 */
function validateAssetTopology({
  hcSubmissionIds = [],
  assets = [],
  enrollmentId,
  weekId,
  hcSlot,
  homeworkCompletionId,
}) {
  if (hcSubmissionIds.length > 1) {
    return {
      ok: false,
      error: `Homework Completion may link at most one Submission; found ${hcSubmissionIds.length}.`,
    };
  }
  const submissionBacked = hcSubmissionIds.length === 1;

  for (const asset of assets) {
    const aid = asset.id;
    const assetEnrIds = asset.enrollmentIds || [];
    if (assetEnrIds.length !== 1) {
      return { ok: false, error: `Asset ${aid} must link exactly one Enrollment.` };
    }
    if (assetEnrIds[0] !== enrollmentId) {
      return { ok: false, error: `Asset ${aid} Enrollment mismatch.` };
    }
    const slot = asset.slot || "";
    if (slot !== hcSlot) {
      return {
        ok: false,
        error: `Asset ${aid} slot ${slot || "blank"} does not match ${hcSlot}.`,
      };
    }
    const sourceSubs = asset.submissionIds || [];

    if (submissionBacked) {
      if (sourceSubs.length !== 1) {
        return { ok: false, error: `Asset ${aid} must link exactly one Submission.` };
      }
      if (sourceSubs[0] !== hcSubmissionIds[0]) {
        return {
          ok: false,
          error: `Asset ${aid} Submission must match Homework Completion Submission.`,
        };
      }
      if (
        !asset.submissionEnrollmentId ||
        asset.submissionEnrollmentId !== enrollmentId ||
        !asset.submissionWeekId ||
        asset.submissionWeekId !== weekId
      ) {
        return {
          ok: false,
          error: `Asset ${aid} source Submission ownership/Week mismatch.`,
        };
      }
    } else if (sourceSubs.length !== 0) {
      return {
        ok: false,
        error: `Asset ${aid} must not link a Submission on HC-only Structured Curriculum homework.`,
      };
    }

    if (!String(asset.reviewerUrl || "").trim()) {
      return { ok: false, error: `Asset ${aid} has no safe parent-facing URL.` };
    }
  }

  return {
    ok: true,
    handoffKey: `HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|${homeworkCompletionId}`,
  };
}

function reuseHandoffQueue({ existingKeys, handoffKey, existingPayload, nextPayload }) {
  const matches = existingKeys.filter((k) => k === handoffKey);
  if (matches.length > 1) return { action: "needs_review", duplicate: true };
  if (matches.length === 1) {
    const same =
      JSON.stringify(existingPayload) === JSON.stringify(nextPayload);
    if (!same) return { action: "needs_review", conflicting: true };
    return { action: "existing_handoff", queueReuse: true, created: false };
  }
  return { action: "created_handoff", queueReuse: false, created: true };
}

test("syntax", () => {
  const r = spawnSync(process.execPath, ["--check", SCRIPT_PATH], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
});

test("version is exactly v4.5", () => {
  assert.match(source, /^Version: v4\.5$/m);
  assert.match(source, /version:\s*"v4\.5"/);
  assert.match(source, /Last Updated: 2026-09-08/);
  assert.match(source, /- v4\.5 \(2026-09-08\): Structured Curriculum HC-only/);
});

test("source retains Hub handoff architecture and deterministic key", () => {
  assert.match(source, /Email Handoff Queue/);
  assert.match(source, /HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|/);
  assert.match(source, /eventType: "HOMEWORK_FEEDBACK"/);
  assert.match(source, /templateKey: "HOMEWORK_FEEDBACK"/);
  assert.match(source, /sourceTableToken: "HOMEWORK_COMPLETIONS"/);
  assert.doesNotMatch(source, /makeWebhookUrl|hook\.us1\.make\.com|remoteFetchAsync/);
  assert.match(source, /Do not write Parent Feedback Sent\?/);
});

test("source encodes HC-only vs Submission-backed topology (aligned with 065)", () => {
  assert.match(source, /Homework Completion may link at most one Submission/);
  assert.match(source, /submissionBacked/);
  assert.match(source, /zero Submission links is valid for canonical PHA-backed Structured Curriculum HC-only/);
  assert.match(source, /must not link a Submission on HC-only Structured Curriculum homework/);
  assert.match(source, /must link exactly one Submission/);
  assert.match(source, /Submission must match Homework Completion Submission/);
  assert.match(source, /Never invent or attach a Daily Submission/);
  assert.match(source, /Reviewer File URL/);
  assert.doesNotMatch(source, /Google Drive View URL|Google Drive File URL/);
});

test("Test 1 — HC-only asset accepted (blank Submission, matching Enrollment, reviewer URL)", () => {
  const result = validateAssetTopology({
    homeworkCompletionId: HC,
    enrollmentId: ENR,
    weekId: "recBrZ1sV8byWEHZU",
    hcSlot: "HW1",
    hcSubmissionIds: [],
    assets: [
      {
        id: ASSET,
        enrollmentIds: [ENR],
        submissionIds: [],
        slot: "HW1",
        reviewerUrl: "https://viewer.example/homework/file",
      },
    ],
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.handoffKey, HANDOFF_KEY);
  assert.match(source, /submissionBacked = hcSubIds\.length === 1/);
});

test("Test 2 — legacy Submission-backed path accepted", () => {
  const result = validateAssetTopology({
    homeworkCompletionId: HC,
    enrollmentId: ENR,
    weekId: "recWEEK0000000001",
    hcSlot: "HW1",
    hcSubmissionIds: [SUB],
    assets: [
      {
        id: ASSET,
        enrollmentIds: [ENR],
        submissionIds: [SUB],
        submissionEnrollmentId: ENR,
        submissionWeekId: "recWEEK0000000001",
        slot: "HW1",
        reviewerUrl: "https://viewer.example/homework/file",
      },
    ],
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.handoffKey, HANDOFF_KEY);
});

test("Test 3 — HC-only topology mixing rejected (asset links Submission)", () => {
  const result = validateAssetTopology({
    homeworkCompletionId: HC,
    enrollmentId: ENR,
    weekId: "recWEEK0000000001",
    hcSlot: "HW1",
    hcSubmissionIds: [],
    assets: [
      {
        id: ASSET,
        enrollmentIds: [ENR],
        submissionIds: [SUB],
        slot: "HW1",
        reviewerUrl: "https://viewer.example/homework/file",
      },
    ],
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /must not link a Submission on HC-only/);
});

test("Test 4 — Submission-backed topology mixing rejected (asset Submission blank)", () => {
  const result = validateAssetTopology({
    homeworkCompletionId: HC,
    enrollmentId: ENR,
    weekId: "recWEEK0000000001",
    hcSlot: "HW1",
    hcSubmissionIds: [SUB],
    assets: [
      {
        id: ASSET,
        enrollmentIds: [ENR],
        submissionIds: [],
        slot: "HW1",
        reviewerUrl: "https://viewer.example/homework/file",
      },
    ],
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /must link exactly one Submission/);
});

test("Test 5 — wrong Enrollment rejected", () => {
  const result = validateAssetTopology({
    homeworkCompletionId: HC,
    enrollmentId: ENR,
    weekId: "recWEEK0000000001",
    hcSlot: "HW1",
    hcSubmissionIds: [],
    assets: [
      {
        id: ASSET,
        enrollmentIds: ["recOTHERENROLL001"],
        submissionIds: [],
        slot: "HW1",
        reviewerUrl: "https://viewer.example/homework/file",
      },
    ],
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /Enrollment mismatch/);
});

test("Test 6 — missing reviewer URL rejected", () => {
  const result = validateAssetTopology({
    homeworkCompletionId: HC,
    enrollmentId: ENR,
    weekId: "recWEEK0000000001",
    hcSlot: "HW1",
    hcSubmissionIds: [],
    assets: [
      {
        id: ASSET,
        enrollmentIds: [ENR],
        submissionIds: [],
        slot: "HW1",
        reviewerUrl: "",
      },
    ],
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /no safe parent-facing URL/);
});

test("Test 7 — idempotency unchanged (same key / payload reuses queue row)", () => {
  const payload = { assignmentTitle: "Meditation Workout", totalHomeworkXpAwarded: 35 };
  const first = reuseHandoffQueue({
    existingKeys: [],
    handoffKey: HANDOFF_KEY,
    existingPayload: null,
    nextPayload: payload,
  });
  assert.strictEqual(first.action, "created_handoff");
  assert.strictEqual(first.created, true);

  const replay = reuseHandoffQueue({
    existingKeys: [HANDOFF_KEY],
    handoffKey: HANDOFF_KEY,
    existingPayload: payload,
    nextPayload: payload,
  });
  assert.strictEqual(replay.action, "existing_handoff");
  assert.strictEqual(replay.queueReuse, true);
  assert.strictEqual(replay.created, false);

  assert.match(source, /existing_handoff/);
  assert.match(source, /Conflicting Email Handoff Queue payload/);
  assert.match(source, /HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|/);
  assert.match(source, /existing\.length === 1/);
});

console.log(`PASS ${passed} Automation 071 HC-only topology contracts`);
