#!/usr/bin/env node
/**
 * Align CASE-01 PHA HW2 library with the satisfactory HC library (rec6WmXjpLtIWDERo),
 * then restore WAS.Homework to the two libraries Perfect Week already proved.
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
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: method === "GET" ? { Authorization: `Bearer ${TOKEN}` } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

const CANONICAL = {
  phaHw1: "reca5GM1JkROhXOiy",
  phaHw2: "reccQhrgOK8e8Yngv",
  libHw1: "rechVLOeyEVIqmy2v",
  libHw2: "rec6WmXjpLtIWDERo",
  was: "recKebuZ79QFTwivA",
};

const evidence = { steps: [] };

const pha2 = await api("PATCH", `https://api.airtable.com/v0/${BASE}/tblhA3maf7xOa8EUS/${CANONICAL.phaHw2}`, {
  fields: {
    "Homework Assignment": [CANONICAL.libHw2],
    "Program Homework Assignment": "HW2 | CASE-01 Sportsmanship (aligned)",
    "Operator Notes":
      "Aligned 2026-08-05 Agent1 to library rec6WmXjpLtIWDERo so WAS/HC Perfect Week CASE-01 stay consistent.",
  },
});
evidence.steps.push({ pha2Align: pha2.ok, hw: pha2.json.fields?.["Homework Assignment"] });

const was = await api("PATCH", `https://api.airtable.com/v0/${BASE}/tbl9520d72adxlAKQ/${CANONICAL.was}`, {
  fields: { Homework: [CANONICAL.libHw1, CANONICAL.libHw2] },
});
evidence.steps.push({ wasRestore: was.ok, homework: was.json.fields?.Homework });

const after = await api("GET", `https://api.airtable.com/v0/${BASE}/tbl9520d72adxlAKQ/${CANONICAL.was}`);
evidence.after = {
  homework: after.json.fields?.Homework,
  assigned: after.json.fields?.["Homework Assigned Count"],
  sat: after.json.fields?.["Homework Satisfactory Count"],
  eligible: after.json.fields?.["Perfect Week Eligible?"],
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "CASE01-PHA-ALIGN.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
