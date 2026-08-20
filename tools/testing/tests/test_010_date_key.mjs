/**
 * Focused dateKey / todayKey coverage for Automation 010.
 * Run: node --test tools/testing/tests/test_010_date_key.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build010Base, run010, IDS } from "./run_010_script.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js",
);

function loadDateHelpers() {
  const source = readFileSync(SCRIPT_PATH, "utf-8");
  const configMatch = source.match(/const CONFIG = \{[\s\S]*?\n\};/);
  const fromTextMatch = source.match(/function dateKeyFromText\(textValue\) \{[\s\S]*?\n\}/);
  const fromDateMatch = source.match(/function dateKeyFromDateObject\(value, timeZone = CONFIG\.timeZone\) \{[\s\S]*?\n\}/);
  const dateKeyMatch = source.match(/function dateKey\(value\) \{[\s\S]*?\n\}/);
  const todayKeyMatch = source.match(/function todayKey\(\) \{[\s\S]*?\n\}/);

  assert.ok(configMatch, "CONFIG block");
  assert.ok(fromTextMatch, "dateKeyFromText");
  assert.ok(fromDateMatch, "dateKeyFromDateObject");
  assert.ok(dateKeyMatch, "dateKey");
  assert.ok(todayKeyMatch, "todayKey");

  const factory = new Function(`
    ${configMatch[0]}
    ${fromTextMatch[0]}
    ${fromDateMatch[0]}
    ${dateKeyMatch[0]}
    ${todayKeyMatch[0]}
    return { dateKey, todayKey, CONFIG };
  `);
  return factory();
}

const { dateKey, todayKey, CONFIG } = loadDateHelpers();

test("dateKey keeps Airtable date-only midnight UTC on the entered calendar day", () => {
  // 2026-08-16 date-only is stored as midnight UTC; Denver conversion would
  // incorrectly yield 2026-08-15.
  assert.equal(dateKey(new Date("2026-08-16T00:00:00.000Z")), "2026-08-16");
});

test("dateKey still converts true datetimes in America/Denver", () => {
  // 2026-08-07 18:00 UTC is still 2026-08-07 in Denver (MDT, UTC-6).
  const denverDay = new Date("2026-08-07T18:00:00.000Z");
  assert.equal(dateKey(denverDay), "2026-08-07");

  // Late evening UTC that is still the prior calendar day in Denver.
  const lateUtcPriorDenverDay = new Date("2026-08-08T05:30:00.000Z");
  assert.equal(dateKey(lateUtcPriorDenverDay), "2026-08-07");
});

test("dateKey accepts ISO datetime strings", () => {
  assert.equal(dateKey("2026-08-07T18:00:00.000Z"), "2026-08-07");
  assert.equal(dateKey("2026-08-07"), "2026-08-07");
});

test("dateKey accepts MM/DD/YYYY local date strings", () => {
  assert.equal(dateKey("8/7/2026"), "2026-08-07");
  assert.equal(dateKey("08/07/2026"), "2026-08-07");
  assert.equal(dateKey("8-7-2026"), "2026-08-07");
});

test("dateKey returns empty for invalid or blank dates", () => {
  assert.equal(dateKey(""), "");
  assert.equal(dateKey(null), "");
  assert.equal(dateKey(undefined), "");
  assert.equal(dateKey("not-a-date"), "");
  assert.equal(dateKey(new Date("invalid")), "");
});

test("todayKey uses America/Denver and future Activity Dates skip as ineligible", async () => {
  assert.equal(CONFIG.timeZone, "America/Denver");
  const today = todayKey();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const expected = `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}-${parts.find((p) => p.type === "day").value}`;
  assert.equal(today, expected);

  const [y, m, d] = today.split("-").map(Number);
  const tomorrowUtc = new Date(Date.UTC(y, m - 1, d + 1, 18, 0, 0));
  const tomorrowKey = dateKey(tomorrowUtc);
  assert.ok(tomorrowKey > today, `tomorrow ${tomorrowKey} should be after today ${today}`);

  const weekStart = new Date(Date.UTC(y, m - 1, Math.max(1, d - 5), 18, 0, 0));
  const weekEnd = new Date(Date.UTC(y, m - 1, d + 10, 18, 0, 0));

  const base = build010Base({
    submissionCells: {
      "Activity Date": tomorrowUtc,
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });
  base.getTable("Weeks").records.get(IDS.WEEK).cells["Start Date"] = weekStart;
  base.getTable("Weeks").records.get(IDS.WEEK).cells["End Date"] = weekEnd;

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_ineligible");
  assert.equal(base.getTable("XP Events").records.size, 0);
});

test("Airtable Date Activity Date creates XP Event successfully", async () => {
  const activity = new Date("2026-08-07T18:00:00.000Z");
  const base = build010Base({
    submissionCells: {
      "Activity Date": activity,
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "created");
  assert.equal(base.getTable("XP Events").records.size, 1);
  assert.equal(output.values.submissionId, IDS.SUBMISSION);
});
