#!/usr/bin/env node
/**
 * SC-WEEKLY-SETTLEMENT-E2E — weekly settlement matrix harness.
 *
 *   node tools/testing/sc-weekly-settlement.mjs --matrix
 *   node tools/testing/sc-weekly-settlement.mjs --case missing-shooting-day
 *   node tools/testing/sc-weekly-settlement.mjs --matrix --apply
 *   node tools/testing/sc-weekly-settlement.mjs --case no-videos --apply
 *   node tools/testing/sc-weekly-settlement.mjs --cleanup
 *
 * Safety: dry-run default; no email send; WSTEST| weeks only; never deletes gated enrollment.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HARNESS_ID,
  CASE_NAMES,
  CASE_DEFS,
  GATED_ENROLLMENT_ID,
  MANIFEST_PATH,
  EVIDENCE_DIR,
  buildDryRunPlan,
  buildMatrixDryRunPlan,
  buildCaseContext,
  evaluateOfflineExpectations,
  evaluateHandoffCompatibility,
  evaluateLevelGateStructuralContract,
  citePerfectWeekAwardEvidence,
  preflightApply,
  createDisposableInactiveEnrollment,
  createCaseFixture,
  readWasSettlementSnapshot,
  listUnlocksBySourceKey,
  listXpBySourceKey,
  pollWasUntil,
  scoreCaseResult,
  saveManifest,
  loadManifest,
  cleanupManifestRecords,
  buildPerfectWeekSourceKey,
  DOCUMENTED_GAPS,
  requireToken,
  truthy,
} from "./lib/sc-weekly-settlement-lib.mjs";

function parseArgs(argv) {
  const args = {
    caseName: null,
    matrix: false,
    apply: false,
    cleanup: false,
    manifest: MANIFEST_PATH,
    out: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--cleanup") args.cleanup = true;
    else if (a === "--matrix") args.matrix = true;
    else if (a === "--case") args.caseName = argv[++i];
    else if (a === "--manifest") args.manifest = resolve(argv[++i]);
    else if (a === "--out") args.out = resolve(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function printHelp() {
  console.log(`SC-WEEKLY-SETTLEMENT-E2E

Usage:
  node tools/testing/sc-weekly-settlement.mjs --matrix [--apply]
  node tools/testing/sc-weekly-settlement.mjs --case <name> [--apply]
  node tools/testing/sc-weekly-settlement.mjs --cleanup [--manifest path]

Cases:
  ${CASE_NAMES.join("\n  ")}

Safety:
  - Dry-run by default
  - WSTEST| prefix on Weeks
  - No email / Resend / Make / Gmail
  - Does not re-apply closed Perfect Week WAS recl3DmBh22ADPWWe
  - Does not restore Automation 075
`);
}

function writeEvidence(report, outPath) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const path =
    outPath ||
    resolve(
      EVIDENCE_DIR,
      `${report.case || "matrix"}-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}.json`
    );
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

async function runOfflineBundle() {
  const offlineCases = CASE_NAMES.map((name) => evaluateOfflineExpectations(name));
  return {
    offlineCases,
    handoff: evaluateHandoffCompatibility(),
    levels: evaluateLevelGateStructuralContract(),
    perfectWeekAwardCite: citePerfectWeekAwardEvidence(),
    documentedGaps: DOCUMENTED_GAPS,
    passed:
      offlineCases.every((c) => c.passed) &&
      evaluateHandoffCompatibility().pass &&
      evaluateLevelGateStructuralContract().pass,
  };
}

async function runCaseApply(token, baseId, caseName, shared, preflight) {
  const ctx = buildCaseContext(caseName, { runAt: shared.runAt });
  let enrollmentId =
    ctx.enrollmentMode === "disposable-inactive"
      ? shared.disposableEnrollmentId
      : GATED_ENROLLMENT_ID;

  if (ctx.enrollmentMode === "disposable-inactive" && !enrollmentId) {
    enrollmentId = await createDisposableInactiveEnrollment(token, baseId, ctx);
    shared.disposableEnrollmentId = enrollmentId;
  }

  const created = await createCaseFixture(token, baseId, ctx, enrollmentId);
  ctx.enrollmentId = enrollmentId;
  ctx.weekId = created.weekId;
  ctx.wasId = created.wasId;

  // Give formulas / 057 a chance to settle for gated PW cases.
  let poll = { ok: true, snapshot: null };
  if (enrollmentId === GATED_ENROLLMENT_ID) {
    const expect = ctx.def.expect;
    poll = await pollWasUntil(
      token,
      baseId,
      created.wasId,
      (snap) => {
        if (snap.automationStatus !== "Ready" && snap.automationStatus !== "Error") {
          return false;
        }
        if (expect.videoCount != null && snap.videoCount !== expect.videoCount) {
          return false;
        }
        if (ctx.def.videos > 0 && snap.videoCount < ctx.def.videos && snap.automationStatus === "Ready") {
          // 057 may still be lagging formula inputs; wait for video count when videos were seeded.
          return snap.videoCount >= ctx.def.videos;
        }
        if (expect.zoomMet === true && !truthy(snap.zoomMet) && snap.automationStatus === "Ready") {
          return false;
        }
        if (expect.pwEligible === true && !truthy(snap.eligible) && snap.automationStatus === "Ready") {
          // Eligible formula can lag one tick after Ready.
          return false;
        }
        return true;
      },
      { timeoutMs: 180000 }
    );
  } else {
    poll.snapshot = await readWasSettlementSnapshot(token, baseId, created.wasId);
  }

  const snapshot = poll.snapshot || (await readWasSettlementSnapshot(token, baseId, created.wasId));
  const sourceKey = buildPerfectWeekSourceKey(enrollmentId, created.weekId);
  const unlockField = preflight.unlockSourceField || "Milestone Source Key";
  const unlocks = await listUnlocksBySourceKey(token, baseId, sourceKey, unlockField);
  const xpEvents = await listXpBySourceKey(token, baseId, sourceKey);

  created.unlockIds = unlocks.map((r) => r.id);
  created.xpEventIds = xpEvents.map((r) => r.id);

  const scored = scoreCaseResult(ctx, snapshot, unlocks, xpEvents);

  return {
    case: caseName,
    caseId: ctx.def.id,
    label: ctx.def.label,
    fixtureIds: {
      enrollmentId,
      weekId: created.weekId,
      wasId: created.wasId,
      submissionIds: created.submissionIds,
      videoIds: created.videoIds,
      zoomMeetingId: created.zoomMeetingId,
      zoomAttendanceId: created.zoomAttendanceId,
      unlockIds: created.unlockIds,
      xpEventIds: created.xpEventIds,
    },
    inputs: {
      weekAnchor: ctx.def.weekAnchor,
      activityDates: ctx.activityDates,
      days: ctx.def.days,
      shotsPerDay: ctx.def.shotsPerDay,
      videos: ctx.def.videos,
      zoom: ctx.def.zoom,
      enrollmentMode: ctx.enrollmentMode,
    },
    expected: ctx.def.expect,
    actual: {
      snapshot,
      unlockCount: unlocks.length,
      xpCount: xpEvents.length,
      pollTimedOut: Boolean(poll.timedOut),
    },
    checks: scored.checks,
    passed: scored.passed,
    created,
    externalLimitations: [
      ...(caseName === "fully-successful"
        ? ["Award path cited from SC-PW-E2E MCP evidence; this case may not wait for full 058/059."]
        : []),
      ...(poll.timedOut ? ["057/formula poll timed out — partial settlement snapshot only."] : []),
    ],
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (args.cleanup) {
    const { token, baseId } = requireToken();
    const manifest = loadManifest(args.manifest);
    if (!manifest) throw new Error(`No manifest at ${args.manifest}`);
    const cleanup = await cleanupManifestRecords(token, baseId, manifest);
    const report = {
      harness: HARNESS_ID,
      mode: "cleanup",
      finishedAt: new Date().toISOString(),
      cleanup,
      passed: cleanup.errors.length === 0,
    };
    const path = writeEvidence(report, args.out);
    console.log(JSON.stringify({ ...report, evidencePath: path }, null, 2));
    if (!report.passed) process.exitCode = 1;
    return;
  }

  if (!args.matrix && !args.caseName) {
    printHelp();
    throw new Error("Specify --matrix or --case <name>");
  }
  if (args.caseName && !CASE_DEFS[args.caseName]) {
    throw new Error(`Unknown case: ${args.caseName}. Valid: ${CASE_NAMES.join(", ")}`);
  }

  const offline = await runOfflineBundle();
  const casesToRun = args.matrix ? CASE_NAMES : [args.caseName];

  if (!args.apply) {
    const report = {
      harness: HARNESS_ID,
      mode: "dry-run",
      startedAt: new Date().toISOString(),
      cases: casesToRun.map((name) => buildDryRunPlan(name)),
      offline,
      documentedGaps: DOCUMENTED_GAPS,
      passed: offline.passed,
    };
    if (args.matrix) report.matrixPlan = buildMatrixDryRunPlan();
    const path = writeEvidence(report, args.out);
    console.log(JSON.stringify({ passed: report.passed, evidencePath: path, offlinePassed: offline.passed, documentedGaps: DOCUMENTED_GAPS.length }, null, 2));
    if (!report.passed) process.exitCode = 1;
    return;
  }

  const { token, baseId } = requireToken();
  const preflight = await preflightApply(token, baseId);
  const shared = { runAt: new Date().toISOString(), disposableEnrollmentId: null };
  const caseResults = [];

  for (const name of casesToRun) {
    console.error(`Applying case ${name}…`);
    try {
      const result = await runCaseApply(token, baseId, name, shared, preflight);
      caseResults.push(result);
      console.error(`  ${result.passed ? "PASS" : "FAIL"} ${name} was=${result.fixtureIds.wasId}`);
    } catch (err) {
      caseResults.push({
        case: name,
        caseId: CASE_DEFS[name].id,
        passed: false,
        error: err.message,
        created: err.partialCreated || null,
        fixtureIds: err.partialCreated || null,
        checks: [],
        externalLimitations: ["Case aborted on error"],
      });
      console.error(`  ERROR ${name}: ${err.message}`);
    }
  }

  const manifest = {
    harness: HARNESS_ID,
    createdAt: shared.runAt,
    disposableEnrollmentId: shared.disposableEnrollmentId,
    cases: caseResults.map((r) => ({
      case: r.case,
      created: r.created || r.fixtureIds,
    })),
  };
  saveManifest(manifest, args.manifest);

  const report = {
    harness: HARNESS_ID,
    mode: "apply",
    startedAt: shared.runAt,
    finishedAt: new Date().toISOString(),
    preflight: {
      unlockSourceField: preflight.unlockSourceField,
      hasCoachSummaryQueue: preflight.hasCoachSummaryQueue,
      hasGradeSubmitted: preflight.hasGradeSubmitted,
    },
    offline,
    perfectWeekAwardCite: citePerfectWeekAwardEvidence(),
    cases: caseResults,
    documentedGaps: DOCUMENTED_GAPS,
    manifestPath: args.manifest,
    passed: offline.passed && caseResults.every((c) => c.passed),
    cleanup: "Run --cleanup after review to delete WSTEST| fixtures",
  };

  const path = writeEvidence(report, args.out);
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        evidencePath: path,
        caseSummary: caseResults.map((c) => ({
          case: c.case,
          passed: c.passed,
          wasId: c.fixtureIds?.wasId,
        })),
        documentedGaps: DOCUMENTED_GAPS.map((g) => g.id),
      },
      null,
      2
    )
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
