#!/usr/bin/env node
/**
 * Season Launch Control System tests
 * Run: node tests/challenge-year/season-launch-control.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  LAUNCH_STATES,
  canTransition,
  evaluateTransition,
  createLaunchRecord,
  validateSeasonExport,
  validateConfigExport,
  detectDisallowedHardcodes,
  auditSeasonSensitiveAutomations,
  generateWeekImportPackage,
  launchStatus,
  launchPreflight,
  launchManifest,
  activationPreview,
  rollbackPreview,
  buildSeasonReliabilityFindings,
  SEASON_FINDING_CODES,
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

const FIX = path.join(__dirname, "..", "fixtures", "challenge-year");
const launchPass = JSON.parse(
  fs.readFileSync(path.join(FIX, "launch-preflight-pass.json"), "utf8")
);

test("Softr Validated aliases to Web Validated (Softr Obsolete)", () => {
  const { normalizeLaunchState: norm } = require("../../lib/challenge-year");
  const n = norm("Softr Validated");
  assert.equal(n.ok, true);
  assert.equal(n.state, "Web Validated");
  const t = canTransition("Make Validated", "Web Validated");
  assert.equal(t.ok, true);
  assert.ok(!LAUNCH_STATES.includes("Softr Validated"));
});

test("launch states include Live, Web Validated, Rolled Back, Blocking Error", () => {
  assert.ok(LAUNCH_STATES.includes("Live"));
  assert.ok(LAUNCH_STATES.includes("Web Validated"));
  assert.ok(LAUNCH_STATES.includes("Rolled Back"));
  assert.ok(LAUNCH_STATES.includes("Blocking Error"));
  assert.ok(LAUNCH_STATES.includes("Approved for Live"));
});

test("transition Draft → Live refused", () => {
  const r = canTransition("Draft", "Live");
  assert.strictEqual(r.ok, false);
});

test("transition Approved for Live → Live allowed when checks present", () => {
  const r = evaluateTransition({
    fromState: "Approved for Live",
    toState: "Live",
    completedChecks: [
      "activation_evidence_recorded",
      "single_current_config",
    ],
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, "PASS");
});

test("Test Mode cannot go Live", () => {
  const r = evaluateTransition({
    fromState: "Approved for Live",
    toState: "Live",
    completedChecks: ["activation_evidence_recorded", "single_current_config"],
    testMode: true,
  });
  assert.strictEqual(r.ok, false);
  assert.ok(r.blockingConditions.some((b) => /Test Mode/i.test(b)));
});

test("createLaunchRecord defaults Draft", () => {
  const rec = createLaunchRecord({ configRecordId: "recNEWCONFIG202728" });
  assert.strictEqual(rec.state, "Draft");
  assert.ok(rec.proposedFields.fields.length >= 1);
});

test("validateConfigExport detects multiple active and overlaps", () => {
  const r = validateConfigExport([
    {
      id: "recA",
      activeSchoolYear: "2026-2027",
      startDate: "2026-05-01",
      endDate: "2026-07-01",
      isCurrent: true,
      timezone: "America/Denver",
    },
    {
      id: "recB",
      activeSchoolYear: "2027-2028",
      startDate: "2026-06-01",
      endDate: "2026-08-01",
      isCurrent: true,
      timezone: "America/Denver",
    },
  ]);
  assert.strictEqual(r.overall, "FAIL");
  const codes = r.findings.map((f) => f.code);
  assert.ok(codes.includes("multiple_active_configs"));
  assert.ok(codes.includes("overlapping_config_dates"));
});

test("validateSeasonExport catches cross-season XP and sent flags", () => {
  const r = validateSeasonExport(
    {
      challengeYear: "2027-2028",
      configs: [launchPass.newConfig, launchPass.priorConfig],
      weeks: [],
      enrollments: [],
      summaries: [
        {
          id: "recWAS1aaaaaaaaaa",
          enrollmentId: "recENR1aaaaaaaaaa",
          weekId: "recWEEK1aaaaaaaaa",
          copiedFromPriorSeason: true,
          emailSent: true,
          buildWeeklyEmailNow: true,
        },
      ],
      xpEvents: [
        {
          id: "recXP1aaaaaaaaaaa",
          enrollmentChallengeYear: "2026-2027",
          sourceKey: "SUBMISSION_XP|x",
        },
      ],
    },
    { challengeYear: "2027-2028", requireCurrent: false, requireCanonicalWeekKey: false }
  );
  const codes = r.findings.map((f) => f.code);
  assert.ok(codes.includes("sent_flag_copied_new_season"));
  assert.ok(codes.includes("build_flag_from_prior_season"));
  assert.ok(codes.includes("xp_wrong_enrollment_year"));
});

test("hard-coded year detection fails outside allowlist", () => {
  const r = detectDisallowedHardcodes('const y = "2026-2027";');
  assert.ok(r.findings.some((f) => f.code === "hardcoded_year_label"));
});

test("hard-coded year in comments ignored by default", () => {
  const r = detectDisallowedHardcodes('/* season 2026-2027 */\nconst x = 1;');
  assert.ok(!r.findings.some((f) => f.code === "hardcoded_year_label"));
});

test("stale Config record id fails when listed", () => {
  const r = detectDisallowedHardcodes('const id = "recq14M5hEv3TIGEj";', {
    staleConfigIds: ["recq14M5hEv3TIGEj"],
  });
  assert.ok(r.findings.some((f) => f.code === "hardcoded_config_record_id"));
});

test("variable name recordingZaToMark not treated as record id", () => {
  const r = detectDisallowedHardcodes("const recordingZaToMark = true;");
  assert.ok(!r.findings.some((f) => f.recordId === "recordingZaToMark"));
});

test("automation audit runs against repo scripts", () => {
  const r = auditSeasonSensitiveAutomations();
  assert.ok(["PASS", "PASS WITH WARNINGS", "FAIL"].includes(r.overall));
  assert.ok(r.automations.length >= 20);
  assert.ok(r.automations.some((a) => a.number === "118" && a.present));
});

test("week import package includes maps and warnings", () => {
  const pkg = generateWeekImportPackage({
    challengeYear: "2027-2028",
    weekZeroStart: "2027-05-30",
    regularWeeks: 3,
    configRecordId: "recNEWCONFIG202728",
  });
  assert.strictEqual(pkg.ok, true);
  assert.ok(pkg.files.weeksImportCsv.includes("Week Name"));
  assert.ok(pkg.weekCodeMap.some((w) => w.weekCode === "2027-2028|Week 0"));
  assert.ok(pkg.expectedSundayEmailDates.length > 0);
  assert.ok(pkg.warnings.some((w) => /record IDs/i.test(w)));
  assert.ok(pkg.rollback.steps.length > 0);
});

test("launch-preflight PASS WITH WARNINGS on fixture without export", () => {
  const r = launchPreflight(launchPass);
  assert.ok(r.overall === "PASS" || r.overall === "PASS WITH WARNINGS");
  assert.strictEqual(r.configRecordId, "recNEWCONFIG202728");
  assert.ok(r.reliabilityFindings);
});

test("launch-preflight FAIL without config id", () => {
  const r = launchPreflight({ challengeYear: "2027-2028" });
  assert.strictEqual(r.overall, "FAIL");
});

test("launch-status returns launch record", () => {
  const r = launchStatus({
    launch: { state: "Test Ready", configRecordId: "recNEWCONFIG202728", challengeYear: "2027-2028" },
  });
  assert.strictEqual(r.launch.state, "Test Ready");
});

test("launch-manifest produces markdown and csv", () => {
  const r = launchManifest(launchPass);
  assert.ok(r.markdown.includes("Season Launch Manifest"));
  assert.ok(r.csv.includes("2027-2028|Week 0"));
});

test("activation-preview dry-run lists proposed changes", () => {
  const r = activationPreview({
    ...launchPass,
    fromState: "Approved for Live",
    completedChecks: launchPass.completedChecks,
  });
  assert.strictEqual(r.dryRun, true);
  assert.ok(r.proposedChanges.length >= 2);
  assert.strictEqual(r.writesPerformed, 0);
});

test("rollback-preview restores prior Config", () => {
  const r = rollbackPreview(launchPass);
  assert.strictEqual(r.dryRun, true);
  assert.ok(r.proposedChanges.some((c) => c.to === true || c.note?.includes("Restore")));
});

test("empty export validateSeasonExport fails closed on weeks", () => {
  const r = validateSeasonExport({}, { challengeYear: "2027-2028", requireCurrent: false });
  assert.strictEqual(r.overall, "FAIL");
});

test("malformed export config year fails", () => {
  const r = validateConfigExport([{ id: "recX", activeSchoolYear: "2026" }]);
  assert.strictEqual(r.overall, "FAIL");
});

test("season finding codes catalog non-empty", () => {
  assert.ok(SEASON_FINDING_CODES.includes("multiple_active_configs"));
  const built = buildSeasonReliabilityFindings({
    challengeYear: "2027-2028",
    configRecordId: "recNEWCONFIG202728",
    exportResult: {
      failed: [{ severity: "FAIL", code: "multiple_active_configs", message: "multi" }],
      warnings: [],
    },
  });
  assert.ok(built.findings.length >= 1);
  assert.ok(built.integration);
});

test("large fixture handling — 200 synthetic enrollments", () => {
  const enrollments = [];
  for (let i = 0; i < 200; i += 1) {
    enrollments.push({
      id: `recENR${String(i).padStart(11, "0")}`,
      athleteId: `recATH${String(i).padStart(11, "0")}`,
      schoolYear: "2027-2028",
      configRecordId: "recNEWCONFIG202728",
      active: true,
    });
  }
  const r = validateSeasonExport(
    {
      configs: [launchPass.newConfig],
      weeks: [],
      enrollments,
      summaries: [],
      xpEvents: [],
    },
    { challengeYear: "2027-2028", requireCurrent: false, requireCanonicalWeekKey: false }
  );
  assert.ok(r.sections.enrollments.enrollmentCount === 200);
});

test("launch commands include markdown reports", () => {
  const status = launchStatus({
    launch: { state: "Draft", configRecordId: "recNEWCONFIG202728", challengeYear: "2027-2028" },
  });
  assert.ok(String(status.markdown).includes("# Season Launch Status"));
  assert.ok(String(status.markdown).includes("**Overall:**"));

  const act = activationPreview({
    newConfig: launchPass.newConfig,
    priorConfig: launchPass.priorConfig,
    challengeYear: "2027-2028",
    configRecordId: "recNEWCONFIG202728",
    fromState: "Approved for Live",
    completedChecks: ["activation_evidence_recorded", "single_current_config"],
  });
  assert.ok(String(act.markdown).includes("Activation Preview"));
  assert.ok(Array.isArray(act.proposedChanges));
  assert.equal(act.overall, "PASS");

  const rb = rollbackPreview({
    newConfig: launchPass.newConfig,
    priorConfig: launchPass.priorConfig,
    challengeYear: "2027-2028",
    configRecordId: "recNEWCONFIG202728",
  });
  assert.ok(String(rb.markdown).includes("Rollback Preview"));
});

test("admin preview scripts remain dry-run and require Config + year", () => {
  const fs = require("fs");
  const path = require("path");
  const dir = path.join(__dirname, "../../airtable/extension-scripts/audits");
  const required = [
    "preview-challenge-year-config-relationships.js",
    "preview-challenge-year-weeks-missing.js",
    "preview-challenge-year-mismatches.js",
    "preview-challenge-year-was-duplicates.js",
    "preview-cross-season-xp-risks.js",
    "preview-stale-email-flags.js",
    "preview-season-launch-activation.js",
    "preview-season-launch-rollback.js",
    "preview-submission-week-mismatches.js",
  ];
  for (const name of required) {
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    assert.ok(text.includes("dryRun"), `${name} must mention dryRun`);
    assert.ok(text.includes("configRecordId"), `${name} must require configRecordId`);
    assert.ok(text.includes("challengeYear"), `${name} must require challengeYear`);
    assert.ok(
      /Preview-only|dryRun must remain true|Never writes|Never deletes|dry-run/i.test(text),
      `${name} must refuse destructive writes`
    );
  }
});

console.log("");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) process.exit(1);
