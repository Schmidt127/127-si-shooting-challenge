#!/usr/bin/env node
/**
 * Create Program Homework Assignments MVP table + HC link in PROD.
 * Additive only — does not modify FBC Curriculum - SYNC.Week.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = "appn84sqPw03zEbTT";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

const IDS = {
  curriculum: "tblUuxwYlX4EQ9MKE",
  weeks: "tblcsKugv1cla36A6",
  programInstance: "tblMfALZa4YYUy70P",
  gradeBands: "tblOhHrIqpjcsk2WG",
  homeworkCompletions: "tblv58ppTFDBXb3nv",
  weekRecordIdField: "fld5u278sXt1d4QvM", // Weeks.Record ID
};

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: method === "GET" ? { Authorization: `Bearer ${TOKEN}` } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

async function getTables() {
  const r = await api("GET", `https://api.airtable.com/v0/meta/bases/${BASE}/tables`);
  if (!r.ok) throw new Error("meta tables " + JSON.stringify(r.json));
  return r.json.tables;
}

async function ensureRecordIdField(tableId, preferredName = "Record Id") {
  const tables = await getTables();
  const table = tables.find((t) => t.id === tableId);
  if (!table) throw new Error("missing table " + tableId);
  const existing = (table.fields || []).find(
    (f) =>
      (f.name === preferredName || f.name === "Record ID" || f.name === "Record Id") &&
      f.type === "formula" &&
      String(f.options?.formula || "").includes("RECORD_ID()")
  );
  if (existing) return existing;

  const r = await api(
    "POST",
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${tableId}/fields`,
    {
      name: preferredName,
      type: "formula",
      description: "Local RECORD_ID() helper for Program Homework Assignments Schedule Key lookups.",
      options: { formula: "RECORD_ID()" },
    }
  );
  if (!r.ok) throw new Error(`create Record Id on ${table.name}: ${JSON.stringify(r.json)}`);
  return r.json;
}

const evidence = { steps: [] };

// Ensure RID helpers on PI, Grade Bands, Curriculum
evidence.piRecordId = await ensureRecordIdField(IDS.programInstance, "Record Id");
evidence.gbRecordId = await ensureRecordIdField(IDS.gradeBands, "Record Id");
evidence.curRecordId = await ensureRecordIdField(IDS.curriculum, "Record Id");
evidence.steps.push("rid_helpers");

let tables = await getTables();
let pha = tables.find((t) => t.name === "Program Homework Assignments");

if (!pha) {
  const create = await api("POST", `https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    name: "Program Homework Assignments",
    description:
      "MVP junction: reusable FBC Curriculum - SYNC assignment scheduled for one Program Instance + Week + Grade Band + Slot. Additive; does not replace curriculum Week links.",
    fields: [
      {
        name: "Program Homework Assignment",
        type: "singleLineText",
        description: "Primary display; updated by formula companion when possible.",
      },
    ],
  });
  if (!create.ok) throw new Error("create table " + JSON.stringify(create.json));
  pha = create.json;
  evidence.steps.push("table_created");
} else {
  evidence.steps.push("table_exists");
}

const phaTableId = pha.id;

async function ensureField(def) {
  tables = await getTables();
  pha = tables.find((t) => t.id === phaTableId);
  const existing = (pha.fields || []).find((f) => f.name === def.name);
  if (existing) return existing;
  const r = await api(
    "POST",
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${phaTableId}/fields`,
    def
  );
  if (!r.ok) throw new Error(`create field ${def.name}: ${JSON.stringify(r.json)}`);
  return r.json;
}

const fHomework = await ensureField({
  name: "Homework Assignment",
  type: "multipleRecordLinks",
  description: "One reusable library assignment from FBC Curriculum - SYNC.",
  options: {
    linkedTableId: IDS.curriculum,
  },
});

const fProgram = await ensureField({
  name: "Program Instance",
  type: "multipleRecordLinks",
  options: {
    linkedTableId: IDS.programInstance,
  },
});

const fWeek = await ensureField({
  name: "Week",
  type: "multipleRecordLinks",
  options: {
    linkedTableId: IDS.weeks,
  },
});

const fGrade = await ensureField({
  name: "Grade Band",
  type: "multipleRecordLinks",
  options: {
    linkedTableId: IDS.gradeBands,
  },
});

const fSlot = await ensureField({
  name: "Homework Slot",
  type: "singleSelect",
  options: {
    choices: [{ name: "HW1" }, { name: "HW2" }],
  },
});

const fActive = await ensureField({
  name: "Active?",
  type: "checkbox",
  options: { color: "greenBright", icon: "check" },
});

// Lookups for Schedule Key (stable RIDs)
const fPiRid = await ensureField({
  name: "Program Instance RID",
  type: "multipleLookupValues",
  options: {
    recordLinkFieldId: fProgram.id,
    fieldIdInLinkedTable: evidence.piRecordId.id,
  },
});

const fWeekRid = await ensureField({
  name: "Week RID",
  type: "multipleLookupValues",
  options: {
    recordLinkFieldId: fWeek.id,
    fieldIdInLinkedTable: IDS.weekRecordIdField,
  },
});

const fGbRid = await ensureField({
  name: "Grade Band RID",
  type: "multipleLookupValues",
  options: {
    recordLinkFieldId: fGrade.id,
    fieldIdInLinkedTable: evidence.gbRecordId.id,
  },
});

const fHwRid = await ensureField({
  name: "Homework Assignment RID",
  type: "multipleLookupValues",
  options: {
    recordLinkFieldId: fHomework.id,
    fieldIdInLinkedTable: evidence.curRecordId.id,
  },
});

const scheduleFormula = `IF(
  AND(
    {${fPiRid.id}},
    {${fWeekRid.id}},
    {${fGbRid.id}},
    {${fSlot.id}},
    {${fHwRid.id}}
  ),
  ARRAYJOIN({${fPiRid.id}}) & "|" & ARRAYJOIN({${fWeekRid.id}}) & "|" & ARRAYJOIN({${fGbRid.id}}) & "|" & {${fSlot.id}} & "|" & ARRAYJOIN({${fHwRid.id}}),
  BLANK()
)`;

const scheduleNamed = `IF(
  AND(
    {Program Instance RID},
    {Week RID},
    {Grade Band RID},
    {Homework Slot},
    {Homework Assignment RID}
  ),
  ARRAYJOIN({Program Instance RID}) & "|" & ARRAYJOIN({Week RID}) & "|" & ARRAYJOIN({Grade Band RID}) & "|" & {Homework Slot} & "|" & ARRAYJOIN({Homework Assignment RID}),
  BLANK()
)`;

const fSchedule = await ensureField({
  name: "Schedule Key",
  type: "formula",
  description: "Dedupe key: ProgramInstanceRID|WeekRID|GradeBandRID|Slot|HomeworkAssignmentRID",
  options: { formula: scheduleFormula },
});

const displayFormula = `ARRAYJOIN({${fHomework.id}}) & " | " & ARRAYJOIN({${fProgram.id}}) & " | " & ARRAYJOIN({${fWeek.id}}) & " | " & ARRAYJOIN({${fGrade.id}}) & " | " & IF({${fSlot.id}}, {${fSlot.id}}, "")`;

// Convert primary to formula if possible — primary may stay text; add Display formula field instead
const fDisplay = await ensureField({
  name: "Program Homework Assignment Display",
  type: "formula",
  description: "Human-readable assignment | PI | Week | Grade Band | Slot",
  options: { formula: displayFormula },
});

// Add Program Homework Assignment link on Homework Completions
tables = await getTables();
const hc = tables.find((t) => t.id === IDS.homeworkCompletions);
let hcPha = (hc.fields || []).find((f) => f.name === "Program Homework Assignment");
if (!hcPha) {
  const r = await api(
    "POST",
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${IDS.homeworkCompletions}/fields`,
    {
      name: "Program Homework Assignment",
      type: "multipleRecordLinks",
      description: "MVP link to scheduled Program Homework Assignments junction record.",
      options: {
        linkedTableId: phaTableId,
      },
    }
  );
  if (!r.ok) throw new Error("HC link field " + JSON.stringify(r.json));
  hcPha = r.json;
  evidence.steps.push("hc_link_created");
} else {
  evidence.steps.push("hc_link_exists");
}

tables = await getTables();
pha = tables.find((t) => t.id === phaTableId);
const fieldMap = Object.fromEntries((pha.fields || []).map((f) => [f.name, { id: f.id, type: f.type, formula: f.options?.formula }]));

evidence.result = {
  tableId: phaTableId,
  tableName: "Program Homework Assignments",
  fields: fieldMap,
  scheduleKeyNamed: scheduleNamed,
  scheduleKeyFieldIds: scheduleFormula,
  homeworkCompletionsLink: { name: "Program Homework Assignment", id: hcPha.id, type: hcPha.type },
  ridHelpers: {
    programInstance: evidence.piRecordId,
    gradeBands: evidence.gbRecordId,
    curriculum: evidence.curRecordId,
    weeksExisting: IDS.weekRecordIdField,
  },
};

writeFileSync(
  resolve(ROOT, "docs/testing/homework-assignments/fixtures/_pha-create.json"),
  JSON.stringify(evidence, null, 2)
);
console.log(JSON.stringify(evidence.result, null, 2));
