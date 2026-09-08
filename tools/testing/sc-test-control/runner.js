"use strict";

const { createResult, validateResult } = require("./result-schema");
const { assertExecuteAllowed } = require("./safety");
const { getScenario } = require("./scenario-registry");
const { getIdentitySnapshot } = require("./identity");

function runScenarioDryRun(scenarioId, options = {}) {
  const scenario = getScenario(scenarioId);
  const gate = assertExecuteAllowed({ execute: false, scenario });
  const result = createResult({
    scenarioId: scenario.scenarioId,
    domain: scenario.domain,
    classification: scenario.classification,
    mode: "dry-run",
    identity: getIdentitySnapshot().resolved,
    preconditions: scenario.preconditions || {},
    expected: scenario.expectedSummary || {},
    actual: {
      planned: true,
      implemented: scenario.implemented,
      liveReady: scenario.liveReady,
      blockedReasons: collectBlockReasons(scenario),
    },
    result: resolveDryRunResult(scenario),
    notes: scenario.notes ? [scenario.notes] : [],
    runId: options.runId || null,
  });
  const v = validateResult(result);
  if (!v.valid) throw new Error(v.errors.join("; "));
  return { gate, result, scenario };
}

function runScenarioExecute(scenarioId, options = {}) {
  const scenario = getScenario(scenarioId);
  const gate = assertExecuteAllowed({
    execute: true,
    acknowledgeProd: options.acknowledgeProd,
    confirmDestructive: options.confirmDestructive,
    scenario,
  });
  if (!gate.allowed) {
    return {
      gate,
      result: createResult({
        scenarioId: scenario.scenarioId,
        domain: scenario.domain,
        classification: scenario.classification,
        mode: "execute",
        result: "BLOCKED",
        actual: { gateErrors: gate.errors },
        notes: gate.errors,
      }),
      scenario,
    };
  }
  return {
    gate,
    result: createResult({
      scenarioId: scenario.scenarioId,
      domain: scenario.domain,
      classification: scenario.classification,
      mode: "execute",
      result: "BLOCKED",
      actual: { message: "Execute handlers not wired in Wave B; use domain harnesses" },
      notes: ["Wave C wires controlled PROD execution"],
    }),
    scenario,
  };
}

function collectBlockReasons(scenario) {
  const reasons = [];
  if (scenario.blockedByIdentity) reasons.push("identity");
  if (scenario.blockedBy486) reasons.push("sc-486");
  if (scenario.requiresOperatorUI) reasons.push("operator-ui");
  if (scenario.blockedByEmailInstall) reasons.push("email-install");
  if (!scenario.implemented) reasons.push("not-implemented");
  return reasons;
}

function resolveDryRunResult(scenario) {
  if (scenario.blockedBy486) return "BLOCKED";
  if (scenario.blockedByIdentity) return "BLOCKED";
  if (scenario.blockedByEmailInstall) return "BLOCKED";
  if (scenario.requiresOperatorUI && !scenario.implemented) return "BLOCKED";
  if (!scenario.implemented) return "SKIPPED";
  if (scenario.liveReady) return "PASS";
  return "WARN";
}

module.exports = {
  runScenarioDryRun,
  runScenarioExecute,
};
