#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
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
const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const tables = (await res.json()).tables;
const was = tables.find((t) => t.name === "Weekly Athlete Summary");
for (const name of [
  "Homework Assigned Count",
  "Homework Satisfactory Count",
  "Homework",
  "Homework Completions Link",
]) {
  const f = (was.fields || []).find((x) => x.name === name);
  console.log(JSON.stringify({ name, id: f?.id, type: f?.type, options: f?.options }, null, 2));
}

const hc = tables.find((t) => t.name === "Homework Completions");
const sat = (hc.fields || []).find((f) => f.name === "Satisfactory?");
console.log("Satisfactory?", sat?.id, sat?.type);

// re-read HCs and WAS
async function get(table, id) {
  const r = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return r.json();
}
const wasRec = await get("Weekly Athlete Summary", "recKebuZ79QFTwivA");
const hc1 = await get("Homework Completions", "recqXxlOpATQI3sD4");
const hc2 = await get("Homework Completions", "rechzFmWrUp1tonto");
console.log("WAS counts", {
  assigned: wasRec.fields["Homework Assigned Count"],
  sat: wasRec.fields["Homework Satisfactory Count"],
  hw: wasRec.fields.Homework,
  hcl: wasRec.fields["Homework Completions Link"],
});
console.log("HC sat", {
  hc1: hc1.fields["Satisfactory?"],
  hc2: hc2.fields["Satisfactory?"],
  status1: hc1.fields["Completion Status"],
  status2: hc2.fields["Completion Status"],
});
