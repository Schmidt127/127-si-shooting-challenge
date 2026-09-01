#!/usr/bin/env node
/** FUT-009 video rename — offline contract tests. */

const assert = require("assert");
const {
  buildFut009DestinationKey,
  evaluateRenameEligibility,
  isBlankCustomName,
  passesCoachConfirmation,
} = require("./index");

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
    "Canonical File URL": "https://example.com/old",
    "Original File Name": "OffTheDribbleRaw.mp4",
    "Upload Status": "Uploaded",
    "Upload Destination": "Video Feedback",
    "Send to Make Trigger": false,
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    recordId: "recAqoUbBKfDNtTLt",
    assetFields: baseAssetFields(),
    customVideoFileName: "OffTheDribble",
    lastName: "Boltz",
    firstName: "Drew",
    programInstanceName: "Shooting Challenge 2026-2027",
    activityDate: "2026-08-17",
    coachConfirmed: true,
    confirmFlag: true,
    ...overrides,
  };
}

test("destination key uses Option D + FUT-007 VIDEO basename", () => {
  const key = buildFut009DestinationKey({
    athleteFolder: "Boltz_Drew",
    programInstanceFolder: "Shooting_Challenge_2026-2027",
    activityDate: "2026-08-17",
    lastName: "Boltz",
    firstName: "Drew",
    customVideoFileName: "OffTheDribble",
    extension: ".mp4",
  });
  assert.strictEqual(
    key,
    "shooting-challenge/Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/" +
      "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4",
  );
});

test("sanitizes custom name with spaces and punctuation", () => {
  const key = buildFut009DestinationKey({
    athleteFolder: "Boltz_Drew",
    programInstanceFolder: "Shooting_Challenge_2026-2027",
    activityDate: "2026-08-17",
    lastName: "Boltz",
    firstName: "Drew",
    customVideoFileName: "Off The Dribble",
    extension: ".mp4",
  });
  assert.ok(key.endsWith("_OffTheDribble.mp4"));
});

test("unicode custom name transliterates safely", () => {
  const key = buildFut009DestinationKey({
    athleteFolder: "Boltz_Drew",
    programInstanceFolder: "Shooting_Challenge_2026-2027",
    activityDate: "2026-08-17",
    lastName: "Jose",
    firstName: "Athlete",
    customVideoFileName: "José",
    extension: ".mp4",
  });
  assert.ok(key.includes("_Jose_"));
});

test("collision suffix _2 for duplicate basenames", () => {
  const existing = ["20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"];
  const key = buildFut009DestinationKey({
    athleteFolder: "Boltz_Drew",
    programInstanceFolder: "Shooting_Challenge_2026-2027",
    activityDate: "2026-08-17",
    lastName: "Boltz",
    firstName: "Drew",
    customVideoFileName: "OffTheDribble",
    extension: ".mp4",
    existingBasenames: existing,
  });
  assert.ok(key.endsWith("_OffTheDribble_2.mp4"));
});

test("blank and em dash custom names are rejected", () => {
  assert.strictEqual(isBlankCustomName(""), true);
  assert.strictEqual(isBlankCustomName("—"), true);
  const blank = evaluateRenameEligibility(baseInput({ customVideoFileName: "—" }));
  assert.strictEqual(blank.action, "skipped_blank_custom_name");
});

test("missing confirmation blocks rename", () => {
  const result = evaluateRenameEligibility(
    baseInput({ coachConfirmed: false, confirmFlag: false }),
  );
  assert.strictEqual(result.action, "skipped_missing_confirmation");
});

test("Gen B source eligible with coach confirmation", () => {
  const result = evaluateRenameEligibility(baseInput());
  assert.strictEqual(result.shouldCopy, true);
  assert.notStrictEqual(result.destinationKey, result.sourceKey);
  assert.ok(result.destinationKey.startsWith("shooting-challenge/"));
});

test("already FUT-007 matching key skips", () => {
  const dest =
    "shooting-challenge/Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/" +
    "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4";
  const result = evaluateRenameEligibility(
    baseInput({ assetFields: baseAssetFields({ "Storage Key": dest }) }),
  );
  assert.strictEqual(result.action, "skipped_already_named");
});

test("homework destination skipped", () => {
  const result = evaluateRenameEligibility(
    baseInput({
      assetFields: baseAssetFields({ "Upload Destination": "Homework Completions" }),
    }),
  );
  assert.strictEqual(result.action, "skipped_not_video");
});

test("upload in flight skipped", () => {
  const result = evaluateRenameEligibility(
    baseInput({
      assetFields: baseAssetFields({ "Upload Status": "Processing" }),
    }),
  );
  assert.strictEqual(result.action, "skipped_upload_in_flight");
});

test("passesCoachConfirmation accepts either gate", () => {
  assert.strictEqual(passesCoachConfirmation(true, false), true);
  assert.strictEqual(passesCoachConfirmation(false, true), true);
  assert.strictEqual(passesCoachConfirmation(false, false), false);
});

console.log("\nAll fut009-video-rename tests passed.");
