/**
 * Challenge-Year Configuration and Season Rollover Engine
 *
 * Extends:
 * - lib/config-selection (year-aware Config resolver)
 * - tools/enrollment-season (season dates + weeks seed validator concepts)
 * - lib/was-email-contracts (WAS uniqueness)
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

const {
  normalizeSchoolYear,
  resolveConfig: resolveConfigByYear,
} = require("../config-selection");

module.exports = {
  // re-exports from existing authoritative year resolver
  normalizeSchoolYear,
  resolveConfigByYear,

  // dates
  ...dates,

  // week keys
  ...weekKeys,

  // contract
  ...contract,

  // resolver
  resolveChallengeYearConfig: resolveConfig.resolveChallengeYearConfig,
  assertSingleCurrentConfig: resolveConfig.assertSingleCurrentConfig,

  // weeks
  generateWeekPlan: weekGenerator.generateWeekPlan,
  generateWeekPlanFromConfig: weekGenerator.generateWeekPlanFromConfig,
  weeksToCsv: weekGenerator.weeksToCsv,
  weeksToMarkdown: weekGenerator.weeksToMarkdown,
  validateWeekPlan: weekValidator.validateWeekPlan,
  normalizeWeekRow: weekValidator.normalizeWeekRow,

  // activity date
  resolveWeekForActivityDate: activityDate.resolveWeekForActivityDate,

  // enrollment / WAS
  validateEnrollmentsForChallengeYear:
    enrollmentValidator.validateEnrollmentsForChallengeYear,
  validateWeeklyAthleteSummaries: wasValidator.validateWeeklyAthleteSummaries,

  // rollover
  runRolloverPreflight: preflight.runRolloverPreflight,
  generateRolloverManifest: manifest.generateRolloverManifest,

  // report helpers
  printReport: report.printReport,
  exitCodeForOverall: report.exitCodeForOverall,
};
