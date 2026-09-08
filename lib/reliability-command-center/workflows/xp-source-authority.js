"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const {
  getField,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
} = require("../normalize");
const { WORKFLOWS } = require("../field-maps");

/**
 * Issue #100 — complex XP source authority reconciliation.
 *
 * Read-only by design. This checker never awards XP, edits sources, writes levels,
 * or mutates Airtable. It classifies deterministic retirement/repair actions only.
 * 042 remains the sole progression writer.
 */
function checkXpSourceAuthority(data = {}) {
  const issues = [];
  const xpEvents = data.xpEvents || [];
  const meetingsById = indexById(data.zoomMeetings || []);
  const streaks = data.streakOccurrences || [];
  const unlocks = data.achievementUnlocks || [];
  const summaries = data.weeklyAthleteSummaries || [];
  const zoomAttendance = data.zoomAttendance || [];

  for (const xp of xpEvents) {
    const fields = xp.fields || xp;
    if (isExplicitFalse(getField(xp, "Active?") ?? fields["Active?"])) continue;

    const xpId = getRecordId(xp);
    const enrollmentId = firstLinkedId(getField(xp, "Enrollment") || fields.Enrollment);
    const sourceKey = String(normalizeBlank(getField(xp, "Source Key") || fields["Source Key"]) || "");
    const xpSource = String(getSelectText(getField(xp, "XP Source") || fields["XP Source"]) || "");
    if (!enrollmentId || !sourceKey) {
      // Blank-enrollment handling belongs to xp-events.js; blank-key handling is generic there.
      continue;
    }

    const parts = sourceKey.split("|");
    const prefix = parts[0];

    if (prefix === "ZOOM_ATTEND_BASE") {
      const meetingId = parts[1] || "";
      const keyEnrollmentId = parts[2] || "";
      if (!sameOwner(keyEnrollmentId, enrollmentId)) {
        issues.push(ownerMismatch(xpId, enrollmentId, sourceKey, keyEnrollmentId, "Zoom live attendance"));
        continue;
      }
      const meeting = meetingId ? meetingsById[meetingId] : null;
      if (!meeting) {
        issues.push(missingAuthority(xpId, enrollmentId, sourceKey, "Zoom Meetings", meetingId));
        continue;
      }
      const attendees = linkedIds(meeting, "Attendees");
      if (attendees.length && !attendees.includes(enrollmentId)) {
        issues.push(ownershipConflict(
          xpId,
          enrollmentId,
          sourceKey,
          "Zoom Meetings",
          meetingId,
          `meetingAttendees=${attendees.join(",")}`
        ));
      }
      continue;
    }

    if (prefix === "ZOOM_RECORDING_CREDIT") {
      const keyEnrollmentId = parts[1] || "";
      const meetingId = parts[2] || "";
      if (!sameOwner(keyEnrollmentId, enrollmentId)) {
        issues.push(ownerMismatch(xpId, enrollmentId, sourceKey, keyEnrollmentId, "Zoom recording credit"));
        continue;
      }
      if (!meetingId || !meetingsById[meetingId]) {
        issues.push(missingAuthority(xpId, enrollmentId, sourceKey, "Zoom Meetings", meetingId));
        continue;
      }
      if (zoomAttendance.length) {
        const evidence = zoomAttendance.filter((row) => {
          const method = String(getSelectText(getField(row, "Attendance Method") || (row.fields || row)["Attendance Method"]) || "");
          const rowEnrollment = firstLinkedId(getField(row, "Enrollment") || (row.fields || row).Enrollment);
          const rowMeeting = firstLinkedId(getField(row, "Zoom Meeting") || (row.fields || row)["Zoom Meeting"]);
          return rowEnrollment === enrollmentId && rowMeeting === meetingId && /recording quiz/i.test(method);
        });
        if (evidence.length !== 1) {
          issues.push(authorityCardinality(
            xpId,
            enrollmentId,
            sourceKey,
            "Zoom Attendance recording evidence",
            evidence.length,
            "Require exactly one recording-quiz attendance source before active recording XP remains supported."
          ));
        } else {
          const ef = evidence[0].fields || evidence[0];
          const satisfactory = getField(evidence[0], "Recording Quiz Satisfactory?") ?? ef["Recording Quiz Satisfactory?"];
          if (isExplicitFalse(satisfactory)) {
            issues.push(inactiveAuthority(xpId, enrollmentId, sourceKey, "Zoom Attendance", getRecordId(evidence[0])));
          }
        }
      }
      continue;
    }

    if (prefix === "ZOOM_ATTEND_BONUS_2" || prefix === "ZOOM_ATTEND_BONUS_3") {
      const keyEnrollmentId = parts[1] || "";
      if (!sameOwner(keyEnrollmentId, enrollmentId)) {
        issues.push(ownerMismatch(xpId, enrollmentId, sourceKey, keyEnrollmentId, "Zoom cumulative attendance bonus"));
      }
      continue;
    }

    if (prefix === "STREAK_XP") {
      const keyEnrollmentId = parts[1] || "";
      if (!sameOwner(keyEnrollmentId, enrollmentId)) {
        issues.push(ownerMismatch(xpId, enrollmentId, sourceKey, keyEnrollmentId, "Streak Occurrence"));
        continue;
      }
      if (streaks.length) {
        const matches = streaks.filter((row) => expectedStreakKey(row) === sourceKey);
        if (matches.length !== 1) {
          issues.push(authorityCardinality(
            xpId,
            enrollmentId,
            sourceKey,
            "Streak Occurrences",
            matches.length,
            "Require exactly one canonical Streak Occurrence for active streak XP."
          ));
        } else {
          validateSourceRecordState(issues, xpId, enrollmentId, sourceKey, matches[0], "Streak Occurrences");
        }
      }
      continue;
    }

    if (prefix === "SHOT_MILESTONE" || prefix === "PERFECT_WEEK") {
      const keyEnrollmentId = parts[1] || "";
      if (!sameOwner(keyEnrollmentId, enrollmentId)) {
        issues.push(ownerMismatch(xpId, enrollmentId, sourceKey, keyEnrollmentId, "Athlete Achievement Unlock"));
        continue;
      }
      if (unlocks.length) {
        const matches = unlocks.filter((row) => expectedUnlockKey(row) === sourceKey);
        if (matches.length !== 1) {
          issues.push(authorityCardinality(
            xpId,
            enrollmentId,
            sourceKey,
            "Athlete Achievement Unlocks",
            matches.length,
            "Require exactly one canonical Achievement Unlock for active milestone/Perfect Week XP."
          ));
        } else {
          validateSourceRecordState(issues, xpId, enrollmentId, sourceKey, matches[0], "Athlete Achievement Unlocks");
        }
      }
      continue;
    }

    if (prefix === "WEEKLY_THRESHOLD") {
      const keyEnrollmentId = parts[1] || "";
      const weekId = parts[2] || "";
      if (!sameOwner(keyEnrollmentId, enrollmentId)) {
        issues.push(ownerMismatch(xpId, enrollmentId, sourceKey, keyEnrollmentId, "Weekly Athlete Summary"));
        continue;
      }
      if (summaries.length) {
        const matches = summaries.filter((row) => {
          const rowEnrollment = firstLinkedId(getField(row, "Enrollment") || (row.fields || row).Enrollment);
          const rowWeek = firstLinkedId(getField(row, "Week") || (row.fields || row).Week);
          return rowEnrollment === enrollmentId && rowWeek === weekId;
        });
        if (matches.length !== 1) {
          issues.push(authorityCardinality(
            xpId,
            enrollmentId,
            sourceKey,
            "Weekly Athlete Summary",
            matches.length,
            "Require exactly one canonical Enrollment+Week summary before active Weekly Threshold XP remains supported."
          ));
        }
      }
      continue;
    }

    if (prefix === "MANUAL_BONUS" || /manual bonus/i.test(xpSource)) {
      const awardedBy = String(normalizeBlank(getField(xp, "Awarded By") || fields["Awarded By"] || fields._manualAuditOwner) || "");
      const reason = String(normalizeBlank(getField(xp, "XP Reason Public") || fields["XP Reason Public"] || fields["Reason"] || fields._manualAuditReason) || "");
      if (prefix !== "MANUAL_BONUS" || !awardedBy || !reason) {
        issues.push(fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "XP Events",
          sourceRecordId: xpId,
          enrollmentRecordId: enrollmentId,
          sourceKey,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "manual_bonus_missing_audit_ownership",
          recommendedAction:
            "Manual Bonus is an operator-documented exception. Preserve only when Source Key uses MANUAL_BONUS| and explicit operator/audit owner plus reason are present; otherwise manual review is required. Do not invent a scripted Manual Bonus writer.",
          evidence: [
            `sourceKeyPrefix=${prefix || "blank"}`,
            `awardedBy=${awardedBy ? "present" : "blank"}`,
            `reason=${reason ? "present" : "blank"}`,
          ],
          meta: {
            dataFixRequired: true,
            sourceAuthorityFamily: "manual_bonus",
            reconciliationAction: "manual_review_only",
          },
        }));
      }
    }
  }

  return issues;
}

function validateSourceRecordState(issues, xpId, enrollmentId, sourceKey, source, tableName) {
  const fields = source.fields || source;
  const sourceEnrollmentId = firstLinkedId(getField(source, "Enrollment") || fields.Enrollment);
  if (sourceEnrollmentId && sourceEnrollmentId !== enrollmentId) {
    issues.push(ownershipConflict(
      xpId,
      enrollmentId,
      sourceKey,
      tableName,
      getRecordId(source),
      `sourceEnrollment=${sourceEnrollmentId}`
    ));
    return;
  }
  const activeRaw = getField(source, "Active?") ?? fields["Active?"];
  const sourceStatus = String(getSelectText(getField(source, "Source Status") || fields["Source Status"]) || "");
  const awardStatus = String(getSelectText(getField(source, "XP Award Status") || fields["XP Award Status"]) || "");
  if (isExplicitFalse(activeRaw) || /retired|inactive|withdrawn|void/i.test(sourceStatus) || /withdrawn|retired|inactive|void/i.test(awardStatus)) {
    issues.push(inactiveAuthority(xpId, enrollmentId, sourceKey, tableName, getRecordId(source)));
  }
}

function expectedStreakKey(row) {
  const fields = row.fields || row;
  const enrollmentId = firstLinkedId(getField(row, "Enrollment") || fields.Enrollment);
  const achievementId = firstLinkedId(getField(row, "Achievement") || fields.Achievement);
  const endDate = dateKey(getField(row, "Streak End Date") || fields["Streak End Date"]);
  return enrollmentId && achievementId && endDate ? `STREAK_XP|${enrollmentId}|${achievementId}|${endDate}` : "";
}

function expectedUnlockKey(row) {
  const fields = row.fields || row;
  const stored = String(normalizeBlank(
    getField(row, "Source Key") || fields["Source Key"] ||
    getField(row, "Milestone Source Key") || fields["Milestone Source Key"]
  ) || "");
  if (stored) return stored;
  const enrollmentId = firstLinkedId(getField(row, "Enrollment") || fields.Enrollment);
  const milestoneId = firstLinkedId(getField(row, "Shot Milestone") || fields["Shot Milestone"]);
  const weekId = firstLinkedId(getField(row, "Week") || fields.Week);
  if (enrollmentId && milestoneId) return `SHOT_MILESTONE|${enrollmentId}|${milestoneId}`;
  if (enrollmentId && weekId) return `PERFECT_WEEK|${enrollmentId}|${weekId}`;
  return "";
}

function missingAuthority(xpId, enrollmentId, sourceKey, authority, authorityId) {
  return fin({
    workflow: WORKFLOWS.SUBMISSION_BASE_XP,
    sourceTable: "XP Events",
    sourceRecordId: xpId,
    enrollmentRecordId: enrollmentId,
    sourceKey,
    healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
    code: "xp_authoritative_source_missing",
    recommendedAction:
      "Retire this Enrollment-owned XP Event (Active?=false), preserve points/history, and request Enrollment progression recalculation. Do not recreate a missing source or steal another event.",
    evidence: [`authority=${authority}`, `authorityRecordId=${authorityId || "blank"}`],
    meta: { dataFixRequired: true, reconciliationAction: "retire_and_request_level_recalc" },
  });
}

function ownerMismatch(xpId, enrollmentId, sourceKey, keyEnrollmentId, authority) {
  return fin({
    workflow: WORKFLOWS.SUBMISSION_BASE_XP,
    sourceTable: "XP Events",
    sourceRecordId: xpId,
    enrollmentRecordId: enrollmentId,
    sourceKey,
    healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
    code: "xp_source_key_enrollment_mismatch",
    recommendedAction:
      "Do not move/steal the XP Event automatically. Retire or repair deterministically from the authoritative source, then request progression recalculation for affected Enrollment(s).",
    evidence: [`authority=${authority}`, `xpEnrollment=${enrollmentId}`, `keyEnrollment=${keyEnrollmentId || "blank"}`],
    meta: { dataFixRequired: true, reconciliationAction: "ownership_conflict_manual_or_domain_repair" },
  });
}

function ownershipConflict(xpId, enrollmentId, sourceKey, authority, authorityId, detail) {
  return fin({
    workflow: WORKFLOWS.SUBMISSION_BASE_XP,
    sourceTable: "XP Events",
    sourceRecordId: xpId,
    enrollmentRecordId: enrollmentId,
    sourceKey,
    healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
    code: "xp_source_enrollment_mismatch",
    recommendedAction:
      "Do not move/steal the XP Event automatically. Reconcile against the authoritative source owner, then request progression recalculation for affected Enrollment(s).",
    evidence: [`authority=${authority}`, `authorityRecordId=${authorityId || "blank"}`, detail].filter(Boolean),
    meta: { dataFixRequired: true, reconciliationAction: "ownership_conflict_manual_or_domain_repair" },
  });
}

function inactiveAuthority(xpId, enrollmentId, sourceKey, authority, authorityId) {
  return fin({
    workflow: WORKFLOWS.SUBMISSION_BASE_XP,
    sourceTable: "XP Events",
    sourceRecordId: xpId,
    enrollmentRecordId: enrollmentId,
    sourceKey,
    healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
    code: "xp_authoritative_source_inactive",
    recommendedAction:
      "Retire the active XP Event (Active?=false), preserve points/history, and request Enrollment progression recalculation. Reactivation must require the authoritative source to become valid again.",
    evidence: [`authority=${authority}`, `authorityRecordId=${authorityId || "blank"}`],
    meta: { dataFixRequired: true, reconciliationAction: "retire_and_request_level_recalc" },
  });
}

function authorityCardinality(xpId, enrollmentId, sourceKey, authority, count, action) {
  return fin({
    workflow: WORKFLOWS.SUBMISSION_BASE_XP,
    sourceTable: "XP Events",
    sourceRecordId: xpId,
    enrollmentRecordId: enrollmentId,
    sourceKey,
    healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
    code: count === 0 ? "xp_authoritative_source_missing" : "xp_authoritative_source_ambiguous",
    recommendedAction: `${action} ${count === 0 ? "Retire unsupported active XP and request progression recalculation." : "Fail closed; do not choose a source automatically."}`,
    evidence: [`authority=${authority}`, `count=${count}`],
    meta: {
      dataFixRequired: true,
      reconciliationAction: count === 0 ? "retire_and_request_level_recalc" : "manual_review_fail_closed",
    },
  });
}

function linkedIds(row, fieldName) {
  const raw = getField(row, fieldName) || (row.fields || row)[fieldName];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => typeof item === "string" ? item : item?.id).filter(Boolean);
}

function indexById(rows) {
  const out = {};
  for (const row of rows) {
    const id = getRecordId(row);
    if (id) out[id] = row;
  }
  return out;
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function sameOwner(a, b) {
  return Boolean(a && b && a === b);
}

function isExplicitFalse(value) {
  if (value === false || value === 0) return true;
  const text = String(value?.name ?? value ?? "").trim().toLowerCase();
  return ["false", "inactive", "no", "0", "retired", "withdrawn", "void"].includes(text);
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = {
  checkXpSourceAuthority,
  expectedStreakKey,
  expectedUnlockKey,
};
