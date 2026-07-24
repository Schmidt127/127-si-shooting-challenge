/**
 * JSON + Markdown report generation for the Reliability Command Center audit runner.
 */

"use strict";

const { countIssues, summarizeIssue } = require("./issue");
const { PRIORITY } = require("./health-status");

/**
 * @param {{
 *   issues?: object[],
 *   generatedAt?: string,
 *   source?: string,
 *   fixturePath?: string,
 *   meta?: object,
 * }} input
 */
function buildReportJson(input = {}) {
  const issues = Array.isArray(input.issues) ? input.issues : [];
  const counts = countIssues(issues);
  const affectedRecordIds = [
    ...new Set(issues.map((i) => i.sourceRecordId).filter(Boolean)),
  ].sort();
  const workflows = [...new Set(issues.map((i) => i.workflow).filter(Boolean))].sort();

  return {
    reportType: "shooting-challenge-reliability-command-center",
    version: "1.0.0",
    generatedAt: input.generatedAt || new Date().toISOString(),
    source: input.source || "fixture",
    fixturePath: input.fixturePath || "",
    summary: counts,
    affectedRecordIds,
    workflows,
    findings: issues,
    meta: input.meta || {},
  };
}

/**
 * @param {object} reportJson
 * @returns {string}
 */
function buildReportMarkdown(reportJson) {
  const s = reportJson.summary || countIssues(reportJson.findings || []);
  const lines = [];
  lines.push("# Reliability Command Center — Audit Report");
  lines.push("");
  lines.push(`Generated: ${reportJson.generatedAt || ""}`);
  if (reportJson.fixturePath) lines.push(`Source: \`${reportJson.fixturePath}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total findings | ${s.total} |`);
  lines.push(`| P0 | ${s.byPriority?.P0 || 0} |`);
  lines.push(`| P1 | ${s.byPriority?.P1 || 0} |`);
  lines.push(`| P2 | ${s.byPriority?.P2 || 0} |`);
  lines.push(`| P3 | ${s.byPriority?.P3 || 0} |`);
  lines.push("");

  if (s.byWorkflow && Object.keys(s.byWorkflow).length) {
    lines.push("## By workflow");
    lines.push("");
    for (const [wf, n] of Object.entries(s.byWorkflow).sort((a, b) => b[1] - a[1])) {
      lines.push(`- **${wf}**: ${n}`);
    }
    lines.push("");
  }

  const findings = reportJson.findings || [];
  for (const pri of [PRIORITY.P0, PRIORITY.P1, PRIORITY.P2, PRIORITY.P3]) {
    const bucket = findings.filter((f) => f.priority === pri);
    if (!bucket.length) continue;
    lines.push(`## ${pri} findings`);
    lines.push("");
    for (const issue of bucket) {
      lines.push(`### ${issue.code || issue.id}`);
      lines.push("");
      lines.push(`- ${summarizeIssue(issue)}`);
      lines.push(`- Health: ${issue.healthStatus}`);
      lines.push(`- Retry: ${issue.retryEligibility}`);
      lines.push(`- Action: ${issue.recommendedAction}`);
      if (issue.owningAutomation) {
        lines.push(`- Owning automation: ${issue.owningAutomation}`);
      }
      if (issue.evidence?.length) {
        lines.push(`- Evidence: ${issue.evidence.join("; ")}`);
      }
      lines.push("");
    }
  }

  if (!findings.length) {
    lines.push("## Findings");
    lines.push("");
    lines.push("No issues detected.");
    lines.push("");
  }

  lines.push("## Affected record IDs");
  lines.push("");
  const ids = reportJson.affectedRecordIds || [];
  if (!ids.length) lines.push("_None_");
  else for (const id of ids) lines.push(`- \`${id}\``);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_Repository audit only. Does not modify Airtable. Interface installation is separate._"
  );
  lines.push("");
  return lines.join("\n");
}

module.exports = {
  buildReportJson,
  buildReportMarkdown,
};
