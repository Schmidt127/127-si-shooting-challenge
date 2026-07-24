#!/usr/bin/env node
/**
 * Challenge-Year Configuration and Season Rollover Engine — tests
 * Run: node tests/challenge-year/challenge-year-engine.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  normalizeSchoolYear,
  normalizeChallengeYearConfig,
  resolveChallengeYearConfig,
  assertSingleCurrentConfig,
  findOverlappingConfigs,
  generateWeekPlan,
  generateWeekPlanFromConfig,
  weeksToCsv,
  weeksToMarkdown,
  validateWeekPlan,
  resolveWeekForActivityDate,
  validateEnrollmentsForChallengeYear,
  validateWeeklyAthleteSummaries,
  runRolloverPreflight,
  generateRolloverManifest,
  toDateKey,
  weekdaySunday0,
  addDays,
  buildCanonicalWeekKey,
  parseCanonicalWeekKey,
  PROPOSED_CONFIG_FIELDS,
} = require("../../lib/challenge-year");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL - ${name}`);
    console.error(`  ${error && error.stack ? error.stack : error}`);
  }
}

const FIXTURES = path.join(__dirname, "..", "fixtures", "challenge-year");
const validConfigs = JSON.parse(
  fs.readFileSync(path.join(FIXTURES, "configs-valid.json"), "utf8")
).configRows;
const preflightPass = JSON.parse(
  fs.readFileSync(path.join(FIXTURES, "rollover-preflight-pass.json"), "utf8")
);

// ---------------------------------------------------------------------------
// Contract / normalization
// ---------------------------------------------------------------------------

test("normalizeSchoolYear accepts en-dash challenge year", () => {
  const r = normalizeSchoolYear("2026–2027");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.key, "2026-2027");
});

test("normalizeChallengeYearConfig maps verified + proposed fields", () => {
  const r = normalizeChallengeYearConfig(validConfigs[1]);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.config.challengeYearLabel, "2026-2027");
  assert.strictEqual(r.config.regularWeekCount, 9);
  assert.strictEqual(r.config.timezone, "America/Denver");
  assert.strictEqual(r.config.isCurrent, true);
  assert.ok(r.config.fieldProvenance.proposedConfigFields.weekEndKeyNote);
  assert.ok(PROPOSED_CONFIG_FIELDS.rolloverState);
});

test("normalizeChallengeYearConfig rejects end before start", () => {
  const r = normalizeChallengeYearConfig({
    activeSchoolYear: "2027-2028",
    startDate: "2027-08-01",
    endDate: "2027-05-01",
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, "invalid_date_range");
});

test("findOverlappingConfigs detects overlap", () => {
  const a = normalizeChallengeYearConfig({
    id: "recA",
    activeSchoolYear: "2026-2027",
    startDate: "2026-05-01",
    endDate: "2026-07-01",
  }).config;
  const b = normalizeChallengeYearConfig({
    id: "recB",
    activeSchoolYear: "2027-2028",
    startDate: "2026-06-15",
    endDate: "2026-08-01",
  }).config;
  const overlaps = findOverlappingConfigs([a, b]);
  assert.strictEqual(overlaps.length, 1);
});

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

test("resolve by explicit Config record ID", () => {
  const r = resolveChallengeYearConfig({
    configRows: validConfigs,
    explicitConfigRecordId: "recNEWCONFIG000001",
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, "resolved");
  assert.strictEqual(r.challengeYearLabel, "2026-2027");
  assert.strictEqual(r.selectionSource, "explicit_config_record_id");
});

test("resolve by Enrollment school year", () => {
  const r = resolveChallengeYearConfig({
    configRows: validConfigs,
    enrollmentSchoolYear: "2025-2026",
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, "historical");
  assert.strictEqual(r.challengeYearLabel, "2025-2026");
});

test("resolve by Week-linked Config", () => {
  const r = resolveChallengeYearConfig({
    configRows: validConfigs,
    weekConfigRecordId: "recTESTCONFIG00001",
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, "test_only");
});

test("resolve current active Config", () => {
  const r = resolveChallengeYearConfig({
    configRows: validConfigs,
    requireCurrent: true,
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.configRecordId, "recNEWCONFIG000001");
});

test("multiple active Configs → ambiguous", () => {
  const rows = [
    { ...validConfigs[1], isCurrent: true },
    {
      id: "recANOTHERCURRENT01",
      activeSchoolYear: "2028-2029",
      startDate: "2028-05-28",
      endDate: "2028-08-12",
      isCurrent: true,
      status: "In Progress",
    },
  ];
  const r = resolveChallengeYearConfig({ configRows: rows, requireCurrent: true });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, "ambiguous");
  assert.strictEqual(r.error.code, "multiple_active_configs");
});

test("overlapping Configs for date → ambiguous / invalid", () => {
  const rows = [
    {
      id: "recA",
      activeSchoolYear: "2026-2027",
      startDate: "2026-05-01",
      endDate: "2026-07-15",
    },
    {
      id: "recB",
      activeSchoolYear: "2027-2028",
      startDate: "2026-06-01",
      endDate: "2026-08-01",
    },
  ];
  const r = resolveChallengeYearConfig({
    configRows: rows,
    asOfDate: "2026-06-15",
  });
  assert.strictEqual(r.ok, false);
  assert.ok(["ambiguous", "invalid_configuration"].includes(r.status));
});

test("date-based resolution unique match", () => {
  const r = resolveChallengeYearConfig({
    configRows: [
      {
        id: "recONLY",
        activeSchoolYear: "2026-2027",
        startDate: "2026-05-31",
        endDate: "2026-08-15",
        isCurrent: false,
      },
    ],
    asOfDate: "2026-06-10",
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.selectionSource, "as_of_date");
});

test("no matching Config → unresolved", () => {
  const r = resolveChallengeYearConfig({
    configRows: validConfigs,
    enrollmentSchoolYear: "2099-2100",
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, "unresolved");
});

test("test-only filter", () => {
  const r = resolveChallengeYearConfig({
    configRows: validConfigs,
    testModeOnly: true,
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, "test_only");
  assert.strictEqual(r.challengeYearLabel, "2027-2028");
});

test("assertSingleCurrentConfig refuses multiples", () => {
  const r = assertSingleCurrentConfig([
    { id: "rec1", activeSchoolYear: "2026-2027", isCurrent: true, status: "In Progress" },
    { id: "rec2", activeSchoolYear: "2027-2028", isCurrent: true, status: "In Progress" },
  ]);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, "multiple_active_configs");
});

test("never picks first record silently when year missing", () => {
  const r = resolveChallengeYearConfig({ configRows: validConfigs });
  // without requireCurrent and without year/date — unresolved (or current if heuristic)
  // Engine may resolve unique current; with one current that is ok. Force no currents:
  const rows = validConfigs.map((c) => ({ ...c, isCurrent: false, status: "Planning" }));
  const r2 = resolveChallengeYearConfig({ configRows: rows });
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.status, "unresolved");
  assert.ok(r.ok === true || r.ok === false); // touch r
});

// ---------------------------------------------------------------------------
// Week keys / generation
// ---------------------------------------------------------------------------

test("canonical Week Key format", () => {
  const k = buildCanonicalWeekKey("2026-2027", "Week 0");
  assert.strictEqual(k.ok, true);
  assert.strictEqual(k.weekKey, "2026-2027|Week 0");
  const parsed = parseCanonicalWeekKey("2026-2027|Post-Challenge");
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.displayLabel, "Post-Challenge");
});

test("RECORD_ID-shaped Week Key rejected as canonical", () => {
  const parsed = parseCanonicalWeekKey("recVDKiYATgzsfpmE");
  assert.strictEqual(parsed.ok, false);
  assert.strictEqual(parsed.code, "record_id_week_key");
});

test("generate Week 0 + regular + Post-Challenge Sunday/Saturday", () => {
  // 2027-05-30 is Sunday
  assert.strictEqual(weekdaySunday0("2027-05-30"), 0);
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 8,
    configRecordId: "recNEWCONFIG202728",
  });
  assert.strictEqual(plan.ok, true);
  assert.strictEqual(plan.weeks[0].displayLabel, "Week 0");
  assert.strictEqual(plan.weeks[0].startDate, "2027-05-30");
  assert.strictEqual(plan.weeks[0].endDate, "2027-06-05");
  assert.strictEqual(plan.weeks[1].displayLabel, "Week 1");
  assert.strictEqual(plan.weeks[8].displayLabel, "Week 8");
  const post = plan.weeks[plan.weeks.length - 1];
  assert.strictEqual(post.displayLabel, "Post-Challenge");
  assert.strictEqual(post.weekKey, "2027-2028|Post-Challenge");
  for (const w of plan.weeks) {
    assert.strictEqual(weekdaySunday0(w.startDate), 0);
    assert.strictEqual(weekdaySunday0(w.endDate), 6);
  }
});

test("generator rejects non-Sunday week-zero start", () => {
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-31",
    regularWeeks: 8,
  });
  assert.strictEqual(plan.ok, false);
  assert.strictEqual(plan.error.code, "week_zero_start_not_sunday");
});

test("generate from config fixture", () => {
  const plan = generateWeekPlanFromConfig(preflightPass.newConfig);
  assert.strictEqual(plan.ok, true);
  assert.ok(plan.weeks.length >= 10);
});

test("CSV and Markdown outputs include keys", () => {
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 2,
  });
  const csv = weeksToCsv(plan.weeks);
  assert.ok(csv.includes("Week Key"));
  assert.ok(csv.includes("2027-2028|Week 0"));
  const md = weeksToMarkdown(plan);
  assert.ok(md.includes("Post-Challenge"));
});

// ---------------------------------------------------------------------------
// Week validation
// ---------------------------------------------------------------------------

test("validate detects missing Week 0 / Post-Challenge / duplicates", () => {
  const bad = [
    {
      displayLabel: "Week 1",
      startDate: "2027-06-06",
      endDate: "2027-06-12",
      weekKey: "2027-2028|Week 1",
      challengeYear: "2027-2028",
    },
    {
      displayLabel: "Week 1",
      startDate: "2027-06-13",
      endDate: "2027-06-19",
      weekKey: "2027-2028|Week 1",
      challengeYear: "2027-2028",
    },
  ];
  const result = validateWeekPlan(bad, {
    challengeYear: "2027-2028",
    expectedRegularWeeks: 2,
    requireCanonicalWeekKey: true,
  });
  assert.strictEqual(result.overall, "FAIL");
  const codes = result.findings.map((f) => f.code);
  assert.ok(codes.includes("missing_week_0"));
  assert.ok(codes.includes("missing_post_challenge"));
  assert.ok(codes.includes("duplicate_week_key"));
});

test("validate detects gaps, overlaps, wrong Sunday/Saturday", () => {
  const weeks = [
    {
      displayLabel: "Week 0",
      startDate: "2027-05-31", // Monday
      endDate: "2027-06-05",
      weekKey: "2027-2028|Week 0",
      challengeYear: "2027-2028",
      weekType: "week_0",
    },
    {
      displayLabel: "Week 1",
      startDate: "2027-06-13", // gap
      endDate: "2027-06-19",
      weekKey: "2027-2028|Week 1",
      challengeYear: "2027-2028",
    },
  ];
  const result = validateWeekPlan(weeks, {
    challengeYear: "2027-2028",
    requirePostChallenge: false,
    requireWeekZero: true,
  });
  const codes = result.findings.map((f) => f.code);
  assert.ok(codes.includes("start_not_sunday"));
  assert.ok(codes.includes("gap_between_weeks"));
});

test("validate generated plan PASS", () => {
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 8,
  });
  assert.strictEqual(plan.validation.overall, "PASS");
});

test("multiple current Weeks FAIL", () => {
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 1,
  });
  const weeks = plan.weeks.map((w, i) => ({ ...w, isCurrent: i < 2 }));
  const result = validateWeekPlan(weeks, {
    challengeYear: "2027-2028",
    requireCanonicalWeekKey: true,
  });
  assert.ok(result.findings.some((f) => f.code === "multiple_current_weeks"));
});

// ---------------------------------------------------------------------------
// Activity Date → Week
// ---------------------------------------------------------------------------

test("Activity Date Sunday and Saturday boundaries", () => {
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 2,
  });
  const sun = resolveWeekForActivityDate({
    activityDate: "2027-05-30",
    weeks: plan.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(sun.ok, true);
  assert.strictEqual(sun.week.displayLabel, "Week 0");

  const sat = resolveWeekForActivityDate({
    activityDate: "2027-06-05",
    weeks: plan.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(sat.ok, true);
  assert.strictEqual(sat.week.displayLabel, "Week 0");
});

test("midnight / ISO datetime uses America/Denver date key", () => {
  // 2027-06-06T05:59:00Z = 2027-06-05 23:59 MDT Saturday
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 2,
  });
  const r = resolveWeekForActivityDate({
    activityDate: "2027-06-06T05:59:00.000Z",
    weeks: plan.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(toDateKey("2027-06-06T05:59:00.000Z"), "2027-06-05");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.week.displayLabel, "Week 0");
});

test("backdated submission uses Activity Date not Submitted At", () => {
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 2,
  });
  const r = resolveWeekForActivityDate({
    activityDate: "2027-05-30",
    submittedAt: "2027-06-20T18:00:00.000Z",
    weeks: plan.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.week.displayLabel, "Week 0");
  assert.strictEqual(r.debug.submittedAtIgnored, true);
});

test("before Week 0 / after Post-Challenge unresolved", () => {
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 2,
  });
  const before = resolveWeekForActivityDate({
    activityDate: "2027-05-29",
    weeks: plan.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(before.ok, false);
  assert.strictEqual(before.reason, "before_week_0");

  const last = plan.weeks[plan.weeks.length - 1];
  const after = resolveWeekForActivityDate({
    activityDate: addDays(last.endDate, 1),
    weeks: plan.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(after.ok, false);
  assert.strictEqual(after.reason, "after_post_challenge");
});

test("leap year Activity Date resolves", () => {
  // 2028-02-27 is Sunday
  assert.strictEqual(weekdaySunday0("2028-02-27"), 0);
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2028-02-27",
    regularWeeks: 1,
  });
  const r = resolveWeekForActivityDate({
    activityDate: "2028-02-29",
    weeks: plan.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.week.displayLabel, "Week 0");
});

test("year boundary and DST-relevant Denver key", () => {
  // US DST 2027 spring forward Mar 14; use a winter Saturday end datetime.
  assert.strictEqual(toDateKey("2027-01-10T06:59:00.000Z"), "2027-01-09");
  const plan = generateWeekPlan({
    challengeYear: "2026-2027",
    weekZeroStart: "2026-12-27",
    regularWeeks: 2,
  });
  const r = resolveWeekForActivityDate({
    activityDate: "2027-01-01",
    weeks: plan.weeks,
    challengeYear: "2026-2027",
  });
  assert.strictEqual(r.ok, true);
});

test("malformed Activity Date unresolved", () => {
  const r = resolveWeekForActivityDate({
    activityDate: "not-a-date",
    weeks: [{ displayLabel: "Week 0", startDate: "2027-05-30", endDate: "2027-06-05" }],
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "malformed_activity_date");
});

test("cross-year Week match rejected", () => {
  const planA = generateWeekPlan({
    challengeYear: "2026-2027",
    weekZeroStart: "2027-05-30",
    regularWeeks: 1,
  });
  const r = resolveWeekForActivityDate({
    activityDate: "2027-05-30",
    weeks: planA.weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(r.ok, false);
});

test("overlapping weeks → ambiguous", () => {
  const weeks = [
    {
      id: "recW1",
      displayLabel: "Week 0",
      startDate: "2027-05-30",
      endDate: "2027-06-05",
      challengeYear: "2027-2028",
      weekKey: "2027-2028|Week 0",
    },
    {
      id: "recW2",
      displayLabel: "Week 0b",
      startDate: "2027-05-30",
      endDate: "2027-06-05",
      challengeYear: "2027-2028",
      weekKey: "2027-2028|Week 0b",
    },
  ];
  const r = resolveWeekForActivityDate({
    activityDate: "2027-06-01",
    weeks,
    challengeYear: "2027-2028",
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, "ambiguous");
});

// ---------------------------------------------------------------------------
// Enrollment-year validation
// ---------------------------------------------------------------------------

test("enrollment missing Config FAIL", () => {
  const r = validateEnrollmentsForChallengeYear({
    enrollments: [{ id: "recE1", active: true }],
    expectedChallengeYear: "2027-2028",
  });
  assert.strictEqual(r.overall, "FAIL");
  assert.ok(r.findings.some((f) => f.code === "enrollment_missing_config"));
});

test("multiple active enrollments same athlete/year FAIL", () => {
  const r = validateEnrollmentsForChallengeYear({
    enrollments: [
      {
        id: "recE1",
        athleteId: "recATH1",
        schoolYear: "2027-2028",
        configRecordId: "recNEWCONFIG202728",
        active: true,
      },
      {
        id: "recE2",
        athleteId: "recATH1",
        schoolYear: "2027-2028",
        configRecordId: "recNEWCONFIG202728",
        active: true,
      },
    ],
    configs: [preflightPass.newConfig],
    expectedChallengeYear: "2027-2028",
  });
  assert.ok(r.findings.some((f) => f.code === "multiple_active_enrollments_same_year"));
});

test("historical enrollment marked active FAIL", () => {
  const r = validateEnrollmentsForChallengeYear({
    enrollments: [
      {
        id: "recE1",
        schoolYear: "2026-2027",
        active: true,
        historical: true,
        configRecordId: "recOLD",
      },
    ],
  });
  assert.ok(r.findings.some((f) => f.code === "historical_enrollment_marked_active"));
});

test("grade band mismatch + stale goal + level ambiguity", () => {
  const r = validateEnrollmentsForChallengeYear({
    enrollments: [
      {
        id: "recE1",
        athleteId: "recATH",
        schoolYear: "2027-2028",
        configRecordId: "recNEWCONFIG202728",
        active: true,
        gradeBand: "K-2",
        expectedGradeBand: "3-4",
        goalChallengeYear: "2026-2027",
        currentLevelChallengeYear: "2026-2027",
        currentLevelId: "recLVL",
        testSettings: { stale: true },
      },
    ],
    configs: [preflightPass.newConfig],
    levelPolicy: "undocumented",
  });
  const codes = r.findings.map((f) => f.code);
  assert.ok(codes.includes("grade_band_mismatch"));
  assert.ok(codes.includes("stale_goal_record"));
  assert.ok(codes.includes("stale_test_settings"));
  assert.ok(codes.includes("prior_year_current_level_ambiguity"));
  assert.ok(codes.includes("level_policy_undocumented"));
});

test("current enrollment linked to historical week FAIL", () => {
  const r = validateEnrollmentsForChallengeYear({
    enrollments: [
      {
        id: "recE1",
        schoolYear: "2027-2028",
        configRecordId: "recNEWCONFIG202728",
        active: true,
        linkedWeekKeys: ["2026-2027|Week 1"],
      },
    ],
    configs: [preflightPass.newConfig],
  });
  assert.ok(r.findings.some((f) => f.code === "current_enrollment_historical_week"));
});

// ---------------------------------------------------------------------------
// WAS uniqueness
// ---------------------------------------------------------------------------

test("WAS duplicate detection + dry-run repair recommendation", () => {
  const r = validateWeeklyAthleteSummaries({
    summaries: [
      {
        id: "recWAS1aaaaaaaaaa",
        enrollmentId: "recENR1aaaaaaaaaa",
        weekId: "recWEEK1aaaaaaaaa",
        enrollmentChallengeYear: "2027-2028",
        weekChallengeYear: "2027-2028",
      },
      {
        id: "recWAS2aaaaaaaaaa",
        enrollmentId: "recENR1aaaaaaaaaa",
        weekId: "recWEEK1aaaaaaaaa",
        enrollmentChallengeYear: "2027-2028",
        weekChallengeYear: "2027-2028",
      },
    ],
    expectedChallengeYear: "2027-2028",
  });
  assert.strictEqual(r.overall, "FAIL");
  assert.strictEqual(r.duplicates.length, 1);
  assert.ok(r.repairRecommendations.length >= 1);
  assert.ok(
    r.repairRecommendations[0].note.includes("Dry-run only")
  );
});

test("WAS cross-year + missing links + historical while current", () => {
  const r = validateWeeklyAthleteSummaries({
    summaries: [
      {
        id: "recWAS3aaaaaaaaaa",
        enrollmentId: "recENR2aaaaaaaaaa",
        weekId: "recWEEK2aaaaaaaaa",
        enrollmentChallengeYear: "2027-2028",
        weekChallengeYear: "2026-2027",
        weekHistorical: true,
      },
      {
        id: "recWAS4aaaaaaaaaa",
        enrollmentId: null,
        weekId: "recWEEK2aaaaaaaaa",
      },
      {
        id: "recWAS5aaaaaaaaaa",
        enrollmentId: "recENR3aaaaaaaaaa",
        weekId: null,
      },
    ],
    processingAsCurrent: true,
    expectedChallengeYear: "2027-2028",
  });
  const codes = r.findings.map((f) => f.code);
  assert.ok(codes.includes("summary_cross_year_links"));
  assert.ok(codes.includes("summary_missing_enrollment"));
  assert.ok(codes.includes("summary_missing_week"));
  assert.ok(codes.includes("current_summary_historical_week"));
});

test("duplicate email package FAIL", () => {
  const r = validateWeeklyAthleteSummaries({
    summaries: [
      {
        id: "recWAS6aaaaaaaaaa",
        enrollmentId: "recENR4aaaaaaaaaa",
        weekId: "recWEEK3aaaaaaaaa",
        emailPackageKey: "WEEKLY_EMAIL|recENR4aaaaaaaaaa|recWEEK3aaaaaaaaa",
        enrollmentChallengeYear: "2027-2028",
        weekChallengeYear: "2027-2028",
      },
      {
        id: "recWAS7aaaaaaaaaa",
        enrollmentId: "recENR5aaaaaaaaaa",
        weekId: "recWEEK4aaaaaaaaa",
        emailPackageKey: "WEEKLY_EMAIL|recENR4aaaaaaaaaa|recWEEK3aaaaaaaaa",
        enrollmentChallengeYear: "2027-2028",
        weekChallengeYear: "2027-2028",
      },
    ],
  });
  assert.ok(r.findings.some((f) => f.code === "duplicate_email_package"));
});

// ---------------------------------------------------------------------------
// Preflight + manifest
// ---------------------------------------------------------------------------

test("rollover preflight PASS on complete fixture", () => {
  const r = runRolloverPreflight(preflightPass);
  assert.strictEqual(r.overall, "PASS");
  assert.strictEqual(r.failedChecks.length, 0);
});

test("rollover preflight FAIL on missing ops + overlapping prior", () => {
  const r = runRolloverPreflight({
    newConfig: {
      id: "recX",
      activeSchoolYear: "2027-2028",
      startDate: "2026-06-01",
      endDate: "2026-07-01",
      weekZeroStart: "2027-05-30",
      regularWeekCount: 8,
      isCurrent: true,
    },
    priorConfig: {
      id: "recY",
      activeSchoolYear: "2026-2027",
      startDate: "2026-05-01",
      endDate: "2026-08-01",
      isCurrent: true,
    },
    allConfigs: [
      {
        id: "recY",
        activeSchoolYear: "2026-2027",
        startDate: "2026-05-01",
        endDate: "2026-08-01",
        isCurrent: true,
      },
      {
        id: "recX",
        activeSchoolYear: "2027-2028",
        startDate: "2026-06-01",
        endDate: "2026-07-01",
        weekZeroStart: "2027-05-30",
        regularWeekCount: 8,
        isCurrent: true,
      },
    ],
    generate: { weekZeroStart: "2027-05-30", regularWeeks: 8 },
    opsChecklist: {},
  });
  assert.strictEqual(r.overall, "FAIL");
  assert.ok(r.failedChecks.some((c) => c.code === "overlap_with_prior_config"));
  assert.ok(r.failedChecks.some((c) => c.code === "formsDocumented"));
  assert.ok(r.failedChecks.some((c) => c.code === "multiple_active_configs"));
});

test("manifest generation writes json/md/csv content", () => {
  const result = generateRolloverManifest(preflightPass);
  assert.ok(result.manifest);
  assert.ok(result.markdown.includes("rollover manifest"));
  assert.ok(result.csv.includes("2027-2028|Week 0"));
  assert.ok(result.manifest.expectedKeys.includes("2027-2028|Post-Challenge"));
  assert.ok(result.manifest.rollbackSteps.length > 0);
  assert.ok(result.manifest.automationsToInspect.some((a) => a.includes("118")));
});

test("dry-run protections: unsafe delete not offered as auto action", () => {
  const r = validateWeeklyAthleteSummaries({
    summaries: [
      {
        id: "recWAS8aaaaaaaaaa",
        enrollmentId: "recENR6aaaaaaaaaa",
        weekId: "recWEEK5aaaaaaaaa",
      },
      {
        id: "recWAS9aaaaaaaaaa",
        enrollmentId: "recENR6aaaaaaaaaa",
        weekId: "recWEEK5aaaaaaaaa",
      },
    ],
  });
  for (const rec of r.repairRecommendations) {
    assert.ok(!/auto[- ]?delete/i.test(JSON.stringify(rec)));
    assert.ok(/Dry-run only/i.test(rec.note));
  }
});

test("CLI generate-weeks smoke via library outputs to temp dir", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cy-weeks-"));
  const plan = generateWeekPlan({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 3,
  });
  fs.writeFileSync(path.join(dir, "weeks.csv"), weeksToCsv(plan.weeks));
  fs.writeFileSync(path.join(dir, "weeks.md"), weeksToMarkdown(plan));
  fs.writeFileSync(path.join(dir, "weeks.json"), JSON.stringify(plan, null, 2));
  assert.ok(fs.existsSync(path.join(dir, "weeks.csv")));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) process.exit(1);
