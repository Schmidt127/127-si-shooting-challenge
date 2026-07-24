#!/usr/bin/env node
/**
 * Reliability Command Center — offline audit CLI
 *
 * Usage:
 *   node tools/reliability-command-center/cli.js --fixture <path>
 *   node tools/reliability-command-center/cli.js --input <export-path> --output <report-path>
 *
 * Does not call Airtable, Make, or Gmail.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runAudit } = require("../../lib/reliability-command-center");

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  const flags = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      flags.add("help");
      continue;
    }
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        options[key] = next;
        i += 1;
      } else {
        flags.add(key);
        options[key] = true;
      }
    }
  }
  return { options, flags, has: (f) => flags.has(f) || options[f] != null };
}

function printHelp() {
  return `
Shooting Challenge — Reliability Command Center audit runner

Usage:
  node tools/reliability-command-center/cli.js --fixture <path>
  node tools/reliability-command-center/cli.js --input <export.json> --output <report-dir-or-json>

Options:
  --fixture <path>   Synthetic fixture JSON (alias of --input for tests)
  --input <path>     Airtable export / fixture JSON
  --output <path>    Write report: if directory, writes report.json + report.md;
                     if ends with .json, writes JSON and sibling .md
  --workflows <list> Comma-separated checker names (enrollment,submissions,...)
  --json             Print JSON report to stdout
  --markdown         Print Markdown report to stdout (default summary)
  --help             Show help

Exit codes:
  0  success (even when findings exist)
  1  usage / IO / malformed input error
`.trim();
}

function loadJson(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const text = fs.readFileSync(abs, "utf8");
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON in ${abs}: ${err.message}`);
  }
}

function resolveOutputPaths(output) {
  if (!output) return null;
  const abs = path.resolve(output);
  if (abs.endsWith(".json")) {
    return {
      jsonPath: abs,
      mdPath: abs.replace(/\.json$/i, ".md"),
    };
  }
  return {
    jsonPath: path.join(abs, "report.json"),
    mdPath: path.join(abs, "report.md"),
  };
}

function main() {
  const args = parseArgs();
  if (args.has("help")) {
    console.log(printHelp());
    process.exit(0);
  }

  const inputPath = args.options.fixture || args.options.input;
  if (!inputPath) {
    console.error("Error: --fixture <path> or --input <path> is required.\n");
    console.error(printHelp());
    process.exit(1);
  }

  let raw;
  try {
    raw = loadJson(inputPath);
  } catch (err) {
    console.error(String(err.message || err));
    process.exit(1);
  }

  const workflows = args.options.workflows
    ? String(args.options.workflows)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const result = runAudit(raw, {
    fixturePath: path.resolve(inputPath),
    source: args.options.fixture ? "fixture" : "export",
    workflows,
  });

  const outPaths = resolveOutputPaths(args.options.output);
  if (outPaths) {
    fs.mkdirSync(path.dirname(outPaths.jsonPath), { recursive: true });
    fs.writeFileSync(outPaths.jsonPath, JSON.stringify(result.report, null, 2) + "\n");
    fs.writeFileSync(outPaths.mdPath, result.markdown);
    console.error(`Wrote ${outPaths.jsonPath}`);
    console.error(`Wrote ${outPaths.mdPath}`);
  }

  if (args.has("json") || args.options.json) {
    console.log(JSON.stringify(result.report, null, 2));
  } else if (args.has("markdown") || args.options.markdown) {
    console.log(result.markdown);
  } else {
    const s = result.summary;
    console.log(
      JSON.stringify(
        {
          ok: true,
          total: s.total,
          byPriority: s.byPriority,
          byWorkflow: s.byWorkflow,
          affectedRecordIds: result.report.affectedRecordIds,
        },
        null,
        2
      )
    );
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, loadJson, resolveOutputPaths, main };
