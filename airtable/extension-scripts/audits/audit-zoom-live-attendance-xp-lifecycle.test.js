/**
 * Offline audit-contract checks for PKG-034.
 * Run: node airtable/extension-scripts/audits/audit-zoom-live-attendance-xp-lifecycle.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "audit-zoom-live-attendance-xp-lifecycle.js"),
  "utf8",
);

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("audit keeps recognized recording events out of live XP indexing", () => {
  assert.match(source, /type === "unsupported_recording"/);
  assert.match(source, /unsupported_recording_deferred/);
  assert.match(source, /type === "unsupported_recording"\) continue/);
});

test("audit covers cumulative bonus threshold and ownership contracts", () => {
  for (const issue of [
    "bonus_missing_canonical_event",
    "bonus_duplicate_canonical_key",
    "bonus_active_below_threshold",
    "bonus_inactive_threshold_met",
    "bonus_meeting_link_cardinality",
    "bonus_enrollment_link_ownership",
    "bonus_week_link_ownership",
    "bonus_was_link_ownership",
    "bonus_wrong_canonical_meeting",
    "bonus_wrong_points_or_rule",
    "bonus_wrong_source_or_rule",
    "bonus_wrong_source_or_bucket",
    "bonus_orphan_or_stolen_event",
  ]) {
    assert.match(source, new RegExp(`"${issue}"`), issue);
  }
  assert.match(source, /qualifyingMeetings\.length >= threshold/);
  assert.match(source, /canonicalBonusMeeting/);
  assert.match(source, /startFieldCandidates/);
  assert.match(source, /America\/Denver/);
});

test("audit remains read-only", () => {
  assert.strictEqual(source.includes("updateRecordAsync"), false);
  assert.strictEqual(source.includes("createRecordAsync"), false);
  assert.strictEqual(source.includes("deleteRecordAsync"), false);
});

console.log("\nAll PKG-034 audit-contract tests passed.");
