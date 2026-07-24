/**
 * Challenge-Year Configuration, Season Rollover, and Season Launch Control
 *
 * Extends:
 * - lib/config-selection (year-aware Config resolver)
 * - tools/enrollment-season (season dates + weeks seed validator concepts)
 * - lib/was-email-contracts (WAS uniqueness)
 * - lib/reliability-command-center (optional season finding ingest)
 *
 * Pure Node — no live Airtable writes.
 */

"use strict";

const dates = require("./dates");
const weekKeys = require("./week-keys");
const contract = require("./contract");
const resolveConfig = require("./resolve-config");
const weekGenerator = require("./week-generator");
const weekValidator = require("./week-validator");
const activityDate = require("./activity-date");
const enrollmentValidator = require("./enrollment-validator");
const wasValidator = require("./was-validator");
const preflight = require("./preflight");
const manifest = require("./manifest");
const report = require("./report");
const launchState = require("./launch-state");
const exportValidator = require("./export-validator");
const automationAudit = require("./automation-audit");
const weekPackage = require("./week-package");
const launchControl = require("./launch-control");
const seasonFindings = require("./season-findings");

const {
  normalizeSchoolYear,
  resolveConfig: resolveConfigByYear,
} = require("../config-selection");

module.exports = {
  normalizeSchoolYear,
  resolveConfigByYear,

  ...dates,
  ...weekKeys,
  ...contract,

  resolveChallengeYearConfig: resolveConfig.resolveChallengeYearConfig,
  assertSingleCurrentConfig: resolveConfig.assertSingleCurrentConfig,

  generateWeekPlan: weekGenerator.generateWeekPlan,
  generateWeekPlanFromConfig: weekGenerator.generateWeekPlanFromConfig,
  weeksToCsv: weekGenerator.weeksToCsv,
  weeksToMarkdown: weekGenerator.weeksToMarkdown,
  validateWeekPlan: weekValidator.validateWeekPlan,
  normalizeWeekRow: weekValidator.normalizeWeekRow,

  resolveWeekForActivityDate: activityDate.resolveWeekForActivityDate,

  validateEnrollmentsForChallengeYear:
    enrollmentValidator.validateEnrollmentsForChallengeYear,
  validateWeeklyAthleteSummaries: wasValidator.validateWeeklyAthleteSummaries,

  runRolloverPreflight: preflight.runRolloverPreflight,
  generateRolloverManifest: manifest.generateRolloverManifest,

  // Season Launch Control
  LAUNCH_STATES: launchState.LAUNCH_STATES,
  PROPOSED_LAUNCH_FIELDS: launchState.PROPOSED_LAUNCH_FIELDS,
  normalizeLaunchState: launchState.normalizeLaunchState,
  canTransition: launchState.canTransition,
  evaluateTransition: launchState.evaluateTransition,
  createLaunchRecord: launchState.createLaunchRecord,

  validateConfigExport: exportValidator.validateConfigExport,
  validateXpAndAchievementsExport: exportValidator.validateXpAndAchievementsExport,
  validateSeasonExport: exportValidator.validateSeasonExport,

  auditSeasonSensitiveAutomations: automationAudit.auditSeasonSensitiveAutomations,
  detectDisallowedHardcodes: automationAudit.detectDisallowedHardcodes,
  SEASON_SENSITIVE_AUTOMATIONS: automationAudit.SEASON_SENSITIVE_AUTOMATIONS,

  generateWeekImportPackage: weekPackage.generateWeekImportPackage,

  launchStatus: launchControl.launchStatus,
  launchPreflight: launchControl.launchPreflight,
  launchManifest: launchControl.launchManifest,
  activationPreview: launchControl.activationPreview,
  rollbackPreview: launchControl.rollbackPreview,

  buildSeasonReliabilityFindings: seasonFindings.buildSeasonReliabilityFindings,
  SEASON_FINDING_CODES: seasonFindings.SEASON_FINDING_CODES,

  printReport: report.printReport,
  exitCodeForOverall: report.exitCodeForOverall,
  toMarkdownReport: report.toMarkdownReport,
};
