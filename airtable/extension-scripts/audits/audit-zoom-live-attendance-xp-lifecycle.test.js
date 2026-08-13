/**
 * Offline audit-contract checks for PKG-034.
 * Run: node airtable/extension-scripts/audits/audit-zoom-live-attendance-xp-lifecycle.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "audit-zoom-live-attendance-xp-lifecycle.js"),
  "utf8",
);

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("audit keeps recognized recording events out of live XP indexing", () => {
  assert.match(source, /type === "unsupported_recording"/);
  assert.match(source, /unsupported_recording_deferred/);
  assert.match(source, /type === "unsupported_recording"\) continue/);
});

test("audit covers cumulative bonus threshold and ownership contracts", () => {
  for (const issue of [
    "bonus_missing_canonical_event",
    "bonus_duplicate_canonical_key",
    "bonus_active_below_threshold",
    "bonus_inactive_threshold_met",
    "bonus_meeting_link_cardinality",
    "bonus_enrollment_link_ownership",
    "bonus_week_link_ownership",
    "bonus_was_link_ownership",
    "bonus_wrong_canonical_meeting",
    "bonus_wrong_points_or_rule",
    "bonus_wrong_source_or_rule",
    "bonus_wrong_source_or_bucket",
    "bonus_orphan_or_stolen_event",
  ]) {
    assert.match(source, new RegExp(`"${issue}"`), issue);
  }
  assert.match(source, /qualifyingMeetings\.length >= threshold/);
  assert.match(source, /canonicalBonusMeeting/);
  assert.match(source, /startFieldCandidates/);
  assert.match(source, /America\/Denver/);
});

test("audit remains read-only", () => {
  assert.strictEqual(source.includes("updateRecordAsync"), false);
  assert.strictEqual(source.includes("createRecordAsync"), false);
  assert.strictEqual(source.includes("deleteRecordAsync"), false);
});

test("every selected-field query flattens nested field candidates", () => {
  for (const table of ["zoom", "enrollment", "week", "xp", "was", "rule"]) {
    assert.match(
      source,
      new RegExp(`const ${table}Fields = fieldNames\\(Object\\.values\\(CONFIG\\.${table}\\)\\)`),
      `${table} query must flatten configured field names`,
    );
  }
  assert.match(source, /fieldNames\(Object\.values\(CONFIG\.zoom\)\)[\s\S]*selectRecordsAsync\(\{ fields: zoomFields \}/);
  assert.match(source, /startFieldCandidates: \["Start Time", "Start Date", "Meeting Date", "Date"\]/);
});

function loadDateHelpers() {
  const helperSource = source.slice(0, source.indexOf("async function main()"));
  return vm.runInNewContext(
    `(function () {
      ${helperSource}
      return { CONFIG, fieldNames, dateKey, resolveStartField };
    })()`,
    { Intl, Date, Set, Map, Object, String, Number, Array, RegExp },
  );
}

function fakeTable(fieldNamesToExpose, values) {
  const fields = new Set(fieldNamesToExpose);
  const loadedFields = new Set();
  return {
    getField(fieldName) {
      if (!fields.has(fieldName)) throw new Error(`missing field ${fieldName}`);
      return { name: fieldName };
    },
    load(fieldsToLoad) {
      loadedFields.clear();
      for (const fieldName of fieldsToLoad) loadedFields.add(fieldName);
    },
    record() {
      return {
        getCellValue(fieldName) {
          if (!loadedFields.has(fieldName)) throw new Error(`field ${fieldName} was not selected`);
          return values[fieldName] ?? null;
        },
      };
    },
  };
}

test("runtime date resolution loads and reads every approved start-field case", () => {
  const { CONFIG, fieldNames, dateKey, resolveStartField } = loadDateHelpers();
  const candidates = CONFIG.zoom.startFieldCandidates;

  const cases = [
    {
      name: "Start Time present",
      fields: candidates,
      values: { "Start Time": "2026-08-13T05:30:00.000Z" },
      expectedField: "Start Time",
      expectedDate: "2026-08-12",
    },
    {
      name: "Start Time absent with approved Start Date fallback",
      fields: candidates.slice(1),
      values: { "Start Date": "2026-08-13" },
      expectedField: "Start Date",
      expectedDate: "2026-08-13",
    },
    {
      name: "alternate Meeting Date field present",
      fields: candidates.slice(2),
      values: { "Meeting Date": "2026-08-14" },
      expectedField: "Meeting Date",
      expectedDate: "2026-08-14",
    },
    {
      name: "final Date fallback field present",
      fields: candidates.slice(3),
      values: { Date: "2026-08-15" },
      expectedField: "Date",
      expectedDate: "2026-08-15",
    },
    {
      name: "no usable meeting date",
      fields: candidates,
      values: { "Start Time": "" },
      expectedField: "Start Time",
      expectedDate: "",
    },
  ];

  for (const scenario of cases) {
    const table = fakeTable(scenario.fields, scenario.values);
    const startField = resolveStartField(table);
    assert.strictEqual(startField, scenario.expectedField, scenario.name);
    const selectedFields = fieldNames(candidates).filter((fieldName) => {
      try {
        table.getField(fieldName);
        return true;
      } catch {
        return false;
      }
    });
    table.load(selectedFields);
    assert.strictEqual(dateKey(table.record(), table, startField), scenario.expectedDate, scenario.name);
  }
});

console.log("\nAll PKG-034 audit-contract tests passed.");
