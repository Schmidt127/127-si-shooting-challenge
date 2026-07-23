#!/usr/bin/env node
"use strict";

/**
 * Read-only content-quality validator for tutorial/curriculum export fixtures.
 *
 * Usage:
 *   node bin/validate-content-quality.js --input ../../tests/fixtures/tutorials-content/quality-cases.json
 *   node bin/validate-content-quality.js --input file.json --require-grade-band --out report.json
 */

const fs = require("fs");
const path = require("path");
const { validateRecords } = require("../lib/content-quality");

function printHelp() {
  console.log(`Usage: node bin/validate-content-quality.js --input <file> [--out <file>] [--require-grade-band]

Read-only. Exit 1 if any published record fails an error-severity rule.
`);
}

function parseArgs(argv) {
  const args = { input: null, out: null, requireGradeBand: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--input") args.input = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--require-grade-band") args.requireGradeBand = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function loadRecords(filePath) {
  const abs = path.resolve(filePath);
  const data = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  throw new Error(`Unsupported JSON shape in ${filePath}`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.input) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const records = loadRecords(args.input);
  const duplicatePublicIds = records
    .filter((r) => r.duplicatePublic === true)
    .map((r) => r.id || r.recordId);

  const report = validateRecords(records, {
    requireGradeBand: args.requireGradeBand,
    duplicatePublicIds,
  });

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.writeFileSync(path.resolve(args.out), `${json}\n`, "utf8");
    console.error(`Wrote ${args.out}`);
  }
  console.log(json);

  const publishedFailures = report.summary.publishedFailCount;
  process.exit(publishedFailures > 0 ? 1 : 0);
}

main();
