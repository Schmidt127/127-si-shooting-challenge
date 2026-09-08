#!/usr/bin/env node
"use strict";

/**
 * Issue #100 — bounded live XP integrity reconciler.
 *
 * DEFAULT: dry-run.
 * Live writes require ALL of:
 *   --execute
 *   --acknowledge-prod
 *   --record-ids rec...,rec...
 * Orphan deletion additionally requires:
 *   --confirm-destructive
 *
 * Safety:
 * - explicit IDs only; max 25
 * - re-reads current PROD state immediately before action planning
 * - any ambiguous/manual finding blocks the whole execute batch
 * - never moves XP Events between Enrollments
 * - never writes Current Level / Next Level / Level Status
 * - only queues Enrollments.Level Recalc Needed? for Automation 042
 * - replay-safe: retired targets become NOOP_ALREADY_INACTIVE; deleted targets become
 *   ALREADY_ABSENT no-ops rather than failures or recreation attempts
 */

const { writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { BASE_ID, EVIDENCE_DIR } = require("../testing/sc-test-control/config");
const { loadEnvLocal, airtableToken } = require("../testing/sc-test-control/identity");
const {
  fetchXpHealthSnapshot,
} = require("../testing/sc-test-control/lib/readonly-expected-actual");
const { runAudit } = require("../../lib/reliability-command-center");
const { planBatch } = require("../../lib/reliability-command-center/xp-reconciliation-plan");

const ROOT = resolve(__dirname, "../..");
const MAX_TARGETS = 25;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function parseRecordIds(value) {
  if (!value || value === "*" || value === "all") {
    throw new Error("--record-ids with explicit Airtable record IDs is required");
  }
  const ids = String(value).split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length || ids.length > MAX_TARGETS) {
    throw new Error(`--record-ids must contain 1-${MAX_TARGETS} explicit IDs`);
  }
  if (ids.some((id) => !/^rec[a-zA-Z0-9]{14}$/.test(id))) {
    throw new Error("every --record-ids value must be a valid Airtable rec… ID");
  }
  return Array.from(new Set(ids));
}

async function airtableRequest(method, table, recordId, body) {
  const token = airtableToken();
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}/${recordId}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${table}/${recordId} ${res.status}: ${text.slice(0, 180)}`);
  return text ? JSON.parse(text) : {};
}

/**
 * Fetch one XP Event regardless of Active? state.
 * A missing/deleted target is a safe idempotent terminal state, not an error.
 */
async function fetchXpRecordById(recordId) {
  const token = airtableToken();
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent("XP Events")}/${recordId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET XP Events/${recordId} ${res.status}: ${text.slice(0, 180)}`);
  return text ? JSON.parse(text) : null;
}

async function executeAction(action) {
  if (action.type === "DELETE_RECORD") {
    return airtableRequest("DELETE", action.table, action.recordId);
  }
  if (action.type === "UPDATE_RECORD") {
    return airtableRequest("PATCH", action.table, action.recordId, { fields: action.fields });
  }
  throw new Error(`unsupported action type: ${action.type}`);
}

function targetRecords(rows, ids) {
  const byId = new Map((rows || []).map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function buildCurrentPlan(ids) {
  // Health snapshot intentionally contains active XP only so the global audit stays focused.
  const snapshot = await fetchXpHealthSnapshot();
  const audit = runAudit(snapshot, {
    workflows: ["xpEvents", "xpSourceAuthority"],
    source: "prod-xp-reconcile-live",
  });

  // Target state is fetched separately without an Active? filter so a replay after a
  // successful retirement becomes NOOP_ALREADY_INACTIVE instead of a false missing error.
  const fetchedTargets = await Promise.all(ids.map((id) => fetchXpRecordById(id)));
  const existingTargets = fetchedTargets.filter(Boolean);
  const absentTargetIds = ids.filter((id, index) => !fetchedTargets[index]);
  const rows = targetRecords(existingTargets, ids);
  const batch = planBatch({ xpRecords: rows, issues: audit.issues });
  return { snapshot, audit, batch, absentTargetIds };
}

function evidencePath() {
  const outDir = resolve(ROOT, EVIDENCE_DIR);
  mkdirSync(outDir, { recursive: true });
  return resolve(outDir, "XP-INTEGRITY-RECONCILIATION-LATEST.json");
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  if (args.help) {
    console.log(`XP integrity reconciler — defaults to dry-run

Required:
  --record-ids recId,recId

Live write gate:
  --execute --acknowledge-prod

Additional orphan deletion gate:
  --confirm-destructive

Replay behavior:
  already inactive target -> no-op
  already deleted/absent target -> no-op

Examples:
  node tools/reliability-command-center/xp-reconcile-live.js --record-ids recXXXXXXXXXXXXXX
  node tools/reliability-command-center/xp-reconcile-live.js --record-ids recXXXXXXXXXXXXXX --execute --acknowledge-prod
`);
    return;
  }

  const ids = parseRecordIds(args["record-ids"]);
  if (!airtableToken()) throw new Error("AIRTABLE_API_TOKEN missing");

  // Fresh PROD read immediately before planning.
  const before = await buildCurrentPlan(ids);

  const dryRun = args.execute !== true;
  const payload = {
    generated_at: new Date().toISOString(),
    mode: dryRun ? "DRY_RUN" : "EXECUTE",
    baseId: BASE_ID,
    explicitRecordIds: ids,
    alreadyAbsentTargetIds: before.absentTargetIds,
    plan: before.batch,
    writesPerformed: [],
    verification: null,
  };

  if (dryRun) {
    const path = evidencePath();
    writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
    console.log(JSON.stringify({ ...payload, evidencePath: path }, null, 2));
    return;
  }

  if (args["acknowledge-prod"] !== true) {
    throw new Error("live writes require --execute --acknowledge-prod");
  }
  if (!before.batch.executeAllowed) {
    throw new Error("execute refused: one or more targets require manual review or have unsupported findings");
  }
  if (before.batch.destructiveCount > 0 && args["confirm-destructive"] !== true) {
    throw new Error("orphan deletion requires --confirm-destructive");
  }

  // No-op and already-absent targets are allowed; only planned actions are executed.
  for (const plan of before.batch.plans) {
    for (const action of plan.actions) {
      const result = await executeAction(action);
      payload.writesPerformed.push({
        xpEventId: plan.xpEventId,
        action: action.type,
        table: action.table,
        recordId: action.recordId,
        ok: true,
        deleted: result.deleted === true,
      });
    }
  }

  // Read back current PROD immediately after bounded writes.
  const afterSnapshot = await fetchXpHealthSnapshot();
  const afterAudit = runAudit(afterSnapshot, {
    workflows: ["xpEvents", "xpSourceAuthority"],
    source: "prod-xp-reconcile-live-postwrite",
  });
  const remainingTargetIssues = afterAudit.issues.filter((issue) => ids.includes(issue.sourceRecordId));
  const activeTargetIds = new Set((afterSnapshot.xpEvents || []).map((row) => row.id));
  payload.verification = {
    remainingTargetIssueCount: remainingTargetIssues.length,
    remainingTargetIssueCodes: remainingTargetIssues.map((issue) => issue.code),
    stillActiveTargetIds: ids.filter((id) => activeTargetIds.has(id)),
    alreadyAbsentTargetIds: before.absentTargetIds,
    activeBlankEnrollmentOrphanCount: (afterSnapshot.xpEvents || []).filter((row) => {
      const f = row.fields || {};
      return f["Active?"] === true && (!Array.isArray(f.Enrollment) || f.Enrollment.length === 0);
    }).length,
  };

  const path = evidencePath();
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
  console.log(JSON.stringify({ ...payload, evidencePath: path }, null, 2));

  if (payload.verification.remainingTargetIssueCount > 0) process.exitCode = 2;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  parseRecordIds,
  airtableRequest,
  fetchXpRecordById,
  targetRecords,
  buildCurrentPlan,
  executeAction,
  main,
};
