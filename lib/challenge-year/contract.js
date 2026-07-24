/**
 * Canonical Challenge-Year Config contract.
 *
 * Separates:
 * 1) existing verified Airtable fields (schema snapshot evidence)
 * 2) repository-only normalized properties
 * 3) proposed production fields (not live unless Mike authorizes schema)
 *
 * Extends year-aware Config selection:
 * docs/next-wave/config-selection/CONFIG-SELECTION-CONTRACT.md
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const { toDateKey, compareDateKeys, rangesOverlap } = require("./dates");

/** Verified existing Config table fields (PROD schema 20260723-post-ts). */
const EXISTING_CONFIG_FIELDS = Object.freeze({
  activeSchoolYear: "Active School Year", // primary
  challengeWeekCount: "Challenge Week Count",
  maxVideosPerSubmission: "Max Videos Per Submission",
  submissionXpActive: "Submission XP Active?",
  activeXpRuleSet: "Active XP Rule Set",
  recordingPathEnabled: "Recording Path Enabled?",
  recordingMakeupEnabled: "Recording Makeup Enabled?",
});

/** Verified Program Instance - Synced fields used as season calendar source. */
const EXISTING_PROGRAM_INSTANCE_FIELDS = Object.freeze({
  name: "Name - Program Instance",
  schoolYearLinked: "School Year - Linked",
  startDate: "Start Date",
  endDate: "End Date",
  registrationOpen: "Registration Open",
  registrationCloses: "Registration Closes",
  status: "Status",
});

/** Verified Weeks fields. */
const EXISTING_WEEKS_FIELDS = Object.freeze({
  weekName: "Week Name", // primary / display label
  startDate: "Start Date",
  endDate: "End Date",
  weekKey: "Week Key", // formula RECORD_ID() today
  programInstance: "Program Instance",
});

/**
 * Proposed production fields — do NOT create without Mike authorization.
 * Engine accepts them when present on fixtures / future schema.
 */
const PROPOSED_CONFIG_FIELDS = Object.freeze({
  status: "Challenge Year Status",
  startDate: "Challenge Start Date",
  endDate: "Challenge End Date",
  enrollmentOpen: "Enrollment Open Date",
  enrollmentClose: "Enrollment Close Date",
  weekZeroStart: "Week 0 Start Date",
  weekZeroEnd: "Week 0 End Date",
  postChallengeStart: "Post-Challenge Start Date",
  postChallengeEnd: "Post-Challenge End Date",
  timezone: "Challenge Timezone",
  isCurrent: "Current Challenge Year?",
  testMode: "Test Mode?",
  emailScheduleEnabled: "Email Schedule Enabled?",
  xpEnabled: "XP Enabled?",
  achievementsEnabled: "Achievements Enabled?",
  rolloverState: "Rollover State",
  priorConfig: "Prior Config",
  nextConfig: "Next Config",
  canonicalWeekKeyFormulaNote:
    "Propose Weeks.Challenge Week Key text/formula = {School Year}|{Week Name}; keep current Week Key=RECORD_ID() until cutover.",
  weekEndKeyNote:
    "Propose Weeks.Week End Key formula = DATETIME_FORMAT(SET_TIMEZONE({End Date}, 'America/Denver'), 'YYYY-MM-DD').",
});

const ROLLOVER_STATES = Object.freeze([
  "not_started",
  "planning",
  "weeks_seeded",
  "preflight_pass",
  "activated",
  "archived",
]);

const RESOLUTION_STATUSES = Object.freeze([
  "resolved",
  "unresolved",
  "ambiguous",
  "historical",
  "test_only",
  "invalid_configuration",
]);

/**
 * Normalize a raw Config / Program Instance / fixture blob into the contract.
 *
 * @param {object} raw
 * @returns {{ ok: true, config: object } | { ok: false, code: string, message: string, findings?: object[] }}
 */
function normalizeChallengeYearConfig(raw = {}) {
  const findings = [];
  const fields = raw.fields && typeof raw.fields === "object" ? raw.fields : {};

  const pick = (...keys) => {
    for (const key of keys) {
      if (raw[key] != null && raw[key] !== "") return raw[key];
      if (fields[key] != null && fields[key] !== "") return fields[key];
    }
    return null;
  };

  const id = pick("id", "configRecordId", "configId");
  const yearRaw = pick(
    "challengeYear",
    "challengeYearLabel",
    "activeSchoolYear",
    "schoolYear",
    EXISTING_CONFIG_FIELDS.activeSchoolYear,
    EXISTING_PROGRAM_INSTANCE_FIELDS.schoolYearLinked
  );
  const year = normalizeSchoolYear(yearRaw);
  if (!year.ok) {
    return {
      ok: false,
      code: year.code,
      message: `Challenge-year label: ${year.message}`,
      findings,
    };
  }

  const timezone = String(
    pick("timezone", PROPOSED_CONFIG_FIELDS.timezone) || "America/Denver"
  ).trim();
  if (timezone !== "America/Denver") {
    findings.push({
      severity: "WARNING",
      code: "non_denver_timezone",
      message: `Timezone "${timezone}" differs from production default America/Denver.`,
    });
  }

  const startDate = toDateKey(
    pick(
      "startDate",
      PROPOSED_CONFIG_FIELDS.startDate,
      EXISTING_PROGRAM_INSTANCE_FIELDS.startDate
    ),
    timezone
  );
  const endDate = toDateKey(
    pick(
      "endDate",
      PROPOSED_CONFIG_FIELDS.endDate,
      EXISTING_PROGRAM_INSTANCE_FIELDS.endDate
    ),
    timezone
  );
  const enrollmentOpenDate = toDateKey(
    pick(
      "enrollmentOpenDate",
      "enrollmentOpen",
      PROPOSED_CONFIG_FIELDS.enrollmentOpen,
      EXISTING_PROGRAM_INSTANCE_FIELDS.registrationOpen
    ),
    timezone
  );
  const enrollmentCloseDate = toDateKey(
    pick(
      "enrollmentCloseDate",
      "enrollmentClose",
      PROPOSED_CONFIG_FIELDS.enrollmentClose,
      EXISTING_PROGRAM_INSTANCE_FIELDS.registrationCloses
    ),
    timezone
  );
  const weekZeroStart = toDateKey(
    pick("weekZeroStart", "weekZeroStartDate", PROPOSED_CONFIG_FIELDS.weekZeroStart),
    timezone
  );
  const weekZeroEnd = toDateKey(
    pick("weekZeroEnd", "weekZeroEndDate", PROPOSED_CONFIG_FIELDS.weekZeroEnd),
    timezone
  );
  const postChallengeStart = toDateKey(
    pick(
      "postChallengeStart",
      "postChallengeStartDate",
      PROPOSED_CONFIG_FIELDS.postChallengeStart
    ),
    timezone
  );
  const postChallengeEnd = toDateKey(
    pick(
      "postChallengeEnd",
      "postChallengeEndDate",
      PROPOSED_CONFIG_FIELDS.postChallengeEnd
    ),
    timezone
  );

  let regularWeekCount = pick(
    "regularWeekCount",
    "challengeWeekCount",
    EXISTING_CONFIG_FIELDS.challengeWeekCount
  );
  if (regularWeekCount != null && regularWeekCount !== "") {
    regularWeekCount = Number(regularWeekCount);
    if (!Number.isInteger(regularWeekCount) || regularWeekCount < 1) {
      return {
        ok: false,
        code: "invalid_regular_week_count",
        message: "regularWeekCount / Challenge Week Count must be a positive integer.",
        findings,
      };
    }
  } else {
    regularWeekCount = null;
  }

  const status = String(
    pick("status", PROPOSED_CONFIG_FIELDS.status, EXISTING_PROGRAM_INSTANCE_FIELDS.status) ||
      ""
  ).trim();

  const isCurrent = Boolean(
    pick("isCurrent", "current", PROPOSED_CONFIG_FIELDS.isCurrent)
  );
  const testMode = Boolean(pick("testMode", "isTest", PROPOSED_CONFIG_FIELDS.testMode));
  const emailScheduleEnabled = Boolean(
    pick("emailScheduleEnabled", PROPOSED_CONFIG_FIELDS.emailScheduleEnabled)
  );
  const xpEnabled = pick("xpEnabled", PROPOSED_CONFIG_FIELDS.xpEnabled);
  const achievementsEnabled = pick(
    "achievementsEnabled",
    PROPOSED_CONFIG_FIELDS.achievementsEnabled
  );

  let rolloverState = String(
    pick("rolloverState", PROPOSED_CONFIG_FIELDS.rolloverState) || "not_started"
  )
    .trim()
    .toLowerCase();
  if (!ROLLOVER_STATES.includes(rolloverState)) {
    findings.push({
      severity: "WARNING",
      code: "unknown_rollover_state",
      message: `Unknown rolloverState "${rolloverState}"; treating as not_started.`,
    });
    rolloverState = "not_started";
  }

  if (startDate && endDate && compareDateKeys(endDate, startDate) < 0) {
    return {
      ok: false,
      code: "invalid_date_range",
      message: `endDate ${endDate} is before startDate ${startDate}.`,
      findings,
    };
  }

  const config = {
    // identity
    configRecordId: id && String(id).startsWith("rec") ? String(id) : id || null,
    challengeYearLabel: year.key,
    canonicalKeyFormat: "{challengeYear}|{Week Name}",
    timezone,

    // calendar
    status: status || null,
    startDate: startDate || null,
    endDate: endDate || null,
    enrollmentOpenDate: enrollmentOpenDate || null,
    enrollmentCloseDate: enrollmentCloseDate || null,
    weekZeroStart: weekZeroStart || null,
    weekZeroEnd: weekZeroEnd || null,
    regularWeekCount,
    postChallengeStart: postChallengeStart || null,
    postChallengeEnd: postChallengeEnd || null,

    // flags
    isCurrent,
    testMode,
    emailScheduleEnabled,
    xpEnabled: xpEnabled == null ? null : Boolean(xpEnabled),
    achievementsEnabled:
      achievementsEnabled == null ? null : Boolean(achievementsEnabled),
    rolloverState,
    priorConfigId: pick("priorConfigId", "priorConfig", PROPOSED_CONFIG_FIELDS.priorConfig),
    nextConfigId: pick("nextConfigId", "nextConfig", PROPOSED_CONFIG_FIELDS.nextConfig),

    // provenance
    fieldProvenance: {
      existingConfigFields: EXISTING_CONFIG_FIELDS,
      existingProgramInstanceFields: EXISTING_PROGRAM_INSTANCE_FIELDS,
      existingWeeksFields: EXISTING_WEEKS_FIELDS,
      proposedConfigFields: PROPOSED_CONFIG_FIELDS,
    },
    raw,
  };

  return { ok: true, config, findings };
}

/**
 * Detect overlapping challenge date ranges among normalized configs.
 * @param {object[]} configs
 */
function findOverlappingConfigs(configs = []) {
  const overlaps = [];
  for (let i = 0; i < configs.length; i += 1) {
    for (let j = i + 1; j < configs.length; j += 1) {
      const a = configs[i];
      const b = configs[j];
      if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) continue;
      if (rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
        overlaps.push({
          a: {
            id: a.configRecordId,
            year: a.challengeYearLabel,
            startDate: a.startDate,
            endDate: a.endDate,
          },
          b: {
            id: b.configRecordId,
            year: b.challengeYearLabel,
            startDate: b.startDate,
            endDate: b.endDate,
          },
        });
      }
    }
  }
  return overlaps;
}

/**
 * Count configs marked current / active for fail-closed guards.
 * @param {object[]} configs
 */
function findCurrentConfigs(configs = []) {
  return configs.filter((c) => c && (c.isCurrent === true || /^(in progress|registering|current)$/i.test(String(c.status || ""))));
}

module.exports = {
  EXISTING_CONFIG_FIELDS,
  EXISTING_PROGRAM_INSTANCE_FIELDS,
  EXISTING_WEEKS_FIELDS,
  PROPOSED_CONFIG_FIELDS,
  ROLLOVER_STATES,
  RESOLUTION_STATUSES,
  normalizeChallengeYearConfig,
  findOverlappingConfigs,
  findCurrentConfigs,
};
