/**
 * Focused date-key coverage for Automation 005 week assignment.
 * Run: node --test tools/testing/tests/test_005_date_key.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js",
);

function loadHelpers() {
  const source = readFileSync(SCRIPT_PATH, "utf-8");
  const configMatch = source.match(/const CONFIG = \{[\s\S]*?\n\};/);
  const fromTextMatch = source.match(/function dateKeyFromText\(textValue\) \{[\s\S]*?\n\}/);
  const fromDateMatch = source.match(/function dateKeyFromDate\(value\) \{[\s\S]*?\n\}/);

  assert.ok(configMatch, "CONFIG");
  assert.ok(fromTextMatch, "dateKeyFromText");
  assert.ok(fromDateMatch, "dateKeyFromDate");

  const factory = new Function(`
    ${configMatch[0]}
    ${fromTextMatch[0]}
    ${fromDateMatch[0]}
    return { dateKeyFromText, dateKeyFromDate, CONFIG };
  `);
  return factory();
}

const { dateKeyFromDate, dateKeyFromText, CONFIG } = loadHelpers();

test("005 keeps midnight-UTC date-only Activity Date on the entered calendar day", () => {
  assert.equal(CONFIG.timeZone, "America/Denver");
  assert.equal(dateKeyFromDate(new Date("2026-08-16T00:00:00.000Z")), "2026-08-16");
});

test("005 still converts true datetimes in America/Denver", () => {
  assert.equal(dateKeyFromDate(new Date("2026-08-08T05:30:00.000Z")), "2026-08-07");
  assert.equal(dateKeyFromDate(new Date("2026-08-16T23:34:00.000Z")), "2026-08-16");
});

test("005 text path preserves YYYY-MM-DD and local dates", () => {
  assert.equal(dateKeyFromText("2026-08-16"), "2026-08-16");
  assert.equal(dateKeyFromText("8/16/2026"), "2026-08-16");
});
