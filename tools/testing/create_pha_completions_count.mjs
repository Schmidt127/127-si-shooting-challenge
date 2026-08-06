#!/usr/bin/env node
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
const meta = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
}).then((r) => r.json());
const pha = meta.tables.find((t) => t.id === PHA);
const byName = Object.fromEntries(pha.fields.map((f) => [f.name, f]));
const evidence = { steps: [] };
if (!byName["Completions Count"] && byName["Homework Completions"]) {
  const r = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables/${PHA}/fields`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Completions Count",
      type: "count",
      description: "How many Homework Completions link to this scheduled assignment.",
      options: { recordLinkFieldId: byName["Homework Completions"].id },
    }),
  });
  const j = await r.json();
  evidence.steps.push({ create: r.ok, status: r.status, body: j });
} else {
  evidence.steps.push({ skip: true, exists: !!byName["Completions Count"] });
}
const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "PHA-COMPLETIONS-COUNT.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
