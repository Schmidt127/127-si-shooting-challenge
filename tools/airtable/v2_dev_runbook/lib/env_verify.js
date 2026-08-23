"use strict";

const {
  DEV_BASE_ID,
  PROD_BASE_ID,
  REQUIRED_TABLES,
} = require("./constants");
const {
  SafetyError,
  assertDevBaseId,
  assertNoProdIdentifiers,
  tokenPresent,
  getBaseId,
  getToken,
} = require("./safety");
const { planSchemaChecks, evaluateSchemaMeta, createAirtableClient } = require("./airtable_client");

/**
 * Verify environment for DEV CLI use.
 * options.meta: optional meta.tables payload to avoid network in tests
 * options.probeLive: when true and token+dev base ok, call meta API
 */
async function verifyEnv(env, options = {}) {
  const checks = [];
  const push = (name, ok, detail) => {
    checks.push({ name, ok, detail });
  };

  try {
    assertNoProdIdentifiers(env);
    push("no_prod_identifiers", true, "No PROD BASE_ID / PROD Make keys detected");
  } catch (error) {
    push("no_prod_identifiers", false, error.message);
  }

  const hasToken = tokenPresent(env);
  push("token_present", hasToken, hasToken ? "AIRTABLE_TOKEN present (value not shown)" : "AIRTABLE_TOKEN missing");

  const baseId = getBaseId(env);
  let baseOk = false;
  try {
    assertDevBaseId(baseId);
    baseOk = true;
    push("base_id_dev", true, `BASE_ID=${DEV_BASE_ID}`);
  } catch (error) {
    push("base_id_dev", false, error.message);
  }

  // Never treat PROD as acceptable
  if (baseId === PROD_BASE_ID) {
    push("prod_refused", false, `PROD ${PROD_BASE_ID} refused`);
  } else {
    push("prod_refused", true, "PROD base not selected");
  }

  const planned = planSchemaChecks();
  push(
    "schema_plan",
    true,
    `Will require tables: ${planned.requiredTables.join(", ")}`,
  );

  let schema = null;
  if (options.meta) {
    schema = evaluateSchemaMeta(options.meta);
    push(
      "required_tables_fields",
      schema.ok,
      schema.ok
        ? `Meta OK (${schema.tableCount} tables)`
        : `Missing tables=${schema.missingTables.join("|") || "none"}; fields=${schema.missingFields.join("|") || "none"}`,
    );
  } else if (options.probeLive && hasToken && baseOk) {
    try {
      const client = createAirtableClient({
        env,
        fetchImpl: options.fetchImpl,
        dryRun: true,
      });
      // meta is read-only; allow even in dryRun by calling metaTables directly
      // Re-create with dryRun false for GET meta only through dedicated method
      const live = createAirtableClient({
        env,
        fetchImpl: options.fetchImpl,
        dryRun: false,
      });
      const meta = await live.metaTables();
      schema = evaluateSchemaMeta(meta);
      push(
        "required_tables_fields",
        schema.ok,
        schema.ok
          ? `Live meta OK (${schema.tableCount} tables)`
          : `Missing tables=${schema.missingTables.join("|") || "none"}; fields=${schema.missingFields.join("|") || "none"}`,
      );
      // Touch client to avoid unused lint-style noise
      void client;
    } catch (error) {
      push("required_tables_fields", false, error.message);
    }
  } else {
    push(
      "required_tables_fields",
      false,
      "Skipped live schema probe (need token + DEV base + --dev-confirm; or pass meta in tests)",
    );
  }

  const enrollmentId = String(options.enrollmentId || env.DEV_TEST_ENROLLMENT_ID || "").trim();
  if (enrollmentId) {
    const ok = enrollmentId.startsWith("rec");
    push(
      "test_enrollment",
      ok,
      ok
        ? `Enrollment id provided (${enrollmentId.slice(0, 6)}…)`
        : "Enrollment id malformed (must start with rec)",
    );
  } else {
    push(
      "test_enrollment",
      false,
      "No DEV_TEST_ENROLLMENT_ID / --enrollment yet — set before --execute (do not invent)",
    );
  }

  // Ensure token value never appears in details
  const token = getToken(env);
  if (token) {
    for (const check of checks) {
      if (String(check.detail).includes(token)) {
        check.detail = "[redacted unexpected token leak]";
        check.ok = false;
      }
    }
  }

  const ok = checks.every((c) => {
    // schema probe skip is soft-fail for offline verify unless probeLive requested
    if (c.name === "required_tables_fields" && !options.probeLive && !options.meta) {
      return true;
    }
    if (c.name === "test_enrollment" && !options.requireEnrollment) {
      return true;
    }
    return c.ok;
  });

  return {
    ok,
    expectedDevBaseId: DEV_BASE_ID,
    forbiddenProdBaseId: PROD_BASE_ID,
    requiredTables: [...REQUIRED_TABLES],
    checks,
    schema,
  };
}

function formatVerifyEnv(result) {
  const lines = ["== verify-env ==", `overall: ${result.ok ? "OK" : "BLOCKED"}`];
  for (const check of result.checks) {
    lines.push(`${check.ok ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`);
  }
  return lines.join("\n");
}

module.exports = {
  verifyEnv,
  formatVerifyEnv,
};
