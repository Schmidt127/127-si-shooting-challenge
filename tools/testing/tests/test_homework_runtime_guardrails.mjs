import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const ACTIVE_RUNTIME_ROOTS = [
  "airtable/automations/shooting-challenge",
  "web/lib",
  "web/types",
  "tools/testing",
  "airtable/extension-scripts/audits",
  "airtable/extension-scripts/safe-backfills",
];

const EXCLUDE_DIR_NAMES = new Set(["_superseded", "_design-alternatives", "node_modules"]);
const EXCLUDE_FILE_PATTERNS = [
  /docs\/testing\/evidence\//,
  /airtable\/schema\/snapshots\//,
  /seed_pha_from_curriculum\.mjs$/,
];

const LIBRARY_WEEK_PATTERNS = [
  /CONFIG\.curriculum\.week/,
  /CONFIG\.homeworkLibrary\.week/,
  /getFirstLinkedId\([^)]*CONFIG\.curriculum\.week/,
  /getLinkedIds\([^)]*CONFIG\.curriculum\.week/,
  /getFirstLinkedId\([^)]*CONFIG\.homeworkLibrary\.week/,
  /getLinkedIds\([^)]*CONFIG\.homeworkLibrary\.week/,
];

const GUARDRAIL_EXCLUDE_FILES = new Set([
  "tools/testing/tests/test_homework_runtime_guardrails.mjs",
  "tools/testing/tests/test_homework_architecture_offline.mjs",
  "tools/testing/seed_pha_from_curriculum.mjs",
  "airtable/extension-scripts/safe-backfills/repair-final-090g-build-final-challenge-summary-email.js",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIR_NAMES.has(entry)) continue;
    const full = path.join(dir, entry);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (EXCLUDE_FILE_PATTERNS.some((re) => re.test(rel))) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|mjs|ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function activeRuntimeFiles() {
  const files = [];
  for (const relRoot of ACTIVE_RUNTIME_ROOTS) {
    const abs = path.join(ROOT, relRoot);
    try {
      walk(abs, files);
    } catch {
      // missing root is fine in partial checkouts
    }
  }
  return files;
}

test("no ACTIVE runtime file references FBC Curriculum - SYNC", () => {
  const offenders = [];
  for (const file of activeRuntimeFiles()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (GUARDRAIL_EXCLUDE_FILES.has(rel)) continue;
    const source = readFileSync(file, "utf8");
    if (source.includes("FBC Curriculum - SYNC")) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Active runtime files must use Homework Library table name:\n${offenders.join("\n")}`
  );
});

test("no ACTIVE runtime code reads Homework Library.Week for scheduling", () => {
  const offenders = [];
  for (const file of activeRuntimeFiles()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (GUARDRAIL_EXCLUDE_FILES.has(rel)) continue;
    const source = readFileSync(file, "utf8");
    const stripped = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    if (LIBRARY_WEEK_PATTERNS.some((re) => re.test(stripped))) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Active runtime must not read Homework Library.Week:\n${offenders.join("\n")}`
  );
});
