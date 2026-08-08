#!/usr/bin/env node
/**
 * Active automation unloadData runtime compatibility pack.
 * Covers deployed/canonical scripts: 031, 035, 042, 057, 114, 118, 119
 *
 * Corrected 2026-08-05: PROD Automation 117 is the recording-approval email handoff
 * (no queries / no unloadData). The Stage 17 orchestrator and modular 117a/117c are
 * design alternatives under `_design-alternatives/` — not active paste targets.
 *
 * Run: node tests/airtable-runtime/active-automation-unload-compat.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "../..");
const AUTO_DIR = path.join(ROOT, "airtable/automations/shooting-challenge");

const TARGETS = [
  {
    num: "031",
    file: "031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js",
    versionRe: /Version:\s*v3\.5/,
    queryVars: ["xpQuery"],
  },
  {
    num: "035",
    file: "035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js",
    versionRe: /Version:\s*v1\.3/,
    queryVars: ["recheck", "rulesQuery", "xpQuery"],
  },
  {
    num: "042",
    file: "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js",
    versionRe: /Version:\s*3\.2/,
    queryVars: ["zmQuery", "zaQuery"],
  },
  {
    num: "057",
    file: "057-achievements-and-milestones-calculate-perfect-week-eligibility.js",
    versionRe: /Version:\s*1\.5/,
    queryVars: ["zaQuery"],
  },
  {
    num: "114",
    file: "114-video-review-and-xp-create-or-update-video-xp-event.js",
    versionRe: /Version:\s*v5\.9/,
    queryVars: ["xpQuery"],
  },
  {
    num: "118",
    file: "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js",
    versionRe: /Version:\s*v1\.7/,
    queryVars: ["enrollmentsQuery", "weeksQuery", "wasQuery"],
  },
  {
    num: "119",
    file: "119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js",
    versionRe: /Version:\s*v1\.7/,
    queryVars: ["enrQuery", "weeksQuery", "wasQuery"],
  },
];

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL - ${name}`);
    console.error(`  ${error && error.stack ? error.stack : error}`);
  }
}

/** Mirrors unloadQuerySafe used in automations. */
function unloadQuerySafe(queryResult, logFn = () => {}) {
  if (typeof queryResult?.unloadData === "function") {
    try {
      queryResult.unloadData();
    } catch (error) {
      logFn("Query unloadData skipped/failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function matchThenCleanup(queryResult, matchFn) {
  let matchError = null;
  let result = null;
  try {
    result = matchFn();
  } catch (error) {
    matchError = error;
  } finally {
    unloadQuerySafe(queryResult);
  }
  if (matchError) throw matchError;
  return result;
}

function stripUnloadHelper(source) {
  return source.replace(
    /function unloadQuerySafe\([\s\S]*?\n\}/,
    "/* unloadQuerySafe omitted for bare-call scan */"
  );
}

function findBareUnloadCalls(source) {
  const withoutHelper = stripUnloadHelper(source);
  return withoutHelper.match(/^\s*[A-Za-z0-9_]+\.unloadData\(\);/gm) || [];
}

test("shared unloadQuerySafe calls unloadData when present", () => {
  let calls = 0;
  unloadQuerySafe({ unloadData: () => { calls += 1; } });
  assert.strictEqual(calls, 1);
});

test("shared unloadQuerySafe no-ops when unloadData missing", () => {
  assert.doesNotThrow(() => unloadQuerySafe({ records: [] }));
  assert.doesNotThrow(() => unloadQuerySafe(null));
  assert.doesNotThrow(() => unloadQuerySafe(undefined));
});

test("shared unloadQuerySafe swallows unloadData throw as non-fatal", () => {
  const logs = [];
  assert.doesNotThrow(() =>
    unloadQuerySafe(
      {
        unloadData: () => {
          throw new Error("boom");
        },
      },
      (msg) => logs.push(msg)
    )
  );
  assert.ok(logs.length >= 1);
});

test("cleanup cannot mask a simulated business error", () => {
  let unloadCalls = 0;
  assert.throws(
    () =>
      matchThenCleanup(
        {
          unloadData: () => {
            unloadCalls += 1;
            throw new Error("cleanup boom");
          },
        },
        () => {
          throw new Error("REAL_BUSINESS_ERROR");
        }
      ),
    /REAL_BUSINESS_ERROR/
  );
  assert.strictEqual(unloadCalls, 1);
});

test("helper does not call unloadData more than once for the same cleanup path", () => {
  let calls = 0;
  const q = {
    unloadData: () => {
      calls += 1;
    },
  };
  matchThenCleanup(q, () => "ok");
  assert.strictEqual(calls, 1);
});

for (const target of TARGETS) {
  const scriptPath = path.join(AUTO_DIR, target.file);
  const source = fs.readFileSync(scriptPath, "utf8");

  test(`${target.num} exists and declares patched version`, () => {
    assert.ok(fs.existsSync(scriptPath), target.file);
    assert.match(source, target.versionRe);
    assert.match(source, /2026-08-05|2026-08-06|2026-08-07/);
    assert.match(source, /unloadData|unloadQuerySafe/);
  });

  test(`${target.num} has unloadQuerySafe helper`, () => {
    assert.match(source, /function unloadQuerySafe\(/);
    assert.match(source, /typeof queryResult\?\.unloadData === "function"/);
  });

  test(`${target.num} has no bare .unloadData() outside helper`, () => {
    const bare = findBareUnloadCalls(source);
    assert.deepStrictEqual(bare, [], `Unexpected bare calls: ${bare.join(", ")}`);
  });

  test(`${target.num} cleans owned query vars via unloadQuerySafe`, () => {
    for (const qv of target.queryVars) {
      assert.match(
        source,
        new RegExp(`unloadQuerySafe\\(\\s*${qv}\\s*\\)`),
        `missing unloadQuerySafe(${qv})`
      );
    }
  });

  test(`${target.num} uses finally for at least one query cleanup`, () => {
    assert.match(source, /finally\s*\{[\s\S]*?unloadQuerySafe\(/);
  });

  test(`${target.num} parses with node --check`, () => {
    const result = spawnSync(process.execPath, ["--check", scriptPath], {
      encoding: "utf8",
    });
    if (result.status === 0) return;
    const err = `${result.stderr || ""}${result.stdout || ""}`;
    // Airtable automation runtime allows top-level await; Node CJS --check does not.
    assert.ok(
      /await is only valid in async functions/.test(err),
      err || "node --check failed"
    );
  });
}

test("active shooting-challenge tree has no bare unloadData outside helpers/superseded/design-alts", () => {
  const files = fs
    .readdirSync(AUTO_DIR)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"));
  const offenders = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(AUTO_DIR, file), "utf8");
    const bare = findBareUnloadCalls(source);
    for (const line of bare) {
      offenders.push(`${file}: ${line.trim()}`);
    }
  }
  assert.deepStrictEqual(offenders, [], offenders.join("\n"));
});

test("PROD Automation 117 email script has no unloadData concern", () => {
  const email = path.join(AUTO_DIR, "117-zoom-send-recording-approval-email-to-make.js");
  assert.ok(fs.existsSync(email));
  const source = fs.readFileSync(email, "utf8");
  assert.doesNotMatch(source, /selectRecordsAsync/);
  assert.doesNotMatch(source, /\.unloadData\(/);
  assert.match(source, /automationNumber:\s*"117f"/);
});

test("stage17 modular unloadData scripts are design-alternatives only (not paste targets)", () => {
  const design = path.join(AUTO_DIR, "_design-alternatives/stage17-modular-reference");
  assert.ok(fs.existsSync(path.join(design, "117-zoom-recording-credit-orchestrator.js")));
  assert.ok(!fs.existsSync(path.join(AUTO_DIR, "117-zoom-recording-credit-orchestrator.js")));
});

test("superseded unloadData occurrences remain excluded from this package", () => {
  const superseded = path.join(
    AUTO_DIR,
    "_superseded/117a-s16-homework-completions-award-xp-SUPERSEDED.js"
  );
  assert.ok(fs.existsSync(superseded));
  const source = fs.readFileSync(superseded, "utf8");
  assert.match(source, /\.unloadData\(/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
