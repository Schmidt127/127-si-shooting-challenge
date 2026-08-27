#!/usr/bin/env node
/**
 * SC-057 — extract trigger definitions from production script docblocks (repo only).
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AUTOMATIONS = join(ROOT, "airtable/automations/shooting-challenge");
const OUT = join(ROOT, "docs/audits/sc-057-trigger-inventory.json");

function extractMeta(source, fileName) {
  const numMatch = fileName.match(/^(\d+[A-Za-z]?)/);
  const number = numMatch ? numMatch[1] : fileName;
  const triggerTable = (source.match(/\* TRIGGER TABLE\s*\n\s*\* - ([^\n]+)/i) || [])[1]?.trim() || null;
  const triggerType = (source.match(/\* TRIGGER TYPE\s*\n\s*\* - ([^\n]+)/i) || [])[1]?.trim() || null;
  const automationName = (source.match(/\* AUTOMATION NAME\s*\n\s*\* - ([^\n]+)/i) || [])[1]?.trim() || null;
  const recommended = [];
  const re = /\* RECOMMENDED TRIGGER(?: CONDITIONS| VIEW CONDITIONS)?\s*\n([\s\S]*?)(?=\n \* (?:OPTIONAL|DO NOT|REQUIRED|OUTPUT|PRIMARY|FOLDER|THIS IS))/i;
  const block = (source.match(re) || [])[1] || "";
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*\* - (.+)/);
    if (m) recommended.push(m[1].trim());
  }
  const recordIdInput = /recordId/.test(source.slice(0, 4000));
  const statusOut = /statusOut/.test(source);
  return {
    number,
    file: `airtable/automations/shooting-challenge/${fileName}`,
    automationName,
    triggerTable,
    triggerType,
    recommendedConditions: recommended,
    hasRecordIdInput: recordIdInput,
    hasStatusOut: statusOut,
    evidence: "verified_from_repository",
    liveUiConfirmation: "requires_airtable_ui_confirmation",
  };
}

const files = readdirSync(AUTOMATIONS)
  .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
  .sort();

const entries = files.map((f) => extractMeta(readFileSync(join(AUTOMATIONS, f), "utf8"), f));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({ generated_at: "2026-08-27", entry_count: entries.length, entries }, null, 2)}\n`
);
console.log(`Wrote ${entries.length} trigger rows to ${OUT}`);
