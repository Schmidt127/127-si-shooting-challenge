/**
 * Tests the REAL date/scheduler helpers inside automations 118 and 119 by
 * extracting them from source (no mirrored copies — what is tested is what gets
 * pasted into Airtable).
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..");
const FILES = {
  118: "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js",
  119: "119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js",
};

function extractFunctions(scriptText) {
  const names = [
    "denverDateParts",
    "priorSaturdayKeyDenver",
    "dateKeyFromCell",
    "latestCompletedChallengeEndKey",
  ];
  const chunks = [];
  for (const name of names) {
    const start = scriptText.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `function ${name} not found`);
    let depth = 0;
    let end = -1;
    for (let i = scriptText.indexOf("{", start); i < scriptText.length; i += 1) {
      const ch = scriptText[i];
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    assert.ok(end > start, `could not bracket ${name}`);
    chunks.push(scriptText.slice(start, end));
  }
  const factory = new Function(
    "CONFIG",
    `${chunks.join("\n")}\nreturn { denverDateParts, priorSaturdayKeyDenver, dateKeyFromCell, latestCompletedChallengeEndKey };`
  );
  return factory({ timeZone: "America/Denver" });
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.message ? error.message : error}`);
  }
}

for (const [num, file] of Object.entries(FILES)) {
  const text = fs.readFileSync(path.join(DIR, file), "utf8");
  const { priorSaturdayKeyDenver, dateKeyFromCell, latestCompletedChallengeEndKey } = extractFunctions(text);

  test(`${num}: PROD Weeks End Date (Sat 23:59 Denver = Sun 05:59 UTC) maps to Saturday`, () => {
    assert.strictEqual(dateKeyFromCell("2026-06-07T05:59:00.000Z"), "2026-06-06");
  });

  test(`${num}: winter (MST, UTC-7) datetime also maps to Denver date`, () => {
    assert.strictEqual(dateKeyFromCell("2026-01-11T06:59:00.000Z"), "2026-01-10");
  });

  test(`${num}: date-only strings pass through unchanged`, () => {
    assert.strictEqual(dateKeyFromCell("2026-06-06"), "2026-06-06");
  });

  test(`${num}: blank/invalid values return empty`, () => {
    assert.strictEqual(dateKeyFromCell(""), "");
    assert.strictEqual(dateKeyFromCell(null), "");
    assert.strictEqual(dateKeyFromCell("not-a-date"), "");
  });

  test(`${num}: legacy prior-Saturday helper remains Denver-correct`, () => {
    const sundayRun = new Date("2026-07-12T11:00:00.000Z");
    assert.strictEqual(priorSaturdayKeyDenver(sundayRun), "2026-07-11");
  });

  test(`${num}: latest completed helper preserves ordinary Saturday-ended weekly behavior`, () => {
    assert.strictEqual(
      latestCompletedChallengeEndKey(["2026-07-04", "2026-07-11", "2026-07-18"], "2026-07-12"),
      "2026-07-11"
    );
  });

  test(`${num}: SC-121 July 4 run selects partial Week 9 ending June 30`, () => {
    // Post-Challenge Jul 3 is excluded by the caller before these eligible
    // challenge end keys reach the pure helper.
    assert.strictEqual(
      latestCompletedChallengeEndKey(["2027-06-26", "2027-06-30"], "2027-07-04"),
      "2027-06-30"
    );
  });

  test(`${num}: a Week ending today is still in progress and is not selected`, () => {
    assert.strictEqual(
      latestCompletedChallengeEndKey(["2027-06-26", "2027-06-30"], "2027-06-30"),
      "2027-06-26"
    );
  });

  test(`${num}: scheduler source excludes Post-Challenge before selecting latest completed end`, () => {
    assert.ok(text.includes("weekIsActive(w) && !isPostChallengeWeek(w)"));
    assert.ok(text.includes("latestCompletedChallengeEndKey(eligibleEndKeys, todayKey)"));
    assert.ok(/post\[\\s_-\]\*challenge/i.test(text));
  });
}

console.log("");
console.log(`Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
