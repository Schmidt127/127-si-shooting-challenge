#!/usr/bin/env node
/**
 * Autonomous production-readiness QA orchestrator.
 *
 *   node tools/testing/autonomous-qa-run.mjs
 *   node tools/testing/autonomous-qa-run.mjs --live-create   # create disposable submission fixtures
 *   node tools/testing/autonomous-qa-run.mjs --cleanup       # delete manifest records only
 *
 * Never logs secrets. All disposable records are labeled AUTONOMOUS_QA_*.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requireToken,
  getRecord,
  listRecords,
  createRecords,
  deleteRecords,
  updateRecords,
  ROOT,
} from "./lib/airtable-client.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = "/opt/cursor/artifacts/autonomous-qa";
const MANIFEST_PATH = resolve(ROOT, "docs/testing/autonomous-qa/latest-manifest.json");

const RUN_ID =
  process.env.AUTONOMOUS_QA_RUN_ID ||
  `AUTONOMOUS_QA_${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}`;

const LIVE_CREATE = process.argv.includes("--live-create");
const CLEANUP = process.argv.includes("--cleanup");
const DRY_RUN = !LIVE_CREATE && !CLEANUP;

const ENROLLMENT_TARGETS = [
  { id: "rec93mAfo5jKqP3g5", label: "perfect_week_testing", slug: "perfect-week-testing" },
  { id: "recCrNNAdVmQ4Y8fL", label: "xavier_schmidt", slug: "xavier-schmidt" },
  { id: "recNu6fcBpF1GG3u5", label: "testing3_schmidt", slug: "testing3-schmidt" },
  { id: "reclc46bQM8Wx0qWP", label: "curtis_schmidt", slug: "curtis-schmidt" },
];

const WEB_ROUTES = [
  "https://www.fairfieldbasketballclub.com/shoot",
  "https://www.fairfieldbasketballclub.com/shoot/api/airtable",
  "https://www.fairfieldbasketballclub.com/shoot/dashboard",
  "https://www.fairfieldbasketballclub.com/shoot/dashboard/preview",
  "https://www.fairfieldbasketballclub.com/shoot/athletes/xavier-schmidt",
  "https://www.fairfieldbasketballclub.com/shoot/athletes/perfect-week-testing",
  "https://www.fairfieldbasketballclub.com/shoot/athletes/testing3-schmidt",
  "https://www.fairfieldbasketballclub.com/shoot/athletes/curtis-schmidt",
  "https://www.fairfieldbasketballclub.com/shoot/leaderboard",
];

function nowIso() {
  return new Date().toISOString();
}

function checklistRow(component, state, method, expected, actual, status, evidence = null, fix = null) {
  return {
    component,
    current_state: state,
    test_method: method,
    expected_result: expected,
    actual_result: actual,
    failure: status === "FAIL" ? actual : null,
    fix,
    evidence,
    final_status: status,
  };
}

function runCommand(name, command, args, cwd = ROOT) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: process.env });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  const tail = output.split("\n").slice(-8).join("\n");
  return {
    name,
    command: `${command} ${args.join(" ")}`,
    exitCode: result.status ?? 1,
    durationMs: Date.now() - started,
    pass: result.status === 0,
    outputTail: tail,
  };
}

async function fetchXpBySourceKey(token, baseId, sourceKey) {
  return listRecords(token, baseId, "XP Events", {
    filterByFormula: `{Source Key}="${sourceKey}"`,
    fields: ["Source Key", "XP Points", "XP Bucket", "XP Source", "Active?", "XP Activity Date", "Enrollment Record ID"],
  });
}

async function reconcileEnrollment(token, baseId, target) {
  const outPath = `${ARTIFACT_DIR}/reconcile-${target.id}.json`;
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/full-xp-reconciliation.mjs", target.id, outPath],
    { cwd: resolve(ROOT, "web"), encoding: "utf8", env: process.env }
  );
  let parsed = null;
  if (existsSync(outPath)) {
    try {
      parsed = JSON.parse(readFileSync(outPath, "utf8"));
    } catch {
      parsed = null;
    }
  }
  const missing = parsed?.missing?.submissionsWithoutXp || [];
  const activeXp =
    parsed?.totals?.activeXpEvents ??
    parsed?.summary?.totals?.activeXpEvents ??
    null;
  return {
    enrollmentId: target.id,
    label: target.label,
    slug: target.slug,
    reconciliationExitCode: result.status ?? 1,
    activeXpEvents: activeXp,
    missingSubmissionXp: missing.map((subId) => ({
      type: "submission_xp",
      subId,
      sourceKey: `SUBMISSION_XP|${subId}`,
    })),
    pass: (result.status ?? 1) === 0 && missing.length === 0,
    artifact: outPath,
  };
}

async function createDisposableSubmission(token, baseId, manifest) {
  const target = ENROLLMENT_TARGETS.find((e) => e.label === "testing3_schmidt");
  const enrollment = await getRecord(token, baseId, "Enrollments", target.id);
  const athleteId = (enrollment.fields?.Athlete || [])[0];
  const today = new Date();
  const activityDate = today.toISOString();

  const createPayload = {
    fields: {
      Enrollment: [target.id],
      Athlete: athleteId ? [athleteId] : undefined,
      "Activity Date": activityDate,
      "Shot Total": 25,
      "Duplicate Review Status": "Count It",
      "Daily Email Subject": `${RUN_ID} disposable submission`,
    },
  };

  if (DRY_RUN) {
    manifest.created.push({
      table: "Submissions",
      action: "dry_run_skip",
      payload: createPayload,
    });
    return null;
  }

  const created = await createRecords(token, baseId, "Submissions", [createPayload]);
  const submission = created.records[0];
  manifest.created.push({
    table: "Submissions",
    id: submission.id,
    enrollmentId: target.id,
    runId: RUN_ID,
  });

  const sourceKey = `SUBMISSION_XP|${submission.id}`;
  await sleep(25000);
  let xpEvents = await fetchXpBySourceKey(token, baseId, sourceKey);
  for (let attempt = 0; attempt < 4 && !xpEvents.length; attempt++) {
    await sleep(15000);
    xpEvents = await fetchXpBySourceKey(token, baseId, sourceKey);
  }
  for (const xp of xpEvents) {
    manifest.created.push({ table: "XP Events", id: xp.id, sourceKey, runId: RUN_ID });
  }
  manifest.verifications.push({
    check: "disposable_submission_xp",
    submissionId: submission.id,
    sourceKey,
    xpCount: xpEvents.length,
    xpIds: xpEvents.map((e) => e.id),
    pass: xpEvents.length >= 1,
  });
  return submission;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probeWebRoutes(rows) {
  for (const url of WEB_ROUTES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
      clearTimeout(timer);
      const status = res.status;
      const pass = status >= 200 && status < 400;
      rows.push(
        checklistRow(
          `Web route ${url}`,
          "production",
          "HTTP GET",
          "2xx/3xx within 15s",
          `status ${status}`,
          pass ? "PASS" : "FAIL",
          url
        )
      );
    } catch (err) {
      rows.push(
        checklistRow(
          `Web route ${url}`,
          "production",
          "HTTP GET",
          "2xx/3xx within 15s",
          String(err.message || err),
          "FAIL",
          url
        )
      );
    }
  }
}

async function runRepoValidation(repoChecks) {
  const commands = [
    ["agent4-suite", "node", ["tools/testing/run-agent4-suite.js"]],
    ["validate-v2-release-readiness", "node", ["tools/validate-v2-release-readiness.js"]],
    ["audit-source-of-truth", "node", ["tools/testing/audit-source-of-truth.mjs"]],
    ["python-airtable-tests", "python3", ["-m", "unittest", "discover", "-s", "tools/airtable/tests"]],
    ["lambda-upload-tests", "python3", ["-m", "unittest", "discover", "-s", "lambda/upload-asset/tests"]],
    ["web-test", "npm", ["test"], resolve(ROOT, "web")],
    ["web-typecheck", "npm", ["run", "typecheck"], resolve(ROOT, "web")],
    ["web-lint", "npm", ["run", "lint"], resolve(ROOT, "web")],
    ["web-build", "npm", ["run", "build"], resolve(ROOT, "web")],
    ["e2e-matrix", "node", ["tools/testing/run_e2e_matrix.mjs", "--out", `${ARTIFACT_DIR}/E2E-MATRIX-RESULTS.json`]],
    ["sc007-008", "node", ["tools/testing/sc-007-008/run-suite.js"]],
  ];

  for (const [name, cmd, args, cwd] of commands) {
    repoChecks.push(runCommand(name, cmd, args, cwd || ROOT));
  }
}

async function cleanupManifest(token, baseId, manifest) {
  const deleted = [];
  for (const item of [...manifest.created].reverse()) {
    if (!item.id || item.action === "dry_run_skip") continue;
    try {
      await deleteRecords(token, baseId, item.table, [item.id]);
      deleted.push({ table: item.table, id: item.id, status: "deleted" });
    } catch (err) {
      deleted.push({ table: item.table, id: item.id, status: "error", message: String(err.message || err) });
    }
  }
  return deleted;
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  mkdirSync(resolve(ROOT, "docs/testing/autonomous-qa"), { recursive: true });

  const { token, baseId } = requireToken();
  const manifest = {
    run_id: RUN_ID,
    started_at: nowIso(),
    mode: CLEANUP ? "cleanup" : LIVE_CREATE ? "live_create" : "read_only",
    base_id: baseId,
    created: [],
    changed: [],
    deleted: [],
    verifications: [],
    checklist: [],
    repo_checks: [],
  };

  if (CLEANUP) {
    if (!existsSync(MANIFEST_PATH)) {
      console.error(`No manifest at ${MANIFEST_PATH}`);
      process.exit(1);
    }
    const prior = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    manifest.deleted = await cleanupManifest(token, baseId, prior);
    manifest.completed_at = nowIso();
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ cleanup: manifest.deleted }, null, 2));
    return;
  }

  await runRepoValidation(manifest.repo_checks);

  for (const target of ENROLLMENT_TARGETS) {
    try {
      const result = await reconcileEnrollment(token, baseId, target);
      manifest.verifications.push(result);
      manifest.checklist.push(
        checklistRow(
          `XP reconciliation ${target.label}`,
          result.pass ? "live-tested" : "needs live proof",
          "web/scripts/full-xp-reconciliation.mjs",
          "No counted submission missing canonical SUBMISSION_XP per full-xp-reconciliation.mjs",
          result.pass
            ? `pass (${result.activeXpEvents ?? "?"} active XP events)`
            : `missing ${result.missingSubmissionXp.length} submission XP row(s)`,
          result.pass ? "PASS" : target.label.includes("perfect_week") ? "FAIL" : "FINDING",
          result.artifact
        )
      );
      writeFileSync(`${ARTIFACT_DIR}/reconcile-${target.id}.json`, JSON.stringify(result, null, 2));
    } catch (err) {
      manifest.checklist.push(
        checklistRow(
          `XP reconciliation ${target.label}`,
          "blocked",
          "Airtable REST",
          "Enrollment readable",
          String(err.message || err),
          "BLOCKED"
        )
      );
    }
  }

  try {
    const pw = await reconcileEnrollment(token, baseId, ENROLLMENT_TARGETS[0]);
    const xpEvents = await listRecords(token, baseId, "XP Events", {
      filterByFormula: `{Enrollment Record ID}="${ENROLLMENT_TARGETS[0].id}"`,
      maxRecords: 200,
      fields: ["Source Key", "XP Bucket", "Active?", "XP Points"],
    });
    const activeXp = xpEvents.filter((e) => e.fields?.["Active?"] === true);
    const buckets = [...new Set(activeXp.map((e) => e.fields?.["XP Bucket"]).filter(Boolean))];
    manifest.verifications.push({
      check: "perfect_week_testing_ledger",
      activeXpCount: activeXp.length,
      buckets,
      pass: activeXp.length >= 39,
    });
    manifest.checklist.push(
      checklistRow(
        "Perfect Week Testing ledger",
        "live-tested",
        "XP Events filter by enrollment",
        ">=39 active XP events after repair",
        `${activeXp.length} active; buckets: ${buckets.join(", ")}`,
        activeXp.length >= 39 ? "PASS" : "FAIL"
      )
    );
  } catch (err) {
    manifest.checklist.push(
      checklistRow(
        "Perfect Week Testing ledger",
        "blocked",
        "XP Events filter",
        ">=39 active XP",
        String(err.message || err),
        "BLOCKED"
      )
    );
  }

  await probeWebRoutes(manifest.checklist);

  if (LIVE_CREATE) {
    try {
      await createDisposableSubmission(token, baseId, manifest);
      manifest.checklist.push(
        checklistRow(
          "Disposable submission XP",
          "live-tested",
          "Create submission + poll SUBMISSION_XP",
          "XP Event created by automation 010",
          JSON.stringify(manifest.verifications.at(-1) || {}),
          manifest.verifications.at(-1)?.pass ? "PASS" : "FAIL"
        )
      );
    } catch (err) {
      manifest.checklist.push(
        checklistRow(
          "Disposable submission XP",
          "failed",
          "Create submission",
          "XP Event created",
          String(err.message || err),
          "FAIL"
        )
      );
    }
  } else {
    manifest.checklist.push(
      checklistRow(
        "Disposable submission XP",
        "repository-ready",
        "node tools/testing/autonomous-qa-run.mjs --live-create",
        "XP Event created after API submission",
        "Skipped in read-only mode",
        "NOT_TESTED"
      )
    );
  }

  for (const check of manifest.repo_checks) {
    manifest.checklist.push(
      checklistRow(
        `Repo check ${check.name}`,
        "repository-ready",
        check.command,
        "exit 0",
        check.pass ? "pass" : `exit ${check.exitCode}`,
        check.pass ? "PASS" : "FAIL",
        check.outputTail
      )
    );
  }

  manifest.completed_at = nowIso();
  manifest.summary = {
    total: manifest.checklist.length,
    pass: manifest.checklist.filter((r) => r.final_status === "PASS").length,
    fail: manifest.checklist.filter((r) => r.final_status === "FAIL").length,
    finding: manifest.checklist.filter((r) => r.final_status === "FINDING").length,
    blocked: manifest.checklist.filter((r) => r.final_status === "BLOCKED").length,
    not_tested: manifest.checklist.filter((r) => r.final_status === "NOT_TESTED").length,
  };

  const reportPath = `${ARTIFACT_DIR}/${RUN_ID}-report.json`;
  const matrixPath = `${ARTIFACT_DIR}/${RUN_ID}-checklist.json`;
  writeFileSync(reportPath, JSON.stringify(manifest, null, 2));
  writeFileSync(matrixPath, JSON.stringify(manifest.checklist, null, 2));
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  writeFileSync(
    resolve(ROOT, "docs/testing/autonomous-qa/latest-report.md"),
    buildMarkdownReport(manifest, reportPath)
  );

  console.log(
    JSON.stringify(
      {
        run_id: RUN_ID,
        report: reportPath,
        checklist: matrixPath,
        summary: manifest.summary,
      },
      null,
      2
    )
  );

  if (manifest.summary.fail > 0) process.exitCode = 2;
}

function buildMarkdownReport(manifest, reportPath) {
  const lines = [
    `# Autonomous QA Report — ${manifest.run_id}`,
    "",
    `**Started:** ${manifest.started_at}`,
    `**Completed:** ${manifest.completed_at}`,
    `**Mode:** ${manifest.mode}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| PASS | ${manifest.summary.pass} |`,
    `| FAIL | ${manifest.summary.fail} |`,
    `| FINDING | ${manifest.summary.finding || 0} |`,
    `| BLOCKED | ${manifest.summary.blocked} |`,
    `| NOT_TESTED | ${manifest.summary.not_tested} |`,
    "",
    "## Checklist",
    "",
    "| Component | Status | Actual |",
    "|-----------|--------|--------|",
  ];
  for (const row of manifest.checklist) {
    lines.push(`| ${row.component} | ${row.final_status} | ${String(row.actual_result).replace(/\|/g, "/").slice(0, 120)} |`);
  }
  lines.push("", `Full JSON: \`${reportPath}\``);
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
