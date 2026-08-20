#!/usr/bin/env node
/**
 * Agent 4 ops — PROD automation inventory drift audit.
 *
 * ⛔ RETIRED AUTHORITY PATH (2026-08-20):
 * This script historically read the Production base's obsolete `Automations`
 * *data table*. That table is NOT an authority source for Version 2 audits.
 * Do not use its Status/version/trigger rows for operational decisions.
 * See docs/CURRENT-TRUTH.md and docs/AUTHORITY-MAP.md.
 *
 * Prefer: Airtable Automations UI attestation, Mike-dated evidence, and
 * GitHub SCRIPT headers in airtable/automations/shooting-challenge/.
 *
 * Usage (historical only — do not treat output as live truth):
 *   node tools/testing/ops_automation_inventory_audit.mjs
 *   node tools/testing/ops_automation_inventory_audit.mjs --write-evidence
 *
 * Never prints webhook URLs or secrets from script bodies.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "appn84sqPw03zEbTT";
const WRITE = process.argv.includes("--write-evidence");
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent4-ops");

function loadEnv() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, "tools/airtable/.env"),
    resolve(ROOT, ".env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const TOKEN = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
if (!TOKEN || !TOKEN.startsWith("pat")) {
  console.error("BLOCKED: AIRTABLE_API_TOKEN missing or invalid");
  process.exit(1);
}

// Hard stop: obsolete Production Automations *data table* is not V2 authority.
console.error(
  [
    "BLOCKED: ops_automation_inventory_audit.mjs must not query the obsolete Production Automations data table.",
    "That table is not an authority source for Version 2 audits or operational decisions.",
    "Use Airtable Automations UI attestation, Mike-dated evidence, and GitHub SCRIPT headers instead.",
    "See docs/CURRENT-TRUTH.md and docs/AUTHORITY-MAP.md.",
  ].join("\n")
);
process.exit(2);

const headers = { Authorization: `Bearer ${TOKEN}` };

async function api(path, qs = "") {
  const url = `https://api.airtable.com/v0/${path}${qs}`;
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, json };
}

async function listAll(tableIdOrName, fields) {
  const out = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (fields) for (const f of fields) params.append("fields[]", f);
    if (offset) params.set("offset", offset);
    const r = await api(`${BASE}/${encodeURIComponent(tableIdOrName)}?${params}`);
    if (!r.ok) throw new Error(`list ${tableIdOrName}: ${r.status} ${JSON.stringify(r.json).slice(0, 400)}`);
    out.push(...(r.json.records || []));
    offset = r.json.offset;
  } while (offset);
  return out;
}

function extractSlot(name) {
  const m = String(name || "").match(/\b(0?\d{2}[a-f]?|1\d{2}[a-f]?)\b/i);
  return m ? m[1].toLowerCase().replace(/^0+(\d)/, "$1").padStart(3, "0").replace(/^0+(\d{2}[a-f])$/i, (_, x) => x) : null;
}

function normalizeSlot(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (!s) return null;
  // 070a, 117f, 001, 10, 54 etc.
  const m = s.match(/^(\d{1,3})([a-f])?$/i);
  if (!m) return null;
  const num = m[1].padStart(3, "0");
  return m[2] ? `${num}${m[2].toLowerCase()}` : num;
}

function extractVersionFromCode(code) {
  const text = String(code || "");
  const patterns = [
    /version:\s*["']([^"']+)["']/i,
    /Version:\s*(v?[\d.]+(?:\.\d+)*)/i,
    /\*\s*Version:\s*([^\n*]+)/i,
    /SCRIPT\s*=\s*\{[\s\S]*?version:\s*["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return String(m[1]).trim().replace(/^Version:\s*/i, "");
  }
  return null;
}

function extractRepoVersion(filePath) {
  const text = readFileSync(filePath, "utf8");
  const scriptMatch = text.match(/const SCRIPT\s*=\s*\{[\s\S]*?version:\s*["']([^"']+)["']/);
  if (scriptMatch) return scriptMatch[1];
  const configMatch = text.match(/version:\s*["']([^"']+)["']/);
  if (configMatch) return configMatch[1];
  const header = text.match(/\*\s*Version:\s*([^\n*]+)/i);
  if (header) return header[1].trim();
  return null;
}

function listRepoScripts() {
  const dir = resolve(ROOT, "airtable/automations/shooting-challenge");
  const files = readdirSync(dir).filter(
    (f) => /^\d{3}[a-z]?-.*\.js$/i.test(f) && !f.includes("_design") && !f.includes("_superseded")
  );
  const map = new Map();
  for (const f of files) {
    const slot = normalizeSlot(f.match(/^(\d{3}[a-z]?)/i)?.[1]);
    if (!slot) continue;
    const abs = resolve(dir, f);
    map.set(slot, {
      slot,
      file: `airtable/automations/shooting-challenge/${f}`,
      version: extractRepoVersion(abs),
    });
  }
  return map;
}

/** Critical ops slots Agent 4 cares about for launch readiness */
const CRITICAL_SLOTS = [
  "001", "002", "010", "013", "020", "031", "033", "035", "042", "054", "057", "058", "059",
  "064", "065", "066", "067", "070a", "070b", "070c", "071", "072", "073", "074", "075",
  "101", "112", "114", "115", "116", "117", "118", "119",
];

const KNOWN_RETIRED = new Set(["032", "043", "063", "111"]); // claimed deleted / retire
const MUST_STAY_OFF = new Set(["112"]);

async function main() {
  const meta = await api(`meta/bases/${BASE}/tables`);
  if (!meta.ok) throw new Error(`meta tables failed: ${meta.status}`);
  const tables = meta.json.tables || [];
  const automationsTable = tables.find((t) => String(t.name).toLowerCase() === "automations");
  if (!automationsTable) {
    throw new Error("Automations operator table not found in Meta API");
  }

  const records = await listAll(automationsTable.id, [
    "Name",
    "Status",
    "Trigger type",
    "Trigger table",
    "Conditions",
    "Sections",
    "Automation Code",
  ]);

  const repo = listRepoScripts();
  const liveBySlot = new Map();
  const unparsed = [];

  for (const rec of records) {
    const f = rec.fields || {};
    const name = f.Name || "";
    const slotRaw = extractSlot(name);
    const slot = normalizeSlot(slotRaw) || normalizeSlot(String(name).match(/^(\d{3}[a-z]?)/i)?.[1]);
    const code = f["Automation Code"] || "";
    const liveVersion = extractVersionFromCode(code);
    const entry = {
      recordId: rec.id,
      name,
      slot,
      status: f.Status || "",
      triggerType: f["Trigger type"] || "",
      triggerTable: f["Trigger table"] || "",
      conditions: String(f.Conditions || "").slice(0, 240),
      section: f.Sections || "",
      liveVersion,
      codeChars: String(code).length,
      looksLikeOrchestrator:
        /ZOOM_CREDIT|117-orchestrator|attendeesWriteAttempted|create.*XP Event/i.test(code) &&
        /117/.test(name),
      looksLikeEmailHandoff: /117f|ZOOM_RECORDING_APPROVED|ZOOM_REC_EMAIL/i.test(code),
    };
    if (!slot) {
      unparsed.push(entry);
      continue;
    }
    if (!liveBySlot.has(slot)) liveBySlot.set(slot, []);
    liveBySlot.get(slot).push(entry);
  }

  const findings = [];
  const comparisons = [];

  for (const slot of [...new Set([...CRITICAL_SLOTS, ...liveBySlot.keys(), ...repo.keys()])].sort()) {
    const liveRows = liveBySlot.get(slot) || [];
    const repoRow = repo.get(slot) || null;
    const primary = liveRows[0] || null;
    const cmp = {
      slot,
      critical: CRITICAL_SLOTS.includes(slot),
      inOperatorTable: liveRows.length > 0,
      operatorStatus: primary?.status || null,
      liveVersion: primary?.liveVersion || null,
      repoFile: repoRow?.file || null,
      repoVersion: repoRow?.version || null,
      versionMatch:
        primary?.liveVersion && repoRow?.version
          ? String(primary.liveVersion).replace(/^v/i, "") === String(repoRow.version).replace(/^v/i, "") ||
            String(primary.liveVersion).includes(String(repoRow.version).replace(/^v/i, "")) ||
            String(repoRow.version).includes(String(primary.liveVersion).replace(/^v/i, ""))
          : null,
      duplicateOperatorRows: liveRows.length > 1,
      retiredClaim: KNOWN_RETIRED.has(slot),
      mustStayOff: MUST_STAY_OFF.has(slot),
      looksLikeOrchestrator: primary?.looksLikeOrchestrator || false,
      looksLikeEmailHandoff: primary?.looksLikeEmailHandoff || false,
    };
    comparisons.push(cmp);

    if (liveRows.length > 1) {
      findings.push({
        severity: "P0",
        code: "DUPLICATE_OPERATOR_ROW",
        slot,
        detail: `${liveRows.length} Automations-table rows for slot ${slot}`,
      });
    }
    if (KNOWN_RETIRED.has(slot) && liveRows.some((r) => /live/i.test(r.status))) {
      findings.push({
        severity: "P1",
        code: "RETIRED_STILL_MARKED_LIVE_IN_OPERATOR_TABLE",
        slot,
        detail: `${slot} claimed retired/deleted in completion docs but operator Status=Live — treat as documentation lag until Mike UI-attests ON/OFF (operator table is not the Airtable Automations UI)`,
      });
    }
    if (MUST_STAY_OFF.has(slot) && liveRows.some((r) => /live/i.test(r.status))) {
      findings.push({
        severity: "P0",
        code: "112_OPERATOR_TABLE_SHOWS_LIVE",
        slot,
        detail: "112 must remain OFF (OW-D1). Operator table shows Live — Mike must confirm Automations UI is OFF (operator table may lag)",
      });
    }
    if (slot === "117" && primary) {
      if (primary.looksLikeOrchestrator && !primary.looksLikeEmailHandoff) {
        findings.push({
          severity: "P0",
          code: "117_ORCHESTRATOR_IN_EMAIL_SLOT",
          slot,
          detail: "Automation 117 operator code looks like Stage 17 orchestrator — email-only script required",
        });
      } else if (primary.looksLikeEmailHandoff) {
        findings.push({
          severity: "INFO",
          code: "117_EMAIL_HANDOFF_CONFIRMED",
          slot,
          detail: "Operator code contains 117f / ZOOM_RECORDING_APPROVED / send-key markers",
        });
      }
    }
    if (CRITICAL_SLOTS.includes(slot) && !liveRows.length) {
      findings.push({
        severity: "P1",
        code: "CRITICAL_MISSING_FROM_OPERATOR_TABLE",
        slot,
        detail: `Critical slot ${slot} absent from Automations operator table (may still exist in UI only — Mike attest)`,
      });
    }
    if (cmp.versionMatch === false) {
      findings.push({
        severity: "P1",
        code: "VERSION_DRIFT",
        slot,
        detail: `live=${cmp.liveVersion} repo=${cmp.repoVersion}`,
      });
    }
  }

  // Ops email chain summary
  const emailChain = ["071", "072", "073", "074", "075", "117", "118", "119"].map((slot) => {
    const c = comparisons.find((x) => x.slot === slot);
    return c || { slot, inOperatorTable: false };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    baseId: BASE,
    automationsTableId: automationsTable.id,
    operatorRowCount: records.length,
    repoScriptCount: repo.size,
    criticalSlots: CRITICAL_SLOTS.length,
    findingCounts: {
      P0: findings.filter((f) => f.severity === "P0").length,
      P1: findings.filter((f) => f.severity === "P1").length,
      INFO: findings.filter((f) => f.severity === "INFO").length,
    },
    findings,
    emailChain,
    comparisons: comparisons.filter((c) => c.critical || c.inOperatorTable),
    unparsedNames: unparsed.map((u) => u.name),
    caveat:
      "The Automations operator table stores a documentation copy of script bodies/status. It is NOT the live Airtable Automations UI and may lag pastes/deletes (e.g. 071 operator header v2.0 vs attested PROD paste v3.5). Use it for drift triage only. UI attestation remains mandatory before Complete on SC-058/SC-059. Version-match against this table is a weak signal.",
  };

  console.log(JSON.stringify({
    ok: true,
    operatorRowCount: report.operatorRowCount,
    findingCounts: report.findingCounts,
    p0: findings.filter((f) => f.severity === "P0"),
    p1Sample: findings.filter((f) => f.severity === "P1").slice(0, 15),
    emailChain,
    caveat: report.caveat,
  }, null, 2));

  if (WRITE) {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(resolve(EVIDENCE_DIR, "AUTOMATION-INVENTORY-AUDIT.json"), JSON.stringify(report, null, 2));
    const md = [
      "# Automation inventory audit — 2026-08-05 Agent 4",
      "",
      `Base: \`${BASE}\` · Operator table: \`${automationsTable.id}\` · Rows: **${records.length}**`,
      "",
      "## Finding counts",
      "",
      `- P0: ${report.findingCounts.P0}`,
      `- P1: ${report.findingCounts.P1}`,
      `- INFO: ${report.findingCounts.INFO}`,
      "",
      "## P0 findings",
      "",
      ...(findings.filter((f) => f.severity === "P0").length
        ? findings.filter((f) => f.severity === "P0").map((f) => `- **${f.code}** (${f.slot}): ${f.detail}`)
        : ["- none"]),
      "",
      "## Email / weekly chain (operator table)",
      "",
      "| Slot | In table | Status | Live ver | Repo ver | Match |",
      "|------|----------|--------|----------|----------|-------|",
      ...emailChain.map((c) => {
        const full = comparisons.find((x) => x.slot === c.slot) || c;
        return `| ${full.slot} | ${full.inOperatorTable ? "yes" : "NO"} | ${full.operatorStatus || "—"} | ${full.liveVersion || "—"} | ${full.repoVersion || "—"} | ${full.versionMatch == null ? "—" : full.versionMatch} |`;
      }),
      "",
      "## Caveat",
      "",
      report.caveat,
      "",
    ].join("\n");
    writeFileSync(resolve(EVIDENCE_DIR, "AUTOMATION-INVENTORY-AUDIT.md"), md);
    console.log("Wrote evidence to", EVIDENCE_DIR);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
