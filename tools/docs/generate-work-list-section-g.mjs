#!/usr/bin/env node
/**
 * Generate Master Future Work List Section G operator queue + summary counts.
 *
 * Usage:
 *   node tools/docs/generate-work-list-section-g.mjs
 *   node tools/docs/generate-work-list-section-g.mjs --patch-master
 *
 * Reads:  docs/127-SI-MASTER-FUTURE-WORK-LIST.md
 * Writes: docs/_generated-work-list-section-g.md
 * Optional: patches the Summary count table inside Section G of the master list.
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const listPath = path.join(root, "docs/127-SI-MASTER-FUTURE-WORK-LIST.md");
const outPath = path.join(root, "docs/_generated-work-list-section-g.md");
const patchMaster = process.argv.includes("--patch-master");

const SNAPSHOT = "COMPLETE|IN PROGRESS|BLOCKED|READY|DEFERRED";

/** Explicit overlays that win over narrative/table text when fresher truth is known. */
const STATUS_OVERLAYS = {
  "FUT-003": "IN PROGRESS",
  "FUT-033": "COMPLETE",
  "FUT-034": "COMPLETE",
  "FUT-035": "COMPLETE",
  "FUT-036": "COMPLETE",
  "FUT-024": "COMPLETE",
  "SC-166": "MIKE-OWNED / MANUAL",
  "SC-SEASON-SIM-002": "READY",
  "FUT-029": "DEFERRED",
  "FUT-048": "DEFERRED",
  "MRW-H12": "DEFERRED",
  "AUT-013-PASTE": "OPTIONAL / DECLINED",
  "AUT-067-PASTE": "OPTIONAL / DECLINED",
  "AUT-122": "SUPERSEDED",
};

const OWNER_HINTS = {
  "FUT-003": "Mike",
  "FUT-026": "Mike",
  "FUT-010": "Mike",
  "SC-166": "Mike",
  "SC-SEASON-SIM-001": "Mike",
  "FUT-038": "Mike",
  "FUT-040": "Mike",
  "C-028": "Mike",
  "AUT-013-PASTE": "Mike",
  "AUT-067-PASTE": "Mike",
};

function splitRow(line) {
  const sanitized = line.replace(/\\\|/g, "\u0000");
  const parts = sanitized.split("|");
  if (parts.length < 3) return null;
  return parts.slice(1, -1).map((s) => s.replace(/\u0000/g, "|").trim());
}

function normalizeStatus(raw, id) {
  if (STATUS_OVERLAYS[id]) {
    const o = STATUS_OVERLAYS[id];
    if (o === "MIKE-OWNED / MANUAL") return "IN PROGRESS";
    if (o === "OPTIONAL / DECLINED" || o === "SUPERSEDED") return "DEFERRED";
    return o;
  }
  const s = String(raw || "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const u = s.toUpperCase();

  if (
    /DEFERRED|DO NOT IMPLEMENT|BRIEF NEEDED|NOT APPROVED|SUPERSEDED|ABANDONED|RESOLVED|OPTIONAL \/ DECLINED|STRUCTURE-ONLY|PASTE DECLINED/.test(
      u,
    ) &&
    !/^PAID ROUTE VALIDATED/i.test(s)
  ) {
    return "DEFERRED";
  }
  if (/BLOCKED|NOT CURRENTLY AUTHORIZED|DECISION NEEDED/.test(u)) {
    return "BLOCKED";
  }
  if (
    /COMPLETE|LIVE TESTED|MERGED\/DEPLOYED|PRODUCTION.VERIFIED|PASTE-ALIGNED|INSTALLED IN PROD|BUILT IN REPOSITORY|HARNESS|ARCHIVE EXECUTED|DO-NOT-TOUCH/.test(
      u,
    )
  ) {
    return "COMPLETE";
  }
  if (
    /IN PROGRESS|PARTIAL|MIKE UI|MIKE-OWNED|DEPLOY PENDING|READY FOR MIKE|VALIDATED|PHASE 3 PREP|DRY-RUN COMPLETE|IMPLEMENTED \(LANDING/.test(
      u,
    )
  ) {
    return "IN PROGRESS";
  }
  if (/READY|PLANNED|FUTURE|QUEUED|BRAINSTORMED|MONITORING|TRACKED UNDER/.test(u)) {
    return "READY";
  }
  if (/COMPLETE/.test(u)) return "COMPLETE";
  return "READY";
}

function priorityFrom(raw) {
  const m = String(raw || "").match(/P[0-3]/i);
  return m ? m[0].toUpperCase() : "P2";
}

function parseFutItems(text) {
  const items = [];
  const re = /^### (FUT-[0-9A-Z-]+)[^\n]*\n([\s\S]*?)(?=^### |^## )/gm;
  for (const m of text.matchAll(re)) {
    const id = m[1];
    const body = m[2];
    const statusRaw = (body.match(/\*\*Status:\*\*\s*([^\n]+)/) || [])[1] || "";
    const priorityRaw = (body.match(/\*\*Priority:\*\*\s*([^\n]+)/) || [])[1] || "P2";
    const titleLine = (text.match(new RegExp(`^### ${id}[^\\n]*`, "m")) || [id])[0]
      .replace(/^###\s+/, "")
      .replace(new RegExp(`^${id}\\s*[—–\\-]?\\s*`), "")
      .trim();
    items.push({
      id,
      title: titleLine || id,
      priority: priorityFrom(priorityRaw),
      statusRaw: statusRaw.replace(/\*\*/g, "").trim(),
      source: "narrative-FUT",
    });
  }
  return items;
}

/** Active SC operator-queue IDs (legacy Section F rows remain historical evidence). */
const ACTIVE_SC_IDS = new Set([
  "SC-109",
  "SC-112",
  "SC-147",
  "SC-148",
  "SC-149",
  "SC-149 residual",
  "SC-151",
  "SC-152",
  "SC-153",
  "SC-154",
  "SC-155",
  "SC-156",
  "SC-157",
  "SC-158",
  "SC-159",
  "SC-160",
  "SC-161",
  "SC-162",
  "SC-163",
  "SC-164",
  "SC-165",
  "SC-166",
]);

function parseScWaveRows(text) {
  const sectionF = text.split(/## F\. Legacy/)[1]?.split(/## G\./)[0] || "";
  const items = [];
  for (const line of sectionF.split("\n")) {
    if (!/^\| \*\*(SC-\d+|SC-149 residual)/.test(line)) continue;
    const cols = splitRow(line);
    if (!cols || cols.length < 5) continue;
    const id = cols[0].replace(/\*\*/g, "");
    if (!ACTIVE_SC_IDS.has(id)) continue;
    // | ID | Area | Title | Priority | Status | ...
    items.push({
      id,
      title: cols[2] || cols[1] || id,
      priority: priorityFrom(cols[3]),
      statusRaw: cols[4].replace(/\*\*/g, "").trim(),
      source: "section-F-SC",
    });
  }
  return items;
}

function parseSeasonSimAndSpecial(text) {
  const items = [];
  const specials = [
    ["SC-SEASON-SIM-001", "60-Day Five-Enrollment Season Simulation"],
    ["SC-SEASON-SIM-002", "Athlete 1 Season Simulation Infrastructure"],
    ["SC-ATHLETE-WF-001", "Individual athlete workflow QA"],
    ["SC-PW-E2E", "Disposable Perfect Week E2E"],
  ];
  for (const [id, fallbackTitle] of specials) {
    const heading = text.match(new RegExp(`### ${id}[^\\n]*`));
    const block = text.match(
      new RegExp(`### ${id}[\\s\\S]*?(?=\\n### |\\n## )`),
    );
    let statusRaw = "";
    if (block) {
      statusRaw = (block[0].match(/\*\*Status:\*\*\s*([^\n]+)/) || [])[1] || "";
    }
    // Prefer Section G overlay when present
    const g = text.split(/## G\. Current work list snapshot/)[1] || "";
    const gRow = g.match(new RegExp(`\\| \\*\\*${id}\\*\\* \\| \\*\\*?([^|\\n]+)`));
    if (gRow) statusRaw = gRow[1].replace(/\*\*/g, "").trim();
    if (!statusRaw && id === "SC-SEASON-SIM-001") statusRaw = "Planned / Future";
    if (!statusRaw && id === "SC-SEASON-SIM-002") statusRaw = "COMPLETE";
    items.push({
      id,
      title: (heading?.[0] || fallbackTitle)
        .replace(/^###\s+/, "")
        .replace(new RegExp(`^${id}\\s*[—–\\-]?\\s*`), "")
        .trim() || fallbackTitle,
      priority: id === "SC-SEASON-SIM-001" ? "P1" : "P2",
      statusRaw,
      source: "special",
    });
  }
  return items;
}

function syntheticMaintenanceItems() {
  return [
    {
      id: "AUT-013-PASTE",
      title: "Optional Automation 013 structural paste (v3.1.0 live; GitHub v3.2.0)",
      priority: "P3",
      statusRaw: "OPTIONAL / DECLINED",
      source: "maintenance",
    },
    {
      id: "AUT-067-PASTE",
      title: "Optional Automation 067 structural paste (v3.4 live; GitHub v3.5)",
      priority: "P3",
      statusRaw: "OPTIONAL / DECLINED",
      source: "maintenance",
    },
    {
      id: "AUT-122",
      title: "Automation 122 Goal Met Date stamp — never install",
      priority: "P3",
      statusRaw: "SUPERSEDED",
      source: "maintenance",
    },
  ];
}

function classifyOwner(item, snapshot) {
  if (OWNER_HINTS[item.id]) return OWNER_HINTS[item.id];
  if (snapshot === "DEFERRED" || snapshot === "COMPLETE") return "—";
  if (item.id.startsWith("FUT-") && snapshot === "READY") return "Cursor";
  if (item.id.startsWith("SC-") && snapshot === "READY") return "Cursor";
  if (snapshot === "IN PROGRESS" && /Mike|manual|UI|Make activation/i.test(item.statusRaw)) {
    return "Mike";
  }
  if (snapshot === "BLOCKED") return "Mike";
  if (snapshot === "IN PROGRESS") return "Cursor";
  return "—";
}

function isLaunchRequirement(item, snapshot) {
  const launchIds = new Set([
    "FUT-003",
    "FUT-026",
    "SC-SEASON-SIM-001",
    "SC-SEASON-SIM-002",
  ]);
  return launchIds.has(item.id);
}

function buildQueue(text) {
  const byId = new Map();
  const add = (item) => {
    const prev = byId.get(item.id);
    // Prefer section-F SC + overlays over older narrative when both exist
    if (!prev || item.source === "section-F-SC" || item.source === "maintenance") {
      byId.set(item.id, item);
    }
  };

  for (const item of parseFutItems(text)) add(item);
  for (const item of parseScWaveRows(text)) add(item);
  for (const item of parseSeasonSimAndSpecial(text)) add(item);
  for (const item of syntheticMaintenanceItems()) add(item);

  const rows = [...byId.values()].map((item) => {
    const snapshot = normalizeStatus(item.statusRaw, item.id);
    const displayStatus =
      STATUS_OVERLAYS[item.id] === "MIKE-OWNED / MANUAL"
        ? "IN PROGRESS (Mike-owned/manual; not core app blocker)"
        : snapshot;
    return {
      ...item,
      snapshot,
      displayStatus,
      owner: classifyOwner(item, snapshot),
      launch: isLaunchRequirement(item, snapshot),
    };
  });

  const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  rows.sort((a, b) => {
    const pr = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
    if (pr !== 0) return pr;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });

  return rows;
}

function summarize(rows) {
  const counts = {
    total: rows.length,
    COMPLETE: 0,
    "IN PROGRESS": 0,
    BLOCKED: 0,
    READY: 0,
    DEFERRED: 0,
  };
  for (const r of rows) counts[r.snapshot] = (counts[r.snapshot] || 0) + 1;

  const mike = rows.filter(
    (r) =>
      r.owner === "Mike" ||
      STATUS_OVERLAYS[r.id] === "MIKE-OWNED / MANUAL" ||
      r.launch,
  ).length;
  const cursor = rows.filter(
    (r) =>
      (r.snapshot === "READY" || r.snapshot === "IN PROGRESS") &&
      r.owner === "Cursor",
  ).length;
  const omni = rows.filter((r) => /OMNI|Airtable UI|Interface/i.test(r.statusRaw + r.title)).length;
  const prodActions = rows.filter(
    (r) =>
      r.launch ||
      STATUS_OVERLAYS[r.id] === "MIKE-OWNED / MANUAL" ||
      (r.owner === "Mike" && r.snapshot !== "COMPLETE" && r.snapshot !== "DEFERRED"),
  ).length;

  return { counts, mike, cursor, omni, prodActions };
}

function renderGenerated(rows, summary, generatedAt) {
  const { counts, mike, cursor, omni, prodActions } = summary;
  const lines = [];
  lines.push("# Generated Section G — operator queue");
  lines.push("");
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Command:** \`node tools/docs/generate-work-list-section-g.mjs\``);
  lines.push(`**Source:** \`docs/127-SI-MASTER-FUTURE-WORK-LIST.md\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|---|---|");
  lines.push(`| Total items | ${counts.total} |`);
  lines.push(`| COMPLETE | ${counts.COMPLETE} |`);
  lines.push(`| IN PROGRESS | ${counts["IN PROGRESS"]} |`);
  lines.push(`| BLOCKED | ${counts.BLOCKED} |`);
  lines.push(`| READY | ${counts.READY} |`);
  lines.push(`| DEFERRED | ${counts.DEFERRED} |`);
  lines.push(`| Production actions remaining | ${prodActions} |`);
  lines.push(`| Items requiring Mike | ${mike} |`);
  lines.push(`| Items requiring Cursor | ${cursor} |`);
  lines.push(`| Items requiring OMNI/Airtable | ${omni} |`);
  lines.push("");
  lines.push("Unified vocabulary: **" + SNAPSHOT.replace(/\|/g, "** · **") + "**.");
  lines.push("");
  lines.push("## Operator queue");
  lines.push("");
  lines.push("| ID | Priority | Snapshot | Launch? | Owner hint | Title |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of rows) {
    const launch = r.launch ? "yes" : "no";
    const title = r.title.replace(/\|/g, "\\|").slice(0, 120);
    lines.push(
      `| **${r.id}** | ${r.priority} | ${r.displayStatus} | ${launch} | ${r.owner} | ${title} |`,
    );
  }
  lines.push("");
  lines.push("## Classification notes (2026-09-05 reconciliation)");
  lines.push("");
  lines.push("- **SC-163** = COMPLETE / Live Tested under Automation **066 v4.1**.");
  lines.push(
    "- **SC-166** = Mike-owned/manual Interface filter fine-tuning; Interfaces published; **not** a core application blocker.",
  );
  lines.push("- **FUT-029** = Deferred — DO NOT IMPLEMENT; outside current app completion.");
  lines.push("- **AUT-013 / AUT-067** pastes = optional/declined maintenance (not paste-pending blockers).");
  lines.push("- **AUT-122** = superseded; never install.");
  lines.push(
    "- **SC-SEASON-SIM-002** package = reusable and READY for Mike authorization later; **not currently running**; temporary formulas inactive (live `NOW()` / `TODAY()`); prior Sept 2 run cleaned; next execute needs a **new** simulation ID and exact phrase `RUN SEASON SIMULATION`.",
  );
  lines.push("- Launch-time requirements are flagged `Launch? = yes` separately from future enhancements.");
  lines.push("");
  return lines.join("\n");
}

function patchMasterSummary(text, summary) {
  const { counts, mike, cursor, omni, prodActions } = summary;
  const sectionGStart = text.indexOf("## G. Current work list snapshot");
  if (sectionGStart < 0) throw new Error("Section G not found");

  const before = text.slice(0, sectionGStart);
  let sectionG = text.slice(sectionGStart);

  // Refresh dated heading
  sectionG = sectionG.replace(
    /## G\. Current work list snapshot \([^)]+\)/,
    "## G. Current work list snapshot (2026-09-05)",
  );

  // Master list historically uses blank lines between every markdown line.
  const nl = sectionG.includes("\r\n") ? "\r\n" : "\n";
  const blank = nl + nl;
  const row = (metric, value) => `| ${metric} | ${value} |`;
  const summaryBlock = [
    "### Summary",
    "",
    "| Metric | Count |",
    "",
    "|---|---|",
    "",
    row("Total items", counts.total),
    "",
    row("COMPLETE", counts.COMPLETE),
    "",
    row("IN PROGRESS", counts["IN PROGRESS"]),
    "",
    row("BLOCKED", counts.BLOCKED),
    "",
    row("READY", counts.READY),
    "",
    row("DEFERRED", counts.DEFERRED),
    "",
    row("Production actions remaining", prodActions),
    "",
    row("Items requiring Mike", mike),
    "",
    row("Items requiring Cursor", cursor),
    "",
    row("Items requiring OMNI/Airtable", omni),
    "",
    "",
  ].join(nl);

  const replaced = sectionG.replace(
    /### Summary(?:\r?\n)+\| Metric \| Count \|[\s\S]*?(?=(?:\r?\n)+### )/,
    summaryBlock,
  );
  if (replaced === sectionG) {
    throw new Error("Failed to locate Section G Summary table for patch");
  }
  sectionG = replaced;

  return before + sectionG;
}

const text = fs.readFileSync(listPath, "utf8");
const rows = buildQueue(text);
const summary = summarize(rows);
const generatedAt = new Date().toISOString().slice(0, 10);
const generated = renderGenerated(rows, summary, generatedAt);
fs.writeFileSync(outPath, generated + "\n");

if (patchMaster) {
  const patched = patchMasterSummary(text, summary);
  fs.writeFileSync(listPath, patched);
  console.log("Patched Section G summary in", path.relative(root, listPath));
}

console.log(
  JSON.stringify(
    {
      out: path.relative(root, outPath),
      total: summary.counts.total,
      COMPLETE: summary.counts.COMPLETE,
      IN_PROGRESS: summary.counts["IN PROGRESS"],
      BLOCKED: summary.counts.BLOCKED,
      READY: summary.counts.READY,
      DEFERRED: summary.counts.DEFERRED,
      mike: summary.mike,
      cursor: summary.cursor,
      prodActions: summary.prodActions,
    },
    null,
    2,
  ),
);
