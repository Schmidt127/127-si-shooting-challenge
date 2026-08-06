#!/usr/bin/env node
/** Probe CASE-01 readiness for Automation 057 (read-only). */
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
const WAS = "recKebuZ79QFTwivA";
const ENR = "recCyFEPeATOVNlr9";
const WEEK = "reci5GdxEC57vfoS3";

async function get(table, id) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 300));
  return j;
}

async function list(table, formula, fields) {
  const params = new URLSearchParams();
  if (formula) params.set("filterByFormula", formula);
  for (const f of fields || []) params.append("fields[]", f);
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 300));
  return j.records || [];
}

const was = await get("Weekly Athlete Summary", WAS);
const subIds = was.fields.Submissions || [];
const videos = await list(
  "Video Feedback",
  `AND(FIND('${ENR}', ARRAYJOIN({Enrollment})), FIND('${WEEK}', ARRAYJOIN({Week})))`,
  ["Enrollment", "Submission", "Week"]
);
const videosOnWasSubs = videos.filter((v) => {
  const s = v.fields.Submission || [];
  return s.some((id) => subIds.includes(id));
});
const zoom = await list("Zoom Meetings", `FIND('${WEEK}', ARRAYJOIN({Week}))`, ["Week", "Attendees"]);

const out = {
  probedAt: new Date().toISOString(),
  wasId: WAS,
  daysLogged: was.fields["Days Logged This Week"],
  homeworkAssignedLibrary: was.fields.Homework,
  homeworkCompletionsLink: was.fields["Homework Completions Link"],
  homeworkAssignedCountRollup: was.fields["Homework Assigned Count"],
  homeworkSatisfactoryCountRollup: was.fields["Homework Satisfactory Count"],
  submissionCount: subIds.length,
  videoFeedbackMatchingEnrollmentWeek: videos.map((v) => ({
    id: v.id,
    submission: v.fields.Submission,
    onWasSubmission: (v.fields.Submission || []).some((id) => subIds.includes(id)),
  })),
  videoCountFor057Logic: videosOnWasSubs.length,
  zoomMeetingsForWeek: zoom.map((z) => ({
    id: z.id,
    attendeesIncludesEnrollment: (z.fields.Attendees || []).includes(ENR),
  })),
  zoomMeetingCount: zoom.length,
  automationStatus: was.fields["Perfect Week Automation Status"],
  calculationQueue: was.fields["Perfect Week Calculation Queue?"],
  assessment: {
    homeworkReadyFor057:
      (was.fields.Homework || []).length === 2 &&
      was.fields["Homework Satisfactory Count"] === 2 &&
      (was.fields["Homework Completions Link"] || []).length >= 2,
    dailyLikelyReady: (was.fields["Days Logged This Week"] || 0) >= 7,
    videoLikelyReady: videosOnWasSubs.length >= 3,
    zoomLikelyReady: zoom.length === 0, // no meetings → met when Status Ready
    readyToRun057Manually: true,
    note: "057 writes helpers + Status Ready; Eligible formula then evaluates. Do not change 057.",
  },
};

const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-pha-was-link-clarification");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "057-READINESS.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
