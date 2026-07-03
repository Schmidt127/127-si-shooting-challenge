/*
Extension Script: Final Close-Out — Awards Catalog Quick Check
System: 127 SI Shooting Challenge
Purpose:
  Read-only quick audit of Awards catalog + Award Recipients connections.
  Flags duplicates, missing links, and Conquered Goal alignment gaps.

Schema gate: 20260629_045741
Version: v1.0
Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-awards-catalog-quick",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,
  tables: {
    awards: "Awards",
    awardRecipients: "Award Recipients",
    enrollments: "Enrollments",
  },
  awards: {
    name: "Award Name",
    emailDisplay: "Email Display Name",
    scope: "Award Scope",
    active: "Active?",
  },
  recipients: {
    enrollment: "Enrollment",
    award: "Award",
    week: "Week",
    scope: "Award Scope",
    status: "Award Status",
    uniqueKey: "Award Recipient Unique Key",
    enrollmentLookup: "Enrollment Name Lookup",
  },
  enrollments: {
    active: "Active?",
    goalMet: "Goal Met?",
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

function getBooleanish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  if (raw === true || raw === 1) return true;
  const text = String(raw || "").trim().toLowerCase();
  return Boolean(text) && !["false", "0", "no"].includes(text);
}

function getFirstLinkedId(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw) || !raw.length) return "";
  return raw[0]?.id || "";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function bump(counts, key) {
  counts[key] = (counts[key] || 0) + 1;
}

function pushSample(bucket, code, item) {
  if (!bucket[code]) bucket[code] = [];
  if (bucket[code].length < SAMPLE_LIMIT) bucket[code].push(item);
}

async function main() {
  setOutputSafe?.("debugStep", "load_awards");
  const awardsTable = base.getTable(CONFIG.tables.awards);
  const awardQuery = await awardsTable.selectRecordsAsync({
    fields: [
      CONFIG.awards.name,
      CONFIG.awards.emailDisplay,
      CONFIG.awards.scope,
      CONFIG.awards.active,
    ],
  });

  const awardById = new Map();
  const conqueredAwardIds = new Set();
  for (const rec of awardQuery.records) {
    const name = getText(rec, awardsTable, CONFIG.awards.name);
    awardById.set(rec.id, {
      name,
      display: getText(rec, awardsTable, CONFIG.awards.emailDisplay),
      scope: getText(rec, awardsTable, CONFIG.awards.scope),
    });
    if (normalizeText(name).includes("conquered goal")) conqueredAwardIds.add(rec.id);
  }

  setOutputSafe?.("debugStep", "load_recipients");
  const recipientsTable = base.getTable(CONFIG.tables.awardRecipients);
  const recipientQuery = await recipientsTable.selectRecordsAsync({
    fields: [
      CONFIG.recipients.enrollment,
      CONFIG.recipients.award,
      CONFIG.recipients.week,
      CONFIG.recipients.scope,
      CONFIG.recipients.status,
      CONFIG.recipients.uniqueKey,
      CONFIG.recipients.enrollmentLookup,
    ],
  });

  const issueCounts = {};
  const issueSample = {};
  const byUniqueKey = new Map();
  const byEnrollmentAwardWeek = new Map();
  let recipientCount = 0;

  for (const rec of recipientQuery.records) {
    recipientCount += 1;
    const status = normalizeText(getText(rec, recipientsTable, CONFIG.recipients.status));
    if (status === "cancelled") continue;

    const enrollmentId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.enrollment);
    const awardId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.award);
    const weekId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.week);
    const uniqueKey = getText(rec, recipientsTable, CONFIG.recipients.uniqueKey);
    const enrollmentLookup = normalizeText(
      getText(rec, recipientsTable, CONFIG.recipients.enrollmentLookup)
    );
    const awardMeta = awardById.get(awardId) || { name: "(unknown)", scope: "" };
    const recipientScope = getText(rec, recipientsTable, CONFIG.recipients.scope);

    if (!enrollmentId) {
      bump(issueCounts, "missing_enrollment_link");
      pushSample(issueSample, "missing_enrollment_link", { recordId: rec.id });
    }
    if (!awardId) {
      bump(issueCounts, "missing_award_link");
      pushSample(issueSample, "missing_award_link", { recordId: rec.id });
    }

    if (uniqueKey) {
      if (!byUniqueKey.has(uniqueKey)) byUniqueKey.set(uniqueKey, []);
      byUniqueKey.get(uniqueKey).push(rec.id);
    }

    const eaw = `${enrollmentId}|${awardId}|${weekId}`;
    if (!byEnrollmentAwardWeek.has(eaw)) byEnrollmentAwardWeek.set(eaw, []);
    byEnrollmentAwardWeek.get(eaw).push(rec.id);

    if (awardMeta.scope && recipientScope && normalizeText(awardMeta.scope) !== normalizeText(recipientScope)) {
      bump(issueCounts, "recipient_scope_vs_catalog_scope");
      pushSample(issueSample, "recipient_scope_vs_catalog_scope", {
        recordId: rec.id,
        enrollment: enrollmentLookup,
        award: awardMeta.name,
        catalogScope: awardMeta.scope,
        recipientScope,
      });
    }
  }

  for (const [key, ids] of byUniqueKey.entries()) {
    if (ids.length <= 1) continue;
    bump(issueCounts, "duplicate_unique_key");
    pushSample(issueSample, "duplicate_unique_key", { uniqueKey: key, recordIds: ids });
  }

  for (const [key, ids] of byEnrollmentAwardWeek.entries()) {
    if (ids.length <= 1) continue;
    bump(issueCounts, "duplicate_enrollment_award_week");
    pushSample(issueSample, "duplicate_enrollment_award_week", { key, recordIds: ids });
  }

  setOutputSafe?.("debugStep", "goal_met_spot_check");
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.active, CONFIG.enrollments.goalMet],
  });

  const conqueredByEnrollment = new Set();
  for (const rec of recipientQuery.records) {
    const awardId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.award);
    if (!conqueredAwardIds.has(awardId)) continue;
    const enrollmentId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.enrollment);
    if (enrollmentId) conqueredByEnrollment.add(enrollmentId);
  }

  let goalMetActive = 0;
  let needConqueredRow = 0;
  for (const rec of enrollmentQuery.records) {
    if (!getBooleanish(rec, enrollmentsTable, CONFIG.enrollments.active)) continue;
    const goalMet = getBooleanish(rec, enrollmentsTable, CONFIG.enrollments.goalMet);
    if (!goalMet) continue;
    goalMetActive += 1;
    if (!conqueredByEnrollment.has(rec.id)) {
      needConqueredRow += 1;
      bump(issueCounts, "goal_met_no_conquered_row");
      pushSample(issueSample, "goal_met_no_conquered_row", { enrollmentId: rec.id });
    }
  }

  const issueTotal = Object.values(issueCounts).reduce((sum, n) => sum + n, 0);
  const pass =
    (issueCounts.duplicate_unique_key || 0) === 0 &&
    (issueCounts.duplicate_enrollment_award_week || 0) === 0 &&
    needConqueredRow === 0;

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    pass,
    summary: {
      awardCatalogCount: awardQuery.records.length,
      recipientCount,
      issueTotal,
      goalMetActive,
      needConqueredRow,
    },
    issueCounts,
    issueSample,
    note:
      "recipient_scope_vs_catalog_scope on old weekly Sent rows is often historical — do not bulk-fix unless clearly wrong.",
    recommendedAction: pass
      ? "Catalog connections look clean for close-out duplicates and Conquered Goal."
      : "Fix duplicates and Conquered Goal gaps first; review scope mismatches manually.",
  };

  setOutputSafe?.("statusOut", pass ? "success" : "skipped");
  setOutputSafe?.("debugStep", "done");
  console.log("===== FINAL AWARDS CATALOG QUICK CHECK =====");
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
