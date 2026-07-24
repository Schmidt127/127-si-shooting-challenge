#!/usr/bin/env node
/**
 * Challenge-Year Configuration and Season Rollover Engine — CLI
 *
 * Commands:
 *   generate-weeks
 *   validate-weeks
 *   validate-enrollments
 *   validate-was
 *   resolve-config
 *   preflight
 *   manifest
 *
 * Examples:
 *   node tools/challenge-year/cli.js generate-weeks \
 *     --challenge-year 2027-2028 \
 *     --week-zero-start 2027-05-30 \
 *     --regular-weeks 8 \
 *     --output tmp/weeks-2027-2028
 *
 *   node tools/challenge-year/cli.js preflight --config fixtures/new-year.json --mode preflight
 */

"use strict";

const fs = require("fs");
const path = require("path");
const engine = require("../../lib/challenge-year");

function usage(code = 0) {
  const text = `Challenge-Year Rollover Engine

Usage:
  node tools/challenge-year/cli.js <command> [options]

Commands:
  generate-weeks       Generate Week 0..N + Post-Challenge plan (json/csv/md/report)
  validate-weeks       Validate a weeks JSON/CSV export
  validate-enrollments Validate enrollment-year fixtures
  validate-was         Validate WAS uniqueness fixtures
  resolve-config       Resolve Config from fixture + resolution inputs
  preflight            Annual rollover preflight (PASS / PASS WITH WARNINGS / FAIL)
  manifest             Generate rollover manifest (json + md + weeks csv)

Common options:
  --output <path>      Output prefix or directory
  --json               Print JSON to stdout
  --help               Show help
`;
  process.stdout.write(text);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function readJson(filePath) {
  const abs = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function readWeeksInput(filePath) {
  const abs = path.resolve(filePath);
  const text = fs.readFileSync(abs, "utf8");
  if (abs.endsWith(".json")) {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.weeks || [];
  }
  // CSV
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx];
    });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeOutputs(prefix, { json, csv, markdown, report }) {
  const base = path.resolve(prefix);
  // If prefix looks like a directory (exists as dir or ends with /), use names inside.
  let jsonPath;
  let csvPath;
  let mdPath;
  let reportPath;
  const asDir =
    base.endsWith(path.sep) ||
    (fs.existsSync(base) && fs.statSync(base).isDirectory()) ||
    (!path.extname(base) && !base.endsWith(".json"));

  if (asDir) {
    fs.mkdirSync(base, { recursive: true });
    jsonPath = path.join(base, "weeks.json");
    csvPath = path.join(base, "weeks.csv");
    mdPath = path.join(base, "weeks.md");
    reportPath = path.join(base, "validation-report.json");
  } else {
    jsonPath = `${base}.json`;
    csvPath = `${base}.csv`;
    mdPath = `${base}.md`;
    reportPath = `${base}.validation.json`;
  }

  if (json != null) {
    ensureParent(jsonPath);
    fs.writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`);
  }
  if (csv != null) {
    ensureParent(csvPath);
    fs.writeFileSync(csvPath, csv);
  }
  if (markdown != null) {
    ensureParent(mdPath);
    fs.writeFileSync(mdPath, markdown);
  }
  if (report != null) {
    ensureParent(reportPath);
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return { jsonPath, csvPath, mdPath, reportPath };
}

function cmdGenerateWeeks(args) {
  const plan = engine.generateWeekPlan({
    challengeYear: args["challenge-year"],
    weekZeroStart: args["week-zero-start"],
    regularWeeks: Number(args["regular-weeks"]),
    configRecordId: args["config-id"] || null,
    includeWeekZero: args["no-week-zero"] ? false : true,
    includePostChallenge: args["no-post-challenge"] ? false : true,
    timezone: args.timezone || "America/Denver",
  });

  if (args.output) {
    const paths = writeOutputs(args.output, {
      json: plan,
      csv: engine.weeksToCsv(plan.weeks || []),
      markdown: engine.weeksToMarkdown(plan),
      report: plan.validation,
    });
    process.stdout.write(
      `Wrote:\n  ${paths.jsonPath}\n  ${paths.csvPath}\n  ${paths.mdPath}\n  ${paths.reportPath}\n`
    );
  }

  if (args.json || !args.output) {
    engine.printReport(
      {
        overall: plan.validation ? plan.validation.overall : plan.ok ? "PASS" : "FAIL",
        checks: (plan.validation && plan.validation.findings) || [],
        plan,
      },
      { json: Boolean(args.json) }
    );
  }

  process.exit(engine.exitCodeForOverall(plan.validation?.overall || (plan.ok ? "PASS" : "FAIL")));
}

function cmdValidateWeeks(args) {
  const file = args.weeks || args._[1];
  if (!file) {
    process.stderr.write("validate-weeks requires --weeks <file>\n");
    process.exit(2);
  }
  const weeks = readWeeksInput(file);
  const result = engine.validateWeekPlan(weeks, {
    challengeYear: args["challenge-year"],
    configRecordId: args["config-id"],
    expectedRegularWeeks: args["regular-weeks"]
      ? Number(args["regular-weeks"])
      : undefined,
    requireCanonicalWeekKey: !args["allow-record-id-keys"],
  });
  if (args.output) {
    writeOutputs(args.output, { report: result, json: result });
  }
  engine.printReport(
    { overall: result.overall, checks: result.findings },
    { json: Boolean(args.json) }
  );
  process.exit(engine.exitCodeForOverall(result.overall));
}

function cmdValidateEnrollments(args) {
  const file = args.config || args.fixture || args._[1];
  if (!file) {
    process.stderr.write("validate-enrollments requires --fixture <json>\n");
    process.exit(2);
  }
  const data = readJson(file);
  const result = engine.validateEnrollmentsForChallengeYear({
    enrollments: data.enrollments || data,
    configs: data.configs || [],
    weeks: data.weeks || [],
    expectedChallengeYear: args["challenge-year"] || data.expectedChallengeYear,
    expectedConfigRecordId: args["config-id"] || data.expectedConfigRecordId,
    levelPolicy: args["level-policy"] || data.levelPolicy || "undocumented",
  });
  engine.printReport(
    { overall: result.overall, checks: result.findings },
    { json: Boolean(args.json) }
  );
  process.exit(engine.exitCodeForOverall(result.overall));
}

function cmdValidateWas(args) {
  const file = args.fixture || args._[1];
  if (!file) {
    process.stderr.write("validate-was requires --fixture <json>\n");
    process.exit(2);
  }
  const data = readJson(file);
  const result = engine.validateWeeklyAthleteSummaries({
    summaries: data.summaries || data,
    enrollments: data.enrollments || [],
    weeks: data.weeks || [],
    expectedChallengeYear: args["challenge-year"] || data.expectedChallengeYear,
    processingAsCurrent: Boolean(args["processing-as-current"] || data.processingAsCurrent),
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    engine.printReport({ overall: result.overall, checks: result.findings });
    if (result.repairRecommendations?.length) {
      process.stdout.write("\nDry-run repair recommendations:\n");
      for (const rec of result.repairRecommendations) {
        process.stdout.write(`- ${JSON.stringify(rec)}\n`);
      }
    }
  }
  process.exit(engine.exitCodeForOverall(result.overall));
}

function cmdResolveConfig(args) {
  const file = args.config || args.fixture || args._[1];
  if (!file) {
    process.stderr.write("resolve-config requires --config <json>\n");
    process.exit(2);
  }
  const data = readJson(file);
  const result = engine.resolveChallengeYearConfig({
    configRows: data.configRows || data.configs || data,
    explicitConfigRecordId: args["config-id"] || data.explicitConfigRecordId,
    enrollmentConfigRecordId: data.enrollmentConfigRecordId,
    enrollmentSchoolYear: args["school-year"] || data.enrollmentSchoolYear,
    weekConfigRecordId: data.weekConfigRecordId,
    weekChallengeYear: data.weekChallengeYear,
    asOfDate: args["as-of"] || data.asOfDate,
    requireCurrent: Boolean(args["require-current"] || data.requireCurrent),
    allowHistorical: data.allowHistorical !== false,
    testModeOnly: Boolean(args["test-only"] || data.testModeOnly),
    programInstanceSchoolYear: data.programInstanceSchoolYear,
    testSeasonOverride: data.testSeasonOverride,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}

function cmdPreflight(args) {
  const file = args.config || args.fixture || args._[1];
  if (!file) {
    process.stderr.write("preflight requires --config <fixture-or-export.json>\n");
    process.exit(2);
  }
  const data = readJson(file);
  const result = engine.runRolloverPreflight({
    mode: args.mode || data.mode || "preflight",
    newConfig: data.newConfig || data.config || data,
    priorConfig: data.priorConfig,
    allConfigs: data.allConfigs,
    weeks: data.weeks,
    enrollments: data.enrollments,
    summaries: data.summaries,
    opsChecklist: data.opsChecklist,
    generate: data.generate,
    levelPolicy: data.levelPolicy || args["level-policy"],
  });

  if (args.output) {
    const out = path.resolve(args.output);
    ensureParent(out.endsWith(".json") ? out : path.join(out, "preflight.json"));
    const target = out.endsWith(".json") ? out : path.join(out, "preflight.json");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`Wrote ${target}\n`);
  }

  engine.printReport(
    { overall: result.overall, checks: result.checks },
    { json: Boolean(args.json) }
  );
  process.exit(engine.exitCodeForOverall(result.overall));
}

function cmdManifest(args) {
  const file = args.config || args.fixture || args._[1];
  if (!file) {
    process.stderr.write("manifest requires --config <fixture.json>\n");
    process.exit(2);
  }
  const data = readJson(file);
  const result = engine.generateRolloverManifest({
    newConfig: data.newConfig || data.config || data,
    priorConfig: data.priorConfig,
    allConfigs: data.allConfigs,
    generate: data.generate,
    opsChecklist: data.opsChecklist,
    enrollments: data.enrollments,
    summaries: data.summaries,
    levelPolicy: data.levelPolicy,
  });

  const prefix = args.output || `tmp/rollover-${result.manifest?.newConfig?.challengeYearLabel || "year"}`;
  const base = path.resolve(prefix);
  fs.mkdirSync(base, { recursive: true });
  const jsonPath = path.join(base, "rollover-manifest.json");
  const mdPath = path.join(base, "rollover-checklist.md");
  const csvPath = path.join(base, "weeks-import.csv");
  fs.writeFileSync(jsonPath, `${JSON.stringify(result.manifest, null, 2)}\n`);
  fs.writeFileSync(mdPath, result.markdown || "");
  fs.writeFileSync(csvPath, result.csv || "");
  process.stdout.write(`Wrote:\n  ${jsonPath}\n  ${mdPath}\n  ${csvPath}\n`);
  process.stdout.write(`Preflight: ${result.preflight?.overall}\n`);
  process.exit(engine.exitCodeForOverall(result.preflight?.overall || (result.ok ? "PASS" : "FAIL")));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command || args.help) usage(command ? 0 : 1);

  switch (command) {
    case "generate-weeks":
      return cmdGenerateWeeks(args);
    case "validate-weeks":
      return cmdValidateWeeks(args);
    case "validate-enrollments":
      return cmdValidateEnrollments(args);
    case "validate-was":
      return cmdValidateWas(args);
    case "resolve-config":
      return cmdResolveConfig(args);
    case "preflight":
      return cmdPreflight(args);
    case "manifest":
      return cmdManifest(args);
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      usage(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  cmdGenerateWeeks,
  cmdPreflight,
  cmdManifest,
};
