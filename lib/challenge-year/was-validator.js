/**
 * Weekly Athlete Summary uniqueness + challenge-year consistency.
 *
 * Identity: Enrollment record ID + Week record ID
 * Summary Key formula (never write): {Enrollment Key}|{Week Key}
 *
 * Extends lib/was-email-contracts uniqueness helpers with year/config checks.
 * Dry-run repair recommendations only — never merge/delete.
 */

"use strict";

const {
  buildWasIdentity,
  detectWasDuplicates,
  normalizeSummaryKey,
} = require("../was-email-contracts");
const { parseCanonicalWeekKey } = require("./week-keys");
const { normalizeSchoolYear } = require("../config-selection");

function finding(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra };
}

function summarize(findings) {
  if (findings.some((f) => f.severity === "FAIL")) return "FAIL";
  if (findings.some((f) => f.severity === "WARNING")) return "PASS WITH WARNINGS";
  return "PASS";
}

/**
 * @param {object} input
 * @param {object[]} input.summaries
 * @param {object[]} [input.enrollments]
 * @param {object[]} [input.weeks]
 * @param {string} [input.expectedChallengeYear]
 * @param {boolean} [input.processingAsCurrent=false]
 */
function validateWeeklyAthleteSummaries(input = {}) {
  const findings = [];
  const summaries = Array.isArray(input.summaries) ? input.summaries : [];
  const enrollmentsById = new Map(
    (input.enrollments || []).map((e) => [e.id || e.enrollmentId, e])
  );
  const weeksById = new Map((input.weeks || []).map((w) => [w.id, w]));

  let expectedYear = null;
  if (input.expectedChallengeYear) {
    const y = normalizeSchoolYear(input.expectedChallengeYear);
    if (!y.ok) {
      return {
        overall: "FAIL",
        findings: [finding("FAIL", y.code, y.message)],
        duplicates: [],
        repairRecommendations: [],
      };
    }
    expectedYear = y.key;
  }

  /** @type {Map<string, object[]>} */
  const byIdentity = new Map();
  /** @type {Map<string, object[]>} */
  const byEmailPackage = new Map();

  for (const row of summaries) {
    const id = row.id || null;
    const enrollmentId = row.enrollmentId || row.enrollment || null;
    const weekId = row.weekId || row.week || null;
    const summaryKey = row.summaryKey || row["Summary Key"] || "";
    const configId = row.configRecordId || row.configId || null;
    const enrollmentYear =
      row.enrollmentChallengeYear || row.enrollmentSchoolYear || null;
    const weekYear = row.weekChallengeYear || null;
    const weekKey = row.weekKey || null;
    const weekHistorical = Boolean(row.weekHistorical || row.historicalWeek);
    const enrollmentHistorical = Boolean(
      row.enrollmentHistorical || row.historicalEnrollment
    );
    const buildFlag = Boolean(
      row.buildWeeklyEmailNow || row["Build Weekly Email Now?"]
    );
    const emailPackageKey =
      row.emailPackageKey ||
      row.eventId ||
      (enrollmentId && weekId ? `WEEKLY_EMAIL|${enrollmentId}|${weekId}` : null);

    if (!enrollmentId) {
      findings.push(
        finding("FAIL", "summary_missing_enrollment", `WAS ${id} missing Enrollment.`, {
          summaryId: id,
        })
      );
    }
    if (!weekId) {
      findings.push(
        finding("FAIL", "summary_missing_week", `WAS ${id} missing Week.`, {
          summaryId: id,
        })
      );
    }
    if (!enrollmentId || !weekId) continue;

    let identityKey;
    try {
      identityKey = buildWasIdentity({ enrollmentId, weekId }).identityKey;
    } catch (error) {
      findings.push(
        finding("FAIL", "invalid_was_identity", `WAS ${id}: ${error.message}`, {
          summaryId: id,
        })
      );
      continue;
    }

    if (!byIdentity.has(identityKey)) byIdentity.set(identityKey, []);
    byIdentity.get(identityKey).push(row);

    const enr = enrollmentsById.get(enrollmentId);
    const week = weeksById.get(weekId);

    const resolvedEnrYear =
      enrollmentYear ||
      (enr && (enr.schoolYear || enr.challengeYear)) ||
      null;
    let resolvedWeekYear = weekYear;
    if (!resolvedWeekYear && weekKey) {
      const parsed = parseCanonicalWeekKey(weekKey);
      if (parsed.ok) resolvedWeekYear = parsed.challengeYear;
    }
    if (!resolvedWeekYear && week) {
      resolvedWeekYear = week.challengeYear || null;
      if (!resolvedWeekYear && week.weekKey) {
        const parsed = parseCanonicalWeekKey(week.weekKey);
        if (parsed.ok) resolvedWeekYear = parsed.challengeYear;
      }
    }

    if (
      resolvedEnrYear &&
      resolvedWeekYear &&
      normalizeSchoolYear(resolvedEnrYear).ok &&
      normalizeSchoolYear(resolvedWeekYear).ok &&
      normalizeSchoolYear(resolvedEnrYear).key !==
        normalizeSchoolYear(resolvedWeekYear).key
    ) {
      findings.push(
        finding(
          "FAIL",
          "summary_cross_year_links",
          `WAS ${id}: Enrollment year ${resolvedEnrYear} != Week year ${resolvedWeekYear}.`,
          { summaryId: id, enrollmentId, weekId }
        )
      );
    }

    if (expectedYear) {
      if (
        resolvedEnrYear &&
        normalizeSchoolYear(resolvedEnrYear).ok &&
        normalizeSchoolYear(resolvedEnrYear).key !== expectedYear
      ) {
        findings.push(
          finding(
            "FAIL",
            "summary_wrong_config_year",
            `WAS ${id}: Enrollment year ${resolvedEnrYear} != expected ${expectedYear}.`,
            { summaryId: id }
          )
        );
      }
      if (
        resolvedWeekYear &&
        normalizeSchoolYear(resolvedWeekYear).ok &&
        normalizeSchoolYear(resolvedWeekYear).key !== expectedYear
      ) {
        findings.push(
          finding(
            "FAIL",
            "summary_wrong_config_year",
            `WAS ${id}: Week year ${resolvedWeekYear} != expected ${expectedYear}.`,
            { summaryId: id }
          )
        );
      }
    }

    if (input.processingAsCurrent && (weekHistorical || (week && week.historical))) {
      findings.push(
        finding(
          "FAIL",
          "current_summary_historical_week",
          `WAS ${id} linked to historical Week while processed as current.`,
          { summaryId: id, weekId }
        )
      );
    }

    if (
      input.processingAsCurrent &&
      (enrollmentHistorical || (enr && enr.historical))
    ) {
      findings.push(
        finding(
          "FAIL",
          "current_summary_historical_enrollment",
          `WAS ${id} uses historical Enrollment while processed as current.`,
          { summaryId: id, enrollmentId }
        )
      );
    }

    if (configId && enr && enr.configRecordId && configId !== enr.configRecordId) {
      findings.push(
        finding(
          "FAIL",
          "summary_wrong_config",
          `WAS ${id} Config ${configId} != Enrollment Config ${enr.configRecordId}.`,
          { summaryId: id }
        )
      );
    }

    if (emailPackageKey) {
      if (!byEmailPackage.has(emailPackageKey)) byEmailPackage.set(emailPackageKey, []);
      byEmailPackage.get(emailPackageKey).push(row);
    }

    if (row.duplicateBuildFlag || (buildFlag && row.buildAlreadyArmed)) {
      findings.push(
        finding(
          "FAIL",
          "duplicate_build_flags",
          `WAS ${id} has duplicate/conflicting Build Weekly Email flags.`,
          { summaryId: id }
        )
      );
    }

    // Optional Summary Key shape check when parts provided
    if (row.enrollmentKey && weekKey) {
      const expected = normalizeSummaryKey({
        enrollmentKey: row.enrollmentKey,
        weekKey,
      });
      if (summaryKey && expected && summaryKey !== expected) {
        findings.push(
          finding(
            "WARNING",
            "summary_key_mismatch",
            `WAS ${id}: Summary Key "${summaryKey}" != expected "${expected}".`,
            { summaryId: id }
          )
        );
      }
    }
  }

  const duplicates = [];
  const repairRecommendations = [];

  for (const [identityKey, rows] of byIdentity.entries()) {
    if (rows.length < 2) continue;
    const enrollmentId = rows[0].enrollmentId || rows[0].enrollment;
    const weekId = rows[0].weekId || rows[0].week;
    const dup = detectWasDuplicates(rows, { enrollmentId, weekId });
    duplicates.push({
      identityKey,
      enrollmentId,
      weekId,
      count: rows.length,
      ids: rows.map((r) => r.id),
      winnerId: dup.winnerId,
    });
    findings.push(
      finding(
        "FAIL",
        "duplicate_summaries",
        `Duplicate WAS for ${identityKey}: ${rows.map((r) => r.id).join(", ")}.`,
        { identityKey }
      )
    );
    repairRecommendations.push({
      action: "manual_review_keep_lowest_id",
      identityKey,
      keepId: dup.winnerId || [...rows.map((r) => r.id)].sort()[0],
      archiveOrUnlinkIds: rows
        .map((r) => r.id)
        .filter((id) => id && id !== (dup.winnerId || [...rows.map((r) => r.id)].sort()[0])),
      note: "Dry-run only. Do not auto-merge or delete. Confirm rollups/XP links before any manual unlink.",
    });
  }

  for (const [emailKey, rows] of byEmailPackage.entries()) {
    if (rows.length < 2) continue;
    findings.push(
      finding(
        "FAIL",
        "duplicate_email_package",
        `Duplicate email package key ${emailKey} on WAS: ${rows
          .map((r) => r.id)
          .join(", ")}.`
      )
    );
    repairRecommendations.push({
      action: "manual_review_email_package",
      emailPackageKey: emailKey,
      summaryIds: rows.map((r) => r.id),
      note: "Dry-run only. Inspect Sent?/Ready?/Make Send Status before any change.",
    });
  }

  return {
    overall: summarize(findings),
    findings,
    duplicates,
    repairRecommendations,
    summaryCount: summaries.length,
  };
}

module.exports = {
  validateWeeklyAthleteSummaries,
};
