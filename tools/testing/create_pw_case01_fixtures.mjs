#!/usr/bin/env node
/**
 * Create CASE-01 Perfect Week fixtures using gated test timestamp path.
 * Enrollment: recCyFEPeATOVNlr9 only.
 */
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
const ENR = "recCyFEPeATOVNlr9";
const PI = "rec5mEM0YPqPqq0hZ";
const GOAL_5000 = "recQJRxpaBgwN42Un"; // 3-4 - 5000 shots
const DATES = [
  "2026-08-02",
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
];
const SHOTS_PER_DAY = 715; // 7*715=5005 ≥ 5000; also ≥ daily min ceil((5000/9)/7)=80
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
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function get(table, id) {
  return api("GET", `${encodeURIComponent(table)}/${id}`);
}

function denverNoon(dateKey) {
  // MDT in August = UTC-6
  return `${dateKey}T12:00:00.000-06:00`;
}

async function main() {
  const evidence = {};
  for (const [k, table, id] of [
    ["case07", "Submissions", "recxbwkZpSJZ5eiqA"],
    ["case02sub", "Submissions", "recbr8gduRKmpiDkd"],
    ["case02was", "Weekly Athlete Summary", "recMMeJENu6Pg8l58"],
  ]) {
    try {
      const r = await get(table, id);
      evidence[k] = {
        id,
        submittedSameDay: r.fields["Submitted Same Day?"],
        countable: r.fields["Perfect Week Countable Submission?"],
        eligible: r.fields["Perfect Week Eligible?"],
        shotTotal: r.fields["Shot Total"],
        activityDate: r.fields["Activity Date"],
        testRecord: r.fields["Perfect Week Test Record?"],
        testSubmittedAt: r.fields["Perfect Week Test Submitted At"],
      };
    } catch (e) {
      evidence[k] = { id, error: String(e.message || e) };
    }
  }

  // Create Week
  const week = await api("POST", "Weeks", {
    fields: {
      "Week Name": "PWTEST|2026-08-05|CASE-01|WEEK",
      "Start Date": "2026-08-02T00:00:00.000-06:00",
      "End Date": "2026-08-08T23:59:00.000-06:00",
      "Program Instance": [PI],
    },
  });

  // Create WAS
  const was = await api("POST", encodeURIComponent("Weekly Athlete Summary"), {
    fields: {
      Enrollment: [ENR],
      Week: [week.id],
      "Goal Record": [GOAL_5000],
      "Perfect Week Automation Status": "Pending",
      // do not set helpers; do not check Test Override; no email arms
    },
  });

  const submissionIds = [];
  for (const dateKey of DATES) {
    const sub = await api("POST", "Submissions", {
      fields: {
        Enrollment: [ENR],
        Week: [week.id],
        "Activity Date": dateKey,
        "Shot Total": SHOTS_PER_DAY,
        "Perfect Week Test Record?": true,
        "Perfect Week Test Submitted At": denverNoon(dateKey),
        "Weekly Athlete Summary": [was.id],
        // no Build Daily Email / Send flags
      },
    });
    submissionIds.push(sub.id);
  }

  // Link submissions on WAS (may already be inverse-linked)
  await api("PATCH", `${encodeURIComponent("Weekly Athlete Summary")}/${was.id}`, {
    fields: {
      Submissions: submissionIds,
      "Perfect Week Automation Status": "Pending",
    },
  });

  // Create 3 Video Feedback on first three submissions
  const videoIds = [];
  for (let i = 0; i < 3; i += 1) {
    const vf = await api("POST", encodeURIComponent("Video Feedback"), {
      fields: {
        Enrollment: [ENR],
        Submission: [submissionIds[i]],
        // leave parent feedback flags false
      },
    });
    videoIds.push(vf.id);
  }

  // Re-arm 057
  await api("PATCH", `${encodeURIComponent("Weekly Athlete Summary")}/${was.id}`, {
    fields: {
      "Perfect Week Automation Status": "Pending",
    },
  });

  const out = {
    batchKey: "PWTEST|2026-08-05",
    case: "CASE-01",
    enrollmentId: ENR,
    programInstanceId: PI,
    goalRecordId: GOAL_5000,
    shotsPerDay: SHOTS_PER_DAY,
    weekTotalShots: SHOTS_PER_DAY * 7,
    weekId: week.id,
    wasId: was.id,
    submissionIds,
    videoIds,
    zoomMeetingIds: [],
    evidencePreserved: evidence,
    fieldIds: {
      testRecord: "fld0xNqO0ryOe7uEY",
      testSubmittedAt: "fldr2msxUo1kPjROD",
      enrollmentRecordIdLookup: "fldHH6GDDG9DixHBT",
    },
    next: "Wait for formulas + Automation 057; then poll WAS helpers / Eligible / Unlock / XP",
  };

  writeFileSync(
    resolve(ROOT, "docs/testing/perfect-week/fixtures/_case01-create.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
