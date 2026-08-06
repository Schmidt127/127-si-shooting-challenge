#!/usr/bin/env node
/**
 * SC-016: Audit Homework Completion duplicates in PROD.
 * Identity lenses:
 *  A) Enrollment|Week|Homework (formula key)
 *  B) Enrollment|Week|Homework|Slot
 *  C) Submission|Homework|Slot (020 exact match)
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
const HC = "tblv58ppTFDBXb3nv";
if (!TOKEN) {
  console.error("NO_TOKEN");
  process.exit(1);
}

async function api(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

async function listAll() {
  const out = [];
  let offset;
  do {
    const qs = new URLSearchParams();
    for (const f of [
      "Homework Completion Full Name",
      "Homework Completion Key",
      "Enrollment",
      "Week",
      "Homework",
      "Item Slot",
      "Asset Slot",
      "Submissions - Linked",
      "Submission Assets",
      "Program Homework Assignment",
      "Satisfactory?",
      "Total Homework XP Awarded",
      "Weekly Athlete Summary Link",
    ])
      qs.append("fields[]", f);
    if (offset) qs.set("offset", offset);
    const r = await api(`https://api.airtable.com/v0/${BASE}/${HC}?${qs}`);
    if (!r.ok) throw new Error(JSON.stringify(r.json));
    out.push(...r.json.records);
    offset = r.json.offset;
  } while (offset);
  return out;
}

const records = await listAll();

function groupBy(fn) {
  const map = new Map();
  for (const r of records) {
    const key = fn(r);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return [...map.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      count: rows.length,
      ids: rows.map((r) => r.id),
      slots: rows.map((r) => r.fields["Item Slot"] || r.fields["Asset Slot"] || null),
      submissions: rows.map((r) => (r.fields["Submissions - Linked"] || [])[0] || null),
      assets: rows.map((r) => (r.fields["Submission Assets"] || []).length),
      satisfactory: rows.map((r) => !!r.fields["Satisfactory?"]),
      xp: rows.map((r) => r.fields["Total Homework XP Awarded"] || 0),
      pha: rows.map((r) => (r.fields["Program Homework Assignment"] || [])[0] || null),
    }));
}

const lensA = groupBy((r) => r.fields["Homework Completion Key"] || null);
const lensB = groupBy((r) => {
  const enr = (r.fields.Enrollment || [])[0];
  const week = (r.fields.Week || [])[0];
  const hw = (r.fields.Homework || [])[0];
  const slot = r.fields["Item Slot"] || r.fields["Asset Slot"] || "";
  if (!enr || !week || !hw) return null;
  return `${enr}|${week}|${hw}|${slot}`;
});
const lensC = groupBy((r) => {
  const sub = (r.fields["Submissions - Linked"] || [])[0];
  const hw = (r.fields.Homework || [])[0];
  const slot = r.fields["Item Slot"] || r.fields["Asset Slot"] || "";
  if (!sub || !hw || !slot) return null;
  return `${sub}|${hw}|${slot}`;
});

const evidence = {
  probedAt: new Date().toISOString(),
  totalHc: records.length,
  duplicateGroups: {
    enrollmentWeekHomework: { count: lensA.length, groups: lensA },
    enrollmentWeekHomeworkSlot: { count: lensB.length, groups: lensB },
    submissionHomeworkSlot: { count: lensC.length, groups: lensC },
  },
  sc016Verdict:
    lensC.length === 0
      ? lensB.length === 0
        ? "PASS_NO_DUPES_ON_020_OR_SLOT_LENS"
        : "WARN_DUPES_ON_ENROLLMENT_WEEK_HW_SLOT"
      : "FAIL_DUPES_ON_020_SUBMISSION_SLOT_LENS",
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
const outPath = resolve(dir, "SC-016-HC-DEDUPE-AUDIT.json");
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    {
      ok: true,
      totalHc: records.length,
      lensA: lensA.length,
      lensB: lensB.length,
      lensC: lensC.length,
      verdict: evidence.sc016Verdict,
      outPath,
    },
    null,
    2
  )
);
