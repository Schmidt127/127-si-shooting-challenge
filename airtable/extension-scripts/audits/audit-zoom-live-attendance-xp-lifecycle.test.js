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

test("addIssue safely initializes predeclared and unseen sample buckets", () => {
  const { addIssue, SAMPLE_LIMIT } = loadAuditHelpers();
  const report = {
    issueCounts: {},
    samples: { declared: [{ existing: true }] },
  };

  addIssue(report, "declared", { n: 1 });
  addIssue(report, "unseen", { n: 1 });
  addIssue(report, "unseen", { n: 2 });

  assert.strictEqual(report.issueCounts.declared, 1);
  assert.strictEqual(report.issueCounts.unseen, 2);
  assert.strictEqual(JSON.stringify(report.samples.declared), JSON.stringify([{ existing: true }, { n: 1 }]));
  assert.strictEqual(JSON.stringify(report.samples.unseen), JSON.stringify([{ n: 1 }, { n: 2 }]));
  assert.ok(SAMPLE_LIMIT > 0);
});

test("addIssue preserves counts after the sample-size limit", () => {
  const { addIssue, SAMPLE_LIMIT } = loadAuditHelpers();
  const report = { issueCounts: {}, samples: {} };

  for (let index = 0; index < SAMPLE_LIMIT + 7; index += 1) {
    addIssue(report, "repeated", { index });
  }
  addIssue(report, "independent", { index: 1 });

  assert.strictEqual(report.issueCounts.repeated, SAMPLE_LIMIT + 7);
  assert.strictEqual(report.samples.repeated.length, SAMPLE_LIMIT);
  assert.strictEqual(JSON.stringify(report.samples.independent), JSON.stringify([{ index: 1 }]));
  assert.doesNotThrow(() => JSON.stringify(report));
});

test("all current issue calls use the dynamic addIssue bucket contract", () => {
  const issueTypes = [...source.matchAll(/addIssue\(report,\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(issueTypes.length >= 30);
  assert.match(source, /if \(!Array\.isArray\(report\.samples\[type\]\)\) report\.samples\[type\] = \[\];/);
  assert.match(source, /report\.samples\[type\]\.push\(row\)/);
});

function loadAuditHelpers() {
  const helperSource = source.slice(0, source.indexOf("async function main()"));
  return vm.runInNewContext(
    `(function () {
      ${helperSource}
      return { CONFIG, SAMPLE_LIMIT, addIssue, fieldNames, dateKey, resolveStartField };
    })()`,
    { Intl, Date, Set, Map, Object, String, Number, Array, RegExp },
  );
}

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
  const { CONFIG, fieldNames, dateKey, resolveStartField } = loadAuditHelpers();
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

function makeAuditFixtureTable(fields, rows) {
  return {
    getField(fieldName) {
      if (!fields.includes(fieldName)) throw new Error(`missing field ${fieldName}`);
      return { name: fieldName };
    },
    async selectRecordsAsync(options = {}) {
      const loadedFields = new Set(options.fields || []);
      return {
        records: rows.map((row) => ({
          id: row.id,
          getCellValue(fieldName) {
            if (!loadedFields.has(fieldName)) throw new Error(`field ${fieldName} was not selected`);
            return row.values[fieldName] ?? null;
          },
          getCellValueAsString(fieldName) {
            if (!loadedFields.has(fieldName)) throw new Error(`field ${fieldName} was not selected`);
            const value = row.values[fieldName];
            return value == null ? "" : Array.isArray(value) ? value.map((item) => item.name || item.id || item).join(", ") : String(value);
          },
        })),
      };
    },
  };
}

async function runCompleteAuditFixture() {
  const zoomFields = [
    "Zoom Meeting Key", "Attendees", "Week", "Meeting Status",
    "Create XP Events", "XP Award Status", "XP Events",
    "Zoom XP Current Signature", "Last Zoom XP Reconciled Signature",
    "Zoom XP Reconciliation Needed?", "Start Time", "Start Date",
    "Meeting Date", "Date", "Zoom XP Enrollment Signature - Lkp",
    "Zoom XP Week Signature - Lkp", "Zoom XP Event Signature - Lkp",
  ];
  const enrollmentFields = ["Active?", "Athlete", "Program Instance", "School Year", "Zoom XP Enrollment Signature"];
  const weekFields = ["Program Instance", "School Year", "Zoom XP Week Signature"];
  const ruleFields = ["Rule Key", "Active?", "XP Amount", "XP Source Label"];
  const xpFields = [
    "Source Key", "Enrollment", "Week", "Weekly Athlete Summary",
    "Zoom Meeting", "Active?", "XP Bucket", "XP Source", "XP Points",
  ];
  const wasFields = ["Enrollment", "Week"];
  const tables = {
    "Zoom Meetings": makeAuditFixtureTable(zoomFields, [{
      id: "recMeeting",
      values: {
        "Zoom Meeting Key": "fixture-meeting",
        "Meeting Status": "Completed",
        Week: [{ id: "recWeek" }],
        "Start Time": "2026-08-13T05:30:00.000Z",
        "Zoom XP Reconciliation Needed?": 1,
      },
    }]),
    Enrollments: makeAuditFixtureTable(enrollmentFields, []),
    Weeks: makeAuditFixtureTable(weekFields, [{
      id: "recWeek",
      values: { "Program Instance": [{ id: "recProgram" }], "School Year": "2026-2027" },
    }]),
    "XP Reward Rules": makeAuditFixtureTable(ruleFields, []),
    "XP Events": makeAuditFixtureTable(xpFields, []),
    "Weekly Athlete Summary": makeAuditFixtureTable(wasFields, []),
  };
  const logs = [];
  const context = {
    base: { getTable: (tableName) => tables[tableName] },
    console: { log: (...args) => logs.push(args.join(" ")) },
    Intl, Date, Set, Map, Object, String, Number, Array, RegExp,
  };
  const executableSource = source.replace(/\nawait main\(\);\s*$/, "");
  await vm.runInNewContext(
    `(async function () {
      ${executableSource}
      return main();
    })()`,
    context,
  );
  const reportText = logs.find((line) => line.trim().startsWith("{"));
  assert.ok(reportText, "audit should emit a JSON report");
  const report = JSON.parse(reportText);
  assert.strictEqual(report.issueCounts.missing_enrollment_links, 1);
  assert.strictEqual(report.samples.missing_enrollment_links.length, 1);
  assert.doesNotThrow(() => JSON.stringify(report));
}

runCompleteAuditFixture()
  .then(() => console.log("ok - complete audit fixture serializes missing-enrollment findings"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
