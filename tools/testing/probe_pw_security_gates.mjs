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
const ENROLL = "recCyFEPeATOVNlr9";
const WEEK = "reci5GdxEC57vfoS3";
const WAS = "recKebuZ79QFTwivA";

async function api(method, path, body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers: method === "GET" ? { Authorization: `Bearer ${TOKEN}` } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 400)}`);
  return json;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const results = { probes: [], evidence: {}, cleanup: [] };

// Evidence preserved
for (const [label, id] of [
  ["case07", "recxbwkZpSJZ5eiqA"],
  ["case02sub", "recbr8gduRKmpiDkd"],
]) {
  const r = await api("GET", `${encodeURIComponent("Submissions")}/${id}`);
  results.evidence[label] = {
    id,
    submittedSameDay: r.fields["Submitted Same Day?"],
    countable: r.fields["Perfect Week Countable Submission?"],
    testRecord: r.fields["Perfect Week Test Record?"] || false,
    testSubmittedAt: r.fields["Perfect Week Test Submitted At"] || null,
    activityDate: r.fields["Activity Date"],
  };
}
const case02was = await api("GET", `${encodeURIComponent("Weekly Athlete Summary")}/recMMeJENu6Pg8l58`);
results.evidence.case02was = {
  id: "recMMeJENu6Pg8l58",
  eligible: case02was.fields["Perfect Week Eligible?"],
  testOverride: case02was.fields["Perfect Week Test Override?"] || false,
};

const case01was = await api("GET", `${encodeURIComponent("Weekly Athlete Summary")}/${WAS}`);
results.evidence.case01wasOverride = case01was.fields["Perfect Week Test Override?"] || false;

// Security: checkbox-only (no timestamp) on a throwaway historical day
const checkboxOnly = await api("POST", encodeURIComponent("Submissions"), {
  fields: {
    Enrollment: [ENROLL],
    Week: [WEEK],
    "Weekly Athlete Summary": [WAS],
    "Activity Date": "2026-07-01",
    "Shot Total": 10,
    "Perfect Week Test Record?": true,
    // no Perfect Week Test Submitted At
  },
});
results.cleanup.push(checkboxOnly.id);
await sleep(2500);
let r = await api("GET", `${encodeURIComponent("Submissions")}/${checkboxOnly.id}`);
results.probes.push({
  name: "checkbox_only",
  id: checkboxOnly.id,
  submittedSameDay: r.fields["Submitted Same Day?"],
  countable: r.fields["Perfect Week Countable Submission?"],
  expectSameDay: 0,
  pass: r.fields["Submitted Same Day?"] === 0,
});

// Security: timestamp-only (no checkbox)
const tsOnly = await api("POST", encodeURIComponent("Submissions"), {
  fields: {
    Enrollment: [ENROLL],
    Week: [WEEK],
    "Weekly Athlete Summary": [WAS],
    "Activity Date": "2026-07-02",
    "Shot Total": 10,
    "Perfect Week Test Submitted At": "2026-07-02T18:00:00.000Z",
    // no checkbox
  },
});
results.cleanup.push(tsOnly.id);
await sleep(2500);
r = await api("GET", `${encodeURIComponent("Submissions")}/${tsOnly.id}`);
results.probes.push({
  name: "timestamp_only",
  id: tsOnly.id,
  submittedSameDay: r.fields["Submitted Same Day?"],
  countable: r.fields["Perfect Week Countable Submission?"],
  expectSameDay: 0,
  pass: r.fields["Submitted Same Day?"] === 0,
});

// Security: both fields but we can't easily use another enrollment without creating junk.
// Document: gate uses FIND on Enrollment Record ID Lookup for recCyFEPeATOVNlr9 only.

// Delete probes
for (const id of results.cleanup) {
  await api("DELETE", `${encodeURIComponent("Submissions")}/${id}`);
}
results.deleted = results.cleanup;

writeFileSync(
  resolve(ROOT, "docs/testing/perfect-week/fixtures/_security-probes.json"),
  JSON.stringify(results, null, 2)
);
console.log(JSON.stringify(results, null, 2));
