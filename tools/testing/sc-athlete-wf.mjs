#!/usr/bin/env node
/**
 * SC-ATHLETE-WF-001 — individual athlete workflow harness.
 *
 * Default: dry-run (no Airtable writes). --apply creates disposable ATHWF| records.
 * Never sends email. Distinct from SC-PW-E2E and season simulation.
 *
 *   node tools/testing/sc-athlete-wf.mjs --case full
 *   node tools/testing/sc-athlete-wf.mjs --case full --readonly
 *   node tools/testing/sc-athlete-wf.mjs --case full --apply
 *   node tools/testing/sc-athlete-wf.mjs --cleanup
 */
import { resolve } from "node:path";
import {
  VALID_CASES,
  buildRunContext,
  buildDryRunPlan,
  buildNegativeCaseMatrix,
  buildDefect,
  createDisposableFixture,
  pollSubmissionXp,
  pollHomeworkXp,
  readWasSnapshot,
  readEnrollmentSnapshot,
  verifyNoDuplicateSourceKeys,
  evaluateCountedDayXpPolicy,
  evaluateWasSnapshot,
  computeStreakFromDates,
  cleanupAthwfRecords,
  readonlyProbe,
  writeEvidence,
  loadManifest,
  saveManifest,
  MANIFEST_PATH,
  submissionXpKey,
  homeworkXpKey,
  videoXpKey,
  requireToken,
  GATED_ENROLLMENT_ID,
} from "./lib/sc-athlete-wf-lib.mjs";

function parseArgs(argv) {
  const args = {
    caseName: null,
    apply: false,
    cleanup: false,
    readonly: false,
    manifest: MANIFEST_PATH,
    out: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--cleanup") args.cleanup = true;
    else if (a === "--readonly") args.readonly = true;
    else if (a === "--case") args.caseName = argv[++i];
    else if (a === "--manifest") args.manifest = resolve(argv[++i]);
    else if (a === "--out") args.out = resolve(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function printHelp() {
  console.log(`SC-ATHLETE-WF-001 — individual athlete workflow QA

Usage:
  node tools/testing/sc-athlete-wf.mjs --case <${VALID_CASES.join("|")}> [--readonly|--apply]
  node tools/testing/sc-athlete-wf.mjs --cleanup [--manifest path]

Flags:
  --case       Required unless --cleanup
  --readonly   Live read-only probe (no creates)
  --apply      Create disposable ATHWF| records and poll (default: dry-run)
  --cleanup    Delete only manifest records (ATHWF| guard)
  --out        Evidence JSON path

Safety:
  - Dry-run by default
  - Gated enrollment ${GATED_ENROLLMENT_ID} (Testing3 Schmidt)
  - No email / Resend / Make / Gmail
  - Do not run SC-PW-E2E --apply or season simulation from this tool
`);
}

function initReport(caseName, mode) {
  return {
    harness: "SC-ATHLETE-WF-001",
    case: caseName,
    mode,
    startedAt: new Date().toISOString(),
    created: {},
    checks: [],
    defects: [],
    negatives: buildNegativeCaseMatrix(),
    cleanup: null,
    passed: false,
    blockers: [],
  };
}

async function runDry(ctx, report) {
  report.plan = buildDryRunPlan(ctx);
  report.streakOffline = computeStreakFromDates(
    [...new Set(ctx.submissionPlan.map((s) => s.date))]
  );
  const sameDay = ctx.submissionPlan.filter((s) => s.date === ctx.weekDates[0]);
  report.policyNotes = [
    evaluateCountedDayXpPolicy(
      sameDay.map((s, i) => ({
        sourceKey: `SUBMISSION_XP|planned-${i}`,
        active: true,
      }))
    ),
  ];
  report.checks.push({
    id: "dry-run.plan",
    status: "PASS",
    pass: true,
    expected: "plan emitted",
    actual: `submissions=${report.plan.submissionCount}`,
  });
  report.passed = true;
  return report;
}

async function runReadonly(token, baseId, ctx, report) {
  report.probe = await readonlyProbe(token, baseId, ctx);
  if (!report.probe.enrollment?.active) {
    report.defects.push(
      buildDefect({
        severity: "P0",
        stage: 1,
        title: "Gated enrollment not Active",
        steps: ["--readonly probe Testing3"],
        expected: "Active? = true",
        actual: String(report.probe.enrollment?.active),
        likelyCause: "Enrollment deactivated or wrong id",
        recommendedFix: "Restore Testing3 Active? before apply",
        fixOwner: "airtable",
      })
    );
    report.passed = false;
    return report;
  }
  report.checks.push({
    id: "readonly.enrollment_active",
    status: "PASS",
    pass: true,
    expected: true,
    actual: report.probe.enrollment.active,
  });
  report.passed = true;
  return report;
}

async function runApply(token, baseId, ctx, report) {
  report.created = await createDisposableFixture(token, baseId, ctx);
  report.enrollmentBefore = await readEnrollmentSnapshot(token, baseId, ctx.enrollmentId);

  report.submissionXp = await pollSubmissionXp(token, baseId, report.created.submissionIds);

  const xpKeys = report.created.submissionIds.map(submissionXpKey);
  for (const subId of report.created.submissionIds) {
    const info = report.submissionXp[subId] || { count: 0 };
    const pass = info.count === 1;
    report.checks.push({
      id: `submission_xp.${subId}`,
      stage: 5,
      status: pass ? "PASS" : "FAIL",
      pass,
      expected: 1,
      actual: info.count,
      sourceKey: submissionXpKey(subId),
      xpIds: info.ids,
    });
    if (!pass) {
      report.defects.push(
        buildDefect({
          severity: "P0",
          stage: 5,
          title: `Submission XP count ${info.count} for ${subId}`,
          steps: [
            "Create Count It Simple Total submission on Testing3",
            "Wait for automation 010",
            `Expect Source Key ${submissionXpKey(subId)} exactly once`,
          ],
          expected: "Exactly one active SUBMISSION_XP event",
          actual: `count=${info.count} ids=${(info.ids || []).join(",")}`,
          likelyCause:
            info.count === 0
              ? "010 not triggered, Count This Submission?=0, or PAT/schema gap"
              : "010 duplicate writer or missing Source Key uniqueness",
          recommendedFix: "Inspect 010 run history for submission; confirm Reconciliation Needed?",
          fixOwner: "airtable",
        })
      );
    }
  }

  const day0 = report.created.submissionMeta.filter((s) => s.date === ctx.weekDates[0]);
  const day0Xp = day0.map((s) => ({
    sourceKey: submissionXpKey(s.id),
    active: (report.submissionXp[s.id]?.count || 0) > 0,
  }));
  report.sameDayPolicy = evaluateCountedDayXpPolicy(day0Xp);
  if (report.sameDayPolicy.policyOpen) {
    report.defects.push(
      buildDefect({
        severity: "P2",
        stage: 5,
        title: "Multiple SUBMISSION_XP on same Denver day (SC-005 B3)",
        steps: ["Create two Count It submissions same Activity Date", "Poll SUBMISSION_XP|*"],
        expected: "Product decision: at most one counted shooting XP day (engine doc) OR allow per-submission XP",
        actual: report.sameDayPolicy.note,
        likelyCause: "115/010 Count It path awards per submission; engine rule says per day",
        recommendedFix: "Product decision then align 010 / intake Count It preset",
        fixOwner: "product-decision",
      })
    );
  }

  report.homeworkXp = await pollHomeworkXp(token, baseId, report.created.homeworkId, {
    expectXp: true,
  });
  const hwPass = report.homeworkXp.count === 1;
  report.checks.push({
    id: "homework_xp.satisfactory",
    stage: 9,
    status: hwPass ? "PASS" : "FAIL",
    pass: hwPass,
    expected: 1,
    actual: report.homeworkXp.count,
    sourceKey: homeworkXpKey(report.created.homeworkId),
  });
  if (!hwPass) {
    report.defects.push(
      buildDefect({
        severity: "P1",
        stage: 9,
        title: "Satisfactory homework XP not exactly once",
        steps: [
          "Create Homework Completion Satisfactory?=true",
          "Await 065",
          `Expect ${homeworkXpKey(report.created.homeworkId)} once`,
        ],
        expected: "One HOMEWORK_XP event",
        actual: `count=${report.homeworkXp.count}`,
        likelyCause: "065 not triggered (Homework XP Reconciliation Needed?) or HC missing PHA/links",
        recommendedFix: "Ensure HC meets 065 trigger fields; do not invent Satisfactory-only award if rules require more",
        fixOwner: "airtable",
      })
    );
  }

  report.incompleteHomeworkXp = await pollHomeworkXp(
    token,
    baseId,
    report.created.incompleteHomeworkId,
    { expectXp: false, timeoutMs: 25000 }
  );
  const incompleteOk = report.incompleteHomeworkXp.count === 0;
  report.checks.push({
    id: "homework_xp.incomplete_none",
    stage: 17,
    status: incompleteOk ? "PASS" : "FAIL",
    pass: incompleteOk,
    expected: 0,
    actual: report.incompleteHomeworkXp.count,
  });
  if (!incompleteOk) {
    report.defects.push(
      buildDefect({
        severity: "P1",
        stage: 17,
        title: "Incomplete homework incorrectly awarded XP",
        steps: ["Create HC Satisfactory?=false", "Poll HOMEWORK_XP"],
        expected: "Zero XP events",
        actual: `count=${report.incompleteHomeworkXp.count}`,
        likelyCause: "065 award without Satisfactory gate",
        recommendedFix: "Confirm 065 Satisfactory? guard",
        fixOwner: "code",
      })
    );
  }

  report.duplicateCheck = await verifyNoDuplicateSourceKeys(token, baseId, [
    ...xpKeys,
    homeworkXpKey(report.created.homeworkId),
    videoXpKey(report.created.videoId),
  ]);
  for (const row of report.duplicateCheck) {
    report.checks.push({
      id: `dedupe.${row.sourceKey}`,
      stage: 16,
      status: row.pass ? "PASS" : "FAIL",
      pass: row.pass,
      expected: "<=1",
      actual: row.count,
    });
    if (!row.pass) {
      report.defects.push(
        buildDefect({
          severity: "P0",
          stage: 16,
          title: `Duplicate XP for ${row.sourceKey}`,
          steps: ["Create source once", "Re-poll / re-run writer", "Count XP by Source Key"],
          expected: "At most one XP Event per Source Key",
          actual: `count=${row.count} ids=${row.ids.join(",")}`,
          likelyCause: "Missing Source Key uniqueness or race",
          recommendedFix: "Hard-stop on duplicate Source Key in writer",
          fixOwner: "code",
        })
      );
    }
  }

  report.was = await readWasSnapshot(token, baseId, report.created.wasId);
  const uniqueDates = [...new Set(report.created.submissionMeta.map((s) => s.date))];
  report.wasChecks = evaluateWasSnapshot(report.was, {
    daysLogged: uniqueDates.length,
    minShots: report.created.submissionMeta.reduce((n, s) => n + s.shots, 0),
  });
  report.checks.push(...report.wasChecks);

  report.streakOffline = computeStreakFromDates(uniqueDates);
  report.enrollmentAfter = await readEnrollmentSnapshot(token, baseId, ctx.enrollmentId);

  report.passed = report.defects.filter((d) => d.severity === "P0").length === 0;
  return report;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.cleanup) {
    const { token, baseId } = requireToken();
    const manifest = loadManifest(args.manifest);
    if (!manifest) {
      console.error("No manifest found — nothing to clean");
      process.exit(1);
    }
    const cleanup = await cleanupAthwfRecords(token, baseId, manifest);
    const report = {
      harness: "SC-ATHLETE-WF-001",
      mode: "cleanup",
      startedAt: new Date().toISOString(),
      created: manifest,
      cleanup,
      passed: true,
    };
    const path = writeEvidence(report, args.out);
    console.log(JSON.stringify({ ok: true, evidence: path, cleanup }, null, 2));
    process.exit(0);
  }

  if (!args.caseName) {
    printHelp();
    process.exit(1);
  }

  const mode = args.apply ? "apply" : args.readonly ? "readonly" : "dry-run";
  const ctx = buildRunContext(args.caseName);
  const report = initReport(args.caseName, mode);

  try {
    if (mode === "dry-run") {
      await runDry(ctx, report);
    } else {
      const { token, baseId } = requireToken();
      if (mode === "readonly") await runReadonly(token, baseId, ctx, report);
      else await runApply(token, baseId, ctx, report);
    }
  } catch (err) {
    report.passed = false;
    report.failure = {
      message: err.message,
      stage: err.stage || "unknown",
    };
    report.blockers.push(err.message);
    if (err.partialCreated) {
      report.created = err.partialCreated;
    }
    if (/Submission Stat Mode/i.test(err.message)) {
      report.defects.push(
        buildDefect({
          severity: "P1",
          stage: 3,
          title: "Harness must not write formula Submission Stat Mode",
          steps: ["POST Submissions with Submission Stat Mode=Simple Total"],
          expected: "API accepts writable fields only; mode derives from Shot Total",
          actual: err.message,
          likelyCause: "Submission Stat Mode is a formula field",
          recommendedFix: "Omit Submission Stat Mode; set Shot Total only (fixed in sc-athlete-wf-lib)",
          fixOwner: "code",
        })
      );
    }
    if (/Unknown field name: \\\"Name\\\"|Unknown field name: \"Name\"/i.test(err.message)) {
      report.defects.push(
        buildDefect({
          severity: "P1",
          stage: 2,
          title: "Weeks primary label field is Week Name not Name",
          steps: ["POST Weeks with Name"],
          expected: "Use Week Name",
          actual: err.message,
          likelyCause: "Wrong field name in harness",
          recommendedFix: "Write Week Name (fixed in sc-athlete-wf-lib)",
          fixOwner: "code",
        })
      );
    }
    if (/not visible|PAT|403|MRW-I04/i.test(err.message)) {
      report.defects.push(
        buildDefect({
          severity: "P0",
          stage: 1,
          title: "Live apply blocked by PAT / enrollment visibility",
          steps: ["--apply with current AIRTABLE_API_TOKEN"],
          expected: "Enrollments + Weeks + Submissions writable",
          actual: err.message,
          likelyCause: "Token scope (MRW-I04)",
          recommendedFix: "Use Enrollments-capable PAT; keep dry-run evidence until then",
          fixOwner: "airtable",
        })
      );
    }
  }

  report.finishedAt = new Date().toISOString();
  if (args.apply && report.created?.weekId) {
    saveManifest({
      harness: "SC-ATHLETE-WF-001",
      createdAt: report.startedAt,
      ...report.created,
    }, args.manifest);
  }
  const evidencePath = writeEvidence(report, args.out);
  report.evidencePath = evidencePath;

  console.log(
    JSON.stringify(
      {
        ok: report.passed,
        mode: report.mode,
        case: report.case,
        evidence: evidencePath,
        checksPass: report.checks.filter((c) => c.pass).length,
        checksFail: report.checks.filter((c) => !c.pass).length,
        defects: report.defects.length,
        blockers: report.blockers,
        created: report.created,
      },
      null,
      2
    )
  );

  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
