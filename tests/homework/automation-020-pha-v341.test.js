#!/usr/bin/env node
"use strict";

/**
 * Offline harness tests for Automation 020 v3.4.1 — PHA-authoritative intake.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const scriptPath = path.resolve(
  __dirname,
  "../../airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
);
const source = fs.readFileSync(scriptPath, "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const IDS = {
  asset: "recAsset020",
  submission: "recSub020",
  enrollmentCurrent: "recEnr2027",
  enrollmentLegacy: "recEnrLegacy",
  pi2027: "recPi2027",
  piLegacy: "recPiLegacy",
  week1: "recWeek1",
  week2: "recWeek2",
  hwLib1: "recHwLib1",
  hwLib2: "recHwLib2",
  phaHw1: "recPhaHw1",
  phaHw2: "recPhaHw2",
  phaWrongWeek: "recPhaWrongWeek",
  phaWrongPi: "recPhaWrongPi",
  phaInactive: "recPhaInactive",
  hcExisting: "recHcExisting",
};

function link(id, name = id) {
  return [{ id, name }];
}

function field(name, type = "multipleRecordLinks", options) {
  return { name, type, ...(options ? { options } : {}) };
}

function choiceField(name, choices) {
  return field(name, "singleSelect", { choices: choices.map((n) => ({ name: n })) });
}

class MockRecord {
  constructor(id, fields) {
    this.id = id;
    this.fields = { ...fields };
  }
  getCellValue(fieldName) {
    return this.fields[fieldName] ?? null;
  }
  getCellValueAsString(fieldName) {
    const v = this.fields[fieldName];
    if (v == null) return "";
    if (Array.isArray(v)) return v.map((x) => x?.name || x?.id || "").join(", ");
    if (typeof v === "object" && v.name) return v.name;
    return String(v);
  }
}

class MockTable {
  constructor(name, fields, records = []) {
    this.name = name;
    this.fields = fields;
    this.records = new Map(records.map((r) => [r.id, r]));
    this.createdPayloads = [];
    this.updates = [];
  }
  async selectRecordAsync(recordId) {
    return this.records.get(recordId) || null;
  }
  async selectRecordsAsync() {
    const records = [...this.records.values()];
    return {
      records,
      getRecord: (id) => this.records.get(id) || null,
    };
  }
  async createRecordAsync(fields) {
    const recordId = `recCreated${this.createdPayloads.length + 1}`;
    this.createdPayloads.push(fields);
    this.records.set(recordId, new MockRecord(recordId, fields));
    return recordId;
  }
  async updateRecordAsync(recordId, fields) {
    this.updates.push({ recordId, fields });
    const record = this.records.get(recordId);
    if (record) Object.assign(record.fields, fields);
  }
}

class MockBase {
  constructor(tables) {
    this.tables = new Map(tables.map((t) => [t.name, t]));
  }
  getTable(name) {
    return this.tables.get(name);
  }
}

function buildPhaRecords() {
  return [
    new MockRecord(IDS.phaHw1, {
      "Homework Assignment": link(IDS.hwLib1),
      "Program Instance": link(IDS.pi2027),
      Week: link(IDS.week1),
      "Homework Slot": { name: "HW1" },
      "Active?": true,
    }),
    new MockRecord(IDS.phaHw2, {
      "Homework Assignment": link(IDS.hwLib2),
      "Program Instance": link(IDS.pi2027),
      Week: link(IDS.week1),
      "Homework Slot": { name: "HW2" },
      "Active?": true,
    }),
    new MockRecord(IDS.phaWrongWeek, {
      "Homework Assignment": link(IDS.hwLib1),
      "Program Instance": link(IDS.pi2027),
      Week: link(IDS.week2),
      "Homework Slot": { name: "HW1" },
      "Active?": true,
    }),
    new MockRecord(IDS.phaWrongPi, {
      "Homework Assignment": link(IDS.hwLib1),
      "Program Instance": link(IDS.piLegacy),
      Week: link(IDS.week1),
      "Homework Slot": { name: "HW1" },
      "Active?": true,
    }),
    new MockRecord(IDS.phaInactive, {
      "Homework Assignment": link(IDS.hwLib1),
      "Program Instance": link(IDS.pi2027),
      Week: link(IDS.week1),
      "Homework Slot": { name: "HW1" },
      "Active?": false,
    }),
  ];
}

function buildBase(overrides = {}) {
  const {
    submissionFields = {},
    assetSlot = "HW1",
    assetPurpose = "Homework 1",
    enrollmentId = IDS.enrollmentCurrent,
    phaLinkId = IDS.phaHw1,
    phaField = "Homework Name 1",
    homeworkRecords = [],
  } = overrides;

  const assetsTable = new MockTable(
    "Submission Assets",
    [
      field("Submission - Linked"),
      field("Enrollment - Linked"),
      choiceField("Upload Destination", ["Homework Completions"]),
      choiceField("Asset Purpose", ["Homework 1", "Homework 2"]),
      field("Airtable Attachment", "multipleAttachments"),
      field("Homework Completions"),
      choiceField("Asset Slot", ["HW1", "HW2"]),
      choiceField("Upload Status", ["Pending Link", "Error", "Uploaded"]),
      field("Send to Make Trigger", "checkbox"),
      field("Asset Label", "singleLineText"),
      field("Original File Name", "singleLineText"),
      choiceField("Asset Type", ["Image"]),
      field("Upload Error", "singleLineText"),
      field("Uploaded At", "date"),
      field("Google Drive File URL", "singleLineText"),
      field("Google Drive File ID", "singleLineText"),
      field("Google Drive Folder ID", "singleLineText"),
      field("Google Drive Folder URL", "singleLineText"),
    ],
    [
      new MockRecord(IDS.asset, {
        "Submission - Linked": link(IDS.submission),
        "Enrollment - Linked": link(enrollmentId),
        "Upload Destination": { name: "Homework Completions" },
        "Asset Purpose": { name: assetPurpose },
        "Airtable Attachment": [{ id: "att1", url: "https://example.com/a.jpg" }],
        "Homework Completions": [],
        "Asset Slot": { name: assetSlot },
        "Upload Status": { name: "Pending Link" },
        "Send to Make Trigger": false,
        "Asset Label": `${assetSlot} test`,
        "Asset Type": { name: "Image" },
      }),
    ]
  );

  const submissionsTable = new MockTable(
    "Submissions",
    [
      field("Enrollment"),
      field("Week"),
      field("Homework Name 1"),
      field("Homework Name 2"),
      field("Weekly Athlete Summary"),
      field("Activity Date", "date"),
    ],
    [
      new MockRecord(IDS.submission, {
        Enrollment: link(enrollmentId),
        Week: link(IDS.week1),
        "Homework Name 1": phaField === "Homework Name 1" ? link(phaLinkId) : [],
        "Homework Name 2": phaField === "Homework Name 2" ? link(phaLinkId) : [],
        "Activity Date": "2026-08-10",
        ...submissionFields,
      }),
    ]
  );

  const homeworkTable = new MockTable(
    "Homework Completions",
    [
      field("Enrollment"),
      field("Homework"),
      field("Week"),
      field("Grade Band"),
      field("Program Homework Assignment"),
      field("Submissions - Linked"),
      field("Submission Assets"),
      field("Weekly Athlete Summary Link"),
      field("Submission Date", "date"),
      choiceField("Upload Status", ["Pending", "Uploaded"]),
      choiceField("Completion Status", ["Submitted"]),
      choiceField("Review Status", ["Ready for Review"]),
      choiceField("Asset Slot", ["HW1", "HW2"]),
      choiceField("Item Slot", ["HW1", "HW2"]),
      choiceField("Asset Type", ["Image"]),
      choiceField("Asset Purpose", ["Homework Turn-In"]),
      choiceField("Source System", ["Fillout"]),
      choiceField("Item Type", ["Homework"]),
      field("Asset Label", "singleLineText"),
      field("Original File Name", "singleLineText"),
      field("Google Drive File ID", "singleLineText"),
      field("Google Drive File URL", "singleLineText"),
      field("Google Drive Folder ID", "singleLineText"),
      field("Google Drive Folder URL", "singleLineText"),
      field("Upload Error", "singleLineText"),
      field("Uploaded At", "date"),
      field("Writeback Complete?", "checkbox"),
      field("Satisfactory?", "checkbox"),
    ],
    homeworkRecords
  );

  const enrollmentsTable = new MockTable(
    "Enrollments",
    [field("Grade Band"), field("Program Instance")],
    [
      new MockRecord(IDS.enrollmentCurrent, {
        "Grade Band": link("recGb34"),
        "Program Instance": link(IDS.pi2027),
      }),
      new MockRecord(IDS.enrollmentLegacy, {
        "Grade Band": link("recGb34"),
        "Program Instance": link(IDS.piLegacy),
      }),
    ]
  );

  const phaTable = new MockTable(
    "Program Homework Assignments",
    [
      field("Homework Assignment"),
      field("Program Instance"),
      field("Week"),
      field("Grade Band"),
      choiceField("Homework Slot", ["HW1", "HW2"]),
      field("Active?", "checkbox"),
    ],
    buildPhaRecords()
  );

  return new MockBase([assetsTable, submissionsTable, homeworkTable, enrollmentsTable, phaTable]);
}

async function run020(base, recordId = IDS.asset) {
  const outputValues = {};
  const fn = new AsyncFunction("base", "input", "output", "console", source);
  const output = { set: (name, value) => { outputValues[name] = value; } };
  let error = null;
  try {
    await fn(base, { config: () => ({ recordId }) }, output, { log: () => {} });
  } catch (caught) {
    error = caught;
  }
  return {
    output: outputValues,
    error,
    homeworkTable: base.getTable("Homework Completions"),
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`FAIL - ${name}`);
    throw e;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`FAIL - ${name}`);
    throw e;
  }
}

(async () => {
  test("source is v3.4.1 with PHA-authoritative validation", () => {
    assert.match(source, /Version: v3\.4\.1/);
    assert.match(source, /loadAndValidateSubmissionPha/);
    assert.match(source, /Program Homework Assignment/);
    assert.match(source, /Legacy enrollment fallback is not permitted/);
    assert.doesNotMatch(source, /resolveProgramHomeworkAssignmentId/);
  });

  await testAsync("valid HW1 path creates HC from PHA", async () => {
    const { output, error, homeworkTable } = await run020(buildBase());
    assert.ifError(error);
    assert.strictEqual(output.statusOut, "success");
    assert.strictEqual(output.actionOut, "created_new");
    assert.strictEqual(output.phaId, IDS.phaHw1);
    assert.strictEqual(output.homeworkId, IDS.hwLib1);
    assert.strictEqual(output.enrollmentId, IDS.enrollmentCurrent);
    assert.strictEqual(output.submissionAssetId, IDS.asset);
    assert.ok(output.homeworkCompletionId);
    assert.strictEqual(homeworkTable.createdPayloads.length, 1);
    const created = homeworkTable.createdPayloads[0];
    assert.strictEqual(created.Homework[0].id, IDS.hwLib1);
    assert.strictEqual(created["Program Homework Assignment"][0].id, IDS.phaHw1);
  });

  await testAsync("valid HW2 path uses Homework Name 2 PHA", async () => {
    const { output, error } = await run020(
      buildBase({
        assetSlot: "HW2",
        assetPurpose: "Homework 2",
        phaLinkId: IDS.phaHw2,
        phaField: "Homework Name 2",
      })
    );
    assert.ifError(error);
    assert.strictEqual(output.statusOut, "success");
    assert.strictEqual(output.phaId, IDS.phaHw2);
    assert.strictEqual(output.homeworkId, IDS.hwLib2);
    assert.strictEqual(output.slot, "HW2");
  });

  await testAsync("mismatched Week fails closed", async () => {
    const { error } = await run020(buildBase({ phaLinkId: IDS.phaWrongWeek }));
    assert.ok(error);
    assert.match(error.message, /PHA Week mismatch/);
  });

  await testAsync("mismatched Program Instance fails closed (cross-season)", async () => {
    const { error } = await run020(buildBase({ phaLinkId: IDS.phaWrongPi }));
    assert.ok(error);
    assert.match(error.message, /PHA Program Instance mismatch/);
  });

  await testAsync("missing PHA link fails closed", async () => {
    const { error } = await run020(
      buildBase({
        submissionFields: { "Homework Name 1": [] },
        phaLinkId: "",
      })
    );
    assert.ok(error);
    assert.match(error.message, /found 0/);
  });

  await testAsync("duplicate PHA links fail closed", async () => {
    const { error } = await run020(
      buildBase({
        submissionFields: { "Homework Name 1": link(IDS.phaHw1).concat(link(IDS.phaHw2)) },
      })
    );
    assert.ok(error);
    assert.match(error.message, /found 2/);
  });

  await testAsync("inactive PHA fails closed", async () => {
    const { error } = await run020(buildBase({ phaLinkId: IDS.phaInactive }));
    assert.ok(error);
    assert.match(error.message, /inactive/);
  });

  await testAsync("replay links existing enrollment identity HC", async () => {
    const existing = new MockRecord(IDS.hcExisting, {
      Enrollment: link(IDS.enrollmentCurrent),
      Week: link(IDS.week1),
      Homework: link(IDS.hwLib1),
      "Item Slot": { name: "HW1" },
      "Asset Slot": { name: "HW1" },
      "Submissions - Linked": link(IDS.submission),
      "Submission Assets": [],
      "Program Homework Assignment": link(IDS.phaHw1),
    });
    const { output, error, homeworkTable } = await run020(buildBase({ homeworkRecords: [existing] }));
    assert.ifError(error);
    assert.strictEqual(output.actionOut, "linked_existing_enrollment_identity");
    assert.strictEqual(output.homeworkCompletionId, IDS.hcExisting);
    assert.strictEqual(homeworkTable.createdPayloads.length, 0);
    assert.ok(homeworkTable.updates.some((u) => u.recordId === IDS.hcExisting));
  });

  await testAsync("legacy enrollment mismatch fails — no fallback", async () => {
    const base = buildBase({ enrollmentId: IDS.enrollmentCurrent });
    const submission = base.getTable("Submissions").records.get(IDS.submission);
    submission.fields.Enrollment = link(IDS.enrollmentLegacy);
    const { error } = await run020(base);
    assert.ok(error);
    assert.match(error.message, /Legacy enrollment fallback is not permitted/);
  });

  console.log("PASS automation-020-pha-v341");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
