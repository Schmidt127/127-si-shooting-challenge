/**
 * Automation 101 v6.5 executable runtime fixtures.
 *
 * Run:
 *   node airtable/automations/shooting-challenge/101-zoom-attendance-xp-award-meeting-xp.test.js
 *
 * These fixtures execute the committed Automation 101 source in a mocked
 * Airtable runtime. They do not access Airtable or Production.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "101-zoom-attendance-xp-award-meeting-xp.js"),
  "utf8",
);

const IDS = {
  meeting: "recMeeting",
  enrollment: "recEnrollment",
  wrongEnrollment: "recWrongEnrollment",
  week: "recWeek",
  wrongWeek: "recWrongWeek",
  program: "recProgram",
  wrongProgram: "recWrongProgram",
  xp: "recXp",
  duplicate: "recDuplicateXp",
};

const ZOOM_FIELDS = [
  "Meeting Name", "Start Time", "Week", "Attendees", "Create XP Events",
  "XP Award Status", "Zoom Meeting Key", "Meeting Status", "XP Awarded At",
  "Zoom XP Current Signature", "Last Zoom XP Reconciled Signature",
  "Zoom XP Reconciliation Needed?", "Zoom XP Enrollment Signature - Lkp",
  "Zoom XP Week Signature - Lkp", "Zoom XP Event Signature - Lkp",
];

const ENROLLMENT_FIELDS = [
  "Active?", "Full Athlete Name", "Program Instance", "School Year",
  "Zoom XP Enrollment Signature",
];

const WEEK_FIELDS = ["Program Instance", "School Year", "Zoom XP Week Signature"];
const PROGRAM_FIELDS = ["School Year - Linked"];
const RULE_FIELDS = ["Rule Key", "XP Amount", "XP Source Label", "Active?"];
const XP_FIELDS = [
  "Enrollment", "Week", "Weekly Athlete Summary", "XP Source", "XP Bucket",
  "XP Points", "XP Reason Public", "Active?", "Source Key", "Award Mode",
  "Awarded By", "Processed", "Zoom Meeting", "Zoom XP Event Signature",
];
const WAS_FIELDS = ["Enrollment", "Week", "Summary Calculation Status"];

function linked(ids) {
  return (ids || []).map(id => ({ id }));
}

function fieldDefinitions(names, overrides = {}) {
  return Object.fromEntries(names.map(name => [
    name,
    {
      name,
      type: overrides[name]?.type || "singleLineText",
      ...(overrides[name]?.options ? { options: overrides[name].options } : {}),
    },
  ]));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeRecord(table, row) {
  const values = Object.fromEntries(
    Object.keys(table.fields).map(fieldName => [fieldName, clone(table.valueFor(row.id, fieldName))])
  );
  return {
    id: row.id,
    getCellValue(fieldName) {
      return values[fieldName] ?? null;
    },
    getCellValueAsString(fieldName) {
      const value = values[fieldName] ?? null;
      if (Array.isArray(value)) {
        return value.map(item => item.name || item.id || item).join(", ");
      }
      if (value && typeof value === "object") {
        return String(value.name || value.id || "");
      }
      return value == null ? "" : String(value);
    },
    get name() {
      return row.name || values["Meeting Name"] || row.id;
    },
  };
}

class FakeTable {
  constructor(name, fields, rows, fixture) {
    this.name = name;
    this.fields = fields;
    this.rows = new Map(rows.map(row => [row.id, row]));
    this.fixture = fixture;
  }

  getField(fieldName) {
    if (!this.fields[fieldName]) throw new Error(`Missing field ${fieldName}`);
    return this.fields[fieldName];
  }

  valueFor(recordId, fieldName) {
    const row = this.rows.get(recordId);
    if (!row) return null;
    if (this.name === "Zoom Meetings" && recordId === IDS.meeting) {
      if (fieldName === "Zoom XP Current Signature") {
        if (this.fixture.signatureMode === "timeout") return "same-signature";
        if (this.fixture.signatureMode === "event") {
          const attendeeIds = (row.values.Attendees || [])
            .map(link => link.id)
            .sort()
            .join(",");
          const activeEventIds = this.fixture.xpRows
            .filter(xpRow =>
              xpRow.values["Zoom Meeting"]?.some(link => link.id === IDS.meeting)
              && xpRow.values["Active?"] === true
            )
            .map(xpRow => xpRow.id)
            .sort()
            .join(",");
          // Live reconciliation signature includes Create XP Events so disarming
          // the checkbox after award produces a new post-write signature.
          const createXp =
            row.values["Create XP Events"] === true || row.values["Create XP Events"] === 1
              ? 1
              : 0;
          return `attendees=${attendeeIds}|activeEvents=${activeEventIds}|createXp=${createXp}`;
        }
        return this.fixture.startingSignature;
      }
      if (fieldName === "Zoom XP Reconciliation Needed?") {
        if (this.fixture.signatureMode === "event") {
          const currentSignature = this.valueFor(recordId, "Zoom XP Current Signature");
          return currentSignature === row.values["Last Zoom XP Reconciled Signature"] ? 0 : 1;
        }
        return row.values["Last Zoom XP Reconciled Signature"]
          ? 0
          : 1;
      }
    }
    return row.values[fieldName] ?? null;
  }

  record(recordId) {
    const row = this.rows.get(recordId);
    return row ? makeRecord(this, row) : null;
  }

  async selectRecordAsync(recordId) {
    return this.record(recordId);
  }

  async selectRecordsAsync() {
    return { records: [...this.rows.keys()].map(id => this.record(id)) };
  }

  async updateRecordAsync(recordId, updates) {
    if (this.fixture.failLastSignatureWrite
      && this.name === "Zoom Meetings"
      && Object.prototype.hasOwnProperty.call(updates, "Last Zoom XP Reconciled Signature")) {
      throw new Error("simulated Last Signature write failure");
    }
    if (this.fixture.failEventWrite && this.name === "XP Events") {
      throw new Error("simulated XP Event write failure");
    }
    const row = this.rows.get(recordId);
    if (!row) throw new Error(`Unknown ${this.name} record ${recordId}`);
    for (const [fieldName, value] of Object.entries(updates)) {
      let next = Array.isArray(value)
        ? clone(value)
        : value && typeof value === "object" && "id" in value
          ? { ...value }
          : value;
      // Airtable returns single-select cell values with id+name after an id-only write.
      const field = this.fields[fieldName];
      if (
        field?.type === "singleSelect"
        && next
        && typeof next === "object"
        && next.id
        && !next.name
      ) {
        const choice = (field.options?.choices || []).find(item => item.id === next.id);
        if (choice) next = { id: choice.id, name: choice.name };
      }
      row.values[fieldName] = next;
    }
    if (this.name === "XP Events") {
      this.fixture.eventUpdates.push({ recordId, updates: clone(updates) });
    }
  }

  async createRecordAsync(fields) {
    this.fixture.createdEventCount += this.name === "XP Events" ? 1 : 0;
    if (this.name !== "XP Events") {
      throw new Error(`Unexpected createRecordAsync on ${this.name}: ${JSON.stringify(fields)}`);
    }
    const id = `recCreatedXp${this.fixture.createdEventCount}`;
    this.rows.set(id, { id, values: clone(fields) });
    this.fixture.xpRows.push(this.rows.get(id));
    return id;
  }
}

function eventRow(id, {
  enrollmentId = IDS.enrollment,
  weekId = IDS.week,
  sourceKey = `ZOOM_ATTEND_BASE|fixture-meeting|${enrollmentId}`,
  active = true,
  meetingId = IDS.meeting,
} = {}) {
  return {
    id,
    values: {
      Enrollment: linked([enrollmentId]),
      Week: linked([weekId]),
      "Weekly Athlete Summary": [],
      "XP Source": "Zoom Attendance: Base",
      "XP Bucket": "Zoom Attendance",
      "XP Points": 30,
      "XP Reason Public": "fixture",
      "Active?": active,
      "Source Key": sourceKey,
      "Award Mode": "Automatic",
      "Awarded By": "Airtable Automation 101",
      Processed: true,
      "Zoom Meeting": linked([meetingId]),
    },
  };
}

function makeFixture({
  xpRows = [],
  attendeeIds = [],
  wasRows = [],
  signatureMode = "unchanged",
  enrollmentProgramId = IDS.program,
  failLastSignatureWrite = false,
  failEventWrite = false,
} = {}) {
  const fixture = {
    startingSignature: signatureMode === "event" ? "event-active" : "same-signature",
    signatureMode,
    xpRows,
    failLastSignatureWrite,
    failEventWrite,
    eventUpdates: [],
    createdEventCount: 0,
    outputs: {},
    logs: [],
  };

  const computed = {
    "Zoom XP Current Signature": { type: "formula" },
    "Zoom XP Reconciliation Needed?": { type: "formula" },
    "Zoom XP Enrollment Signature - Lkp": { type: "lookup" },
    "Zoom XP Week Signature - Lkp": { type: "lookup" },
    "Zoom XP Event Signature - Lkp": { type: "lookup" },
    "Zoom XP Enrollment Signature": { type: "formula" },
    "Zoom XP Week Signature": { type: "formula" },
    "Zoom XP Event Signature": { type: "formula" },
    "School Year - Linked": { type: "lookup" },
  };
  const statusChoices = {
    options: {
      choices: [
        { id: "selPending", name: "Pending" },
        { id: "selAwarded", name: "Awarded" },
      ],
    },
  };

  const zoomRow = {
    id: IDS.meeting,
    values: {
      "Meeting Name": "Future Scheduled Meeting",
      "Start Time": "2026-08-13T16:00:00.000Z",
      Week: linked([IDS.week]),
      Attendees: linked(attendeeIds),
      "Create XP Events": true,
      "XP Award Status": "Pending",
      "Zoom Meeting Key": "fixture-meeting",
      "Meeting Status": "Completed",
      "Last Zoom XP Reconciled Signature": "",
    },
  };
  const enrollmentRows = (xpRows.length || attendeeIds.length)
    ? [
      {
        id: IDS.enrollment,
        values: {
          "Active?": true,
          "Full Athlete Name": "Fixture Athlete",
          "Program Instance": linked([enrollmentProgramId]),
          "School Year": "2026-2027",
        },
      },
      ...(xpRows.some(row => row.values.Enrollment?.some(link => link.id === IDS.wrongEnrollment))
        ? [{
          id: IDS.wrongEnrollment,
          values: {
            "Active?": true,
            "Full Athlete Name": "Wrong Owner",
            "Program Instance": linked([IDS.program]),
            "School Year": "2026-2027",
          },
        }]
        : []),
    ]
    : [];

  fixture.tables = {
    "Zoom Meetings": new FakeTable("Zoom Meetings", fieldDefinitions(ZOOM_FIELDS, {
      ...computed,
      "XP Award Status": { type: "singleSelect", options: statusChoices.options },
    }), [zoomRow], fixture),
    Enrollments: new FakeTable("Enrollments", fieldDefinitions(ENROLLMENT_FIELDS, computed), enrollmentRows, fixture),
    Weeks: new FakeTable("Weeks", fieldDefinitions(WEEK_FIELDS, computed), [{
      id: IDS.week,
      values: {
        "Program Instance": linked([IDS.program]),
        "School Year": "2026-2027",
      },
    }], fixture),
    "Program Instance - Sync": new FakeTable("Program Instance - Sync", fieldDefinitions(PROGRAM_FIELDS, computed), [{
      id: IDS.program,
      values: { "School Year - Linked": "2026-2027" },
    }], fixture),
    "XP Reward Rules": new FakeTable("XP Reward Rules", fieldDefinitions(RULE_FIELDS), [
      { id: "recBaseRule", values: { "Rule Key": "ZOOM_ATTEND_BASE", "XP Amount": 30, "XP Source Label": "Zoom Attendance: Base", "Active?": true } },
      { id: "recBonus2Rule", values: { "Rule Key": "ZOOM_ATTEND_BONUS_2", "XP Amount": 10, "XP Source Label": "Zoom Attendance: Bonus 2", "Active?": true } },
      { id: "recBonus3Rule", values: { "Rule Key": "ZOOM_ATTEND_BONUS_3", "XP Amount": 15, "XP Source Label": "Zoom Attendance: Bonus 3", "Active?": true } },
    ], fixture),
    "XP Events": new FakeTable("XP Events", fieldDefinitions(XP_FIELDS, computed), xpRows, fixture),
    "Weekly Athlete Summary": new FakeTable("Weekly Athlete Summary", fieldDefinitions(WAS_FIELDS), wasRows, fixture),
  };

  return fixture;
}

async function runAutomation(fixture) {
  const context = {
    input: { config: () => ({ recordId: IDS.meeting }) },
    output: { set: (key, value) => { fixture.outputs[key] = value; } },
    base: { getTable: name => fixture.tables[name] },
    console: {
      log: (...args) => fixture.logs.push(args.join(" ")),
    },
    setTimeout: callback => callback(),
    clearTimeout: () => {},
  };
  try {
    await vm.runInNewContext(`(async () => { ${source}\n })()`, context);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

async function test(name, fn) {
  await fn();
  console.log(`ok - ${name}`);
}

(async () => {
  await test("committed source declares CONFIG.version v6.5", async () => {
    assert(source.includes('version: "v6.5"'));
    assert(source.includes("* Version: v6.5"));
    assert(!source.includes('CONFIG.statuses.error'));
  });
  await test("acknowledges Create XP Events unchecked before award without XP creation", async () => {
    const fixture = makeFixture({
      attendeeIds: [IDS.enrollment],
      signatureMode: "event",
    });
    fixture.tables["Zoom Meetings"].rows.get(IDS.meeting).values["Create XP Events"] = false;
    fixture.tables["Zoom Meetings"].rows.get(IDS.meeting).values["XP Award Status"] = "Pending";
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, true, result.error?.message);
    assert.strictEqual(fixture.outputs.actionOut, "reconciled_create_xp_events_not_checked");
    assert.strictEqual(fixture.outputs.statusOut, "skipped");
    assert.strictEqual(fixture.createdEventCount, 0);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 0);
  });
  await test("active attendee uses one existing WAS and creates no WAS", async () => {
    const wasId = "recCanonicalWas";
    const fixture = makeFixture({
      attendeeIds: [IDS.enrollment],
      wasRows: [{ id: wasId, values: { Enrollment: linked([IDS.enrollment]), Week: linked([IDS.week]) } }],
      signatureMode: "event",
    });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, true, result.error?.message);
    assert.strictEqual(fixture.createdEventCount, 1);
    const created = fixture.tables["XP Events"].rows.get("recCreatedXp1");
    assert.deepStrictEqual(created.values["Weekly Athlete Summary"], linked([wasId]));
    assert.strictEqual(fixture.tables["Weekly Athlete Summary"].rows.size, 1);
  });
  await test("active attendee without a WAS fails before XP creation", async () => {
    const fixture = makeFixture({ attendeeIds: [IDS.enrollment], signatureMode: "event" });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(String(result.error.message), /Expected exactly one Weekly Athlete Summary/);
    assert.strictEqual(fixture.createdEventCount, 0);
  });
  await test("multiple WAS candidates fail with their IDs before XP creation or acknowledgement", async () => {
    const firstWasId = "recFirstWas";
    const secondWasId = "recSecondWas";
    const fixture = makeFixture({
      attendeeIds: [IDS.enrollment],
      wasRows: [
        { id: firstWasId, values: { Enrollment: linked([IDS.enrollment]), Week: linked([IDS.week]) } },
        { id: secondWasId, values: { Enrollment: linked([IDS.enrollment]), Week: linked([IDS.week]) } },
      ],
      signatureMode: "event",
    });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(fixture.outputs.errorOut, new RegExp(`${firstWasId}.*${secondWasId}`));
    assert.strictEqual(fixture.createdEventCount, 0);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Last Zoom XP Reconciled Signature"), "");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 1);
  });
  await test("actual source acknowledges unchanged empty roster without XP creation", async () => {
    const fixture = makeFixture();
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(fixture.outputs.actionOut, "reconciled_empty_roster_no_award");
    assert.strictEqual(fixture.outputs.statusOut, "skipped");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Last Zoom XP Reconciled Signature"), "same-signature");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 0);
    assert.strictEqual(fixture.createdEventCount, 0);
  });

  await test("actual source deactivates one exact active event and preserves its row", async () => {
    const fixture = makeFixture({
      xpRows: [eventRow(IDS.xp, { active: true })],
      signatureMode: "event",
    });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(fixture.outputs.actionOut, "deactivated_owned_event");
    assert.strictEqual(fixture.tables["XP Events"].valueFor(IDS.xp, "Active?"), false);
    assert.strictEqual(fixture.createdEventCount, 0);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 0);
  });

  await test("actual source acknowledges an already inactive exact event", async () => {
    const fixture = makeFixture({
      xpRows: [eventRow(IDS.xp, { active: false })],
      signatureMode: "event",
    });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, true, result.error?.message);
    assert.strictEqual(fixture.outputs.actionOut, "reconciled");
    assert.strictEqual(fixture.tables["XP Events"].valueFor(IDS.xp, "Active?"), false);
    assert.strictEqual(fixture.createdEventCount, 0);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 0);
  });

  await test("duplicate canonical events fail closed and report exact IDs", async () => {
    const fixture = makeFixture({
      xpRows: [
        eventRow(IDS.xp, { active: true }),
        eventRow(IDS.duplicate, { active: false }),
      ],
    });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(fixture.outputs.errorOut, new RegExp(`${IDS.xp}.*${IDS.duplicate}`));
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Last Zoom XP Reconciled Signature"), "");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 1);
    assert.strictEqual(fixture.createdEventCount, 0);
  });

  await test("wrong-owner canonical event fails closed and reports its ID", async () => {
    const wrongOwner = eventRow(IDS.xp, {
      enrollmentId: IDS.wrongEnrollment,
      sourceKey: `ZOOM_ATTEND_BASE|fixture-meeting|${IDS.enrollment}`,
    });
    const fixture = makeFixture({ xpRows: [wrongOwner] });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(fixture.outputs.errorOut, new RegExp(IDS.xp));
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Last Zoom XP Reconciled Signature"), "");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 1);
    assert.strictEqual(fixture.createdEventCount, 0);
  });

  await test("wrong-week canonical event fails closed with its ID and no acknowledgement", async () => {
    const wrongWeek = eventRow(IDS.xp, {
      weekId: IDS.wrongWeek,
      sourceKey: `ZOOM_ATTEND_BASE|fixture-meeting|${IDS.enrollment}`,
    });
    const fixture = makeFixture({ xpRows: [wrongWeek] });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(fixture.outputs.errorOut, new RegExp(IDS.xp));
    assert.strictEqual(fixture.createdEventCount, 0);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Last Zoom XP Reconciled Signature"), "");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 1);
  });

  await test("Program Instance mismatch fails closed without creating or acknowledging XP", async () => {
    const fixture = makeFixture({
      attendeeIds: [IDS.enrollment],
      enrollmentProgramId: IDS.wrongProgram,
      signatureMode: "event",
    });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(String(result.error.message), /Program Instance does not match/);
    assert.strictEqual(fixture.createdEventCount, 0);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Last Zoom XP Reconciled Signature"), "");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 1);
  });

  await test("formula settlement timeout remains unacknowledged", async () => {
    const fixture = makeFixture({
      xpRows: [eventRow(IDS.xp, { active: true })],
      signatureMode: "timeout",
    });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(fixture.outputs.errorOut, /Formula settlement timeout/);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Last Zoom XP Reconciled Signature"), "");
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 1);
  });

  await test("Last Signature write failure remains unacknowledged", async () => {
    const fixture = makeFixture({ failLastSignatureWrite: true });
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, false);
    assert.match(fixture.outputs.errorOut, /Last Signature write failure/);
    assert.strictEqual(fixture.tables["Zoom Meetings"].valueFor(IDS.meeting, "Zoom XP Reconciliation Needed?"), 1);
  });

  await test("replay while Needed is zero is skipped safely", async () => {
    const fixture = makeFixture();
    fixture.tables["Zoom Meetings"].rows.get(IDS.meeting).values["Last Zoom XP Reconciled Signature"] = "same-signature";
    const result = await runAutomation(fixture);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(fixture.outputs.actionOut, "skipped_reconciliation_not_needed");
    assert.strictEqual(fixture.createdEventCount, 0);
  });

  await test("replay, withdrawal, and restoration preserve one XP Event ID", async () => {
    const wasId = "recCanonicalWas";
    const fixture = makeFixture({
      attendeeIds: [IDS.enrollment],
      wasRows: [{ id: wasId, values: { Enrollment: linked([IDS.enrollment]), Week: linked([IDS.week]) } }],
      signatureMode: "event",
    });

    const firstRun = await runAutomation(fixture);
    assert.strictEqual(firstRun.ok, true, firstRun.error?.message);
    assert.strictEqual(fixture.outputs.actionOut, "created_owned_event");
    assert.strictEqual(fixture.createdEventCount, 1);
    const xpEventId = "recCreatedXp1";

    const replay = await runAutomation(fixture);
    assert.strictEqual(replay.ok, true, replay.error?.message);
    assert.strictEqual(fixture.outputs.actionOut, "skipped_reconciliation_not_needed");
    assert.strictEqual(fixture.createdEventCount, 1);
    assert.strictEqual(fixture.tables["XP Events"].rows.get(xpEventId).values["Active?"], true);

    fixture.tables["Zoom Meetings"].rows.get(IDS.meeting).values.Attendees = [];
    const withdrawal = await runAutomation(fixture);
    assert.strictEqual(withdrawal.ok, true, withdrawal.error?.message);
    assert.strictEqual(fixture.outputs.actionOut, "deactivated_owned_event");
    assert.strictEqual(fixture.createdEventCount, 1);
    assert.strictEqual(fixture.tables["XP Events"].rows.get(xpEventId).values["Active?"], false);

    fixture.tables["Zoom Meetings"].rows.get(IDS.meeting).values.Attendees = linked([IDS.enrollment]);
    const restoration = await runAutomation(fixture);
    assert.strictEqual(restoration.ok, true, restoration.error?.message);
    assert.strictEqual(fixture.outputs.actionOut, "reactivated_owned_event");
    assert.strictEqual(fixture.createdEventCount, 1);
    assert.strictEqual(fixture.tables["XP Events"].rows.get(xpEventId).values["Active?"], true);
    assert.deepStrictEqual([...fixture.tables["XP Events"].rows.keys()], [xpEventId]);
  });

  console.log("\nAutomation 101 v6.5 runtime fixtures passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
