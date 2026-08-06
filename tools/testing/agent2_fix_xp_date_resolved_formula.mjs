#!/usr/bin/env node
/**
 * Fix XP Events · XP Date Resolved SWITCH case:
 * XP Bucket uses "Shooting Base", not "Submission Base".
 *
 *   node tools/testing/agent2_fix_xp_date_resolved_formula.mjs
 *   node tools/testing/agent2_fix_xp_date_resolved_formula.mjs --dry-run
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const TABLE = "tblmGSiNA1akW8KnU"; // XP Events
const FIELD = "fldvh9pv1oTIp24IJ"; // XP Date Resolved
const DRY = process.argv.includes("--dry-run");

function loadEnvLocal() {
  for (const p of [".env.local", "web/.env.local", ".env"]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

async function main() {
  loadEnvLocal();
  const token = process.env.AIRTABLE_API_TOKEN;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const before = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${TABLE}/fields/${FIELD}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  // Meta doesn't support GET single field; read from tables list
  const tables = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const field = tables.tables
    .find((t) => t.id === TABLE)
    .fields.find((f) => f.id === FIELD);
  const oldFormula = field.options?.formula || "";
  if (!oldFormula.includes('"Submission Base"')) {
    console.log("Formula already lacks Submission Base case — aborting");
    process.exit(1);
  }
  if (oldFormula.includes('"Shooting Base"')) {
    console.log("Formula already has Shooting Base — aborting");
    process.exit(1);
  }

  const newFormula = oldFormula.replace('"Submission Base"', '"Shooting Base"');
  const evidence = {
    fieldId: FIELD,
    tableId: TABLE,
    dryRun: DRY,
    oldHadSubmissionBase: oldFormula.includes('"Submission Base"'),
    newHasShootingBase: newFormula.includes('"Shooting Base"'),
    newLacksSubmissionBase: !newFormula.includes('"Submission Base"'),
    oldFormula,
    newFormula,
  };

  if (DRY) {
    writeEvidence(evidence);
    console.log(JSON.stringify({ dryRun: true, ...evidence, oldFormula: undefined, newFormula: undefined }, null, 2));
    return;
  }

  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${TABLE}/fields/${FIELD}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        description:
          "Resolved XP activity date. SWITCH on XP Bucket; Shooting Base uses submission activity lookup. Fixed 2026-08-05 (Submission Base→Shooting Base).",
        options: { formula: newFormula },
      }),
    }
  );
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  evidence.patchStatus = res.status;
  evidence.patchOk = res.ok;
  evidence.responseFormula = data?.options?.formula || null;
  evidence.isValid = data?.options?.isValid;
  evidence.responseError = res.ok ? null : data;

  if (!res.ok) {
    writeEvidence(evidence);
    throw new Error(`PATCH failed ${res.status}: ${text.slice(0, 500)}`);
  }
  if (!evidence.responseFormula?.includes('"Shooting Base"')) {
    writeEvidence(evidence);
    throw new Error("Patched formula missing Shooting Base case");
  }
  if (evidence.responseFormula?.includes('"Submission Base"')) {
    writeEvidence(evidence);
    throw new Error("Patched formula still contains Submission Base");
  }
  if (evidence.isValid === false) {
    writeEvidence(evidence);
    throw new Error("Patched formula reported isValid=false");
  }

  writeEvidence(evidence);
  console.log(
    JSON.stringify(
      {
        ok: true,
        isValid: evidence.isValid,
        hasShootingBase: true,
        lacksSubmissionBase: true,
      },
      null,
      2
    )
  );
}

function writeEvidence(evidence) {
  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/XP-DATE-RESOLVED-FORMULA-FIX.json",
    JSON.stringify(evidence, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
