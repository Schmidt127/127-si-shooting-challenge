#!/usr/bin/env node
/**
 * Static contract tests for Program Instance isolation in intake/achievement automations.
 * Run: node tests/automation-contracts/program-instance-isolation.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const autoDir = path.join(root, "airtable/automations/shooting-challenge");

function read(file) {
  return fs.readFileSync(path.join(autoDir, file), "utf8");
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const targets = [
  {
    num: "023",
    file: "023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js",
    versionRe: /version:\s*"v3\.1"/,
    piPatterns: [
      /submission-week/,
      /programInstanceSource/,
      /Weeks\.Program Instance/,
      /athlete-program-instance/,
    ],
  },
  {
    num: "053",
    file: "053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js",
    versionRe: /Version:\s*5\.3/,
    piPatterns: [
      /findWeekForDate/,
      /programInstanceId/,
      /Enrollment\.Program Instance/,
      /Cannot safely resolve Weeks for streak occurrences across Program Instances/,
    ],
  },
  {
    num: "066",
    file: "066-achievements-and-milestones-create-shot-milestone-unlocks.js",
    versionRe: /version:\s*"v3\.5"/,
    piPatterns: [
      /SHOT_MILESTONE\|/,
      /Enrollment\.Program Instance/,
      /THIS Enrollment only/,
      /America\/Denver/,
    ],
  },
  {
    num: "031",
    file: "031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js",
    versionRe: /version:\s*"v3\.5"/,
    piPatterns: [/Summary Key/, /fail closed/, /Enrollment \+ Week/],
  },
  {
    num: "010",
    file: "010-submission-intake-create-xp-event.js",
    versionRe: /Version:\s*10\.6/,
    piPatterns: [/SUBMISSION_XP\|/, /rearmShotMilestoneCheck/, /Run Shot Milestone Check\?/],
  },
  {
    num: "118",
    file: "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js",
    versionRe: /version:\s*"v1\.7"/,
    piPatterns: [/multi-PI collisions/, /Enrollment\.Program Instance/, /dryRun/],
  },
  {
    num: "119",
    file: "119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js",
    versionRe: /version:\s*"v1\.7"/,
    piPatterns: [/Does not POST Make/, /Send to Make\?/, /dryRun/],
  },
];

for (const row of targets) {
  test(`${row.num} declares expected version`, () => {
    const body = read(row.file);
    assert.ok(row.versionRe.test(body), `${row.file} missing version marker`);
  });

  test(`${row.num} encodes Program Instance isolation or ownership contract`, () => {
    const body = read(row.file);
    for (const pattern of row.piPatterns) {
      assert.ok(pattern.test(body), `${row.file} missing ${pattern}`);
    }
  });
}

test("043 is classified legacy — 042 owns gate assignment", () => {
  const body042 = read("042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js");
  assert.ok(/Automation 043 should be turned off/.test(body042));
  const body043 = read("043-levels-and-progression-set-level-gate-rule-from-next-level.js");
  assert.ok(/Version:\s*v2\.1/.test(body043));
});

test("020 enrollment-scoped HC identity (SC-016)", () => {
  const body = read("020-homework-link-or-create-homework-completion.js");
  assert.ok(/version:\s*"v3\.4\.0"/.test(body));
  assert.ok(/Enrollment \+ Week \+ Homework \+ Slot/.test(body));
  assert.ok(/PHA schedule identity is Homework \+ Program Instance \+ Week \+ Slot/.test(body));
});

console.log("program-instance-isolation tests passed");
