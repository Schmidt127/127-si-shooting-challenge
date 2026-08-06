#!/usr/bin/env node
/**
 * Live-test Automation 033 PHA matching against a WAS:
 * clears Homework (optional), resolves via PHA (same rules as 033 v3.3), writes links.
 *
 * Usage:
 *   node tools/testing/live_test_033_pha_assign.mjs --was recXXXXXXXX [--write]
 * Default WAS: Perfect Week CASE-01 if homework already assigned; creates proof of PHA path.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local")]) {
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
const WRITE = process.argv.includes("--write");
const wasArg = process.argv.find((a, i) => process.argv[i - 1] === "--was");
const WAS_ID = wasArg || "recKebuZ79QFTwivA";

const IDS = {
  was: "tbl9520d72adxlAKQ",
  pha: "tblhA3maf7xOa8EUS",
  enrollments: "tblXXXXXXXX", // resolve
  curriculum: "tblUuxwYlX4EQ9MKE",
};

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
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const meta = await api("GET", `https://api.airtable.com/v0/meta/bases/${BASE}/tables`);
const tables = meta.json.tables;
IDS.enrollments = tables.find((t) => t.name === "Enrollments").id;
IDS.was = tables.find((t) => t.name === "Weekly Athlete Summary").id;

async function get(tableId, id) {
  return api("GET", `https://api.airtable.com/v0/${BASE}/${tableId}/${id}`);
}
async function listAll(tableId, fields) {
  const out = [];
  let offset;
  do {
    const qs = new URLSearchParams();
    if (fields) for (const f of fields) qs.append("fields[]", f);
    if (offset) qs.set("offset", offset);
    const r = await api("GET", `https://api.airtable.com/v0/${BASE}/${tableId}?${qs}`);
    if (!r.ok) throw new Error(JSON.stringify(r.json));
    out.push(...r.json.records);
    offset = r.json.offset;
  } while (offset);
  return out;
}

const was = await get(IDS.was, WAS_ID);
if (!was.ok) throw new Error("WAS " + JSON.stringify(was.json));

const weekId = (was.json.fields.Week || [])[0];
const gradeBandId = (was.json.fields["Grade Band"] || [])[0];
const enrollmentId = (was.json.fields.Enrollment || [])[0];
const existingHw = was.json.fields.Homework || [];

let programInstanceId = "";
if (enrollmentId) {
  const enr = await get(IDS.enrollments, enrollmentId);
  if (enr.ok) programInstanceId = (enr.json.fields["Program Instance"] || [])[0] || "";
}

const pha = await listAll(IDS.pha, [
  "Homework Assignment",
  "Program Instance",
  "Week",
  "Grade Band",
  "Homework Slot",
  "Active?",
  "Program Homework Assignment",
]);

const matching = pha
  .filter((r) => {
    if (!r.fields["Active?"]) return false;
    if ((r.fields.Week || [])[0] !== weekId) return false;
    if ((r.fields["Grade Band"] || [])[0] !== gradeBandId) return false;
    if (programInstanceId) {
      const pi = (r.fields["Program Instance"] || [])[0];
      if (pi && pi !== programInstanceId) return false;
    }
    return (r.fields["Homework Assignment"] || []).length > 0;
  })
  .sort((a, b) => {
    const rank = (s) => (s === "HW1" ? 1 : s === "HW2" ? 2 : 9);
    return rank(a.fields["Homework Slot"]) - rank(b.fields["Homework Slot"]);
  });

const seen = new Set();
const matchedLibraryIds = [];
for (const r of matching) {
  const id = r.fields["Homework Assignment"][0];
  if (seen.has(id)) continue;
  seen.add(id);
  matchedLibraryIds.push(id);
}

const evidence = {
  wasId: WAS_ID,
  weekId,
  gradeBandId,
  enrollmentId,
  programInstanceId,
  existingHomework: existingHw,
  phaMatchCount: matching.length,
  matchedLibraryIds,
  matchSource: matchedLibraryIds.length ? "program_homework_assignments" : "none",
  write: WRITE,
  writeResult: null,
};

if (WRITE && matchedLibraryIds.length) {
  // Clear then write to prove assign path (033 skips when already assigned)
  const clear = await api("PATCH", `https://api.airtable.com/v0/${BASE}/${IDS.was}/${WAS_ID}`, {
    fields: { Homework: [] },
  });
  const assign = await api("PATCH", `https://api.airtable.com/v0/${BASE}/${IDS.was}/${WAS_ID}`, {
    fields: { Homework: matchedLibraryIds },
  });
  evidence.writeResult = {
    cleared: clear.ok,
    assigned: assign.ok,
    after: assign.json.fields?.Homework || assign.json,
  };
}

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
const outPath = resolve(dir, `033-PHA-ASSIGN-${WAS_ID}.json`);
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    {
      ok: matchedLibraryIds.length > 0,
      wasId: WAS_ID,
      matchSource: evidence.matchSource,
      matched: matchedLibraryIds.length,
      wrote: WRITE && !!evidence.writeResult?.assigned,
      outPath,
    },
    null,
    2
  )
);
