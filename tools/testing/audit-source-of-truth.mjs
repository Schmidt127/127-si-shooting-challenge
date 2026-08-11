#!/usr/bin/env node

/**
 * Deterministic active-document stale-reference audit.
 *
 * Historical evidence is intentionally excluded by path. This audit checks
 * only current authority/control documents and committed runtime/test sources.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const canonicalFiles = [
  "docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
  "docs/AUTHORITY-MAP.md",
  "docs/PROJECT_STATE.md",
  "docs/v2-change-backlog.md",
  "docs/agent-runs/CONTROL.json",
];
const authorityFiles = new Set(canonicalFiles);
const historicalRoots = [
  "docs/archive/",
  "docs/launch-certification/",
  "docs/overnight/",
  "docs/prod-completion/",
  "docs/recovery/",
  "docs/testing/evidence/",
  "docs/foundation-reset/",
];
const historicalFiles = new Set([
  "docs/SHOOTING_CHALLENGE_PROD_OPERATING_MODE.md",
]);
const traceabilityInfrastructureFiles = new Set([
  "tools/testing/audit-source-of-truth.mjs",
  "tools/testing/tests/test-source-of-truth-audit.mjs",
]);
const stalePatterns = [
  ["115 references v2.0", /115[^\r\n]{0,80}v2\.0|v2\.0[^\r\n]{0,80}115/i],
  ["PROD-first authority claim", /PROD-first/i],
  ["pending-paste status claim", /pending paste|paste pending/i],
  ["launch-ready status claim", /launch[- ]ready/i],
  ["deprecated Softr launch state", /Softr Validated/i],
  [
    "Homework Library presented as scheduling authority",
    /Homework Library[^\r\n]{0,100}(sole|primary|scheduling) authority/i,
  ],
];

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
}

function isHistorical(path) {
  return historicalFiles.has(path) || historicalRoots.some((root) => path.startsWith(root));
}

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function reportIssue(issues, path, line, message) {
  issues.push(`${path}:${line}: ${message}`);
}

function scanText(issues, path, text, patterns) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [message, pattern] of patterns) {
      if (pattern.test(line)) reportIssue(issues, path, index + 1, message);
    }
  });
}

function diffAgainstOrigin() {
  if (process.env.SOT_AUDIT_DIFF !== undefined) {
    return process.env.SOT_AUDIT_DIFF;
  }

  try {
    return execFileSync("git", ["diff", "--unified=0", "origin/master...HEAD"], {
      cwd: ROOT,
    }).toString("utf8");
  } catch {
    return "";
  }
}

function changedFilesFromDiff(diff) {
  return [...diff.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)].map(
    ([, oldPath, newPath]) => (newPath === "/dev/null" ? oldPath : newPath),
  );
}

const issues = [];

for (const path of canonicalFiles) {
  if (!existsSync(resolve(ROOT, path))) {
    issues.push(`${path}: missing canonical file`);
  }
}

if (!existsSync(resolve(ROOT, "docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md"))) {
  issues.push("Completion Master: missing");
} else {
  const completion = read("docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md");
  for (const required of [
    "docs/AUTHORITY-MAP.md",
    "2027 season authority",
    "Automation 115",
    "Controlled automation-action tests do not prove natural-trigger behavior",
    "Active Execution Matrix",
    "Execution matrix IDs advanced:",
  ]) {
    if (!completion.includes(required)) {
      issues.push(`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md: missing required marker "${required}"`);
    }
  }
}

try {
  const control = JSON.parse(read("docs/agent-runs/CONTROL.json"));
  if (control.canonical?.sha !== control.canonical?.remote_sha) {
    issues.push("docs/agent-runs/CONTROL.json: canonical SHA does not match remote SHA");
  }
  if (
    control.release_control?.human_status_authority !==
    "docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md"
  ) {
    issues.push("docs/agent-runs/CONTROL.json: human status authority is not Completion Master");
  }
} catch (error) {
  issues.push(`docs/agent-runs/CONTROL.json: invalid JSON (${error.message})`);
}

const traceabilityDiff = diffAgainstOrigin();
const changedFiles = changedFilesFromDiff(traceabilityDiff);
const implementationChanged = changedFiles.some(
  (path) =>
    !traceabilityInfrastructureFiles.has(path) &&
    (path.startsWith("airtable/") ||
      path.startsWith("web/") ||
      path.startsWith("make/") ||
      path.startsWith("tools/") ||
      path.startsWith("tests/") ||
      path.startsWith("docs/deploy-checklists/")),
);
if (
  implementationChanged
) {
  if (!changedFiles.includes("docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md")) {
    issues.push(
      "traceability guard: implementation/package changes must update the Completion Master evidence row",
    );
  }

  const hasStructuredTraceEntry = traceabilityDiff
    .split(/\r?\n/)
    .some(
      (line) =>
        /^\+\s*Execution matrix IDs advanced:\s+PKG-\d{3}\b/.test(line) &&
        !line.startsWith("+++"),
    );
  if (!hasStructuredTraceEntry) {
    issues.push(
      "traceability guard: Completion Master diff must add \"Execution matrix IDs advanced: PKG-###\"",
    );
  }
}

for (const path of canonicalFiles) {
  if (existsSync(resolve(ROOT, path)) && path !== "docs/agent-runs/CONTROL.json") {
    const text = read(path);
    const currentSection =
      path === "docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md"
        ? text.split("### Current PROD reconciliation")[0]
        : text;
    if (path !== "docs/v2-change-backlog.md") {
      scanText(issues, path, currentSection, stalePatterns);
    }
  }
}

for (const path of trackedFiles()) {
  if (
    (path.startsWith("airtable/automations/") ||
      path.startsWith("tools/testing/") ||
      path.startsWith("tests/")) &&
    !isHistorical(path)
  ) {
    // Version-history entries are valid historical metadata; only the
    // executable script header is an active version claim.
    scanText(issues, path, read(path).split(/\r?\n/).slice(0, 35).join("\n"), [
      stalePatterns[0],
    ]);
  }
}

for (const path of trackedFiles()) {
  if (path.endsWith(".md") && !isHistorical(path) && !authorityFiles.has(path)) {
    scanText(issues, path, read(path), [
      [
        "duplicate human-readable status authority",
        /controlling source of truth|sole human-readable release-status authority/i,
      ],
    ]);
  }
}

if (issues.length) {
  console.error(issues.sort().join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS source-of-truth audit: active references are reconciled");
}
