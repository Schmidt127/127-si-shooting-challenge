/**
 * Tests the REAL dateKeyFromCell / priorSaturdayKeyDenver functions inside
 * automations 118 and 119 by extracting them from the script source (no
 * mirrored copies — what is tested is what gets pasted into Airtable).
 *
 * Run: node airtable/automations/shooting-challenge/lib/118-119-week-key.test.js
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
  const names = ["denverDateParts", "priorSaturdayKeyDenver", "dateKeyFromCell"];
  const chunks = [];
  for (const name of names) {
    const start = scriptText.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `function ${name} not found`);
    // Walk braces to find the end of the function body.
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
    `${chunks.join("\n")}\nreturn { denverDateParts, priorSaturdayKeyDenver, dateKeyFromCell };`
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
  const { priorSaturdayKeyDenver, dateKeyFromCell } = extractFunctions(text);

  test(`${num}: PROD Weeks End Date (Sat 23:59 Denver = Sun 05:59 UTC) maps to Saturday`, () => {
    // Live PROD example: Week 6 End Date 2026-06-07T05:59:00.000Z
    // is Saturday 2026-06-06 23:59 in Denver (MDT, UTC-6).
    assert.strictEqual(dateKeyFromCell("2026-06-07T05:59:00.000Z"), "2026-06-06");
  });

  test(`${num}: winter (MST, UTC-7) datetime also maps to Denver date`, () => {
    // 2026-01-11T06:59:00Z = 2026-01-10 23:59 MST
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

  test(`${num}: Sunday run targets yesterday Saturday`, () => {
    // Sunday 2026-07-12 05:00 Denver = 11:00 UTC
    const sundayRun = new Date("2026-07-12T11:00:00.000Z");
    assert.strictEqual(priorSaturdayKeyDenver(sundayRun), "2026-07-11");
  });

  test(`${num}: Monday manual rerun targets the same prior Saturday`, () => {
    const mondayRun = new Date("2026-07-13T15:00:00.000Z");
    assert.strictEqual(priorSaturdayKeyDenver(mondayRun), "2026-07-11");
  });

  test(`${num}: Saturday run targets the PREVIOUS Saturday (week in progress)`, () => {
    const saturdayRun = new Date("2026-07-11T15:00:00.000Z");
    assert.strictEqual(priorSaturdayKeyDenver(saturdayRun), "2026-07-04");
  });

  test(`${num}: scheduler + week end key line up (defect regression)`, () => {
    // The v1.1 defect: UTC parsing turned Sat-23:59-Denver week ends into
    // Sunday keys so the Sunday scheduler never matched any week.
    const sundayRun = new Date("2026-06-14T11:00:00.000Z"); // Sunday June 14
    const target = priorSaturdayKeyDenver(sundayRun); // 2026-06-13
    const weekEnd = dateKeyFromCell("2026-06-14T05:59:00.000Z"); // Sat Jun 13 Denver
    assert.strictEqual(target, weekEnd);
  });
}

console.log("");
console.log(`Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
