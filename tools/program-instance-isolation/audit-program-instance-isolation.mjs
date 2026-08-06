#!/usr/bin/env node
/**
 * Program Instance isolation static audit
 *
 * Scans active Shooting Challenge automation scripts for patterns that often
 * confuse records across Program Instances / configuration years.
 *
 * Usage:
 *   node tools/program-instance-isolation/audit-program-instance-isolation.mjs
 *   node tools/program-instance-isolation/audit-program-instance-isolation.mjs --json
 *   node tools/program-instance-isolation/audit-program-instance-isolation.mjs --strict
 *
 * Exit codes:
 *   0 — completed (warnings allowed unless --strict)
 *   1 — --strict and one or more warnings found
 *   2 — tool error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const AUTOMATIONS_DIR = path.join(
  REPO_ROOT,
  "airtable/automations/shooting-challenge"
);
const WEB_QUERIES = path.join(REPO_ROOT, "web/lib/airtable/queries.ts");

const SKIP_DIR_NAMES = new Set([
  "_superseded",
  "_design-alternatives",
  "lib",
  "node_modules",
]);

/** @typedef {{ file: string, line: number, category: string, snippet: string, recommendedScope: string }} Warning */

/** @type {Array<{ category: string, recommendedScope: string, patterns: RegExp[] }>} */
const RULES = [
  {
    category: "athlete-without-enrollment-filter",
    recommendedScope: "Enrollment RID or Athlete + Program Instance",
    patterns: [
      /athleteId\s*===\s*athleteId\s*&&\s*candidate\.isActive/,
      /matchMode\s*=\s*["']athlete-only["']/,
      /filterByFormula:.*\{Athlete\}/,
    ],
  },
  {
    category: "week-date-without-program-instance",
    recommendedScope: "Weeks.Program Instance (+ Active Week?)",
    patterns: [
      /Activity Date Fallback(?! \(Program Instance)/,
      /findWeekByActivityDate\([^,)]+\)/,
      /findWeekForDate\([^,]+,\s*[^,)]+\)/,
      /No Week with End Date\/Key/,
      /endKey === targetEndKey/,
    ],
  },
  {
    category: "week-name-as-identity",
    recommendedScope: "Week RID or Week Key (RECORD_ID)",
    patterns: [
      /Week Name["'].*===|===\s*.*Week Name/,
      /weekName\s*===\s*/,
      /\{Week Name\}/,
    ],
  },
  {
    category: "summary-athlete-week-name",
    recommendedScope: "Enrollment RID + Week RID (Summary Key)",
    patterns: [
      /Athlete\s*\+\s*Week Name/,
      /athlete.*weekName|weekName.*athlete/i,
    ],
  },
  {
    category: "xp-rule-type-only",
    recommendedScope:
      "Immutable Rule Key (document as global) or Rule Key + Program Instance",
    patterns: [
      /XP Source Label["']\s*\)/,
      /ruleKey\s*===\s*["'][A-Z_]+["']/,
      /Reward Rule Key/,
    ],
  },
  {
    category: "zoom-meeting-date-only",
    recommendedScope: "Zoom Meeting.Week RID or Program Instance via Week",
    patterns: [
      /Meeting Date.*===|Start Time.*dateKey/,
      /zoom.*date alone|date-only.*meeting/i,
    ],
  },
  {
    category: "select-all-records-broad-scan",
    recommendedScope: "Filter by Enrollment / Program Instance / linked IDs",
    patterns: [
      /\.selectRecordsAsync\(\s*\{?\s*\}\s*\)/,
      /\.selectRecordsAsync\(\s*\)/,
    ],
  },
  {
    category: "dedupe-key-uses-display-name",
    recommendedScope: "Record IDs in Source Key / Dedupe Key",
    patterns: [
      /Unlock Key.*ARRAYJOIN/,
      /\$\{[^}]*weekName[^}]*\}/,
      /\$\{[^}]*athleteName[^}]*\}/,
    ],
  },
];

function listJsFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      out.push(...listJsFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js") && !entry.name.endsWith(".test.js")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} filePath
 * @returns {Warning[]}
 */
function scanFile(filePath) {
  const rel = path.relative(REPO_ROOT, filePath);
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  /** @type {Warning[]} */
  const warnings = [];

  // Suppress known-safe files that already document PI isolation heavily.
  const safeMarkers = [
    "Program Instance isolation",
    "Program Instance scoped",
    "Enrollment RID + Week RID",
  ];
  const hasPiIsolationDocs = safeMarkers.some((m) => text.includes(m));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("*") || trimmed.startsWith("//")) {
      // Still scan comments for risky docs, but skip pure decoration.
      if (trimmed === "*" || trimmed.startsWith("* =") || trimmed.startsWith("// =")) {
        continue;
      }
    }

    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        if (!pattern.test(line)) continue;

        // Reduce noise: week-date rule when file already scopes by PI nearby.
        if (
          rule.category === "week-date-without-program-instance" &&
          hasPiIsolationDocs &&
          /Program Instance|programInstanceId/.test(text)
        ) {
          // Still flag bare findWeekForDate(a,b) two-arg forms.
          if (!/findWeekForDate\([^,]+,\s*[^,)]+\)/.test(line) &&
              !/findWeekByActivityDate\([^,)]+\)/.test(line) &&
              !/endKey === targetEndKey/.test(line)) {
            continue;
          }
        }

        if (
          rule.category === "xp-rule-type-only" &&
          /CONFIG\.|Rule Key|ruleKey/.test(line) &&
          line.includes("Reward Rule Key") &&
          line.includes(":")
        ) {
          // Field name constants alone are not a lookup risk.
          continue;
        }

        warnings.push({
          file: rel,
          line: i + 1,
          category: rule.category,
          snippet: trimmed.slice(0, 160),
          recommendedScope: rule.recommendedScope,
        });
      }
    }
  }

  return warnings;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const asJson = args.has("--json");
  const strict = args.has("--strict");

  if (!fs.existsSync(AUTOMATIONS_DIR)) {
    console.error(`Automations directory missing: ${AUTOMATIONS_DIR}`);
    process.exit(2);
  }

  const files = listJsFiles(AUTOMATIONS_DIR);
  if (fs.existsSync(WEB_QUERIES)) {
    files.push(WEB_QUERIES);
  }

  /** @type {Warning[]} */
  const warnings = [];
  for (const file of files) {
    warnings.push(...scanFile(file));
  }

  // Deduplicate identical file/line/category
  const seen = new Set();
  const unique = warnings.filter((w) => {
    const key = `${w.file}:${w.line}:${w.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  const byCategory = {};
  for (const w of unique) {
    byCategory[w.category] = (byCategory[w.category] || 0) + 1;
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          scannedFiles: files.length,
          warningCount: unique.length,
          byCategory,
          warnings: unique,
        },
        null,
        2
      )
    );
  } else {
    console.log("Program Instance isolation audit");
    console.log(`Scanned files: ${files.length}`);
    console.log(`Warnings: ${unique.length}`);
    console.log("");
    for (const [cat, count] of Object.entries(byCategory).sort()) {
      console.log(`  ${cat}: ${count}`);
    }
    console.log("");
    for (const w of unique) {
      console.log(`WARNING ${w.file}:${w.line}`);
      console.log(`  category: ${w.category}`);
      console.log(`  recommended: ${w.recommendedScope}`);
      console.log(`  snippet: ${w.snippet}`);
      console.log("");
    }
    if (unique.length === 0) {
      console.log("No warnings found.");
    }
  }

  if (strict && unique.length > 0) {
    process.exit(1);
  }
}

main();
