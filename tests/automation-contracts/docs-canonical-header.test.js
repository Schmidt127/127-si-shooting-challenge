#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const AUTOMATIONS = path.join(ROOT, "airtable/automations/shooting-challenge");
const CURRENT_TRUTH = path.join(ROOT, "docs/CURRENT-TRUTH.md");
const PENDING_CUTOVERS = path.join(ROOT, "docs/deploy-checklists/PENDING-AUTOMATION-CUTOVERS.md");
const DOCS = [
  path.join(ROOT, "docs/automation-index.md"),
  path.join(ROOT, "airtable/schema/current/automation-trigger-map.md"),
];

const CURRENT_AUTOMATIONS = [
  ["031", "031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js", "031-"],
  ["032", "032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js", "032-"],
  ["057", "057-achievements-and-milestones-calculate-perfect-week-eligibility.js", "057-"],
  ["058", "058-achievements-and-milestones-create-perfect-week-unlock.js", "058-"],
  ["041", "041-levels-and-progression-mark-enrollment-for-level-recalculation.js", "041-"],
  ["042", "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js", "042-"],
  ["076", "076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js", "076-"],
  ["079", "079-email-notifications-and-external-handoffs-send-queue-handoff-to-communications-hub.js", "079-"],
  ["101", "101-zoom-attendance-xp-award-meeting-xp.js", "101-"],
  ["118", "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js", "118-"],
];

function canonicalVersion(fileName) {
  const source = fs.readFileSync(path.join(AUTOMATIONS, fileName), "utf8");
  const match = source.match(/\bVersion:\s*(v?\d+\.\d+(?:\.\d+)?)/);
  assert.ok(match, `canonical source header must declare a version: ${fileName}`);
  return `v${match[1].replace(/^v/, "")}`;
}

function rowFor(text, number, fileName, docNeedle) {
  const row = text
    .split(/\r?\n/)
    .find((line) => line.includes(docNeedle) && new RegExp(`\\|\\s*\\**${number}\\**\\s*\\|`).test(line));
  assert.ok(row, `documentation row missing for Automation ${number}: ${fileName}`);
  return row;
}

function pendingLiveFromRow(row, canonical) {
  if (!row || !/GitHub ahead/i.test(row) || !/paste pending/i.test(row)) return "";
  const cells = row.split("|").map((cell) => cell.replace(/\*/g, "").trim());
  const githubVersion = cells.find((cell) => /^v\d+\.\d+(?:\.\d+)?$/.test(cell)) || "";
  const liveVersion = cells.slice(cells.indexOf(githubVersion) + 1).find((cell) => /^v\d+\.\d+(?:\.\d+)?$/.test(cell)) || "";
  if (githubVersion !== canonical || !liveVersion) return "";
  return liveVersion;
}

function documentedPendingLiveVersion(number, canonical) {
  const currentTruth = fs.readFileSync(CURRENT_TRUTH, "utf8");
  const currentTruthRow = currentTruth
    .split(/\r?\n/)
    .find((line) => new RegExp(`\\|\\s*\\**${number}\\**\\s*\\|`).test(line));
  const fromCurrentTruth = pendingLiveFromRow(currentTruthRow, canonical);
  if (fromCurrentTruth) return fromCurrentTruth;

  if (!fs.existsSync(PENDING_CUTOVERS)) return "";
  const cutovers = fs.readFileSync(PENDING_CUTOVERS, "utf8");
  const cutoverRow = cutovers
    .split(/\r?\n/)
    .find((line) => new RegExp(`\\|\\s*\\**${number}\\**\\s*\\|`).test(line));
  return pendingLiveFromRow(cutoverRow, canonical);
}

for (const [number, fileName, docNeedle] of CURRENT_AUTOMATIONS) {
  const expected = canonicalVersion(fileName);
  const pendingLive = documentedPendingLiveVersion(number, expected);
  const allowedVersions = [expected, pendingLive].filter(Boolean);
  const versionPattern = allowedVersions.map((version) => version.replace(/\./g, "\\.")).join("|");

  for (const docPath of DOCS) {
    const text = fs.readFileSync(docPath, "utf8");
    const row = rowFor(text, number, fileName, docNeedle);
    assert.match(
      row,
      new RegExp(`\\b(?:${versionPattern})\\b`),
      `${path.relative(ROOT, docPath)} drifted from Automation ${number} canonical header ${expected}${pendingLive ? ` (documented live ${pendingLive} while paste pending)` : ""}: ${row}`,
    );
  }
}

console.log("docs-versus-canonical-header contract passed");
