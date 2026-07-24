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

module.exports = {
  printReport,
  exitCodeForOverall,
};
