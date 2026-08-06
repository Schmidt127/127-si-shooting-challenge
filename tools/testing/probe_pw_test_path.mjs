#!/usr/bin/env node
/**
 * Inspect PROD Submissions fields for Perfect Week test path package.
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
const BASE = process.env.AIRTABLE_BASE_ID || "appn84sqPw03zEbTT";
const headers = { Authorization: `Bearer ${TOKEN}` };

async function main() {
  const meta = await (
    await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers })
  ).json();
  const sub = meta.tables.find((t) => t.id === "tblEVjVpGGlPTsYSt" || t.name === "Submissions");
  if (!sub) throw new Error("Submissions table not found");

  const want = [
    "Perfect Week Test Record?",
    "Perfect Week Test Submitted At",
    "Submitted Same Day?",
    "Perfect Week Countable Submission?",
    "Activity Date",
    "Created",
    "Enrollment",
    "Testing Scenarios",
    "Weekly Athlete Summary",
    "Enrollment Record ID",
    "Enrollment RID",
    "Enrollment Record ID Lookup",
  ];

  const byName = Object.fromEntries(sub.fields.map((f) => [f.name, f]));
  const report = {
    tableId: sub.id,
    tableName: sub.name,
    fields: {},
    enrollmentLookups: sub.fields
      .filter(
        (f) =>
          /enrollment/i.test(f.name) &&
          (f.type === "multipleLookupValues" ||
            f.type === "formula" ||
            f.type === "multipleRecordLinks")
      )
      .map((f) => ({
        name: f.name,
        type: f.type,
        id: f.id,
        formula: f.options?.formula,
        linkedTableId: f.options?.linkedTableId,
        recordLinkFieldId: f.options?.recordLinkFieldId,
        fieldIdInLinkedTable: f.options?.fieldIdInLinkedTable,
      })),
    allFieldNames: sub.fields.map((f) => f.name),
  };

  for (const name of want) {
    const f = byName[name];
    report.fields[name] = f
      ? {
          id: f.id,
          type: f.type,
          formula: f.options?.formula || null,
          options: f.options
            ? {
                timeZone: f.options.timeZone || f.options.result?.options?.timeZone,
                dateFormat: f.options.dateFormat || f.options.result?.options?.dateFormat,
                icon: f.options.icon,
                color: f.options.color,
                resultType: f.options.result?.type,
              }
            : null,
        }
      : null;
  }

  // Created field - user said fld4G2aFUD8mxwjJ5; verify
  const createdById = sub.fields.find((f) => f.id === "fld4G2aFUD8mxwjJ5");
  report.createdById = createdById
    ? { name: createdById.name, type: createdById.type, id: createdById.id }
    : null;

  // Find any field named Created / CREATED_TIME related
  report.createdLike = sub.fields
    .filter((f) => /^created$/i.test(f.name) || f.type === "createdTime")
    .map((f) => ({ name: f.name, type: f.type, id: f.id }));

  // Enrollment table fields that might help RID
  const enr = meta.tables.find((t) => t.name === "Enrollments");
  report.enrollmentPrimary = enr
    ? {
        id: enr.id,
        primary: enr.fields.find((f) => f.id === enr.primaryFieldId)?.name,
        recordIdFields: enr.fields
          .filter((f) => /record.?id|rid/i.test(f.name) || f.type === "formula")
          .slice(0, 30)
          .map((f) => ({ name: f.name, type: f.type, id: f.id, formula: f.options?.formula })),
      }
    : null;

  // Formulas elsewhere referencing Submitted Same Day or Countable
  const refs = [];
  for (const table of meta.tables) {
    for (const field of table.fields) {
      const formula = field.options?.formula || "";
      const names = field.options?.referencedFieldNames || [];
      if (
        formula.includes("fldE7G8H1O7HPYuIi") ||
        formula.includes("fldYDitgQr6jgoDMk") ||
        names.includes("Submitted Same Day?") ||
        names.includes("Perfect Week Countable Submission?") ||
        /Submitted Same Day|Perfect Week Countable/i.test(formula)
      ) {
        refs.push({
          table: table.name,
          field: field.name,
          type: field.type,
          formula: formula.slice(0, 500),
        });
      }
    }
  }
  report.formulaDepsOnSameDayOrCountable = refs;

  // Verify enrollment exists
  const enrRes = await fetch(
    `https://api.airtable.com/v0/${BASE}/Enrollments/recCyFEPeATOVNlr9`,
    { headers }
  );
  const enrText = await enrRes.text();
  report.testingEnrollment = enrRes.ok
    ? {
        id: "recCyFEPeATOVNlr9",
        fields: Object.fromEntries(
          Object.entries(JSON.parse(enrText).fields || {}).filter(([k]) =>
            /Name|Program|Active|Athlete|Email|Grade/i.test(k)
          )
        ),
      }
    : { error: enrText.slice(0, 300) };

  // Evidence records
  for (const [label, table, id] of [
    ["case07", "Submissions", "recxbwkZpSJZ5eiqA"],
    ["case02sub", "Submissions", "recbr8gduRKmpiDkd"],
    ["case02was", "Weekly Athlete Summary", "recMMeJENu6Pg8l58"],
  ]) {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`,
      { headers }
    );
    const text = await res.text();
    report[label] = res.ok
      ? { id, fields: pickRelevant(JSON.parse(text).fields) }
      : { id, error: text.slice(0, 200) };
  }

  const out = resolve(ROOT, "docs/testing/perfect-week/fixtures/_pw-test-path-probe.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

function pickRelevant(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (
      /Activity|Submitted|Countable|Shot|Enrollment|Week|Perfect Week|Eligible|Daily|Video|Zoom|Goal/i.test(
        k
      )
    ) {
      out[k] = v;
    }
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
