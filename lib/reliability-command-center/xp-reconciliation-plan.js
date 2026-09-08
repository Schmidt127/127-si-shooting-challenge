"use strict";

/**
 * Issue #100 — deterministic action planner for XP integrity findings.
 * Pure function only. No Airtable access and no writes.
 *
 * Safety contract:
 * - active blank-Enrollment orphan => permanent delete (standing Mike-approved exception)
 * - Enrollment-owned missing/inactive/moved authoritative source => retire XP row, preserve history,
 *   queue Level Recalc Needed? for the currently linked Enrollment
 * - ambiguous source / unaudited Manual Bonus => REFUSE, manual review
 * - never move/steal XP Events and never write levels directly
 */

const ORPHAN_CODE = "xp_active_orphan_blank_enrollment";
const RETIRE_CODES = new Set([
  "xp_authoritative_source_missing",
  "xp_authoritative_source_inactive",
  "xp_source_enrollment_mismatch",
  "xp_source_key_enrollment_mismatch",
]);
const REFUSE_CODES = new Set([
  "xp_authoritative_source_ambiguous",
  "manual_bonus_missing_audit_ownership",
]);

function planXpReconciliation({ xpRecord, issues = [] } = {}) {
  if (!xpRecord || !xpRecord.id) throw new Error("xpRecord with id required");
  const fields = xpRecord.fields || xpRecord;
  const active = fields["Active?"] === true;
  const enrollmentIds = linkedIds(fields.Enrollment);
  const enrollmentId = enrollmentIds[0] || "";
  const recordIssues = issues.filter((issue) => issue.sourceRecordId === xpRecord.id);
  const codes = new Set(recordIssues.map((issue) => issue.code));

  if (!active) {
    return basePlan(xpRecord, enrollmentId, "NOOP_ALREADY_INACTIVE", codes, []);
  }

  // Standing #100 destructive exception is intentionally narrow and state-based.
  if (!enrollmentId && codes.has(ORPHAN_CODE)) {
    return basePlan(xpRecord, enrollmentId, "DELETE_ORPHAN", codes, [
      {
        type: "DELETE_RECORD",
        table: "XP Events",
        recordId: xpRecord.id,
        reason: "Active?=true and Enrollment blank; standing #100 deletion policy",
      },
    ], { destructive: true, confirmDestructiveRequired: true });
  }

  // Any ambiguous/manual-audit condition fails the whole target closed.
  const refusing = Array.from(codes).filter((code) => REFUSE_CODES.has(code));
  if (refusing.length) {
    return basePlan(xpRecord, enrollmentId, "REFUSE_MANUAL_REVIEW", codes, [], {
      refuseReasons: refusing,
    });
  }

  const retiring = Array.from(codes).filter((code) => RETIRE_CODES.has(code));
  if (enrollmentId && retiring.length) {
    return basePlan(xpRecord, enrollmentId, "RETIRE_AND_RECALC", codes, [
      {
        type: "UPDATE_RECORD",
        table: "XP Events",
        recordId: xpRecord.id,
        fields: { "Active?": false },
        reason: "Authoritative XP source invalid/missing/moved; preserve row and history",
      },
      {
        type: "UPDATE_RECORD",
        table: "Enrollments",
        recordId: enrollmentId,
        fields: { "Level Recalc Needed?": true },
        reason: "Queue Automation 042 after active XP retirement; never write level fields here",
      },
    ], { retireReasons: retiring });
  }

  if (!recordIssues.length) {
    return basePlan(xpRecord, enrollmentId, "NOOP_HEALTHY", codes, []);
  }

  return basePlan(xpRecord, enrollmentId, "REFUSE_UNSUPPORTED_FINDING", codes, [], {
    refuseReasons: Array.from(codes),
  });
}

function planBatch({ xpRecords = [], issues = [] } = {}) {
  const plans = xpRecords.map((xpRecord) => planXpReconciliation({ xpRecord, issues }));
  const refused = plans.filter((p) => p.status.startsWith("REFUSE"));
  return {
    plans,
    targetCount: plans.length,
    deleteCount: plans.filter((p) => p.status === "DELETE_ORPHAN").length,
    retireCount: plans.filter((p) => p.status === "RETIRE_AND_RECALC").length,
    noopCount: plans.filter((p) => p.status.startsWith("NOOP")).length,
    refusedCount: refused.length,
    executeAllowed: refused.length === 0,
    destructiveCount: plans.filter((p) => p.destructive).length,
  };
}

function basePlan(xpRecord, enrollmentId, status, codes, actions, extra = {}) {
  return {
    xpEventId: xpRecord.id,
    enrollmentId,
    sourceKey: String((xpRecord.fields || xpRecord)["Source Key"] || ""),
    status,
    findingCodes: Array.from(codes).sort(),
    actions,
    destructive: false,
    confirmDestructiveRequired: false,
    ...extra,
  };
}

function linkedIds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : item && item.id))
    .filter(Boolean);
}

module.exports = {
  ORPHAN_CODE,
  RETIRE_CODES,
  REFUSE_CODES,
  planXpReconciliation,
  planBatch,
};
