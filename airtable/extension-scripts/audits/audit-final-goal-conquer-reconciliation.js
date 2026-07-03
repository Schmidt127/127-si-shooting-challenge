/*
Extension Script: Final Close-Out — Goal Met vs Conquered Goal
System: 127 SI Shooting Challenge
Purpose:
  Read-only reconciliation for active enrollments:
  - Goal Met? (live shot line vs target today)
  - Conquered Goal Award Recipient rows (manual gift-card log)
  Rule: full target is conquered once; recipient row is fulfillment truth.

PASS when summary shows:
  needManualRow: 0, trustExistingRow: 0, duplicateConqueredRows: 0
  (aligned count should match athletes who conquered goal)

Schema gate: 20260629_045741
Version: v1.0
Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-goal-conquer-reconciliation",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,
  tables: {
    enrollments: "Enrollments",
    awardRecipients: "Award Recipients",
    awards: "Awards",
    weeks: "Weeks",
  },
  enrollments: {
    active: "Active?",
    name: "Full Athlete Name",
    shots: "Total Shots Counted",
    target: "Target Goal Shots",
    goalMet: "Goal Met?",
    goalMetDate: "Goal Met Date",
  },
  recipients: {
    enrollment: "Enrollment",
    award: "Award",
    week: "Week",
    status: "Award Status",
    dateAwarded: "Date Awarded",
  },
  awards: {
    name: "Award Name",
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

function getText(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumberish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  const n = Number(typeof raw === "string" ? raw.replace(/,/g, "") : raw);
  return Number.isFinite(n) ? n : 0;
}

function getBooleanish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  if (raw === true || raw === 1) return true;
  const text = String(raw || "").trim().toLowerCase();
  return Boolean(text) && !["false", "0", "no"].includes(text);
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function pushSample(bucket, code, item) {
  if (!bucket[code]) bucket[code] = [];
  if (bucket[code].length < SAMPLE_LIMIT) bucket[code].push(item);
}

async function main() {
  setOutputSafe?.("debugStep", "load_awards");
  const awardsTable = base.getTable(CONFIG.tables.awards);
  const conqueredAwardIds = new Set();
  const awardQuery = await awardsTable.selectRecordsAsync({ fields: [CONFIG.awards.name] });
  for (const rec of awardQuery.records) {
    const name = getText(rec, awardsTable, CONFIG.awards.name).toLowerCase();
    if (name.includes("conquered goal")) conqueredAwardIds.add(rec.id);
  }

  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const weekLabelById = new Map();
  const weekQuery = await weeksTable.selectRecordsAsync({ fields: ["Week Name"] });
  for (const rec of weekQuery.records) {
    weekLabelById.set(
      rec.id,
      getText(rec, weeksTable, "Week Name") || ""
    );
  }

  setOutputSafe?.("debugStep", "load_recipients");
  const recipientsTable = base.getTable(CONFIG.tables.awardRecipients);
  const recipientQuery = await recipientsTable.selectRecordsAsync({
    fields: [
      CONFIG.recipients.enrollment,
      CONFIG.recipients.award,
      CONFIG.recipients.week,
      CONFIG.recipients.status,
      CONFIG.recipients.dateAwarded,
    ],
  });

  const conqueredByEnrollment = new Map();
  for (const rec of recipientQuery.records) {
    const awardId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.award);
    if (!conqueredAwardIds.has(awardId)) continue;
    const status = getText(rec, recipientsTable, CONFIG.recipients.status).toLowerCase();
    if (status === "cancelled") continue;
    const enrollmentId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.enrollment);
    if (!enrollmentId) continue;
    const weekId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.week);
    const row = {
      id: rec.id,
      week: weekLabelById.get(weekId) || "",
      status: getText(rec, recipientsTable, CONFIG.recipients.status),
      date: getText(rec, recipientsTable, CONFIG.recipients.dateAwarded).slice(0, 10),
    };
    if (!conqueredByEnrollment.has(enrollmentId)) conqueredByEnrollment.set(enrollmentId, []);
    conqueredByEnrollment.get(enrollmentId).push(row);
  }

  setOutputSafe?.("debugStep", "load_enrollments");
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [
      CONFIG.enrollments.active,
      CONFIG.enrollments.name,
      CONFIG.enrollments.shots,
      CONFIG.enrollments.target,
      CONFIG.enrollments.goalMet,
      CONFIG.enrollments.goalMetDate,
    ],
  });

  const needManualRow = [];
  const trustExistingRow = [];
  const aligned = [];
  let activeCount = 0;
  let goalMetToday = 0;

  for (const rec of enrollmentQuery.records) {
    if (!getBooleanish(rec, enrollmentsTable, CONFIG.enrollments.active)) continue;
    activeCount += 1;
    const enrollmentId = rec.id;
    const name = getText(rec, enrollmentsTable, CONFIG.enrollments.name) || enrollmentId;
    const shots = getNumberish(rec, enrollmentsTable, CONFIG.enrollments.shots);
    const target = getNumberish(rec, enrollmentsTable, CONFIG.enrollments.target);
    const goalMetNow = getBooleanish(rec, enrollmentsTable, CONFIG.enrollments.goalMet);
    const goalMetDate = getText(rec, enrollmentsTable, CONFIG.enrollments.goalMetDate);
    const conqueredRows = conqueredByEnrollment.get(enrollmentId) || [];

    if (goalMetNow) goalMetToday += 1;

    const entry = { enrollmentId, name, shots, target, goalMetDate, conqueredRows };

    if (goalMetNow && conqueredRows.length === 0) {
      needManualRow.push(entry);
    } else if (!goalMetNow && conqueredRows.length > 0) {
      trustExistingRow.push(entry);
    } else if (goalMetNow && conqueredRows.length > 0) {
      aligned.push(entry);
    }
  }

  const duplicateConqueredRows = [];
  for (const [enrollmentId, rows] of conqueredByEnrollment.entries()) {
    const seen = new Map();
    for (const row of rows) {
      const key = `${row.week}|${row.date}|${row.status}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(row.id);
    }
    for (const [key, ids] of seen.entries()) {
      if (ids.length <= 1) continue;
      duplicateConqueredRows.push({ enrollmentId, key, recordIds: ids });
    }
  }

  const pass =
    needManualRow.length === 0 &&
    trustExistingRow.length === 0 &&
    duplicateConqueredRows.length === 0;

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    pass,
    summary: {
      activeEnrollments: activeCount,
      goalMetToday,
      conqueredGoalRows: [...conqueredByEnrollment.values()].reduce((n, rows) => n + rows.length, 0),
      aligned: aligned.length,
      needManualRow: needManualRow.length,
      trustExistingRow: trustExistingRow.length,
      duplicateConqueredRows: duplicateConqueredRows.length,
    },
    needManualRowSample: needManualRow.slice(0, SAMPLE_LIMIT).map(e => ({
      name: e.name,
      shots: e.shots,
      target: e.target,
      enrollmentId: e.enrollmentId,
    })),
    trustExistingRowSample: trustExistingRow.slice(0, SAMPLE_LIMIT).map(e => ({
      name: e.name,
      shots: e.shots,
      target: e.target,
      conqueredRows: e.conqueredRows,
    })),
    alignedSample: aligned.slice(0, SAMPLE_LIMIT).map(e => ({
      name: e.name,
      shots: e.shots,
      target: e.target,
      conqueredRows: e.conqueredRows,
    })),
    duplicateConqueredRowsSample: duplicateConqueredRows.slice(0, SAMPLE_LIMIT),
    recommendedAction: pass
      ? "Goal Met / Conquered Goal cleanup is done."
      : "Create missing Conquered Goal rows or trust existing rows per samples; do not delete sent cards.",
  };

  setOutputSafe?.("statusOut", pass ? "success" : "skipped");
  setOutputSafe?.("debugStep", "done");
  console.log("===== FINAL GOAL CONQUER RECONCILIATION =====");
  console.log(JSON.stringify(report, null, 2));
}

function setOutputSafe(key, value) {
  try {
    if (typeof output !== "undefined" && output?.set) output.set(key, value);
  } catch {
    // optional
  }
}

try {
  await main();
} catch (err) {
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", String(err?.message || err));
  throw err;
}
