/**
 * Current-Config resolver for challenge years.
 *
 * Builds on lib/config-selection (year-aware fail-closed hierarchy) and adds:
 * - Enrollment-linked Config / school year
 * - Week-linked Config / challenge year
 * - date-based resolution
 * - current active Config
 * - Test Config
 * - historical Config
 * - ambiguous / overlapping / multiple-active refusal
 *
 * Never silently picks the first qualifying record.
 */

"use strict";

const {
  normalizeSchoolYear,
  resolveConfig: resolveConfigByYear,
} = require("../config-selection");
const {
  normalizeChallengeYearConfig,
  findOverlappingConfigs,
  findCurrentConfigs,
  RESOLUTION_STATUSES,
} = require("./contract");
const { toDateKey, isDateInRange, compareDateKeys } = require("./dates");

/**
 * @param {object[]} rawRows
 */
function normalizeRows(rawRows = []) {
  const configs = [];
  const errors = [];
  for (let i = 0; i < rawRows.length; i += 1) {
    const result = normalizeChallengeYearConfig(rawRows[i]);
    if (!result.ok) {
      errors.push({ index: i, code: result.code, message: result.message });
      continue;
    }
    configs.push(result.config);
  }
  return { configs, errors };
}

function fail(status, code, message, extra = {}) {
  return {
    ok: false,
    status,
    error: { code, message },
    config: null,
    configRecordId: null,
    challengeYearLabel: null,
    ...extra,
  };
}

function success(status, config, selectionSource, debug = {}) {
  return {
    ok: true,
    status,
    config,
    configRecordId: config.configRecordId,
    challengeYearLabel: config.challengeYearLabel,
    selectionSource,
    debug,
  };
}

/**
 * Resolve the correct Challenge-Year Config.
 *
 * Priority:
 * 1. explicitConfigRecordId
 * 2. enrollmentConfigRecordId / enrollmentSchoolYear (+ linked)
 * 3. weekConfigRecordId / weekChallengeYear
 * 4. asOfDate date-based range match
 * 5. requireCurrent / current active flag
 * 6. testModeOnly / historicalOnly filters
 *
 * @param {object} input
 */
function resolveChallengeYearConfig(input = {}) {
  const {
    configRows = [],
    explicitConfigRecordId,
    enrollmentConfigRecordId,
    enrollmentSchoolYear,
    weekConfigRecordId,
    weekChallengeYear,
    asOfDate,
    requireCurrent = false,
    allowHistorical = true,
    testModeOnly = false,
    programInstanceSchoolYear,
    testSeasonOverride,
  } = input;

  const debug = {
    calendarYearUsed: false,
    firstRecordFallbackUsed: false,
    requireCurrent,
    allowHistorical,
    testModeOnly,
  };

  if (!Array.isArray(configRows)) {
    return fail(
      "invalid_configuration",
      "invalid_config_rows",
      "configRows must be an array.",
      { debug }
    );
  }

  const { configs, errors } = normalizeRows(configRows);
  debug.normalizeErrors = errors;
  if (errors.length && configs.length === 0) {
    return fail(
      "invalid_configuration",
      "invalid_configuration",
      `All Config rows failed normalization (${errors[0].message}).`,
      { debug }
    );
  }

  const overlaps = findOverlappingConfigs(configs);
  debug.overlaps = overlaps;

  // --- 1. Explicit Config record ID ---
  if (explicitConfigRecordId != null && String(explicitConfigRecordId).trim() !== "") {
    const id = String(explicitConfigRecordId).trim();
    if (!id.startsWith("rec")) {
      return fail(
        "invalid_configuration",
        "invalid_explicit_config_id",
        `explicitConfigRecordId must be rec…; got "${id}".`,
        { debug }
      );
    }
    const matches = configs.filter((c) => c.configRecordId === id);
    if (matches.length === 0) {
      return fail(
        "unresolved",
        "explicit_config_not_found",
        `No Config with id ${id}.`,
        { debug }
      );
    }
    if (matches.length > 1) {
      return fail(
        "ambiguous",
        "duplicate_config_ids",
        `Multiple normalized Configs share id ${id}.`,
        { debug, matchedIds: matches.map((m) => m.configRecordId) }
      );
    }
    return classifyResolved(matches[0], "explicit_config_record_id", {
      ...debug,
      overlaps,
    });
  }

  // --- 2. Enrollment-linked ---
  if (
    enrollmentConfigRecordId != null &&
    String(enrollmentConfigRecordId).trim() !== ""
  ) {
    const id = String(enrollmentConfigRecordId).trim();
    const matches = configs.filter((c) => c.configRecordId === id);
    if (matches.length === 1) {
      if (enrollmentSchoolYear) {
        const year = normalizeSchoolYear(enrollmentSchoolYear);
        if (
          year.ok &&
          year.key !== matches[0].challengeYearLabel
        ) {
          return fail(
            "invalid_configuration",
            "enrollment_config_year_mismatch",
            `Enrollment Config ${id} is ${matches[0].challengeYearLabel} but Enrollment school year is ${year.key}.`,
            { debug }
          );
        }
      }
      return classifyResolved(matches[0], "enrollment_linked_config", {
        ...debug,
        overlaps,
      });
    }
    if (matches.length > 1) {
      return fail("ambiguous", "duplicate_config_ids", `Duplicate Config id ${id}.`, {
        debug,
      });
    }
    // fall through to school-year if link missing from fixture set
  }

  if (enrollmentSchoolYear != null && String(enrollmentSchoolYear).trim() !== "") {
    const yearResult = resolveByYearKey(configs, enrollmentSchoolYear, {
      ...input,
      selectionHint: "enrollment_school_year",
      overlaps,
      debug,
    });
    if (!yearResult.ok || yearResult.status !== "unresolved") return yearResult;
  }

  // --- 3. Week-linked ---
  if (weekConfigRecordId != null && String(weekConfigRecordId).trim() !== "") {
    const id = String(weekConfigRecordId).trim();
    const matches = configs.filter((c) => c.configRecordId === id);
    if (matches.length === 1) {
      return classifyResolved(matches[0], "week_linked_config", {
        ...debug,
        overlaps,
      });
    }
    if (matches.length > 1) {
      return fail("ambiguous", "duplicate_config_ids", `Duplicate Config id ${id}.`, {
        debug,
      });
    }
  }

  if (weekChallengeYear != null && String(weekChallengeYear).trim() !== "") {
    const yearResult = resolveByYearKey(configs, weekChallengeYear, {
      ...input,
      selectionHint: "week_challenge_year",
      overlaps,
      debug,
    });
    if (!yearResult.ok || yearResult.status !== "unresolved") return yearResult;
  }

  // Reuse year-aware hierarchy for Program Instance / test override when present.
  if (
    (programInstanceSchoolYear != null &&
      String(programInstanceSchoolYear).trim() !== "") ||
    Object.prototype.hasOwnProperty.call(input, "testSeasonOverride")
  ) {
    const legacyRows = configs.map((c) => ({
      id: c.configRecordId,
      activeSchoolYear: c.challengeYearLabel,
      fields: c.raw && c.raw.fields ? c.raw.fields : {},
    }));
    const legacy = resolveConfigByYear({
      configRows: legacyRows,
      programInstanceSchoolYear,
      enrollmentSchoolYear,
      testSeasonOverride,
    });
    if (legacy.ok) {
      const match = configs.find((c) => c.configRecordId === legacy.configRecordId);
      if (match) {
        return classifyResolved(match, legacy.selectionSource, {
          ...debug,
          overlaps,
          legacyDebug: legacy.debug,
        });
      }
    } else if (legacy.error && legacy.error.code !== "missing_school_year") {
      return fail("unresolved", legacy.error.code, legacy.error.message, {
        debug: { ...debug, legacyDebug: legacy.debug },
      });
    }
  }

  // --- 4. Date-based ---
  if (asOfDate != null && String(asOfDate).trim() !== "") {
    const dateKey = toDateKey(asOfDate);
    if (!dateKey) {
      return fail(
        "invalid_configuration",
        "malformed_as_of_date",
        `asOfDate could not be parsed: "${asOfDate}".`,
        { debug }
      );
    }
    const ranged = configs.filter(
      (c) => c.startDate && c.endDate && isDateInRange(dateKey, c.startDate, c.endDate)
    );
    debug.dateMatches = ranged.map((c) => c.configRecordId);
    if (ranged.length === 0) {
      return fail(
        "unresolved",
        "no_config_for_date",
        `No Config date range covers ${dateKey}.`,
        { debug }
      );
    }
    if (ranged.length > 1) {
      return fail(
        "ambiguous",
        "overlapping_configs_for_date",
        `Multiple Configs cover ${dateKey}: ${ranged
          .map((c) => c.configRecordId || c.challengeYearLabel)
          .join(", ")}.`,
        {
          debug,
          matchedIds: ranged.map((c) => c.configRecordId),
          overlaps,
        }
      );
    }
    if (overlaps.length) {
      // Even a single match is invalid_configuration when the catalog overlaps.
      return fail(
        "invalid_configuration",
        "overlapping_config_ranges",
        "Config catalog has overlapping date ranges; refuse date resolution.",
        { debug, overlaps }
      );
    }
    return classifyResolved(ranged[0], "as_of_date", { ...debug, asOfDate: dateKey });
  }

  // --- 5. Test-only catalog (before current-active heuristic) ---
  if (testModeOnly) {
    const tests = configs.filter((c) => c.testMode === true);
    if (tests.length === 0) {
      return fail("unresolved", "no_test_config", "No Test Mode Config found.", {
        debug,
      });
    }
    if (tests.length > 1) {
      return fail(
        "ambiguous",
        "multiple_test_configs",
        `Multiple Test Mode Configs: ${tests
          .map((c) => c.configRecordId || c.challengeYearLabel)
          .join(", ")}.`,
        { debug }
      );
    }
    return success("test_only", tests[0], "test_mode_only", debug);
  }

  // --- 6. Current active ---
  if (requireCurrent || (!asOfDate && !enrollmentSchoolYear && !weekChallengeYear)) {
    const currents = findCurrentConfigs(configs);
    debug.currentCandidates = currents.map((c) => c.configRecordId);
    if (currents.length === 0 && requireCurrent) {
      return fail(
        "unresolved",
        "no_current_config",
        "No Config marked current/active.",
        { debug }
      );
    }
    if (currents.length > 1) {
      return fail(
        "ambiguous",
        "multiple_active_configs",
        `Multiple current/active Configs: ${currents
          .map((c) => c.configRecordId || c.challengeYearLabel)
          .join(", ")}.`,
        { debug, matchedIds: currents.map((c) => c.configRecordId) }
      );
    }
    if (currents.length === 1) {
      return classifyResolved(currents[0], "current_active_flag", { ...debug });
    }
  }

  return fail(
    "unresolved",
    "missing_resolution_input",
    "Provide explicit Config id, Enrollment/Week linkage, school year, asOfDate, or requireCurrent.",
    { debug }
  );
}

function resolveByYearKey(configs, yearRaw, ctx) {
  const year = normalizeSchoolYear(yearRaw);
  if (!year.ok) {
    return fail("invalid_configuration", year.code, year.message, {
      debug: ctx.debug,
    });
  }
  const matches = configs.filter((c) => c.challengeYearLabel === year.key);
  if (matches.length === 0) {
    return fail(
      "unresolved",
      "config_year_not_found",
      `No Config for challenge year ${year.key}.`,
      { debug: { ...ctx.debug, availableYears: configs.map((c) => c.challengeYearLabel) } }
    );
  }
  if (matches.length > 1) {
    return fail(
      "ambiguous",
      "duplicate_school_year",
      `Multiple Configs for challenge year ${year.key}.`,
      {
        debug: ctx.debug,
        matchedIds: matches.map((m) => m.configRecordId),
      }
    );
  }
  return classifyResolved(matches[0], ctx.selectionHint || "school_year", {
    ...ctx.debug,
    overlaps: ctx.overlaps,
  });
}

function classifyResolved(config, selectionSource, debug) {
  if (config.testMode === true) {
    return success("test_only", config, selectionSource, debug);
  }

  const today = toDateKey(new Date());
  if (config.endDate && compareDateKeys(config.endDate, today) < 0) {
    if (debug.allowHistorical === false) {
      return fail(
        "historical",
        "historical_config_not_allowed",
        `Config ${config.configRecordId || config.challengeYearLabel} ended ${config.endDate}.`,
        { debug, config }
      );
    }
    return success("historical", config, selectionSource, debug);
  }

  return success("resolved", config, selectionSource, debug);
}

/**
 * Guard used by admin scripts: refuse when more than one current Config exists.
 * @param {object[]} configRows
 */
function assertSingleCurrentConfig(configRows = []) {
  const { configs, errors } = normalizeRows(configRows);
  if (errors.length && configs.length === 0) {
    return {
      ok: false,
      code: "invalid_configuration",
      message: errors[0].message,
    };
  }
  const currents = findCurrentConfigs(configs);
  if (currents.length === 0) {
    return {
      ok: false,
      code: "no_current_config",
      message: "No current/active Config found.",
      currents,
    };
  }
  if (currents.length > 1) {
    return {
      ok: false,
      code: "multiple_active_configs",
      message: `Refuse to continue: ${currents.length} current/active Configs.`,
      currents,
    };
  }
  const overlaps = findOverlappingConfigs(configs);
  if (overlaps.length) {
    return {
      ok: false,
      code: "overlapping_config_ranges",
      message: "Refuse to continue: Config date ranges overlap.",
      overlaps,
      current: currents[0],
    };
  }
  return { ok: true, current: currents[0], configs };
}

module.exports = {
  resolveChallengeYearConfig,
  assertSingleCurrentConfig,
  normalizeRows,
  RESOLUTION_STATUSES,
};
