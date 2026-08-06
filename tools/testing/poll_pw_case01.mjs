#!/usr/bin/env node
/** Poll CASE-01 fixture results after gated formula + 057. */
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
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const created = JSON.parse(
  readFileSync(resolve(ROOT, "docs/testing/perfect-week/fixtures/_case01-create.json"), "utf8")
);

async function get(table, id) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`${table}/${id} ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function listXp(enr, week) {
  const key = `PERFECT_WEEK|${enr}|${week}`;
  const params = new URLSearchParams({
    filterByFormula: `{Source Key}="${key}"`,
    pageSize: "10",
  });
  for (const f of ["Source Key", "XP Points", "XP Date Resolved", "Active?", "Achievement Unlock"]) {
    params.append("fields[]", f);
  }
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent("XP Events")}?${params}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 300));
  return { key, records: JSON.parse(text).records || [] };
}

async function rearm057() {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent("Weekly Athlete Summary")}/${created.wasId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: { "Perfect Week Automation Status": "Pending" } }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`rearm ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  const doRearm = process.argv.includes("--rearm");
  if (doRearm) {
    console.log("rearm", (await rearm057()).id);
  }

  const submissions = [];
  for (const id of created.submissionIds) {
    const r = await get("Submissions", id);
    submissions.push({
      id,
      activityDate: r.fields["Activity Date"],
      shotTotal: r.fields["Shot Total"],
      testRecord: r.fields["Perfect Week Test Record?"],
      testSubmittedAt: r.fields["Perfect Week Test Submitted At"],
      enrollmentLookup: r.fields["Enrollment Record ID Lookup"],
      submittedSameDay: r.fields["Submitted Same Day?"],
      countable: r.fields["Perfect Week Countable Submission?"],
      countThis: r.fields["Count This Submission?"],
      totalShotsCounted: r.fields["Total Shots Counted"],
    });
  }

  const was = await get("Weekly Athlete Summary", created.wasId);
  const wasFields = {
    automationStatus: was.fields["Perfect Week Automation Status"],
    automationError: was.fields["Perfect Week Automation Error"],
    dailyMet: was.fields["Perfect Week Daily Requirement Met?"],
    dailyStatus: was.fields["Perfect Week Daily Check Status"],
    dailyDetail: was.fields["Perfect Week Daily Check Detail"],
    videoCount: was.fields["Perfect Week Video Count"],
    videoMet: was.fields["Perfect Week Video Requirement Met?"],
    zoomMeetings: was.fields["Perfect Week Zoom Meeting Count"],
    zoomAttendance: was.fields["Perfect Week Zoom Attendance Count"],
    zoomMet: was.fields["Perfect Week Zoom Requirement Met?"],
    homeworkMet: was.fields["Perfect Week Homework Requirement Met?"],
    homeworkAssigned: was.fields["Perfect Week Homework Assigned Count"],
    eligible: was.fields["Perfect Week Eligible?"],
    unlock: was.fields["Perfect Week Unlock"],
    weeklyGoal: was.fields["Weekly Goal Shots Target"],
    goalShots: was.fields["Goal Shots Target"],
    daysLogged: was.fields["Days Logged This Week"],
    testOverride: was.fields["Perfect Week Test Override?"],
  };

  const xp = await listXp(created.enrollmentId, created.weekId);

  const out = {
    polledAt: new Date().toISOString(),
    submissions,
    was: wasFields,
    xp,
    summary: {
      allSameDay1: submissions.every((s) => s.submittedSameDay === 1),
      allCountable1: submissions.every((s) => s.countable === 1),
      distinctDates: new Set(submissions.map((s) => String(s.activityDate).slice(0, 10))).size,
      eligible: wasFields.eligible,
      unlockCount: (wasFields.unlock || []).length,
      xpCount: xp.records.length,
    },
  };

  writeFileSync(
    resolve(ROOT, "docs/testing/perfect-week/fixtures/_case01-poll.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
