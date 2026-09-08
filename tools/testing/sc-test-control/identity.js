"use strict";

const { readFileSync, existsSync, writeFileSync, mkdirSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const {
  BASE_ID,
  HISTORICAL_IDENTITY,
  CANDIDATE_ENROLLMENTS,
  resolvedIdentity,
  PROGRAM_INSTANCE_HINT,
  EVIDENCE_DIR,
} = require("./config");
const { createResult } = require("./result-schema");

const ROOT = resolve(__dirname, "../../..");

function loadEnvLocal() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

async function fetchRecord(table, id) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}/${id}`,
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` } }
  );
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${table}/${id} ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

async function searchEnrollment(id) {
  try {
    return await fetchRecord("Enrollments", id);
  } catch (e) {
    return { __missing: true, status: e.status, id };
  }
}

function applyResolved(record, status) {
  resolvedIdentity.status = status;
  resolvedIdentity.verifiedAt = new Date().toISOString();
  if (record && !record.__missing) {
    resolvedIdentity.enrollmentId = record.id;
    resolvedIdentity.athleteId = (record.fields?.Athlete || [])[0] || null;
    resolvedIdentity.programInstanceId = (record.fields?.["Program Instance"] || [])[0] || null;
    resolvedIdentity.active = record.fields?.["Active?"] ?? null;
    resolvedIdentity.weekId = (record.fields?.Week || [])[0] || null;
    resolvedIdentity.wasId = (record.fields?.["Weekly Athlete Summary"] || [])[0] || null;
    const parent = record.fields?.["Parent Email - Cleaned"] || record.fields?.["Parent Email"] || "";
    const athlete = record.fields?.["Athlete Email - Cleaned"] || record.fields?.["Athlete Email"] || "";
    resolvedIdentity.testRecipientEmails = [parent, athlete].filter(Boolean).map(String);
  }
}

function getIdentitySnapshot() {
  return {
    baseId: BASE_ID,
    historical: { ...HISTORICAL_IDENTITY },
    resolved: { ...resolvedIdentity },
    candidates: CANDIDATE_ENROLLMENTS.map((c) => ({ ...c })),
    programInstanceHint: PROGRAM_INSTANCE_HINT,
    executeEnabled: resolvedIdentity.status === "IDENTITY_VERIFIED",
  };
}

async function verifyIdentity() {
  loadEnvLocal();
  const purgeEvidence = {
    source: "docs/testing/evidence/transactional-purge-2026-09-05/CLOSEOUT.md",
    athletes: 0,
    enrollments: 0,
    note: "Post-purge zero Athletes/Enrollments documented",
  };

  if (!process.env.AIRTABLE_API_TOKEN) {
    applyResolved(null, "IDENTITY_RECONTRACT_REQUIRED");
    return createResult({
      scenarioId: "identity-verify",
      domain: "enrollment",
      classification: "READ_ONLY_PROD",
      mode: "readonly",
      result: "BLOCKED",
      actual: {
        verdict: "IDENTITY_RECONTRACT_REQUIRED",
        reason: "AIRTABLE_API_TOKEN missing; historical identity wiped per 2026-09-05 purge",
        purgeEvidence,
      },
      notes: ["Run with PAT after operator restores controlled enrollment"],
    });
  }

  const historical = await searchEnrollment(HISTORICAL_IDENTITY.enrollmentId);
  if (!historical.__missing) {
    applyResolved(historical, "IDENTITY_VERIFIED");
    return createResult({
      scenarioId: "identity-verify",
      domain: "enrollment",
      classification: "READ_ONLY_PROD",
      mode: "readonly",
      result: "PASS",
      actual: {
        verdict: "IDENTITY_VERIFIED",
        enrollmentId: historical.id,
        active: historical.fields?.["Active?"],
      },
      identity: getIdentitySnapshot().resolved,
    });
  }

  for (const candidate of CANDIDATE_ENROLLMENTS) {
    const rec = await searchEnrollment(candidate.id);
    if (!rec.__missing) {
      applyResolved(rec, "IDENTITY_VERIFIED");
      return createResult({
        scenarioId: "identity-verify",
        domain: "enrollment",
        classification: "READ_ONLY_PROD",
        mode: "readonly",
        result: "WARN",
        actual: {
          verdict: "IDENTITY_VERIFIED",
          note: `Using candidate harness enrollment: ${candidate.label}`,
          enrollmentId: rec.id,
        },
        identity: getIdentitySnapshot().resolved,
        notes: ["Update IDENTITY-CONTRACT.md with verified canonical RID"],
      });
    }
  }

  applyResolved(null, "IDENTITY_RECONTRACT_REQUIRED");
  return createResult({
    scenarioId: "identity-verify",
    domain: "enrollment",
    classification: "READ_ONLY_PROD",
    mode: "readonly",
    result: "BLOCKED",
    actual: {
      verdict: "IDENTITY_RECONTRACT_REQUIRED",
      historicalMissing: true,
      candidatesChecked: CANDIDATE_ENROLLMENTS.map((c) => c.id),
      purgeEvidence,
    },
    notes: ["Operator must create controlled test Athlete+Enrollment before --execute"],
  });
}

function writeIdentityEvidence(result) {
  const outDir = resolve(ROOT, EVIDENCE_DIR);
  mkdirSync(outDir, { recursive: true });
  const path = resolve(outDir, "IDENTITY-VERIFY.json");
  writeFileSync(
    path,
    JSON.stringify({ generated_at: new Date().toISOString(), snapshot: getIdentitySnapshot(), result }, null, 2)
  );
  return path;
}

module.exports = {
  verifyIdentity,
  getIdentitySnapshot,
  writeIdentityEvidence,
  applyResolved,
};
