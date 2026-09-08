"use strict";

const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const REGISTRY_PATH = resolve(__dirname, "scenarios.json");

function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
}

function getScenario(id) {
  const reg = loadRegistry();
  const key = id.toUpperCase();
  const row = reg.scenarios.find(
    (s) => s.scenarioId === key || s.scenarioId === id || s.matrixId === key
  );
  if (!row) throw new Error(`Unknown scenario: ${id}`);
  return row;
}

function listScenarios(filter = {}) {
  const reg = loadRegistry();
  let rows = reg.scenarios;
  if (filter.domain) rows = rows.filter((r) => r.domain === filter.domain);
  if (filter.implemented != null) rows = rows.filter((r) => r.implemented === filter.implemented);
  return rows;
}

function summarizeRegistry() {
  const reg = loadRegistry();
  const rows = reg.scenarios;
  const count = (pred) => rows.filter(pred).length;
  return {
    total: rows.length,
    executable: count((r) => r.implemented && r.liveReady),
    fixtureOnly: count((r) => r.implemented && !r.liveReady && !r.blockedByIdentity),
    blockedIdentity: count((r) => r.blockedByIdentity),
    blocked486: count((r) => r.blockedBy486),
    blockedUI: count((r) => r.requiresOperatorUI),
    blockedEmail: count((r) => r.blockedByEmailInstall),
    notImplemented: count((r) => !r.implemented),
  };
}

module.exports = {
  loadRegistry,
  getScenario,
  listScenarios,
  summarizeRegistry,
  REGISTRY_PATH,
};
