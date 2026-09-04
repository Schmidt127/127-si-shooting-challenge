#!/usr/bin/env node
"use strict";

/**
 * SF-07 / SC-158 — Submissions.Video Count ownership contract.
 *
 * Disposition: Automation 006 is RETIRED (not deployed). Presence gates use
 * Has Video? (formula on Video Upload). Perfect Week week-level counts are
 * owned by 057 → Perfect Week Video Count (Video Feedback rows), not
 * Submissions.Video Count.
 *
 * Observability: stranded / stale Video Count is detectable when
 * Video Count !== attachment length on Video Upload.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SCRIPT_006 = path.join(
  ROOT,
  "airtable/automations/shooting-challenge/006-submission-intake-and-asset-creation-set-video-count.js"
);
const SCRIPT_057 = path.join(
  ROOT,
  "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"
);

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

/**
 * Canonical reconciliation for Submissions.Video Count vs Video Upload.
 * @param {unknown} videoUpload
 * @param {unknown} videoCount
 */
function reconcileVideoCount(videoUpload, videoCount) {
  const attachmentCount = Array.isArray(videoUpload) ? videoUpload.length : 0;
  const stored =
    videoCount === null || videoCount === undefined || videoCount === ""
      ? null
      : Number(videoCount);
  const storedFinite = Number.isFinite(stored) ? stored : null;
  const expected = attachmentCount;
  const matched = storedFinite === expected;
  return {
    attachmentCount,
    storedCount: storedFinite,
    expected,
    matched,
    stranded: !matched,
  };
}

test("006 repo script is marked RETIRED / DO NOT DEPLOY", () => {
  const src = fs.readFileSync(SCRIPT_006, "utf8");
  assert.match(src, /LEGACY \/ RETIRED|RETIRED — DO NOT/);
  assert.match(src, /DO NOT (PASTE|DEPLOY|ENABLE)/i);
});

test("057 Perfect Week video count does not read Submissions.Video Count", () => {
  const src = fs.readFileSync(SCRIPT_057, "utf8");
  assert.match(src, /Perfect Week Video Count/);
  assert.doesNotMatch(src, /submissions:\s*\{[^}]*videoCount:\s*"Video Count"/s);
  // 057 counts Video Feedback rows linked into the week — not attachment length.
  assert.match(src, /videoTable\.selectRecordsAsync|videoQuery/);
});

test("zero videos: match when Video Count is 0", () => {
  const r = reconcileVideoCount(undefined, 0);
  assert.equal(r.attachmentCount, 0);
  assert.equal(r.matched, true);
  assert.equal(r.stranded, false);
});

test("one video with Video Count 0 is stranded (detectable without 006)", () => {
  const r = reconcileVideoCount([{ id: "att1" }], 0);
  assert.equal(r.attachmentCount, 1);
  assert.equal(r.stranded, true);
});

test("multiple videos with stale Video Count 1 is stranded", () => {
  const r = reconcileVideoCount([{ id: "a" }, { id: "b" }], 1);
  assert.equal(r.attachmentCount, 2);
  assert.equal(r.expected, 2);
  assert.equal(r.stranded, true);
});

test("remove video leaving Video Count 1 is stranded", () => {
  const r = reconcileVideoCount([], 1);
  assert.equal(r.attachmentCount, 0);
  assert.equal(r.stranded, true);
});

test("simulated 006 write matches attachment count (idempotent)", () => {
  const afterWrite = reconcileVideoCount([{ id: "att1" }], 1);
  assert.equal(afterWrite.matched, true);
  const secondPass = reconcileVideoCount([{ id: "att1" }], 1);
  assert.equal(secondPass.matched, true);
});

test("empty Video Count with zero attachments matches expected 0 when stored as null→treat as mismatch only if non-null wrong", () => {
  const emptyStored = reconcileVideoCount([], null);
  assert.equal(emptyStored.expected, 0);
  assert.equal(emptyStored.stranded, true); // null !== 0 → observable empty
  const zeroStored = reconcileVideoCount([], 0);
  assert.equal(zeroStored.matched, true);
});

console.log("006-video-count-ownership: all tests passed");
