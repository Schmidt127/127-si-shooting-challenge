/*
Extension Script: Repair Final 090E — XP Rollup vs Duplicate Status
System: 127 SI Shooting Challenge
Purpose:
  Repairs Lifetime XP Earned rollup mismatches found by audit-final-090e-xp-events-enrollment-totals.js.

  Root cause: Enrollment.Lifetime XP Earned sums XP Events.Active XP Points, which is 0 when
  Duplicate Status = "Duplicate - Remove" even if Active? is checked and XP Points > 0.

  This script finds gap events (Active? + XP Points counted in 090E but excluded from rollup)
  and either:
    - sets Duplicate Status → Unique when the event is the sole Source Key holder (false duplicate mark), or
    - unchecks Active? when another XP Event with the same Source Key already counts in the rollup.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true and DRY_RUN = false to apply writes
  - BATCH_LIMIT = 25 planned repairs per run; re-run until remainingCount is 0
  - Scope: Active? enrollments with lifetime_xp_mismatch only (configurable)
  - No deletes

Prerequisite:
  - Run audit-final-090e-xp-events-enrollment-totals.js first

Schema gate: 20260629_045741
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const ACTIVE_ENROLLMENT_SCOPE_ONLY = true;
const REPAIR_MISMATCHED_ENROLLMENTS_ONLY = true;
const TOLERANCE = 0;
const SCHEMA_SNAPSHOT = "20260629_045741";
const SAMPLE_LIMIT = 25;

/** Optional: limit to specific enrollment record IDs (empty = auto from mismatch scan). */
const TARGET_ENROLLMENT_IDS = [];

const CONFIG = {
  scriptName: "repair-final-090e-xp-rollup-duplicate-status",
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
    enrollment: "Enrollment",
    sourceKey: "Source Key",
    xpPoints: "XP Points",
    activeXpPoints: "Active XP Points",
    active: "Active?",
    duplicateStatus: "Duplicate Status",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
  },

  values: {
    duplicateRemove: "Duplicate - Remove",
    duplicateUnique: "Unique",
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Enrollments", "Lifetime XP Earned"],
  ["Enrollments", "XP Events"],
  ["XP Events", "Enrollment"],
  ["XP Events", "Source Key"],
  ["XP Events", "XP Points"],
  ["XP Events", "Active XP Points"],
  ["XP Events", "Active?"],
  ["XP Events", "Duplicate Status"],
];

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
    throw new Error(`Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`);
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

function getSelectName(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
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

function buildCellValueForField(table, fieldName, value) {
  const field = table.getField(fieldName);
  if (field.type === "singleSelect") return { name: value };
  if (field.type === "checkbox") return Boolean(value);
  return value;
}

function countsInRollup(xpRecord, xpEventsTable) {
  const xpPoints = getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints);
  const activeXpPoints = getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.activeXpPoints);
  const active = getBooleanish(xpRecord, xpEventsTable, CONFIG.xpEvents.active);
  if (!active || xpPoints <= 0) return false;
  return activeXpPoints >= xpPoints;
}

function countsIn090eSum(xpRecord, xpEventsTable) {
  const xpPoints = getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints);
  const active = getBooleanish(xpRecord, xpEventsTable, CONFIG.xpEvents.active);
  return active && xpPoints > 0;
}

function rollupGapPoints(xpRecord, xpEventsTable) {
  const xpPoints = getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints);
  const activeXpPoints = getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.activeXpPoints);
  if (!countsIn090eSum(xpRecord, xpEventsTable)) return 0;
  return Math.max(0, xpPoints - activeXpPoints);
}

function computeEnrollmentTotals(linkedXpRecords, xpEventsTable) {
  let computedSum = 0;
  let rollupSum = 0;

  for (const xpRecord of linkedXpRecords) {
    if (countsIn090eSum(xpRecord, xpEventsTable)) {
      computedSum += getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints);
    }
    rollupSum += getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.activeXpPoints);
  }

  return { computedSum, rollupSum };
}

function classifyRepairAction(xpRecord, xpEventsTable, peersBySourceKey) {
  const xpEventId = xpRecord.id;
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const duplicateStatus = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.duplicateStatus);
  const gap = rollupGapPoints(xpRecord, xpEventsTable);

  if (gap <= 0) return null;

  const peers = (sourceKey ? peersBySourceKey.get(sourceKey) : []) || [];
  const countingPeer = peers.find(
    peer =>
      peer.id !== xpEventId &&
      countsInRollup(peer.record, xpEventsTable)
  );

  if (countingPeer) {
    return {
      action: "deactivate_true_duplicate",
      xpEventId,
      sourceKey,
      duplicateStatus,
      gapPoints: gap,
      keeperXpEventId: countingPeer.id,
      reason: "same_source_key_keeper_exists",
    };
  }

  if (duplicateStatus === CONFIG.values.duplicateRemove) {
    return {
      action: "clear_false_duplicate_mark",
      xpEventId,
      sourceKey,
      duplicateStatus,
      gapPoints: gap,
      reason: "duplicate_remove_blocks_active_xp_points",
    };
  }

  return {
    action: "manual_review",
    xpEventId,
    sourceKey,
    duplicateStatus,
    gapPoints: gap,
    reason: "rollup_gap_without_duplicate_remove",
  };
}

function buildWritePatch(xpEventsTable, plan) {
  const patch = {};

  if (plan.action === "clear_false_duplicate_mark") {
    if (!isWritableField(xpEventsTable, CONFIG.xpEvents.duplicateStatus)) {
      throw new Error(`Field not writable: ${CONFIG.xpEvents.duplicateStatus}`);
    }
    patch[CONFIG.xpEvents.duplicateStatus] = buildCellValueForField(
      xpEventsTable,
      CONFIG.xpEvents.duplicateStatus,
      CONFIG.values.duplicateUnique
    );
  } else if (plan.action === "deactivate_true_duplicate") {
    if (!isWritableField(xpEventsTable, CONFIG.xpEvents.active)) {
      throw new Error(`Field not writable: ${CONFIG.xpEvents.active}`);
    }
    patch[CONFIG.xpEvents.active] = false;
  }

  return patch;
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  requireSchema({
    Enrollments: enrollmentsTable,
    "XP Events": xpEventsTable,
  });

  const enrollmentFields = Object.values(CONFIG.enrollments).filter(name =>
    fieldExists(enrollmentsTable, name)
  );
  const xpFields = [
    ...new Set([
      ...Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name)),
    ]),
  ];

  const [enrollmentQuery, xpQuery] = await Promise.all([
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
  ]);

  const targetEnrollmentSet =
    TARGET_ENROLLMENT_IDS.length > 0
      ? new Set(TARGET_ENROLLMENT_IDS.filter(id => id && id.startsWith("rec")))
      : null;

  const activeEnrollmentIds = new Set();
  const enrollmentById = new Map();
  const activeEnrollmentXpByEnrollmentId = new Map();
  const peersBySourceKey = new Map();

  for (const enrollment of enrollmentQuery.records) {
    enrollmentById.set(enrollment.id, enrollment);
    if (ACTIVE_ENROLLMENT_SCOPE_ONLY) {
      if (!getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) continue;
    }
    if (targetEnrollmentSet && !targetEnrollmentSet.has(enrollment.id)) continue;

    activeEnrollmentIds.add(enrollment.id);
    activeEnrollmentXpByEnrollmentId.set(enrollment.id, []);
  }

  for (const xpRecord of xpQuery.records) {
    const enrollmentId =
      getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment)[0] || "";
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) continue;

    activeEnrollmentXpByEnrollmentId.get(enrollmentId).push(xpRecord);

    const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!peersBySourceKey.has(sourceKey)) peersBySourceKey.set(sourceKey, []);
    peersBySourceKey.get(sourceKey).push({ id: xpRecord.id, record: xpRecord });
  }

  const mismatchedEnrollmentIds = new Set();
  const enrollmentBefore = [];

  for (const enrollmentId of activeEnrollmentIds) {
    const enrollment = enrollmentById.get(enrollmentId);
    const linkedXpRecords = activeEnrollmentXpByEnrollmentId.get(enrollmentId) || [];
    const { computedSum, rollupSum } = computeEnrollmentTotals(linkedXpRecords, xpEventsTable);
    const lifetimeXpEarned = getNumberish(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.lifetimeXpEarned
    );
    const delta = computedSum - lifetimeXpEarned;
    const hasMismatch = Math.abs(delta) > TOLERANCE;

    if (hasMismatch) {
      mismatchedEnrollmentIds.add(enrollmentId);
      if (enrollmentBefore.length < SAMPLE_LIMIT) {
        enrollmentBefore.push({
          enrollmentId,
          computedSum,
          lifetimeXpEarned,
          rollupSumFromEvents: rollupSum,
          delta,
        });
      }
    }
  }

  const repairEnrollmentIds = REPAIR_MISMATCHED_ENROLLMENTS_ONLY
    ? mismatchedEnrollmentIds
    : activeEnrollmentIds;

  const allPlans = [];
  const manualReview = [];

  for (const enrollmentId of repairEnrollmentIds) {
    const linkedXpRecords = activeEnrollmentXpByEnrollmentId.get(enrollmentId) || [];

    for (const xpRecord of linkedXpRecords) {
      const plan = classifyRepairAction(xpRecord, xpEventsTable, peersBySourceKey);
      if (!plan) continue;

      const enriched = {
        ...plan,
        enrollmentId,
        xpPoints: getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints),
        activeXpPoints: getNumberish(xpRecord, xpEventsTable, CONFIG.xpEvents.activeXpPoints),
        xpSource: getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpSource),
        xpBucket: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpBucket),
      };

      if (plan.action === "manual_review") {
        manualReview.push(enriched);
        continue;
      }

      allPlans.push(enriched);
    }
  }

  allPlans.sort(
    (a, b) =>
      a.enrollmentId.localeCompare(b.enrollmentId) ||
      b.gapPoints - a.gapPoints ||
      a.xpEventId.localeCompare(b.xpEventId)
  );

  const batchPlans = allPlans.slice(0, BATCH_LIMIT);
  const remainingCount = Math.max(0, allPlans.length - batchPlans.length);

  const writes = [];
  for (const plan of batchPlans) {
    const patch = buildWritePatch(xpEventsTable, plan);
    writes.push({
      xpEventId: plan.xpEventId,
      enrollmentId: plan.enrollmentId,
      action: plan.action,
      sourceKey: plan.sourceKey,
      gapPoints: plan.gapPoints,
      before: {
        duplicateStatus: plan.duplicateStatus,
        xpPoints: plan.xpPoints,
        activeXpPoints: plan.activeXpPoints,
      },
      after: {
        duplicateStatus:
          plan.action === "clear_false_duplicate_mark"
            ? CONFIG.values.duplicateUnique
            : plan.duplicateStatus,
        active:
          plan.action === "deactivate_true_duplicate" ? false : undefined,
      },
      patch,
    });
  }

  let appliedCount = 0;
  const applyErrors = [];

  if (!DRY_RUN && CONFIRM_WRITE && writes.length > 0) {
    for (const write of writes) {
      try {
        await xpEventsTable.updateRecordAsync(write.xpEventId, write.patch);
        appliedCount += 1;
      } catch (err) {
        applyErrors.push({
          xpEventId: write.xpEventId,
          message: err?.message || String(err),
        });
      }
    }
  }

  const actionCounts = allPlans.reduce((acc, plan) => {
    acc[plan.action] = (acc[plan.action] || 0) + 1;
    return acc;
  }, {});

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    scope: {
      activeEnrollmentsOnly: ACTIVE_ENROLLMENT_SCOPE_ONLY,
      mismatchedEnrollmentsOnly: REPAIR_MISMATCHED_ENROLLMENTS_ONLY,
      targetEnrollmentIds: TARGET_ENROLLMENT_IDS,
    },
    tolerance: TOLERANCE,

    activeEnrollmentCount: activeEnrollmentIds.size,
    mismatchedEnrollmentCount: mismatchedEnrollmentIds.size,
    gapEventPlanCount: allPlans.length,
    manualReviewCount: manualReview.length,
    plannedThisBatch: batchPlans.length,
    remainingCount,
    appliedCount,

    actionCounts,
    enrollmentBeforeSample: enrollmentBefore,
    plannedRepairs: writes.map(row => ({
      xpEventId: row.xpEventId,
      enrollmentId: row.enrollmentId,
      action: row.action,
      sourceKey: row.sourceKey,
      gapPoints: row.gapPoints,
      before: row.before,
      after: row.after,
      keeperXpEventId: batchPlans.find(p => p.xpEventId === row.xpEventId)?.keeperXpEventId || "",
    })),
    manualReviewSample: manualReview.slice(0, SAMPLE_LIMIT),
    applyErrors,

    nextSteps:
      remainingCount > 0
        ? "Re-run with CONFIRM_WRITE until remainingCount is 0, then re-run audit-final-090e."
        : manualReview.length > 0
          ? "Review manualReview rows in Airtable, then re-run audit-final-090e."
          : "Re-run audit-final-090e-xp-events-enrollment-totals.js to confirm issueTotal is 0.",
  };

  console.log("===== REPAIR FINAL 090E — XP ROLLUP DUPLICATE STATUS =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
