/*
Extension Script: Final Close-Out — Award Recipients vs June 29 Snapshot
System: 127 SI Shooting Challenge

HOW TO RUN IN AIRTABLE:
  1. Open Scripting extension in the Shooting Challenge base.
  2. Paste ALL of audit-final-award-recipients-closeout.js (one file).
  3. Run. Copy the JSON output.

PASS when summary shows:
  wrongAwardLinked: 0, manualReviewNeeded: 0, duplicateGroups: 0

Schema gate: 20260629_045741
Version: v1.1 (logic source — regenerate bundled file after edits)
Default: read-only (no writes)
*/

// @ts-nocheck

// --- GENERATOR INSERTS JUNE29_SNAPSHOT_ROWS HERE ---

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-award-recipients-closeout",
  version: "v1.1",
  schemaSnapshot: SCHEMA_SNAPSHOT,
  tables: {
    awardRecipients: "Award Recipients",
    awards: "Awards",
    weeks: "Weeks",
  },
  recipients: {
    enrollment: "Enrollment",
    award: "Award",
    week: "Week",
    status: "Award Status",
    dateAwarded: "Date Awarded",
    uniqueKey: "Award Recipient Unique Key",
    enrollmentLookup: "Enrollment Name Lookup",
    athleteDisplay: "Athlete Name - Display",
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

function getLinkedIds(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function weekNum(label) {
  const m = String(label || "").match(/\d+/);
  return m ? m[0] : normalizeText(label);
}

function dateKey(value) {
  const text = String(value || "");
  let m = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const y = m[3];
    const mo = String(m[1]).padStart(2, "0");
    const d = String(m[2]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return normalizeText(text).slice(0, 10);
}

function identityKey(enrollment, weekLabel, dateAwarded) {
  return `${normalizeText(enrollment)}|${weekNum(weekLabel)}|${dateKey(dateAwarded)}`;
}

function pushSample(bucket, code, item) {
  if (!bucket[code]) bucket[code] = [];
  if (bucket[code].length < SAMPLE_LIMIT) bucket[code].push(item);
}

async function main() {
  setOutputSafe?.("debugStep", "load_tables");
  const recipientsTable = base.getTable(CONFIG.tables.awardRecipients);
  const awardsTable = base.getTable(CONFIG.tables.awards);
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  const awardNameById = new Map();
  const awardQuery = await awardsTable.selectRecordsAsync({
    fields: ["Award Name", "Email Display Name"],
  });
  for (const rec of awardQuery.records) {
    const name =
      getText(rec, awardsTable, "Award Name") ||
      getText(rec, awardsTable, "Email Display Name") ||
      "(unknown)";
    awardNameById.set(rec.id, name);
  }

  const weekLabelById = new Map();
  const weekQuery = await weeksTable.selectRecordsAsync({ fields: ["Week Name"] });
  for (const rec of weekQuery.records) {
    const label = getText(rec, weeksTable, "Week Name") || "";
    weekLabelById.set(rec.id, label);
  }

  setOutputSafe?.("debugStep", "load_recipients");
  const recipientFields = [
    CONFIG.recipients.enrollment,
    CONFIG.recipients.award,
    CONFIG.recipients.week,
    CONFIG.recipients.status,
    CONFIG.recipients.dateAwarded,
    CONFIG.recipients.uniqueKey,
    CONFIG.recipients.enrollmentLookup,
    CONFIG.recipients.athleteDisplay,
  ];
  const recipientQuery = await recipientsTable.selectRecordsAsync({
    fields: recipientFields,
  });

  const liveRows = [];
  for (const rec of recipientQuery.records) {
    const status = normalizeText(getText(rec, recipientsTable, CONFIG.recipients.status));
    if (status === "cancelled") continue;
    const enrollmentLookup = getText(rec, recipientsTable, CONFIG.recipients.enrollmentLookup);
    const weekId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.week);
    const weekLabel = weekLabelById.get(weekId) || getText(rec, recipientsTable, CONFIG.recipients.week);
    const awardId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.award);
    liveRows.push({
      id: rec.id,
      athlete: getText(rec, recipientsTable, CONFIG.recipients.athleteDisplay),
      enrollment: normalizeText(enrollmentLookup),
      award: awardNameById.get(awardId) || "(unknown)",
      week: weekLabel,
      weekNum: weekNum(weekLabel),
      date: getText(rec, recipientsTable, CONFIG.recipients.dateAwarded),
      status: getText(rec, recipientsTable, CONFIG.recipients.status),
      uniqueKey: getText(rec, recipientsTable, CONFIG.recipients.uniqueKey),
      identity: identityKey(
        enrollmentLookup,
        weekLabel,
        getText(rec, recipientsTable, CONFIG.recipients.dateAwarded)
      ),
    });
  }

  setOutputSafe?.("debugStep", "duplicate_scan");
  const byEnrollmentAwardWeek = new Map();
  const byUniqueKey = new Map();
  for (const row of liveRows) {
    const eaw = `${row.enrollment}|${normalizeText(row.award)}|${row.weekNum}`;
    if (!byEnrollmentAwardWeek.has(eaw)) byEnrollmentAwardWeek.set(eaw, []);
    byEnrollmentAwardWeek.get(eaw).push(row);

    if (row.uniqueKey) {
      if (!byUniqueKey.has(row.uniqueKey)) byUniqueKey.set(row.uniqueKey, []);
      byUniqueKey.get(row.uniqueKey).push(row);
    }
  }

  const duplicateGroups = [];
  for (const [key, rows] of byEnrollmentAwardWeek.entries()) {
    if (rows.length <= 1) continue;
    duplicateGroups.push({
      key,
      count: rows.length,
      recordIds: rows.map(r => r.id),
      athlete: rows[0].athlete,
      award: rows[0].award,
      week: rows[0].week,
    });
  }

  const duplicateUniqueKeys = [];
  for (const [key, rows] of byUniqueKey.entries()) {
    if (rows.length <= 1) continue;
    duplicateUniqueKeys.push({ uniqueKey: key, count: rows.length, recordIds: rows.map(r => r.id) });
  }

  setOutputSafe?.("debugStep", "snapshot_compare");
  const liveByIdentity = new Map();
  for (const row of liveRows) {
    if (!liveByIdentity.has(row.identity)) liveByIdentity.set(row.identity, []);
    liveByIdentity.get(row.identity).push(row);
  }

  const matchedLiveIds = new Set();
  let wrongAwardLinked = 0;
  let manualReviewNeeded = 0;
  const wrongAwardSample = {};
  const manualReviewSample = {};

  for (const snap of JUNE29_SNAPSHOT_ROWS) {
    const snapIdentity = `${snap.enrollment}|${snap.week}|${snap.date}`;
    const candidates = liveByIdentity.get(snapIdentity) || [];
    const target = snap.targetAward;
    const correct = candidates.filter(c => normalizeText(c.award) === normalizeText(target));

    if (correct.length === 1) {
      matchedLiveIds.add(correct[0].id);
      continue;
    }
    if (candidates.length === 1) {
      matchedLiveIds.add(candidates[0].id);
      if (normalizeText(candidates[0].award) !== normalizeText(target)) {
        wrongAwardLinked += 1;
        pushSample(wrongAwardSample, "wrong_award_linked", {
          athlete: snap.athlete,
          week: snap.week,
          date: snap.date,
          sentAs: snap.snapshotAward,
          rowSays: candidates[0].award,
          fixTo: target,
          recordId: candidates[0].id,
        });
      }
      continue;
    }
    if (candidates.length > 1) {
      manualReviewNeeded += 1;
      pushSample(manualReviewSample, "manual_review", {
        athlete: snap.athlete,
        week: snap.week,
        date: snap.date,
        sentAs: snap.snapshotAward,
        fixTo: target,
        candidateRecordIds: candidates.map(c => c.id),
        candidateAwards: candidates.map(c => c.award),
      });
      continue;
    }
    manualReviewNeeded += 1;
    pushSample(manualReviewSample, "missing_live_row", {
      athlete: snap.athlete,
      week: snap.week,
      date: snap.date,
      sentAs: snap.snapshotAward,
      fixTo: target,
    });
  }

  const newRowsSinceSnapshot = liveRows.filter(r => !matchedLiveIds.has(r.id));
  const newByStatus = {};
  for (const row of newRowsSinceSnapshot) {
    const st = row.status || "(blank)";
    newByStatus[st] = (newByStatus[st] || 0) + 1;
  }

  const pass =
    wrongAwardLinked === 0 && manualReviewNeeded === 0 && duplicateGroups.length === 0;

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    pass,
    summary: {
      snapshotRows: JUNE29_SNAPSHOT_ROWS.length,
      liveRows: liveRows.length,
      wrongAwardLinked,
      manualReviewNeeded,
      duplicateGroups: duplicateGroups.length,
      duplicateUniqueKeys: duplicateUniqueKeys.length,
      newRowsSinceSnapshot: newRowsSinceSnapshot.length,
      newRowsByStatus: newByStatus,
    },
    duplicateGroups: duplicateGroups.slice(0, SAMPLE_LIMIT),
    duplicateUniqueKeys: duplicateUniqueKeys.slice(0, SAMPLE_LIMIT),
    wrongAwardSample,
    manualReviewSample,
    recommendedAction: pass
      ? "Award Recipients historical cleanup is done. Move to goal-conquer and cart audits."
      : "Fix Award links or duplicates in Airtable, then re-run.",
  };

  setOutputSafe?.("statusOut", pass ? "success" : "skipped");
  setOutputSafe?.("debugStep", "done");
  console.log("===== FINAL AWARD RECIPIENTS CLOSEOUT =====");
  console.log(JSON.stringify(report, null, 2));
}

function setOutputSafe(key, value) {
  try {
    if (typeof output !== "undefined" && output?.set) output.set(key, value);
  } catch {
    // extension may not define output
  }
}

try {
  await main();
} catch (err) {
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", String(err?.message || err));
  throw err;
}
