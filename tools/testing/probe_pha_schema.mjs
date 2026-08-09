#!/usr/bin/env node
/**
 * Probe PROD schema for Program Homework Assignments MVP dependency audit.
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
const headers = { Authorization: `Bearer ${TOKEN}` };

async function meta() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j));
  return j.tables;
}

function summarizeTable(t, nameHints = []) {
  const fields = (t.fields || []).map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    options: f.options
      ? {
          linkedTableId: f.options.linkedTableId,
          prefersSingleRecordLink: f.options.prefersSingleRecordLink,
          choices: f.options.choices?.map((c) => c.name),
          formula: f.options.formula,
          isValid: f.options.isValid,
          result: f.options.result,
        }
      : undefined,
  }));
  const interesting = fields.filter((f) =>
    /week|grade|homework|slot|hw|active|publish|program|curriculum|assign|number|title|name|submission|complet/i.test(
      f.name
    )
  );
  return {
    id: t.id,
    name: t.name,
    fieldCount: fields.length,
    interesting,
    allNames: fields.map((f) => f.name),
  };
}

const tables = await meta();
const want = [
  "Homework Library",
  "Homework Completions",
  "Submissions",
  "Weekly Athlete Summary",
  "Weeks",
  "Program Instance - Synced",
  "Grade Bands",
  "Program Homework Assignments",
];

const out = { probedAt: new Date().toISOString(), tables: {} };
for (const name of want) {
  const t = tables.find((x) => x.name === name);
  out.tables[name] = t ? summarizeTable(t) : null;
}

// Also dump formula fields that reference curriculum / homework week
out.formulaRefs = [];
for (const t of tables) {
  for (const f of t.fields || []) {
    const formula = f.options?.formula || "";
    if (
      /fld|Homework|Curriculum|Week|Grade Band|HW1|HW2|Assigned|Satisfactory/i.test(formula) ||
      /Homework|Curriculum|Assigned Count|Satisfactory/i.test(f.name)
    ) {
      if (
        /Homework|Curriculum|Assigned|Satisfactory|FBC/i.test(f.name) ||
        /Curriculum|Homework Completions|Assigned|Satisfactory/i.test(formula)
      ) {
        out.formulaRefs.push({
          table: t.name,
          tableId: t.id,
          field: f.name,
          fieldId: f.id,
          type: f.type,
          formula: formula.slice(0, 500) || undefined,
        });
      }
    }
  }
}

writeFileSync(
  resolve(ROOT, "docs/testing/homework-assignments/fixtures/_schema-probe.json"),
  JSON.stringify(out, null, 2)
);
console.log(
  JSON.stringify(
    {
      curriculum: out.tables["Homework Library"],
      completions: out.tables["Homework Completions"]?.interesting,
      was: out.tables["Weekly Athlete Summary"]?.interesting?.filter((f) =>
        /homework|assigned|satisfactory/i.test(f.name)
      ),
      submissions: out.tables["Submissions"]?.interesting?.filter((f) => /homework|hw/i.test(f.name)),
      phaExists: !!out.tables["Program Homework Assignments"],
    },
    null,
    2
  )
);
