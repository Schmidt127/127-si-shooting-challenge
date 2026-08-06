#!/usr/bin/env node
/** Verify Perfect Week XP Event + 058 unlock uniqueness. */
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
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j;
}

async function list(table, formula) {
  const params = new URLSearchParams({ filterByFormula: formula, pageSize: "100" });
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`, {
    headers,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j.records || [];
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

const WAS = "recKebuZ79QFTwivA";
const UNLOCK = "recALZFQNL3XicEOX";
const XP = "recMdcI5lN8gJ6830";
const ENR = "recCyFEPeATOVNlr9";
const WEEK = "reci5GdxEC57vfoS3";
const ACH = "recd2jEIVPskiRTSu";

const xp = await get("XP Events", XP);
const unlock = await get("Athlete Achievement Unlocks", UNLOCK);
const was = await get("Weekly Athlete Summary", WAS);
const achievement = await get("Achievements", ACH);

// Find unlocks linked to this achievement that share enrollment+week
const unlocksForAchievement = await list(
  "Athlete Achievement Unlocks",
  `FIND('${ACH}', ARRAYJOIN({Achievement}&''))`
);
const matchingUnlocks = unlocksForAchievement.filter((u) => {
  const e = (u.fields.Enrollment || [])[0];
  const w = (u.fields.Week || [])[0];
  return e === ENR && w === WEEK;
});

// 058 idempotency simulation: clear WAS unlock link, then re-link existing (duplicate path)
const beforeLink = was.fields["Perfect Week Unlock"] || [];
await patch("Weekly Athlete Summary", WAS, { "Perfect Week Unlock": [] });
const cleared = await get("Weekly Athlete Summary", WAS);
await patch("Weekly Athlete Summary", WAS, { "Perfect Week Unlock": [UNLOCK] });
const restored = await get("Weekly Athlete Summary", WAS);

const byKey = await list("XP Events", `{Source Key}='PERFECT_WEEK|${ENR}|${WEEK}'`);

const out = {
  verifiedAt: new Date().toISOString(),
  xpEvent: {
    id: XP,
    points: xp.fields["XP Points"],
    bucket: xp.fields["XP Bucket"],
    source: xp.fields["XP Source"],
    sourceKey: xp.fields["Source Key"],
    activityDate: xp.fields["XP Activity Date"],
    activityDateSource: xp.fields["XP Activity Date Source"],
    enrollment: xp.fields.Enrollment,
    week: xp.fields.Week,
    was: xp.fields["Weekly Athlete Summary"],
    unlock: xp.fields["Achievement Unlock"],
    awardMode: xp.fields["Award Mode"],
    active: xp.fields["Active?"],
    reasonPublic: xp.fields["XP Reason Public"],
  },
  unlock: {
    id: UNLOCK,
    xpAwardStatus: unlock.fields["XP Award Status"],
    xpAwarded: unlock.fields["XP Awarded"],
    xpEvents: unlock.fields["XP Events"],
  },
  was: {
    eligible: was.fields["Perfect Week Eligible?"],
    unlock: restored.fields["Perfect Week Unlock"],
    xpEarnedThisWeek: restored.fields["XP Earned This Week"],
    totalXpAfterWeek: restored.fields["Total XP After Week"],
    hasXp: (restored.fields["XP Events"] || []).includes(XP),
  },
  achievement: {
    id: ACH,
    name: achievement.fields["Achievement Name"],
    active: achievement.fields["Active?"],
    visible: achievement.fields["Visible?"],
    rewardRuleKey: achievement.fields["Reward Rule Key"],
  },
  unlockUniqueness: {
    matchingCount: matchingUnlocks.length,
    matchingIds: matchingUnlocks.map((u) => u.id),
    exactlyOne: matchingUnlocks.length === 1,
  },
  xpUniqueness: {
    byKeyCount: byKey.length,
    byKeyIds: byKey.map((r) => r.id),
    exactlyOne: byKey.length === 1,
  },
  unlockRelinkSimulation: {
    beforeLink,
    clearedLink: cleared.fields["Perfect Week Unlock"] || [],
    restoredLink: restored.fields["Perfect Week Unlock"] || [],
    pass:
      (cleared.fields["Perfect Week Unlock"] || []).length === 0 &&
      (restored.fields["Perfect Week Unlock"] || [])[0] === UNLOCK,
  },
  checks: {
    xpAmount100: xp.fields["XP Points"] === 100,
    xpBucketPerfectWeek: xp.fields["XP Bucket"] === "Perfect Week",
    xpSourcePerfectWeek: xp.fields["XP Source"] === "Perfect Week",
    sourceKeyCorrect: xp.fields["Source Key"] === `PERFECT_WEEK|${ENR}|${WEEK}`,
    activityDateSource: xp.fields["XP Activity Date Source"] === "Perfect Week End Date",
    linkedEnrollment: (xp.fields.Enrollment || [])[0] === ENR,
    linkedWeek: (xp.fields.Week || [])[0] === WEEK,
    linkedWas: (xp.fields["Weekly Athlete Summary"] || [])[0] === WAS,
    linkedUnlock: (xp.fields["Achievement Unlock"] || [])[0] === UNLOCK,
    unlockAwarded: unlock.fields["XP Award Status"] === "Awarded",
    unlockHasXp: (unlock.fields["XP Events"] || [])[0] === XP,
    wasReflectsAward: restored.fields["XP Earned This Week"] >= 313,
  },
};

out.allChecksPass = Object.values(out.checks).every(Boolean) && out.unlockUniqueness.exactlyOne && out.xpUniqueness.exactlyOne;

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent3-perfect-week");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "CHAIN-VERIFY.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
