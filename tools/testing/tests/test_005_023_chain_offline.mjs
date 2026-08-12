import test from "node:test";
import assert from "node:assert/strict";
import { buildAndRun005After023 } from "./run_005_023_chain.mjs";
import { IDS } from "./run_023_script.mjs";

test("023 enrollment assignment enables 005 Early Bird date assignment without manual Week link", async () => {
  const { base, enrollmentRun, weekRun } = await buildAndRun005After023();

  assert.equal(enrollmentRun.output.values.statusOut, "Complete");
  assert.equal(enrollmentRun.output.values.matchedEnrollmentId, IDS.ENROLLMENT_CURRENT);
  assert.deepEqual(
    base.tables.get("Submissions").records.get(IDS.SUBMISSION).getCellValue("Enrollment"),
    [{ id: IDS.ENROLLMENT_CURRENT }]
  );

  assert.equal(weekRun.error, null, weekRun.error && weekRun.error.message);
  assert.equal(weekRun.output.values.statusOut, "Complete");
  assert.equal(weekRun.output.values.matchedWeekId, IDS.WEEK_EARLY_BIRD);
  assert.match(weekRun.output.values.sourceUsed, /Activity Date Fallback/);
  assert.deepEqual(
    base.tables.get("Submissions").records.get(IDS.SUBMISSION).getCellValue("Week"),
    [{ id: IDS.WEEK_EARLY_BIRD }]
  );
});

test("005 leaves Week empty when no Program Instance-scoped Week covers Activity Date", async () => {
  const { base, enrollmentRun, weekRun } = await buildAndRun005After023({
    activityDate: "2099-01-01",
  });

  assert.equal(enrollmentRun.output.values.statusOut, "Complete");
  assert.equal(weekRun.error, null, weekRun.error && weekRun.error.message);
  assert.equal(weekRun.output.values.statusOut, "Complete");
  assert.equal(weekRun.output.values.matchedWeekId ?? "", "");
  assert.match(
    weekRun.output.values.errorOut,
    /No Week found from Program Instance-scoped Activity Date/
  );
  assert.equal(
    base.tables.get("Submissions").records.get(IDS.SUBMISSION).getCellValue("Week"),
    null
  );
});
