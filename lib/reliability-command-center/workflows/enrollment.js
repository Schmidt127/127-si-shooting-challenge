"use strict";

const { HEALTH_STATUS, PRIORITY } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const {
  getBooleanish,
  getField,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
} = require("../normalize");
const { findDuplicateGroups, isRecId } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{ enrollments?: object[], currentChallengeYear?: string }} data
 */
function checkEnrollment(data = {}) {
  const rows = data.enrollments || [];
  const currentYear = String(data.currentChallengeYear || "").trim();
  const issues = [];

  for (const row of rows) {
    const id = getRecordId(row);
    const fields = row.fields || row;
    const configId = firstLinkedId(getField(row, "Config") || fields.Config);
    const year = String(
      normalizeBlank(getField(row, "Challenge Year") || fields["Challenge Year"]) || ""
    );
    const grade = normalizeBlank(getField(row, "Grade") || fields.Grade);
    const gradeBand =
      firstLinkedId(getField(row, "Grade Band") || fields["Grade Band"]) ||
      getSelectText(getField(row, "Grade Band") || fields["Grade Band"]);
    const active = getBooleanish(getField(row, "Active?") || fields["Active?"]);
    const parentEmail = normalizeBlank(
      getField(row, "Parent Email") || fields["Parent Email"]
    );
    const athleteEmail = normalizeBlank(
      getField(row, "Athlete Email") || fields["Athlete Email"]
    );
    const athleteId = firstLinkedId(getField(row, "Athlete") || fields.Athlete);
    const processingActive = getBooleanish(
      getField(row, "_receivingActiveWorkflows") || fields._receivingActiveWorkflows
    );
    const statusConflict = getBooleanish(
      getField(row, "_conflictingStatus") || fields._conflictingStatus
    );

    if (!configId) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "enrollment_missing_config",
          recommendedAction: "Link Enrollment to Config before processing workflows.",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
          evidence: ["Config link blank"],
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!year) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "enrollment_missing_challenge_year",
          recommendedAction: "Set Challenge Year (or inherit from Config).",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
          meta: { dataFixRequired: true },
        })
      );
    } else if (currentYear && year !== currentYear && processingActive) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.HISTORICAL,
          priority: PRIORITY.P1,
          code: "historical_enrollment_active_processing",
          recommendedAction:
            "Stop active processing on historical challenge-year enrollment; isolate by year.",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
          evidence: [`year=${year}`, `current=${currentYear}`],
          meta: { historical: true },
        })
      );
    }
    if (!grade && !gradeBand) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "enrollment_missing_grade_band",
          recommendedAction: "Run 002/003 grade-band assignment or set Grade/Grade Band.",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!active && processingActive) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "inactive_enrollment_still_processing",
          recommendedAction:
            "Clear Active? workflow queues or set Active?=true only if intentionally testing (Schmidt).",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
          evidence: ["Active?=false", "receiving active workflow processing"],
        })
      );
    }
    const emailRequired = getBooleanish(
      getField(row, "_emailRequired") || fields._emailRequired
    );
    if (emailRequired && !parentEmail && !athleteEmail) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "enrollment_missing_email",
          recommendedAction: "Add Parent Email or Athlete Email before email workflows.",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (statusConflict) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.NEEDS_MANUAL_REVIEW,
          code: "enrollment_conflicting_status",
          recommendedAction: "Reconcile conflicting Enrollment status fields manually.",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
        })
      );
    }
    if (athleteId && !isRecId(athleteId)) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "enrollment_invalid_athlete_link",
          recommendedAction: "Fix Athlete linked record ID.",
          meta: { dataFixRequired: true },
        })
      );
    }
  }

  // Multiple active enrollments same athlete + challenge year
  const activeRows = rows.filter((r) =>
    getBooleanish(getField(r, "Active?") || (r.fields || r)["Active?"])
  );
  const dups = findDuplicateGroups(activeRows, (r) => {
    const f = r.fields || r;
    const athlete = firstLinkedId(getField(r, "Athlete") || f.Athlete);
    const year = String(normalizeBlank(getField(r, "Challenge Year") || f["Challenge Year"]) || "");
    if (!athlete || !year) return "";
    return `${athlete}|${year}`;
  });
  for (const dup of dups) {
    for (const rid of dup.recordIds) {
      issues.push(
        finalize({
          workflow: WORKFLOWS.ENROLLMENT,
          sourceTable: "Enrollments",
          sourceRecordId: rid,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "multiple_active_enrollments_same_athlete_year",
          recommendedAction:
            "Keep one Active enrollment per athlete+challenge year; deactivate extras.",
          owningAutomation: OWNING_AUTOMATIONS.enrollment,
          evidence: [`key=${dup.key}`, `count=${dup.count}`],
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  return issues;
}

function finalize(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = { checkEnrollment };
