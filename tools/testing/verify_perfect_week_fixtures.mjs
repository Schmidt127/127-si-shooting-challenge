#!/usr/bin/env node
/**
 * Read-only Perfect Week PROD fixture verifier.
 *
 * Method: GATED_TEST_TIMESTAMP (primary) — see docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md.
 * Normal athletes still use Submitted At = CREATED_TIME() vs Activity Date.
 * Perfect Week Test Override? must remain unchecked (inert; does not bypass same-day).
 *
 *   node tools/testing/verify_perfect_week_fixtures.mjs
 *   node tools/testing/verify_perfect_week_fixtures.mjs --manifest path/to/PWTEST-MANIFEST.json
 *   node tools/testing/verify_perfect_week_fixtures.mjs --offline  (fixture JSON only, no Airtable)
 *
 * Never writes to Airtable.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  evaluatePerfectWeekCase,
  buildPerfectWeekSourceKey,
  linkIds,
  field,
  STATUSES,
} = require("./lib/perfect_week_fixtures.js");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const DEFAULT_MANIFEST = resolve(
  ROOT,
  "docs/testing/perfect-week/fixtures/PWTEST-MANIFEST.json"
);
const TEMPLATE = resolve(
  ROOT,
  "docs/testing/perfect-week/fixtures/PWTEST-MANIFEST.template.json"
);

function loadEnvLocal() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env"),
  ]) {
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

function parseArgs(argv) {
  const out = { manifest: DEFAULT_MANIFEST, offline: false, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--offline") out.offline = true;
    else if (a === "--manifest") out.manifest = resolve(argv[++i]);
    else if (a === "--out") out.out = resolve(argv[++i]);
  }
  return out;
}

async function getOne(baseId, table, id, token) {
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${table}/${id} ${res.status}: ${text.slice(0, 240)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

async function listByFormula(baseId, table, filterByFormula, token, fields) {
  const params = new URLSearchParams();
  params.set("pageSize", "100");
  params.set("filterByFormula", filterByFormula);
  if (fields) for (const f of fields) params.append("fields[]", f);
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text).records || [];
}

function safe(promise) {
  return promise.then((r) => r).catch((e) => ({ __error: String(e.message || e), status: e.status }));
}

async function loadCaseActual(baseId, token, caseId, spec) {
  if (caseId === "CASE-16") {
    const saturdayLateSubmission = spec.saturdayLateSubmissionId
      ? await safe(getOne(baseId, "Submissions", spec.saturdayLateSubmissionId, token))
      : null;
    const sundayEarlySubmission = spec.sundayEarlySubmissionId
      ? await safe(getOne(baseId, "Submissions", spec.sundayEarlySubmissionId, token))
      : null;
    return {
      saturdayLateSubmission: saturdayLateSubmission?.__error
        ? null
        : saturdayLateSubmission,
      sundayEarlySubmission: sundayEarlySubmission?.__error ? null : sundayEarlySubmission,
    };
  }

  if (!spec.wasId && !(spec.submissionIds || []).length && !(spec.backdatedSubmissionIds || []).length) {
    return { was: null, xpEvents: [], submissions: [] };
  }

  let was = null;
  if (spec.wasId) {
    was = await safe(getOne(baseId, "Weekly Athlete Summary", spec.wasId, token));
    if (was.__error) {
      return { was: null, xpEvents: [], submissions: [], loadError: was.__error };
    }
  }

  const enrollmentId = spec.enrollmentId || (was && linkIds(field(was, "Enrollment"))[0]);
  const weekId = spec.weekId || (was && linkIds(field(was, "Week"))[0]);
  const sourceKey =
    enrollmentId && weekId ? buildPerfectWeekSourceKey(enrollmentId, weekId) : null;

  let xpEvents = [];
  if (sourceKey) {
    const listed = await safe(
      listByFormula(
        baseId,
        "XP Events",
        `{Source Key}="${sourceKey}"`,
        token,
        ["Source Key", "XP Points", "XP Date Resolved", "Active?"]
      )
    );
    xpEvents = Array.isArray(listed) ? listed : [];
  }

  const subIds = [
    ...new Set([
      ...(spec.submissionIds || []),
      ...(spec.backdatedSubmissionIds || []),
      ...(spec.pilotSubmissionId ? [spec.pilotSubmissionId] : []),
    ]),
  ];
  const submissions = [];
  for (const id of subIds) {
    const sub = await safe(getOne(baseId, "Submissions", id, token));
    if (!sub.__error) submissions.push(sub);
  }

  return {
    was,
    xpEvents,
    submissions,
    allowedGatedEnrollmentId: "recCyFEPeATOVNlr9",
    wasSubmissionIds: was ? linkIds(field(was, "Submissions")) : [],
    loadError: null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = existsSync(args.manifest) ? args.manifest : TEMPLATE;
  if (!existsSync(manifestPath)) {
    console.error("Manifest/template missing:", manifestPath);
    process.exit(2);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const usingTemplate = manifestPath === TEMPLATE || !existsSync(DEFAULT_MANIFEST);

  if (args.offline || usingTemplate) {
    console.log(
      JSON.stringify(
        {
          mode: "offline-manifest-check",
          manifest: manifestPath,
          note: usingTemplate
            ? "PWTEST-MANIFEST.json not populated yet — all cases BLOCKED until Omni creates fixtures"
            : "offline mode",
          cases: Object.keys(manifest.cases || {}).map((caseId) =>
            evaluatePerfectWeekCase(caseId, manifest.cases[caseId], {})
          ),
        },
        null,
        2
      )
    );
    return;
  }

  loadEnvLocal();
  const token = process.env.AIRTABLE_API_TOKEN;
  if (!token) {
    console.error("AIRTABLE_API_TOKEN missing — cannot live-verify (read-only)");
    process.exit(2);
  }

  const baseId = manifest.baseId || "appn84sqPw03zEbTT";
  const results = [];

  for (const [caseId, spec] of Object.entries(manifest.cases || {})) {
    const actual = await loadCaseActual(baseId, token, caseId, spec);
    if (actual.loadError && !actual.was) {
      results.push({
        caseId,
        status: STATUSES.BLOCKED,
        reason: actual.loadError,
      });
      continue;
    }
    results.push(evaluatePerfectWeekCase(caseId, spec, actual));
  }

  const summary = {
    batchKey: manifest.batchKey,
    fixtureMethod: manifest.fixtureMethod || "GATED_TEST_TIMESTAMP",
    baseId,
    generatedAt: new Date().toISOString(),
    pilotProof: manifest.pilotProof || null,
    notes: [
      "GATED_TEST_TIMESTAMP is a tightly gated fixture mechanism — not athlete-facing production behavior.",
      "Normal athletes use Submitted At (CREATED_TIME) vs Activity Date.",
      "Perfect Week Test Override? must not be used.",
      "Automation 057 has no test-mode path.",
      "Verifier FAILs if gated test fields appear without Enrollment recCyFEPeATOVNlr9.",
    ],
    counts: {
      PASS: results.filter((r) => r.status === "PASS").length,
      FAIL: results.filter((r) => r.status === "FAIL").length,
      BLOCKED: results.filter((r) => r.status === "BLOCKED").length,
    },
    results,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(summary, null, 2));
  }

  if (summary.counts.FAIL > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
