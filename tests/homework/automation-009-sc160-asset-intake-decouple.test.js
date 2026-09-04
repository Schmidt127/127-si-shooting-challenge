/**
 * SC-160 — Automation 009 asset intake decoupled from Submission.Week
 * Offline contract tests (no live Airtable).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = "airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js";
const source = readFileSync(path.join(ROOT, SCRIPT), "utf8");

test("009 v1.3 — SC-160 version header present", () => {
  assert.match(source, /version:\s*"v1\.3"/);
  assert.match(source, /versionNumber:\s*"1\.3"/);
  assert.match(source, /SC-160/);
});

test("009 — does not hard-require exactly one Week for asset create", () => {
  assert.doesNotMatch(
    source,
    /Submission must have exactly one Week/,
    "must not fail closed solely because Week is missing"
  );
  assert.match(source, /weekIds\.length > 1/);
  assert.match(source, /at most one Week/);
});

test("009 — Enrollment remains required; Week optional with hold note", () => {
  assert.match(source, /Submission must have exactly one Enrollment/);
  assert.match(source, /weekLinked/);
  assert.match(source, /weekHoldOut/);
  assert.match(source, /Week not linked — assets created; week-dependent scoring on hold/);
});

test("009 — still creates one asset per attachment with provenance fields", () => {
  assert.match(source, /sourceAttachmentId/);
  assert.match(source, /assetSlot/);
  assert.match(source, /assetPurpose/);
  assert.match(source, /originalFileName/);
  assert.match(source, /Exact source already exists/);
  assert.match(source, /compatibleRestoration/);
  assert.match(source, /slot:\s*"HW1"/);
  assert.match(source, /slot:\s*"HW2"/);
  assert.match(source, /slot:\s*"VIDEO"/);
});

test("009 — Ready formula contract: Week must not gate asset intake (documented)", () => {
  // Formula paste packet lives in deploy checklist; script must not reintroduce Week gate.
  assert.match(source, /Week is not empty \(SC-160: Week must not gate asset intake\)/);
  assert.match(source, /Week is optional for asset create/);
});

/**
 * Pure gate logic mirroring the SC-160 Ready / Why Not Ready formulas
 * (Enrollment + attachments + already-has-assets; no Week).
 */
function whyNotReady009({ enrollment, week, assetCount, hw1, hw2, video }) {
  if (!enrollment) return "Missing Enrollment";
  // Week intentionally ignored for asset intake readiness.
  void week;
  if (assetCount > 0) return "Already has Submission Assets";
  if (!hw1 && !hw2 && !video) return "No HW Sub 1, HW Sub 2, or Video Upload attachment";
  return "READY";
}

function readyFor009(args) {
  return whyNotReady009(args) === "READY" ? 1 : 0;
}

test("Ready/Why Not Ready formula contract — attachments present, Week missing → READY", () => {
  const row = {
    enrollment: true,
    week: false,
    assetCount: 0,
    hw1: true,
    hw2: true,
    video: true,
  };
  assert.equal(whyNotReady009(row), "READY");
  assert.equal(readyFor009(row), 1);
});

test("Ready/Why Not Ready formula contract — Missing Enrollment still blocks", () => {
  assert.equal(
    whyNotReady009({
      enrollment: false,
      week: true,
      assetCount: 0,
      hw1: true,
      hw2: false,
      video: false,
    }),
    "Missing Enrollment"
  );
  assert.equal(
    readyFor009({
      enrollment: false,
      week: true,
      assetCount: 0,
      hw1: true,
      hw2: false,
      video: false,
    }),
    0
  );
});

test("Ready/Why Not Ready formula contract — no attachments → not READY", () => {
  assert.equal(
    whyNotReady009({
      enrollment: true,
      week: false,
      assetCount: 0,
      hw1: false,
      hw2: false,
      video: false,
    }),
    "No HW Sub 1, HW Sub 2, or Video Upload attachment"
  );
});

test("Ready/Why Not Ready formula contract — already has assets → not READY", () => {
  assert.equal(
    whyNotReady009({
      enrollment: true,
      week: false,
      assetCount: 2,
      hw1: true,
      hw2: false,
      video: false,
    }),
    "Already has Submission Assets"
  );
});

test("legacy Missing Week gate must not appear in SC-160 ready helper", () => {
  const messages = [
    whyNotReady009({
      enrollment: true,
      week: false,
      assetCount: 0,
      hw1: true,
      hw2: false,
      video: false,
    }),
  ];
  assert.ok(!messages.includes("Missing Week"));
});
