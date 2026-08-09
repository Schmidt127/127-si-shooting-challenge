#!/usr/bin/env node
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

async function get(path) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, { headers });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 500));
  return j;
}

async function list(table, formula, fields) {
  const params = new URLSearchParams({ pageSize: "20" });
  if (formula) params.set("filterByFormula", formula);
  if (fields) for (const f of fields) params.append("fields[]", f);
  return (await get(`${encodeURIComponent(table)}?${params}`)).records || [];
}

const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers });
const tables = (await metaRes.json()).tables;
function table(name) {
  return tables.find((t) => t.name === name);
}
function fieldRid(t, name) {
  return (t.fields || []).find((f) => f.name === name);
}

const weeks = table("Weeks");
const gb = table("Grade Bands");
const pi = table("Program Instance - Synced");
const cur = table("Homework Library");
const enr = table("Enrollments");

const out = {
  weeksHasRecordId: !!fieldRid(weeks, "Record Id") || !!fieldRid(weeks, "Week Record ID"),
  weeksFields: (weeks.fields || []).filter((f) => /record|program|name|start|end/i.test(f.name)).map((f) => ({ name: f.name, id: f.id, type: f.type, formula: f.options?.formula })),
  gbFields: (gb.fields || []).filter((f) => /record|name|id/i.test(f.name)).map((f) => ({ name: f.name, id: f.id, type: f.type, formula: f.options?.formula })),
  piFields: (pi.fields || []).filter((f) => /record|name|key|id/i.test(f.name)).map((f) => ({ name: f.name, id: f.id, type: f.type, formula: f.options?.formula })),
  curRecordId: (cur.fields || []).filter((f) => /record|lesson key|id/i.test(f.name)).map((f) => ({ name: f.name, id: f.id, type: f.type, formula: f.options?.formula })),
  enrFields: (enr.fields || []).filter((f) => /program|grade|record/i.test(f.name)).map((f) => ({ name: f.name, id: f.id, type: f.type })),
};

const enrollment = await get(`${encodeURIComponent("Enrollments")}/recCyFEPeATOVNlr9`);
out.enrollment = {
  programInstance: enrollment.fields["Program Instance"],
  gradeBand: enrollment.fields["Grade Band"],
  name: enrollment.fields["Enrollment Name"] || enrollment.fields["Full Name"] || enrollment.fields["Name"],
};

const was = await get(`${encodeURIComponent("Weekly Athlete Summary")}/recKebuZ79QFTwivA`);
out.was = {
  week: was.fields.Week,
  gradeBand: was.fields["Grade Band"],
  enrollment: was.fields.Enrollment,
  homework: was.fields.Homework,
  homeworkAssignedCount: was.fields["Homework Assigned Count"],
  homeworkSatisfactoryCount: was.fields["Homework Satisfactory Count"],
  hwCompletionsLink: was.fields["Homework Completions Link"],
  pwHwAssigned: was.fields["Perfect Week Homework Assigned Count"],
  pwHwSatisfactory: was.fields["Perfect Week Homework Satisfactory Count"],
  pwHwMet: was.fields["Perfect Week Homework Requirement Met?"],
};

const gradeBands = await list("Grade Bands", null, ["Grade Band Name", "Min Grade", "Max Grade", "Active?"]);
out.gradeBands = gradeBands.map((r) => ({
  id: r.id,
  name: r.fields["Grade Band Name"],
  min: r.fields["Min Grade"],
  max: r.fields["Max Grade"],
  active: r.fields["Active?"],
}));

// Find curriculum candidates for 3-4
const gb34 = out.gradeBands.find((g) => g.name === "3-4" || (g.min === 3 && g.max === 4));
out.gradeBand34Id = gb34?.id;

if (gb34) {
  const curr = await list(
    "Homework Library",
    `AND({Active?}, FIND("${gb34.id}", ARRAYJOIN({Grade Band})))`,
    ["Assignment Full Name", "Assignment Title", "Homework Number", "Grade Band", "Week", "Active?", "Published?", "Assignment Number"]
  );
  out.curriculumCandidates = curr.slice(0, 15).map((r) => ({
    id: r.id,
    title: r.fields["Assignment Title"] || r.fields["Assignment Full Name"],
    hwNum: r.fields["Homework Number"],
    weeks: r.fields.Week,
    bands: r.fields["Grade Band"],
    published: r.fields["Published?"],
    assignmentNumber: r.fields["Assignment Number"],
  }));
}

writeFileSync(resolve(ROOT, "docs/testing/homework-assignments/fixtures/_context-probe.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
