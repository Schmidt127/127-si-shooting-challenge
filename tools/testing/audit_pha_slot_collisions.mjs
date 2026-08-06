#!/usr/bin/env node
/**
 * Detect PHA slot collisions: same PI+Week+GradeBand+Slot with different libraries.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
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
const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = "appn84sqPw03zEbTT";
const PHA = "tblhA3maf7xOa8EUS";

async function listAll() {
  const out = [];
  let offset;
  do {
    const qs = new URLSearchParams();
    for (const f of [
      "Program Homework Assignment",
      "Homework Assignment",
      "Program Instance",
      "Week",
      "Grade Band",
      "Homework Slot",
      "Active?",
      "Schedule Key",
      "Operator Notes",
    ])
      qs.append("fields[]", f);
    if (offset) qs.set("offset", offset);
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${PHA}?${qs}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const j = await r.json();
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

const rows = await listAll();
const map = new Map();
for (const r of rows) {
  if (!r.fields["Active?"]) continue;
  const pi = (r.fields["Program Instance"] || [])[0];
  const week = (r.fields.Week || [])[0];
  const gb = (r.fields["Grade Band"] || [])[0];
  const slot = r.fields["Homework Slot"];
  if (!pi || !week || !gb || !slot) continue;
  const key = `${pi}|${week}|${gb}|${slot}`;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push({
    id: r.id,
    name: r.fields["Program Homework Assignment"],
    hw: (r.fields["Homework Assignment"] || [])[0],
    notes: r.fields["Operator Notes"] || "",
  });
}

const collisions = [...map.entries()]
  .filter(([, list]) => list.length > 1)
  .map(([key, list]) => ({ key, count: list.length, rows: list }));

const evidence = {
  active: rows.filter((r) => r.fields["Active?"]).length,
  collisionGroups: collisions.length,
  collisions,
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "PHA-SLOT-COLLISIONS.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ active: evidence.active, collisionGroups: collisions.length, sample: collisions.slice(0, 3) }, null, 2));
