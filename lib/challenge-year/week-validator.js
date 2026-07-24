/**
 * Week plan / exported Weeks validation.
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const {
  toDateKey,
  compareDateKeys,
  addDays,
  rangesOverlap,
  weekdaySunday0,
} = require("./dates");
const {
  buildCanonicalWeekKey,
  parseCanonicalWeekKey,
  classifyWeekType,
  weekOrdinal,
  expectedDisplayLabel,
  validateSundaySaturday,
} = require("./week-keys");

function finding(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra };
}

function summarize(findings) {
  if (findings.some((f) => f.severity === "FAIL")) return "FAIL";
  if (findings.some((f) => f.severity === "WARNING")) return "PASS WITH WARNINGS";
  return "PASS";
}

/**
 * Normalize a week row from generator, CSV, or fixture.
 * @param {object} row
 */
function normalizeWeekRow(row = {}) {
  const displayLabel = String(
    row.displayLabel || row.weekName || row["Week Name"] || ""
  ).trim();
  const startDate = toDateKey(row.startDate || row["Start Date"]);
  const endDate = toDateKey(row.endDate || row["End Date"]);
  const weekType = classifyWeekType(
    displayLabel,
    row.weekType || row["Week Type"]
  );
  const challengeYearRaw =
    row.challengeYear || row["Challenge Year"] || row.schoolYear || "";
  let challengeYear = null;
  if (challengeYearRaw) {
    const y = normalizeSchoolYear(challengeYearRaw);
    challengeYear = y.ok ? y.key : String(challengeYearRaw).trim();
  }
  let weekKey = String(row.weekKey || row["Week Key"] || "").trim();
  if (!weekKey && challengeYear && displayLabel) {
    const built = buildCanonicalWeekKey(challengeYear, displayLabel);
    if (built.ok) weekKey = built.weekKey;
  }
  const weekEndKey = toDateKey(
    row.weekEndKey || row["Week End Key"] || endDate
  );
  const sequenceRaw = row.sequence ?? row.Sequence ?? row.ordinal;
  const sequence =
    sequenceRaw === "" || sequenceRaw == null ? null : Number(sequenceRaw);
  const configRecordId =
    row.configRecordId || row["Config Record ID"] || row.configId || null;
  const isCurrent = Boolean(row.isCurrent || row.current || row["Current?"]);
  const historical = Boolean(row.historical || row["Historical?"]);

  return {
    id: row.id || row.recordId || null,
    displayLabel,
    weekName: displayLabel,
    startDate,
    endDate,
    weekType,
    ordinal: weekOrdinal(displayLabel, weekType),
    challengeYear,
    weekKey,
    weekEndKey,
    sequence: Number.isFinite(sequence) ? sequence : null,
    configRecordId,
    isCurrent,
    historical,
    raw: row,
  };
}

/**
 * @param {object[]} rows
 * @param {object} [options]
 */
function validateWeekPlan(rows = [], options = {}) {
  const findings = [];
  const weeks = (Array.isArray(rows) ? rows : []).map(normalizeWeekRow);
  const challengeYear = options.challengeYear
    ? normalizeSchoolYear(options.challengeYear)
    : null;
  if (options.challengeYear && challengeYear && !challengeYear.ok) {
    findings.push(
      finding("FAIL", "malformed_challenge_year", challengeYear.message)
    );
  }
  const yearKey = challengeYear && challengeYear.ok ? challengeYear.key : null;
  const expectedRegular =
    options.expectedRegularWeeks == null
      ? null
      : Number(options.expectedRegularWeeks);
  const requireWeekZero = options.requireWeekZero !== false;
  const requirePostChallenge = options.requirePostChallenge !== false;
  const expectedConfigId = options.configRecordId || null;

  if (weeks.length === 0) {
    findings.push(finding("FAIL", "no_weeks", "No Week rows provided."));
    return { overall: "FAIL", findings, weeks };
  }

  const week0 = weeks.filter((w) => w.weekType === "week_0");
  const regular = weeks.filter((w) => w.weekType === "regular");
  const post = weeks.filter((w) => w.weekType === "post_challenge");

  if (requireWeekZero && week0.length === 0) {
    findings.push(finding("FAIL", "missing_week_0", "Missing Week 0."));
  }
  if (week0.length > 1) {
    findings.push(
      finding("FAIL", "duplicate_week_0", `Multiple Week 0 rows (${week0.length}).`)
    );
  }
  if (requirePostChallenge && post.length === 0) {
    findings.push(
      finding("FAIL", "missing_post_challenge", "Missing Post-Challenge week.")
    );
  }
  if (post.length > 1) {
    findings.push(
      finding(
        "WARNING",
        "multiple_post_challenge",
        `Multiple Post-Challenge rows (${post.length}). Canonical plan uses one.`
      )
    );
  }

  if (expectedRegular != null) {
    const ordinals = new Set(regular.map((w) => w.ordinal).filter((n) => n != null));
    for (let n = 1; n <= expectedRegular; n += 1) {
      if (!ordinals.has(n)) {
        findings.push(
          finding("FAIL", "missing_regular_week", `Missing Week ${n}.`)
        );
      }
    }
  }

  const weekKeys = new Map();
  const endKeys = new Map();
  let currentCount = 0;

  const ordered = [...weeks].sort((a, b) => {
    if (a.startDate && b.startDate) return compareDateKeys(a.startDate, b.startDate);
    return (a.sequence || 0) - (b.sequence || 0);
  });

  for (let i = 0; i < ordered.length; i += 1) {
    const w = ordered[i];
    const label = w.displayLabel || `row[${i}]`;

    if (!w.displayLabel) {
      findings.push(finding("FAIL", "blank_week_label", "Week display label blank.", { label }));
      continue;
    }
    if (!w.startDate || !w.endDate) {
      findings.push(
        finding("FAIL", "malformed_dates", `${label}: Start/End Date missing or malformed.`, {
          label,
        })
      );
      continue;
    }
    if (compareDateKeys(w.endDate, w.startDate) < 0) {
      findings.push(
        finding("FAIL", "end_before_start", `${label}: End before Start.`, { label })
      );
    }

    for (const f of validateSundaySaturday(w.startDate, w.endDate)) {
      findings.push({ ...f, label });
    }

    if (yearKey && w.challengeYear && w.challengeYear !== yearKey) {
      findings.push(
        finding(
          "FAIL",
          "wrong_challenge_year_prefix",
          `${label}: challenge year ${w.challengeYear} != expected ${yearKey}.`,
          { label }
        )
      );
    }

    if (w.weekKey) {
      const parsed = parseCanonicalWeekKey(w.weekKey);
      if (!parsed.ok) {
        // RECORD_ID-shaped keys are a known live schema state — warn, don't fail hard
        // unless options.requireCanonicalWeekKey.
        const severity = options.requireCanonicalWeekKey ? "FAIL" : "WARNING";
        findings.push(
          finding(severity, parsed.code, `${label}: ${parsed.message}`, { label })
        );
      } else {
        if (yearKey && parsed.challengeYear !== yearKey) {
          findings.push(
            finding(
              "FAIL",
              "wrong_challenge_year_prefix",
              `${label}: Week Key year ${parsed.challengeYear} != ${yearKey}.`,
              { label }
            )
          );
        }
        const expected = expectedDisplayLabel(
          w.weekType === "unknown" ? classifyWeekType(parsed.displayLabel) : w.weekType,
          w.ordinal == null ? weekOrdinal(parsed.displayLabel) : w.ordinal
        );
        if (
          w.weekType !== "unknown" &&
          parsed.displayLabel !== w.displayLabel &&
          parsed.displayLabel !== expected
        ) {
          findings.push(
            finding(
              "FAIL",
              "display_label_mismatch",
              `${label}: Week Key label "${parsed.displayLabel}" != display "${w.displayLabel}".`,
              { label }
            )
          );
        }
      }
      if (weekKeys.has(w.weekKey)) {
        findings.push(
          finding("FAIL", "duplicate_week_key", `Duplicate Week Key "${w.weekKey}".`, {
            label,
          })
        );
      } else {
        weekKeys.set(w.weekKey, w);
      }
    } else if (options.requireCanonicalWeekKey) {
      findings.push(
        finding("FAIL", "missing_week_key", `${label}: Week Key missing.`, { label })
      );
    }

    if (w.weekEndKey) {
      if (endKeys.has(w.weekEndKey)) {
        findings.push(
          finding(
            "FAIL",
            "duplicate_week_end_key",
            `Duplicate Week End Key "${w.weekEndKey}".`,
            { label }
          )
        );
      } else {
        endKeys.set(w.weekEndKey, w);
      }
      if (w.endDate && w.weekEndKey !== w.endDate) {
        findings.push(
          finding(
            "FAIL",
            "week_end_key_mismatch",
            `${label}: Week End Key ${w.weekEndKey} != End Date ${w.endDate}.`,
            { label }
          )
        );
      }
    }

    if (expectedConfigId && w.configRecordId && w.configRecordId !== expectedConfigId) {
      findings.push(
        finding(
          "FAIL",
          "wrong_config_link",
          `${label}: Config ${w.configRecordId} != expected ${expectedConfigId}.`,
          { label }
        )
      );
    }

    if (w.weekType === "regular" && w.ordinal != null) {
      const expectedLabel = expectedDisplayLabel("regular", w.ordinal);
      if (w.displayLabel !== expectedLabel) {
        findings.push(
          finding(
            "FAIL",
            "week_number_mismatch",
            `${label}: display "${w.displayLabel}" does not match ordinal Week ${w.ordinal}.`,
            { label }
          )
        );
      }
    }

    if (w.isCurrent) currentCount += 1;
    if (w.isCurrent && w.historical) {
      findings.push(
        finding(
          "FAIL",
          "historical_marked_current",
          `${label}: historical Week incorrectly marked current.`,
          { label }
        )
      );
    }
  }

  if (currentCount > 1) {
    findings.push(
      finding(
        "FAIL",
        "multiple_current_weeks",
        `Multiple Weeks marked current (${currentCount}).`
      )
    );
  }

  // Overlaps + gaps + chronological order
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i];
      const b = ordered[j];
      if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) continue;
      if (rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
        findings.push(
          finding(
            "FAIL",
            "overlapping_date_ranges",
            `"${a.displayLabel}" overlaps "${b.displayLabel}".`
          )
        );
      }
    }
  }

  for (let i = 0; i < ordered.length - 1; i += 1) {
    const a = ordered[i];
    const b = ordered[i + 1];
    if (!a.endDate || !b.startDate) continue;
    const expectedNext = addDays(a.endDate, 1);
    if (compareDateKeys(b.startDate, a.startDate) < 0) {
      findings.push(
        finding(
          "FAIL",
          "invalid_chronological_order",
          `"${b.displayLabel}" starts before "${a.displayLabel}".`
        )
      );
    }
    if (compareDateKeys(b.startDate, expectedNext) > 0) {
      findings.push(
        finding(
          "FAIL",
          "gap_between_weeks",
          `Gap between "${a.displayLabel}" (ends ${a.endDate}) and "${b.displayLabel}" (starts ${b.startDate}).`
        )
      );
    }
  }

  return {
    overall: summarize(findings),
    findings,
    weeks,
    counts: {
      total: weeks.length,
      week0: week0.length,
      regular: regular.length,
      postChallenge: post.length,
      current: currentCount,
    },
  };
}

module.exports = {
  normalizeWeekRow,
  validateWeekPlan,
  summarizeFindings: summarize,
};
