"use strict";

const fs = require("fs");
const path = require("path");
const {
  DEV_BASE_ID,
  PROD_BASE_ID,
  TEST_ID_RE,
  SUPPORTED_LIVE_TESTS,
  PACKAGE_ROOT,
} = require("./constants");

class SafetyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SafetyError";
    this.code = code;
  }
}

function normalizeBaseId(value) {
  return String(value || "").trim();
}

function assertDevBaseId(baseId) {
  const id = normalizeBaseId(baseId);
  if (!id) {
    throw new SafetyError("missing_base_id", "BASE_ID is missing. Set BASE_ID=appTetnuCZlCZdTCT (DEV only).");
  }
  if (id === PROD_BASE_ID) {
    throw new SafetyError(
      "prod_base_refused",
      `PROD base ${PROD_BASE_ID} is refused. This CLI only allows DEV ${DEV_BASE_ID}.`,
    );
  }
  if (id !== DEV_BASE_ID) {
    throw new SafetyError(
      "base_id_mismatch",
      `BASE_ID ${id} is not DEV. Required exactly ${DEV_BASE_ID}.`,
    );
  }
  return id;
}

function assertDevConfirm(parsed) {
  if (!parsed.has("dev-confirm")) {
    throw new SafetyError(
      "missing_dev_confirm",
      "Missing --dev-confirm. Live/env actions require explicit DEV confirmation.",
    );
  }
}

function assertExecuteForWrites(parsed, wantsWrite) {
  if (wantsWrite && !parsed.has("execute")) {
    throw new SafetyError(
      "missing_execute",
      "Writes refused: default is dry-run. Pass --execute only after Mike authorization.",
    );
  }
}

function isWriteAllowed(parsed) {
  return parsed.has("dev-confirm") && parsed.has("execute");
}

function assertValidTestId(testId) {
  const id = String(testId || "").trim().toUpperCase();
  if (!TEST_ID_RE.test(id)) {
    throw new SafetyError(
      "malformed_test_id",
      `Malformed test ID "${testId}". Expected form like A3, B1, F12.`,
    );
  }
  return id;
}

function assertSupportedLiveTest(testId) {
  const id = assertValidTestId(testId);
  if (!SUPPORTED_LIVE_TESTS.includes(id)) {
    throw new SafetyError(
      "unsupported_test_id",
      `Test ${id} is not supported by the live CLI yet. Supported: ${SUPPORTED_LIVE_TESTS.join(", ")}.`,
    );
  }
  return id;
}

/**
 * Load env for this CLI without accepting PROD BASE_ID.
 * Reads tools/airtable/.env if present, but refuses PROD identifiers.
 * Never returns token to callers for printing — use tokenPresent()/getToken().
 */
function loadCliEnv(env = process.env, options = {}) {
  const dotenvPath =
    options.dotenvPath || path.join(PACKAGE_ROOT, "..", ".env");
  const loaded = { ...env };

  if (options.loadDotenv !== false && fs.existsSync(dotenvPath)) {
    const text = fs.readFileSync(dotenvPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Do not override already-set process env
      if (loaded[key] == null || loaded[key] === "") {
        loaded[key] = value;
      }
    }
  }

  return loaded;
}

function getToken(env = process.env) {
  return String(
    env.AIRTABLE_TOKEN || env.AIRTABLE_API_TOKEN || env.AIRTABLE_PAT || "",
  ).trim();
}

function tokenPresent(env = process.env) {
  return getToken(env).length > 0;
}

function getBaseId(env = process.env) {
  return normalizeBaseId(env.AIRTABLE_BASE_ID || env.BASE_ID || "");
}

function assertNoProdIdentifiers(env = process.env) {
  const baseId = getBaseId(env);
  if (baseId === PROD_BASE_ID) {
    throw new SafetyError(
      "prod_identifier_present",
      "PROD BASE_ID is present in environment. Unset it or set BASE_ID to DEV before continuing.",
    );
  }
  // Refuse known PROD-only webhook env vars if set for this CLI session
  const prodWebhookKeys = [
    "MAKE_PROD_UPLOAD_WEBHOOK_URL",
    "MAKE_PROD_WEBHOOK_URL",
    "PROD_MAKE_WEBHOOK_URL",
  ];
  for (const key of prodWebhookKeys) {
    if (String(env[key] || "").trim()) {
      throw new SafetyError(
        "prod_identifier_present",
        `${key} is set. This CLI refuses PROD Make configuration.`,
      );
    }
  }
  return true;
}

function buildPreflightSummary({
  command,
  testId = "",
  parsed,
  env,
  writeIntent = false,
}) {
  const baseId = getBaseId(env);
  let baseStatus = "missing";
  if (baseId === DEV_BASE_ID) baseStatus = "DEV_OK";
  else if (baseId === PROD_BASE_ID) baseStatus = "PROD_REFUSED";
  else if (baseId) baseStatus = "UNKNOWN_REFUSED";

  return {
    command,
    testId: testId || null,
    timestamp: new Date().toISOString(),
    expectedDevBaseId: DEV_BASE_ID,
    forbiddenProdBaseId: PROD_BASE_ID,
    baseIdSet: Boolean(baseId),
    baseStatus,
    tokenPresent: tokenPresent(env),
    // never include token value
    devConfirm: parsed.has("dev-confirm"),
    execute: parsed.has("execute"),
    dryRun: !isWriteAllowed(parsed) || !writeIntent,
    writeIntent: Boolean(writeIntent),
    writesAllowed: isWriteAllowed(parsed) && writeIntent,
    rollbackOnly: parsed.has("rollback-only"),
  };
}

function formatPreflight(summary) {
  const lines = [
    "== Preflight summary ==",
    `command: ${summary.command}`,
    summary.testId ? `testId: ${summary.testId}` : null,
    `timestamp: ${summary.timestamp}`,
    `expected DEV base: ${summary.expectedDevBaseId}`,
    `forbidden PROD base: ${summary.forbiddenProdBaseId}`,
    `BASE_ID set: ${summary.baseIdSet ? "YES" : "NO"} (${summary.baseStatus})`,
    `AIRTABLE_TOKEN present: ${summary.tokenPresent ? "YES" : "NO"}`,
    `--dev-confirm: ${summary.devConfirm ? "YES" : "NO"}`,
    `--execute: ${summary.execute ? "YES" : "NO"}`,
    `dry-run: ${summary.dryRun ? "YES" : "NO"}`,
    `writes allowed: ${summary.writesAllowed ? "YES" : "NO"}`,
    `rollback-only: ${summary.rollbackOnly ? "YES" : "NO"}`,
    "token values: never printed",
  ].filter(Boolean);
  return lines.join("\n");
}

module.exports = {
  SafetyError,
  normalizeBaseId,
  assertDevBaseId,
  assertDevConfirm,
  assertExecuteForWrites,
  isWriteAllowed,
  assertValidTestId,
  assertSupportedLiveTest,
  loadCliEnv,
  getToken,
  tokenPresent,
  getBaseId,
  assertNoProdIdentifiers,
  buildPreflightSummary,
  formatPreflight,
};
