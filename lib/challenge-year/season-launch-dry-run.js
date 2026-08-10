/** Offline-only proposed Week import and launch-decision packet. */
"use strict";

const { normalizeChallengeYearConfig } = require("./contract");
const { generateWeekImportPackage } = require("./week-package");
const { normalizeWeekRow } = require("./week-validator");
const { rangesOverlap } = require("./dates");
const { launchPreflight } = require("./launch-control");
const { toMarkdownReport } = require("./report");

const VALID_LEVEL_POLICIES = new Set(["reset", "carry"]);
const finding = (severity, code, message, requiredAction) => ({ severity, code, message, ...(requiredAction ? { requiredAction } : {}) });

function findWeekConflicts(proposed = [], existing = []) {
  const conflicts = [];
  for (const candidate of proposed) {
    for (const row of existing.map(normalizeWeekRow)) {
      const sameKey = Boolean(candidate.weekKey && row.weekKey && candidate.weekKey === row.weekKey);
      const sameLabel = Boolean(candidate.displayLabel && row.displayLabel && candidate.displayLabel.toLowerCase() === row.displayLabel.toLowerCase());
      const dateOverlap = rangesOverlap(candidate.startDate, candidate.endDate, row.startDate, row.endDate);
      if (sameKey || sameLabel || dateOverlap) conflicts.push({ proposedLabel: candidate.displayLabel, proposedWeekKey: candidate.weekKey, existingRecordId: row.id, existingLabel: row.displayLabel, existingWeekKey: row.weekKey, sameKey, sameLabel, dateOverlap });
    }
  }
  return conflicts;
}

function buildSeasonLaunchDryRun(input = {}) {
  const rawConfig = input.newConfig || input.config || {};
  const normalized = normalizeChallengeYearConfig(rawConfig);
  const levelPolicy = String(input.levelPolicy || "undocumented").trim().toLowerCase();
  const checks = [];
  if (!normalized.ok) return { overall: "FAIL", dryRun: true, writesPerformed: 0, checks: [finding("FAIL", normalized.code, normalized.message, "Correct the proposed Config fixture.")], approvalQuestion: "Provide a valid proposed challenge-year Config before running the dry run.", proposedWeeks: [], expectedRecordCount: 0, duplicateConflictWarnings: [] };

  const config = normalized.config;
  if (!VALID_LEVEL_POLICIES.has(levelPolicy)) checks.push(finding("FAIL", "level_policy_decision_required", "Level policy must be explicitly reset or carry; undocumented is not launch-ready.", "Mike must choose --level-policy reset or --level-policy carry."));
  else checks.push(finding("PASS", "level_policy_explicit", `Level policy selected: ${levelPolicy}.`));

  const weekPackage = generateWeekImportPackage({ config: rawConfig, generate: input.generate, challengeYear: input.challengeYear || config.challengeYearLabel, configRecordId: input.configRecordId || config.configRecordId });
  const proposedWeeks = weekPackage.plan.weeks || [];
  checks.push(weekPackage.ok ? finding("PASS", "week_plan_valid", "Proposed Week plan is deterministic and valid.") : finding("FAIL", "week_plan_invalid", "Proposed Week plan failed validation.", "Correct dates or regular-week count and rerun."));

  const existingWeeks = input.existingWeeks || input.export?.weeks || [];
  const conflicts = findWeekConflicts(proposedWeeks, Array.isArray(existingWeeks) ? existingWeeks : []);
  if (!Array.isArray(existingWeeks) || existingWeeks.length === 0) checks.push(finding("WARNING", "existing_weeks_not_supplied", "No read-only existing-Weeks export supplied; duplicate/conflict prevention cannot be proven before import.", "Export target Config Weeks from Airtable and rerun with existingWeeks."));
  else if (conflicts.length) checks.push(finding("FAIL", "existing_week_conflicts", `${conflicts.length} proposed Week conflict(s) found in the existing export.`, "Resolve duplicate labels, keys, or date overlaps before manual import."));
  else checks.push(finding("PASS", "no_existing_week_conflicts", "No duplicate keys, labels, or date overlaps found in supplied Weeks export."));

  const preflight = launchPreflight({ ...input, newConfig: rawConfig, levelPolicy });
  const first = proposedWeeks[0] || null;
  const last = proposedWeeks.at(-1) || null;
  const weekZero = proposedWeeks.find((week) => week.weekType === "week_0") || null;
  const approvalQuestion = !config.weekZeroStart || !config.regularWeekCount || !VALID_LEVEL_POLICIES.has(levelPolicy)
    ? "Mike must approve the Week 0 Sunday, regular-week count, and level policy (reset or carry) before import or activation."
    : null;
  const blockers = [...checks.filter((entry) => entry.severity === "FAIL"), ...preflight.failedChecks];
  const result = { overall: blockers.length ? "FAIL" : checks.some((entry) => entry.severity === "WARNING") || preflight.overall === "PASS WITH WARNINGS" ? "PASS WITH WARNINGS" : "PASS", dryRun: true, writesPerformed: 0, configRecordId: input.configRecordId || config.configRecordId, challengeYear: config.challengeYearLabel, timezone: config.timezone, timezoneSource: rawConfig.timezone ? "provided in fixture" : "repository default (America/Denver)", levelPolicy, weekZero, proposedWeeks, expectedRecordCount: proposedWeeks.length, firstDate: first?.startDate || null, lastDate: last?.endDate || null, duplicateConflictWarnings: conflicts, checks, activationBlockers: blockers, preflightOverall: preflight.overall, preflight, weekPackage, approvalQuestion };
  result.markdown = [toMarkdownReport("Season Launch Dry Run", result), "## Proposed Week import", "", `- Expected records: **${result.expectedRecordCount}**`, `- First date: **${result.firstDate || "not generated"}**`, `- Last date: **${result.lastDate || "not generated"}**`, `- Week 0: **${weekZero ? `${weekZero.startDate} through ${weekZero.endDate}` : "not generated"}**`, `- Timezone: **${result.timezone}** (${result.timezoneSource})`, `- Level policy: **${result.levelPolicy}**`, "", "## Import boundary", "", "This command creates no Airtable records. Use its CSV only after Mike approval, then manually import through Airtable/OMNI and run export reconciliation.", approvalQuestion ? `\n## Mike approval needed\n\n${approvalQuestion}` : ""].filter(Boolean).join("\n");
  return result;
}

module.exports = { VALID_LEVEL_POLICIES, findWeekConflicts, buildSeasonLaunchDryRun };
