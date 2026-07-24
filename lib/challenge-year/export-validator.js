/**
 * Complete production export validator for season launch.
 * Accepts fixture/export JSON shapes — no live Airtable.
 */

"use strict";

const { normalizeChallengeYearConfig, findOverlappingConfigs, findCurrentConfigs } = require("./contract");
const { validateWeekPlan } = require("./week-validator");
const { validateEnrollmentsForChallengeYear } = require("./enrollment-validator");
const { validateWeeklyAthleteSummaries } = require("./was-validator");
const { normalizeSchoolYear } = require("../config-selection");
const { toDateKey } = require("./dates");

function finding(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra };
}

function summarize(findings) {
  if (findings.some((f) => f.severity === "FAIL")) return "FAIL";
  if (findings.some((f) => f.severity === "WARNING")) return "PASS WITH WARNINGS";
  return "PASS";
}

function validateConfigExport(configs = [], options = {}) {
  const findings = [];
  const normalized = [];
  for (const row of configs) {
    const r = normalizeChallengeYearConfig(row);
    if (!r.ok) {
      findings.push(finding("FAIL", r.code, r.message, { configId: row.id }));
      continue;
    }
    normalized.push(r.config);
  }

  if (normalized.length === 0) {
    findings.push(finding("FAIL", "no_active_config", "No valid Config rows in export."));
    return { overall: "FAIL", findings, configs: normalized };
  }

  const currents = findCurrentConfigs(normalized);
  if (currents.length === 0 && options.requireCurrent !== false) {
    findings.push(finding("FAIL", "no_active_config", "No Config marked current/active."));
  }
  if (currents.length > 1) {
    findings.push(
      finding(
        "FAIL",
        "multiple_active_configs",
        `Multiple active Configs: ${currents.map((c) => c.challengeYearLabel).join(", ")}`
      )
    );
  }

  const overlaps = findOverlappingConfigs(normalized);
  for (const o of overlaps) {
    findings.push(
      finding(
        "FAIL",
        "overlapping_config_dates",
        `Overlap ${o.a.year} ↔ ${o.b.year}`
      )
    );
  }

  for (const c of normalized) {
    if (!c.startDate || !c.endDate) {
      findings.push(
        finding("FAIL", "missing_config_dates", `${c.challengeYearLabel}: missing start/end dates.`, {
          configId: c.configRecordId,
        })
      );
    }
    const year = normalizeSchoolYear(c.challengeYearLabel);
    if (!year.ok) {
      findings.push(finding("FAIL", "invalid_challenge_year_label", year.message));
    }
    if (c.testMode && c.isCurrent) {
      findings.push(
        finding(
          "FAIL",
          "test_config_marked_live",
          `${c.challengeYearLabel}: Test Config marked current/Live.`,
          { configId: c.configRecordId }
        )
      );
    }
    if (c.endDate && c.isCurrent) {
      const today = toDateKey(new Date());
      if (today && c.endDate < today) {
        findings.push(
          finding(
            "FAIL",
            "historical_config_marked_current",
            `${c.challengeYearLabel} ended ${c.endDate} but isCurrent=true.`
          )
        );
      }
    }
    if (c.priorConfigId && c.nextConfigId && c.priorConfigId === c.nextConfigId) {
      findings.push(
        finding(
          "FAIL",
          "prior_next_config_conflict",
          `${c.challengeYearLabel}: prior and next Config are the same id.`
        )
      );
    }
    if (!c.timezone) {
      findings.push(finding("FAIL", "missing_timezone", `${c.challengeYearLabel}: missing timezone.`));
    } else if (c.timezone !== "America/Denver") {
      findings.push(
        finding(
          "WARNING",
          "non_denver_timezone",
          `${c.challengeYearLabel}: timezone ${c.timezone}`
        )
      );
    }
    if (!c.rolloverState && !c.status) {
      findings.push(
        finding(
          "WARNING",
          "missing_launch_status",
          `${c.challengeYearLabel}: missing launch/rollover status (proposed field).`
        )
      );
    }
    if (c.emailScheduleEnabled == null) {
      findings.push(
        finding(
          "WARNING",
          "missing_email_enablement",
          `${c.challengeYearLabel}: emailScheduleEnabled not set (proposed).`
        )
      );
    }
    if (c.xpEnabled == null) {
      findings.push(
        finding(
          "WARNING",
          "missing_xp_enablement",
          `${c.challengeYearLabel}: xpEnabled not set (proposed).`
        )
      );
    }
    if (c.achievementsEnabled == null) {
      findings.push(
        finding(
          "WARNING",
          "missing_achievement_enablement",
          `${c.challengeYearLabel}: achievementsEnabled not set (proposed).`
        )
      );
    }
  }

  return { overall: summarize(findings), findings, configs: normalized, currents };
}

function validateXpAndAchievementsExport(input = {}) {
  const findings = [];
  const expectedYear = input.expectedChallengeYear
    ? normalizeSchoolYear(input.expectedChallengeYear)
    : null;
  const yearKey = expectedYear && expectedYear.ok ? expectedYear.key : null;

  for (const xp of input.xpEvents || []) {
    const enrYear = xp.enrollmentChallengeYear || xp.enrollmentSchoolYear;
    if (yearKey && enrYear && normalizeSchoolYear(enrYear).ok && normalizeSchoolYear(enrYear).key !== yearKey) {
      findings.push(
        finding("FAIL", "xp_wrong_enrollment_year", `XP ${xp.id} Enrollment year ${enrYear}`, {
          xpEventId: xp.id,
        })
      );
    }
    if (xp.sourceChallengeYear && yearKey && xp.sourceChallengeYear !== yearKey) {
      findings.push(
        finding(
          "FAIL",
          "xp_source_prior_season",
          `XP ${xp.id} source from ${xp.sourceChallengeYear}`,
          { xpEventId: xp.id }
        )
      );
    }
  }

  const dedupe = new Map();
  for (const xp of input.xpEvents || []) {
    const key = xp.sourceKey || xp.dedupeKey;
    if (!key) continue;
    if (!dedupe.has(key)) dedupe.set(key, []);
    dedupe.get(key).push(xp);
  }
  for (const [key, rows] of dedupe.entries()) {
    const years = new Set(
      rows.map((r) => r.enrollmentChallengeYear || r.enrollmentSchoolYear).filter(Boolean)
    );
    if (rows.length > 1 && years.size > 1) {
      findings.push(
        finding(
          "FAIL",
          "xp_dedupe_collision_across_seasons",
          `Source Key ${key} collides across seasons: ${[...years].join(", ")}`
        )
      );
    }
  }

  for (const unlock of input.achievementUnlocks || []) {
    const enrYear = unlock.enrollmentChallengeYear;
    if (yearKey && enrYear && enrYear !== yearKey) {
      findings.push(
        finding(
          "FAIL",
          "achievement_wrong_enrollment_year",
          `Unlock ${unlock.id} on Enrollment year ${enrYear}`
        )
      );
    }
    if (unlock.type === "Perfect Week" && unlock.weekChallengeYear && yearKey && unlock.weekChallengeYear !== yearKey) {
      findings.push(
        finding(
          "FAIL",
          "perfect_week_wrong_week_year",
          `Perfect Week unlock ${unlock.id} Week year ${unlock.weekChallengeYear}`
        )
      );
    }
    if (unlock.type === "Shot Milestone" && unlock.gradeBandMismatch) {
      findings.push(
        finding(
          "FAIL",
          "milestone_wrong_grade_band",
          `Milestone unlock ${unlock.id} grade-band mismatch`
        )
      );
    }
  }

  for (const level of input.levelRecalcs || []) {
    if (yearKey && level.enrollmentChallengeYear && level.enrollmentChallengeYear !== yearKey) {
      findings.push(
        finding(
          "FAIL",
          "level_recalc_old_enrollment",
          `Level recalc ${level.id || ""} uses Enrollment year ${level.enrollmentChallengeYear}`
        )
      );
    }
  }

  return { overall: summarize(findings), findings };
}

/**
 * Full export validation bundle.
 */
function validateSeasonExport(exportData = {}, options = {}) {
  const challengeYear = options.challengeYear || exportData.challengeYear || exportData.expectedChallengeYear;
  const configId = options.configRecordId || exportData.configRecordId || exportData.expectedConfigRecordId;

  const configResult = validateConfigExport(exportData.configs || exportData.configRows || [], {
    requireCurrent: options.requireCurrent,
  });
  const weekResult = validateWeekPlan(exportData.weeks || [], {
    challengeYear,
    configRecordId: configId,
    expectedRegularWeeks: options.regularWeeks || exportData.regularWeeks,
    requireCanonicalWeekKey: options.requireCanonicalWeekKey !== false,
  });
  const enrollmentResult = validateEnrollmentsForChallengeYear({
    enrollments: exportData.enrollments || [],
    configs: exportData.configs || exportData.configRows || [],
    weeks: exportData.weeks || [],
    expectedChallengeYear: challengeYear,
    expectedConfigRecordId: configId,
    levelPolicy: options.levelPolicy || exportData.levelPolicy || "undocumented",
  });
  const wasResult = validateWeeklyAthleteSummaries({
    summaries: exportData.summaries || exportData.weeklyAthleteSummaries || [],
    enrollments: exportData.enrollments || [],
    weeks: exportData.weeks || [],
    expectedChallengeYear: challengeYear,
    processingAsCurrent: Boolean(options.processingAsCurrent || exportData.processingAsCurrent),
  });
  const xpResult = validateXpAndAchievementsExport({
    expectedChallengeYear: challengeYear,
    xpEvents: exportData.xpEvents || [],
    achievementUnlocks: exportData.achievementUnlocks || [],
    levelRecalcs: exportData.levelRecalcs || [],
  });

  // Stale email flags from previous season on new-season summaries
  const emailFindings = [];
  for (const s of exportData.summaries || exportData.weeklyAthleteSummaries || []) {
    if (s.copiedFromPriorSeason) {
      if (s.emailSent || s["Weekly Email Sent?"]) {
        emailFindings.push(
          finding("FAIL", "sent_flag_copied_new_season", `WAS ${s.id} Sent? copied into new season`)
        );
      }
      if (s.buildWeeklyEmailNow || s["Build Weekly Email Now?"]) {
        emailFindings.push(
          finding("FAIL", "build_flag_from_prior_season", `WAS ${s.id} Build flag from prior season`)
        );
      }
    }
    if (s.emailPackageChallengeYear && challengeYear && s.emailPackageChallengeYear !== challengeYear) {
      emailFindings.push(
        finding(
          "FAIL",
          "email_package_wrong_season",
          `WAS ${s.id} email package year ${s.emailPackageChallengeYear}`
        )
      );
    }
  }

  const allFindings = [
    ...configResult.findings,
    ...weekResult.findings,
    ...enrollmentResult.findings,
    ...wasResult.findings,
    ...xpResult.findings,
    ...emailFindings,
  ];

  return {
    overall: summarize(allFindings),
    challengeYear: challengeYear || null,
    configRecordId: configId || null,
    sections: {
      config: configResult,
      weeks: weekResult,
      enrollments: enrollmentResult,
      was: wasResult,
      xpAchievements: xpResult,
      emailFlags: { overall: summarize(emailFindings), findings: emailFindings },
    },
    findings: allFindings,
    failed: allFindings.filter((f) => f.severity === "FAIL"),
    warnings: allFindings.filter((f) => f.severity === "WARNING"),
  };
}

module.exports = {
  validateConfigExport,
  validateXpAndAchievementsExport,
  validateSeasonExport,
};
