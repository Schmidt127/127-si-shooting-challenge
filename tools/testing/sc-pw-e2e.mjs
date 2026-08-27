#!/usr/bin/env node
/**
 * SC-PW-E2E — disposable Perfect Week pipeline harness (057 → WAS → 058 → 059).
 *
 * Default: dry-run (no Airtable writes). Requires --apply for creates; --cleanup for deletes.
 *
 *   node tools/testing/sc-pw-e2e.mjs --case qualifying
 *   node tools/testing/sc-pw-e2e.mjs --case qualifying --apply
 *   node tools/testing/sc-pw-e2e.mjs --case nonqualifying-video --apply
 *   node tools/testing/sc-pw-e2e.mjs --case trigger-only --apply
 *   node tools/testing/sc-pw-e2e.mjs --cleanup
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRunContext,
  buildDryRunPlan,
  saveManifest,
  loadManifest,
  createDisposableFixture,
  createTriggerOnlyUnlock,
  pollSubmissionFormulas,
  pollWasFormulas,
  poll057Ready,
  poll058Unlock,
  poll059Xp,
  pollTriggerOnly059,
  verifyDuplicateRun,
  verifyLifetimeXpUnchanged,
  readEnrollmentLifetimeXp,
  readWasSnapshot,
  cleanupPwtestRecords,
  resolveXpRewardAmount,
  buildFailureReport,
  MANIFEST_PATH,
  EXPECTED_XP_AMOUNT,
  requireToken,
  ROOT,
} from "./lib/sc-pw-e2e-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/sc-pw-e2e");

const VALID_CASES = new Set(["qualifying", "nonqualifying-video", "trigger-only"]);

function parseArgs(argv) {
  const args = {
    caseName: null,
    apply: false,
    cleanup: false,
    manifest: MANIFEST_PATH,
    out: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--cleanup") args.cleanup = true;
    else if (a === "--case") args.caseName = argv[++i];
    else if (a === "--manifest") args.manifest = resolve(ROOT, argv[++i]);
    else if (a === "--out") args.out = resolve(ROOT, argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function printHelp() {
  console.log(`SC-PW-E2E — disposable Perfect Week end-to-end harness

Usage:
  node tools/testing/sc-pw-e2e.mjs --case <qualifying|nonqualifying-video|trigger-only> [--apply]
  node tools/testing/sc-pw-e2e.mjs --cleanup [--manifest path]

Flags:
  --case       Test mode (required unless --cleanup)
  --apply      Create records and run live polling (default: dry-run plan only)
  --cleanup    Delete only records from the last manifest (PWTEST| guard)
  --manifest   Manifest path (default: docs/testing/perfect-week/fixtures/_sc-pw-e2e-last.json)
  --out        Evidence JSON path (optional)

Safety:
  - Dry-run by default
  - PWTEST| prefix on created Week names
  - Gated enrollment ${"rec93mAfo5jKqP3g5"} only (Perfect Week Testing)
  - Never writes formula fields, Eligible?, unlocks (except trigger-only), XP Events, or Lifetime XP
  - No email arms
`);
}

function initReport(caseName, apply) {
  return {
    harness: "SC-PW-E2E",
    case: caseName,
    mode: apply ? "apply" : "dry-run",
    startedAt: new Date().toISOString(),
    created: {},
    stage057: null,
    wasFormulas: null,
    stage058: null,
    stage059: null,
    xp: null,
    duplicateCheck: null,
    lifetimeXp: null,
    cleanup: null,
    failurePoint: null,
    passed: false,
  };
}

async function runQualifying(token, baseId, ctx, report, apply) {
  const videoCount = 3;
  if (!apply) {
    report.plan = buildDryRunPlan(ctx, { videoCount });
    report.passed = true;
    return report;
  }

  report.created = await createDisposableFixture(token, baseId, ctx, { videoCount });
  ctx.wasId = report.created.wasId;
  ctx.weekId = report.created.weekId;

  const xpAmount = await resolveXpRewardAmount(token, baseId);
  report.expectedXpAmount = xpAmount;

  report.submissionFormulas = await pollSubmissionFormulas(token, baseId, report.created.submissionIds);

  report.stage057 = await poll057Ready(token, baseId, ctx.wasId);

  report.wasFormulas = await pollWasFormulas(token, baseId, ctx.wasId, {
    distinctDates: 7,
    dailyMet: true,
    videoCount: 3,
    videoMet: 1,
    homeworkMet: 1,
    zoomMet: 1,
    eligible: 1,
  });

  report.stage058 = await poll058Unlock(token, baseId, ctx, { expectUnlock: true });
  if (!report.stage058.pendingBefore059 && !report.stage058.sawPending) {
    const err = new Error("Unlock XP Award Status was not Pending before 059");
    err.stage = "058-unlock";
    err.diagnostic = report.stage058;
    throw err;
  }

  report.stage059 = await poll059Xp(token, baseId, ctx, { expectXp: true, xpAmount });
  const wasFinal = await readWasSnapshot(token, baseId, ctx.wasId);
  report.wasFinal = wasFinal;

  const weekEndKey = String(wasFinal.weekEndDate || ctx.weekEnd).slice(0, 10);
  const xpActivityKey = String(report.stage059.xpActivityDate || "").slice(0, 10);
  if (xpActivityKey && weekEndKey && xpActivityKey !== weekEndKey) {
    const err = new Error(`XP Activity Date ${xpActivityKey} !== Week End ${weekEndKey}`);
    err.stage = "059-xp";
    throw err;
  }
  if (report.stage059.xpActivityDateSource !== "Perfect Week End Date") {
    const err = new Error("XP Activity Date Source is not Perfect Week End Date");
    err.stage = "059-xp";
    throw err;
  }

  report.xp = {
    count: report.stage059.xpCount,
    amount: report.stage059.xpAmount,
    sourceKey: ctx.sourceKey,
    unlockId: report.stage058.unlockId,
  };

  report.duplicateCheck = await verifyDuplicateRun(token, baseId, ctx);
  if (!report.duplicateCheck.pass) {
    const err = new Error("Duplicate unlock or XP after second 057 run");
    err.stage = "duplicate-check";
    err.diagnostic = report.duplicateCheck;
    throw err;
  }

  report.passed = true;
  return report;
}

async function runNonqualifyingVideo(token, baseId, ctx, report, apply) {
  const videoCount = 2;
  if (!apply) {
    report.plan = buildDryRunPlan(ctx, { videoCount });
    report.passed = true;
    return report;
  }

  const lifetimeBefore = await readEnrollmentLifetimeXp(token, baseId, ctx.enrollmentId);
  report.lifetimeXp = { before: lifetimeBefore };

  report.created = await createDisposableFixture(token, baseId, ctx, { videoCount });
  ctx.wasId = report.created.wasId;
  ctx.weekId = report.created.weekId;

  await pollSubmissionFormulas(token, baseId, report.created.submissionIds);

  report.stage057 = await poll057Ready(token, baseId, ctx.wasId);

  report.wasFormulas = await pollWasFormulas(token, baseId, ctx.wasId, {
    videoCount: 2,
    videoMet: 0,
    eligible: 0,
  });
  report.stage058 = await poll058Unlock(token, baseId, ctx, { expectUnlock: false });
  report.stage059 = await poll059Xp(token, baseId, ctx, { expectXp: false });

  const lifetimeAfter = await verifyLifetimeXpUnchanged(
    token,
    baseId,
    ctx.enrollmentId,
    lifetimeBefore
  );
  report.lifetimeXp.after = lifetimeAfter.current;
  report.lifetimeXp.delta = lifetimeAfter.delta;
  report.lifetimeXp.pass = lifetimeAfter.pass;

  if (!lifetimeAfter.pass) {
    const err = new Error(`Lifetime XP increased by ${lifetimeAfter.delta}`);
    err.stage = "lifetime-xp";
    err.diagnostic = lifetimeAfter;
    throw err;
  }

  report.xp = { count: 0, amount: null, sourceKey: ctx.sourceKey };
  report.passed = true;
  return report;
}

async function runTriggerOnly(token, baseId, ctx, report, apply) {
  if (!apply) {
    report.plan = {
      ...buildDryRunPlan(ctx, { videoCount: 0 }),
      wouldCreateUnlock: true,
      triggerFields: {
        rewardRuleKey: "PERFECT_WEEK",
        xpAwardStatus: "Pending",
        active: true,
        shotMilestone: "blank",
      },
    };
    report.passed = true;
    return report;
  }

  report.created = await createTriggerOnlyUnlock(token, baseId, ctx);
  ctx.unlockId = report.created.unlockId;

  report.stage059 = await pollTriggerOnly059(token, baseId, ctx, report.created.unlockId);
  report.xp = {
    count: report.stage059.xpCount,
    amount: EXPECTED_XP_AMOUNT,
    sourceKey: ctx.sourceKey,
    unlockId: report.created.unlockId,
  };
  report.passed = report.stage059.pass === true;
  if (!report.passed) {
    const err = new Error("059 did not process trigger-only unlock");
    err.stage = "059-trigger-only";
    err.diagnostic = report.stage059;
    throw err;
  }
  return report;
}

async function runCase(args) {
  if (!VALID_CASES.has(args.caseName)) {
    throw new Error(`--case must be one of: ${[...VALID_CASES].join(", ")}`);
  }

  const ctx = buildRunContext(args.caseName);
  const report = initReport(args.caseName, args.apply);

  if (!args.apply) {
    if (args.caseName === "qualifying") await runQualifying(null, null, ctx, report, false);
    else if (args.caseName === "nonqualifying-video") await runNonqualifyingVideo(null, null, ctx, report, false);
    else await runTriggerOnly(null, null, ctx, report, false);

    report.finishedAt = new Date().toISOString();
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  const { token, baseId } = requireToken();
  try {
    if (args.caseName === "qualifying") await runQualifying(token, baseId, ctx, report, true);
    else if (args.caseName === "nonqualifying-video") {
      await runNonqualifyingVideo(token, baseId, ctx, report, true);
    } else {
      await runTriggerOnly(token, baseId, ctx, report, true);
    }
  } catch (error) {
    const failed = buildFailureReport(error, report);
    failed.finishedAt = new Date().toISOString();
    failed.sourceKey = ctx.sourceKey;
    saveManifest(failed, args.manifest);
    writeEvidence(failed, args.out);
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }

  report.finishedAt = new Date().toISOString();
  report.sourceKey = ctx.sourceKey;
  report.batchKey = ctx.batchKey;
  saveManifest(report, args.manifest);
  writeEvidence(report, args.out);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exit(1);
  return report;
}

async function runCleanup(args) {
  const manifest = loadManifest(args.manifest);
  if (!manifest?.created) {
    throw new Error(`No manifest at ${args.manifest} — nothing to cleanup`);
  }
  const { token, baseId } = requireToken();
  const result = await cleanupPwtestRecords(token, baseId, manifest);
  const out = {
    harness: "SC-PW-E2E",
    mode: "cleanup",
    manifest: args.manifest,
    deletedCount: result.count,
    deleted: result.deleted,
    finishedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(out, null, 2));
  return out;
}

function writeEvidence(report, outPath) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const target =
    outPath ||
    resolve(EVIDENCE_DIR, `${report.case || "run"}-${report.startedAt.replace(/[:.]/g, "").slice(0, 15)}.json`);
  writeFileSync(target, JSON.stringify(report, null, 2));
  report.evidencePath = target;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (args.cleanup) {
    await runCleanup(args);
    return;
  }
  if (!args.caseName) {
    printHelp();
    throw new Error("--case is required (or use --cleanup)");
  }
  await runCase(args);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
