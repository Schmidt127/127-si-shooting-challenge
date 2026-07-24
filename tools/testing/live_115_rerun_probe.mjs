#!/usr/bin/env node
/**
 * Controlled live PROD test: re-check Run Test? on seed scenario to exercise
 * Automation 115 rerun behavior. Schmidt-only. No email sends from this script.
 *
 * Usage:
 *   node tools/testing/live_115_rerun_probe.mjs --dry-check   # only read + plan
 *   node tools/testing/live_115_rerun_probe.mjs --execute     # patch Run Test?=true
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "appn84sqPw03zEbTT";
const SCENARIO = "recPdyfYRFgDtpzQ8";
const TABLE = "tblagI7Q5wXQm2XGS";

function loadEnvLocal() {
  for (const p of [resolve("web/.env.local")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

async function api(path, opts = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 240)}`);
  return data;
}

async function getScenario() {
  return api(`${TABLE}/${SCENARIO}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadEnvLocal();
  const execute = process.argv.includes("--execute");
  const before = await getScenario();
  const priorLinked = (before.fields["Linked Submission"] || [])[0] || null;
  const plan = {
    mode: execute ? "EXECUTE" : "DRY_CHECK",
    scenario: SCENARIO,
    before: {
      run_test: Boolean(before.fields["Run Test?"]),
      dry_run: Boolean(before.fields["Dry Run?"]),
      last_run_status: before.fields["Last Run Status"],
      linked_submission: priorLinked,
      shot_total: before.fields["Shot Total"],
    },
    expected_if_executed: {
      creates_new_submission: true,
      linked_submission_changes: true,
      prior_submission_retained: true,
      xp_one_per_new_submission: true,
      was_remains_unique: true,
    },
  };

  if (!execute) {
    console.log(JSON.stringify(plan, null, 2));
    console.error("Re-run with --execute to patch Run Test?=true (triggers 115 if ON).");
    return;
  }

  if (before.fields["Dry Run?"]) {
    throw new Error("Dry Run? is checked — aborting live execute");
  }

  await api(`${TABLE}/${SCENARIO}`, {
    method: "PATCH",
    body: JSON.stringify({
      fields: { "Run Test?": true },
      typecast: true,
    }),
  });

  // Poll for automation completion (Run Test? cleared + Last Run At change)
  let after = before;
  let attempts = 0;
  const priorAt = before.fields["Last Run At"] || "";
  while (attempts < 24) {
    await sleep(5000);
    after = await getScenario();
    attempts += 1;
    const runTest = Boolean(after.fields["Run Test?"]);
    const lastAt = after.fields["Last Run At"] || "";
    if (!runTest && lastAt && lastAt !== priorAt) break;
  }

  const newLinked = (after.fields["Linked Submission"] || [])[0] || null;
  let xpCount = 0;
  let xpKey = null;
  if (newLinked) {
    const xp = await api(
      `${encodeURIComponent("XP Events")}?filterByFormula=${encodeURIComponent(
        `{Source Key}="SUBMISSION_XP|${newLinked}"`
      )}&maxRecords=5`
    );
    xpCount = (xp.records || []).length;
    xpKey = xp.records?.[0]?.fields?.["Source Key"] || null;
  }

  const result = {
    ...plan,
    attempts,
    after: {
      run_test: Boolean(after.fields["Run Test?"]),
      last_run_status: after.fields["Last Run Status"],
      last_run_at: after.fields["Last Run At"],
      linked_submission: newLinked,
      actual_result_snip: String(after.fields["Actual Result"] || "").slice(0, 240),
    },
    observations: {
      linked_changed: Boolean(newLinked && newLinked !== priorLinked),
      prior_linked: priorLinked,
      new_linked: newLinked,
      xp_events_for_new_submission: xpCount,
      xp_source_key: xpKey,
    },
    completed_at: new Date().toISOString(),
  };

  const out = resolve(HERE, "../../docs/overnight/testing-integrity/live-115-rerun-latest.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
