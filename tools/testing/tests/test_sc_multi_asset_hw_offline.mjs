#!/usr/bin/env node
/**
 * Offline contract tests for SC-MULTI-ASSET-HW harness (no Airtable writes).
 *
 * Run: node tools/testing/tests/test_sc_multi_asset_hw_offline.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homeworkXpKey } from "../lib/sc-athlete-wf-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const HARNESS_PATH = resolve(ROOT, "tools/testing/sc-multi-asset-homework.mjs");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${err.message}`);
  }
}

const { APPLY_CHECK_IDS } = await import("../sc-multi-asset-homework.mjs");

test("homeworkXpKey matches live 065 Source Key pattern", () => {
  assert.equal(homeworkXpKey("recHcTest123"), "HOMEWORK_XP|recHcTest123");
});

test("APPLY_CHECK_IDS covers zero/multiple XP, wrong key, duplicate HC, slot isolation", () => {
  const ids = new Set(APPLY_CHECK_IDS);
  for (const required of [
    "065.xp_event_count",
    "065.xp_source_key_exact",
    "065.xp_wrong_homework_completion",
    "065.exactly_one_homework_xp",
    "065.idempotent_rerun",
    "hc.no_duplicate_for_enrollment_pha",
    "020.other_slot_separate_hc",
    "065.hw2_slot_no_premature_xp",
    "020.missing_assignment_fails_safe",
    "email.no_handoff_queue",
    "make.send_trigger_cleared",
  ]) {
    assert.ok(ids.has(required), `missing check id ${required}`);
  }
});

test("harness documents exact --apply command", () => {
  const src = readFileSync(HARNESS_PATH, "utf8");
  assert.match(src, /node tools\/testing\/sc-multi-asset-homework\.mjs --apply/);
  assert.match(src, /Never sends email/);
  assert.match(src, /HOMEWORK_XP\|\{hcId\}/);
});

test("harness LIVE fixture IDs match 2026-08-30 audit", () => {
  const src = readFileSync(HARNESS_PATH, "utf8");
  const libSrc = readFileSync(
    resolve(ROOT, "tools/testing/lib/sc-athlete-wf-lib.mjs"),
    "utf8"
  );
  for (const id of [
    "recBrZ1sV8byWEHZU",
    "recgj8dPk4ouTwCOj",
    "recXXZErbjxxGxWw2",
    "rechVLOeyEVIqmy2v",
    "rec6WmXjpLtIWDERo",
    "recIwx50zhNsUqV1L",
    "rec94yqw5w7tqtJgc",
  ]) {
    assert.match(src, new RegExp(id), `harness missing live id ${id}`);
  }
  assert.match(libSrc, /recNu6fcBpF1GG3u5/, "lib missing Testing3 enrollment id");
  assert.match(src, /GATED_ENROLLMENT_ID/, "harness must use GATED_ENROLLMENT_ID from lib");
});

test("harness field names match production schema (write paths)", () => {
  const src = readFileSync(HARNESS_PATH, "utf8");
  for (const field of [
    "Asset Label",
    "Asset Purpose",
    "Asset Slot",
    "Send to Make Trigger",
    "Homework Completions",
    "Program Homework Assignment",
    "Satisfactory?",
    "Review Complete",
    "Coach Feedback",
    "Source Key",
    "Homework Name 1",
    "Upload Status",
    "Upload Error",
    "Parent Feedback Ready?",
  ]) {
    assert.match(src, new RegExp(field.replace(/[?]/g, "\\?")), `missing field ${field}`);
  }
});

test("cleanup documents PAT DELETE limitations", () => {
  const src = readFileSync(HARNESS_PATH, "utf8");
  assert.match(src, /403 DELETE/);
  assert.match(src, /deactivated/);
  assert.match(src, /MCP/);
});

test("idempotency matrix homework-xp key matches harness", async () => {
  const { IDEMPOTENCY_PATHS } = await import("../sc-007-008/idempotency-matrix.js");
  const hwXp = IDEMPOTENCY_PATHS.find((p) => p.id === "homework-xp");
  assert.ok(hwXp);
  assert.match(hwXp.canonicalDedupeKey, /^HOMEWORK_XP\|/);
  assert.match(hwXp.firstRun, /HOMEWORK_XP\|/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
