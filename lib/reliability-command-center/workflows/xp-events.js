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
 * Direct-record XP source authority contracts.
 *
 * These are deliberately limited to families whose canonical Source Key contains the
 * authoritative source record RID. More complex families (Zoom pair keys, streaks,
 * milestone/perfect-week unlocks, weekly thresholds, manual bonuses) are reconciled by
 * their domain-specific ownership rules and must not be guessed here.
 */
const DIRECT_SOURCE_AUTHORITIES = Object.freeze([
  {
    family: "submission",
    prefixes: ["SUBMISSION_XP", "SUBMISSION_BASE"],
    xpSources: ["Submission Base"],
    dataKey: "submissions",
    linkFields: ["Submission"],
    sourceTable: "Submissions",
  },
  {
    family: "homework",
    prefixes: ["HOMEWORK_XP"],
    xpSources: ["Homework Completion"],
    dataKey: "homeworkCompletions",
    linkFields: ["Homework Completion"],
    sourceTable: "Homework Completions",
  },
  {
    family: "video",
    prefixes: ["VIDEO_SUBMISSION"],
    xpSources: ["Video Feedback", "Video Submission"],
    dataKey: "videoFeedback",
    linkFields: ["Video Feedback"],
    sourceTable: "Video Feedback",
  },
]);

/**
 * @param {{
 *   xpEvents?: object[],
 *   submissions?: object[],
 *   enrollments?: object[],
 *   homeworkCompletions?: object[],
 *   videoFeedback?: object[],
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
    const activeRaw = getField(xp, "Active?") ?? f["Active?"];
    const explicitlyActive = isExplicitTrue(activeRaw);
    const explicitlyInactive = isExplicitFalse(activeRaw);
    const sourceRecordId =
      firstLinkedId(getField(xp, "Submission") || f.Submission) ||
      firstLinkedId(getField(xp, "Homework Completion") || f["Homework Completion"]) ||
      firstLinkedId(getField(xp, "Video Feedback") || f["Video Feedback"]) ||
      firstLinkedId(getField(xp, "Achievement Unlock") || f["Achievement Unlock"]) ||
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
          healthStatus: explicitlyActive
            ? HEALTH_STATUS.BLOCKING_ERROR
            : HEALTH_STATUS.MISSING_DEPENDENCY,
          code: explicitlyActive ? "xp_active_orphan_blank_enrollment" : "xp_missing_enrollment",
          recommendedAction: explicitlyActive
            ? "Approved orphan policy: permanently delete only this Active?=true + blank-Enrollment XP Event after a fresh exact re-query; never bulk-delete Enrollment-linked XP."
            : "Review historical/inactive XP ownership. Do not infer or relink Enrollment from stale text alone.",
          meta: {
            dataFixRequired: true,
            orphanDeleteEligible: explicitlyActive,
            permanentDeleteException: explicitlyActive ? "active_blank_enrollment_only" : "",
          },
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

    // Issue #100 recurrence prevention: validate direct authoritative source existence
    // and source->Enrollment ownership. This checker never writes XP or progression.
    // It only classifies the repair/retirement action for the owning workflow/operator.
    if (!explicitlyInactive && enrollmentId) {
      const authority = resolveDirectSourceAuthority({ xpSource, sourceKey });
      if (authority) {
        const authorityRows = data[authority.dataKey] || [];
        const authorityById = indexById(authorityRows);
        const linkedAuthorityId = firstLinkedFromFields(xp, authority.linkFields);
        const keyAuthorityId = extractDirectSourceId(sourceKey, authority.prefixes);
        const authoritativeId = linkedAuthorityId || keyAuthorityId;
        const authoritativeRecord = authoritativeId ? authorityById[authoritativeId] : null;

        if (authoritativeId && !authoritativeRecord) {
          issues.push(
            fin({
              workflow: WORKFLOWS.SUBMISSION_BASE_XP,
              sourceTable: "XP Events",
              sourceRecordId: id,
              enrollmentRecordId: enrollmentId,
              sourceKey,
              healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
              code: "xp_authoritative_source_missing",
              recommendedAction:
                "Retire this Enrollment-owned XP Event (Active?=false), preserve points/history, record the reason, and request Enrollment progression recalculation. Do not recreate a missing source or steal another event.",
              evidence: [
                `authority=${authority.sourceTable}`,
                `authorityRecordId=${authoritativeId}`,
              ],
              meta: {
                dataFixRequired: true,
                sourceAuthorityFamily: authority.family,
                reconciliationAction: "retire_and_request_level_recalc",
              },
            })
          );
        } else if (authoritativeRecord) {
          const sourceEnrollmentId = firstLinkedId(
            getField(authoritativeRecord, "Enrollment") ||
              (authoritativeRecord.fields || authoritativeRecord).Enrollment
          );
          if (sourceEnrollmentId && sourceEnrollmentId !== enrollmentId) {
            issues.push(
              fin({
                workflow: WORKFLOWS.SUBMISSION_BASE_XP,
                sourceTable: "XP Events",
                sourceRecordId: id,
                enrollmentRecordId: enrollmentId,
                sourceKey,
                healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
                code: "xp_source_enrollment_mismatch",
                recommendedAction:
                  "Do not move/steal the XP Event automatically. Reconcile against the authoritative source owner: retire or repair deterministically, then request progression recalculation for affected Enrollment(s).",
                evidence: [
                  `authority=${authority.sourceTable}`,
                  `authorityRecordId=${authoritativeId}`,
                  `xpEnrollment=${enrollmentId}`,
                  `sourceEnrollment=${sourceEnrollmentId}`,
                ],
                meta: {
                  dataFixRequired: true,
                  sourceAuthorityFamily: authority.family,
                  sourceEnrollmentId,
                  reconciliationAction: "ownership_conflict_manual_or_domain_repair",
                },
              })
            );
          }

          const sourceActiveRaw =
            getField(authoritativeRecord, "Active?") ??
            (authoritativeRecord.fields || authoritativeRecord)["Active?"];
          if (isExplicitFalse(sourceActiveRaw)) {
            issues.push(
              fin({
                workflow: WORKFLOWS.SUBMISSION_BASE_XP,
                sourceTable: "XP Events",
                sourceRecordId: id,
                enrollmentRecordId: enrollmentId,
                sourceKey,
                healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
                code: "xp_authoritative_source_inactive",
                recommendedAction:
                  "Retire the active XP Event (Active?=false), preserve points/history, and request Enrollment progression recalculation. Reactivation must require the authoritative source to become valid again.",
                evidence: [
                  `authority=${authority.sourceTable}`,
                  `authorityRecordId=${authoritativeId}`,
                ],
                meta: {
                  dataFixRequired: true,
                  sourceAuthorityFamily: authority.family,
                  reconciliationAction: "retire_and_request_level_recalc",
                },
              })
            );
          }
        }
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

function resolveDirectSourceAuthority({ xpSource, sourceKey }) {
  const prefix = String(sourceKey || "").split("|")[0].trim();
  const source = String(xpSource || "").trim().toLowerCase();
  return (
    DIRECT_SOURCE_AUTHORITIES.find(
      (authority) =>
        authority.prefixes.includes(prefix) ||
        authority.xpSources.some((name) => name.toLowerCase() === source)
    ) || null
  );
}

function extractDirectSourceId(sourceKey, allowedPrefixes) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length < 2 || !allowedPrefixes.includes(parts[0])) return "";
  const candidate = String(parts[1] || "").trim();
  return /^rec[A-Za-z0-9]{14}$/.test(candidate) ? candidate : "";
}

function firstLinkedFromFields(record, fieldNames) {
  const f = record.fields || record;
  for (const fieldName of fieldNames) {
    const id = firstLinkedId(getField(record, fieldName) || f[fieldName]);
    if (id) return id;
  }
  return "";
}

function isExplicitTrue(value) {
  if (value === true || value === 1) return true;
  const text = String(value == null ? "" : value).trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function isExplicitFalse(value) {
  if (value === false || value === 0) return true;
  const text = String(value == null ? "" : value).trim().toLowerCase();
  return text === "false" || text === "0" || text === "no";
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

module.exports = {
  DIRECT_SOURCE_AUTHORITIES,
  checkXpEvents,
  resolveDirectSourceAuthority,
  extractDirectSourceId,
};
