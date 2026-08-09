#!/usr/bin/env node
/**
 * Harden Program Homework Assignments operator model in PROD:
 * - field descriptions
 * - Operator Status formula
 * - Operator Notes field
 * - Completions Count rollup (if possible)
 * Does NOT modify Homework Library.Week.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
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
const PHA = "tblhA3maf7xOa8EUS";
const HC = "tblv58ppTFDBXb3nv";
const WAS = "tbl9520d72adxlAKQ";

if (!TOKEN) {
  console.error("NO_TOKEN");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

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

const evidence = { steps: [], created: [], updated: [], errors: [] };

async function patchField(tableId, fieldId, patch) {
  const r = await api(
    "PATCH",
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${tableId}/fields/${fieldId}`,
    patch
  );
  evidence.updated.push({ tableId, fieldId, ok: r.ok, status: r.status, body: r.json });
  if (!r.ok) evidence.errors.push({ tableId, fieldId, body: r.json });
  return r;
}

async function createField(tableId, body) {
  const r = await api("POST", `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${tableId}/fields`, body);
  evidence.created.push({ tableId, name: body.name, ok: r.ok, status: r.status, body: r.json });
  if (!r.ok) evidence.errors.push({ tableId, name: body.name, body: r.json });
  return r;
}

const meta = await api("GET", `https://api.airtable.com/v0/meta/bases/${BASE}/tables`);
if (!meta.ok) throw new Error(JSON.stringify(meta.json));
const pha = meta.json.tables.find((t) => t.id === PHA);
const hc = meta.json.tables.find((t) => t.id === HC);
const was = meta.json.tables.find((t) => t.id === WAS);
if (!pha) throw new Error("PHA missing");

const byName = Object.fromEntries(pha.fields.map((f) => [f.name, f]));

const DESCRIPTIONS = {
  "Program Homework Assignment":
    "Primary label Mike edits (or leave blank and use Display). Prefer one row per Program Instance + Week + Grade Band + Slot.",
  "Homework Assignment":
    "Link ONE reusable Homework Library library record. Do not put season Week scheduling only on the library — schedule here.",
  "Program Instance":
    "Which season/program this assignment belongs to (e.g. Shooting Challenge | 2026-2027).",
  Week: "Challenge week this homework is due/assigned. Reuse the same library across weeks by creating separate PHA rows.",
  "Grade Band": "Grade band that receives this assignment (K-2, 3-4, 5-6, 7-8, 9-12).",
  "Homework Slot": "HW1 or HW2 — matches Submission Asset Purpose / Fillout slot.",
  "Active?": "Unchecked = ignored by Automation 033 / 020. Use to retire without deleting.",
  "Schedule Key":
    "Auto dedupe fingerprint: ProgramInstance|Week|GradeBand|Slot|Homework. Two Active rows with the same key = operator error.",
  "Program Homework Assignment Display":
    "Read-only human summary: Library | Program | Week | Grade Band | Slot.",
  "Homework Completions": "Inverse link — completions that resolved to this scheduled assignment.",
  "Program Instance RID": "Lookup helper for Schedule Key — do not edit.",
  "Week RID": "Lookup helper for Schedule Key — do not edit.",
  "Grade Band RID": "Lookup helper for Schedule Key — do not edit.",
  "Homework Assignment RID": "Lookup helper for Schedule Key — do not edit.",
};

for (const [name, description] of Object.entries(DESCRIPTIONS)) {
  const f = byName[name];
  if (!f) continue;
  if (f.description === description) {
    evidence.steps.push(`skip_desc_${name}`);
    continue;
  }
  await patchField(PHA, f.id, { description });
  evidence.steps.push(`desc_${name}`);
}

// Operator Status formula
if (!byName["Operator Status"]) {
  const formula = `IF(
  OR(
    NOT({${byName["Homework Assignment"].id}}),
    NOT({${byName["Program Instance"].id}}),
    NOT({${byName.Week.id}}),
    NOT({${byName["Grade Band"].id}}),
    NOT({${byName["Homework Slot"].id}})
  ),
  "Incomplete — fill Homework, Program, Week, Grade Band, Slot",
  IF(
    {${byName["Active?"].id}},
    "Active — will assign via 033 / resolve via 020",
    "Inactive — ignored by automations"
  )
)`;
  await createField(PHA, {
    name: "Operator Status",
    type: "formula",
    description:
      "At-a-glance health for Mike: Incomplete / Active / Inactive. Fix Incomplete before relying on Automation 033.",
    options: { formula },
  });
  evidence.steps.push("create_operator_status");
} else {
  evidence.steps.push("operator_status_exists");
}

// Operator Notes
if (!byName["Operator Notes"]) {
  await createField(PHA, {
    name: "Operator Notes",
    type: "multilineText",
    description: "Freeform notes for why this week/slot uses this library record. Not read by automations.",
  });
  evidence.steps.push("create_operator_notes");
} else {
  evidence.steps.push("operator_notes_exists");
}

// Refresh meta for Completions Count
const meta2 = await api("GET", `https://api.airtable.com/v0/meta/bases/${BASE}/tables`);
const pha2 = meta2.json.tables.find((t) => t.id === PHA);
const byName2 = Object.fromEntries(pha2.fields.map((f) => [f.name, f]));

if (!byName2["Completions Count"] && byName2["Homework Completions"]) {
  await createField(PHA, {
    name: "Completions Count",
    type: "count",
    description: "How many Homework Completions link to this scheduled assignment.",
    options: { recordLinkFieldId: byName2["Homework Completions"].id },
  });
  evidence.steps.push("create_completions_count");
} else {
  evidence.steps.push("completions_count_skip");
}

// HC field descriptions (legacy vs canonical)
const hcByName = Object.fromEntries(hc.fields.map((f) => [f.name, f]));
const HC_DESC = {
  "Weekly Athlete Summary":
    "LEGACY unused text field. Do not write. Canonical relationship is Weekly Athlete Summary Link.",
  "Weekly Athlete Summary Link":
    "Canonical link to Weekly Athlete Summary. Written by Automation 020 (from Submission) / maintained for quiz via 067 patterns.",
  "Program Homework Assignment":
    "Scheduled junction row (PHA). Written by Automation 020 when resolvable. Library Homework link remains required for XP/display.",
  "Homework Completion Key":
    "Identity helper: Enrollment|Week|Homework. One HC per enrollment+week+library preferred; 020 also scopes by Submission+slot.",
  Homework: "Reusable Homework Library library record (not the schedule row).",
};

for (const [name, description] of Object.entries(HC_DESC)) {
  const f = hcByName[name];
  if (!f) continue;
  if (f.description === description) {
    evidence.steps.push(`hc_skip_${name}`);
    continue;
  }
  await patchField(HC, f.id, { description });
  evidence.steps.push(`hc_desc_${name}`);
}

const wasByName = Object.fromEntries(was.fields.map((f) => [f.name, f]));
if (wasByName.Homework) {
  await patchField(WAS, wasByName.Homework.id, {
    description:
      "Assigned reusable library homework for this week (from Automation 033 via Program Homework Assignments when present, else legacy curriculum Week+Grade Band match). Perfect Week / rollups read this list.",
  });
  evidence.steps.push("was_homework_desc");
}

evidence.finishedAt = new Date().toISOString();
const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
const outPath = resolve(dir, "PHA-OPERATOR-HARDEN.json");
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    {
      ok: evidence.errors.length === 0,
      steps: evidence.steps,
      errorCount: evidence.errors.length,
      errors: evidence.errors,
      outPath,
    },
    null,
    2
  )
);
