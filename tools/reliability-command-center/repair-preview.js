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

  /** @type {{ field: string, from: string, to: string }[]} */
  const proposedChanges = [];

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
    apply: proposedChanges.length > 0 && eligibility === RETRY_CLASS.AUTOMATICALLY_RETRYABLE,
    reason: eligibility,
    proposedChanges,
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
              (preview-only; use Mike-authorized backfills for real repairs)
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
      code: issue.code,
      healthStatus: issue.healthStatus,
      retryEligibility: issue.retryEligibility,
      recommendedAction: issue.recommendedAction,
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
    recordIds,
    findingCount: matched.length,
    previews,
    skippedCompletedOrDuplicate: previews.filter((p) => !p.apply).length,
  };

  console.log(JSON.stringify(payload, null, 2));
  for (const p of previews) {
    console.error(
      `[preview] ${p.sourceRecordId} ${p.code} apply=${p.apply} changes=${p.proposedChanges.length}`
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = { proposeRepair, parseArgs, main };
