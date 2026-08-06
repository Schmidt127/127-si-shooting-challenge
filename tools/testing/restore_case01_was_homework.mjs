#!/usr/bin/env node
/**
 * Restore CASE-01 WAS homework links after failed write (REST API uses string IDs).
 * Also re-merge assets onto keepers if needed.
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
const WAS = "tbl9520d72adxlAKQ";
const WAS_ID = "recKebuZ79QFTwivA";
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: method === "GET" ? { Authorization: `Bearer ${TOKEN}` } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

// Prefer original CASE-01 libraries from runbook (HW1 + HW2)
const LIBRARY_HW1 = "rechVLOeyEVIqmy2v";
const LIBRARY_HW2 = "rec6WmXjpLtIWDERo"; // runbook original; PHA may have rec4MHWKWwsGOw26q

const before = await api("GET", `https://api.airtable.com/v0/${BASE}/${WAS}/${WAS_ID}`);
const restore = await api("PATCH", `https://api.airtable.com/v0/${BASE}/${WAS}/${WAS_ID}`, {
  fields: {
    Homework: [LIBRARY_HW1, LIBRARY_HW2],
  },
});

// Also try PHA-matched second library if runbook HW2 missing from PHA
const restore2 =
  restore.ok
    ? null
    : await api("PATCH", `https://api.airtable.com/v0/${BASE}/${WAS}/${WAS_ID}`, {
        fields: {
          Homework: [LIBRARY_HW1, "rec4MHWKWwsGOw26q"],
        },
      });

const after = await api("GET", `https://api.airtable.com/v0/${BASE}/${WAS}/${WAS_ID}`);

const evidence = {
  beforeHomework: before.json.fields?.Homework,
  restoreOk: restore.ok,
  restoreBody: restore.ok ? restore.json.fields?.Homework : restore.json,
  restore2,
  afterHomework: after.json.fields?.Homework,
  assignedCount: after.json.fields?.["Homework Assigned Count"],
  satisfactoryCount: after.json.fields?.["Homework Satisfactory Count"],
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "CASE01-WAS-HOMEWORK-RESTORE.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
