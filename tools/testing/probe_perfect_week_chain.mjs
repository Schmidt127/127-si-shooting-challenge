#!/usr/bin/env node
/** Fetch unlock + linked XP for CASE-01 Perfect Week chain. */
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
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function get(table, id) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`, { headers });
  const j = await res.json();
  if (!res.ok) throw new Error(`${table}/${id}: ${JSON.stringify(j).slice(0, 500)}`);
  return j;
}

async function list(table, formula) {
  const params = new URLSearchParams();
  if (formula) params.set("filterByFormula", formula);
  params.set("pageSize", "100");
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`, { headers });
  const j = await res.json();
  if (!res.ok) throw new Error(`${table}: ${JSON.stringify(j).slice(0, 500)}`);
  return j.records || [];
}

async function metaTables() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 500));
  return j.tables || [];
}

const WAS_ID = "recKebuZ79QFTwivA";
const UNLOCK_ID = "recALZFQNL3XicEOX";

const was = await get("Weekly Athlete Summary", WAS_ID);
const unlock = await get("Athlete Achievement Unlocks", UNLOCK_ID);
const enrollmentId = (was.fields.Enrollment || [])[0];
const weekId = (was.fields.Week || [])[0];
const expectedXpKey = `PERFECT_WEEK|${enrollmentId}|${weekId}`;

const xpLinkedFromUnlock = [];
for (const id of unlock.fields["XP Events"] || []) {
  xpLinkedFromUnlock.push(await get("XP Events", id));
}

const xpByKey = await list("XP Events", `{Source Key}='${expectedXpKey}'`);

// Find all unlocks for same enrollment+week+achievement
const achievementId = (unlock.fields.Achievement || [])[0];
const allUnlocksSameEnrWeek = await list(
  "Athlete Achievement Unlocks",
  `AND(FIND('${enrollmentId}', ARRAYJOIN({Enrollment}&'')), FIND('${weekId}', ARRAYJOIN({Week}&'')))`
);

const achievements = achievementId ? [await get("Achievements", achievementId)] : [];

const rules = await list("XP Reward Rules", `{Rule Key}='PERFECT_WEEK'`);

// Schema: unlock table field names
const tables = await metaTables();
const unlockTable = tables.find((t) => t.name === "Athlete Achievement Unlocks");
const unlockFieldNames = (unlockTable?.fields || []).map((f) => ({ name: f.name, type: f.type }));

const xpOnWas = [];
for (const id of was.fields["XP Events"] || []) {
  const rec = await get("XP Events", id);
  const xf = rec.fields || {};
  const sk = String(xf["Source Key"] || "");
  const bucket = String(xf["XP Bucket"] || "");
  const source = String(xf["XP Source"] || "");
  if (sk.startsWith("PERFECT_WEEK") || /perfect/i.test(bucket) || /perfect/i.test(source)) {
    xpOnWas.push({ id, fields: xf });
  }
}

const out = {
  probedAt: new Date().toISOString(),
  wasId: WAS_ID,
  enrollmentId,
  weekId,
  expectedXpSourceKey: expectedXpKey,
  was: {
    eligible: was.fields["Perfect Week Eligible?"],
    automationStatus: was.fields["Perfect Week Automation Status"],
    automationError: was.fields["Perfect Week Automation Error"] || null,
    unlockIds: was.fields["Perfect Week Unlock"] || [],
    xpEarnedThisWeek: was.fields["XP Earned This Week"],
  },
  unlock: { id: unlock.id, fields: unlock.fields },
  unlockFieldNames,
  unlocksSameEnrollmentWeek: allUnlocksSameEnrWeek.map((u) => ({
    id: u.id,
    achievement: u.fields.Achievement,
    xpAwardStatus: u.fields["XP Award Status"],
    sourceStatus: u.fields["Source Status"],
    xpEvents: u.fields["XP Events"],
    notes: u.fields.Notes,
  })),
  unlockCountSameEnrWeek: allUnlocksSameEnrWeek.length,
  achievements: achievements.map((a) => ({ id: a.id, fields: a.fields })),
  rules: rules.map((r) => ({ id: r.id, fields: r.fields })),
  xpLinkedFromUnlock: xpLinkedFromUnlock.map((x) => ({ id: x.id, fields: x.fields })),
  xpByExpectedSourceKey: xpByKey.map((x) => ({ id: x.id, fields: x.fields })),
  xpPerfectOnWas: xpOnWas,
  verdict: {
    unlockCount: allUnlocksSameEnrWeek.length,
    unlockExactlyOne: allUnlocksSameEnrWeek.length === 1,
    xpByKeyCount: xpByKey.length,
    xpExactlyOne: xpByKey.length === 1,
    unlockHasXpLink: (unlock.fields["XP Events"] || []).length >= 1,
    chainComplete:
      allUnlocksSameEnrWeek.length === 1 &&
      xpByKey.length === 1 &&
      (was.fields["Perfect Week Unlock"] || []).length === 1,
  },
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent3-perfect-week");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "CHAIN-PROBE.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
