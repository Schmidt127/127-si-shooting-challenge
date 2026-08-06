#!/usr/bin/env node
/**
 * PROD homework MVP state probe — Library, PHA, WAS, HC, rollups.
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

async function listAll(tableId, fields) {
  const out = [];
  let offset;
  do {
    const qs = new URLSearchParams();
    if (fields) for (const f of fields) qs.append("fields[]", f);
    if (offset) qs.set("offset", offset);
    const r = await api("GET", `https://api.airtable.com/v0/${BASE}/${tableId}?${qs}`);
    if (!r.ok) throw new Error(`list ${tableId}: ${JSON.stringify(r.json)}`);
    out.push(...(r.json.records || []));
    offset = r.json.offset;
  } while (offset);
  return out;
}

const IDS = {
  pha: "tblhA3maf7xOa8EUS",
  curriculum: "tblUuxwYlX4EQ9MKE",
  hc: "tblv58ppTFDBXb3nv",
  was: null, // resolve by name
  enrollments: null,
  weeks: "tblcsKugv1cla36A6",
  gradeBands: "tblOhHrIqpjcsk2WG",
};

const meta = await api("GET", `https://api.airtable.com/v0/meta/bases/${BASE}/tables`);
if (!meta.ok) throw new Error(JSON.stringify(meta.json));

const tables = meta.json.tables;
const byName = Object.fromEntries(tables.map((t) => [t.name, t]));

function fieldSummary(table) {
  return (table.fields || []).map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    description: f.description || null,
    formula: f.options?.formula || null,
    linkedTableId: f.options?.linkedTableId || null,
  }));
}

const pha = byName["Program Homework Assignments"];
const curriculum = byName["FBC Curriculum - SYNC"];
const hc = byName["Homework Completions"];
const was = byName["Weekly Athlete Summary"];
const enrollments = byName["Enrollments"];
const assets = byName["Submission Assets"];
const submissions = byName["Submissions"];

IDS.was = was?.id;
IDS.enrollments = enrollments?.id;

const phaRecords = await listAll(IDS.pha, [
  "Program Homework Assignment",
  "Program Homework Assignment Display",
  "Homework Assignment",
  "Program Instance",
  "Week",
  "Grade Band",
  "Homework Slot",
  "Active?",
  "Schedule Key",
  "Homework Completions",
]);

const phaActive = phaRecords.filter((r) => r.fields["Active?"]);
const scheduleKeys = phaRecords.map((r) => r.fields["Schedule Key"]).filter(Boolean);
const dupKeys = scheduleKeys.filter((k, i) => scheduleKeys.indexOf(k) !== i);

// Schmidt enrollment / WAS known IDs from docs
const SCHMIDT = {
  athlete: "recgqVstObQRzgXJF",
  enrollment: "recgP9qZYjAhE7NXm",
  wasCurrent: "recuxvGq2kY8WKcey",
  wasPerfectWeek: "recKebuZ79QFTwivA",
};

async function getRecord(tableId, id, fields) {
  const qs = fields ? "?" + fields.map((f) => `fields[]=${encodeURIComponent(f)}`).join("&") : "";
  const r = await api("GET", `https://api.airtable.com/v0/${BASE}/${tableId}/${id}${qs}`);
  return r;
}

const wasPw = await getRecord(IDS.was, SCHMIDT.wasPerfectWeek, [
  "Week",
  "Grade Band",
  "Homework",
  "Enrollment",
  "Homework Assigned Count",
  "Homework Satisfactory Count",
  "Perfect Week Homework Requirement Met?",
]);

const wasCur = await getRecord(IDS.was, SCHMIDT.wasCurrent, [
  "Week",
  "Grade Band",
  "Homework",
  "Enrollment",
  "Homework Assigned Count",
  "Homework Satisfactory Count",
]);

const enr = await getRecord(IDS.enrollments, SCHMIDT.enrollment, [
  "Athlete",
  "Grade Band",
  "Program Instance",
  "Active?",
]);

// Sample curriculum with Week links
const curriculumSample = await listAll(IDS.curriculum, [
  "Assignment Full Name",
  "Assignment Number",
  "Week",
  "Grade Band",
  "Active?",
  "Published?",
]);
const withWeek = curriculumSample.filter((r) => (r.fields.Week || []).length);
const publishedActive = curriculumSample.filter(
  (r) => r.fields["Active?"] && r.fields["Published?"]
);

// HC linked to PHA
const hcAll = await listAll(IDS.hc, [
  "Homework",
  "Program Homework Assignment",
  "Enrollment",
  "Week",
  "Weekly Athlete Summary Link",
  "Item Slot",
  "Satisfactory?",
  "Review Status",
]);
const hcWithPha = hcAll.filter((r) => (r.fields["Program Homework Assignment"] || []).length);
const hcSchmidt = hcAll.filter((r) => (r.fields.Enrollment || []).includes(SCHMIDT.enrollment));

// Check HC fields of interest
const hcFieldsOfInterest = fieldSummary(hc).filter((f) =>
  /homework|was|weekly|slot|satisfactory|pha|program|grade|week|dedupe|identity|completion/i.test(
    f.name
  )
);

const wasFieldsOfInterest = fieldSummary(was).filter((f) =>
  /homework|pha|program|assigned|satisfactory|perfect/i.test(f.name)
);

const phaFields = fieldSummary(pha);

const out = {
  probedAt: new Date().toISOString(),
  base: BASE,
  tables: {
    pha: { id: pha?.id, fieldCount: pha?.fields?.length, fields: phaFields },
    curriculum: { id: curriculum?.id, fieldCount: curriculum?.fields?.length },
    hc: { id: hc?.id, fieldCount: hc?.fields?.length, fieldsOfInterest: hcFieldsOfInterest },
    was: { id: was?.id, fieldCount: was?.fields?.length, fieldsOfInterest: wasFieldsOfInterest },
    assets: { id: assets?.id },
    submissions: { id: submissions?.id },
  },
  pha: {
    total: phaRecords.length,
    active: phaActive.length,
    duplicateScheduleKeys: [...new Set(dupKeys)],
    records: phaRecords.map((r) => ({
      id: r.id,
      name: r.fields["Program Homework Assignment"],
      display: r.fields["Program Homework Assignment Display"],
      slot: r.fields["Homework Slot"],
      active: !!r.fields["Active?"],
      scheduleKey: r.fields["Schedule Key"],
      homework: r.fields["Homework Assignment"],
      week: r.fields.Week,
      gradeBand: r.fields["Grade Band"],
      programInstance: r.fields["Program Instance"],
      hcCount: (r.fields["Homework Completions"] || []).length,
    })),
  },
  curriculum: {
    total: curriculumSample.length,
    withWeekLinks: withWeek.length,
    publishedActive: publishedActive.length,
  },
  homeworkCompletions: {
    total: hcAll.length,
    withPhaLink: hcWithPha.length,
    schmidtCount: hcSchmidt.length,
    schmidt: hcSchmidt.map((r) => ({
      id: r.id,
      homework: r.fields.Homework,
      pha: r.fields["Program Homework Assignment"],
      week: r.fields.Week,
      slot: r.fields["Item Slot"],
      wasLink: r.fields["Weekly Athlete Summary Link"],
      satisfactory: r.fields["Satisfactory?"],
    })),
  },
  schmidt: {
    enrollment: enr.ok ? { id: SCHMIDT.enrollment, fields: enr.json.fields } : enr,
    wasPerfectWeek: wasPw.ok ? { id: SCHMIDT.wasPerfectWeek, fields: wasPw.json.fields } : wasPw,
    wasCurrent: wasCur.ok ? { id: SCHMIDT.wasCurrent, fields: wasCur.json.fields } : wasCur,
  },
};

const evidenceDir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(evidenceDir, { recursive: true });
const outPath = resolve(evidenceDir, "MVP-STATE-PROBE.json");
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ok: true, outPath, summary: {
  phaTotal: out.pha.total,
  phaActive: out.pha.active,
  dupKeys: out.pha.duplicateScheduleKeys.length,
  hcWithPha: out.homeworkCompletions.withPhaLink,
  schmidtHc: out.homeworkCompletions.schmidtCount,
  curriculumWithWeek: out.curriculum.withWeekLinks,
}}, null, 2));
