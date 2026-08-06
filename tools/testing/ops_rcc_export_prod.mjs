#!/usr/bin/env node
/**
 * Agent 4 ops — export sanitized PROD snapshot for Reliability Command Center,
 * then optionally run the offline RCC CLI.
 *
 * Usage:
 *   node tools/testing/ops_rcc_export_prod.mjs
 *   node tools/testing/ops_rcc_export_prod.mjs --run-cli
 *
 * Writes under docs/testing/evidence/2026-08-05-agent4-ops/ (PII redacted).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "appn84sqPw03zEbTT";
const SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm";
const RUN_CLI = process.argv.includes("--run-cli");
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent4-ops");

function loadEnv() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, "tools/airtable/.env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const TOKEN = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
if (!TOKEN?.startsWith("pat")) {
  console.error("BLOCKED: AIRTABLE_API_TOKEN missing");
  process.exit(1);
}

async function listAll(table, fields) {
  const out = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (fields) for (const f of fields) params.append("fields[]", f);
    if (offset) params.set("offset", offset);
    const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const json = await res.json();
    if (!res.ok) throw new Error(`${table} ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
    out.push(...(json.records || []));
    offset = json.offset;
  } while (offset);
  return out;
}

function redactValue(key, value) {
  const k = String(key).toLowerCase();
  if (/email|phone|name|first|last|address|parent|athlete/.test(k) && typeof value === "string") {
    if (/@/.test(value)) return "[email]";
    if (value.length > 2) return "[redacted]";
  }
  if (typeof value === "string" && /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) {
    return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  }
  return value;
}

function sanitizeRecord(rec) {
  const fields = {};
  for (const [k, v] of Object.entries(rec.fields || {})) {
    fields[k] = redactValue(k, v);
  }
  return { id: rec.id, fields };
}

async function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const wasFields = [
    "Enrollment",
    "Week",
    "Build Weekly Email Now?",
    "Weekly Email Ready?",
    "Send to Make?",
    "Weekly Email Sent?",
    "Weekly Email Subject",
    "Weekly Email Recipients",
    "Weekly Email HTML",
    "Make Send Status",
    "Weekly Summary Sent At",
    "Weekly Email Sent At",
    "Weekly Email Error",
    "sendMode",
  ];
  const enrollmentFields = ["Active?", "Parent Email", "Athlete"];
  const weekFields = ["Week Name", "Start Date", "End Date", "Week Key"];
  const xpFields = ["Source Key", "Enrollment", "XP Points", "Active?", "Week"];

  const [was, enrollments, weeks, xp] = await Promise.all([
    listAll("Weekly Athlete Summary", wasFields),
    listAll("Enrollments", enrollmentFields),
    listAll("Weeks", weekFields),
    listAll("XP Events", xpFields),
  ]);

  // Prefer Schmidt-linked WAS for expected week hint
  const schmidtWas = was.find((r) =>
    (r.fields.Enrollment || []).some((e) => e.id === SCHMIDT_ENROLLMENT)
  );
  const expectedWeekId = (schmidtWas?.fields?.Week || [])[0]?.id || null;

  const exportPayload = {
    currentChallengeYear: "2026-2027",
    expectedWeekId,
    nowMs: Date.now(),
    baseId: BASE,
    sanitized: true,
    tables: {
      "Weekly Athlete Summary": was.map(sanitizeRecord),
      Enrollments: enrollments.map(sanitizeRecord),
      Weeks: weeks.map(sanitizeRecord),
      "XP Events": xp.map(sanitizeRecord),
      "Homework Completions": [],
      "Submission Assets": [],
      Submissions: [],
      "Athlete Achievement Unlocks": [],
      "Video Feedback": [],
      "Zoom Attendance": [],
      "Zoom Meetings": [],
    },
    counts: {
      was: was.length,
      enrollments: enrollments.length,
      weeks: weeks.length,
      xp: xp.length,
    },
  };

  const exportPath = resolve(EVIDENCE_DIR, "rcc-prod-export.sanitized.json");
  writeFileSync(exportPath, JSON.stringify(exportPayload, null, 2));
  console.log(JSON.stringify({ wrote: exportPath, counts: exportPayload.counts, expectedWeekId }, null, 2));

  if (RUN_CLI) {
    const outDir = resolve(EVIDENCE_DIR, "rcc-report");
    mkdirSync(outDir, { recursive: true });
    const cli = resolve(ROOT, "tools/reliability-command-center/cli.js");
    const result = spawnSync(
      process.execPath,
      [cli, "--input", exportPath, "--output", outDir, "--json"],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
    writeFileSync(
      resolve(EVIDENCE_DIR, "rcc-cli-run.json"),
      JSON.stringify(
        {
          status: result.status,
          stdoutPreview: String(result.stdout || "").slice(0, 4000),
          stderrPreview: String(result.stderr || "").slice(0, 2000),
        },
        null,
        2
      )
    );
    console.log("RCC CLI exit", result.status);
    if (result.stdout) console.log(String(result.stdout).slice(0, 2500));
    if (result.status !== 0 && result.stderr) console.error(result.stderr.slice(0, 1500));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
