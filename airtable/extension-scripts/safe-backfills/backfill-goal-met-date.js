/*
Extension Script: Backfill Goal Met Date (SC-163)
System: 127 SI Shooting Challenge
Purpose:
  Dry-run / apply backfill for Enrollments.Goal Met Date using the first
  Activity Date where cumulative counted Submissions cross Target Goal Shots.

  Rules (same as Automation 122):
  - Blank until met
  - Write FIRST provable Activity Date only
  - Never invent
  - Never overwrite a non-empty existing Goal Met Date
  - Skip if Goal Met Date is still a lookup (not writable date)

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE = true to apply
  - BATCH_LIMIT = 25; re-run until remainingCount is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const DEBUG_ENROLLMENT_ID = "";

const CONFIG = {
  scriptName: "backfill-goal-met-date",
  version: "v1.0",
  timeZone: "America/Denver",

  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
  },

  enrollments: {
    active: "Active?",
    name: "Full Athlete Name",
    goalMet: "Goal Met?",
    goalMetDate: "Goal Met Date",
    targetGoalShots: "Target Goal Shots",
    totalShotsCounted: "Total Shots Counted",
  },

  submissions: {
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    totalShotsCounted: "Total Shots Counted",
    countThisSubmission: "Count This Submission?",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch (_err) {
    return false;
  }
}

function isWritableDateField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const field = table.getField(fieldName);
  if (field.isComputed) return false;
  const type = String(field.type || "");
  return type === "date" || type === "dateTime";
}

function getLinkedIds(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id).filter(Boolean);
}

function getText(record, fieldName) {
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (typeof value === "number") return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "number") return first;
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, fieldName, fallback = false) {
  const value = record.getCellValue(fieldName);
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "checked", "active"].includes(text);
}

function coerceDate(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getDateValue(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = coerceDate(item);
      if (parsed) return parsed;
    }
    return null;
  }
  return coerceDate(value);
}

function goalMetTruthy(record, fieldName) {
  const text = getText(record, fieldName);
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower !== "false" && lower !== "0" && lower !== "no";
}

function toDenverDateKey(value) {
  if (!value) return "";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function findFirstGoalMetCrossing(submissions, targetGoalShots) {
  const target = Number(targetGoalShots);
  if (!Number.isFinite(target) || target <= 0) return null;
  let runningTotal = 0;
  for (const submission of submissions) {
    const shots = Number(submission.totalShotsCounted) || 0;
    if (shots <= 0 || !(submission.activityDate instanceof Date)) continue;
    const beforeTotal = runningTotal;
    runningTotal += shots;
    if (beforeTotal < target && runningTotal >= target) {
      return {
        date: submission.activityDate,
        dateKey: toDenverDateKey(submission.activityDate),
        submissionId: submission.record.id,
        beforeTotal,
        afterTotal: runningTotal,
        submissionShots: shots,
      };
    }
  }
  return null;
}

output.clear();
output.markdown(`# ${CONFIG.scriptName} ${CONFIG.version}`);
output.markdown(`DRY_RUN=${DRY_RUN} CONFIRM_WRITE=${CONFIRM_WRITE} BATCH_LIMIT=${BATCH_LIMIT}`);

const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const submissionsTable = base.getTable(CONFIG.tables.submissions);

if (!isWritableDateField(enrollmentsTable, CONFIG.enrollments.goalMetDate)) {
  const field = enrollmentsTable.getField(CONFIG.enrollments.goalMetDate);
  output.markdown(
    `**Blocked:** Goal Met Date type is \`${field.type}\` (computed=${field.isComputed}). Convert lookup → **date** before backfill (see docs/deploy-checklists/SC-163-goal-met-date.md).`
  );
  throw new Error("Goal Met Date is not a writable date field.");
}

const [enrollmentQuery, submissionQuery] = await Promise.all([
  enrollmentsTable.selectRecordsAsync({
    fields: [
      CONFIG.enrollments.active,
      CONFIG.enrollments.name,
      CONFIG.enrollments.goalMet,
      CONFIG.enrollments.goalMetDate,
      CONFIG.enrollments.targetGoalShots,
      CONFIG.enrollments.totalShotsCounted,
    ].filter((name) => fieldExists(enrollmentsTable, name)),
  }),
  submissionsTable.selectRecordsAsync({
    fields: [
      CONFIG.submissions.enrollment,
      CONFIG.submissions.activityDate,
      CONFIG.submissions.totalShotsCounted,
      CONFIG.submissions.countThisSubmission,
    ],
  }),
]);

const byEnrollment = new Map();
for (const submission of submissionQuery.records) {
  const enrollmentIds = getLinkedIds(submission, CONFIG.submissions.enrollment);
  for (const eid of enrollmentIds) {
    if (!byEnrollment.has(eid)) byEnrollment.set(eid, []);
    byEnrollment.get(eid).push(submission);
  }
}

const planned = [];
const skipped = {
  inactive: 0,
  alreadySet: 0,
  notMet: 0,
  noTarget: 0,
  unprovable: 0,
};

for (const enrollment of enrollmentQuery.records) {
  if (DEBUG_ENROLLMENT_ID && enrollment.id !== DEBUG_ENROLLMENT_ID) continue;

  const active = fieldExists(enrollmentsTable, CONFIG.enrollments.active)
    ? getBooleanish(enrollment, CONFIG.enrollments.active, true)
    : true;
  if (!active) {
    skipped.inactive += 1;
    continue;
  }

  const existing = getDateValue(enrollment, CONFIG.enrollments.goalMetDate);
  if (existing) {
    skipped.alreadySet += 1;
    continue;
  }

  const target = getNumber(enrollment, CONFIG.enrollments.targetGoalShots);
  if (!target || target <= 0) {
    skipped.noTarget += 1;
    continue;
  }

  const reportedTotal = getNumber(enrollment, CONFIG.enrollments.totalShotsCounted);
  const goalMetNow =
    goalMetTruthy(enrollment, CONFIG.enrollments.goalMet) || reportedTotal >= target;
  if (!goalMetNow) {
    skipped.notMet += 1;
    continue;
  }

  const counted = (byEnrollment.get(enrollment.id) || [])
    .map((submission) => ({
      record: submission,
      activityDate: getDateValue(submission, CONFIG.submissions.activityDate),
      totalShotsCounted: getNumber(submission, CONFIG.submissions.totalShotsCounted),
      countThisSubmission: getBooleanish(
        submission,
        CONFIG.submissions.countThisSubmission,
        false
      ),
    }))
    .filter(
      (submission) =>
        submission.countThisSubmission &&
        submission.activityDate &&
        submission.totalShotsCounted > 0
    )
    .sort((a, b) => {
      const dateDiff = a.activityDate.getTime() - b.activityDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdA = a.record.createdTime ? new Date(a.record.createdTime).getTime() : 0;
      const createdB = b.record.createdTime ? new Date(b.record.createdTime).getTime() : 0;
      if (createdA !== createdB) return createdA - createdB;
      return a.record.id.localeCompare(b.record.id);
    });

  const crossing = findFirstGoalMetCrossing(counted, target);
  if (!crossing) {
    skipped.unprovable += 1;
    continue;
  }

  planned.push({
    enrollmentId: enrollment.id,
    name: getText(enrollment, CONFIG.enrollments.name) || enrollment.id,
    target,
    reportedTotal,
    dateKey: crossing.dateKey,
    date: crossing.date,
    submissionId: crossing.submissionId,
    beforeTotal: crossing.beforeTotal,
    afterTotal: crossing.afterTotal,
  });
}

const batch = planned.slice(0, BATCH_LIMIT);
const remainingCount = Math.max(0, planned.length - batch.length);

output.markdown("## Summary");
output.markdown(`- Planned writes: **${planned.length}**`);
output.markdown(`- This batch: **${batch.length}**`);
output.markdown(`- Remaining after batch: **${remainingCount}**`);
output.markdown(
  `- Skipped: alreadySet=${skipped.alreadySet}, notMet=${skipped.notMet}, noTarget=${skipped.noTarget}, unprovable=${skipped.unprovable}, inactive=${skipped.inactive}`
);

if (batch.length === 0) {
  output.markdown("_No rows to write._");
} else {
  output.markdown("## Batch");
  output.markdown(
    [
      "| Athlete | Enrollment | Date | Crossing Submission | Before→After | Target |",
      "| --- | --- | --- | --- | --- | --- |",
      ...batch.map(
        (row) =>
          `| ${row.name} | ${row.enrollmentId} | ${row.dateKey} | ${row.submissionId} | ${row.beforeTotal}→${row.afterTotal} | ${row.target} |`
      ),
    ].join("\n")
  );
}

let wrote = 0;
if (!DRY_RUN && CONFIRM_WRITE && batch.length > 0) {
  for (const row of batch) {
    await enrollmentsTable.updateRecordAsync(row.enrollmentId, {
      [CONFIG.enrollments.goalMetDate]: row.date,
    });
    wrote += 1;
  }
  output.markdown(`## Applied writes: **${wrote}**`);
} else {
  output.markdown("## No writes applied (dry-run or CONFIRM_WRITE=false).");
}

console.log(
  JSON.stringify({
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    planned: planned.length,
    batch: batch.length,
    remainingCount,
    wrote,
    skipped,
  })
);
