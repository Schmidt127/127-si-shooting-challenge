#!/usr/bin/env node
/**
 * Dry-run repair preview for Reliability Command Center findings.
 *
 * Defaults to dry-run. Requires explicit --record-ids.
 * Refuses unbounded updates. Never writes to Airtable.
 *
 * Usage:
 *   node tools/reliability-command-center/repair-preview.js \
 *     --fixture tests/reliability-command-center/fixtures/mixed-health.json \
 *     --record-ids recWAS00000000001,recSub00000000001
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runAudit, RETRY_CLASS } = require("../../lib/reliability-command-center");

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

function proposeRepair(issue) {
  const eligibility = issue.retryEligibility;
  if (
    eligibility === RETRY_CLASS.NEVER_RETRY_COMPLETED ||
    eligibility === RETRY_CLASS.DUPLICATE_RISK ||
    eligibility === RETRY_CLASS.PROD_ACTION_PROHIBITED
  ) {
    return {
      apply: false,
      reason: eligibility,
      proposedChanges: [],
    };
  }

  /** @type {{ field: string, from: string, to: string, targetTable?: string }[]} */
  const proposedChanges = [];
  let explicitOperatorAction = false;

  switch (issue.code) {
    case "sent_still_armed":
      proposedChanges.push({
        field: "Send to Make?",
        from: "checked",
        to: "unchecked",
      });
      break;
    case "sent_build_armed":
      proposedChanges.push({
        field: "Build Weekly Email Now?",
        from: "checked",
        to: "unchecked",
      });
      break;
    case "was_build_flag_stuck":
      proposedChanges.push({
        field: "Build Weekly Email Now?",
        from: "checked",
        to: "unchecked (or re-trigger 072 after error cleared)",
      });
      break;
    case "level_recalc_flag_stuck":
      proposedChanges.push({
        field: "Recalculate Level?",
        from: "checked",
        to: "re-trigger 042 / clear after assign",
      });
      break;
    case "send_armed_not_ready":
      proposedChanges.push({
        field: "Send to Make?",
        from: "checked",
        to: "unchecked until Ready?",
      });
      break;
    case "xp_authoritative_source_missing":
    case "xp_authoritative_source_inactive":
      explicitOperatorAction = true;
      proposedChanges.push(
        {
          targetTable: "XP Events",
          field: "Active?",
          from: "checked",
          to: "unchecked — preserve XP Event row, amount, Source Key, and history",
        },
        {
          targetTable: "Enrollments",
          field: "Level Recalc Needed?",
          from: "current value",
          to: "checked for issue.enrollmentRecordId; Automation 042 remains sole level writer",
        }
      );
      break;
    case "xp_source_enrollment_mismatch":
    case "xp_source_key_enrollment_mismatch":
    case "xp_authoritative_source_ambiguous":
      explicitOperatorAction = true;
      proposedChanges.push({
        targetTable: "XP Events / authoritative source",
        field: "Ownership",
        from: "conflicted/ambiguous",
        to: "manual domain reconciliation required — never move or steal XP automatically",
      });
      break;
    case "manual_bonus_missing_audit_ownership":
      explicitOperatorAction = true;
      proposedChanges.push({
        targetTable: "XP Events",
        field: "Manual Bonus audit ownership",
        from: "missing/incomplete",
        to: "manual review; require MANUAL_BONUS| Source Key plus explicit operator/audit owner and reason",
      });
      break;
    case "xp_active_orphan_blank_enrollment":
      explicitOperatorAction = true;
      proposedChanges.push({
        targetTable: "XP Events",
        field: "record",
        from: "Active?=true + Enrollment blank",
        to: "permanent delete only after fresh exact re-query under approved #100 orphan policy",
      });
      break;
    default:
      if (eligibility === RETRY_CLASS.AUTOMATICALLY_RETRYABLE) {
        proposedChanges.push({
          field: "(re-run owning automation)",
          from: "error/stale",
          to: `re-trigger ${issue.owningAutomation || "owner"}`,
        });
      }
      break;
  }

  return {
    // This tool is preview-only. `apply` means an automatic retry is theoretically
    // eligible, not that a live mutation will occur here.
    apply: proposedChanges.length > 0 && eligibility === RETRY_CLASS.AUTOMATICALLY_RETRYABLE,
    reason: eligibility,
    proposedChanges,
    explicitOperatorAction,
  };
}

function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Dry-run repair preview (never writes Airtable)

Required:
  --fixture|--input <path>
  --record-ids <recId,recId,...>   explicit IDs only (refuses wildcard)

Optional:
  --execute   accepted but IGNORED for live writes in this tool
              (preview-only; use Mike-authorized backfills/operator actions for real repairs)
`);
    process.exit(0);
  }

  const inputPath = args.fixture || args.input;
  if (!inputPath) {
    console.error("Error: --fixture or --input required");
    process.exit(1);
  }
  if (!args["record-ids"] || args["record-ids"] === "*" || args["record-ids"] === "all") {
    console.error(
      "Error: --record-ids with explicit rec… IDs is required. Broad/unbounded updates refused."
    );
    process.exit(1);
  }

  const recordIds = String(args["record-ids"])
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recordIds.length || recordIds.some((id) => !/^rec[a-zA-Z0-9]{14}$/.test(id))) {
    console.error("Error: every --record-ids value must be a valid Airtable rec… id");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
  const result = runAudit(raw, { fixturePath: path.resolve(inputPath), source: "fixture" });
  const matched = result.issues.filter((i) => recordIds.includes(i.sourceRecordId));

  const previews = matched.map((issue) => {
    const repair = proposeRepair(issue);
    return {
      dryRun: true,
      sourceRecordId: issue.sourceRecordId,
      enrollmentRecordId: issue.enrollmentRecordId || "",
      sourceKey: issue.sourceKey || "",
      code: issue.code,
      healthStatus: issue.healthStatus,
      retryEligibility: issue.retryEligibility,
      recommendedAction: issue.recommendedAction,
      reconciliationAction: issue.meta?.reconciliationAction || "",
      ...repair,
      completedUpdate: null,
      note:
        args.execute === true || args.execute === "true"
          ? "EXECUTE FLAG IGNORED — this tool never writes live Airtable."
          : "Dry-run only.",
    };
  });

  const payload = {
    tool: "reliability-command-center/repair-preview",
    dryRun: true,
    liveWrites: false,
    boundedByExplicitRecordIds: true,
    recordIds,
    findingCount: matched.length,
    previews,
    automaticRetryEligible: previews.filter((p) => p.apply).length,
    explicitOperatorActions: previews.filter((p) => p.explicitOperatorAction).length,
  };

  console.log(JSON.stringify(payload, null, 2));
  for (const p of previews) {
    console.error(
      `[preview] ${p.sourceRecordId} ${p.code} apply=${p.apply} operator=${p.explicitOperatorAction} changes=${p.proposedChanges.length}`
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = { proposeRepair, parseArgs, main };
