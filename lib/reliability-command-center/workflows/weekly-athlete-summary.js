"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const { assessStaleProcessing, DEFAULT_THRESHOLDS_HOURS } = require("../stale");
const {
  getBooleanish,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
  getNumber,
} = require("../normalize");
const { findDuplicateGroups } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{
 *   weeklyAthleteSummaries?: object[],
 *   enrollments?: object[],
 *   currentChallengeYear?: string,
 *   nowMs?: number,
 * }} data
 */
function checkWeeklyAthleteSummary(data = {}) {
  const rows = data.weeklyAthleteSummaries || [];
  const enrollmentsById = indexById(data.enrollments || []);
  const currentYear = String(data.currentChallengeYear || "").trim();
  const issues = [];

  for (const dup of findDuplicateGroups(rows, (r) => {
    const f = r.fields || r;
    const e = firstLinkedId(f.Enrollment);
    const w = firstLinkedId(f.Week);
    if (!e || !w) return "";
    return `${e}|${w}`;
  })) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.WEEKLY_ATHLETE_SUMMARY,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: rid,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "duplicate_was_enrollment_week",
          recommendedAction:
            "Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.",
          owningAutomation: OWNING_AUTOMATIONS.wasEnsure,
          evidence: [`key=${dup.key}`, `count=${dup.count}`],
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  for (const row of rows) {
    const id = getRecordId(row);
    const f = row.fields || row;
    const enrollmentId = firstLinkedId(f.Enrollment);
    const weekId = firstLinkedId(f.Week);
    const buildNow = getBooleanish(f["Build Weekly Email Now?"]);
    const buildAt = f["Weekly Email Last Built At"] || f._buildArmedAt;
    const calcStatus = getSelectText(f["Calculation Status"] || f._calcStatus);
    const emailReady = getBooleanish(f["Weekly Email Ready?"]);

    if (!enrollmentId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.WEEKLY_ATHLETE_SUMMARY,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          weekRecordId: weekId,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "was_missing_enrollment",
          recommendedAction: "Link Enrollment on WAS before email/XP rollups.",
          owningAutomation: OWNING_AUTOMATIONS.wasEnsure,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!weekId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.WEEKLY_ATHLETE_SUMMARY,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "was_missing_week",
          recommendedAction: "Link Week on WAS (031/118 ensure path).",
          owningAutomation: OWNING_AUTOMATIONS.wasEnsure,
          meta: { dataFixRequired: true },
        })
      );
    }

    if (enrollmentId && currentYear && enrollmentsById[enrollmentId]) {
      const enr = enrollmentsById[enrollmentId].fields || enrollmentsById[enrollmentId];
      const year = String(normalizeBlank(enr["Challenge Year"]) || "");
      const configYear = String(normalizeBlank(f["Config Year"] || f._configYear) || "");
      if (configYear && year && configYear !== year) {
        issues.push(
          fin({
            workflow: WORKFLOWS.WEEKLY_ATHLETE_SUMMARY,
            sourceTable: "Weekly Athlete Summary",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            weekRecordId: weekId,
            healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
            code: "was_wrong_config_year",
            recommendedAction: "Relink WAS/Config to enrollment challenge year.",
            evidence: [`configYear=${configYear}`, `enrollmentYear=${year}`],
            meta: { dataFixRequired: true },
          })
        );
      }
      if (year && currentYear && year !== currentYear && (buildNow || emailReady)) {
        issues.push(
          fin({
            workflow: WORKFLOWS.WEEKLY_ATHLETE_SUMMARY,
            sourceTable: "Weekly Athlete Summary",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            healthStatus: HEALTH_STATUS.HISTORICAL,
            code: "historical_was_processed_as_current",
            recommendedAction: "Clear build/send arms on historical-year WAS.",
            owningAutomation: OWNING_AUTOMATIONS.weeklyEmailBuild,
            meta: { historical: true },
          })
        );
      }
    }

    if (buildNow) {
      const stale = assessStaleProcessing({
        isProcessing: true,
        lastAttemptedAt: buildAt,
        thresholdHours: DEFAULT_THRESHOLDS_HOURS.buildFlag,
        nowMs: data.nowMs,
      });
      if (stale.stale) {
        issues.push(
          fin({
            workflow: WORKFLOWS.WEEKLY_EMAIL_BUILD,
            sourceTable: "Weekly Athlete Summary",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            weekRecordId: weekId,
            healthStatus: HEALTH_STATUS.STALE,
            code: "was_build_flag_stuck",
            recommendedAction: "Re-run 072 or clear Build Weekly Email Now? after diagnosing error.",
            owningAutomation: OWNING_AUTOMATIONS.weeklyEmailBuild,
            lastAttemptedAt: String(buildAt || ""),
          })
        );
      }
    }

    if (/processing|pending|stuck/i.test(calcStatus)) {
      const stale = assessStaleProcessing({
        isProcessing: true,
        lastAttemptedAt: f._calcUpdatedAt || buildAt,
        thresholdHours: DEFAULT_THRESHOLDS_HOURS.processing,
        nowMs: data.nowMs,
      });
      if (stale.stale || /stuck/i.test(calcStatus)) {
        issues.push(
          fin({
            workflow: WORKFLOWS.WEEKLY_ATHLETE_SUMMARY,
            sourceTable: "Weekly Athlete Summary",
            sourceRecordId: id,
            healthStatus: HEALTH_STATUS.STALE,
            code: "was_calculation_status_stuck",
            recommendedAction: "Inspect WAS calculation chain; clear stuck Calculation Status.",
            evidence: [`status=${calcStatus}`],
          })
        );
      }
    }

    if (getBooleanish(f._expectTotals) && getNumber(f["Weekly XP"]) == null) {
      issues.push(
        fin({
          workflow: WORKFLOWS.WEEKLY_ATHLETE_SUMMARY,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "was_missing_expected_totals",
          recommendedAction: "Ensure rollups/formulas populated; do not overwrite computed totals from scripts.",
          meta: { dataFixRequired: true },
        })
      );
    }

    if (emailReady) {
      const subject = normalizeBlank(f["Weekly Email Subject"]);
      const recipients = normalizeBlank(f["Weekly Email Recipients"]);
      const html = normalizeBlank(f["Weekly Email HTML"]);
      if (!subject || !recipients || !html) {
        issues.push(
          fin({
            workflow: WORKFLOWS.WEEKLY_EMAIL_BUILD,
            sourceTable: "Weekly Athlete Summary",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            weekRecordId: weekId,
            healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
            code: "email_ready_missing_required_fields",
            recommendedAction: "Rebuild package with 072 or clear Ready? until fields present.",
            owningAutomation: OWNING_AUTOMATIONS.weeklyEmailBuild,
            meta: { dataFixRequired: true },
          })
        );
      }
    }
  }

  return issues;
}

function indexById(rows) {
  const map = {};
  for (const r of rows) {
    const id = getRecordId(r);
    if (id) map[id] = r;
  }
  return map;
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = { checkWeeklyAthleteSummary };
