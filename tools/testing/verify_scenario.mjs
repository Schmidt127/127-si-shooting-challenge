#!/usr/bin/env node
/**
 * Read-only Expected-versus-Actual verifier CLI.
 *
 * Usage (offline fixture):
 *   node tools/testing/verify_scenario.mjs --fixture tools/testing/fixtures/live-115-bundle.json
 *
 * Usage (live PROD read — requires AIRTABLE_API_TOKEN):
 *   node tools/testing/verify_scenario.mjs --live --scenario recPdyfYRFgDtpzQ8
 *
 * Never writes to Airtable. Never prints secrets.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  verifyDailySubmissionBundle,
  verifyXpIdempotencyInventory,
} from "./lib/expected_actual.js";

function parseArgs(argv) {
  const out = { live: false, scenario: null, fixture: null, inventory: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") out.live = true;
    else if (a === "--inventory") out.inventory = true;
    else if (a === "--scenario") out.scenario = argv[++i];
    else if (a === "--fixture") out.fixture = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function loadEnvLocal() {
  const candidates = [
    resolve("web/.env.local"),
    resolve(".env.local"),
    resolve(".env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function airtableGet(baseId, tableIdOrName, recordId, fields) {
  const token = process.env.AIRTABLE_API_TOKEN;
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  const params = new URLSearchParams();
  if (fields) for (const f of fields) params.append("fields[]", f);
  const url = recordId
    ? `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`
    : `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdOrName)}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function airtableList(baseId, tableIdOrName, { filterByFormula, fields, maxRecords = 100 } = {}) {
  const token = process.env.AIRTABLE_API_TOKEN;
  const params = new URLSearchParams();
  if (filterByFormula) params.set("filterByFormula", filterByFormula);
  if (fields) for (const f of fields) params.append("fields[]", f);
  params.set("pageSize", String(Math.min(maxRecords, 100)));
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdOrName)}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.records || [];
}

async function verifyLive(scenarioId) {
  loadEnvLocal();
  // PROD is the active testing base for overnight integrity work.
  const argBase = process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : null;
  const baseId = argBase || "appn84sqPw03zEbTT";
  const scenario = await airtableGet(baseId, "Testing Scenarios", scenarioId);
  const linked = (scenario.fields["Linked Submission"] || [])[0];
  let submission = null;
  let xpEvents = [];
  let wasRecords = [];
  if (linked) {
    submission = await airtableGet(baseId, "Submissions", linked);
    xpEvents = await airtableList(baseId, "XP Events", {
      filterByFormula: `FIND("${linked}", ARRAYJOIN({Submission}))`,
      fields: ["Source Key", "XP Points", "Submission", "Enrollment"],
      maxRecords: 20,
    });
    const week = (submission.fields.Week || [])[0];
    const enr = (submission.fields.Enrollment || [])[0];
    if (week && enr) {
      wasRecords = await airtableList(baseId, "Weekly Athlete Summary", {
        filterByFormula: `AND(FIND("${enr}", ARRAYJOIN({Enrollment})), FIND("${week}", ARRAYJOIN({Week})))`,
        fields: ["Enrollment", "Week", "Summary Key", "Total Shots This Week"],
        maxRecords: 20,
      });
    }
  }
  return verifyDailySubmissionBundle({
    scenario,
    submission,
    xpEvents,
    wasRecords,
    expect: {
      enrollmentId: "recgP9qZYjAhE7NXm",
      shotTotal: submission?.fields?.["Shot Total"] ?? 25,
      xpAmount: 20,
      requireWeek: true,
    },
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage:
  node tools/testing/verify_scenario.mjs --fixture <path>
  node tools/testing/verify_scenario.mjs --live --scenario <recId>
  node tools/testing/verify_scenario.mjs --fixture <xp-list.json> --inventory`);
    process.exit(0);
  }

  let result;
  if (args.live) {
    if (!args.scenario) throw new Error("--scenario required with --live");
    result = await verifyLive(args.scenario);
  } else if (args.fixture) {
    const data = JSON.parse(readFileSync(resolve(args.fixture), "utf8"));
    if (args.inventory || data.kind === "xp_inventory") {
      result = verifyXpIdempotencyInventory(data.xpEvents || data.records || []);
    } else {
      result = verifyDailySubmissionBundle(data);
    }
  } else {
    throw new Error("Provide --fixture or --live --scenario");
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.overall === "FAIL" || result.overall === "BLOCKED") process.exitCode = 2;
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
