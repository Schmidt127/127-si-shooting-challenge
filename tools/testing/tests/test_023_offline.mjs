/**
 * Offline tests for Automation 023 v3.1 (Week → Program Instance enrollment match).
 * Run: node --test tools/testing/tests/test_023_offline.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import { build023Base, run023, IDS } from "./run_023_script.mjs";

function submissionEnrollment(base) {
  return base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Enrollment");
}

test("1) Week derives Program Instance and resolves one Enrollment", async () => {
  const base = build023Base({
    submissionCells: {
      Enrollment: null,
      Week: [{ id: IDS.WEEK_EARLY_BIRD, name: "Early Bird" }],
    },
  });

  const { output, error, console: cap } = await run023({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.recordId, IDS.SUBMISSION);
  assert.equal(output.values.athleteIdOut, IDS.ATHLETE);
  assert.equal(output.values.weekId, IDS.WEEK_EARLY_BIRD);
  assert.equal(output.values.resolvedProgramInstanceId, IDS.PI_CURRENT);
  assert.equal(output.values.programInstanceSource, "submission-week");
  assert.equal(output.values.matchedEnrollmentId, IDS.ENROLLMENT_CURRENT);
  assert.equal(output.values.matchModeOut, "athlete-program-instance");
  assert.equal(output.values.candidateCountOut, 1);
  assert.deepEqual(submissionEnrollment(base), [{ id: IDS.ENROLLMENT_CURRENT }]);

  const joined = cap.lines.join("\n");
  assert.match(joined, /submission-week/);
  assert.match(joined, /Week-derived Program Instance match|programInstanceSource/);
});

test("2) Historical Enrollment for the same Athlete is excluded", async () => {
  const base = build023Base({
    includeHistoricalActive: false,
    submissionCells: {
      Enrollment: null,
      Week: [{ id: IDS.WEEK_EARLY_BIRD, name: "Early Bird" }],
    },
  });

  const { output, error } = await run023({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.matchedEnrollmentId, IDS.ENROLLMENT_CURRENT);
  assert.notEqual(output.values.matchedEnrollmentId, IDS.ENROLLMENT_HISTORICAL);
  assert.equal(output.values.programInstanceSource, "submission-week");
});

test("3) Two Enrollment matches in the same Program Instance fail safely", async () => {
  const base = build023Base({
    submissionCells: {
      Enrollment: null,
      Week: [{ id: IDS.WEEK_EARLY_BIRD, name: "Early Bird" }],
    },
    extraEnrollments: [
      new MockRecord(IDS.ENROLLMENT_DUP_SAME_PI, {
        Athlete: [{ id: IDS.ATHLETE, name: "Testing Schmidt" }],
        "Active?": true,
        "Program Instance": [{ id: IDS.PI_CURRENT, name: "Current PI" }],
        "Enrollment Key": "DUP|SAME|PI",
        "School Year": "2026-2027",
      }),
    ],
  });

  const { output, error } = await run023({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "Skipped");
  assert.equal(output.values.matchModeOut, "ambiguous-athlete-program-instance");
  assert.equal(output.values.programInstanceSource, "submission-week");
  assert.equal(output.values.resolvedProgramInstanceId, IDS.PI_CURRENT);
  assert.equal(output.values.candidateCountOut, 2);
  assert.equal(output.values.matchedEnrollmentId, "");
  assert.equal(submissionEnrollment(base), null);
  assert.match(String(output.values.errorOut), /No fallback to another Program Instance/);
});

test("4) Week from another Program Instance does not select the current Enrollment", async () => {
  const base = build023Base({
    includeHistoricalActive: false,
    submissionCells: {
      Enrollment: null,
      Week: [{ id: IDS.WEEK_OTHER_PI, name: "Other PI Week" }],
    },
    extraEnrollments: [
      new MockRecord(IDS.ENROLLMENT_OTHER_PI, {
        Athlete: [{ id: IDS.ATHLETE, name: "Testing Schmidt" }],
        "Active?": true,
        "Program Instance": [{ id: IDS.PI_OTHER, name: "Prior PI" }],
        "Enrollment Key": "OTHER|PI|KEY",
        "School Year": "2025-2026",
      }),
    ],
  });

  const { output, error } = await run023({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.weekId, IDS.WEEK_OTHER_PI);
  assert.equal(output.values.resolvedProgramInstanceId, IDS.PI_OTHER);
  assert.equal(output.values.programInstanceSource, "submission-week");
  assert.equal(output.values.matchedEnrollmentId, IDS.ENROLLMENT_OTHER_PI);
  assert.notEqual(output.values.matchedEnrollmentId, IDS.ENROLLMENT_CURRENT);
});

test("4b) Week from another Program Instance with no matching Enrollment fails (does not pick current)", async () => {
  const base = build023Base({
    includeHistoricalActive: false,
    submissionCells: {
      Enrollment: null,
      Week: [{ id: IDS.WEEK_OTHER_PI, name: "Other PI Week" }],
    },
  });

  const { output, error } = await run023({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "Skipped");
  assert.equal(output.values.matchModeOut, "no-match-athlete-program-instance");
  assert.equal(output.values.programInstanceSource, "submission-week");
  assert.equal(output.values.resolvedProgramInstanceId, IDS.PI_OTHER);
  assert.equal(output.values.matchedEnrollmentId, "");
  assert.notEqual(submissionEnrollment(base)?.[0]?.id, IDS.ENROLLMENT_CURRENT);
});

test("5) Existing valid Enrollment remains unchanged (idempotent)", async () => {
  const base = build023Base({
    submissionCells: {
      Enrollment: [{ id: IDS.ENROLLMENT_CURRENT, name: "Current" }],
      Week: [{ id: IDS.WEEK_EARLY_BIRD, name: "Early Bird" }],
    },
  });

  const first = await run023({ base });
  assert.equal(first.error, null);
  assert.equal(first.output.values.statusOut, "Complete");
  assert.equal(first.output.values.matchModeOut, "existing-valid-enrollment");
  assert.equal(first.output.values.matchedEnrollmentId, IDS.ENROLLMENT_CURRENT);
  assert.equal(first.output.values.programInstanceSource, "existing-enrollment");
  assert.equal(base.getTable("Submissions").updates.length, 0);

  const second = await run023({ base });
  assert.equal(second.error, null);
  assert.equal(second.output.values.matchModeOut, "existing-valid-enrollment");
  assert.equal(second.output.values.matchedEnrollmentId, IDS.ENROLLMENT_CURRENT);
  assert.deepEqual(submissionEnrollment(base), [
    { id: IDS.ENROLLMENT_CURRENT, name: "Current" },
  ]);
  assert.equal(base.getTable("Submissions").updates.length, 0);
});

test("6) No Week or PI context with exactly one active Enrollment uses safe fallback", async () => {
  const base = build023Base({
    includeHistoricalActive: false,
    submissionCells: {
      Enrollment: null,
      Week: null,
    },
  });

  const { output, error } = await run023({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.matchModeOut, "single-active-enrollment-safe-fallback");
  assert.equal(output.values.programInstanceSource, "single-active-enrollment-safe-fallback");
  assert.equal(output.values.matchedEnrollmentId, IDS.ENROLLMENT_CURRENT);
  assert.equal(output.values.weekId, "");
  assert.equal(output.values.resolvedProgramInstanceId, IDS.PI_CURRENT);
});

test("7) No Week or PI context with multiple active Enrollments fails safely", async () => {
  const base = build023Base({
    includeHistoricalActive: true,
    submissionCells: {
      Enrollment: null,
      Week: null,
    },
  });

  const { output, error } = await run023({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "Skipped");
  assert.equal(output.values.matchModeOut, "ambiguous-multiple-active-enrollments");
  assert.equal(output.values.matchedEnrollmentId, "");
  assert.ok(output.values.candidateCountOut >= 2);
  assert.equal(submissionEnrollment(base), null);
});

test("version is v3.1 and script declares Week Program Instance path", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const scriptPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js"
  );
  const source = readFileSync(scriptPath, "utf8");
  assert.match(source, /Version:\s*v3\.1/);
  assert.match(source, /version:\s*"v3\.1"/);
  assert.match(source, /submission-week/);
  assert.match(source, /Submission\.Week → Weeks\.Program Instance/);
  assert.match(source, /programInstanceSource/);
  assert.match(source, /resolvedProgramInstanceId/);
});
