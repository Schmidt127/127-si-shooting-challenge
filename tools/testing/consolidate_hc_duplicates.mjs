#!/usr/bin/env node
/**
 * SC-016 cleanup: consolidate Enrollment|Week|Homework|Slot duplicate HCs.
 * Prefer Satisfactory + most assets. Merge assets/submissions onto keeper; delete extras.
 * Also deletes orphan HOMEWORK_XP|{extraHcId} XP Events when found.
 *
 * Usage: node tools/testing/consolidate_hc_duplicates.mjs [--write]
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
const HC = "tblv58ppTFDBXb3nv";

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
const xpTable = meta.json.tables.find((t) => t.name === "XP Events");

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

const records = await listAll(HC, [
  "Enrollment",
  "Week",
  "Homework",
  "Item Slot",
  "Asset Slot",
  "Submissions - Linked",
  "Submission Assets",
  "Satisfactory?",
  "Total Homework XP Awarded",
  "Program Homework Assignment",
  "Weekly Athlete Summary Link",
]);

const groups = new Map();
for (const r of records) {
  const enr = (r.fields.Enrollment || [])[0];
  const week = (r.fields.Week || [])[0];
  const hw = (r.fields.Homework || [])[0];
  const slot = r.fields["Item Slot"] || r.fields["Asset Slot"] || "";
  if (!enr || !week || !hw || !slot) continue;
  const key = `${enr}|${week}|${hw}|${slot}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const dupes = [...groups.entries()].filter(([, rows]) => rows.length > 1);
const plan = [];

for (const [key, rows] of dupes) {
  const ranked = [...rows].sort((a, b) => {
    const aSat = a.fields["Satisfactory?"] ? 1 : 0;
    const bSat = b.fields["Satisfactory?"] ? 1 : 0;
    if (bSat !== aSat) return bSat - aSat;
    const aAssets = (a.fields["Submission Assets"] || []).length;
    const bAssets = (b.fields["Submission Assets"] || []).length;
    if (bAssets !== aAssets) return bAssets - aAssets;
    const aXp = Number(a.fields["Total Homework XP Awarded"] || 0);
    const bXp = Number(b.fields["Total Homework XP Awarded"] || 0);
    if (bXp !== aXp) return bXp - aXp;
    return a.id.localeCompare(b.id);
  });
  const keeper = ranked[0];
  const extras = ranked.slice(1);
  const mergedAssets = [
    ...new Set([
      ...(keeper.fields["Submission Assets"] || []),
      ...extras.flatMap((r) => r.fields["Submission Assets"] || []),
    ]),
  ];
  const mergedSubs = [
    ...new Set([
      ...(keeper.fields["Submissions - Linked"] || []),
      ...extras.flatMap((r) => r.fields["Submissions - Linked"] || []),
    ]),
  ];
  plan.push({
    key,
    keeperId: keeper.id,
    extraIds: extras.map((r) => r.id),
    mergedAssets,
    mergedSubs,
  });
}

const evidence = { write: WRITE, groups: plan.length, actions: [] };

if (WRITE) {
  for (const item of plan) {
    const patch = await api("PATCH", `https://api.airtable.com/v0/${BASE}/${HC}/${item.keeperId}`, {
      fields: {
        "Submission Assets": item.mergedAssets,
        "Submissions - Linked": item.mergedSubs,
      },
    });
    evidence.actions.push({ type: "merge_keeper", id: item.keeperId, ok: patch.ok, body: patch.ok ? null : patch.json });

    for (const extraId of item.extraIds) {
      // Delete orphan XP first
      if (xpTable) {
        const formula = encodeURIComponent(`{Source Key}='HOMEWORK_XP|${extraId}'`);
        const xpList = await api(
          "GET",
          `https://api.airtable.com/v0/${BASE}/${xpTable.id}?filterByFormula=${formula}&maxRecords=5`
        );
        for (const xp of xpList.json.records || []) {
          const delXp = await api("DELETE", `https://api.airtable.com/v0/${BASE}/${xpTable.id}/${xp.id}`);
          evidence.actions.push({ type: "delete_xp", id: xp.id, hc: extraId, ok: delXp.ok });
        }
      }
      const del = await api("DELETE", `https://api.airtable.com/v0/${BASE}/${HC}/${extraId}`);
      evidence.actions.push({ type: "delete_hc", id: extraId, ok: del.ok, body: del.ok ? null : del.json });
    }
  }
} else {
  evidence.plan = plan;
}

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
const outPath = resolve(dir, WRITE ? "SC-016-CONSOLIDATE-LIVE.json" : "SC-016-CONSOLIDATE-DRYRUN.json");
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    {
      ok: true,
      write: WRITE,
      groups: plan.length,
      extrasToDelete: plan.reduce((n, p) => n + p.extraIds.length, 0),
      outPath,
    },
    null,
    2
  )
);
