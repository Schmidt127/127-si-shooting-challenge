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
const GB34 = "reclWDQZzKbVBtdhG";

async function listAll(formula) {
  const out = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (formula) params.set("filterByFormula", formula);
    if (offset) params.set("offset", offset);
    for (const f of [
      "Assignment Title",
      "Homework Number",
      "Grade Band",
      "Week",
      "Active?",
      "Published?",
      "Assignment Number",
      "Assignment Full Name",
    ]) {
      params.append("fields[]", f);
    }
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent("FBC Curriculum - SYNC")}?${params}`,
      { headers }
    );
    const j = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 500));
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

const byName = await listAll('FIND("3-4", ARRAYJOIN({Grade Band} & ""))');
const hw12 = await listAll('OR({Homework Number}="HW 1",{Homework Number}="HW 2")');
const withGb34 = hw12.filter((r) => (r.fields["Grade Band"] || []).includes(GB34));

const result = {
  byNameCount: byName.length,
  hw12Count: hw12.length,
  hw12WithGb34: withGb34.map((r) => ({
    id: r.id,
    title: r.fields["Assignment Title"] || r.fields["Assignment Full Name"],
    hw: r.fields["Homework Number"],
    active: r.fields["Active?"],
    published: r.fields["Published?"],
    weeks: r.fields.Week,
    bands: r.fields["Grade Band"],
    n: r.fields["Assignment Number"],
  })),
  sampleHw12: hw12.slice(0, 20).map((r) => ({
    id: r.id,
    title: r.fields["Assignment Title"],
    hw: r.fields["Homework Number"],
    bands: r.fields["Grade Band"],
    active: r.fields["Active?"],
    published: r.fields["Published?"],
  })),
};

writeFileSync(
  resolve(ROOT, "docs/testing/homework-assignments/fixtures/_curriculum-candidates.json"),
  JSON.stringify(result, null, 2)
);
console.log(JSON.stringify(result, null, 2));
