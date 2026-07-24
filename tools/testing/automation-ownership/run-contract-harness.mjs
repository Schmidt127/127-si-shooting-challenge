#!/usr/bin/env node
/**
 * Read-only automation ownership contract harness (Agent 9).
 * Plain Node — no Airtable runtime mocks.
 *
 * Detects:
 * - duplicate Source Key prefix ownership
 * - attempts to write formula-only fields
 * - multiple authoritative writers for one identity
 * - known stale automation references
 * - missing source-key registry entries for live XP creators
 * - legacy HOMEWORK_COMPLETION| usage in live creators
 * - WAS creators lacking uniqueness guards
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const DOCS_DIR = path.join(REPO_ROOT, "docs/next-wave/automation-ownership");
const REGISTRY_PATH = path.join(DOCS_DIR, "xp-source-key-registry.json");
const INVENTORY_PATH = path.join(DOCS_DIR, "writer-inventory.json");
const AUTOMATIONS_DIR = path.join(REPO_ROOT, "airtable/automations/shooting-challenge");

const FORMULA_ONLY = [
  "XP Dedupe Key",
  "XP Dedupe Key Normalized",
  "Summary Key",
  "Unlock Key",
];

const LIVE_XP_CREATORS = ["010", "054", "059", "065", "101", "114", "117", "117c"];

const STALE_REFS = [
  {
    id: "stale-112-on-expected",
    description: "112 must be classified legacy_off / expected OFF",
    check: (inventory) => {
      const row = inventory.writers.find((w) => w.automation_number === "112");
      if (!row) return { ok: false, detail: "112 missing from inventory" };
      const off =
        row.classification === "legacy_off" &&
        String(row.expected_on_off).toUpperCase().includes("OFF");
      return { ok: off, detail: `112 classification=${row.classification} expected=${row.expected_on_off}` };
    },
  },
  {
    id: "stale-063-not-authoritative",
    description: "063 must not be authoritative_writer",
    check: (inventory) => {
      const row = inventory.writers.find((w) => w.automation_number === "063");
      if (!row) return { ok: false, detail: "063 missing from inventory" };
      return {
        ok: row.classification === "legacy_off",
        detail: `063 classification=${row.classification}`,
      };
    },
  },
  {
    id: "stale-s16-zoom-recording-not-live-owner",
    description: "ZOOM_RECORDING| must be legacy_superseded in registry",
    check: (_inventory, registry) => {
      const row = registry.prefixes.find((p) => p.prefix === "ZOOM_RECORDING|");
      if (!row) return { ok: false, detail: "ZOOM_RECORDING| missing" };
      return {
        ok: row.status === "legacy_superseded" || row.legacy === true,
        detail: `status=${row.status}`,
      };
    },
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listAutomationScripts() {
  return fs
    .readdirSync(AUTOMATIONS_DIR)
    .filter((name) => name.endsWith(".js") && !name.startsWith("_"))
    .map((name) => path.join(AUTOMATIONS_DIR, name));
}

function readScript(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function findScriptForNumber(num) {
  const files = listAutomationScripts();
  const exact = files.find((f) => path.basename(f).startsWith(`${num}-`));
  if (exact) return exact;
  return files.find((f) => path.basename(f).startsWith(String(num))) || null;
}

function checkDuplicatePrefixOwnership(registry) {
  const findings = [];
  const byPrefix = new Map();
  for (const entry of registry.prefixes) {
    if (
      entry.legacy ||
      entry.status === "missing_writer" ||
      entry.status === "manual_process" ||
      entry.status === "legacy_superseded" ||
      entry.status === "contract_alias_unused_in_prod_writers" ||
      entry.status === "canonical_email_event_id" ||
      entry.status === "canonical_email_send_key" ||
      entry.status === "canonical_identity_key"
    ) {
      continue;
    }
    const owners = [];
    if (entry.authoritative_writer && entry.authoritative_writer !== "ATTENTION_REQUIRED") {
      owners.push(entry.authoritative_writer);
    }
    if (Array.isArray(entry.authoritative_writer_candidates)) {
      owners.push(...entry.authoritative_writer_candidates);
    }
    if (Array.isArray(entry.competing_writers)) {
      for (const c of entry.competing_writers) {
        if (!owners.includes(c)) owners.push(c);
      }
    }
    if (!byPrefix.has(entry.prefix)) byPrefix.set(entry.prefix, []);
    byPrefix.get(entry.prefix).push({ entry, owners });
  }

  for (const [prefix, rows] of byPrefix.entries()) {
    const liveOwners = new Set();
    let flaggedDuplicateRisk = false;
    for (const row of rows) {
      if (row.entry.status === "duplicate_risk") flaggedDuplicateRisk = true;
      for (const o of row.owners) liveOwners.add(o);
    }
    if (liveOwners.size > 1 && !flaggedDuplicateRisk) {
      findings.push({
        severity: "fail",
        code: "duplicate_prefix_unflagged",
        prefix,
        owners: [...liveOwners],
        detail: "Multiple owners without duplicate_risk status",
      });
    } else if (liveOwners.size > 1 && flaggedDuplicateRisk) {
      findings.push({
        severity: "warn",
        code: "duplicate_prefix_flagged",
        prefix,
        owners: [...liveOwners],
        detail: "Duplicate ownership flagged — Mike attestation required",
      });
    }
  }

  const zoomCredit = registry.prefixes.find((p) => p.prefix === "ZOOM_CREDIT|");
  if (!zoomCredit || zoomCredit.status !== "duplicate_risk") {
    findings.push({
      severity: "fail",
      code: "zoom_credit_not_flagged",
      detail: "ZOOM_CREDIT| must be status duplicate_risk until sole writer attested",
    });
  } else {
    findings.push({
      severity: "pass",
      code: "zoom_credit_flagged",
      detail: "ZOOM_CREDIT| marked duplicate_risk with candidates 117/117c",
    });
  }

  return findings;
}

function checkFormulaWrites(scripts) {
  const findings = [];
  for (const filePath of scripts) {
    const base = path.basename(filePath);
    const text = readScript(filePath);

    const writesSummaryKey =
      /createFields\[[^\]]*summaryKey[^\]]*\]\s*=/.test(text) ||
      /createFields\[CONFIG\.(?:was|weeklySummary)\.summaryKey\]/.test(text) ||
      /addIfWritable\([^)]*summaryKey[^)]*CONFIG\.(?:was|weeklySummary)\.summaryKey/.test(text);

    const writesXpDedupe =
      /addIfWritable\([^)]*xpDedupeKey/.test(text) ||
      /(?:createFields|updateFields|xpPayload|xpFields)\[[^\]]*xpDedupeKey/.test(text);

    const writesUnlockKey =
      /addIfWritable\([^)]*["'`]Unlock Key["'`]/.test(text) ||
      /addWritable\([^)]*["'`]Unlock Key["'`]/.test(text) ||
      /(?:createFields|unlockPayload)\[[^\]]*["'`]Unlock Key["'`]/.test(text);

    if (writesSummaryKey) {
      findings.push({
        severity: "fail",
        code: "formula_field_write_attempt",
        script: base,
        field: "Summary Key",
        detail: "Possible write of formula-only Summary Key",
      });
    }
    if (writesXpDedupe) {
      findings.push({
        severity: "fail",
        code: "formula_field_write_attempt",
        script: base,
        field: "XP Dedupe Key*",
        detail: "Possible write of formula-only XP Dedupe Key field",
      });
    }
    if (writesUnlockKey) {
      findings.push({
        severity: "fail",
        code: "formula_field_write_attempt",
        script: base,
        field: "Unlock Key",
        detail: "Possible write of formula-only Unlock Key",
      });
    }
  }
  if (!findings.some((f) => f.severity === "fail")) {
    findings.push({
      severity: "pass",
      code: "no_formula_writes_detected",
      detail: `Scanned ${scripts.length} scripts; no formula-only write payloads detected (${FORMULA_ONLY.join(", ")})`,
    });
  }
  return findings;
}

function checkMultipleAuthoritative(inventory) {
  const findings = [];
  const identityOwners = new Map();
  for (const w of inventory.writers) {
    if (w.classification !== "authoritative_writer") continue;
    if (!w.identity_key) continue;
    if (String(w.automation_number).startsWith("MAKE")) continue;
    const family = `${w.destination_table}::${String(w.identity_key).split("|")[0]}`;
    if (!identityOwners.has(family)) identityOwners.set(family, []);
    identityOwners.get(family).push(w.automation_number);
  }
  for (const [family, owners] of identityOwners.entries()) {
    const unique = [...new Set(owners)];
    if (unique.length > 1) {
      if (family.includes("WEEKLY_EMAIL") && unique.every((o) => ["072", "074"].includes(o))) {
        findings.push({
          severity: "pass",
          code: "weekly_email_split_roles",
          family,
          owners: unique,
          detail: "072 build + 074 send split is allowed",
        });
        continue;
      }
      // Daily email build/send
      if (unique.every((o) => ["076", "077"].includes(o))) {
        findings.push({
          severity: "pass",
          code: "daily_email_split_roles",
          family,
          owners: unique,
          detail: "076 build + 077 send split is allowed",
        });
        continue;
      }
      findings.push({
        severity: "fail",
        code: "multiple_authoritative_same_identity",
        family,
        owners: unique,
        detail: "Multiple authoritative_writer rows share identity family",
      });
    }
  }
  if (!findings.some((f) => f.severity === "fail")) {
    findings.push({
      severity: "pass",
      code: "authoritative_identity_unique",
      detail: "No conflicting authoritative_writer identity families (excluding allowed splits)",
    });
  }
  return findings;
}

function checkMissingRegistryEntries(registry) {
  const findings = [];
  const requiredFamilies = [
    "SUBMISSION_XP|",
    "HOMEWORK_XP|",
    "VIDEO_SUBMISSION|",
    "STREAK_XP|",
    "SHOT_MILESTONE|",
    "PERFECT_WEEK|",
    "ZOOM_ATTEND_BASE|",
    "ZOOM_CREDIT|",
    "WEEKLY_THRESHOLD_",
    "MANUAL_BONUS|",
    "VIDEO_FEEDBACK|",
  ];
  for (const prefix of requiredFamilies) {
    const row = registry.prefixes.find((p) => p.prefix === prefix);
    if (!row) {
      findings.push({
        severity: "fail",
        code: "missing_registry_entry",
        prefix,
        detail: "Required prefix missing from xp-source-key-registry.json",
      });
    } else {
      findings.push({
        severity: "pass",
        code: "registry_entry_present",
        prefix,
        detail: `status=${row.status}`,
      });
    }
  }

  for (const num of LIVE_XP_CREATORS) {
    if (num === "059") {
      const via = registry.prefixes.some((p) => p.xp_via === "059");
      findings.push({
        severity: via ? "pass" : "fail",
        code: "xp_via_059",
        detail: via ? "059 is xp_via for unlock prefixes" : "059 missing as xp_via",
      });
      continue;
    }
    const mentioned = registry.prefixes.some((p) => {
      if (p.authoritative_writer === num) return true;
      if (Array.isArray(p.authoritative_writer_candidates) && p.authoritative_writer_candidates.includes(num)) {
        return true;
      }
      if (Array.isArray(p.competing_writers) && p.competing_writers.includes(num)) return true;
      return false;
    });
    if (!mentioned) {
      findings.push({
        severity: "fail",
        code: "live_creator_missing_from_registry",
        automation: num,
        detail: "Live XP creator not referenced in registry",
      });
    }
  }
  return findings;
}

function checkLegacyHomeworkCompletionUsage() {
  const findings = [];
  const path065 = findScriptForNumber("065");
  if (!path065) {
    return [{ severity: "fail", code: "065_missing", detail: "065 script not found" }];
  }
  const text = readScript(path065);
  const mintsLegacy =
    /sourceKeyPrefix:\s*["'`]HOMEWORK_COMPLETION\|/.test(text) ||
    /[`'"]HOMEWORK_COMPLETION\|\$\{/.test(text) ||
    /return\s+[`'"]HOMEWORK_COMPLETION\|/.test(text);
  const usesModern = /sourceKeyPrefix:\s*["'`]HOMEWORK_XP\|/.test(text);

  if (mintsLegacy) {
    findings.push({
      severity: "fail",
      code: "065_mints_legacy_prefix",
      detail: "065 still mints HOMEWORK_COMPLETION| Source Keys",
    });
  } else {
    findings.push({
      severity: "pass",
      code: "065_does_not_mint_legacy",
      detail: "065 does not mint HOMEWORK_COMPLETION|",
    });
  }
  if (!usesModern) {
    findings.push({
      severity: "fail",
      code: "065_missing_modern_prefix",
      detail: "065 missing HOMEWORK_XP| prefix",
    });
  } else {
    findings.push({
      severity: "pass",
      code: "065_uses_homework_xp",
      detail: "065 uses HOMEWORK_XP|",
    });
  }
  if (!/HOMEWORK_COMPLETION/.test(text)) {
    findings.push({
      severity: "warn",
      code: "065_ignores_legacy_keys",
      detail: "065 has no HOMEWORK_COMPLETION| recognition — dual-key risk with legacy rows (XP-D3)",
    });
  }
  return findings;
}

function checkWasUniquenessGuards() {
  const findings = [];
  for (const num of ["031", "101", "118"]) {
    const filePath = findScriptForNumber(num);
    if (!filePath) {
      findings.push({
        severity: "fail",
        code: "was_creator_missing",
        automation: num,
        detail: "Script not found",
      });
      continue;
    }
    const text = readScript(filePath);
    const hasLookup =
      /findWeeklySummary|findOrCreateWeeklySummary|wasBySummaryKey|wasByEnrollment|targetSummaryKey|Summary Key/.test(
        text
      );
    const hasCreate = /createRecordAsync/.test(text);
    const writesSummaryKey =
      /createFields\[[^\]]*summaryKey\s*\]\s*=/.test(text) ||
      /createFields\[CONFIG\.[^\]]*summaryKey\]/.test(text);

    if (!hasLookup || !hasCreate) {
      findings.push({
        severity: "fail",
        code: "was_missing_uniqueness_guard",
        automation: num,
        detail: `lookup=${hasLookup} create=${hasCreate}`,
      });
    } else {
      findings.push({
        severity: "pass",
        code: "was_has_lookup_before_create",
        automation: num,
        detail: path.basename(filePath),
      });
    }
    if (writesSummaryKey) {
      findings.push({
        severity: "fail",
        code: "was_writes_summary_key",
        automation: num,
        detail: "Must not write formula Summary Key",
      });
    } else {
      findings.push({
        severity: "pass",
        code: "was_does_not_write_summary_key",
        automation: num,
        detail: "No Summary Key write detected",
      });
    }
  }
  return findings;
}

function checkStale(inventory, registry) {
  return STALE_REFS.map((ref) => {
    const result = ref.check(inventory, registry);
    return {
      severity: result.ok ? "pass" : "fail",
      code: ref.id,
      detail: `${ref.description}: ${result.detail}`,
    };
  });
}

function summarize(findings) {
  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  return {
    ok: counts.fail === 0,
    counts,
    findings,
  };
}

export function runHarness() {
  const registry = readJson(REGISTRY_PATH);
  const inventory = readJson(INVENTORY_PATH);
  const scripts = listAutomationScripts();

  const findings = [
    ...checkDuplicatePrefixOwnership(registry),
    ...checkFormulaWrites(scripts),
    ...checkMultipleAuthoritative(inventory),
    ...checkMissingRegistryEntries(registry),
    ...checkLegacyHomeworkCompletionUsage(),
    ...checkWasUniquenessGuards(),
    ...checkStale(inventory, registry),
  ];

  return {
    generated_at: new Date().toISOString(),
    agent: "agent-9-automation-ownership",
    repo_root: REPO_ROOT,
    ...summarize(findings),
  };
}

function main() {
  const result = runHarness();
  console.log(JSON.stringify({ ok: result.ok, counts: result.counts }, null, 2));
  if (!result.ok) {
    const fails = result.findings.filter((f) => f.severity === "fail");
    console.error("FAIL findings:");
    for (const f of fails) console.error("-", f.code, f.detail || "");
    process.exitCode = 1;
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
