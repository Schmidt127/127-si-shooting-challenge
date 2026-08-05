#!/usr/bin/env node
/**
 * SC-003 Testing Views verifier (PROD).
 *
 * Airtable cannot create views via API and cannot return filter definitions.
 * This script:
 *   1) Lists views via Meta API and checks canonical names from TESTING-VIEWS-SPEC.json
 *   2) Where a matching view exists, counts rows via Data API ?view=
 *   3) Confirms expected Schmidt record IDs appear in those view results when present
 *   4) Flags orphan-scale row counts (broken filters)
 *
 * Never writes. Never prints secrets.
 *
 *   node tools/testing/verify_testing_views.mjs
 *   node tools/testing/verify_testing_views.mjs --require-installed
 *   node tools/testing/verify_testing_views.mjs --out docs/testing/evidence/.../TESTING-VIEWS-VERIFY.json
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const BASE_DEFAULT = "appn84sqPw03zEbTT";
const SPEC_PATH = resolve(ROOT, "docs/testing/views/TESTING-VIEWS-SPEC.json");

function loadEnvLocal() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
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
  const out = { requireInstalled: false, out: null, base: BASE_DEFAULT };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--require-installed") out.requireInstalled = true;
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--base") out.base = argv[++i];
  }
  return out;
}

function authHeaders() {
  const token = process.env.AIRTABLE_API_TOKEN;
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  return { Authorization: `Bearer ${token}` };
}

async function metaTables(baseId) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`meta ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text).tables || [];
}

async function listViaView(baseId, table, viewId, maxRecords = 500) {
  let offset;
  const records = [];
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    params.set("view", viewId);
    if (offset) params.set("offset", offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`,
      { headers: authHeaders() }
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`${table}?view= ${res.status}: ${text.slice(0, 240)}`);
    const data = JSON.parse(text);
    records.push(...(data.records || []));
    offset = data.offset;
    if (records.length >= maxRecords) break;
  } while (offset);
  return {
    records: records.slice(0, maxRecords),
    truncated: Boolean(offset) || records.length >= maxRecords,
  };
}

function normalizeName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findMatchingView(tableViews, specView) {
  const wanted = normalizeName(specView.view_name);
  const aliases = (specView.name_aliases_acceptable || []).map(normalizeName);
  const exact = tableViews.find((v) => normalizeName(v.name) === wanted);
  if (exact) return { match: exact, match_kind: "canonical" };
  const alias = tableViews.find((v) => aliases.includes(normalizeName(v.name)));
  if (alias) return { match: alias, match_kind: "acceptable_alias" };
  const interim = (specView.acceptable_interim_views || []).map(normalizeName);
  const interimHit = tableViews.find((v) => interim.includes(normalizeName(v.name)));
  if (interimHit) return { match: interimHit, match_kind: "interim_only" };
  return { match: null, match_kind: "missing" };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv);
  const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
  const tables = await metaTables(args.base);
  const byName = Object.fromEntries(tables.map((t) => [t.name, t]));

  const results = [];
  let canonicalPresent = 0;
  let missingRequired = 0;
  let sanityFails = 0;

  for (const viewSpec of spec.views) {
    if (viewSpec.optional && !byName[viewSpec.table]) {
      results.push({
        table: viewSpec.table,
        view_name: viewSpec.view_name,
        status: "SKIPPED_OPTIONAL_TABLE_MISSING",
      });
      continue;
    }
    const table = byName[viewSpec.table];
    if (!table) {
      results.push({
        table: viewSpec.table,
        view_name: viewSpec.view_name,
        status: "TABLE_MISSING",
        installed: false,
      });
      if (!viewSpec.optional) missingRequired += 1;
      continue;
    }
    const tableViews = (table.views || []).map((v) => ({ id: v.id, name: v.name, type: v.type }));
    const { match, match_kind } = findMatchingView(tableViews, viewSpec);
    if (!match) {
      results.push({
        table: viewSpec.table,
        view_name: viewSpec.view_name,
        status: "VIEW_MISSING",
        installed: false,
        match_kind,
        available_views: tableViews.map((v) => v.name),
        optional: Boolean(viewSpec.optional),
      });
      if (!viewSpec.optional) missingRequired += 1;
      continue;
    }

    const installedCanonical = match_kind === "canonical" || match_kind === "acceptable_alias";
    if (installedCanonical) canonicalPresent += 1;

    let rowCount = null;
    let truncated = false;
    let expectedIdsFound = [];
    let expectedIdsMissing = [];
    let sanity = "NOT_EVALUATED";
    let error = null;
    try {
      const listed = await listViaView(args.base, viewSpec.table, match.id);
      rowCount = listed.records.length;
      truncated = listed.truncated;
      const ids = new Set(listed.records.map((r) => r.id));
      for (const rid of viewSpec.expected_record_ids_any || []) {
        if (ids.has(rid)) expectedIdsFound.push(rid);
        else expectedIdsMissing.push(rid);
      }
      if (typeof viewSpec.expected_max_rows_sanity === "number") {
        if (rowCount > viewSpec.expected_max_rows_sanity) {
          sanity = "FAIL_ORPHAN_SCALE";
          sanityFails += 1;
        } else {
          sanity = "PASS";
        }
      } else if ((viewSpec.expected_record_ids_any || []).length) {
        sanity = expectedIdsFound.length ? "PASS_KNOWN_ID_VISIBLE" : "WARN_KNOWN_IDS_ABSENT";
      } else {
        sanity = "PASS_COUNT_ONLY";
      }
    } catch (e) {
      error = String(e && e.message ? e.message : e);
      sanity = "ERROR";
    }

    results.push({
      table: viewSpec.table,
      view_name: viewSpec.view_name,
      status: installedCanonical ? "PRESENT" : "INTERIM_ONLY",
      installed: installedCanonical,
      match_kind,
      matched_view_name: match.name,
      matched_view_id: match.id,
      row_count_sampled: rowCount,
      truncated,
      expected_ids_found: expectedIdsFound,
      expected_ids_missing: expectedIdsMissing,
      sanity,
      sanity_note: viewSpec.sanity_note || null,
      optional: Boolean(viewSpec.optional),
      error,
    });

    if (!installedCanonical && !viewSpec.optional) missingRequired += 1;
  }

  const requiredSpecs = spec.views.filter((v) => !v.optional);
  const summary = {
    required_views: requiredSpecs.length,
    canonical_or_alias_present: canonicalPresent,
    missing_required: missingRequired,
    sanity_fails: sanityFails,
    installed_in_prod: missingRequired === 0 && sanityFails === 0,
    note:
      "Filter definitions are not readable via API. Presence + sane counts + known IDs are the strongest automated evidence.",
  };

  const out = {
    generated_at: new Date().toISOString(),
    base_id: args.base,
    read_only: true,
    schmidt_enrollment_id: spec.schmidt_enrollment_id,
    summary,
    results,
  };

  const defaultOut = resolve(
    ROOT,
    "docs/testing/evidence/2026-08-04-sc-003-006-testing-control-center/TESTING-VIEWS-VERIFY.json"
  );
  const outPath = resolve(args.out || defaultOut);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ wrote: outPath, summary }, null, 2));

  if (args.requireInstalled && !summary.installed_in_prod) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
