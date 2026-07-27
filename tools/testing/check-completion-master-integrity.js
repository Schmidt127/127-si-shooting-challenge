#!/usr/bin/env node
/**
 * Completion-master / docs integrity linter.
 * Detects status dishonesty and cross-doc contradictions. Does NOT rewrite statuses.
 *
 * Usage: node tools/testing/check-completion-master-integrity.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const MASTER = path.join(ROOT, "docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md");
const SCENARIO_DIR = path.join(ROOT, "docs/testing/scenarios");
const CHECKLISTS = [
  {
    id: "035",
    sc: "SC-049",
    path: "docs/deploy-checklists/035-weekly-threshold-xp-v1.1.md",
    readyPhrase: /Ready for PROD Paste/i,
  },
  {
    id: "057",
    sc: "SC-028",
    path: "docs/deploy-checklists/057-perfect-week-denver-v1.4.md",
    readyPhrase: /Ready for PROD Paste/i,
  },
];

const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function parseMasterRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\| (SC-\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/);
    if (!m) continue;
    // Skip dashboard reconciliation tables that also use SC- ids in col1
    // Master table has Area in col2 and Goal in col3; reconciliation has Old/New status.
    const area = m[2].trim();
    const goal = m[3].trim();
    const status = m[4].trim();
    if (/^(Old status|Area)$/i.test(area)) continue;
    if (/^(Installed in PROD|Built in Repository|Live Tested|Complete|Planned)$/i.test(area)) {
      // reconciliation row shape: SC | Old | New | ...
      continue;
    }
    rows.push({ id: m[1], area, goal, status });
  }
  return rows;
}

function main() {
  const master = fs.readFileSync(MASTER, "utf8");
  const rows = parseMasterRows(master);
  if (rows.length < 50) {
    errors.push(`Expected many SC rows in completion master; parsed ${rows.length}`);
  }

  const byId = new Map();
  for (const row of rows) {
    if (byId.has(row.id)) {
      // Multiple table hits for same ID can happen if section tables repeat — warn.
      warnings.push(`Duplicate SC row parse for ${row.id} (statuses: ${byId.get(row.id).status} vs ${row.status})`);
    }
    byId.set(row.id, row);
  }

  // Complete + still listing required manual tests in What Is Still Needed column is hard;
  // instead flag Complete rows that still say "Re-test" or "Paste" in the same line.
  for (const line of master.split(/\r?\n/)) {
    const m = line.match(/^\| (SC-\d+) \|/);
    if (!m) continue;
    if (/\|\s*Complete\s*\|/i.test(line)) {
      if (/Paste \*\*|Schmidt.*live|still needed|not live-tested/i.test(line)) {
        errors.push(
          `${m[1]} labeled Complete but row still mentions paste/live proof remaining`
        );
      }
    }
    if (/\|\s*Live Tested in PROD\s*\|/i.test(line)) {
      if (/Ready for PROD Paste|not installed|no evidence/i.test(line)) {
        errors.push(
          `${m[1]} labeled Live Tested but row still says not installed / Ready for Paste`
        );
      }
    }
  }

  // Deploy checklist vs master: Ready for Paste must not be Complete / Live Tested for that package.
  for (const c of CHECKLISTS) {
    const checklist = read(c.path);
    if (!c.readyPhrase.test(checklist)) continue;
    const row = byId.get(c.sc);
    if (!row) {
      warnings.push(`Checklist ${c.id}: SC ${c.sc} not found in master parse`);
      continue;
    }
    if (/^(Complete|Live Tested in PROD)$/i.test(row.status)) {
      errors.push(
        `${c.sc} status "${row.status}" conflicts with ${c.path} still "Ready for PROD Paste"`
      );
    }
    // Installed in PROD for SC-028 is OK for v1.3 while v1.4 is Ready — warn only if row claims v1.4 installed.
    if (c.id === "057" && /057 v1\.4.*Installed|Installed.*057 v1\.4/i.test(row.goal + row.status)) {
      errors.push(`SC-028 claims 057 v1.4 Installed while checklist is Ready for PROD Paste`);
    }
  }

  // Scenario ID uniqueness
  const scenFiles = fs
    .readdirSync(SCENARIO_DIR)
    .filter((f) => /^scn-\d{3}-.+\.json$/i.test(f));
  const scenIds = new Map();
  for (const file of scenFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(SCENARIO_DIR, file), "utf8"));
    const id = data.scenario_id;
    if (scenIds.has(id)) {
      errors.push(`Duplicate scenario ID ${id}: ${scenIds.get(id)} and ${file}`);
    } else {
      scenIds.set(id, file);
    }
  }

  // Stale Softr launch claims in completion master dashboard
  if (/Softr.*(required|blocking|must)/i.test(master) && !/Softr Obsolete/i.test(master)) {
    errors.push("Completion master mentions Softr as required without Obsolete marker");
  }

  // Stale "tomorrow start" dated documents still claiming PRs are draft
  const recoveryNext = path.join(
    ROOT,
    "docs/recovery/SHOOTING-CHALLENGE-MIKE-NEXT-ACTIONS-2026-07-25.md"
  );
  if (fs.existsSync(recoveryNext)) {
    const text = fs.readFileSync(recoveryNext, "utf8");
    if (/Draft; authoritative/i.test(text) && /#43|#47/.test(text)) {
      // Allow if file contains an explicit SUPERSEDED / MERGED banner
      if (!/MERGED into master|SUPERSEDED|PRs #43.?#47.*merged/i.test(text)) {
        errors.push(
          "recovery MIKE-NEXT-ACTIONS still lists PRs #43–#47 as Draft without MERGED banner"
        );
      }
    }
  }

  // Automation ownership: 035 and legacy Threshold must not both claim authoritative without note
  const registryPath = path.join(
    ROOT,
    "docs/next-wave/automation-ownership/xp-source-key-registry.json"
  );
  if (fs.existsSync(registryPath)) {
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    const blob = JSON.stringify(registry);
    const writers = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.prefix === "WEEKLY_THRESHOLD|" || node.format?.includes?.("WEEKLY_THRESHOLD|")) {
        if (node.authoritative_writer) writers.push(String(node.authoritative_writer));
      }
      for (const v of Object.values(node)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") walk(v);
      }
    };
    walk(registry);
    const unique = [...new Set(writers)];
    if (unique.length > 1) {
      errors.push(
        `Duplicate WEEKLY_THRESHOLD authoritative writers in registry: ${unique.join(", ")}`
      );
    }
    if (!blob.includes("WEEKLY_THRESHOLD|")) {
      warnings.push("xp-source-key-registry.json missing WEEKLY_THRESHOLD| entry");
    }
  }

  console.log(`Completion master rows parsed: ${rows.length}`);
  console.log(`Scenario fixtures: ${scenFiles.length}`);
  for (const w of warnings) console.warn(`WARN  ${w}`);
  if (errors.length) {
    console.error("Completion-master integrity FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Completion-master integrity PASS");
}

main();
