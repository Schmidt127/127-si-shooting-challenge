#!/usr/bin/env node
/**
 * Read-only PROD integrity probe for Schmidt testing baseline.
 * Never creates/updates/deletes records. Never prints secrets.
 *
 *   node tools/testing/prod_probe_read_only.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifyDailySubmissionBundle,
  verifyXpIdempotencyInventory,
} from "./lib/expected_actual.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm";
const SEED_SCENARIO = "recPdyfYRFgDtpzQ8";
const BASE_DEFAULT = "appn84sqPw03zEbTT";

function loadEnvLocal() {
  for (const p of [resolve("web/.env.local"), resolve(".env.local"), resolve(".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

async function listAll(baseId, table, { fields, filterByFormula } = {}) {
  const token = process.env.AIRTABLE_API_TOKEN;
  let offset;
  const records = [];
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (fields) for (const f of fields) params.append("fields[]", f);
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${table} ${res.status}: ${(await res.text()).slice(0, 240)}`);
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

async function getOne(baseId, table, id) {
  const token = process.env.AIRTABLE_API_TOKEN;
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`${table}/${id} ${res.status}`);
  return res.json();
}

function linkFirst(fields, name) {
  const v = fields?.[name];
  if (Array.isArray(v) && v.length) return v[0];
  return null;
}

async function main() {
  loadEnvLocal();
  if (!process.env.AIRTABLE_API_TOKEN) {
    console.error("BLOCKED: AIRTABLE_API_TOKEN not available");
    process.exit(1);
  }
  // Overnight testing baseline is PROD. Prefer explicit --base, else PROD default.
  // Do not silently use web/.env.local AIRTABLE_BASE_ID when it points at DEV.
  const argBase = process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : null;
  const baseId = argBase || BASE_DEFAULT;
  const started = new Date().toISOString();

  const enrollment = await getOne(baseId, "Enrollments", SCHMIDT_ENROLLMENT);
  const scenario = await getOne(baseId, "Testing Scenarios", SEED_SCENARIO);

  // NOTE: ARRAYJOIN on linked-record fields returns primary names, not RIDs.
  // Prefer Source Key / RECORD_ID / known seed IDs for reliability.
  const linkedSubId = linkFirst(scenario.fields, "Linked Submission");
  let submission = null;
  if (linkedSubId) {
    submission = await getOne(baseId, "Submissions", linkedSubId);
  }

  const weekId = submission ? linkFirst(submission.fields, "Week") : null;

  // Collect Schmidt submissions from the foundation Week link (seeded testing week).
  let weekRecord = null;
  let submissionIds = [];
  if (weekId) {
    weekRecord = await getOne(baseId, "Weeks", weekId);
    submissionIds = weekRecord.fields.Submissions || [];
  }
  if (linkedSubId && !submissionIds.includes(linkedSubId)) {
    submissionIds.push(linkedSubId);
  }

  const submissions = [];
  for (const sid of submissionIds) {
    const rec = await getOne(baseId, "Submissions", sid);
    const enr = (rec.fields.Enrollment || [])[0];
    if (enr === SCHMIDT_ENROLLMENT) submissions.push(rec);
  }

  const wasIds = new Set();
  if (weekRecord) {
    for (const id of weekRecord.fields["Weekly Athlete Summary"] || []) wasIds.add(id);
  }
  // Known foundation WAS from overnight baseline (fallback if week link empty)
  wasIds.add("rechWp330MqSgRWzN");
  const wasSchmidt = [];
  for (const wid of wasIds) {
    try {
      const rec = await getOne(baseId, "Weekly Athlete Summary", wid);
      if ((rec.fields.Enrollment || [])[0] === SCHMIDT_ENROLLMENT) wasSchmidt.push(rec);
    } catch {
      /* missing id ok */
    }
  }

  // XP via deterministic Source Keys for each Schmidt submission
  const xpSchmidt = [];
  for (const sub of submissions) {
    const key = `SUBMISSION_XP|${sub.id}`;
    const rows = await listAll(baseId, "XP Events", {
      filterByFormula: `{Source Key}="${key}"`,
      fields: ["Source Key", "XP Points", "Submission", "Enrollment", "XP Dedupe Key"],
    });
    xpSchmidt.push(...rows);
  }

  const xpInventory = verifyXpIdempotencyInventory(xpSchmidt);

  let xpForLinked = [];
  if (linkedSubId) {
    xpForLinked = await listAll(baseId, "XP Events", {
      filterByFormula: `{Source Key}="SUBMISSION_XP|${linkedSubId}"`,
      fields: ["Source Key", "XP Points", "Submission", "Enrollment"],
    });
  }

  const bundle = verifyDailySubmissionBundle({
    scenario,
    submission,
    xpEvents: xpForLinked,
    wasRecords: wasSchmidt,
    expect: {
      enrollmentId: SCHMIDT_ENROLLMENT,
      shotTotal: submission?.fields?.["Shot Total"] ?? 25,
      xpAmount: 20,
      requireWeek: true,
    },
  });

  const wasGroups = {};
  for (const w of wasSchmidt) {
    const enr = (w.fields.Enrollment || [])[0] || "";
    const week = (w.fields.Week || [])[0] || "";
    const key = `${enr}|${week}`;
    wasGroups[key] = wasGroups[key] || [];
    wasGroups[key].push(w.id);
  }
  const wasDupes = Object.entries(wasGroups).filter(([, ids]) => ids.length > 1);

  const xpBySub = {};
  for (const e of xpSchmidt) {
    for (const sid of e.fields.Submission || []) {
      xpBySub[sid] = xpBySub[sid] || [];
      xpBySub[sid].push(e.id);
    }
  }
  const multiXpSubs = Object.entries(xpBySub).filter(([, ids]) => ids.length > 1);

  const report = {
    started_at: started,
    completed_at: new Date().toISOString(),
    base_id: baseId,
    read_only: true,
    schmidt_enrollment: {
      id: SCHMIDT_ENROLLMENT,
      active: Boolean(enrollment.fields["Active?"]),
    },
    scenario: {
      id: SEED_SCENARIO,
      last_run_status: scenario.fields["Last Run Status"],
      last_run_at: scenario.fields["Last Run At"],
      linked_submission: linkedSubId,
      run_test: Boolean(scenario.fields["Run Test?"]),
      dry_run: Boolean(scenario.fields["Dry Run?"]),
      shot_total: scenario.fields["Shot Total"],
    },
    counts: {
      schmidt_submissions: submissions.length,
      schmidt_was: wasSchmidt.length,
      schmidt_xp_events: xpSchmidt.length,
      was_duplicate_enrollment_week_groups: wasDupes.length,
      submissions_with_gt1_xp: multiXpSubs.length,
    },
    notes: [
      "ARRAYJOIN on linked fields returns primary names — RID FIND filters are unreliable; probe uses Source Key / Week.Submissions / direct RID fetches.",
    ],
    was_duplicate_groups: wasDupes,
    submissions_with_gt1_xp: multiXpSubs,
    submission_ids: submissions.map((s) => s.id),
    xp_source_keys: xpSchmidt.map((e) => e.fields["Source Key"]),
    was_ids: wasSchmidt.map((w) => w.id),
    verifier_bundle: bundle,
    xp_inventory_schmidt: xpInventory,
  };

  const outDir = resolve(HERE, "../../docs/overnight/testing-integrity");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "prod-probe-latest.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  console.error(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
