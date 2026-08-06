#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from "node:fs";
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
const HC_IDS = ["recqXxlOpATQI3sD4", "rechzFmWrUp1tonto"];
const WAS = "recKebuZ79QFTwivA";

async function get(table, id) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`,
    { headers }
  );
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j;
}

async function meta() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j.tables;
}

const tables = await meta();
const hcTable = tables.find((t) => t.name === "Homework Completions");
const wasText = (hcTable.fields || []).find((f) => f.name === "Weekly Athlete Summary");
const wasLink = (hcTable.fields || []).find((f) => f.name === "Weekly Athlete Summary Link");

const records = [];
for (const id of HC_IDS) {
  const r = await get("Homework Completions", id);
  records.push({
    id,
    weeklyAthleteSummaryText: r.fields["Weekly Athlete Summary"] ?? null,
    weeklyAthleteSummaryLink: r.fields["Weekly Athlete Summary Link"] ?? null,
    enrollment: r.fields.Enrollment,
    week: r.fields.Week,
    homework: r.fields.Homework,
    pha: r.fields["Program Homework Assignment"],
    satisfactory: r.fields["Satisfactory?"],
    completionStatus: r.fields["Completion Status"],
    assetSlot: r.fields["Asset Slot"],
  });
}

const was = await get("Weekly Athlete Summary", WAS);
const out = {
  probedAt: new Date().toISOString(),
  fields: {
    weeklyAthleteSummary: {
      name: wasText?.name,
      id: wasText?.id,
      type: wasText?.type,
    },
    weeklyAthleteSummaryLink: {
      name: wasLink?.name,
      id: wasLink?.id,
      type: wasLink?.type,
      linkedTableId: wasLink?.options?.linkedTableId,
      prefersSingleRecordLink: wasLink?.options?.prefersSingleRecordLink,
    },
  },
  homeworkCompletions: records,
  bothLinkTargetWas: records.every(
    (r) => Array.isArray(r.weeklyAthleteSummaryLink) && r.weeklyAthleteSummaryLink.includes(WAS)
  ),
  was: {
    id: WAS,
    homework: was.fields.Homework,
    homeworkAssignedCount: was.fields["Homework Assigned Count"],
    homeworkSatisfactoryCount: was.fields["Homework Satisfactory Count"],
    homeworkCompletionsLink: was.fields["Homework Completions Link"],
    pwHwAssigned: was.fields["Perfect Week Homework Assigned Count"],
    pwHwSatisfactory: was.fields["Perfect Week Homework Satisfactory Count"],
    pwHwMet: was.fields["Perfect Week Homework Requirement Met?"],
    automationStatus: was.fields["Perfect Week Automation Status"],
    eligible: was.fields["Perfect Week Eligible?"],
    dailyMet: was.fields["Perfect Week Daily Requirement Met?"],
    videoMet: was.fields["Perfect Week Video Requirement Met?"],
    zoomMet: was.fields["Perfect Week Zoom Requirement Met?"],
    daysLogged: was.fields["Days Logged This Week"],
    calculationQueue: was.fields["Perfect Week Calculation Queue?"],
  },
};

writeFileSync(
  resolve(ROOT, "docs/testing/homework-assignments/fixtures/_hc-was-link-reinspect.json"),
  JSON.stringify(out, null, 2)
);
console.log(JSON.stringify(out, null, 2));
