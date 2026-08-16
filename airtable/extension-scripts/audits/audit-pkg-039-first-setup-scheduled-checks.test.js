const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "audit-pkg-039-first-setup-scheduled-checks.js"),
  "utf8",
);

function loadHelpers() {
  const helperSource = source.slice(0, source.indexOf("async function main()"));
  return vm.runInNewContext(
    `(function () { ${helperSource}; return { CONFIG, analyze, addIssue, SAMPLE_LIMIT }; })()`,
    { Map, Set, Object, Array, String, Number, RegExp, JSON },
  );
}

function table() {
  return { getField(name) { return { name }; } };
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
    enrollments: overrides.enrollments || [],
    submissions: overrides.submissions || [],
    xpEvents: overrides.xpEvents || [],
    summaries: overrides.summaries || [],
    weeks: overrides.weeks || [],
    enrollmentTable: table(),
    weekTable: table(),
  });
}

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("audit remains read-only", () => {
  for (const forbidden of ["createRecordAsync", "updateRecordAsync", "deleteRecordAsync", "fetch("]) {
    assert.strictEqual(source.includes(forbidden), false, forbidden);
  }
});

test("empty base reports setup gaps", () => {
  const report = run();
  assert.strictEqual(report.readOnly, true);
  assert.ok(report.issueCounts.setup_no_enrollments > 0);
});

test("duplicate canonical WAS is an error", () => {
  const report = run({
    enrollments: [record("recEnr1", { "Active?": true, "Program Instance": [{ id: "recPi1" }], "School Year": "2026-2027" })],
    submissions: [record("recSub1", {})],
    summaries: [
      record("recWas1", { Enrollment: [{ id: "recEnr1" }], Week: [{ id: "recWeek1" }] }),
      record("recWas2", { Enrollment: [{ id: "recEnr1" }], Week: [{ id: "recWeek1" }] }),
    ],
  });
  assert.ok(report.issueCounts.duplicate_canonical_was > 0);
});

test("ownership map documents required writers", () => {
  const { CONFIG } = loadHelpers();
  assert.ok(CONFIG.ownership.some((row) => row.owner === "031"));
  assert.ok(CONFIG.ownership.some((row) => row.owner === "118"));
});

console.log("\n4 tests passed");
