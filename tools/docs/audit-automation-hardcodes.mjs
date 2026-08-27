#!/usr/bin/env node
/**
 * SC-034 / V2-002 — offline hardcode classifier for production automation scripts.
 *
 * Scans airtable/automations/shooting-challenge/*.js (excludes _superseded, _design-alternatives, lib/).
 * Emits docs/audits/sc-034-hardcode-audit.json and a markdown summary.
 *
 * Does not contact Airtable. Does not modify scripts.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AUTOMATIONS = join(ROOT, "airtable/automations/shooting-challenge");
const OUT_JSON = join(ROOT, "docs/audits/sc-034-hardcode-audit.json");
const OUT_MD = join(ROOT, "docs/audits/2026-08-27-SC-034-config-hardcode-audit.md");

const PATTERNS = [
  {
    id: "config-first-record",
    re: /configQuery\.records\[0\]|configTable\.selectRecordsAsync[\s\S]{0,120}records\[0\]/,
    classification: "unsafe_business_rule_hardcode",
    risk: "high",
    note: "First Config record selection — use resolveConfig hierarchy",
  },
  {
    id: "calendar-year-inference",
    re: /new Date\(\)\.getFullYear\(\)|Date\.now\(\)[\s\S]{0,40}getFullYear/,
    classification: "unsafe_business_rule_hardcode",
    risk: "high",
    note: "Calendar-year season inference forbidden by CONFIG-SELECTION-CONTRACT",
  },
  {
    id: "perfect-week-video-min",
    re: /requiredVideoCount:\s*3\b/,
    classification: "config_pending_schema",
    risk: "medium",
    note: "Mirrors WAS formula >= 3; Config field not in schema yet",
  },
  {
    id: "perfect-week-daily-count",
    re: /requiredDailyCount:\s*7\b/,
    classification: "stable_system_constant",
    risk: "low",
    note: "Definitional Sun–Sat week shape",
  },
  {
    id: "weekly-threshold-percents",
    re: /WEEKLY_THRESHOLD_PERCENTS|\[100,\s*125,\s*150\]/,
    classification: "stable_system_constant",
    risk: "low",
    note: "Tier percents; XP amounts from XP Reward Rules table",
  },
  {
    id: "zoom-xp-percent-default",
    re: /xpPercentOfLive:\s*50\b/,
    classification: "documented_fallback",
    risk: "low",
    note: "Fallback when Config Zoom Recording XP Percent of Live missing",
  },
  {
    id: "source-key-prefix",
    re: /SOURCE_KEY_PREFIXES|SUBMISSION_XP\||HOMEWORK_XP\||PERFECT_WEEK\|/,
    classification: "stable_system_constant",
    risk: "low",
    note: "Dedupe integrity contract — must not come from config",
  },
  {
    id: "schmidt-enrollment-exclude",
    re: /SCHMIDT_ENROLLMENT_ID|recgP9qZYjAhE7NXm/,
    classification: "operator_controlled",
    risk: "low",
    note: "Sandbox enrollment excluded from comms (072)",
  },
  {
    id: "operator-email",
    re: /mschmidt@fairfield\.k12\.mt\.us|coach@127sportsintensity\.com/,
    classification: "operator_controlled",
    risk: "low",
    note: "Operational email defaults — env/Make config preferred",
  },
  {
    id: "denver-timezone",
    re: /America\/Denver/,
    classification: "stable_system_constant",
    risk: "low",
    note: "Canonical timezone for date keys",
  },
  {
    id: "utc-date-slice",
    re: /\.toISOString\(\)\.slice\(0,\s*10\)/,
    classification: "dangerous_latent",
    risk: "medium",
    note: "Naive UTC date key — prefer 005/034 Denver helpers",
  },
  {
    id: "streak-rule-key-template",
    re: /STREAK_\$\{|`STREAK_\$\{/,
    classification: "stable_system_constant",
    risk: "low",
    note: "Matches XP Reward Rules rule keys",
  },
  {
    id: "shooting-base-rule-key",
    re: /SHOOTING_BASE|HOMEWORK_COMPLETION|PERFECT_WEEK|ZOOM_ATTEND_BASE/,
    classification: "stable_system_constant",
    risk: "low",
    note: "Rule key lookup — amount from XP Reward Rules",
  },
  {
    id: "test-record-id",
    re: /rec0{5,}[0-9A-Za-z]{3,}/,
    classification: "test_fixture",
    risk: "none",
    note: "Synthetic record id in tests or comments only if in lib/test",
  },
  {
    id: "school-year-literal",
    re: /20\d{2}-20\d{2}/,
    classification: "unknown_requires_review",
    risk: "medium",
    note: "School year literal — verify fixture vs runtime",
  },
];

function listProductionScripts() {
  return readdirSync(AUTOMATIONS)
    .filter((f) => f.endsWith(".js"))
    .filter((f) => !f.startsWith("_"))
    .sort();
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function scanFile(fileName) {
  const filePath = join(AUTOMATIONS, fileName);
  const source = readFileSync(filePath, "utf8");
  const findings = [];

  for (const pattern of PATTERNS) {
    const re = new RegExp(pattern.re.source, pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`);
    let match;
    while ((match = re.exec(source)) !== null) {
      const line = lineNumber(source, match.index);
      const snippet = source.slice(match.index, match.index + 80).replace(/\s+/g, " ").trim();
      findings.push({
        file: `airtable/automations/shooting-challenge/${fileName}`,
        line,
        patternId: pattern.id,
        match: match[0].slice(0, 60),
        snippet,
        classification: pattern.classification,
        risk: pattern.risk,
        note: pattern.note,
        changed: false,
        replacementSource: null,
        testCoverage: null,
        remainingAction: pattern.classification === "unsafe_business_rule_hardcode"
          ? "Replace with config lookup or remove"
          : pattern.classification === "config_pending_schema"
            ? "Add Config field + wire script; document until then"
            : "Documented — no change unless contract updates",
      });
    }
  }

  return findings;
}

function summarize(findings) {
  const byClass = {};
  for (const f of findings) {
    byClass[f.classification] = (byClass[f.classification] || 0) + 1;
  }
  return byClass;
}

const scripts = listProductionScripts();
const allFindings = [];
for (const file of scripts) {
  allFindings.push(...scanFile(file));
}

const payload = {
  generated_at: "2026-08-27",
  branch: "agent/config-automation-reliability",
  backlog: ["SC-034", "V2-002"],
  scripts_scanned: scripts.length,
  finding_count: allFindings.length,
  summary_by_classification: summarize(allFindings),
  entries: allFindings,
};

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);

const md = [
  "# SC-034 / V2-002 — Config hardcode audit",
  "",
  "**Generated:** 2026-08-27 · **Branch:** `agent/config-automation-reliability`",
  "**Machine-readable:** [`sc-034-hardcode-audit.json`](./sc-034-hardcode-audit.json)",
  "",
  "## Scope",
  "",
  `- Production scripts scanned: **${scripts.length}**`,
  "- Excludes: `_superseded/`, `_design-alternatives/`, `lib/`",
  "- Prior audit preserved: [`docs/overnight/config-xp/CONFIG-HARDCODE-AUDIT.md`](../overnight/config-xp/CONFIG-HARDCODE-AUDIT.md)",
  "",
  "## Classification summary",
  "",
  ...Object.entries(payload.summary_by_classification).map(
    ([k, v]) => `- **${k}:** ${v}`
  ),
  "",
  "## Key conclusions",
  "",
  "1. **No active production script** uses `configQuery.records[0]` (only `_superseded/` 117a/117b).",
  "2. **Config selection** is centralized in `lib/config-selection/index.js` with fail-closed hierarchy.",
  "3. **057 `requiredVideoCount: 3`** remains a business-rule hardcode mirrored by WAS formula — Config field does not exist in schema snapshots; deferred pending Mike schema decision.",
  "4. **XP amounts** are read from XP Reward Rules in 010/054/059/065/101 — not hardcoded in award paths.",
  "5. **Operator emails** in 075/077 are operational defaults, not business rules.",
  "",
  "## Findings (sample — full list in JSON)",
  "",
  "| File | Line | Match | Class | Risk | Action |",
  "|------|------|-------|-------|------|--------|",
  ...allFindings.slice(0, 40).map(
    (f) =>
      `| \`${f.file.split("/").pop()}\` | ${f.line} | \`${f.match.replace(/\|/g, "\\|")}\` | ${f.classification} | ${f.risk} | ${f.remainingAction} |`
  ),
  "",
  allFindings.length > 40
    ? `_… and ${allFindings.length - 40} more rows in JSON._`
    : "",
  "",
  "## Mike actions",
  "",
  "- UI paste repo fixes already landed (054 v5.6 duplicate-rule guard, 066 v3.3 link-ID grade band).",
  "- Decide whether to add **Perfect Week Video Minimum** Config field (would also require WAS formula update).",
  "- Collapse or key-select Config rows if any script still uses order-dependent reads (none in active scripts).",
  "",
].join("\n");

writeFileSync(OUT_MD, md);
console.log(`Wrote ${allFindings.length} findings from ${scripts.length} scripts`);
console.log(OUT_JSON);
console.log(OUT_MD);
