#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const auditSource = fs.readFileSync(
  path.join(__dirname, "../../airtable/extension-scripts/audits/audit-achievement-xp-pipeline-integrity.js"),
  "utf8"
);
const link = (ids) => ids.map((id) => ({ id }));
const clone = (value) => JSON.parse(JSON.stringify(value));

function makeRuntime(seed) {
  let mutationCalls = 0;
  const logs = [];
  const table = (name) => {
    const definition = seed[name];
    const available = new Set(definition.fields);
    const getField = (fieldName) => {
      if (!available.has(fieldName)) throw new Error(`Unknown field ${name}.${fieldName}`);
      return { name: fieldName };
    };
    return {
      getField,
      async selectRecordsAsync({ fields }) {
        assert.deepEqual([...new Set(fields)].sort(), [...fields].sort(), `${name} requests each field once`);
        fields.forEach(getField);
        const selected = new Set(fields);
        return {
          records: definition.records.map((row) => ({
            id: row.id,
            name: row.name || row.id,
            getCellValue(fieldName) {
              if (!selected.has(fieldName)) throw new Error(`Read unloaded field ${name}.${fieldName}`);
              return clone(row.fields[fieldName] ?? null);
            },
            getCellValueAsString(fieldName) {
              const value = this.getCellValue(fieldName);
              return Array.isArray(value)
                ? value.map((item) => item.name || item.id).join(", ")
                : value?.name || String(value ?? "");
            },
          })),
        };
      },
      async createRecordAsync() { mutationCalls += 1; throw new Error("Audit must not create records"); },
      async createRecordsAsync() { mutationCalls += 1; throw new Error("Audit must not create records"); },
      async updateRecordAsync() { mutationCalls += 1; throw new Error("Audit must not update records"); },
      async updateRecordsAsync() { mutationCalls += 1; throw new Error("Audit must not update records"); },
      async deleteRecordAsync() { mutationCalls += 1; throw new Error("Audit must not delete records"); },
      async deleteRecordsAsync() { mutationCalls += 1; throw new Error("Audit must not delete records"); },
    };
  };
  return {
    async run() {
      await vm.runInNewContext(`(async () => { ${auditSource} })()`, {
        base: { getTable: table },
        console: { log: (...args) => logs.push(args.join(" ")) },
        Promise, Map, Set, Object, String, Number, Array, Date, JSON, Boolean, Error,
      });
      return {
        mutationCalls,
        report: JSON.parse(logs.find((line) => line.includes('"dryRun": true'))),
      };
    },
  };
}

(async () => {
  const unlockFields = [
    "Active?", "Achievement", "Enrollment", "Week", "Shot Milestone", "Source Key",
    "Milestone Source Key", "XP Award Status", "XP Awarded", "XP Events", "Weekly Athlete Summary",
  ];
  const streakFields = [
    "Active?", "Enrollment", "Achievement", "Week", "Streak End Date", "Source Status",
    "XP Events", "Streak Occurrence Key",
  ];
  const xpFields = [
    "Active?", "Source Key", "Achievement Unlock", "Streak Occurrence", "Enrollment", "Week",
    "Weekly Athlete Summary", "XP Points", "XP Source", "XP Bucket",
  ];
  const runtime = makeRuntime({
    "Athlete Achievement Unlocks": {
      fields: unlockFields,
      records: [{
        id: "recUnlock",
        fields: {
          "Active?": false, Enrollment: link(["recEnrollment"]), Week: link(["recWeek"]),
          "Source Key": "PERFECT_WEEK|recEnrollment|recWeek", "XP Award Status": { name: "Awarded" },
          "XP Awarded": 20, "XP Events": link(["recXp1", "recXp2"]),
        },
      }],
    },
    "Streak Occurrences": { fields: streakFields, records: [] },
    "XP Events": {
      fields: xpFields,
      records: ["recXp1", "recXp2"].map((id) => ({
        id,
        fields: {
          "Active?": true, "Source Key": "PERFECT_WEEK|recEnrollment|recWeek",
          "Achievement Unlock": link(["recUnlock"]), Enrollment: link(["recEnrollment"]),
          Week: link(["recWeek"]), "Weekly Athlete Summary": link(["recWas"]),
          "XP Points": 20, "XP Source": "Perfect Week", "XP Bucket": "Perfect Week",
        },
      })),
    },
    "Weekly Athlete Summary": {
      fields: ["Enrollment", "Week"],
      records: [{ id: "recWas", fields: { Enrollment: link(["recEnrollment"]), Week: link(["recWeek"]) } }],
    },
  });
  const { mutationCalls, report } = await runtime.run();
  assert.equal(mutationCalls, 0, "audit performs no create, update, or delete calls");
  assert.equal(report.dryRun, true);
  assert.equal(report.issueCounts.active_state_drift, 2, "inactive unlock versus active exact XP is reported");
  assert.equal(report.issueCounts.duplicate_canonical_xp_source_key, 1, "duplicate exact canonical source key is reported");
  console.log("PASS achievement XP audit is read-only and finds lifecycle drift plus duplicate keys");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
