/*
Extension Script: Repair Kimm / Lyle — Restore Excluded Submissions (Benefit of Doubt)
System: 127 SI Shooting Challenge
Purpose:
  Close-out decision (C-001): treat two Lyle Kimm excluded duplicate submissions as real
  sessions — set Duplicate Review Status = Count It so rollups and 010 XP can apply.

  Submissions (Lyle enrollment rec83ku1pTHmPNwRo):
    - rec8dui4l30DYGUgx — 2026-05-07, 140 shots (was Exclude It)
    - recBI4Np85t5X9Z8u — 2026-05-19, 200 shots (was Exclude It)

  Expected after restore: +340 shots on enrollment; +40 XP (2 × 20 SHOOTING_BASE) if XP missing.

Safety:
  - DRY_RUN defaults to true
  - Set DRY_RUN = false and CONFIRM_WRITE = true to apply
  - Only writes Duplicate Review Status when currently Exclude It
  - Does not delete sibling counted rows

After this script:
  1. Wait for Automation 010 on each submission (or run backfill-submission-xp-events.js)
  2. Confirm Enrollment Run Shot Milestone Check? re-arms from 010
  3. Re-run audit-final-090a and audit-final-090e
  4. Run close-out 090 pass

See: docs/close-out-considerations.md C-001
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGET_SUBMISSIONS = [
  {
    submissionId: "rec8dui4l30DYGUgx",
    label: "Lyle Kimm 2026-05-07 (140 shots)",
    enrollmentId: "rec83ku1pTHmPNwRo",
  },
  {
    submissionId: "recBI4Np85t5X9Z8u",
    label: "Lyle Kimm 2026-05-19 (200 shots)",
    enrollmentId: "rec83ku1pTHmPNwRo",
  },
];

const CONFIG = {
  scriptName: "repair-kimm-lyle-restore-excluded-submissions",
  version: "v1.0",

  tables: {
    submissions: "Submissions",
    enrollments: "Enrollments",
  },

  submissions: {
    enrollment: "Enrollment",
    duplicateReviewStatus: "Duplicate Review Status",
    countThisSubmission: "Count This Submission?",
    totalShotsCounted: "Total Shots Counted",
    activityDate: "Activity Date",
    xpEvents: "XP Events",
    xpAwardStatus: "XP Award Status",
  },

  enrollments: {
    fullName: "Full Athlete Name",
    totalShotsCounted: "Total Shots Counted",
    lifetimeXpEarned: "Lifetime XP Earned",
  },

  values: {
    countIt: "Count It",
    excludeIt: "Exclude It",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  try {
    return table.getField(fieldName).isComputed !== true;
  } catch {
    return false;
  }
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  if (raw && typeof raw === "object" && raw.name) return String(raw.name);
  return getText(record, table, fieldName);
}

function choiceCell(table, fieldName, choiceName) {
  if (!isWritableField(table, fieldName)) return null;
  return { name: choiceName };
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const submissionFields = [
    CONFIG.submissions.enrollment,
    CONFIG.submissions.duplicateReviewStatus,
    CONFIG.submissions.countThisSubmission,
    CONFIG.submissions.totalShotsCounted,
    CONFIG.submissions.activityDate,
    CONFIG.submissions.xpEvents,
    CONFIG.submissions.xpAwardStatus,
  ].filter(name => fieldExists(submissionsTable, name));

  const plans = [];

  for (const target of TARGET_SUBMISSIONS) {
    const submission = await submissionsTable.selectRecordAsync(
      target.submissionId,
      { fields: submissionFields }
    );

    if (!submission) {
      plans.push({
        ...target,
        action: "error",
        error: "Submission not found",
      });
      continue;
    }

    const status = getSelectName(
      submission,
      submissionsTable,
      CONFIG.submissions.duplicateReviewStatus
    );
    const countThis = getNumberish(
      submission,
      submissionsTable,
      CONFIG.submissions.countThisSubmission
    );
    const shots = getNumberish(
      submission,
      submissionsTable,
      CONFIG.submissions.totalShotsCounted
    );
    const xpEventCount = fieldExists(submissionsTable, CONFIG.submissions.xpEvents)
      ? (submission.getCellValue(CONFIG.submissions.xpEvents) || []).length
      : 0;

    let action = "skip";
    let writeFields = null;

    if (status === CONFIG.values.countIt || countThis === 1) {
      action = "already_counted";
    } else if (status === CONFIG.values.excludeIt) {
      action = "set_count_it";
      writeFields = {
        [CONFIG.submissions.duplicateReviewStatus]: choiceCell(
          submissionsTable,
          CONFIG.submissions.duplicateReviewStatus,
          CONFIG.values.countIt
        ),
      };
    } else {
      action = "manual_review_unexpected_status";
    }

    plans.push({
      ...target,
      action,
      duplicateReviewStatus: status,
      countThisSubmission: countThis,
      totalShotsCounted: shots,
      xpEventLinkCount: xpEventCount,
      xpAwardStatus: getSelectName(
        submission,
        submissionsTable,
        CONFIG.submissions.xpAwardStatus
      ),
      activityDate: getText(submission, submissionsTable, CONFIG.submissions.activityDate),
      writeFields,
    });
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, confirmWrite: CONFIRM_WRITE, plans }, null, 2));

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nDRY RUN — no writes.");
    console.log("Set DRY_RUN = false and CONFIRM_WRITE = true to apply Count It.");
    console.log("\nThen: backfill-submission-xp-events.js (or wait for 010); re-run 090A + 090E.");
    return;
  }

  const applied = [];

  for (const plan of plans) {
    if (plan.action !== "set_count_it" || !plan.writeFields) continue;
    await submissionsTable.updateRecordAsync(plan.submissionId, plan.writeFields);
    applied.push({
      submissionId: plan.submissionId,
      label: plan.label,
      shots: plan.totalShotsCounted,
    });
  }

  const enrollmentId = TARGET_SUBMISSIONS[0].enrollmentId;
  let enrollmentAfter = null;

  if (fieldExists(enrollmentsTable, CONFIG.enrollments.totalShotsCounted)) {
    const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, {
      fields: [
        CONFIG.enrollments.fullName,
        CONFIG.enrollments.totalShotsCounted,
        CONFIG.enrollments.lifetimeXpEarned,
      ].filter(name => fieldExists(enrollmentsTable, name)),
    });

    if (enrollment) {
      enrollmentAfter = {
        enrollmentId,
        name: getText(enrollment, enrollmentsTable, CONFIG.enrollments.fullName),
        totalShotsCounted: getNumberish(
          enrollment,
          enrollmentsTable,
          CONFIG.enrollments.totalShotsCounted
        ),
        lifetimeXpEarned: getNumberish(
          enrollment,
          enrollmentsTable,
          CONFIG.enrollments.lifetimeXpEarned
        ),
      };
    }
  }

  console.log("\nApplied Count It:");
  console.log(JSON.stringify(applied, null, 2));
  console.log("\nEnrollment snapshot (rollups may lag a few seconds):");
  console.log(JSON.stringify(enrollmentAfter, null, 2));
  console.log("\nNext: run backfill-submission-xp-events.js if XP Award Status still not Awarded.");
}

await main();
