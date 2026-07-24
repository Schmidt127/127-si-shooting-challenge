/**
 * Enrollment ↔ challenge-year validation (offline / fixtures).
 *
 * Level reset vs carry-over is NOT assumed:
 * documented behavior is Lifetime XP → Current Level via 042 on the Enrollment.
 * New-year enrollments typically start fresh, but product may intentionally
 * copy a prior Current Level. Ambiguity is flagged, never auto-resolved.
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const { normalizeChallengeYearConfig } = require("./contract");
const { parseCanonicalWeekKey } = require("./week-keys");

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
 * @param {object[]} input.enrollments
 * @param {object[]} [input.configs]
 * @param {object[]} [input.weeks]
 * @param {string} [input.expectedChallengeYear]
 * @param {string} [input.expectedConfigRecordId]
 * @param {"reset"|"carry"|"undocumented"} [input.levelPolicy="undocumented"]
 */
function validateEnrollmentsForChallengeYear(input = {}) {
  const findings = [];
  const enrollments = Array.isArray(input.enrollments) ? input.enrollments : [];
  const configs = (input.configs || [])
    .map((c) => normalizeChallengeYearConfig(c))
    .filter((r) => r.ok)
    .map((r) => r.config);
  const configById = new Map(configs.map((c) => [c.configRecordId, c]));
  const configByYear = new Map(configs.map((c) => [c.challengeYearLabel, c]));

  let expectedYear = null;
  if (input.expectedChallengeYear) {
    const y = normalizeSchoolYear(input.expectedChallengeYear);
    if (!y.ok) {
      return {
        overall: "FAIL",
        findings: [finding("FAIL", y.code, y.message)],
        enrollments: [],
      };
    }
    expectedYear = y.key;
  }

  const levelPolicy = input.levelPolicy || "undocumented";
  if (levelPolicy === "undocumented") {
    findings.push(
      finding(
        "WARNING",
        "level_policy_undocumented",
        "Level reset vs carry-over is undocumented for annual rollover. Flagging Current Level / prior-year links as ambiguity only — do not assume reset."
      )
    );
  }

  /** @type {Map<string, object[]>} */
  const activeByAthleteYear = new Map();

  for (const row of enrollments) {
    const id = row.id || row.enrollmentId || null;
    const athleteId = row.athleteId || row.athleteRecordId || null;
    const schoolYearRaw = row.schoolYear || row["School Year"] || null;
    const configId =
      row.configRecordId ||
      row.configId ||
      (Array.isArray(row.config) ? row.config[0] : row.config) ||
      null;
    const programInstanceYear =
      row.programInstanceSchoolYear || row.programInstanceYear || null;
    const active = Boolean(row.active ?? row["Active?"]);
    const historical = Boolean(row.historical || row["Historical?"]);
    const grade = row.grade || row.Grade || null;
    const gradeBand = row.gradeBand || row["Grade Band"] || row.gradeBandId || null;
    const expectedGradeBand =
      row.expectedGradeBand || row.expectedGradeBandId || null;
    const testSettings = row.testSettings || row.testingScenario || null;
    const goalId = row.goalId || row.targetGoalId || row["Target Goal"] || null;
    const goalYear = row.goalChallengeYear || row.goalSchoolYear || null;
    const currentLevelId = row.currentLevelId || row["Current Level"] || null;
    const currentLevelYear = row.currentLevelChallengeYear || null;
    const linkedWeekIds = row.linkedWeekIds || row.weekIds || [];
    const linkedWeekKeys = row.linkedWeekKeys || [];

    if (!configId && !schoolYearRaw && !programInstanceYear) {
      findings.push(
        finding("FAIL", "enrollment_missing_config", "Enrollment has no Config / school year.", {
          enrollmentId: id,
        })
      );
      continue;
    }

    let yearKey = null;
    if (schoolYearRaw) {
      const y = normalizeSchoolYear(schoolYearRaw);
      if (!y.ok) {
        findings.push(
          finding("FAIL", y.code, `Enrollment ${id}: ${y.message}`, {
            enrollmentId: id,
          })
        );
      } else {
        yearKey = y.key;
      }
    }

    if (configId) {
      const cfg = configById.get(configId);
      if (!cfg && configs.length) {
        findings.push(
          finding(
            "FAIL",
            "enrollment_config_not_found",
            `Enrollment ${id} links Config ${configId} not in provided configs.`,
            { enrollmentId: id }
          )
        );
      } else if (cfg && yearKey && cfg.challengeYearLabel !== yearKey) {
        findings.push(
          finding(
            "FAIL",
            "enrollment_wrong_challenge_year",
            `Enrollment ${id}: Config year ${cfg.challengeYearLabel} != School Year ${yearKey}.`,
            { enrollmentId: id }
          )
        );
      } else if (cfg && !yearKey) {
        yearKey = cfg.challengeYearLabel;
      }
    }

    if (expectedYear && yearKey && yearKey !== expectedYear) {
      findings.push(
        finding(
          "FAIL",
          "enrollment_wrong_challenge_year",
          `Enrollment ${id}: year ${yearKey} != expected ${expectedYear}.`,
          { enrollmentId: id }
        )
      );
    }

    if (
      input.expectedConfigRecordId &&
      configId &&
      configId !== input.expectedConfigRecordId &&
      active
    ) {
      findings.push(
        finding(
          "FAIL",
          "enrollment_wrong_config",
          `Active Enrollment ${id} Config ${configId} != expected ${input.expectedConfigRecordId}.`,
          { enrollmentId: id }
        )
      );
    }

    if (active && historical) {
      findings.push(
        finding(
          "FAIL",
          "historical_enrollment_marked_active",
          `Enrollment ${id} is historical but Active?=true.`,
          { enrollmentId: id }
        )
      );
    }

    if (active && athleteId && yearKey) {
      const k = `${athleteId}|${yearKey}`;
      if (!activeByAthleteYear.has(k)) activeByAthleteYear.set(k, []);
      activeByAthleteYear.get(k).push({ id, athleteId, yearKey });
    }

    if (expectedGradeBand && gradeBand && expectedGradeBand !== gradeBand) {
      findings.push(
        finding(
          "FAIL",
          "grade_band_mismatch",
          `Enrollment ${id}: Grade Band ${gradeBand} != expected ${expectedGradeBand} for grade ${grade || "?"}.`,
          { enrollmentId: id }
        )
      );
    }

    if (active && testSettings && testSettings.stale === true) {
      findings.push(
        finding(
          "FAIL",
          "stale_test_settings",
          `Enrollment ${id} has stale Test settings.`,
          { enrollmentId: id }
        )
      );
    }

    if (active && goalYear && yearKey && goalYear !== yearKey) {
      findings.push(
        finding(
          "FAIL",
          "stale_goal_record",
          `Current Enrollment ${id} uses goal from year ${goalYear}.`,
          { enrollmentId: id, goalId }
        )
      );
    }

    if (active && currentLevelYear && yearKey && currentLevelYear !== yearKey) {
      if (levelPolicy === "reset") {
        findings.push(
          finding(
            "FAIL",
            "prior_year_current_level",
            `Enrollment ${id} Current Level belongs to ${currentLevelYear}; policy=reset.`,
            { enrollmentId: id, currentLevelId }
          )
        );
      } else {
        findings.push(
          finding(
            "WARNING",
            "prior_year_current_level_ambiguity",
            `Enrollment ${id} Current Level linked to prior year ${currentLevelYear}. Level carry-over policy is ${levelPolicy} — confirm intentional.`,
            { enrollmentId: id, currentLevelId }
          )
        );
      }
    }

    // Current enrollment linked to historical week records
    if (active && Array.isArray(linkedWeekKeys)) {
      for (const wk of linkedWeekKeys) {
        const parsed = parseCanonicalWeekKey(wk);
        if (parsed.ok && yearKey && parsed.challengeYear !== yearKey) {
          findings.push(
            finding(
              "FAIL",
              "current_enrollment_historical_week",
              `Active Enrollment ${id} linked to Week key ${wk} from ${parsed.challengeYear}.`,
              { enrollmentId: id }
            )
          );
        }
      }
    }
    if (active && Array.isArray(linkedWeekIds) && input.weeks) {
      for (const weekId of linkedWeekIds) {
        const week = (input.weeks || []).find((w) => w.id === weekId);
        if (!week) continue;
        const weekYear =
          week.challengeYear ||
          (week.weekKey && parseCanonicalWeekKey(week.weekKey).ok
            ? parseCanonicalWeekKey(week.weekKey).challengeYear
            : null);
        if (week.historical && yearKey) {
          findings.push(
            finding(
              "FAIL",
              "current_enrollment_historical_week",
              `Active Enrollment ${id} linked to historical Week ${weekId}.`,
              { enrollmentId: id }
            )
          );
        }
        if (weekYear && yearKey && weekYear !== yearKey) {
          findings.push(
            finding(
              "FAIL",
              "current_enrollment_historical_week",
              `Active Enrollment ${id} linked to Week ${weekId} year ${weekYear}.`,
              { enrollmentId: id }
            )
          );
        }
      }
    }
  }

  for (const [key, list] of activeByAthleteYear.entries()) {
    if (list.length > 1) {
      findings.push(
        finding(
          "FAIL",
          "multiple_active_enrollments_same_year",
          `Athlete/year ${key} has ${list.length} active Enrollments: ${list
            .map((x) => x.id)
            .join(", ")}.`
        )
      );
    }
  }

  return {
    overall: summarize(findings),
    findings,
    levelPolicy,
    configYears: [...configByYear.keys()],
    enrollmentCount: enrollments.length,
  };
}

module.exports = {
  validateEnrollmentsForChallengeYear,
};
