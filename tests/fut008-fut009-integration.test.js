#!/usr/bin/env node
/**
 * FUT-008 + FUT-009 integration — display filename is independent of S3 rename.
 *
 * Verifies:
 * - Custom Video File Name appears in display immediately (before rename)
 * - FUT-009 rename eligibility is separate from display resolution
 * - Display does not depend on Storage Key / Formatted Upload Name matching custom name
 * - Failed-rename scenarios leave display unchanged
 */

const assert = require("assert");
const {
  resolveVideoDisplayFileNameWithFallback,
  resolveVideoDisplayFileName,
} = require("../lib/video-display-filename");
const {
  evaluateRenameEligibility,
  buildRenameWritebackFields,
} = require("../lib/fut009-video-rename");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const GEN_B_SOURCE =
  "Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/" +
  "20260817T172732Z_VIDEO_recAqoUbBKfDNtTLt_OffTheDribbleRaw.mp4";

function baseAssetFields(overrides = {}) {
  return {
    "Storage Key": GEN_B_SOURCE,
    "Original File Name": "OffTheDribbleRaw.mp4",
    "Formatted Upload Name": "20260817T172732Z_VIDEO_recAqoUbBKfDNtTLt_OffTheDribbleRaw.mp4",
    "Upload Status": "Uploaded",
    "Upload Destination": "Video Feedback",
    "Send to Make Trigger": false,
    ...overrides,
  };
}

test("display uses custom name immediately while Storage Key remains Gen B", () => {
  const custom = "OffTheDribble";
  const display = resolveVideoDisplayFileNameWithFallback(custom, "OffTheDribbleRaw.mp4");
  assert.strictEqual(display, "OffTheDribble");

  const fields = baseAssetFields();
  assert.ok(fields["Storage Key"].includes("OffTheDribbleRaw"));
  assert.notStrictEqual(fields["Storage Key"], display);
});

test("display works before coach confirms S3 rename", () => {
  const display = resolveVideoDisplayFileName("OffTheDribble", "OffTheDribbleRaw.mp4");
  assert.strictEqual(display, "OffTheDribble");

  const eligibility = evaluateRenameEligibility({
    recordId: "recSA1234567890AB",
    assetFields: baseAssetFields(),
    customVideoFileName: "OffTheDribble",
    lastName: "Boltz",
    firstName: "Drew",
    programInstanceName: "Shooting Challenge 2026-2027",
    activityDate: "2026-08-17",
    coachConfirmed: false,
    confirmFlag: false,
  });
  assert.strictEqual(eligibility.action, "skipped_missing_confirmation");
  assert.strictEqual(resolveVideoDisplayFileNameWithFallback("OffTheDribble", "raw.mp4"), "OffTheDribble");
});

test("display unchanged when rename fails eligibility", () => {
  const display = resolveVideoDisplayFileNameWithFallback("OffTheDribble", "raw.mp4");
  const eligibility = evaluateRenameEligibility({
    recordId: "recSA1234567890AB",
    assetFields: baseAssetFields({ "Upload Status": "Processing" }),
    customVideoFileName: "OffTheDribble",
    lastName: "Boltz",
    firstName: "Drew",
    programInstanceName: "Shooting Challenge 2026-2027",
    activityDate: "2026-08-17",
    coachConfirmed: true,
    confirmFlag: true,
  });
  assert.strictEqual(eligibility.action, "skipped_upload_in_flight");
  assert.strictEqual(display, "OffTheDribble");
});

test("after successful rename writeback, display still uses custom name not Storage Key basename", () => {
  const destinationKey =
    "shooting-challenge/Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/" +
    "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4";
  const writeback = buildRenameWritebackFields({
    destinationKey,
    bucket: "shooting-challenge-assets",
    region: "us-east-2",
    previousStorageKey: GEN_B_SOURCE,
  });
  assert.strictEqual(writeback["Storage Key"], destinationKey);

  const display = resolveVideoDisplayFileNameWithFallback("OffTheDribble", "OffTheDribbleRaw.mp4");
  assert.strictEqual(display, "OffTheDribble");
  assert.notStrictEqual(display, writeback["Formatted Upload Name"]);
});

test("precedence: custom then Video Asset File Name then fallback", () => {
  assert.strictEqual(
    resolveVideoDisplayFileNameWithFallback("—", "MyUpload.mp4"),
    "MyUpload.mp4",
  );
  assert.strictEqual(resolveVideoDisplayFileNameWithFallback("", ""), "Video submission");
});

test("homework assets are not eligible for FUT-009 rename", () => {
  const eligibility = evaluateRenameEligibility({
    recordId: "recSA1234567890AB",
    assetFields: baseAssetFields({ "Upload Destination": "Homework Completions" }),
    customVideoFileName: "OffTheDribble",
    lastName: "Boltz",
    firstName: "Drew",
    programInstanceName: "Shooting Challenge 2026-2027",
    activityDate: "2026-08-17",
    coachConfirmed: true,
    confirmFlag: true,
  });
  assert.strictEqual(eligibility.action, "skipped_not_video");
});

console.log("\nAll FUT-008 + FUT-009 integration tests passed.");
