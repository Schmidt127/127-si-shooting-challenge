const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "audit-pkg-040-standings-integrity.js"),
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

function enrollment(id, overrides = {}) {
  return record(id, {
    "Active?": true,
    Athlete: [{ id: `athlete-${id}`, name: `Athlete ${id}` }],
    "Program Instance": [{ id: "program-1", name: "Shooting Challenge | 2026-2027" }],
    "School Year": "2026-2027",
    "Current Level": [{ id: "level-2", name: "Level 2" }],
    "Level Sort Order - For Softr": 2,
    "Level Status": { name: "Assigned" },
    "Lifetime XP Total": 100,
    "Total Shots Counted": 25,
    "XP Events": [{ id: `xp-${id}` }],
    "Full Athlete Name": `Athlete ${id}`,
    ...overrides,
  });
}

function run({ enrollments = [enrollment("one")], levels, xpEvents } = {}) {
  const activeLevels = levels || [record("level-2", { "Active?": true, "Sort Order": 2, "Level Name": "Level 2" })];
  const events = xpEvents || [record("xp-one", { "Active?": true, Enrollment: [{ id: "one" }], "Active XP Points": 100 })];
  const { analyze } = loadHelpers();
  return analyze({
    enrollments,
    levels: activeLevels,
    xpEvents: events,
    enrollmentTable: table(),
    levelTable: table(),
    xpTable: table(),
  });
}

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("audit remains read-only and emits every required issue bucket", () => {
  for (const forbidden of ["createRecordAsync", "updateRecordAsync", "deleteRecordAsync", "fetch("]) {
    assert.strictEqual(source.includes(forbidden), false, forbidden);
  }
  const { CONFIG } = loadHelpers();
  const report = run();
  for (const type of CONFIG.knownIssueTypes) {
    assert.ok(Object.prototype.hasOwnProperty.call(report.issueCounts, type), type);
    assert.ok(Array.isArray(report.samples[type]), type);
  }
  assert.doesNotThrow(() => JSON.stringify(report));
});

test("audit counts duplicate canonical identities beyond capped samples", () => {
  const { SAMPLE_LIMIT } = loadHelpers();
  const rows = Array.from({ length: SAMPLE_LIMIT + 3 }, (_, index) =>
    enrollment(`dup-${index}`, { Athlete: [{ id: "same-athlete", name: "Same" }], "XP Events": [] }),
  );
  const report = run({ enrollments: rows, xpEvents: [] });
  assert.strictEqual(report.issueCounts.duplicate_canonical_enrollment, 1);
  assert.ok(report.samples.duplicate_canonical_enrollment[0].enrollmentIds.length > SAMPLE_LIMIT);
});

test("audit distinguishes zero totals from blank, invalid, and negative totals", () => {
  const zero = enrollment("zero", { "Lifetime XP Total": 0, "Total Shots Counted": 0, "XP Events": [] });
  const blank = enrollment("blank", { "Lifetime XP Total": "", "Total Shots Counted": "", "XP Events": [] });
  const invalid = enrollment("invalid", { "Lifetime XP Total": "oops", "Total Shots Counted": "oops", "XP Events": [] });
  const negative = enrollment("negative", { "Lifetime XP Total": -1, "Total Shots Counted": -1, "XP Events": [] });
  const report = run({ enrollments: [zero, blank, invalid, negative], xpEvents: [] });
  assert.strictEqual(report.issueCounts.lifetime_xp_blank, 1);
  assert.strictEqual(report.issueCounts.lifetime_xp_invalid, 1);
  assert.strictEqual(report.issueCounts.lifetime_xp_negative, 1);
  assert.strictEqual(report.issueCounts.counted_shots_blank, 1);
  assert.strictEqual(report.issueCounts.counted_shots_invalid, 1);
  assert.strictEqual(report.issueCounts.counted_shots_negative, 1);
});

test("audit catches inactive XP links, inactive levels, and duplicate ranks", () => {
  const row = enrollment("one", { "XP Events": [{ id: "xp-inactive" }] });
  const report = run({
    enrollments: [row],
    levels: [
      record("level-2", { "Active?": false, "Sort Order": 2 }),
      record("level-other", { "Active?": true, "Sort Order": 2 }),
      record("level-other-2", { "Active?": true, "Sort Order": 2 }),
    ],
    xpEvents: [record("xp-inactive", { "Active?": false, Enrollment: [{ id: "one" }], "Active XP Points": 100 })],
  });
  assert.strictEqual(report.issueCounts.inactive_xp_event_linked, 1);
  assert.strictEqual(report.issueCounts.current_level_inactive, 1);
  assert.strictEqual(report.issueCounts.duplicate_level_rank, 1);
});

console.log("\nAll PKG-040 standings audit tests passed.");
