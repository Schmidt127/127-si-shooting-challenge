#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  normalizeSchoolYear,
  resolveRegisteringProgramInstance,
  resolveScopedEnrollment,
  resolveWeekForDate,
  resolveActiveConfig,
  auditSeasonReadiness,
} = require("../../lib/reliability/season-scope-safety");

function run(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const PI_2027 = {
  id: "rec5mEM0YPqPqq0hZ",
  name: "Shooting Challenge | 2026-2027",
  program: "Shooting Challenge",
  status: "Registering",
  schoolYear: "2026-2027",
};

const PI_2026 = {
  id: "recOldPi",
  name: "Shooting Challenge | 2025-2026",
  program: "Shooting Challenge",
  status: "Closed",
  schoolYear: "2025-2026",
};

run("school year normalization rejects invalid spans", () => {
  assert.strictEqual(normalizeSchoolYear("2026-2027").ok, true);
  assert.strictEqual(normalizeSchoolYear("2026-2028").ok, false);
  assert.strictEqual(normalizeSchoolYear("bad").ok, false);
});

run("registering program instance resolves exactly one Shooting Challenge row", () => {
  const ok = resolveRegisteringProgramInstance([PI_2027]);
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.programInstanceId, PI_2027.id);
});

run("ambiguous registering program instances fail closed", () => {
  const bad = resolveRegisteringProgramInstance([
    PI_2027,
    { ...PI_2027, id: "recOtherPi" },
  ]);
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.reason, "multiple_registering_program_instances");
});

run("enrollment scope rejects cross-season program instance", () => {
  const scoped = resolveScopedEnrollment(
    {
      active: true,
      programInstanceIds: ["recOldPi"],
      schoolYear: "2025-2026",
    },
    { programInstanceId: PI_2027.id, schoolYear: "2026-2027" },
  );
  assert.strictEqual(scoped.ok, false);
  assert.strictEqual(scoped.reason, "enrollment_wrong_program_instance");
});

run("week resolution fails on overlapping active weeks in same program instance", () => {
  const report = auditSeasonReadiness({
    programInstances: [PI_2027, PI_2026],
    configRows: [{ id: "recCfg1", active: true, schoolYear: "2026-2027" }],
    weeks: [
      {
        id: "recWeekA",
        programInstanceId: PI_2027.id,
        active: true,
        startDate: "2027-05-02",
        endDate: "2027-05-08",
      },
      {
        id: "recWeekB",
        programInstanceId: PI_2027.id,
        active: true,
        startDate: "2027-05-05",
        endDate: "2027-05-11",
      },
    ],
    enrollments: [],
  });
  assert.ok(report.findings.some((f) => f.code === "week_overlap"));
});

run("activity date resolves one week when calendar is unambiguous", () => {
  const week = resolveWeekForDate(
    [
      {
        id: "recWeek1",
        programInstanceId: PI_2027.id,
        active: true,
        startDate: "2027-05-02",
        endDate: "2027-05-08",
      },
    ],
    "2027-05-03",
    PI_2027.id,
  );
  assert.strictEqual(week.ok, true);
  assert.strictEqual(week.weekId, "recWeek1");
});

run("multiple active configs fail closed", () => {
  const config = resolveActiveConfig(
    [
      { id: "recCfg1", active: true, schoolYear: "2026-2027" },
      { id: "recCfg2", active: true, schoolYear: "2026-2027" },
    ],
    "2026-2027",
  );
  assert.strictEqual(config.ok, false);
  assert.strictEqual(config.reason, "multiple_active_configs");
});

run("season readiness audit flags duplicate active enrollment identity", () => {
  const report = auditSeasonReadiness({
    programInstances: [PI_2027],
    configRows: [{ id: "recCfg1", active: true, schoolYear: "2026-2027" }],
    weeks: [],
    enrollments: [
      {
        id: "recEnr1",
        active: true,
        athleteId: "recAth1",
        programInstanceIds: [PI_2027.id],
        schoolYear: "2026-2027",
      },
      {
        id: "recEnr2",
        active: true,
        athleteId: "recAth1",
        programInstanceIds: [PI_2027.id],
        schoolYear: "2026-2027",
      },
    ],
  });
  assert.ok(report.findings.some((f) => f.code === "duplicate_active_enrollment_identity"));
});

console.log(`\n${8} tests passed`);
