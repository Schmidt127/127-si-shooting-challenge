#!/usr/bin/env node
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
const headers = { Authorization: `Bearer ${TOKEN}` };

for (const url of [
  `https://api.airtable.com/v0/meta/bases/${BASE}/automations`,
  `https://api.airtable.com/v0/meta/bases/${BASE}/scripts`,
]) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log("\n===", url, res.status, "===");
  console.log(text.slice(0, 800));
}

const week = await (
  await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent("Weeks")}/reci5GdxEC57vfoS3`, {
    headers,
  })
).json();
console.log("\nWEEK FIELDS:", JSON.stringify(week.fields, null, 2));

// XP Events field names for create
const tables = await (await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers })).json();
const xpTable = (tables.tables || []).find((t) => t.name === "XP Events");
const xpFields = (xpTable?.fields || []).map((f) => ({ name: f.name, type: f.type, options: f.options?.choices?.map((c) => c.name) }));
writeFileSync(
  resolve(ROOT, "docs/testing/evidence/2026-08-05-agent3-perfect-week/XP-EVENTS-SCHEMA.json"),
  JSON.stringify(xpFields, null, 2)
);
console.log("\nXP Events writable-ish fields count:", xpFields.length);
const interesting = xpFields.filter((f) =>
  /xp|source|bucket|week|enroll|achievement|activity|award|active|process|reason|note/i.test(f.name)
);
console.log(JSON.stringify(interesting, null, 2));
