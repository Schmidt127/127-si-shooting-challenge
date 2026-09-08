"use strict";

const { readFileSync, existsSync, writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const {
  BASE_ID,
  CANONICAL_IDENTITY,
  HISTORICAL_IDENTITY,
  resolvedIdentity,
  TEST_RECIPIENT_ALLOWLIST,
  IDENTITY_STATES,
  executeIdentityAllowed,
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
  if (!process.env.AIRTABLE_API_TOKEN && process.env.CURRICULUM_AIRTABLE_TOKEN) {
    process.env.AIRTABLE_API_TOKEN = process.env.CURRICULUM_AIRTABLE_TOKEN;
  }
}

function airtableToken() {
  return process.env.AIRTABLE_API_TOKEN || process.env.CURRICULUM_AIRTABLE_TOKEN || null;
}

async function fetchRecord(table, id) {
  const token = airtableToken();
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
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

function athleteLabelFromRecord(athlete) {
  if (!athlete) return CANONICAL_IDENTITY.athleteLabel;
  return (
    athlete.fields?.["Full Name"] ||
    athlete.fields?.Name ||
    athlete.fields?.["Athlete Name"] ||
    CANONICAL_IDENTITY.athleteLabel
  );
}

function resolveVerdictFromEmails(emails) {
  const normalized = emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  resolvedIdentity.testRecipientEmails = normalized;
  const hasAllowlisted = normalized.some((e) =>
    TEST_RECIPIENT_ALLOWLIST.some((a) => a.toLowerCase() === e)
  );
  return hasAllowlisted ? IDENTITY_STATES.VERIFIED_EMAIL : IDENTITY_STATES.VERIFIED_NON_EMAIL;
}

function applyResolved(enrollment, status, athlete = null) {
  resolvedIdentity.status = status;
  resolvedIdentity.verifiedAt = new Date().toISOString();
  if (enrollment && !enrollment.__missing) {
    resolvedIdentity.enrollmentId = enrollment.id;
    resolvedIdentity.athleteId = (enrollment.fields?.Athlete || [])[0] || null;
    resolvedIdentity.programInstanceId = (enrollment.fields?.["Program Instance"] || [])[0] || null;
    resolvedIdentity.active = enrollment.fields?.["Active?"] ?? null;
    resolvedIdentity.weekId = (enrollment.fields?.Week || [])[0] || null;
    resolvedIdentity.wasId = (enrollment.fields?.["Weekly Athlete Summary"] || [])[0] || null;
    resolvedIdentity.gradeBand =
      (Array.isArray(enrollment.fields?.["Grade Band Label"])
        ? enrollment.fields["Grade Band Label"].join(", ")
        : enrollment.fields?.["Grade Band Label"]) ||
      CANONICAL_IDENTITY.gradeBand;
    const parent = enrollment.fields?.["Parent Email - Cleaned"] || enrollment.fields?.["Parent Email"] || "";
    const athleteEmail =
      enrollment.fields?.["Athlete Email - Cleaned"] || enrollment.fields?.["Athlete Email"] || "";
    const verdict = resolveVerdictFromEmails([parent, athleteEmail].filter(Boolean));
    if (status === IDENTITY_STATES.VERIFIED_NON_EMAIL || status === IDENTITY_STATES.VERIFIED_EMAIL) {
      resolvedIdentity.status = verdict;
    }
  }
  resolvedIdentity.athleteLabel = athleteLabelFromRecord(athlete);
}

function getIdentitySnapshot() {
  return {
    baseId: BASE_ID,
    canonical: { ...CANONICAL_IDENTITY },
    historical: { ...HISTORICAL_IDENTITY, status: "PURGED / DO NOT REUSE" },
    resolved: { ...resolvedIdentity },
    executeEnabled: executeIdentityAllowed(resolvedIdentity.status),
    emailExecuteEnabled: resolvedIdentity.status === IDENTITY_STATES.VERIFIED_EMAIL,
    emailTestConfigured: resolvedIdentity.status === IDENTITY_STATES.VERIFIED_EMAIL,
  };
}

async function verifyIdentity() {
  loadEnvLocal();

  if (!airtableToken()) {
    applyResolved(null, IDENTITY_STATES.BLOCKED);
    return createResult({
      scenarioId: "identity-verify",
      domain: "enrollment",
      classification: "READ_ONLY_PROD",
      mode: "readonly",
      result: "BLOCKED",
      actual: { verdict: IDENTITY_STATES.BLOCKED, reason: "AIRTABLE_API_TOKEN missing" },
    });
  }

  const historical = await searchEnrollment(HISTORICAL_IDENTITY.enrollmentId);
  if (!historical.__missing) {
    applyResolved(historical, IDENTITY_STATES.BLOCKED);
    return createResult({
      scenarioId: "identity-verify",
      domain: "enrollment",
      classification: "READ_ONLY_PROD",
      mode: "readonly",
      result: "BLOCKED",
      actual: { verdict: IDENTITY_STATES.BLOCKED, reason: "Historical enrollment must remain purged" },
    });
  }

  const enrollment = await searchEnrollment(CANONICAL_IDENTITY.enrollmentId);
  if (enrollment.__missing) {
    applyResolved(null, IDENTITY_STATES.RECONTRACT);
    return createResult({
      scenarioId: "identity-verify",
      domain: "enrollment",
      classification: "READ_ONLY_PROD",
      mode: "readonly",
      result: "BLOCKED",
      actual: {
        verdict: IDENTITY_STATES.RECONTRACT,
        expectedEnrollmentId: CANONICAL_IDENTITY.enrollmentId,
      },
    });
  }

  const athleteId = (enrollment.fields?.Athlete || [])[0] || null;
  let athlete = null;
  if (athleteId) {
    try {
      athlete = await fetchRecord("Athletes", athleteId);
    } catch {
      athlete = null;
    }
  }

  const mismatches = [];
  if (athleteId !== CANONICAL_IDENTITY.athleteId) mismatches.push("athleteId");
  const programInstance = (enrollment.fields?.["Program Instance"] || [])[0];
  if (programInstance !== CANONICAL_IDENTITY.programInstanceId) mismatches.push("programInstanceId");
  if (enrollment.fields?.["Active?"] !== true) mismatches.push("active");

  applyResolved(enrollment, IDENTITY_STATES.VERIFIED_NON_EMAIL, athlete);
  if (!/testing schmidt/i.test(resolvedIdentity.athleteLabel || "")) mismatches.push("athleteLabel");

  return createResult({
    scenarioId: "identity-verify",
    domain: "enrollment",
    classification: "READ_ONLY_PROD",
    mode: "readonly",
    result: mismatches.length ? "WARN" : "PASS",
    actual: {
      verdict: resolvedIdentity.status,
      enrollmentId: enrollment.id,
      athleteId,
      programInstanceId: programInstance,
      gradeBand: resolvedIdentity.gradeBand,
      active: enrollment.fields?.["Active?"],
      athleteLabel: resolvedIdentity.athleteLabel,
      emailConfigured: resolvedIdentity.status === IDENTITY_STATES.VERIFIED_EMAIL,
      mismatches,
    },
    identity: getIdentitySnapshot().resolved,
    notes:
      resolvedIdentity.status === IDENTITY_STATES.VERIFIED_NON_EMAIL
        ? ["EMAIL_TEST_IDENTITY_NOT_CONFIGURED — non-email execute allowed"]
        : [],
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
  loadEnvLocal,
  airtableToken,
  fetchRecord,
};
