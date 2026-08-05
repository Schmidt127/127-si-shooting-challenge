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
const WAS = "recKebuZ79QFTwivA";
const ENR = "recCyFEPeATOVNlr9";
const VIDEO_IDS = ["recNnc5jyNZhr7aMl", "recU0fm1oWJWjjabv", "recjxoiMZ2WTRuUmW"];

async function get(table, id) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.json();
}

const was = await get("Weekly Athlete Summary", WAS);
const subIds = new Set(was.fields?.Submissions || []);
const videos = [];
for (const id of VIDEO_IDS) {
  const v = await get("Video Feedback", id);
  const enr = v.fields?.Enrollment || [];
  const sub = v.fields?.Submission || [];
  videos.push({
    id,
    ok: !v.error,
    enrollment: enr,
    submission: sub,
    enrollmentMatch: enr.includes(ENR),
    submissionOnWas: sub.some((s) => subIds.has(s)),
    fieldsPresent: Object.keys(v.fields || {}),
  });
}

// Also search by enrollment only
const params = new URLSearchParams();
params.set("filterByFormula", `FIND("${ENR}", ARRAYJOIN({Enrollment}&""))`);
params.append("fields[]", "Enrollment");
params.append("fields[]", "Submission");
const listRes = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent("Video Feedback")}?${params}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const listed = await listRes.json();

const matching = (listed.records || []).filter((r) =>
  (r.fields.Submission || []).some((s) => subIds.has(s))
);

const out = {
  wasSubmissions: [...subIds],
  knownVideos: videos,
  enrollmentVideos: (listed.records || []).map((r) => r.id),
  enrollmentVideosOnWasSubs: matching.map((r) => r.id),
  countFor057: matching.length,
};
writeFileSync(
  resolve(ROOT, "docs/testing/evidence/2026-08-05-pha-was-link-clarification/057-VIDEO-PROBE.json"),
  JSON.stringify(out, null, 2)
);
console.log(JSON.stringify(out, null, 2));
