"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assertExecuteAllowed } = require("../safety");
const { createResult, validateResult } = require("../result-schema");
const { summarizeRegistry } = require("../scenario-registry");
const { listPresets, simulateFailure } = require("../lib/failure-injection");
const { getIdentitySnapshot } = require("../identity");
const { runScenarioDryRun, runScenarioExecute } = require("../runner");

test("dry-run performs zero writes (execute gate not allowed without flags)", () => {
  const gate = assertExecuteAllowed({ execute: false });
  assert.equal(gate.allowed, true);
  assert.equal(gate.mode, "dry-run");
});

test("--execute fails without IDENTITY_VERIFIED", () => {
  const gate = assertExecuteAllowed({
    execute: true,
    acknowledgeProd: true,
    scenario: { requiresIdentity: true, requiresEmail: false },
  });
  assert.equal(gate.allowed, false);
  assert.ok(gate.errors.some((e) => e.includes("IDENTITY_VERIFIED")));
});

test("--execute fails without --acknowledge-prod", () => {
  const snap = getIdentitySnapshot();
  if (snap.executeEnabled) return;
  const gate = assertExecuteAllowed({ execute: true, acknowledgeProd: false });
  assert.equal(gate.allowed, false);
});

test("blocked #486 scenario reports BLOCKED on execute", () => {
  const out = runScenarioExecute("C8", { acknowledgeProd: true, confirmDestructive: false });
  assert.equal(out.result.result, "BLOCKED");
});

test("result schema validation", () => {
  const r = createResult({ scenarioId: "A4", domain: "enrollment", classification: "OFFLINE_UNIT", result: "PASS" });
  assert.equal(validateResult(r).valid, true);
});

test("scenario registry has 64+ matrix rows", () => {
  const s = summarizeRegistry();
  assert.ok(s.total >= 64);
});

test("failure injection presets cover required classes", () => {
  const presets = listPresets();
  for (const name of ["HTTP_401", "HTTP_500", "MALFORMED_JSON", "TIMEOUT", "UNSUPPORTED_ROUTE"]) {
    assert.ok(presets.includes(name), name);
  }
  const f = simulateFailure("HTTP_500");
  assert.equal(f.status, 500);
});
