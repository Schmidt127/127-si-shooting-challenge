/**
 * Shared report helpers for CLI and tests.
 */

"use strict";

function printReport(report, { json = false } = {}) {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const overall = report.overall || report.status || (report.ok ? "PASS" : "FAIL");
  process.stdout.write(`Overall: ${overall}\n`);
  const checks = report.checks || report.findings || [];
  for (const item of checks) {
    const sev = item.severity || "INFO";
    const code = item.code || "";
    const msg = item.message || "";
    process.stdout.write(`- [${sev}] ${code}: ${msg}\n`);
    if (item.requiredAction) {
      process.stdout.write(`    action: ${item.requiredAction}\n`);
    }
  }
}

function exitCodeForOverall(overall) {
  if (overall === "PASS") return 0;
  if (overall === "PASS WITH WARNINGS") return 0;
  return 1;
}

/**
 * Human-readable Markdown for launch CLI artifacts.
 */
function toMarkdownReport(title, result = {}) {
  const overall = result.overall || result.status || "UNKNOWN";
  const lines = [`# ${title}`, "", `**Overall:** ${overall}`, ""];

  if (result.configRecordId) lines.push(`- Config: \`${result.configRecordId}\``);
  if (result.challengeYear) lines.push(`- Challenge year: \`${result.challengeYear}\``);
  if (result.dryRun != null) lines.push(`- Dry run: \`${result.dryRun}\``);
  if (result.launch?.state) lines.push(`- Launch state: \`${result.launch.state}\``);
  lines.push("");

  const checks = result.checks || result.findings || result.failedChecks || [];
  if (checks.length) {
    lines.push("## Checks / findings", "");
    for (const item of checks) {
      const sev = item.severity || "INFO";
      const code = item.code || "note";
      const msg = item.message || item.action || "";
      lines.push(`- **${sev}** \`${code}\` — ${msg}`);
      if (item.requiredAction) lines.push(`  - Action: ${item.requiredAction}`);
    }
    lines.push("");
  }

  if (Array.isArray(result.proposedChanges) && result.proposedChanges.length) {
    lines.push("## Proposed changes", "");
    for (const change of result.proposedChanges) {
      lines.push(`- ${JSON.stringify(change)}`);
    }
    lines.push("");
  }

  if (Array.isArray(result.mikeActions) && result.mikeActions.length) {
    lines.push("## Mike actions", "");
    for (const a of result.mikeActions) {
      lines.push(`- [${a.severity || "INFO"}] ${a.action || a.message || JSON.stringify(a)}`);
    }
    lines.push("");
  }

  if (Array.isArray(result.rollbackActions) && result.rollbackActions.length) {
    lines.push("## Rollback actions", "");
    for (const a of result.rollbackActions) {
      lines.push(`- ${typeof a === "string" ? a : JSON.stringify(a)}`);
    }
    lines.push("");
  }

  if (Array.isArray(result.affectedRecordIds) && result.affectedRecordIds.length) {
    lines.push("## Affected record IDs", "");
    for (const id of result.affectedRecordIds) lines.push(`- \`${id}\``);
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

module.exports = {
  printReport,
  exitCodeForOverall,
  toMarkdownReport,
};
