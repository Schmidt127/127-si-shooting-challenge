/*
Extension Script: Final Pre-Close 090E — XP Events Enrollment Totals
System: 127 SI Shooting Challenge
Purpose:
  Read-only integrity audit for Active? enrollments:
  - recompute XP totals from linked XP Events
  - compare to Enrollments.Lifetime XP Earned rollup
  - sample orphan XP Events (XP links to active enrollment but enrollment does not link back)
  - detect duplicate Source Keys within active-enrollment XP scope

Schema gate: 20260629_045741
Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";
const TOLERANCE = 0;

const CONFIG = {
  scriptName: "audit-final-090e-xp-events-enrollment-totals",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    xpEvents: "XP Events",
  },

  enrollments: {
    active: "Active?",
    lifetimeXpEarned: "Lifetime XP Earned",
    xpEvents: "XP Events",
  },

  xpEvents: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    xpPoints: "XP Points",
    active: "Active?",
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Enrollments", "Lifetime XP Earned"],
  ["Enrollments", "XP Events"],
  ["XP Events", "Source Key"],
  ["XP Events", "Enrollment"],
  ["XP Events", "XP Points"],
];

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function requireSchema(tables) {
  const missing = [];
  for (const [tableName, fieldName] of REQUIRED_FIELDS) {
    const table = tables[tableName];
    if (!table) {
      missing.push(`table:${tableName}`);
      continue;
    }
    if (!fieldExists(table, fieldName)) missing.push(`${tableName}.${fieldName}`);
  }
  if (missing.length) {
    throw new Error(
      `Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`
    );
  }
}

function getBooleanish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getText(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumberish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(
    String(record.getCellValueAsString(fieldName) || "").replace(/,/g, "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function bump(issueCounts, key) {
  issueCounts[key] = (issueCounts[key] || 0) + 1;
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  requireSchema({
    Enrollments: enrollmentsTable,
    "XP Events": xpEventsTable,
  });

  const xpEventsHasActiveField = fieldExists(xpEventsTable, CONFIG.xpEvents.active);

  const enrollmentFields = Object.values(CONFIG.enrollments).filter(name =>
    fieldExists(enrollmentsTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name =>
    fieldExists(xpEventsTable, name)
  );

  const [enrollmentQuery, xpQuery] = await Promise.all([
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
  ]);

  const activeEnrollmentIds = new Set();
  const enrollmentById = new Map();
  const enrollmentLinkedXpSetById = new Map();

  for (const enrollment of enrollmentQuery.records) {
    enrollmentById.set(enrollment.id, enrollment);
    if (!getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) continue;

    activeEnrollmentIds.add(enrollment.id);
    enrollmentLinkedXpSetById.set(
      enrollment.id,
      new Set(getLinkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.xpEvents))
    );
  }

  const activeEnrollmentXpByEnrollmentId = new Map();
  const duplicateSourceKeyMap = new Map();
  const orphanXpEventsSample = [];
  const orphanXpEventIds = new Set();

  for (const xpRecord of xpQuery.records) {
    const enrollmentId = getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment)[0] || "";
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) continue;

    if (!activeEnrollmentXpByEnrollmentId.has(enrollmentId)) {
      activeEnrollmentXpByEnrollmentId.set(enrollmentId, []);
    }
    activeEnrollmentXpByEnrollmentId.get(enrollmentId).push(xpRecord);

    const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (sourceKey) {
      if (!duplicateSourceKeyMap.has(sourceKey)) duplicateSourceKeyMap.set(sourceKey, []);
      duplicateSourceKeyMap.get(sourceKey).push(xpRecord.id);
    }

    const enrollmentLinkedSet = enrollmentLinkedXpSetById.get(enrollmentId) || new Set();
    if (!enrollmentLinkedSet.has(xpRecord.id)) {
      orphanXpEventIds.add(xpRecord.id);
      if (orphanXpEventsSample.length < SAMPLE_LIMIT) {
        orphanXpEventsSample.push({
          xpEventId: xpRecord.id,
          enrollmentId,
          sourceKey,
          xpPoints: getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints),
          issue: "orphan_xp_not_linked_on_enrollment",
        });
      }
    }
  }

  const duplicateSourceKeySample = [];
  let duplicateSourceKeyEventCount = 0;
  for (const [sourceKey, eventIds] of duplicateSourceKeyMap.entries()) {
    if (eventIds.length <= 1) continue;
    duplicateSourceKeyEventCount += eventIds.length;
    if (duplicateSourceKeySample.length < SAMPLE_LIMIT) {
      duplicateSourceKeySample.push({
        sourceKey,
        xpEventIds: eventIds.slice(0, SAMPLE_LIMIT),
        duplicateCount: eventIds.length,
        issue: "duplicate_source_key",
      });
    }
  }

  const enrollmentSummaries = [];
  const enrollmentIssueSample = [];
  const issueCounts = {};

  for (const enrollmentId of activeEnrollmentIds) {
    const enrollment = enrollmentById.get(enrollmentId);
    const linkedXpRecords = activeEnrollmentXpByEnrollmentId.get(enrollmentId) || [];

    let computedSum = 0;
    for (const xpRecord of linkedXpRecords) {
      const includeXp = xpEventsHasActiveField
        ? getBooleanish(xpRecord, xpEventsTable, CONFIG.xpEvents.active)
        : true;
      if (!includeXp) continue;
      computedSum += getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints);
    }

    const lifetimeXpEarned = getNumberish(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.lifetimeXpEarned
    );
    const delta = computedSum - lifetimeXpEarned;
    const hasMismatch = Math.abs(delta) > TOLERANCE;
    const classification = hasMismatch ? "issue" : "clean";

    if (hasMismatch) {
      bump(issueCounts, "lifetime_xp_mismatch");
      if (enrollmentIssueSample.length < SAMPLE_LIMIT) {
        enrollmentIssueSample.push({
          enrollmentId,
          computedSum,
          lifetimeXpEarned,
          delta,
          issue: "lifetime_xp_mismatch",
        });
      }
    } else {
      bump(issueCounts, "clean");
    }

    enrollmentSummaries.push({
      enrollmentId,
      computedSum,
      lifetimeXpEarned,
      delta,
      classification,
    });
  }

  issueCounts.orphan_xp_not_linked_on_enrollment = orphanXpEventIds.size;
  issueCounts.duplicate_source_key_events = duplicateSourceKeyEventCount;
  issueCounts.duplicate_source_keys = duplicateSourceKeySample.length;

  const issueTotal =
    (issueCounts.lifetime_xp_mismatch || 0) +
    (issueCounts.orphan_xp_not_linked_on_enrollment || 0) +
    (issueCounts.duplicate_source_key_events || 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    scope: "Active? enrollments only",
    xpEventsActiveFieldPresent: xpEventsHasActiveField,
    tolerance: TOLERANCE,

    activeEnrollmentCount: activeEnrollmentIds.size,
    activeEnrollmentXpEventCount: [...activeEnrollmentXpByEnrollmentId.values()].reduce(
      (sum, rows) => sum + rows.length,
      0
    ),
    enrollmentRollupSummaryCount: enrollmentSummaries.length,

    issueTotal,
    issueCounts,
    samples: {
      enrollmentMismatches: enrollmentIssueSample,
      orphanXpEvents: orphanXpEventsSample,
      duplicateSourceKeys: duplicateSourceKeySample,
    },

    enrollmentRollupSummary: enrollmentSummaries,
  };

  console.log("===== FINAL 090E — XP EVENTS ENROLLMENT TOTALS =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
