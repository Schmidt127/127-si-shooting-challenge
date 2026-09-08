const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source065 = fs.readFileSync(
  path.join(root, "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"),
  "utf8",
);
const submit = fs.readFileSync(
  path.join(root, "web/lib/curriculum/submit-service.ts"),
  "utf8",
);

assert.match(source065, /version:\s*"v10\.8"/);
assert.doesNotMatch(source065, /At least one Submission link is required/);
assert.doesNotMatch(source065, /New Homework XP requires exactly one canonical Submission/);
assert.match(source065, /Homework Completion may link at most one Submission/);
assert.match(source065, /sameIds\(eventSubmissionIds, ctx\.subs\)/);
assert.match(source065, /xpEvent \? linkedIds\(xpEvent, xpEventsTable, CONFIG\.xpEvents\.submission\) : submissionIds/);

assert.match(submit, /ensureCanonicalWeeklySummaryForCurriculum/);
assert.match(submit, /tableName:\s*TABLES\.weeklySummary\.name/);
assert.match(submit, /"Weekly Athlete Summary Link": \[weeklySummaryId\]/);
assert.match(submit, /fields:\s*\{ Enrollment: \[input\.enrollmentId\], Week: \[input\.weekId\] \}/);
assert.doesNotMatch(submit, /tableName:\s*TABLES\.submissions\.name/);

console.log("065 Structured Curriculum HC-only XP contract: PASS");
