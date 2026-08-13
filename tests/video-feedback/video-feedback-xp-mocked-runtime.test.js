#!/usr/bin/env node
"use strict";

/**
 * Executes the committed 113 and 114 scripts in a minimal Airtable-compatible
 * mock. This is runtime coverage, not installed-Airtable or Production proof.
 * Run: node tests/video-feedback/video-feedback-xp-mocked-runtime.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "../..");
const script113 = fs.readFileSync(
  path.join(ROOT, "airtable/automations/shooting-challenge/113-video-review-and-xp-assign-base-video-xp.js"),
  "utf8"
);
const script114 = fs.readFileSync(
  path.join(ROOT, "airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js"),
  "utf8"
);

const LINK_INVERSES = {
  "Video Feedback": {
    "XP Events": ["XP Events", "Video Feedback"],
  },
  "XP Events": {
    "Video Feedback": ["Video Feedback", "XP Events"],
    "Weekly Athlete Summary": ["Weekly Athlete Summary", "XP Events"],
  },
};

const SCHEMA = {
  "Video Feedback": {
    "Feedback Posted?": "checkbox",
    "Do Not Award XP?": "checkbox",
    "Active?": "checkbox",
    "Coach Feedback": "multilineText",
    Enrollment: "multipleRecordLinks",
    Submission: "multipleRecordLinks",
    "XP Events": "multipleRecordLinks",
    "Base XP Awarded": "number",
    "Total Video XP Awarded": "formula",
    "Award Status": ["singleSelect", ["Pending", "Awarded", "Do Not Award"]],
    "Ready for XP Automation?": "checkbox",
    "Video Feedback Workflow Status": ["singleSelect", ["Ready for XP"]],
    "Video Feedback Key": "singleLineText",
  },
  Submissions: {
    Enrollment: "multipleRecordLinks",
    Week: "multipleRecordLinks",
    "Activity Date": "date",
    "Weekly Athlete Summary": "multipleRecordLinks",
  },
  Enrollments: { "Active?": "checkbox" },
  "XP Reward Rules": {
    "Active?": "checkbox",
    "Rule Key": "singleLineText",
    "Reward Rule": "singleLineText",
    "XP Amount": "number",
  },
  "XP Events": {
    Enrollment: "multipleRecordLinks",
    Submission: "multipleRecordLinks",
    Week: "multipleRecordLinks",
    "Weekly Athlete Summary": "multipleRecordLinks",
    "Video Feedback": "multipleRecordLinks",
    "XP Source": ["singleSelect", ["Video Submission"]],
    "XP Bucket": ["singleSelect", ["Video Feedback"]],
    "XP Points": "number",
    "XP Reason Public": "multilineText",
    "XP Reason Debug": "multilineText",
    "Active?": "checkbox",
    "Source Key": "singleLineText",
    "XP Dedupe Key Normalized": "formula",
  },
  "Weekly Athlete Summary": {
    Enrollment: "multipleRecordLinks",
    Week: "multipleRecordLinks",
    "XP Events": "multipleRecordLinks",
  },
};

function field(name, definition) {
  const [type, choices] = Array.isArray(definition) ? definition : [definition, []];
  return {
    name,
    type,
    isComputed: type === "formula",
    options: type === "singleSelect"
      ? { choices: choices.map((choice, index) => ({ id: `sel${index}-${choice}`, name: choice })) }
      : {},
  };
}

function ids(value) {
  return Array.isArray(value) ? value.map((entry) => entry.id).filter(Boolean) : [];
}

function links(values) {
  return values.map((id) => ({ id }));
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createRuntime(seed, options = {}) {
  const records = {};
  let nextId = 1;
  for (const [table, rows] of Object.entries(seed)) {
    records[table] = new Map(rows.map((row) => [row.id, clone(row)]));
  }

  function ensureTable(name) {
    if (!records[name]) records[name] = new Map();
    return records[name];
  }

  function syncInverse(tableName, recordId, fieldName, before, after) {
    const inverse = LINK_INVERSES[tableName]?.[fieldName];
    if (!inverse) return;
    const [targetTable, targetField] = inverse;
    for (const targetId of new Set([...ids(before), ...ids(after)])) {
      const target = ensureTable(targetTable).get(targetId);
      if (!target) continue;
      const existing = ids(target.fields[targetField]);
      const retained = existing.filter((id) => id !== recordId);
      if (ids(after).includes(targetId)) retained.push(recordId);
      target.fields[targetField] = links([...new Set(retained)]);
    }
  }

  function update(tableName, recordId, changes) {
    const row = ensureTable(tableName).get(recordId);
    if (!row) throw new Error(`Missing ${tableName} record ${recordId}`);
    for (const [fieldName, value] of Object.entries(changes)) {
      const before = clone(row.fields[fieldName]);
      row.fields[fieldName] = clone(value);
      syncInverse(tableName, recordId, fieldName, before, value);
    }
  }

  function recordView(tableName, row, selected) {
    return {
      id: row.id,
      name: row.name || row.id,
      getCellValue(fieldName) {
        if (selected && !selected.has(fieldName)) return null;
        return clone(row.fields[fieldName] ?? null);
      },
      getCellValueAsString(fieldName) {
        const value = this.getCellValue(fieldName);
        if (value === null || value === undefined) return "";
        if (Array.isArray(value)) return value.map((entry) => entry.name || entry.id).join(", ");
        if (typeof value === "object") return String(value.name || "");
        return String(value);
      },
    };
  }

  function table(name) {
    const definitions = SCHEMA[name];
    if (!definitions) throw new Error(`Unknown table ${name}`);
    const fields = Object.entries(definitions).map(([fieldName, definition]) => field(fieldName, definition));
    const getField = (fieldName) => {
      const found = fields.find((item) => item.name === fieldName);
      if (!found) throw new Error(`Missing required field: ${name}.${fieldName}`);
      return found;
    };
    return {
      name,
      fields,
      getField,
      async selectRecordAsync(recordId) {
        const row = ensureTable(name).get(recordId);
        return row ? recordView(name, row, null) : null;
      },
      async selectRecordsAsync({ fields: requestedFields } = {}) {
        const selected = requestedFields ? new Set(requestedFields) : null;
        const rows = [...ensureTable(name).values()].map((row) => recordView(name, row, selected));
        options.onSelectRecords?.({ tableName: name, count: options.selectCounts[name] = (options.selectCounts[name] || 0) + 1, records, update });
        return {
          records: rows,
          getRecord: (recordId) => rows.find((row) => row.id === recordId) || null,
          unloadData() {},
        };
      },
      async createRecordAsync(changes) {
        const id = `recXP${nextId++}`;
        ensureTable(name).set(id, { id, fields: {} });
        update(name, id, changes);
        return id;
      },
      async updateRecordAsync(recordId, changes) {
        update(name, recordId, changes);
      },
    };
  }

  return {
    records,
    run: async (source, recordId) => {
      const outputValues = {};
      const context = {
        base: { getTable: table },
        input: { config: () => ({ recordId }) },
        output: { set: (name, value) => { outputValues[name] = value; } },
        console,
        Date,
        Intl,
        Promise,
        setTimeout,
        clearTimeout,
      };
      const result = vm.runInNewContext(`(async () => {\n${source}\n})()`, context, {
        filename: "automation-under-test.js",
      });
      await result;
      return outputValues;
    },
  };
}

function video(id, patch = {}) {
  return {
    id,
    fields: {
      "Feedback Posted?": true,
      "Do Not Award XP?": false,
      "Active?": true,
      "Coach Feedback": "Good form.",
      Enrollment: links(["recEnrollment"]),
      Submission: links(["recSubmission"]),
      "XP Events": [],
      "Base XP Awarded": 0,
      "Total Video XP Awarded": 25,
      "Award Status": { name: "Pending" },
      "Ready for XP Automation?": false,
      "Video Feedback Workflow Status": { name: "Ready for XP" },
      "Video Feedback Key": `VIDEO_FEEDBACK|${id}`,
      ...patch,
    },
  };
}

function seed(videoRows) {
  return {
    "Video Feedback": videoRows,
    Submissions: [{
      id: "recSubmission",
      fields: {
        Enrollment: links(["recEnrollment"]),
        Week: links(["recWeek"]),
        "Activity Date": "2026-08-12",
        "Weekly Athlete Summary": links(["recWAS"]),
      },
    }],
    Enrollments: [{ id: "recEnrollment", fields: { "Active?": true } }],
    "Weekly Athlete Summary": [{
      id: "recWAS",
      fields: { Enrollment: links(["recEnrollment"]), Week: links(["recWeek"]), "XP Events": [] },
    }],
    "XP Reward Rules": [{
      id: "recRule",
      fields: {
        "Active?": true,
        "Rule Key": "VIDEO_SUBMISSION",
        "Reward Rule": "Video Submission",
        "XP Amount": 25,
      },
    }],
    "XP Events": [],
  };
}

function events(runtime) {
  return [...runtime.records["XP Events"].values()];
}

async function prepareAndAward(runtime, videoId, expectedStatus = "created") {
  const prepared = await runtime.run(script113, videoId);
  assert.strictEqual(prepared.statusOut, "success");
  assert.strictEqual(prepared.actionOut, "assigned_base_xp_and_armed_114");
  const awarded = await runtime.run(script114, videoId);
  assert.strictEqual(awarded.statusOut, expectedStatus);
  return awarded;
}

async function test(name, fn) {
  await fn();
  console.log(`ok - ${name}`);
}

(async () => {
  await test("113 and 114 execute award, replay, and WAS linkage", async () => {
    const runtime = createRuntime(seed([video("recVideoOne")]));
    const awarded = await prepareAndAward(runtime, "recVideoOne");
    const event = events(runtime)[0];
    assert.strictEqual(event.id, awarded.xpEventIdOut);
    assert.strictEqual(event.fields["Source Key"], "VIDEO_SUBMISSION|recVideoOne");
    assert.deepStrictEqual(ids(event.fields["Weekly Athlete Summary"]), ["recWAS"]);
    assert.strictEqual(events(runtime).length, 1);

    updateReady(runtime, "recVideoOne", true);
    const replay = await runtime.run(script114, "recVideoOne");
    assert.match(replay.statusOut, /updated/);
    assert.strictEqual(replay.xpEventIdOut, event.id);
    assert.strictEqual(events(runtime).length, 1);
  });

  await test("three Video Feedback records award three canonical events", async () => {
    const runtime = createRuntime(seed([video("recVideoOne"), video("recVideoTwo"), video("recVideoThree")]));
    for (const id of ["recVideoOne", "recVideoTwo", "recVideoThree"]) await prepareAndAward(runtime, id);
    assert.deepStrictEqual(
      events(runtime).map((event) => event.fields["Source Key"]).sort(),
      ["recVideoOne", "recVideoThree", "recVideoTwo"].map((id) => `VIDEO_SUBMISSION|${id}`).sort()
    );
  });

  await test("Do Not Award, unposted, and inactive feedback deactivate the same event", async () => {
    for (const [fieldName, value] of [
      ["Do Not Award XP?", true],
      ["Feedback Posted?", false],
      ["Active?", false],
    ]) {
      const runtime = createRuntime(seed([video("recVideoOne")]));
      await prepareAndAward(runtime, "recVideoOne");
      setVideo(runtime, "recVideoOne", fieldName, value);
      const result = await runtime.run(script114, "recVideoOne");
      assert.strictEqual(result.statusOut, "skipped");
      assert.strictEqual(events(runtime)[0].fields["Active?"], false);
    }
  });

  await test("113 re-arms and 114 restores the same canonical event ID", async () => {
    const runtime = createRuntime(seed([video("recVideoOne")]));
    const awarded = await prepareAndAward(runtime, "recVideoOne");
    setVideo(runtime, "recVideoOne", "Do Not Award XP?", true);
    await runtime.run(script114, "recVideoOne");
    setVideo(runtime, "recVideoOne", "Do Not Award XP?", false);
    const restored = await prepareAndAward(runtime, "recVideoOne", "updated");
    assert.strictEqual(restored.xpEventIdOut, awarded.xpEventIdOut);
    assert.strictEqual(events(runtime).length, 1);
    assert.strictEqual(events(runtime)[0].fields["Active?"], true);
  });

  await test("wrong-owner and duplicate-key events fail closed", async () => {
    const wrongOwner = seed([video("recVideoOne")]);
    wrongOwner["XP Events"] = [{
      id: "recWrong",
      fields: {
        "Source Key": "VIDEO_SUBMISSION|recVideoOther",
        "Video Feedback": links(["recVideoOther"]),
        Enrollment: links(["recEnrollment"]),
        Submission: links(["recSubmission"]),
        Week: links(["recWeek"]),
        "XP Bucket": { name: "Video Feedback" },
        "Active?": true,
      },
    }];
    wrongOwner["Video Feedback"][0].fields["XP Events"] = links(["recWrong"]);
    await assert.rejects(() => createRuntime(wrongOwner).run(script114, "recVideoOne"), /does not belong|conflicts/);

    const duplicate = seed([video("recVideoOne")]);
    duplicate["XP Events"] = ["recDuplicateA", "recDuplicateB"].map((id) => ({
      id,
      fields: {
        "Source Key": "VIDEO_SUBMISSION|recVideoOne",
        "Video Feedback": links(["recVideoOne"]),
        Enrollment: links(["recEnrollment"]),
        Submission: links(["recSubmission"]),
        Week: links(["recWeek"]),
        "XP Bucket": { name: "Video Feedback" },
        "Active?": true,
      },
    }));
    await assert.rejects(() => createRuntime(duplicate).run(script114, "recVideoOne"), /Duplicate XP Events/);
  });

  await test("last-chance recheck adopts a concurrent canonical event", async () => {
    const runtime = createRuntime(seed([video("recVideoOne", { "Ready for XP Automation?": true })]), {
      selectCounts: {},
      onSelectRecords({ tableName, count, records }) {
        if (tableName === "XP Events" && count === 2) {
          records["XP Events"].set("recConcurrent", {
            id: "recConcurrent",
            fields: {
              "Source Key": "VIDEO_SUBMISSION|recVideoOne",
              "Video Feedback": links(["recVideoOne"]),
              Enrollment: links(["recEnrollment"]),
              Submission: links(["recSubmission"]),
              Week: links(["recWeek"]),
              "XP Bucket": { name: "Video Feedback" },
              "Active?": false,
            },
          });
        }
      },
    });
    const result = await runtime.run(script114, "recVideoOne");
    assert.strictEqual(result.actionOut, "updated-after-recheck");
    assert.strictEqual(result.xpEventIdOut, "recConcurrent");
    assert.strictEqual(events(runtime).length, 1);
  });

  await test("existing canonical event receives the canonical WAS repair", async () => {
    const fixture = seed([video("recVideoOne", { "Ready for XP Automation?": true })]);
    fixture["XP Events"] = [{
      id: "recExisting",
      fields: {
        "Source Key": "VIDEO_SUBMISSION|recVideoOne",
        "Video Feedback": links(["recVideoOne"]),
        Enrollment: links(["recEnrollment"]),
        Submission: links(["recSubmission"]),
        Week: links(["recWeek"]),
        "XP Bucket": { name: "Video Feedback" },
        "Active?": false,
      },
    }];
    const runtime = createRuntime(fixture);
    const result = await runtime.run(script114, "recVideoOne");
    assert.strictEqual(result.xpEventIdOut, "recExisting");
    assert.deepStrictEqual(ids(events(runtime)[0].fields["Weekly Athlete Summary"]), ["recWAS"]);
  });

  console.log("PASS 7 Video XP mocked-runtime contracts");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function setVideo(runtime, recordId, fieldName, value) {
  runtime.records["Video Feedback"].get(recordId).fields[fieldName] = value;
}

function updateReady(runtime, recordId, value) {
  setVideo(runtime, recordId, "Ready for XP Automation?", value);
}
