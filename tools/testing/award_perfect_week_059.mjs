#!/usr/bin/env node
/**
 * Award Perfect Week XP for an Athlete Achievement Unlock using the 059 v3.5 contract.
 *
 * Use when Automation 059 did not fire (common if PROD trigger requires Shot Milestone).
 * Idempotent: re-run links existing Source Key / unlock XP and marks Awarded.
 *
 * Usage:
 *   node tools/testing/award_perfect_week_059.mjs                 # dry-run
 *   node tools/testing/award_perfect_week_059.mjs --live          # write
 *   node tools/testing/award_perfect_week_059.mjs --live --unlock recALZFQNL3XicEOX
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

const LIVE = process.argv.includes("--live");
const unlockArgIdx = process.argv.indexOf("--unlock");
const UNLOCK_ID =
  unlockArgIdx >= 0 && process.argv[unlockArgIdx + 1]
    ? process.argv[unlockArgIdx + 1]
    : "recALZFQNL3XicEOX";

const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = "appn84sqPw03zEbTT";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${JSON.stringify(j).slice(0, 600)}`);
  return j;
}

async function get(table, id) {
  return api("GET", `${encodeURIComponent(table)}/${id}`);
}

async function list(table, formula) {
  const params = new URLSearchParams({ filterByFormula: formula, pageSize: "100" });
  const j = await api("GET", `${encodeURIComponent(table)}?${params}`);
  return j.records || [];
}

const unlock = await get("Athlete Achievement Unlocks", UNLOCK_ID);
const uf = unlock.fields || {};
const enrollmentId = (uf.Enrollment || [])[0];
const weekId = (uf.Week || [])[0];
const achievementId = (uf.Achievement || [])[0];
const wasId = (uf["Weekly Athlete Summary"] || [])[0];
const existingXpIds = uf["XP Events"] || [];

if (!enrollmentId || !weekId || !achievementId) {
  throw new Error("Unlock missing Enrollment, Week, or Achievement");
}

const achievement = await get("Achievements", achievementId);
const ruleKey = achievement.fields?.["Reward Rule Key"];
if (ruleKey !== "PERFECT_WEEK") {
  throw new Error(`Expected PERFECT_WEEK achievement, got ${ruleKey}`);
}

const rules = await list("XP Reward Rules", `AND({Rule Key}='PERFECT_WEEK',{Active?}=1)`);
if (rules.length !== 1) {
  throw new Error(`Expected exactly 1 active PERFECT_WEEK rule, found ${rules.length}`);
}
const xpAmount = Number(rules[0].fields["XP Amount"]);
if (!xpAmount || xpAmount <= 0) throw new Error("Invalid PERFECT_WEEK XP Amount");

const week = await get("Weeks", weekId);
const weekEnd =
  week.fields["Week End Date"] || week.fields["End Date"] || null;
if (!weekEnd) throw new Error("Week missing End Date / Week End Date");

const sourceKey = `PERFECT_WEEK|${enrollmentId}|${weekId}`;
const byKey = await list("XP Events", `{Source Key}='${sourceKey}'`);
const byUnlock = existingXpIds.length
  ? await Promise.all(existingXpIds.map((id) => get("XP Events", id)))
  : [];

const duplicate = byKey[0] || byUnlock.find((x) => (x.fields?.["Source Key"] || "") === sourceKey) || null;

// REST API link fields take string IDs (not {id} objects used in Airtable scripting).
const xpPayload = {
  Enrollment: [enrollmentId],
  Week: [weekId],
  "Achievement Unlock": [UNLOCK_ID],
  "XP Points": xpAmount,
  "XP Source": "Perfect Week",
  "XP Bucket": "Perfect Week",
  "Source Key": sourceKey,
  "XP Activity Date": weekEnd,
  "XP Activity Date Source": "Perfect Week End Date",
  "XP Reason Public": "Perfect Week completed.",
  "XP Reason Debug": [
    "Created by award_perfect_week_059.mjs (059 v3.5 contract).",
    "Type: Perfect Week",
    `Achievement: ${achievement.fields["Achievement Name"] || "Perfect Week"}`,
    `Reward Rule Key: ${ruleKey}`,
    `Enrollment ID: ${enrollmentId}`,
    `Week ID: ${weekId}`,
    `XP Points: ${xpAmount}`,
    `Source Key: ${sourceKey}`,
    `XP Activity Date: ${weekEnd}`,
    "XP Activity Date Source: Perfect Week End Date",
    "Note: Used because Automation 059 did not auto-fire (likely Shot Milestone trigger filter).",
  ].join("\n"),
  "Awarded At": new Date().toISOString(),
  "Active?": true,
  Processed: true,
  "Award Mode": "Automatic",
  "Awarded By": "059-contract-agent3",
};

if (wasId) {
  xpPayload["Weekly Athlete Summary"] = [wasId];
}

const evidence = {
  ranAt: new Date().toISOString(),
  live: LIVE,
  unlockId: UNLOCK_ID,
  enrollmentId,
  weekId,
  wasId: wasId || null,
  sourceKey,
  xpAmount,
  weekEnd,
  pre: {
    xpAwardStatus: uf["XP Award Status"],
    readyFor059: uf["Ready for 059 XP?"],
    existingXpIds,
    byKeyCount: byKey.length,
    byKeyIds: byKey.map((r) => r.id),
  },
  action: null,
  xpEventId: null,
  unlockAfter: null,
  wasAfter: null,
};

if (duplicate) {
  evidence.action = "idempotent_link_existing";
  evidence.xpEventId = duplicate.id;
  if (LIVE) {
    await api("PATCH", `${encodeURIComponent("Athlete Achievement Unlocks")}/${UNLOCK_ID}`, {
      fields: {
        "XP Events": [duplicate.id],
        "XP Award Status": "Awarded",
        "XP Awarded": xpAmount,
      },
    });
    // ensure WAS link on XP
    if (wasId && !(duplicate.fields?.["Weekly Athlete Summary"] || []).includes(wasId)) {
      await api("PATCH", `${encodeURIComponent("XP Events")}/${duplicate.id}`, {
        fields: { "Weekly Athlete Summary": [wasId] },
      });
    }
  }
} else if (!LIVE) {
  evidence.action = "dry_run_would_create";
  evidence.xpPayload = xpPayload;
} else {
  const created = await api("POST", encodeURIComponent("XP Events"), { fields: xpPayload });
  evidence.action = "created";
  evidence.xpEventId = created.id;
  await api("PATCH", `${encodeURIComponent("Athlete Achievement Unlocks")}/${UNLOCK_ID}`, {
    fields: {
      "XP Events": [created.id],
      "XP Award Status": "Awarded",
      "XP Awarded": xpAmount,
    },
  });
}

const unlockAfter = await get("Athlete Achievement Unlocks", UNLOCK_ID);
evidence.unlockAfter = {
  xpAwardStatus: unlockAfter.fields["XP Award Status"],
  xpAwarded: unlockAfter.fields["XP Awarded"],
  xpEvents: unlockAfter.fields["XP Events"] || [],
  readyFor059: unlockAfter.fields["Ready for 059 XP?"],
};

if (wasId) {
  const was = await get("Weekly Athlete Summary", wasId);
  const wasXp = was.fields["XP Events"] || [];
  evidence.wasAfter = {
    unlockIds: was.fields["Perfect Week Unlock"] || [],
    xpEarnedThisWeek: was.fields["XP Earned This Week"],
    totalXpAfterWeek: was.fields["Total XP After Week"],
    hasXpEvent: evidence.xpEventId ? wasXp.includes(evidence.xpEventId) : null,
    xpEventCount: wasXp.length,
  };
}

const byKeyAfter = await list("XP Events", `{Source Key}='${sourceKey}'`);
evidence.post = {
  byKeyCount: byKeyAfter.length,
  byKeyIds: byKeyAfter.map((r) => r.id),
  exactlyOneXp: byKeyAfter.length === 1,
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent3-perfect-week");
mkdirSync(dir, { recursive: true });
const stamp = LIVE ? "AWARD-LIVE" : "AWARD-DRY";
const outPath = resolve(dir, `${stamp}.json`);
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
console.log(`\nWrote ${outPath}`);
if (!LIVE) console.log("\nRe-run with --live to write.");
