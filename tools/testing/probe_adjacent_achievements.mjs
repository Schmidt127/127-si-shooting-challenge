#!/usr/bin/env node
/**
 * Probe adjacent athlete-experience items: achievements visibility,
 * pending unlocks, shot milestones, levels for Schmidt enrollment.
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
const ENR = "recCyFEPeATOVNlr9";
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function listAll(table, fields) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    for (const f of fields || []) params.append("fields[]", f);
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`, {
      headers,
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`${table}: ${JSON.stringify(j).slice(0, 400)}`);
    records.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return records;
}

async function get(table, id) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`, { headers });
  return res.json();
}

async function patch(table, id, fields) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j;
}

const achievements = await listAll("Achievements", [
  "Achievement Name",
  "Achievement Key",
  "Reward Rule Key",
  "Active?",
  "Visible?",
  "Achievement Type",
  "Category",
  "Athlete Achievement Unlocks",
]);

const pendingUnlocks = await listAll("Athlete Achievement Unlocks", [
  "Achievement",
  "Enrollment",
  "Week",
  "XP Award Status",
  "Shot Milestone",
  "Ready for 059 XP?",
  "XP Events",
  "Milestone Source Key",
]);

const pending = pendingUnlocks.filter((u) => u.fields["XP Award Status"] === "Pending");
const pendingSchmidt = pending.filter((u) => (u.fields.Enrollment || [])[0] === ENR);

const enrollment = await get("Enrollments", ENR);
const ef = enrollment.fields || {};

let levelsActive = [];
try {
  const levels = await listAll("Levels", null);
  levelsActive = levels
    .filter((l) => l.fields["Active?"] !== false)
    .slice(0, 20)
    .map((l) => ({
      id: l.id,
      fieldsSample: Object.fromEntries(
        Object.entries(l.fields || {})
          .filter(([k]) => /level|name|xp|min|max|number|active|gate/i.test(k))
          .slice(0, 12)
      ),
    }));
} catch (e) {
  levelsActive = [{ error: String(e.message || e) }];
}

const out = {
  probedAt: new Date().toISOString(),
  achievements: achievements.map((a) => ({
    id: a.id,
    name: a.fields["Achievement Name"],
    key: a.fields["Achievement Key"],
    ruleKey: a.fields["Reward Rule Key"],
    active: a.fields["Active?"],
    visible: a.fields["Visible?"],
    type: a.fields["Achievement Type"],
    category: a.fields["Category"],
    unlockCount: (a.fields["Athlete Achievement Unlocks"] || []).length,
  })),
  achievementsNeedingVisible: achievements
    .filter((a) => a.fields["Active?"] === true && a.fields["Visible?"] !== true)
    .map((a) => ({
      id: a.id,
      name: a.fields["Achievement Name"],
      visible: a.fields["Visible?"],
      ruleKey: a.fields["Reward Rule Key"],
    })),
  pendingUnlocksTotal: pending.length,
  pendingSchmidt: pendingSchmidt.map((u) => ({
    id: u.id,
    achievement: u.fields.Achievement,
    week: u.fields.Week,
    shotMilestone: u.fields["Shot Milestone"],
    ready: u.fields["Ready for 059 XP?"],
    xpEvents: u.fields["XP Events"],
    milestoneSourceKey: u.fields["Milestone Source Key"],
  })),
  enrollmentLevelSnapshot: {
    enrollmentId: ENR,
    keys: Object.keys(ef).filter((k) => /level|xp|gate|progress/i.test(k)),
    snapshot: Object.fromEntries(
      Object.entries(ef)
        .filter(([k]) => /level|xp|gate|progress/i.test(k))
        .slice(0, 25)
    ),
  },
  levelsActive,
};

// Fix Perfect Week Visible? if blank/false while Active
const pw = achievements.find((a) => a.fields["Reward Rule Key"] === "PERFECT_WEEK");
out.perfectWeekVisibleFix = { needed: false, before: pw?.fields["Visible?"], after: null };
if (pw && pw.fields["Active?"] === true && pw.fields["Visible?"] !== true) {
  out.perfectWeekVisibleFix.needed = true;
  await patch("Achievements", pw.id, { "Visible?": true });
  const refreshed = await get("Achievements", pw.id);
  out.perfectWeekVisibleFix.after = refreshed.fields["Visible?"];
}

// Also set Visible on other active achievements that are blank (athlete-facing readiness)
const fixed = [];
for (const a of achievements) {
  if (a.fields["Active?"] !== true) continue;
  if (a.fields["Visible?"] === true) continue;
  if (a.id === pw?.id) continue; // already handled
  // Only auto-fix if Visible is explicitly blank/undefined (not intentionally false)
  if (a.fields["Visible?"] === false) continue;
  await patch("Achievements", a.id, { "Visible?": true });
  fixed.push({ id: a.id, name: a.fields["Achievement Name"] });
}
out.visibleBlankActivated = fixed;

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent3-perfect-week");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "ADJACENT-PROBE.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
