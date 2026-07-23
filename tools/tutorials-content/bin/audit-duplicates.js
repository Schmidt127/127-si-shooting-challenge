#!/usr/bin/env node
"use strict";

/**
 * Read-only duplicate/orphan audit for Tutorials consolidation.
 *
 * Usage:
 *   node bin/audit-duplicates.js \
 *     --source ../../tests/fixtures/tutorials-content/tutorials-assets-source.json \
 *     --target ../../tests/fixtures/tutorials-content/tutorials-canonical.json \
 *     [--out report.json]
 *
 * Accepts JSON (array or {records:[]}) or CSV with headers.
 */

const fs = require("fs");
const path = require("path");
const { detectDuplicates } = require("../lib/duplicate-detector");

function printHelp() {
  console.log(`Usage: node bin/audit-duplicates.js --source <file> --target <file> [--out <file>]

Read-only. No Airtable access. No writes except optional --out report.
`);
}

function parseArgs(argv) {
  const args = { source: null, target: null, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--source") args.source = argv[++i];
    else if (a === "--target") args.target = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function loadRecords(filePath) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, "utf8");
  if (abs.endsWith(".csv")) return csvToRecords(raw);
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  throw new Error(`Unsupported JSON shape in ${filePath}`);
}

function csvToRecords(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line, index) => {
    const cols = splitCsvLine(line);
    const fields = {};
    headers.forEach((header, i) => {
      fields[header] = cols[i] ?? "";
    });
    return { id: fields.id || fields.ID || `csv_${index + 1}`, fields };
  });
}

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((v) => v.trim());
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.source || !args.target) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const report = detectDuplicates({
    sourceRecords: loadRecords(args.source),
    targetRecords: loadRecords(args.target),
  });

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.writeFileSync(path.resolve(args.out), `${json}\n`, "utf8");
    console.error(`Wrote ${args.out}`);
  }
  console.log(json);

  // Exit 0 always for audit completion; consumers inspect summary.
  process.exit(0);
}

main();
