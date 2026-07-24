"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const {
  getBooleanish,
  getField,
  getRecordId,
  getSelectText,
  getNumber,
  firstLinkedId,
  normalizeBlank,
} = require("../normalize");
const { findDuplicateGroups, validateSourceKey, validateDedupeKey } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{
 *   xpEvents?: object[],
 *   submissions?: object[],
 *   enrollments?: object[],
 *   currentChallengeYear?: string,
 * }} data
 */
function checkXpEvents(data = {}) {
  const xpEvents = data.xpEvents || [];
  const submissions = data.submissions || [];
  const enrollmentsById = indexById(data.enrollments || []);
  const currentYear = String(data.currentChallengeYear || "").trim();
  const issues = [];

  const xpBySourceKey = new Map();
  for (const xp of xpEvents) {
    const f = xp.fields || xp;
    const id = getRecordId(xp);
    const enrollmentId = firstLinkedId(getField(xp, "Enrollment") || f.Enrollment);
    const xpSource = getSelectText(getField(xp, "XP Source") || f["XP Source"]);
    const points = getNumber(getField(xp, "XP Points") || f["XP Points"] || f.Points);
    const sourceKey = normalizeBlank(getField(xp, "Source Key") || f["Source Key"]);
    const dedupeKey = normalizeBlank(
      getField(xp, "XP Dedupe Key") || f["XP Dedupe Key"] || f["XP Dedupe Key Normalized"]
    );
    const sourceRecordId =
      firstLinkedId(getField(xp, "Submission") || f.Submission) ||
      firstLinkedId(getField(xp, "Homework Completion") || f["Homework Completion"]) ||
      firstLinkedId(getField(xp, "Athlete Achievement Unlock") || f["Athlete Achievement Unlock"]) ||
      firstLinkedId(getField(xp, "Zoom Attendance") || f["Zoom Attendance"]) ||
      normalizeBlank(f._sourceRecordId);

    if (!enrollmentId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "XP Events",
          sourceRecordId: id,
          sourceKey,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "xp_missing_enrollment",
          recommendedAction: "Link XP Event to Enrollment; do not award orphan XP.",
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!xpSource) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "XP Events",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          sourceKey,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "xp_missing_source",
          recommendedAction: "Set XP Source (Submission Base, Homework, Zoom, etc.).",
          meta: { dataFixRequired: true },
        })
      );
    }
    if (points == null || points <= 0) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "XP Events",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          sourceKey,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "xp_missing_amount",
          recommendedAction: "Set XP Points from XP Reward Rules; deactivate if invalid.",
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!sourceRecordId && !sourceKey) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "XP Events",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "xp_missing_source_record",
          recommendedAction: "Link source record or set Source Key for idempotency.",
          meta: { dataFixRequired: true },
        })
      );
    }

    const sk = validateSourceKey(sourceKey, { minParts: 2 });
    if (sourceKey && !sk.ok) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "XP Events",
          sourceRecordId: id,
          sourceKey,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "xp_invalid_source_key",
          recommendedAction: `Repair Source Key (${sk.reason}).`,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (dedupeKey) {
      const dk = validateDedupeKey(dedupeKey);
      if (!dk.ok) {
        issues.push(
          fin({
            workflow: WORKFLOWS.SUBMISSION_BASE_XP,
            sourceTable: "XP Events",
            sourceRecordId: id,
            dedupeKey,
            healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
            code: "xp_invalid_dedupe_key",
            recommendedAction: "Repair XP Dedupe Key.",
            meta: { dataFixRequired: true },
          })
        );
      }
    }

    if (enrollmentId && currentYear && enrollmentsById[enrollmentId]) {
      const enr = enrollmentsById[enrollmentId];
      const ef = enr.fields || enr;
      const year = String(normalizeBlank(ef["Challenge Year"]) || "");
      if (year && year !== currentYear && getBooleanish(ef["Active?"])) {
        issues.push(
          fin({
            workflow: WORKFLOWS.SUBMISSION_BASE_XP,
            sourceTable: "XP Events",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            sourceKey,
            healthStatus: HEALTH_STATUS.HISTORICAL,
            code: "xp_historical_enrollment_year_mismatch",
            recommendedAction:
              "Do not process historical-year XP against current season pipelines.",
            evidence: [`enrollmentYear=${year}`, `current=${currentYear}`],
            meta: { historical: true },
          })
        );
      }
    }

    if (sourceKey) {
      if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
      xpBySourceKey.get(sourceKey).push(xp);
    }
  }

  for (const [key, group] of xpBySourceKey.entries()) {
    if (group.length > 1) {
      for (const xp of group) {
        issues.push(
          fin({
            workflow: WORKFLOWS.SUBMISSION_BASE_XP,
            sourceTable: "XP Events",
            sourceRecordId: getRecordId(xp),
            sourceKey: key,
            healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
            code: "xp_duplicate_source_key",
            recommendedAction:
              "Keep one Active XP Event per Source Key; deactivate extras (never double-award).",
            owningAutomation: OWNING_AUTOMATIONS.submissionXp,
            evidence: [`count=${group.length}`],
            meta: { duplicateRisk: true },
          })
        );
      }
    }
  }

  const dedupeDups = findDuplicateGroups(xpEvents, (r) => {
    const f = r.fields || r;
    return String(
      normalizeBlank(
        getField(r, "XP Dedupe Key") || f["XP Dedupe Key"] || f["XP Dedupe Key Normalized"]
      ) || ""
    );
  });
  for (const dup of dedupeDups) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "XP Events",
          sourceRecordId: rid,
          dedupeKey: dup.key,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "xp_duplicate_dedupe_key",
          recommendedAction: "Resolve duplicate XP Dedupe Key; keep single Active event.",
          evidence: [`count=${dup.count}`],
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  // Source marked completed but no XP Event
  for (const sub of submissions) {
    const sf = sub.fields || sub;
    const subId = getRecordId(sub);
    const status = getSelectText(sf["XP Award Status"]);
    const completed = /awarded|processed|complete/i.test(status) || getBooleanish(sf._xpCompleted);
    if (!completed) continue;
    const hasXp = xpEvents.some((xp) => {
      const f = xp.fields || xp;
      return firstLinkedId(f.Submission) === subId;
    });
    if (!hasXp) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "Submissions",
          sourceRecordId: subId,
          healthStatus: HEALTH_STATUS.RETRYABLE_ERROR,
          code: "source_completed_without_xp_event",
          recommendedAction:
            "Safe retry of 010 only after confirming Source Key does not already exist.",
          owningAutomation: OWNING_AUTOMATIONS.submissionXp,
        })
      );
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

module.exports = { checkXpEvents };
