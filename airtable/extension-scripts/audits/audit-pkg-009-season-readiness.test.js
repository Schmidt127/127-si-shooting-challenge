const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "audit-pkg-009-season-readiness.js"),
  "utf8",
);

function loadHelpers() {
  const helperSource = source.slice(0, source.indexOf("async function main()"));
  return vm.runInNewContext(
    `(function () { ${helperSource}; return { CONFIG, analyze, addIssue, SAMPLE_LIMIT }; })()`,
    { Map, Set, Object, Array, String, Number, RegExp, JSON },
  );
}

function record(id, values) {
  return {
    id,
    getCellValue(field) { return values[field] ?? null; },
    getCellValueAsString(field) {
      const value = values[field];
      if (Array.isArray(value)) return value.map((item) => item.name || item.id).join(", ");
      return value == null ? "" : String(value);
    },
  };
}

function run(overrides = {}) {
  const { analyze } = loadHelpers();
  return analyze({
    programInstances: overrides.programInstances || [],
    configRows: overrides.configRows || [],
    weeks: overrides.weeks || [],
    enrollments: overrides.enrollments || [],
    submissions: overrides.submissions || [],
    summaries: overrides.summaries || [],
    xpEvents: overrides.xpEvents || [],
  });
}

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const registeringPi = record("recPi2027", {
  "Name - Program Instance": "Shooting Challenge | 2026-2027",
  "Program - Linked": [{ name: "Shooting Challenge" }],
  Status: "Registering",
  "School Year - Linked": "2026-2027",
});

test("audit remains read-only", () => {
  for (const forbidden of ["createRecordAsync", "updateRecordAsync", "deleteRecordAsync", "fetch("]) {
    assert.strictEqual(source.includes(forbidden), false, forbidden);
  }
});

test("missing registering program instance is an error", () => {
  const report = run();
  assert.ok(report.issueCounts.no_registering_program_instance > 0);
});

test("multiple registering program instances fail closed", () => {
  const report = run({
    programInstances: [registeringPi, { ...registeringPi, id: "recPiOther" }],
    configRows: [record("recCfg1", { "Active?": true, "Active School Year": "2026-2027" })],
  });
  assert.ok(report.issueCounts.multiple_registering_program_instances > 0);
});

test("duplicate active enrollment identity is an error", () => {
  const report = run({
    programInstances: [registeringPi],
    configRows: [record("recCfg1", { "Active?": true, "Active School Year": "2026-2027" })],
    enrollments: [
      record("recEnr1", {
        "Active?": true,
        Athlete: [{ id: "recAth1" }],
        "Program Instance": [{ id: "recPi2027" }],
        "School Year": "2026-2027",
      }),
      record("recEnr2", {
        "Active?": true,
        Athlete: [{ id: "recAth1" }],
        "Program Instance": [{ id: "recPi2027" }],
        "School Year": "2026-2027",
      }),
    ],
  });
  assert.ok(report.issueCounts.duplicate_active_enrollment_identity > 0);
});

console.log("\n4 tests passed");
