#!/usr/bin/env node
/**
 * Clear Grade Band on Schmidt 2026-27 enrollment and poll for 002 re-assignment.
 * Proves whether PROD Automation 002 currently works (v8.2) or still crashes.
 *
 *   node tools/testing/agent2_retrigger_002_grade_band.mjs
 *   node tools/testing/agent2_retrigger_002_grade_band.mjs --dry-run
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const ENROLLMENT = "recCyFEPeATOVNlr9";
const EXPECTED_BAND = "reclWDQZzKbVBtdhG"; // 3-4
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

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 500)}`);
  return data;
}

function snap(fields) {
  return {
    Grade: fields.Grade,
    "Grade Band": fields["Grade Band"] || [],
    "Grade Band Status": fields["Grade Band Status"] || null,
    "Grade Band Assignment Status": fields["Grade Band Assignment Status"] || null,
    "Last Grade Used for Grade Band": fields["Last Grade Used for Grade Band"] || null,
    "Grade Band (Auto Assign)": fields["Grade Band (Auto Assign)"] || null,
    "Ready for Grade Band Assignment?": fields["Ready for Grade Band Assignment?"] ?? null,
    "Grade Band Refresh Needed": fields["Grade Band Refresh Needed"] ?? null,
  };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadEnvLocal();
  const beforeRec = await api(`Enrollments/${ENROLLMENT}`);
  const before = snap(beforeRec.fields);
  const evidence = {
    enrollmentId: ENROLLMENT,
    dryRun: DRY,
    startedAt: new Date().toISOString(),
    before,
    expectedBandId: EXPECTED_BAND,
    steps: [],
  };

  if (DRY) {
    evidence.steps.push({ action: "dry-run-exit", note: "No writes performed" });
    writeEvidence(evidence);
    console.log(JSON.stringify(evidence, null, 2));
    return;
  }

  // Clear Grade Band link so 002 trigger can fire (Grade Band empty + Grade set)
  const clearFields = { "Grade Band": [] };
  // Best-effort optional clears only when field exists on the record schema snapshot
  const optionalClears = {
    "Grade Band Assignment Status": "",
  };
  for (const [f, v] of Object.entries(optionalClears)) {
    if (Object.prototype.hasOwnProperty.call(beforeRec.fields, f)) clearFields[f] = v;
  }
  try {
    await api(`Enrollments/${ENROLLMENT}`, {
      method: "PATCH",
      body: { fields: clearFields, typecast: true },
    });
    evidence.steps.push({ action: "cleared-grade-band-fields", fields: Object.keys(clearFields) });
  } catch (e) {
    evidence.steps.push({ action: "clear-failed", error: String(e.message || e) });
    writeEvidence(evidence);
    throw e;
  }

  // Touch Grade to help trigger (set same value)
  try {
    await api(`Enrollments/${ENROLLMENT}`, {
      method: "PATCH",
      body: { fields: { Grade: "3" }, typecast: true },
    });
    evidence.steps.push({ action: "retouched-grade-3" });
  } catch (e) {
    evidence.steps.push({ action: "retouch-grade-failed", error: String(e.message || e) });
  }

  // Poll up to ~90s
  let assigned = false;
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const rec = await api(`Enrollments/${ENROLLMENT}`);
    const s = snap(rec.fields);
    evidence.steps.push({ poll: i + 1, at: new Date().toISOString(), snap: s });
    if ((s["Grade Band"] || [])[0] === EXPECTED_BAND) {
      assigned = true;
      evidence.result = "PASS_REASSIGNED_3_4";
      evidence.after = s;
      break;
    }
    if ((s["Grade Band"] || []).length > 0) {
      evidence.result = "UNEXPECTED_BAND";
      evidence.after = s;
      break;
    }
  }

  if (!assigned && evidence.result !== "UNEXPECTED_BAND") {
    evidence.result = "NO_REASSIGN_WITHIN_TIMEOUT";
    const rec = await api(`Enrollments/${ENROLLMENT}`);
    evidence.after = snap(rec.fields);
    // Restore expected band so we don't leave enrollment broken
    await api(`Enrollments/${ENROLLMENT}`, {
      method: "PATCH",
      body: {
        fields: {
          "Grade Band": [EXPECTED_BAND],
          "Grade Band Status": "Assigned",
          "Last Grade Used for Grade Band": "3",
        },
        typecast: true,
      },
    });
    evidence.steps.push({
      action: "restored-expected-band-after-timeout",
      note: "002 did not fire or failed; API restored 3-4 link",
    });
  }

  evidence.finishedAt = new Date().toISOString();
  writeEvidence(evidence);
  console.log(JSON.stringify({ result: evidence.result, after: evidence.after, steps: evidence.steps.length }, null, 2));
}

function writeEvidence(evidence) {
  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/002-GRADE-BAND-RETRIGGER.json",
    JSON.stringify(evidence, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
