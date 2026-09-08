#!/usr/bin/env node
"use strict";
/** Generates tools/testing/sc-test-control/scenarios.json from V2 matrix rows */
const { writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const EXECUTABLE = new Set([
  "A3", "A4", "B1", "B2", "B3", "B5", "C4", "C6", "D1", "I1", "J1", "L1", "SC006-WRITEBACK",
]);
const OFFLINE = new Set(["A4", "L1"]);
const BLOCKED_486 = new Set(["C8"]); // future structured curriculum row
const EMAIL = new Set(["I6", "L3"]);

const ROWS = [
  ["A1", "enrollment", "New enrollment creates/links athlete"],
  ["A2", "enrollment", "Grade change reassigns band"],
  ["A3", "enrollment", "Submission gets enrollment + week"],
  ["A4", "enrollment", "Malformed recordId input"],
  ["B1", "daily-submission", "First counted submission day awards XP"],
  ["B2", "daily-submission", "Same submission automation rerun"],
  ["B3", "daily-submission", "Second submission same calendar day"],
  ["B4", "daily-submission", "Duplicate key collision"],
  ["B5", "daily-submission", "Backdated submission date"],
  ["C1", "homework", "Homework asset creates completion"],
  ["C2", "homework", "Homework asset rerun / duplicate"],
  ["C3", "homework", "Unsatisfactory review — no XP"],
  ["C4", "homework", "Satisfactory review awards XP"],
  ["C5", "homework", "Homework XP rerun"],
  ["C6", "homework", "Reflection quiz → completion"],
  ["C7", "homework", "Homework upload to storage (070a legacy)"],
  ["C8", "homework", "Structured Curriculum file submit (Hub staging)"],
  ["D1", "video", "Video asset → Video Feedback"],
  ["D2", "video", "Base video XP assigned"],
  ["D3", "video", "Posted feedback creates XP"],
  ["D4", "video", "Video XP steal-guard"],
  ["D5", "video", "Video XP rerun"],
  ["D6", "upload", "Async video upload success"],
  ["D7", "upload", "Duplicate bytes / reuse decision"],
  ["D8", "upload", "Malformed Lambda / writeback"],
  ["E1", "achievements", "Build 3-day contiguous streak"],
  ["E2", "achievements", "Gap breaks streak blocks"],
  ["E3", "xp", "Streak XP award"],
  ["E4", "xp", "Streak XP rerun / repair"],
  ["E5", "achievements", "Daily streak refresh"],
  ["F1", "achievements", "Cross single threshold"],
  ["F2", "achievements", "Cross multiple thresholds same run"],
  ["F3", "achievements", "Milestone rerun"],
  ["F4", "xp", "Milestone XP via unlock"],
  ["G1", "achievements", "Eligible Perfect Week"],
  ["G2", "achievements", "Missing one required day"],
  ["G3", "achievements", "Create unlock"],
  ["G4", "achievements", "Unlock rerun"],
  ["G5", "xp", "Unlock → XP"],
  ["H1", "levels", "XP-only advance (no gate)"],
  ["H2", "levels", "Gate Blocked"],
  ["H3", "levels", "Gate clears"],
  ["H4", "levels", "Recalc mark from XP Event"],
  ["I1", "was", "WAS create from counted submission"],
  ["I2", "was", "WAS rerun"],
  ["I3", "was", "Goal + homework attach"],
  ["I4", "was", "Previous week helpers"],
  ["I5", "email", "Build weekly email package"],
  ["I6", "email", "Send weekly package (controlled)"],
  ["J1", "zoom", "Live attendance base XP"],
  ["J2", "zoom", "Live attendance bonuses"],
  ["J3", "zoom", "Attendance rerun"],
  ["J4", "zoom", "Zoom recording credit"],
  ["J5", "zoom", "Recording credit rerun"],
  ["J6", "email", "Recording approval email"],
  ["K1", "upload", "Valid uploaded writeback"],
  ["K2", "upload", "Invalid SHA-256"],
  ["K3", "was", "Missing enrollment/week on WAS"],
  ["K4", "daily-submission", "Blank Duplicate Key"],
  ["L1", "idempotency", "XP Source Key idempotency battery"],
  ["L2", "idempotency", "Unlock Source Key idempotency"],
  ["L3", "failure-injection", "Email send trigger resilience"],
  ["M1", "web", "/shoot loads"],
  ["M2", "web", "Airtable health"],
  ["M3", "web", "Leaderboard / homework catalog reads"],
];

function classify(id, domain) {
  if (OFFLINE.has(id)) return "OFFLINE_UNIT";
  if (id === "L3" || id.startsWith("D8") || id === "K2") return "FAILURE_INJECTION";
  if (EXECUTABLE.has(id)) return "READ_ONLY_PROD";
  if (domain === "web") return "CONTRACT";
  return "CONTROLLED_PROD_WRITE";
}

const scenarios = ROWS.map(([matrixId, domain, name]) => {
  const blockedBy486 = BLOCKED_486.has(matrixId);
  const implemented = EXECUTABLE.has(matrixId) || OFFLINE.has(matrixId) || matrixId === "SC006-WRITEBACK";
  const liveReady = EXECUTABLE.has(matrixId);
  const blockedByIdentity = !OFFLINE.has(matrixId) && domain !== "web";
  return {
    scenarioId: matrixId,
    matrixId,
    name,
    domain,
    classification: classify(matrixId, domain),
    implemented: implemented || blockedBy486,
    liveReady,
    requiresIdentity: domain !== "web" && !OFFLINE.has(matrixId),
    requiresEmail: EMAIL.has(matrixId),
    requiresUpload: domain === "upload" || ["C7", "D6", "K1"].includes(matrixId),
    requiresOperatorUI: ["A1", "A2", "C3", "I5"].includes(matrixId),
    blockedByIdentity,
    blockedBy486,
    blockedByEmailInstall: EMAIL.has(matrixId),
    owner: blockedBy486 ? "post-486" : EXECUTABLE.has(matrixId) ? "agent-2" : "wave-c",
    notes: blockedBy486
      ? "BLOCKED_BY_SC_STRUCTURED_HOMEWORK_FILES_001 until PR #486 merged"
      : blockedByIdentity
        ? "Blocked until IDENTITY_VERIFIED"
        : "",
    expectedSummary: { passCriteria: name },
  };
});

scenarios.push({
  scenarioId: "SC006-WRITEBACK",
  matrixId: "SC006-WRITEBACK",
  name: "Expected-vs-actual writeback policy off",
  domain: "expected-actual",
  classification: "READ_ONLY_PROD",
  implemented: true,
  liveReady: true,
  requiresIdentity: true,
  requiresEmail: false,
  requiresUpload: false,
  requiresOperatorUI: false,
  blockedByIdentity: true,
  blockedBy486: false,
  blockedByEmailInstall: false,
  owner: "agent-3",
  notes: "Writeback disabled per SC-006 decision",
  expectedSummary: { writebackEnabled: false },
});

const out = {
  registry_version: "1.0.0",
  generated_at: new Date().toISOString().slice(0, 10),
  source: "docs/V2_END_TO_END_TEST_MATRIX.md",
  total_matrix_rows: scenarios.length,
  scenarios,
};

writeFileSync(resolve(__dirname, "../scenarios.json"), JSON.stringify(out, null, 2));
console.log(`Wrote ${scenarios.length} scenarios`);
