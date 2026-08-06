#!/usr/bin/env node
/**
 * Attempt to bounce unlock fields to see if Automation 059 auto-fires.
 * Then poll for XP Events on the unlock.
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
const UNLOCK = "recALZFQNL3XicEOX";
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function get() {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent("Athlete Achievement Unlocks")}/${UNLOCK}`,
    { headers }
  );
  return res.json();
}

async function patch(fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent("Athlete Achievement Unlocks")}/${UNLOCK}`,
    { method: "PATCH", headers, body: JSON.stringify({ fields }) }
  );
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j;
}

const before = await get();
console.log("before", {
  status: before.fields["XP Award Status"],
  ready: before.fields["Ready for 059 XP?"],
  xp: before.fields["XP Events"],
  shot: before.fields["Shot Milestone"],
});

// Bounce: Pending -> Error -> Pending (keeps Ready path if matches-conditions on Pending)
await patch({ "XP Award Status": "Error" });
await new Promise((r) => setTimeout(r, 2000));
await patch({ "XP Award Status": "Pending" });

const polls = [];
for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const cur = await get();
  const snap = {
    t: new Date().toISOString(),
    status: cur.fields["XP Award Status"],
    ready: cur.fields["Ready for 059 XP?"],
    xp: cur.fields["XP Events"] || [],
  };
  polls.push(snap);
  console.log("poll", i + 1, snap);
  if ((snap.xp || []).length > 0 || snap.status === "Awarded") break;
}

const out = {
  probedAt: new Date().toISOString(),
  unlockId: UNLOCK,
  bounced: true,
  before: {
    status: before.fields["XP Award Status"],
    ready: before.fields["Ready for 059 XP?"],
    xp: before.fields["XP Events"],
    shotMilestone: before.fields["Shot Milestone"] || [],
  },
  polls,
  autoFired: polls.some((p) => (p.xp || []).length > 0 || p.status === "Awarded"),
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent3-perfect-week");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "059-RETRIGGER-BOUNCE.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
