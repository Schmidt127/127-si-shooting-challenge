"use strict";

const fs = require("fs");
const path = require("path");
const { getEvidenceRoot, DEV_BASE_ID } = require("./constants");

function evidenceDateFolder(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function evidencePathFor(testId, date = new Date(), root = getEvidenceRoot()) {
  const folder = path.join(root, evidenceDateFolder(date));
  return path.join(folder, `${String(testId).toUpperCase()}.md`);
}

function ensureEvidenceDir(testId, date = new Date(), root = getEvidenceRoot()) {
  const filePath = evidencePathFor(testId, date, root);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}

function buildEvidenceMarkdown(payload) {
  const p = payload || {};
  const records = Array.isArray(p.recordsCreated) ? p.recordsCreated : [];
  const recordLines = records.length
    ? records.map((r) => `- \`${r.table}\` \`${r.id}\`${r.kind ? ` (${r.kind})` : ""}`).join("\n")
    : "_none_";

  return [
    `# DEV run evidence — ${p.testId}`,
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Test ID | ${p.testId} |`,
    `| Timestamp | ${p.timestamp || ""} |`,
    `| DEV base ID | ${p.baseId || DEV_BASE_ID} |`,
    `| Operator | ${p.operator || ""} |`,
    `| Dry-run | ${p.dryRun ? "yes" : "no"} |`,
    `| Result | ${p.result || "blocked"} |`,
    `| Run ID | ${p.runId || ""} |`,
    "",
    "## Pre-test state",
    "",
    typeof p.preTestState === "string"
      ? p.preTestState
      : "```json\n" + JSON.stringify(p.preTestState || {}, null, 2) + "\n```",
    "",
    "## Records created",
    "",
    recordLines,
    "",
    "## Expected result",
    "",
    p.expectedResult || "_see matrix / fixture_",
    "",
    "## Actual result",
    "",
    p.actualResult || "_not run — do not invent_",
    "",
    "## Automation evidence",
    "",
    p.automationEvidence || "_none_",
    "",
    "## Cleanup result",
    "",
    typeof p.cleanupResult === "string"
      ? p.cleanupResult
      : "```json\n" + JSON.stringify(p.cleanupResult || {}, null, 2) + "\n```",
    "",
    "## Pass / Fail / Blocked",
    "",
    p.result || "blocked",
    "",
    "## Operator notes",
    "",
    p.notes || "",
    "",
  ].join("\n");
}

function writeEvidence(payload, options = {}) {
  const date = options.date || new Date();
  const root = options.root || getEvidenceRoot();
  const filePath = ensureEvidenceDir(payload.testId, date, root);
  const markdown = buildEvidenceMarkdown(payload);
  fs.writeFileSync(filePath, markdown, "utf8");
  return { filePath, markdown };
}

module.exports = {
  evidenceDateFolder,
  evidencePathFor,
  ensureEvidenceDir,
  buildEvidenceMarkdown,
  writeEvidence,
};
