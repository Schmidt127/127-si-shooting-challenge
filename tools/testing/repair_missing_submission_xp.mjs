#!/usr/bin/env node
/**
 * Authorized idempotent repair for missing SUBMISSION_XP|{submissionId} rows.
 *
 * Usage:
 *   node tools/testing/repair_missing_submission_xp.mjs --dry-run
 *   node tools/testing/repair_missing_submission_xp.mjs --live
 *   node tools/testing/repair_missing_submission_xp.mjs --live --submission rece0krfrEqiUEBVu
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUT = process.env.REPAIR_OUT || "/opt/cursor/artifacts/repair-missing-submission-xp.json";

const LIVE = process.argv.includes("--live");
const DRY_RUN = !LIVE;
const ONLY = (() => {
  const i = process.argv.indexOf("--submission");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const TARGETS = [
  { submissionId: "rece0krfrEqiUEBVu", enrollmentId: "recCrNNAdVmQ4Y8fL", athlete: "Xavier Schmidt" },
  { submissionId: "rec3zlR7xneAOatKh", enrollmentId: "recNu6fcBpF1GG3u5", athlete: "Testing3 Schmidt" },
  { submissionId: "recNqAXXzXAnac1GE", enrollmentId: "recNu6fcBpF1GG3u5", athlete: "Testing3 Schmidt" },
  { submissionId: "recLD7Fb6ph0yovyq", enrollmentId: "reclc46bQM8Wx0qWP", athlete: "Curtis Schmidt" },
];

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
const BASE = process.env.AIRTABLE_BASE_ID || "appn84sqPw03zEbTT";
if (!TOKEN) {
  console.error("Missing AIRTABLE_API_TOKEN");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function api(method, path, body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(`${method} ${path}: ${text.slice(0, 800)}`);
  return data;
}

async function get(table, id) {
  return api("GET", `${encodeURIComponent(table)}/${id}`);
}

async function listByFormula(table, formula, fields = []) {
  const params = new URLSearchParams({ filterByFormula: formula, pageSize: "100" });
  fields.forEach((f) => params.append("fields[]", f));
  return (await api("GET", `${encodeURIComponent(table)}?${params}`)).records || [];
}

function first(arr) {
  return Array.isArray(arr) ? arr[0] : undefined;
}

async function loadShootingBasePoints() {
  const rows = await listByFormula("XP Reward Rules", `{Rule Key}="SHOOTING_BASE"`, ["Rule Key", "XP Amount", "Active?"]);
  const active = rows.find((r) => r.fields?.["Active?"] === true) || rows[0];
  const pts = Number(active?.fields?.["XP Amount"]);
  if (!Number.isFinite(pts) || pts <= 0) throw new Error("SHOOTING_BASE XP Amount not found");
  return pts;
}

const results = [];

async function repairOne(target, shootingBaseXp) {
  const { submissionId, enrollmentId, athlete } = target;
  const row = {
    submissionId,
    athlete,
    enrollmentId,
    activityDate: null,
    expectedXp: shootingBaseXp,
    existingXpEventId: null,
    action: "skipped",
    newXpEventId: null,
    sourceKey: `SUBMISSION_XP|${submissionId}`,
    finalStatus: "skipped",
    notes: null,
  };

  const sub = await get("Submissions", submissionId);
  const f = sub.fields || {};
  row.activityDate = f["Activity Date"] || null;

  if (!f["Count This Submission?"]) {
    row.finalStatus = "skipped_not_counted";
    row.notes = "Count This Submission? is false";
    results.push(row);
    return row;
  }

  const enrollmentLink = first(f.Enrollment);
  if (enrollmentLink !== enrollmentId) {
    row.finalStatus = "skipped_enrollment_mismatch";
    row.notes = `Linked enrollment ${enrollmentLink}`;
    results.push(row);
    return row;
  }

  const existing = await listByFormula("XP Events", `{Source Key}="${row.sourceKey}"`, [
    "Source Key",
    "Active?",
    "XP Points",
    "Duplicate Status",
  ]);
  if (existing.length > 1) {
    row.finalStatus = "error_ambiguous";
    row.notes = `Multiple XP rows: ${existing.map((x) => x.id).join(",")}`;
    results.push(row);
    return row;
  }

  if (existing[0]) {
    row.existingXpEventId = existing[0].id;
    row.newXpEventId = existing[0].id;
    row.action = existing[0].fields?.["Active?"] === true ? "reused" : "reactivated";
    if (LIVE && existing[0].fields?.["Active?"] !== true) {
      await api("PATCH", `${encodeURIComponent("XP Events")}/${existing[0].id}`, {
        fields: { "Active?": true },
      });
    }
  } else if (LIVE) {
    const weekId = first(f.Week);
    const wasId = first(f["Weekly Athlete Summary"]);
    const created = await api("POST", encodeURIComponent("XP Events"), {
      records: [
        {
          fields: {
            Enrollment: [enrollmentId],
            Submission: [submissionId],
            Week: weekId ? [weekId] : undefined,
            "Weekly Athlete Summary": wasId ? [wasId] : undefined,
            "XP Source": "Submission Base",
            "XP Bucket": "Shooting Base",
            "XP Points": shootingBaseXp,
            "Active?": true,
            "Source Key": row.sourceKey,
            "XP Activity Date": f["Activity Date"],
            "XP Activity Date Source": "Submission Activity Date",
            "XP Reason Public": "Shooting submission completed.",
            "XP Reason Debug": `Repair script (010 contract). Submission: ${submissionId}. Source Key: ${row.sourceKey}.`,
            Processed: true,
            "Award Mode": "Automatic",
          },
        },
      ],
      typecast: true,
    });
    row.newXpEventId = created.records[0].id;
    row.action = "created";
  } else {
    row.action = "would_create";
  }

  if (LIVE && row.newXpEventId) {
    const linkedXp = Array.isArray(f["XP Events"]) ? f["XP Events"] : [];
    await api("PATCH", `${encodeURIComponent("Submissions")}/${submissionId}`, {
      fields: {
        "XP Events": [...new Set([...linkedXp, row.newXpEventId])],
        "XP Award Status": "Awarded",
      },
    });
    await api("PATCH", `${encodeURIComponent("Enrollments")}/${enrollmentId}`, {
      fields: { "Run Shot Milestone Check?": true },
    });
  }

  row.finalStatus = row.action.startsWith("would") ? "dry_run" : row.action;
  results.push(row);
  return row;
}

async function main() {
  const shootingBaseXp = await loadShootingBasePoints();
  const targets = ONLY ? TARGETS.filter((t) => t.submissionId === ONLY) : TARGETS;
  for (const target of targets) {
    await repairOne(target, shootingBaseXp);
    console.log(JSON.stringify(results[results.length - 1]));
  }
  const report = {
    runAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry_run" : "live",
    shootingBaseXp,
    results,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ wrote: OUT, count: results.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
