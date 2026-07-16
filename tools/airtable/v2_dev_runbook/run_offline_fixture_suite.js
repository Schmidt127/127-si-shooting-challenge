#!/usr/bin/env node
/**
 * Offline-safe V2 DEV runbook fixture suite.
 *
 * Validates:
 * - matrix classification integrity
 * - fixture files for every required domain
 * - Source Key builders for all XP/unlock domains
 * - decision helpers for idempotency / gates / streaks / Perfect Week / milestones
 * - evidence shell completeness
 *
 * Does NOT contact Airtable, Make, or email.
 *
 * Usage (repo root):
 *   node tools/airtable/v2_dev_runbook/run_offline_fixture_suite.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  loadIds,
  loadJson,
  buildDomainSourceKeys,
  buildEvidenceShell,
  formatEvidenceMarkdown,
  listFixtureDomains,
  contracts,
  ROOT,
} = require("./fixture_builders");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.message ? error.message : error}`);
  }
}

const REQUIRED_DOMAINS = [
  "enrollment",
  "submission_xp",
  "homework_completion",
  "video_feedback",
  "zoom_attendance",
  "zoom_recording",
  "streaks",
  "milestones",
  "perfect_week",
  "weekly_summary",
  "levels_gates",
  "asset_reuse",
  "duplicate_prevention",
];

const EVIDENCE_FIELDS = [
  "preTestState",
  "recordsCreated",
  "automationExpected",
  "expectedOutput",
  "actualOutput",
  "cleanup",
  "rollback",
  "evidenceLocation",
];

console.log("V2 DEV runbook offline fixture suite");
console.log(`Root: ${ROOT}`);
console.log("");

const classification = JSON.parse(
  fs.readFileSync(path.join(ROOT, "matrix-classification.json"), "utf8"),
);
const idsDoc = loadIds();
const ids = idsDoc.ids;
const keys = buildDomainSourceKeys(ids);

test("classification schema_version present", () => {
  assert.strictEqual(typeof classification.schema_version, "number");
  assert.ok(Array.isArray(classification.tests));
  assert.ok(classification.tests.length >= 50);
});

test("DEV/PROD base IDs correct and distinct", () => {
  assert.strictEqual(classification.dev_base_id, "appTetnuCZlCZdTCT");
  assert.strictEqual(classification.prod_base_id, "appn84sqPw03zEbTT");
  assert.notStrictEqual(classification.dev_base_id, classification.prod_base_id);
});

test("every matrix test has modes + domain", () => {
  for (const row of classification.tests) {
    assert.ok(row.id, "missing id");
    assert.ok(row.domain, `${row.id} missing domain`);
    assert.ok(Array.isArray(row.modes) && row.modes.length, `${row.id} missing modes`);
    for (const mode of row.modes) {
      assert.ok(classification.execution_modes.includes(mode), `${row.id} bad mode ${mode}`);
    }
  }
});

test("launch smoke subset non-empty and marked", () => {
  const smoke = classification.tests.filter((t) => t.launch_smoke);
  assert.ok(smoke.length >= 10, `expected >=10 smoke tests, got ${smoke.length}`);
  const idsSmoke = smoke.map((t) => t.id);
  for (const required of ["A3", "B1", "B2", "C4", "D3", "F1", "F2", "F3", "G3", "H2", "J1", "J4", "L1", "L2", "M1"]) {
    assert.ok(idsSmoke.includes(required), `smoke missing ${required}`);
  }
});

test("required fixture domains exist on disk", () => {
  const present = new Set(listFixtureDomains());
  for (const domain of REQUIRED_DOMAINS) {
    assert.ok(present.has(domain), `missing fixture ${domain}.json`);
    const fixture = loadJson(`${domain}.json`);
    assert.strictEqual(fixture.domain, domain);
    assert.ok(Array.isArray(fixture.matrix_ids) && fixture.matrix_ids.length);
    assert.ok(fixture.pre_test_state || fixture.automation_expected);
    assert.ok(fixture.cleanup);
    assert.ok(fixture.rollback);
    assert.ok(fixture.evidence_location);
  }
});

test("synthetic ids are rec* and not live placeholders", () => {
  for (const [name, value] of Object.entries(ids)) {
    assert.ok(contracts.isValidRecordId(value), `bad id ${name}`);
  }
  assert.strictEqual(
    idsDoc.live_placeholders.schmidt_enrollment_id,
    "REPLACE_AFTER_OMNI_EXPORT",
  );
});

test("submission / homework / video / streak / milestone keys", () => {
  assert.strictEqual(keys.submissionXp, `SUBMISSION_XP|${ids.submission}`);
  assert.strictEqual(keys.homeworkXp, `HOMEWORK_XP|${ids.homework_completion}`);
  assert.strictEqual(keys.videoXp, `VIDEO_SUBMISSION|${ids.video_feedback}`);
  assert.strictEqual(
    keys.streakXp,
    `STREAK_XP|${ids.enrollment}|${ids.achievement_streak}|2026-07-15`,
  );
  assert.strictEqual(
    keys.shotMilestone,
    `SHOT_MILESTONE|${ids.enrollment}|${ids.shot_milestone_100}`,
  );
  assert.strictEqual(keys.perfectWeek, `PERFECT_WEEK|${ids.enrollment}|${ids.week}`);
});

test("zoom attendance + recording keys", () => {
  assert.strictEqual(
    keys.zoomAttendBase,
    `ZOOM_ATTEND_BASE|${ids.zoom_meeting}|${ids.enrollment}`,
  );
  assert.strictEqual(
    keys.zoomRecording,
    `ZOOM_RECORDING|${ids.zoom_meeting}|${ids.enrollment}`,
  );
  assert.notStrictEqual(keys.zoomAttendBase, keys.zoomRecording);
});

test("idempotency: XP create then skip on rerun", () => {
  const first = contracts.decideXpEventAction({
    sourceKey: keys.submissionXp,
    existingKeys: [],
  });
  assert.strictEqual(first.action, "create");
  const second = contracts.decideXpEventAction({
    sourceKey: keys.submissionXp,
    existingKeys: [keys.submissionXp],
  });
  assert.strictEqual(second.action, "skip_existing");
});

test("homework completion decide: create then link existing", () => {
  const assignmentId = "recHwAssignFixture01";
  const first = contracts.decideHomeworkCompletionAction({
    existingCompletionIdsForAsset: [],
    enrollmentId: ids.enrollment,
    homeworkAssignmentId: assignmentId,
  });
  assert.strictEqual(first.action, "create");
  const second = contracts.decideHomeworkCompletionAction({
    existingCompletionIdsForAsset: [ids.homework_completion],
    enrollmentId: ids.enrollment,
    homeworkAssignmentId: assignmentId,
  });
  assert.strictEqual(second.action, "link_existing");
  assert.strictEqual(second.completionId, ids.homework_completion);
});

test("streak blocks: contiguous vs gap", () => {
  const streakFix = loadJson("streaks.json");
  const contiguous = contracts.buildStreakBlocks(streakFix.synthetic_activity_dates);
  assert.strictEqual(contiguous.length, 1);
  const gapped = contracts.buildStreakBlocks(streakFix.gap_scenario_dates);
  assert.strictEqual(gapped.length, 2);
});

test("milestone crossings F1/F2 shapes", () => {
  const ms = loadJson("milestones.json");
  const milestones = ms.synthetic_crossing.thresholds.map((threshold, index) => ({
    id: index === 0 ? ids.shot_milestone_100 : ids.shot_milestone_250,
    threshold,
  }));

  const single = contracts.detectShotMilestoneCrossings({
    enrollmentId: ids.enrollment,
    previousShotTotal: ms.synthetic_crossing.before_shots,
    currentShotTotal: ms.synthetic_crossing.after_single,
    milestones,
    unlockedSourceKeys: [],
  });
  assert.strictEqual(single.length, 1);
  assert.strictEqual(single[0].sourceKey, keys.shotMilestone);

  const multi = contracts.detectShotMilestoneCrossings({
    enrollmentId: ids.enrollment,
    previousShotTotal: ms.synthetic_crossing.before_shots,
    currentShotTotal: ms.synthetic_crossing.after_multi,
    milestones,
    unlockedSourceKeys: [],
  });
  assert.strictEqual(multi.length, 2);

  const rerun = contracts.detectShotMilestoneCrossings({
    enrollmentId: ids.enrollment,
    previousShotTotal: ms.synthetic_crossing.before_shots,
    currentShotTotal: ms.synthetic_crossing.after_multi,
    milestones,
    unlockedSourceKeys: multi.map((row) => row.sourceKey),
  });
  assert.strictEqual(rerun.length, 0);
});

test("Perfect Week eligibility G1/G2", () => {
  const pw = loadJson("perfect_week.json");
  const required = contracts.buildRequiredWeekDates(
    pw.synthetic_week.week_start,
    pw.synthetic_week.required_daily_count,
  );
  assert.deepStrictEqual(required, pw.synthetic_week.eligible_dates);

  const eligible = contracts.evaluatePerfectWeekEligibility({
    weekStartDateKey: pw.synthetic_week.week_start,
    countedSubmissionDateKeys: pw.synthetic_week.eligible_dates,
    homeworkSatisfactoryCount: 1,
    homeworkRequired: 1,
  });
  assert.strictEqual(eligible.eligible, true);

  const missing = contracts.evaluatePerfectWeekEligibility({
    weekStartDateKey: pw.synthetic_week.week_start,
    countedSubmissionDateKeys: pw.synthetic_week.missing_one_dates,
    homeworkSatisfactoryCount: 1,
    homeworkRequired: 1,
  });
  assert.strictEqual(missing.eligible, false);
  assert.ok(missing.missingDays.length >= 1);
});

test("levels/gates H2 blocked", () => {
  const gateRule = {
    name: "Fixture Gate",
    gateEnabled: true,
    minimumSubmissions: 0,
    minimumHomework: 1,
    minimumVideos: 0,
    minimumZoomMeetings: 0,
    minimumStreakDays: 0,
  };
  const gate = contracts.evaluateGate(gateRule, {
    totalSubmissions: 5,
    totalHomeworkCompletions: 0,
    totalVideoSubmissions: 0,
    totalZoomAttendances: 0,
    longestStreakDays: 0,
  });
  assert.strictEqual(gate.passes, false);
});

test("asset SHA validation K2", () => {
  const asset = loadJson("asset_reuse.json");
  assert.strictEqual(contracts.isValidSha256Hex(asset.synthetic_hashes.valid_sha256), true);
  assert.strictEqual(contracts.isValidSha256Hex(asset.synthetic_hashes.invalid_short), false);
  assert.strictEqual(contracts.isValidSha256Hex(asset.synthetic_hashes.invalid_non_hex), false);
});

test("duplicate key blank skips safely", () => {
  const decision = contracts.decideSubmissionDuplicateStatus({
    duplicateKey: "",
    matchingRecordIds: [],
  });
  assert.strictEqual(decision.action, "skip");
  assert.strictEqual(decision.reason, "blank_duplicate_key");
});

test("week ordering I4", () => {
  const weeks = [
    { id: ids.week, startDateKey: "2026-07-13" },
    { id: ids.week_prev, startDateKey: "2026-07-06" },
  ];
  const ordered = contracts.orderWeeksByStartDate(weeks);
  assert.strictEqual(ordered[0].id, ids.week_prev);
  const prev = contracts.findPreviousWeek(ordered, ids.week);
  assert.strictEqual(prev.id, ids.week_prev);
});

test("evidence shell has required recording fields", () => {
  const shell = buildEvidenceShell("B1", {
    operator: "offline-suite",
    enrollmentId: ids.enrollment,
    preTestState: "synthetic",
    recordsCreated: [ids.submission],
    automationExpected: "010 create XP",
    expectedOutput: { source_key: keys.submissionXp },
    actualOutput: "offline only — not a live result",
    cleanup: "n/a offline",
    rollback: "n/a offline",
  });
  for (const field of EVIDENCE_FIELDS) {
    assert.ok(field in shell, `missing evidence field ${field}`);
  }
  const md = formatEvidenceMarkdown(shell);
  assert.ok(md.includes("Pre-test state"));
  assert.ok(md.includes("Records created"));
  assert.ok(md.includes("Actual output"));
  assert.ok(md.includes("Cleanup"));
  assert.ok(md.includes("Rollback"));
});

test("offline-classified tests declare offline_command or are covered by this suite", () => {
  const offline = classification.tests.filter((t) => t.modes.includes("offline"));
  assert.ok(offline.length >= 15);
  for (const row of offline) {
    if (row.domain === "web") continue;
    assert.ok(
      row.offline_command || row.fixture,
      `${row.id} offline without command/fixture`,
    );
  }
});

test("fixtures forbid PROD mutation language", () => {
  for (const domain of REQUIRED_DOMAINS) {
    const text = fs.readFileSync(path.join(ROOT, "fixtures", `${domain}.json`), "utf8");
    assert.ok(
      !/\b(paste into PROD|write to PROD|deploy to PROD|enable 070a in PROD)\b/i.test(text),
      `${domain} contains PROD mutation instruction`,
    );
  }
  assert.ok(
    classification.tests.every((t) => !(t.modes || []).includes("prod_write")),
  );
});

console.log("");
console.log(`Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("OK — offline fixture suite green (no live claims)");
