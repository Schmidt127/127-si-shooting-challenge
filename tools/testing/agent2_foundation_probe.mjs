#!/usr/bin/env node
/**
 * Overnight Agent 2 — foundational PROD probe (enrollment / grade band / XP integrity).
 * Usage: node tools/testing/agent2_foundation_probe.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "appn84sqPw03zEbTT";
const SCHMIDT_ATHLETE = "recgqVstObQRzgXJF";
const SCHMIDT_ENR_LEGACY = "recgP9qZYjAhE7NXm";
const SCHMIDT_ENR_2027 = "recCyFEPeATOVNlr9";
const SCHMIDT_ENR_FAILED_001 = "recQP4N5acTdK40uZ";

function loadEnvLocal() {
  for (const p of [resolve(".env.local"), resolve("web/.env.local"), resolve(".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
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

async function api(path, { method = "GET", body } = {}) {
  const token = process.env.AIRTABLE_API_TOKEN;
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 400)}`);
  return data;
}

async function meta(path) {
  const token = process.env.AIRTABLE_API_TOKEN;
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`meta ${path} ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function listAll(table, { fields, filterByFormula } = {}) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (fields) for (const f of fields) params.append("fields[]", f);
    const data = await api(`${encodeURIComponent(table)}?${params}`);
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

function pick(fields, names) {
  const out = {};
  for (const n of names) if (fields?.[n] !== undefined) out[n] = fields[n];
  return out;
}

async function main() {
  loadEnvLocal();
  if (!process.env.AIRTABLE_API_TOKEN) {
    console.error("BLOCKED: no AIRTABLE_API_TOKEN");
    process.exit(1);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    baseId: BASE,
    enrollments: {},
    gradeBands: [],
    athlete: null,
    xpInventory: { total: 0, bySourcePrefix: {}, blankSourceKeys: 0, duplicateSourceKeys: [] },
    streakXp: [],
    milestoneXp: [],
    formulaSuspects: [],
    tables: {},
  };

  // Grade bands
  const bands = await listAll("Grade Bands");
  out.gradeBands = bands.map((r) => ({
    id: r.id,
    name: r.fields["Grade Band Name"],
    active: r.fields["Active?"] === true,
    min: r.fields["Min Grade"],
    max: r.fields["Max Grade"],
    enrollmentCount: (r.fields.Enrollments || []).length,
    notes: r.fields.Notes || null,
  }));

  // Enrollments of interest
  for (const id of [SCHMIDT_ENR_LEGACY, SCHMIDT_ENR_2027, SCHMIDT_ENR_FAILED_001]) {
    try {
      const rec = await api(`Enrollments/${id}`);
      out.enrollments[id] = pick(rec.fields, [
        "Name",
        "Athlete",
        "Active?",
        "Grade",
        "Grade Band",
        "Last Grade Used for Grade Band",
        "Grade Band Status",
        "Grade Band Assignment Status",
        "School Year",
        "Current Level",
        "Next Level",
        "Gate Status",
        "Lifetime XP Earned",
        "Lifetime Shots Made",
        "Parent Email",
        "Parent Email - Cleaned",
      ]);
    } catch (e) {
      out.enrollments[id] = { error: String(e.message || e) };
    }
  }

  try {
    const ath = await api(`Athletes/${SCHMIDT_ATHLETE}`);
    out.athlete = {
      id: ath.id,
      ...pick(ath.fields, ["Name", "First Name", "Last Name", "Email", "Parent Email", "Active?"]),
    };
  } catch (e) {
    out.athlete = { error: String(e.message || e) };
  }

  // XP Events for Schmidt enrollments
  const enrIds = Object.keys(out.enrollments).filter((k) => !out.enrollments[k].error);
  const xpFilter = `OR(${enrIds
    .map((id) => `FIND("${id}", ARRAYJOIN({Enrollment}))`)
    .join(",")})`;
  let xp = [];
  try {
    xp = await listAll("XP Events", { filterByFormula: xpFilter });
  } catch (e) {
    xp = await listAll("XP Events");
    out.xpInventory.note = `filter failed (${e.message}); used full table (${xp.length})`;
  }

  const keyCounts = new Map();
  for (const r of xp) {
    const sk = r.fields["Source Key"] || "";
    out.xpInventory.total++;
    if (!sk) out.xpInventory.blankSourceKeys++;
    else keyCounts.set(sk, (keyCounts.get(sk) || 0) + 1);
    const prefix = sk.split("|")[0] || "(blank)";
    out.xpInventory.bySourcePrefix[prefix] = (out.xpInventory.bySourcePrefix[prefix] || 0) + 1;
    const bucket = String(r.fields["XP Bucket"] || r.fields["XP Source"] || "");
    if (/streak/i.test(bucket) || /^STREAK/i.test(sk)) {
      out.streakXp.push({ id: r.id, ...r.fields });
    }
    if (/milestone|shot/i.test(bucket) || /MILESTONE|SHOT/i.test(sk)) {
      out.milestoneXp.push({ id: r.id, ...r.fields });
    }
  }
  for (const [k, c] of keyCounts) if (c > 1) out.xpInventory.duplicateSourceKeys.push({ key: k, count: c });

  // Schema: XP Date Resolved formula
  try {
    const tables = await meta("tables");
    for (const t of tables.tables || []) {
      out.tables[t.name] = { id: t.id, fieldCount: (t.fields || []).length };
      if (t.name === "XP Events") {
        const f = (t.fields || []).find((x) => x.name === "XP Date Resolved");
        if (f) {
          out.formulaSuspects.push({
            table: "XP Events",
            field: "XP Date Resolved",
            type: f.type,
            formula: f.options?.formula || null,
            hasSubmissionBase: /Submission Base/i.test(f.options?.formula || ""),
            hasShootingBase: /Shooting Base/i.test(f.options?.formula || ""),
          });
        }
      }
      if (t.name === "Enrollments") {
        const lifetime = (t.fields || []).find((x) => x.name === "Lifetime XP Earned");
        if (lifetime) {
          out.formulaSuspects.push({
            table: "Enrollments",
            field: "Lifetime XP Earned",
            type: lifetime.type,
            formula: lifetime.options?.formula || lifetime.description || null,
          });
        }
      }
    }
  } catch (e) {
    out.tablesError = String(e.message || e);
  }

  // Orphan-ish: enrollments without athlete, WAS without enrollment
  try {
    const allEnr = await listAll("Enrollments", {
      fields: ["Name", "Athlete", "Active?", "Grade Band", "Grade"],
    });
    out.orphanSignals = {
      enrollmentsMissingAthlete: allEnr.filter((r) => !r.fields.Athlete?.length).map((r) => r.id),
      enrollmentsMissingGradeBand: allEnr
        .filter((r) => r.fields["Active?"] && !r.fields["Grade Band"]?.length)
        .map((r) => ({
          id: r.id,
          name: r.fields.Name,
          grade: r.fields.Grade,
        })),
      enrollmentCount: allEnr.length,
    };
  } catch (e) {
    out.orphanSignals = { error: String(e.message || e) };
  }

  const dir = resolve("docs/testing/evidence/2026-08-05-agent2-foundation");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, "FOUNDATION-PROBE.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ wrote: path, summary: {
    gradeBands: out.gradeBands.length,
    enrollments: Object.keys(out.enrollments).length,
    xpTotal: out.xpInventory.total,
    dupKeys: out.xpInventory.duplicateSourceKeys.length,
    streakXp: out.streakXp.length,
    milestoneXp: out.milestoneXp.length,
    missingGB: out.orphanSignals?.enrollmentsMissingGradeBand?.length,
    formulaSuspects: out.formulaSuspects,
  }}, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
