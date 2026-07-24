/**
 * Year-aware Config selection (pure JS, no Airtable runtime).
 *
 * Contract: docs/next-wave/config-selection/CONFIG-SELECTION-CONTRACT.md
 *
 * Four Config rows are intentional year-specific records. Never collapse them
 * merely because four rows exist. Never select an arbitrary first record.
 * Never infer school year from the calendar year.
 */

"use strict";

const SCHOOL_YEAR_RE = /^(\d{4})-(\d{4})$/;

/**
 * Normalize a school-year string to `YYYY-YYYY` (ASCII hyphen).
 * Accepts en dash / em dash / hyphen variants and surrounding whitespace.
 * Rejects blank, malformed, and non-consecutive year pairs.
 *
 * @param {unknown} raw
 * @returns {{ ok: true, key: string } | { ok: false, code: string, message: string }}
 */
function normalizeSchoolYear(raw) {
  if (raw == null) {
    return {
      ok: false,
      code: "blank_school_year",
      message: "School year is blank or null.",
    };
  }

  const trimmed = String(raw).trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "blank_school_year",
      message: "School year is blank after trim.",
    };
  }

  // Normalize common dash glyphs to ASCII hyphen-minus.
  const dashed = trimmed
    .replace(/[\u2013\u2014\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/\s*-\s*/g, "-");

  const match = SCHOOL_YEAR_RE.exec(dashed);
  if (!match) {
    return {
      ok: false,
      code: "malformed_school_year",
      message: `School year is malformed: "${trimmed}". Expected YYYY-YYYY.`,
    };
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end !== start + 1) {
    return {
      ok: false,
      code: "malformed_school_year",
      message: `School year years must be consecutive: got ${start}-${end}.`,
    };
  }

  return { ok: true, key: `${start}-${end}` };
}

/**
 * Index Config rows by normalized Active School Year.
 * Fails closed if any row has a blank/malformed year or if a year appears twice.
 *
 * @param {Array<{ id?: string, activeSchoolYear?: unknown, fields?: Record<string, unknown> }>} configRows
 */
function indexConfigRowsByYear(configRows) {
  const debug = {
    rowCount: Array.isArray(configRows) ? configRows.length : 0,
    years: [],
    duplicateYears: [],
    invalidRows: [],
  };

  if (!Array.isArray(configRows)) {
    return {
      ok: false,
      code: "invalid_config_rows",
      message: "configRows must be an array.",
      debug,
      byYear: null,
    };
  }

  /** @type {Map<string, object>} */
  const byYear = new Map();

  for (let i = 0; i < configRows.length; i += 1) {
    const row = configRows[i] || {};
    const yearRaw =
      row.activeSchoolYear != null
        ? row.activeSchoolYear
        : row.fields && row.fields["Active School Year"];
    const norm = normalizeSchoolYear(yearRaw);
    if (!norm.ok) {
      debug.invalidRows.push({
        index: i,
        id: row.id || null,
        code: norm.code,
        message: norm.message,
      });
      return {
        ok: false,
        code: norm.code,
        message: `Config row[${i}] (${row.id || "no-id"}): ${norm.message}`,
        debug,
        byYear: null,
      };
    }

    if (byYear.has(norm.key)) {
      const existing = byYear.get(norm.key);
      debug.duplicateYears.push({
        year: norm.key,
        ids: [existing.id || null, row.id || null],
      });
      return {
        ok: false,
        code: "duplicate_school_year",
        message: `Duplicate Config rows for school year ${norm.key}: ${existing.id || "?"} and ${row.id || "?"}.`,
        debug,
        byYear: null,
      };
    }

    byYear.set(norm.key, row);
    debug.years.push(norm.key);
  }

  return { ok: true, byYear, debug };
}

/**
 * Resolve exactly one Config row using the deterministic hierarchy:
 * 1. explicit Config record ID
 * 2. Program Instance school-year key
 * 3. Enrollment School Year
 * 4. test-season override (only when explicitly provided)
 *
 * Fail closed on zero or multiple matches. Never default to first record.
 * Never use calendar year.
 *
 * @param {object} input
 * @param {Array<object>} input.configRows
 * @param {string} [input.explicitConfigRecordId]
 * @param {string} [input.programInstanceSchoolYear]
 * @param {string} [input.enrollmentSchoolYear]
 * @param {string} [input.testSeasonOverride] — ignored unless explicitly provided (non-null/undefined)
 */
function resolveConfig(input = {}) {
  const {
    configRows = [],
    explicitConfigRecordId,
    programInstanceSchoolYear,
    enrollmentSchoolYear,
    testSeasonOverride,
  } = input;

  const debug = {
    hierarchy: [
      "explicit_config_record_id",
      "program_instance_school_year",
      "enrollment_school_year",
      "test_season_override",
    ],
    explicitConfigRecordId: explicitConfigRecordId || null,
    programInstanceSchoolYear: programInstanceSchoolYear ?? null,
    enrollmentSchoolYear: enrollmentSchoolYear ?? null,
    testSeasonOverrideProvided: Object.prototype.hasOwnProperty.call(
      input,
      "testSeasonOverride"
    ),
    testSeasonOverride: Object.prototype.hasOwnProperty.call(input, "testSeasonOverride")
      ? testSeasonOverride ?? null
      : null,
    calendarYearUsed: false,
    firstRecordFallbackUsed: false,
  };

  const indexed = indexConfigRowsByYear(configRows);
  debug.index = indexed.debug;
  if (!indexed.ok) {
    return {
      ok: false,
      error: { code: indexed.code, message: indexed.message },
      debug,
    };
  }

  // --- 1. Explicit record ID override ---
  if (explicitConfigRecordId != null && String(explicitConfigRecordId).trim() !== "") {
    const id = String(explicitConfigRecordId).trim();
    if (!id.startsWith("rec")) {
      return {
        ok: false,
        error: {
          code: "invalid_explicit_config_id",
          message: `explicitConfigRecordId must be an Airtable record id (rec…); got "${id}".`,
        },
        debug,
      };
    }

    const match = configRows.find((row) => row && row.id === id);
    if (!match) {
      return {
        ok: false,
        error: {
          code: "explicit_config_not_found",
          message: `No Config row with id ${id}.`,
        },
        debug,
      };
    }

    const yearNorm = normalizeSchoolYear(
      match.activeSchoolYear != null
        ? match.activeSchoolYear
        : match.fields && match.fields["Active School Year"]
    );

    return {
      ok: true,
      config: match,
      configRecordId: match.id,
      schoolYearKey: yearNorm.ok ? yearNorm.key : null,
      selectionSource: "explicit_config_record_id",
      debug: {
        ...debug,
        selectedId: match.id,
        selectedYear: yearNorm.ok ? yearNorm.key : null,
      },
    };
  }

  // --- Year key resolution (steps 2–4) ---
  const hasPi =
    programInstanceSchoolYear != null &&
    String(programInstanceSchoolYear).trim() !== "";
  const hasEnr =
    enrollmentSchoolYear != null && String(enrollmentSchoolYear).trim() !== "";
  const hasTest =
    Object.prototype.hasOwnProperty.call(input, "testSeasonOverride") &&
    testSeasonOverride != null &&
    String(testSeasonOverride).trim() !== "";

  let piKey = null;
  let enrKey = null;
  let testKey = null;

  if (hasPi) {
    const n = normalizeSchoolYear(programInstanceSchoolYear);
    if (!n.ok) {
      return {
        ok: false,
        error: {
          code: n.code,
          message: `Program Instance school year: ${n.message}`,
        },
        debug,
      };
    }
    piKey = n.key;
  }

  if (hasEnr) {
    const n = normalizeSchoolYear(enrollmentSchoolYear);
    if (!n.ok) {
      return {
        ok: false,
        error: {
          code: n.code,
          message: `Enrollment school year: ${n.message}`,
        },
        debug,
      };
    }
    enrKey = n.key;
  }

  if (hasPi && hasEnr && piKey !== enrKey) {
    return {
      ok: false,
      error: {
        code: "enrollment_program_instance_mismatch",
        message: `Enrollment school year (${enrKey}) does not match Program Instance school year (${piKey}).`,
      },
      debug: { ...debug, piKey, enrKey },
    };
  }

  if (hasTest) {
    const n = normalizeSchoolYear(testSeasonOverride);
    if (!n.ok) {
      return {
        ok: false,
        error: {
          code: n.code,
          message: `testSeasonOverride: ${n.message}`,
        },
        debug,
      };
    }
    testKey = n.key;
  }

  let schoolYearKey = null;
  let selectionSource = null;

  if (piKey) {
    schoolYearKey = piKey;
    selectionSource = "program_instance_school_year";
  } else if (enrKey) {
    schoolYearKey = enrKey;
    selectionSource = "enrollment_school_year";
  } else if (testKey) {
    schoolYearKey = testKey;
    selectionSource = "test_season_override";
  } else {
    return {
      ok: false,
      error: {
        code: "missing_school_year",
        message:
          "No school year available. Provide Program Instance school year, Enrollment School Year, explicit Config record id, or an explicit testSeasonOverride.",
      },
      debug,
    };
  }

  const matches = [];
  for (const [year, row] of indexed.byYear.entries()) {
    if (year === schoolYearKey) matches.push(row);
  }

  if (matches.length === 0) {
    return {
      ok: false,
      error: {
        code: "config_year_not_found",
        message: `No Config row for school year ${schoolYearKey}.`,
      },
      debug: {
        ...debug,
        schoolYearKey,
        selectionSource,
        availableYears: Array.from(indexed.byYear.keys()),
      },
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      error: {
        code: "duplicate_school_year",
        message: `Multiple Config rows matched school year ${schoolYearKey}.`,
      },
      debug: {
        ...debug,
        schoolYearKey,
        selectionSource,
        matchedIds: matches.map((r) => r.id || null),
      },
    };
  }

  const config = matches[0];
  return {
    ok: true,
    config,
    configRecordId: config.id || null,
    schoolYearKey,
    selectionSource,
    debug: {
      ...debug,
      schoolYearKey,
      selectionSource,
      selectedId: config.id || null,
      availableYears: Array.from(indexed.byYear.keys()),
    },
  };
}

module.exports = {
  normalizeSchoolYear,
  indexConfigRowsByYear,
  resolveConfig,
};
