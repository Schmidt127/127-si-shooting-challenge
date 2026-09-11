#!/usr/bin/env node
"use strict";

/**
 * Runs committed 073 against season-simulation-shaped fixtures (offline).
 * XP gates are satisfied by seeded XP Events — no email send, no production.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "../..");
const script073 = fs.readFileSync(
  path.join(
    ROOT,
    "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js"
  ),
  "utf8"
);

const MARKER = "SEASON-SIM|SEASON-SIM-2027-test";
const canonicalKey = (id) => `VIDEO_FEEDBACK|${id}`;
const lambdaUrl = (id) =>
  `https://season-sim-viewer.lambda-url.us-east-2.on.aws/file/${id}?token=season-sim-viewer-token`;
const sourceAttachmentId = (marker, day) =>
  `${marker}|SA|VIDEO|D${String(day).padStart(2, "0")}`;
const videoUploadAttachment = (sourceId, filename) => [
  { id: sourceId, url: "https://invalid.example/season-sim/video-placeholder", filename },
];
const handoffKey = (vfId) => `VIDEO_FEEDBACK|VIDEO_FEEDBACK|${vfId}`;
const VF_ID = "recVfSimBundle001";
const ASSET_ID = "recAssetSimBund01";
const SUB_ID = "recSubSimBundle01";
const ENR_ID = "recEnrSimBundle01";
const WEEK_ID = "recWeekSimBund01";
const XP_ID = "recXpSimBundle001";
const PI_ID = "recPISimBundle001";

const SCHEMA = {
  "Video Feedback": {
    Enrollment: "multipleRecordLinks",
    Submission: "multipleRecordLinks",
    "Submission Asset": "multipleRecordLinks",
    "Active?": "checkbox",
    "Feedback Posted?": "checkbox",
    "Parent Feedback Ready?": "checkbox",
    "Parent Feedback Sent?": "checkbox",
    "Coach Feedback": "multilineText",
    "Video Feedback Key": "singleLineText",
    Week: "singleLineText",
    "Video URL or Drive Link": "url",
    "Base XP Awarded": "number",
    "Total Video XP Awarded": "number",
    "XP Events": "multipleRecordLinks",
    "Video Feedback Name": "singleLineText",
    "Video Asset File Name": "singleLineText",
    "Custom Video File Name": "singleLineText",
    "Upload Status": ["singleSelect", ["Uploaded", "Pending"]],
  },
  Submissions: {
    Enrollment: "multipleRecordLinks",
    Week: "multipleRecordLinks",
    "Activity Date": "date",
    "Count This Submission?": "formula",
    "Video Upload": "multipleAttachments",
    "Video Upload Note": "multilineText",
    "Season Sim Test Record?": "checkbox",
    "Season Sim Clock Now": "date",
  },
  "Submission Assets": {
    "Submission - Linked": "multipleRecordLinks",
    "Enrollment - Linked": "multipleRecordLinks",
    "Video Feedback": "multipleRecordLinks",
    "Is True Video Feedback Asset?": "formula",
    "Asset Slot": "singleLineText",
    "Asset Purpose": "singleLineText",
    "Original File Name": "singleLineText",
  },
  Enrollments: {
    "Active?": "checkbox",
    "Parent Email - Cleaned": "email",
    "Parent First Name": "singleLineText",
    "Full Athlete Name": "singleLineText",
    "Athlete First Name": "singleLineText",
    "Program Instance": "multipleRecordLinks",
  },
  "XP Events": {
    "Active?": "checkbox",
    Enrollment: "multipleRecordLinks",
    Week: "multipleRecordLinks",
    "Video Feedback": "multipleRecordLinks",
    "XP Points": "number",
  },
  "Email Handoff Queue": {
    "Handoff Key": "singleLineText",
    Status: ["singleSelect", ["Draft", "Ready", "Needs Review"]],
    "Event Type": "singleLineText",
    "Payload JSON": "multilineText",
    "Recipients JSON": "multilineText",
    "Template Key": "singleLineText",
    "Test Mode?": "checkbox",
    "Program Instance Record ID": "singleLineText",
    "Source Record ID": "singleLineText",
    "Enrollment Record ID": "singleLineText",
    "Source Table": "singleLineText",
    "Attempt Count": "number",
  },
  "Program Instance - Sync": {
    "Name - Program Instance": "singleLineText",
  },
};

function field(name, definition) {
  const [type, choices] = Array.isArray(definition) ? definition : [definition, []];
  return {
    name,
    type,
    options: type === "singleSelect" ? { choices: choices.map((c, i) => ({ id: `sel${i}`, name: c })) } : {},
  };
}

function links(ids) {
  return ids.map((id) => ({ id }));
}

function createRuntime(seed) {
  const records = {};
  for (const [table, rows] of Object.entries(seed)) {
    records[table] = new Map(rows.map((row) => [row.id, JSON.parse(JSON.stringify(row))]));
  }
  let queueId = 1;
  function table(name) {
    const defs = SCHEMA[name];
    const fields = Object.entries(defs).map(([n, d]) => field(n, d));
    const getField = (fieldName) => {
      const found = fields.find((f) => f.name === fieldName);
      if (!found) throw new Error(`Missing ${name}.${fieldName}`);
      return found;
    };
    return {
      name,
      fields,
      getField,
      async selectRecordAsync(recordId) {
        const row = records[name]?.get(recordId);
        if (!row) return null;
        return recordView(name, row);
      },
      async selectRecordsAsync({ filterByFormula } = {}) {
        void filterByFormula;
        return {
          records: [...(records[name]?.values() || [])].map((row) => recordView(name, row)),
          unloadData() {},
        };
      },
      async createRecordAsync(cells) {
        const id = `recQueue${queueId++}`;
        records[name].set(id, { id, fields: cells });
        return id;
      },
      async updateRecordAsync(recordId, cells) {
        records[name].get(recordId).fields = { ...records[name].get(recordId).fields, ...cells };
      },
    };
  }
  function recordView(tableName, row) {
    return {
      id: row.id,
      getCellValue(fieldName) {
        return row.fields[fieldName] ?? null;
      },
      getCellValueAsString(fieldName) {
        const value = row.fields[fieldName];
        if (value === null || value === undefined) return "";
        if (Array.isArray(value)) return value.map((v) => v.name || v.id || v).join(", ");
        if (typeof value === "object" && value.name) return value.name;
        return String(value);
      },
    };
  }
  return {
    records,
    run: async (recordId, testMode = true) => {
      const outputValues = {};
      const context = {
        base: { getTable: table },
        input: { config: () => ({ recordId, testMode }) },
        output: { set: (k, v) => { outputValues[k] = v; } },
        console,
        Date,
        Intl,
        Promise,
        URL,
      };
      await vm.runInNewContext(`(async () => {\n${script073}\n})()`, context, {
        filename: "073-under-test.js",
      });
      return outputValues;
    },
  };
}

function seasonSimSeed(overrides = {}) {
  const sourceId = sourceAttachmentId(MARKER, 5);
  const filename = "season-sim-video-d05.mp4";
  const vfFields = {
    Enrollment: links([ENR_ID]),
    Submission: links([SUB_ID]),
    "Submission Asset": links([ASSET_ID]),
    "Active?": true,
    "Feedback Posted?": true,
    "Parent Feedback Ready?": true,
    "Parent Feedback Sent?": false,
    "Coach Feedback": `${MARKER}|video review`,
    "Video Feedback Key": canonicalKey(ASSET_ID),
    Week: "Week 1",
    "Video URL or Drive Link": lambdaUrl(ASSET_ID),
    "Base XP Awarded": 25,
    "Total Video XP Awarded": 25,
    "XP Events": links([XP_ID]),
    "Video Asset File Name": filename,
    ...overrides.vf,
  };
  return {
    "Video Feedback": [{ id: VF_ID, fields: vfFields }],
    Submissions: [{
      id: SUB_ID,
      fields: {
        Enrollment: links([ENR_ID]),
        Week: links([WEEK_ID]),
        "Activity Date": "2027-05-05",
        "Count This Submission?": 1,
        "Video Upload": videoUploadAttachment(sourceId, filename),
        "Video Upload Note": MARKER,
        "Season Sim Test Record?": true,
        "Season Sim Clock Now": "2027-05-05",
        ...(overrides.sub || {}),
      },
    }],
    "Submission Assets": [{
      id: ASSET_ID,
      fields: {
        "Submission - Linked": links([SUB_ID]),
        "Enrollment - Linked": links([ENR_ID]),
        "Video Feedback": links([VF_ID]),
        "Is True Video Feedback Asset?": 1,
        "Asset Slot": "VIDEO",
        "Asset Purpose": "Video For Feedback",
        "Original File Name": filename,
        ...(overrides.asset || {}),
      },
    }],
    Enrollments: [{
      id: ENR_ID,
      fields: {
        "Active?": true,
        "Parent Email - Cleaned": "schmidt@fairfieldbasketballclub.com",
        "Parent First Name": "Test",
        "Full Athlete Name": "Sim Athlete",
        "Athlete First Name": "Sim",
        "Program Instance": links([PI_ID]),
      },
    }],
    "XP Events": [{
      id: XP_ID,
      fields: {
        "Active?": true,
        Enrollment: links([ENR_ID]),
        Week: links([WEEK_ID]),
        "Video Feedback": links([VF_ID]),
        "XP Points": 25,
      },
    }],
    "Email Handoff Queue": [],
    "Program Instance - Sync": [{ id: PI_ID, fields: { "Name - Program Instance": "Shooting Challenge" } }],
  };
}

async function test(name, fn) {
  await fn();
  console.log(`ok - ${name}`);
}

(async () => {
  await test("073 creates VIDEO_FEEDBACK handoff from season-sim-shaped fixture", async () => {
    const runtime = createRuntime(seasonSimSeed());
    const vfRow = runtime.records["Video Feedback"].get(VF_ID);
    assert.ok(vfRow?.fields?.["Video URL or Drive Link"]?.includes("lambda-url"));
    const result = await runtime.run(VF_ID, true);
    assert.strictEqual(result.statusOut, "success");
    assert.strictEqual(result.actionOut, "created_handoff");
    assert.strictEqual(result.handoffKey, handoffKey(VF_ID));
    const queue = [...runtime.records["Email Handoff Queue"].values()][0];
    assert.ok(queue);
    assert.strictEqual(queue.fields["Event Type"], "VIDEO_FEEDBACK");
    assert.strictEqual(queue.fields["Handoff Key"], handoffKey(VF_ID));
    assert.strictEqual(queue.fields["Test Mode?"], true);
    const payload = JSON.parse(queue.fields["Payload JSON"]);
    assert.ok(payload.coachFeedback);
    assert.ok(String(payload.videoUrl || "").includes("lambda-url.us-east-2.on.aws"));
    const recipients = JSON.parse(queue.fields["Recipients JSON"]);
    assert.strictEqual(recipients[0].email, "schmidt@fairfieldbasketballclub.com");
    assert.strictEqual(queue.fields["Test Mode?"], true);
  });

  await test("073 fail-closed without Submission Asset link", async () => {
    const runtime = createRuntime(seasonSimSeed({ vf: { "Submission Asset": [] } }));
    await assert.rejects(() => runtime.run(VF_ID), /Submission Asset must contain exactly one/);
  });

  await test("073 fail-closed without Video Upload on Submission", async () => {
    const runtime = createRuntime(seasonSimSeed({ sub: { "Video Upload": [] } }));
    await assert.rejects(() => runtime.run(VF_ID), /no Video Upload/);
  });

  await test("073 fail-closed without Lambda viewer URL", async () => {
    const runtime = createRuntime(seasonSimSeed({ vf: { "Video URL or Drive Link": "" } }));
    await assert.rejects(() => runtime.run(VF_ID), /blank|Lambda viewer URL required/);
  });

  console.log("PASS video-feedback-073-season-sim-mocked-runtime");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
