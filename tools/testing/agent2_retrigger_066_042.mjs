#!/usr/bin/env node
/**
 * Investigate XP Events Enrollment link vs Enrollment Record ID lookup.
 * Trigger 066 milestone check + 042 level recalc on Schmidt 2026-27.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const ENR = "recCyFEPeATOVNlr9";
const XP_IDS = [
  "rec2aA0eASdI7kg7V",
  "rec38iZMxQFiJJKNl",
  "rec4EJUNz9EmRvmiD",
  "rec6hhgZoXukWgFDp",
];

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

async function metaTables() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` },
  });
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadEnvLocal();
  const tables = await metaTables();
  const xpTable = tables.tables.find((t) => t.name === "XP Events");
  const enrIdField = xpTable.fields.find((f) => f.name === "Enrollment Record ID");
  const enrField = xpTable.fields.find((f) => f.name === "Enrollment");

  const samples = [];
  for (const id of XP_IDS) {
    const rec = await api(`XP%20Events/${id}`);
    samples.push({
      id,
      Enrollment: rec.fields.Enrollment || [],
      "Enrollment Record ID": rec.fields["Enrollment Record ID"] || null,
      "Source Key": rec.fields["Source Key"],
      "XP Bucket": rec.fields["XP Bucket"],
    });
  }

  const evidence = {
    enrollmentRecordIdField: {
      id: enrIdField?.id,
      type: enrIdField?.type,
      options: enrIdField?.options || null,
    },
    enrollmentField: { id: enrField?.id, type: enrField?.type },
    samples,
    missingEnrollmentLink: samples.filter((s) => !s.Enrollment?.length).map((s) => s.id),
  };

  // Trigger 066: clear then set Run Shot Milestone Check?
  const before = await api(`Enrollments/${ENR}`);
  evidence.beforeMilestoneFlag = before.fields["Run Shot Milestone Check?"];
  evidence.beforeLevelRecalc = before.fields["Level Recalc Needed?"];
  evidence.beforeLevelStatus = before.fields["Level Status"];
  evidence.beforeGateSummary = before.fields["Gate Summary"];
  evidence.beforeGateDebug = before.fields["Gate Debug Summary"];
  evidence.totalShotsCounted = before.fields["Total Shots Counted"];

  await api(`Enrollments/${ENR}`, {
    method: "PATCH",
    body: { fields: { "Run Shot Milestone Check?": false }, typecast: true },
  });
  await sleep(2000);
  await api(`Enrollments/${ENR}`, {
    method: "PATCH",
    body: { fields: { "Run Shot Milestone Check?": true }, typecast: true },
  });
  evidence.steps = [{ action: "toggled-run-shot-milestone-check" }];

  // Also set Level Recalc Needed?
  try {
    await api(`Enrollments/${ENR}`, {
      method: "PATCH",
      body: { fields: { "Level Recalc Needed?": true }, typecast: true },
    });
    evidence.steps.push({ action: "set-level-recalc-needed" });
  } catch (e) {
    evidence.steps.push({ action: "level-recalc-failed", error: String(e.message || e) });
  }

  // Poll for milestone XP + flag clear + level status change
  for (let i = 0; i < 24; i++) {
    await sleep(5000);
    const enr = await api(`Enrollments/${ENR}`);
    const milXp = await api(
      `XP%20Events?pageSize=20&filterByFormula=${encodeURIComponent(
        `AND({Enrollment Record ID}="${ENR}",{XP Bucket}="Shot Milestone")`
      )}`
    );
    const unlocks = await api(
      `Athlete%20Achievement%20Unlocks?pageSize=20&filterByFormula=${encodeURIComponent(
        `FIND("${ENR}", ARRAYJOIN({Enrollment}))`
      )}`
    ).catch((e) => ({ error: String(e.message || e), records: [] }));

    const snap = {
      poll: i + 1,
      at: new Date().toISOString(),
      runCheck: enr.fields["Run Shot Milestone Check?"],
      levelRecalc: enr.fields["Level Recalc Needed?"],
      levelStatus: enr.fields["Level Status"],
      gateSummary: enr.fields["Gate Summary"],
      milestoneXpCount: (milXp.records || []).length,
      milestoneXpKeys: (milXp.records || []).map((r) => r.fields["Source Key"]),
      unlockCount: (unlocks.records || []).length,
    };
    evidence.steps.push(snap);

    if (
      snap.runCheck === false &&
      (snap.milestoneXpCount > 0 || i >= 3)
    ) {
      // flag cleared = 066 ran
      if (snap.runCheck === false) evidence.milestoneAutomationLikelyRan = true;
    }
    if (snap.runCheck === false && snap.levelRecalc === false) {
      evidence.result = "BOTH_FLAGS_CLEARED";
      break;
    }
  }

  if (!evidence.result) {
    const enr = await api(`Enrollments/${ENR}`);
    evidence.after = {
      runCheck: enr.fields["Run Shot Milestone Check?"],
      levelRecalc: enr.fields["Level Recalc Needed?"],
      levelStatus: enr.fields["Level Status"],
      gateSummary: enr.fields["Gate Summary"],
      gateDebug: enr.fields["Gate Debug Summary"],
    };
    evidence.result =
      evidence.after.runCheck === false
        ? "MILESTONE_FLAG_CLEARED"
        : "TIMEOUT_FLAGS_STILL_SET";
  }

  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/066-042-RETRIGGER.json",
    JSON.stringify(evidence, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        result: evidence.result,
        missingEnrollmentLink: evidence.missingEnrollmentLink,
        enrollmentRecordIdType: evidence.enrollmentRecordIdField?.type,
        lastStep: evidence.steps[evidence.steps.length - 1],
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
