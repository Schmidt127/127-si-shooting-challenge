"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assertExecuteAllowed } = require("../safety");
const { createResult, validateResult } = require("../result-schema");
const { summarizeRegistry } = require("../scenario-registry");
const { listPresets, simulateFailure } = require("../lib/failure-injection");
const { runScenarioExecute } = require("../runner");
const { resolvedIdentity, CANONICAL_IDENTITY, IDENTITY_STATES } = require("../config");

test("dry-run performs zero writes", () => {
  const gate = assertExecuteAllowed({ execute: false });
  assert.equal(gate.allowed, true);
  assert.equal(gate.mode, "dry-run");
});

test("--execute fails without verified identity", () => {
  const prior = resolvedIdentity.status;
  resolvedIdentity.status = IDENTITY_STATES.BLOCKED;
  const gate = assertExecuteAllowed({
    execute: true,
    acknowledgeProd: true,
    scenario: { requiresIdentity: true, requiresEmail: false },
  });
  resolvedIdentity.status = prior;
  assert.equal(gate.allowed, false);
});

test("--execute fails without --acknowledge-prod", () => {
  const gate = assertExecuteAllowed({ execute: true, acknowledgeProd: false, scenario: {} });
  assert.equal(gate.allowed, false);
});

test("--execute fails with wrong enrollment", () => {
  const priorEnr = resolvedIdentity.enrollmentId;
  resolvedIdentity.enrollmentId = "recWRONG000000000";
  resolvedIdentity.status = IDENTITY_STATES.VERIFIED_NON_EMAIL;
  const gate = assertExecuteAllowed({
    execute: true,
    acknowledgeProd: true,
    scenario: { requiresIdentity: true },
  });
  resolvedIdentity.enrollmentId = priorEnr;
  assert.equal(gate.allowed, false);
});

test("controlled non-email identity passes execute gate", () => {
  const prior = { ...resolvedIdentity };
  resolvedIdentity.status = IDENTITY_STATES.VERIFIED_NON_EMAIL;
  resolvedIdentity.enrollmentId = CANONICAL_IDENTITY.enrollmentId;
  resolvedIdentity.athleteId = CANONICAL_IDENTITY.athleteId;
  const gate = assertExecuteAllowed({
    execute: true,
    acknowledgeProd: true,
    scenario: { requiresIdentity: true, requiresEmail: false },
  });
  Object.assign(resolvedIdentity, prior);
  assert.equal(gate.allowed, true);
});

test("email scenario blocked without IDENTITY_VERIFIED_EMAIL", () => {
  resolvedIdentity.status = IDENTITY_STATES.VERIFIED_NON_EMAIL;
  const gate = assertExecuteAllowed({
    execute: true,
    acknowledgeProd: true,
    scenario: { requiresIdentity: true, requiresEmail: true, blockedByEmailInstall: true },
  });
  assert.equal(gate.allowed, false);
});

test("blocked #486 scenario reports BLOCKED on execute", () => {
  const out = runScenarioExecute("C8", { acknowledgeProd: true });
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
});
