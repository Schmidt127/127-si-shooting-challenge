/**
 * Offline regression checks for audit-video-xp-pipeline-integrity.
 * Run: node airtable/extension-scripts/audits/audit-video-xp-pipeline-integrity.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "audit-video-xp-pipeline-integrity.js"),
  "utf8"
);

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("CONFIG.video includes canonical Grade Band for query selection", () => {
  assert.match(source, /gradeBand:\s*"Grade Band"/);
  assert.match(
    source,
    /video:\s*\{[\s\S]*gradeBand:\s*"Grade Band"[\s\S]*\}[\s\S]*enrollments:/
  );
  assert.match(
    source,
    /getLinkedIds\(videoRecord,\s*videoTable,\s*CONFIG\.video\.gradeBand\)/
  );
  assert.doesNotMatch(
    source,
    /getLinkedIds\(videoRecord,\s*videoTable,\s*"Grade Band"\)/
  );
});

test("Video Feedback query selects Object.values(CONFIG.video)", () => {
  assert.match(
    source,
    /const videoFields = Object\.values\(CONFIG\.video\)\.filter\(name => fieldExists\(videoTable, name\)\)/
  );
  assert.match(source, /videoTable\.selectRecordsAsync\(\{\s*fields:\s*videoFields\s*\}\)/);
});

test("audit remains read-only", () => {
  assert.strictEqual(source.includes("updateRecordAsync"), false);
  assert.strictEqual(source.includes("createRecordAsync"), false);
  assert.strictEqual(source.includes("deleteRecordAsync"), false);
});

function makeAuditFixtureTable(fields, rows) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    getField(fieldName) {
      if (!fields.includes(fieldName)) throw new Error(`missing field ${fieldName}`);
      return { name: fieldName };
    },
    async selectRecordsAsync(options = {}) {
      const loadedFields = new Set(options.fields || []);
      const wrap = (row) => ({
        id: row.id,
        name: row.name || row.id,
        getCellValue(fieldName) {
          if (!loadedFields.has(fieldName)) {
            throw new Error(
              `Field "${fieldName}" isn't in this record. Make sure it was included in the QueryResult this record comes from`
            );
          }
          return row.values[fieldName] ?? null;
        },
        getCellValueAsString(fieldName) {
          if (!loadedFields.has(fieldName)) {
            throw new Error(
              `Field "${fieldName}" isn't in this record. Make sure it was included in the QueryResult this record comes from`
            );
          }
          const value = row.values[fieldName];
          if (value == null) return "";
          if (Array.isArray(value)) {
            return value.map((item) => item.name || item.id || item).join(", ");
          }
          return String(value);
        },
      });
      return {
        records: rows.map(wrap),
        getRecord(recordId) {
          const row = byId.get(recordId);
          if (!row) throw new Error(`missing record ${recordId}`);
          return wrap(row);
        },
      };
    },
  };
}

async function runVideoGradeBandFixture() {
  const videoFields = [
    "Submission",
    "Enrollment",
    "Grade Band",
    "Total Video XP Awarded",
    "Do Not Award XP?",
    "Award Status",
    "Feedback Posted?",
    "Active?",
    "Ready for XP Automation?",
    "XP Events",
    "Video Feedback Key",
    "Upload Status",
  ];
  const submissionFields = [
    "Enrollment",
    "Week",
    "Count This Submission?",
    "Activity Date",
    "Weekly Athlete Summary",
  ];
  const enrollmentFields = [
    "Active?",
    "Athlete",
    "Program Instance",
    "School Year",
    "Grade Band",
  ];
  const xpFields = [
    "Source Key",
    "XP Dedupe Key Normalized",
    "Video Feedback",
    "Enrollment",
    "Submission",
    "Week",
    "Weekly Athlete Summary",
    "XP Points",
    "XP Source",
    "XP Bucket",
    "Active?",
  ];
  const wasFields = ["Enrollment", "Week"];

  const tables = {
    "Video Feedback": makeAuditFixtureTable(videoFields, [
      {
        id: "recVideoWithGradeBand",
        name: "Fixture Video Feedback",
        values: {
          Submission: [{ id: "recSubmission" }],
          Enrollment: [{ id: "recEnrollment" }],
          "Grade Band": [{ id: "recGradeBand", name: "K-2" }],
          "Total Video XP Awarded": 25,
          "Do Not Award XP?": false,
          "Award Status": { name: "Awarded" },
          "Feedback Posted?": true,
          "Active?": true,
          "Ready for XP Automation?": true,
          "XP Events": [{ id: "recXp" }],
          "Video Feedback Key": "fixture-video-key",
          "Upload Status": { name: "Posted" },
        },
      },
    ]),
    Submissions: makeAuditFixtureTable(submissionFields, [
      {
        id: "recSubmission",
        values: {
          Enrollment: [{ id: "recEnrollment" }],
          Week: [{ id: "recWeek" }],
          "Count This Submission?": true,
          "Activity Date": "2026-08-01",
          "Weekly Athlete Summary": [{ id: "recWas" }],
        },
      },
    ]),
    Enrollments: makeAuditFixtureTable(enrollmentFields, [
      {
        id: "recEnrollment",
        values: {
          "Active?": true,
          Athlete: [{ id: "recAthlete" }],
          "Program Instance": [{ id: "recProgram" }],
          "School Year": "2025-2026",
          "Grade Band": [{ id: "recGradeBand", name: "K-2" }],
        },
      },
    ]),
    "XP Events": makeAuditFixtureTable(xpFields, [
      {
        id: "recXp",
        values: {
          "Source Key": "VIDEO_SUBMISSION|recVideoWithGradeBand",
          "Video Feedback": [{ id: "recVideoWithGradeBand" }],
          Enrollment: [{ id: "recEnrollment" }],
          Submission: [{ id: "recSubmission" }],
          Week: [{ id: "recWeek" }],
          "Weekly Athlete Summary": [{ id: "recWas" }],
          "XP Points": 25,
          "XP Source": { name: "Video Submission" },
          "XP Bucket": { name: "Video Feedback" },
          "Active?": true,
        },
      },
    ]),
    "Weekly Athlete Summary": makeAuditFixtureTable(wasFields, [
      {
        id: "recWas",
        values: {
          Enrollment: [{ id: "recEnrollment" }],
          Week: [{ id: "recWeek" }],
        },
      },
    ]),
  };

  const logs = [];
  const context = {
    base: { getTable: (tableName) => tables[tableName] },
    console: { log: (...args) => logs.push(args.join(" ")) },
    Intl,
    Date,
    Set,
    Map,
    Object,
    String,
    Number,
    Array,
    RegExp,
    Boolean,
  };

  const executableSource = source.replace(/\nawait main\(\);\s*$/, "");
  await vm.runInNewContext(
    `(async function () {
      ${executableSource}
      return main();
    })()`,
    context
  );

  const reportText = logs.find((line) => line.trim().startsWith("{"));
  assert.ok(reportText, "audit should emit a JSON report");
  const report = JSON.parse(reportText);
  assert.strictEqual(report.script, "audit-video-xp-pipeline-integrity");
  assert.strictEqual(report.dryRun, true);
  assert.strictEqual(report.videoFeedbackChecked, 1);
  assert.ok((report.okCount || 0) + (report.issueTotal || 0) >= 1);
  assert.doesNotThrow(() => JSON.stringify(report));
}

runVideoGradeBandFixture()
  .then(() => {
    console.log("ok - Video Feedback Grade Band fixture completes without QueryResult field error");
    console.log("\nAll audit-video-xp-pipeline-integrity regression tests passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
