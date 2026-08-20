#!/usr/bin/env node
/**
 * PHA Grade Band is descriptive metadata only — operational identity tests.
 * Run: node tests/homework/pha-grade-band-metadata-contract.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  resolvePhaByIdentity,
  validateLinkedPhaOwnership,
} = require("./pha-identity");

const root = path.join(__dirname, "../..");
const p020 = path.join(root, "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js");
const p033 = path.join(root, "airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js");
const p065 = path.join(root, "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js");
const p071 = path.join(root, "airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js");
const s020 = fs.readFileSync(p020, "utf8");
const s033 = fs.readFileSync(p033, "utf8");
const s065 = fs.readFileSync(p065, "utf8");
const s071 = fs.readFileSync(p071, "utf8");

const ALL_BANDS = ["K-2", "3-4", "5-6", "7-8", "9-12"];
const IDS = {
  pi: "recProgramInstan01",
  week: "recWeekAAAAAAAAAA",
  hw: "recHomeworkLibAAA",
  slot: "HW1",
  otherPi: "recProgramInstan02",
  otherWeek: "recWeekBBBBBBBBBB",
  otherHw: "recHomeworkLibBBB",
};

function multiBandPha(overrides = {}) {
  return {
    id: "recPhaMultiBandAAA",
    active: true,
    programInstanceId: IDS.pi,
    weekId: IDS.week,
    homeworkId: IDS.hw,
    slot: IDS.slot,
    gradeBands: ALL_BANDS,
    ...overrides,
  };
}

let pass = 0;
function t(name, fn) {
  fn();
  pass++;
  console.log(`ok - ${name}`);
}

t("020/033/065/071 syntax", () => {
  for (const p of [p020, p033, p065, p071]) {
    const r = spawnSync(process.execPath, ["--check", p], { encoding: "utf8" });
    assert.strictEqual(r.status, 0, `${p}\n${r.stderr}`);
  }
});

t("020 v3.7 treats Grade Band as metadata only", () => {
  assert.match(s020, /version:\s*"v3\.7"/);
  assert.match(s020, /Grade Band is eligibility\/descriptive metadata only/i);
  assert.match(s020, /Multi-band Grade Band never rejects/);
  assert.match(s020, /gradeBandSchedulingUsed:\s*false/);
  assert.doesNotMatch(s020, /PHA Grade Band mismatch/);
});

t("033 does not select PHA by Grade Band", () => {
  assert.match(s033, /PHA Grade Band is OPTIONAL eligibility\/descriptive metadata only/);
  assert.match(s033, /gradeBandSchedulingUsed:\s*false/);
  assert.doesNotMatch(s033, /PHA Grade Band mismatch/);
  // Matching filter uses PI + Week + Active; Grade Band field may be loaded but not compared.
  assert.match(s033, /piIds\[0\] !== programInstanceId/);
  assert.match(s033, /weekIds\[0\] !== weekId/);
});

t("065 PHA validation ignores Grade Band", () => {
  assert.match(s065, /PHA Program Instance does not match Enrollment/);
  assert.match(s065, /PHA Week ownership mismatch/);
  assert.match(s065, /PHA Homework Slot ownership mismatch/);
  assert.match(s065, /PHA Homework ownership mismatch/);
  assert.doesNotMatch(s065, /PHA Grade Band mismatch|Grade Band ownership/);
});

t("071 v4.1 Hub handoff ignores PHA Grade Band", () => {
  assert.match(s071, /Version: v4\.1/);
  assert.match(s071, /version: "v4\.1"/);
  assert.match(s071, /HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|/);
  assert.match(s071, /PHA operational identity is Program Instance \+ Week \+ Homework Assignment \+ Homework Slot/);
  assert.match(s071, /PHA Program Instance mismatch/);
  assert.match(s071, /PHA Week mismatch/);
  assert.match(s071, /PHA Homework mismatch/);
  assert.match(s071, /PHA Homework Slot mismatch/);
  assert.doesNotMatch(s071, /PHA Grade Band mismatch/);
  assert.doesNotMatch(s071, /Exactly one Grade Band is required for homework schedule validation/);
  assert.doesNotMatch(s071, /makeWebhookUrl|hook\.us1\.make\.com|remoteFetchAsync/);
});

t("single-band PHA matches successfully", () => {
  const pha = multiBandPha({ id: "recPhaSingleBandAA", gradeBands: ["K-2"] });
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  const result = resolvePhaByIdentity([pha], identity);
  assert.equal(result.status, "exact");
  assert.equal(validateLinkedPhaOwnership(pha, identity).ok, true);
});

t("multi-band PHA matches K-2 enrollment identity", () => {
  const pha = multiBandPha();
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  const result = resolvePhaByIdentity([pha], identity);
  assert.equal(result.status, "exact");
  assert.equal(result.matches[0].id, pha.id);
  assert.deepEqual(result.matches[0].gradeBands, ALL_BANDS);
});

t("same multi-band PHA matches 5-6 enrollment identity", () => {
  const pha = multiBandPha();
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  // Enrollment grade is intentionally not part of identity.
  const result = resolvePhaByIdentity([pha], identity);
  assert.equal(result.status, "exact");
  const ownership = validateLinkedPhaOwnership(pha, identity);
  assert.equal(ownership.ok, true);
});

t("PHA Grade Band mismatch does not reject ownership", () => {
  const pha = multiBandPha({ gradeBands: ["7-8", "9-12"] });
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  const ownership = validateLinkedPhaOwnership(pha, identity);
  assert.equal(ownership.ok, true);
  assert.equal(ownership.error, "");
});

t("multiple matching PHAs fail closed as duplicate", () => {
  const a = multiBandPha({ id: "recPhaA" });
  const b = multiBandPha({ id: "recPhaB" });
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  const result = resolvePhaByIdentity([a, b], identity);
  assert.equal(result.status, "duplicate");
  assert.equal(result.matches.length, 2);
});

t("missing matching PHA fails closed", () => {
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  const result = resolvePhaByIdentity([], identity);
  assert.equal(result.status, "missing");
});

t("different Program Instance does not match", () => {
  const pha = multiBandPha({ programInstanceId: IDS.otherPi });
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  assert.equal(resolvePhaByIdentity([pha], identity).status, "missing");
  assert.equal(validateLinkedPhaOwnership(pha, identity).ok, false);
  assert.match(validateLinkedPhaOwnership(pha, identity).error, /Program Instance mismatch/);
});

t("different Week does not match", () => {
  const pha = multiBandPha({ weekId: IDS.otherWeek });
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  assert.equal(resolvePhaByIdentity([pha], identity).status, "missing");
  assert.match(validateLinkedPhaOwnership(pha, identity).error, /Week mismatch/);
});

t("different Homework Assignment does not match", () => {
  const pha = multiBandPha({ homeworkId: IDS.otherHw });
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  assert.equal(resolvePhaByIdentity([pha], identity).status, "missing");
  assert.match(validateLinkedPhaOwnership(pha, identity).error, /Homework mismatch/);
});

t("different Homework Slot does not match", () => {
  const pha = multiBandPha({ slot: "HW2" });
  const identity = { programInstanceId: IDS.pi, weekId: IDS.week, homeworkId: IDS.hw, slot: "HW1" };
  assert.equal(resolvePhaByIdentity([pha], identity).status, "missing");
  assert.match(validateLinkedPhaOwnership(pha, identity).error, /Homework Slot mismatch/);
});

t("071 payload may include athlete canonicalGradeBandId without PHA matching", () => {
  assert.match(s071, /Athlete Grade Band is display\/reporting metadata only/);
  assert.match(s071, /const gradeId = athleteGradeIds\.length === 1 \? athleteGradeIds\[0\] : ""/);
  assert.match(s071, /canonicalGradeBandId: gradeId/);
  assert.doesNotMatch(s071, /sameSet\(ids\(canonicalPha, phaT, CONFIG\.fields\.pha\.grade\)/);
});

console.log(`PASS ${pass} PHA Grade Band metadata contracts`);
