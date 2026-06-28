/*
Extension Script: Repair Orphan Asset Submission Links
System: 127 SI Shooting Challenge
Purpose:
  Links Submission - Linked on orphan Submission Assets identified by
  audit-orphan-asset-homework-submission-repair-planner.js.

  Applies:
  1. SAFE planner matches
  2. AMBIGUOUS rows resolved by unique closest date to asset Created
  3. NO_MATCH rows resolved by relaxed enrollment + date fallback (14-day window)
  4. Optional MANUAL_OVERRIDES for edge cases

  Writes ONLY Submission - Linked on Submission Assets.
  Does NOT change Upload Status, Send to Make Trigger, or create/delete records.

Safety:
  - DRY_RUN = true by default
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
  - BATCH_LIMIT caps updates per run (default 25)

Setup:
  1. Run audit-orphan-asset-homework-submission-repair-planner.js
  2. Dry run this script; review plannedRepairs
  3. CONFIRM_WRITE = true, DRY_RUN = false; re-run until remainingCount is 0
  4. Re-run planner to confirm 0 orphan assets
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const REPAIR_AMBIGUOUS = true;
const REPAIR_NO_MATCH = true;

const DATE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const RELAXED_DATE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Optional filter — empty repairs all orphan assets */
const TARGET_ASSET_IDS = [];

/** Last-resort picks when relaxed matching still fails */
const MANUAL_OVERRIDES = {
  recXKV3Pwyd151Hbi: {
    submissionId: "recxtmhkuMxWJMi1z",
    reason: "manual: Nora Davison 5/17 Week 4 batch (same Created as HW1 assets)",
  },
  rec2rulTJ0ordQSyq: {
    submissionId: "recxtmhkuMxWJMi1z",
    reason: "manual: Nora Davison HW1 file — same submission as sibling HW2 asset",
  },
  rec2DM3ZF3t6oZt7M: {
    submissionId: "recxtmhkuMxWJMi1z",
    reason: "manual: Nora Davison HW1 file — same submission as sibling HW2 asset",
  },
};

const CONFIG = {
  scriptName: "repair-orphan-asset-submission-links",
  version: "v1.0",

  tables: {
    submissions: "Submissions",
    assets: "Submission Assets",
    homework: "Homework Completions",
  },

  submissions: {
    name: "Submission Full Name",
    recordId: "RecordId",
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    submittedAt: "Submitted At",
    week: "Week",
    hwSub1: "HW Sub 1",
    hwSub2: "HW Sub 2",
    videoUpload: "Video Upload",
    hasHw1: "Has HW1?",
    hasHw2: "Has HW2?",
    hasVideo: "Has Video?",
    created: "Created",
  },

  assets: {
    name: "Submission Assets Full Name",
    recordId: "RecordId",
    submission: "Submission - Linked",
    submissionRecordIdLkp: "RecordId - Submission Table",
    enrollment: "Enrollment - Linked",
    attachment: "Airtable Attachment",
    uploadDestination: "Upload Destination",
    assetPurpose: "Asset Purpose",
    assetType: "Asset Type",
    assetSlot: "Asset Slot",
    assetSlotBase: "Asset Slot Base",
    homeworkCompletions: "Homework Completions",
    created: "Created",
  },

  homework: {
    submissionCandidates: ["Submissions - Linked", "Submission"],
  },
};

function fieldExists(table, fieldName) {
  if (!fieldName) return false;
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

function resolveField(table, candidates) {
  for (const name of candidates) {
    if (fieldExists(table, name)) return name;
  }
  return "";
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function getCheckbox(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  return record.getCellValue(fieldName) === true;
}

function hasAttachments(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return Array.isArray(raw) && raw.length > 0;
}

function getDateMs(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  const raw = record.getCellValue(fieldName);
  if (!raw) return null;
  const ms = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function collectSubmissionHints(...texts) {
  const hints = [];
  for (const text of texts) {
    const trimmed = String(text || "").trim();
    if (trimmed) hints.push(trimmed);
    hints.push(...(String(text || "").match(/rec[a-zA-Z0-9]{10,}/g) || []));
  }
  return [...new Set(hints.filter(Boolean))];
}

function normalizeSlotLabel(...parts) {
  const joined = parts.filter(Boolean).join(" ").toLowerCase();
  if (!joined) return "";
  if (/video/.test(joined)) return "VIDEO";
  if (/hw\s*1|homework\s*1|\b1\b/.test(joined) && !/hw\s*2|homework\s*2/.test(joined)) return "HW1";
  if (/hw\s*2|homework\s*2|\b2\b/.test(joined)) return "HW2";
  if (/homework/.test(joined)) return "HOMEWORK";
  return joined.trim();
}

function inferAssetSlot(asset, assetsTable, fields) {
  return (
    normalizeSlotLabel(
      getSelectName(asset, assetsTable, fields.assetSlot),
      getSelectName(asset, assetsTable, fields.assetPurpose),
      getSelectName(asset, assetsTable, fields.assetType),
      getSelectName(asset, assetsTable, fields.uploadDestination),
      getText(asset, assetsTable, fields.assetSlotBase)
    ) || ""
  );
}

function submissionMatchesSlot(submission, submissionsTable, fields, slot) {
  if (!slot) return true;
  if (slot === "HW1") {
    return (
      getCheckbox(submission, submissionsTable, fields.hasHw1) ||
      hasAttachments(submission, submissionsTable, fields.hwSub1)
    );
  }
  if (slot === "HW2") {
    return (
      getCheckbox(submission, submissionsTable, fields.hasHw2) ||
      hasAttachments(submission, submissionsTable, fields.hwSub2)
    );
  }
  if (slot === "VIDEO") {
    return (
      getCheckbox(submission, submissionsTable, fields.hasVideo) ||
      hasAttachments(submission, submissionsTable, fields.videoUpload)
    );
  }
  return true;
}

function submissionAnchorMs(submission, submissionsTable, fields) {
  return (
    getDateMs(submission, submissionsTable, fields.submittedAt) ??
    getDateMs(submission, submissionsTable, fields.activityDate) ??
    getDateMs(submission, submissionsTable, fields.created) ??
    null
  );
}

function buildSubmissionCandidate(submission, submissionsTable, fields) {
  return {
    id: submission.id,
    name: getText(submission, submissionsTable, fields.name),
    anchorMs: submissionAnchorMs(submission, submissionsTable, fields),
  };
}

function uniqueCandidates(list) {
  const seen = new Set();
  return list.filter(row => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function candidatesWithinDateWindow(candidates, targetMs, windowMs) {
  if (!candidates.length) return [];
  if (targetMs == null) return candidates;
  return candidates.filter(row => {
    if (row.anchorMs == null) return false;
    return Math.abs(row.anchorMs - targetMs) <= windowMs;
  });
}

function pickUniqueClosest(candidates, targetMs) {
  if (!candidates.length) return null;
  if (targetMs == null) {
    return candidates.length === 1 ? candidates[0] : null;
  }
  const scored = candidates.map(row => ({
    row,
    diff: Math.abs((row.anchorMs ?? targetMs) - targetMs),
  }));
  scored.sort((a, b) => a.diff - b.diff);
  const bestDiff = scored[0].diff;
  const closest = scored.filter(item => item.diff === bestDiff).map(item => item.row);
  return closest.length === 1 ? closest[0] : null;
}

function resolveRecordIdMatches(hints, submissionById, submissionByRecordIdText, submissionsTable, fields) {
  const matches = [];
  for (const hint of hints) {
    if (submissionById.has(hint)) {
      matches.push(
        buildSubmissionCandidate(submissionById.get(hint), submissionsTable, fields)
      );
      continue;
    }
    if (submissionByRecordIdText.has(hint)) {
      matches.push(
        buildSubmissionCandidate(
          submissionByRecordIdText.get(hint),
          submissionsTable,
          fields
        )
      );
    }
  }
  return uniqueCandidates(matches);
}

function planAssetRepair(asset, context) {
  const {
    assetsTable,
    homeworkTable,
    submissionsTable,
    homeworkSubmissionField,
    submissionById,
    submissionByRecordIdText,
    submissionsByEnrollment,
    homeworkById,
  } = context;

  const assetId = asset.id;
  const enrollmentId = getFirstLinkedId(asset, assetsTable, CONFIG.assets.enrollment);
  const assetSlot = inferAssetSlot(asset, assetsTable, CONFIG.assets);
  const assetCreatedMs = getDateMs(asset, assetsTable, CONFIG.assets.created);
  const assetName = getText(asset, assetsTable, CONFIG.assets.name);

  if (MANUAL_OVERRIDES[assetId]) {
    const override = MANUAL_OVERRIDES[assetId];
    return {
      assetId,
      assetName,
      submissionId: override.submissionId,
      tier: "manual",
      reason: override.reason,
    };
  }

  const recordIdHints = collectSubmissionHints(
    getText(asset, assetsTable, CONFIG.assets.recordId),
    getText(asset, assetsTable, CONFIG.assets.submissionRecordIdLkp)
  );
  const recordIdMatches = resolveRecordIdMatches(
    recordIdHints,
    submissionById,
    submissionByRecordIdText,
    submissionsTable,
    CONFIG.submissions
  );
  if (recordIdMatches.length === 1) {
    return {
      assetId,
      assetName,
      submissionId: recordIdMatches[0].id,
      tier: "safe",
      reason: "RecordId hint matches one Submission",
    };
  }

  const hwSubmissionIds = new Set();
  for (const hwId of getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions)) {
    const hw = homeworkById.get(hwId);
    if (!hw) continue;
    const hwSubmissionId = getFirstLinkedId(hw, homeworkTable, homeworkSubmissionField);
    if (hwSubmissionId) hwSubmissionIds.add(hwSubmissionId);
  }
  if (hwSubmissionIds.size === 1) {
    return {
      assetId,
      assetName,
      submissionId: [...hwSubmissionIds][0],
      tier: "safe",
      reason: "Linked Homework Completion points to one Submission",
    };
  }

  const enrollmentSubmissions = submissionsByEnrollment.get(enrollmentId) || [];
  let slotFiltered = enrollmentSubmissions.filter(submission =>
    submissionMatchesSlot(submission, submissionsTable, CONFIG.submissions, assetSlot)
  );
  if (slotFiltered.length === 0 && assetSlot) {
    slotFiltered = enrollmentSubmissions;
  }

  const candidateRows = slotFiltered.map(submission =>
    buildSubmissionCandidate(submission, submissionsTable, CONFIG.submissions)
  );
  const withinWindow = candidatesWithinDateWindow(candidateRows, assetCreatedMs, DATE_WINDOW_MS);

  if (withinWindow.length === 1) {
    return {
      assetId,
      assetName,
      submissionId: withinWindow[0].id,
      tier: "safe",
      reason: "Enrollment + slot + unique 3-day Created match",
    };
  }

  if (withinWindow.length > 1 && REPAIR_AMBIGUOUS) {
    const picked = pickUniqueClosest(withinWindow, assetCreatedMs);
    if (picked) {
      return {
        assetId,
        assetName,
        submissionId: picked.id,
        tier: "fallback_ambiguous",
        reason: "Ambiguous 3-day window resolved by closest Created/Submitted date",
      };
    }
  }

  if (!REPAIR_NO_MATCH) {
    return { assetId, assetName, tier: "skip", reason: "No safe match; REPAIR_NO_MATCH is false" };
  }

  const relaxedSlot = candidatesWithinDateWindow(
    candidateRows,
    assetCreatedMs,
    RELAXED_DATE_WINDOW_MS
  );
  const relaxedPick = pickUniqueClosest(
    relaxedSlot.length ? relaxedSlot : candidateRows,
    assetCreatedMs
  );
  if (relaxedPick) {
    return {
      assetId,
      assetName,
      submissionId: relaxedPick.id,
      tier: "fallback_relaxed",
      reason: "Relaxed enrollment + closest date (14-day window when dates available)",
    };
  }

  const anyEnrollmentPick = pickUniqueClosest(
    enrollmentSubmissions.map(submission =>
      buildSubmissionCandidate(submission, submissionsTable, CONFIG.submissions)
    ),
    assetCreatedMs
  );
  if (anyEnrollmentPick) {
    return {
      assetId,
      assetName,
      submissionId: anyEnrollmentPick.id,
      tier: "fallback_relaxed",
      reason: "Closest enrollment submission by date (slot/window relaxed)",
    };
  }

  return { assetId, assetName, tier: "skip", reason: "Could not resolve parent Submission" };
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const homeworkSubmissionField = resolveField(
    homeworkTable,
    CONFIG.homework.submissionCandidates
  );

  if (!isWritableField(assetsTable, CONFIG.assets.submission)) {
    throw new Error("Submission - Linked is missing or not writable on Submission Assets.");
  }

  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const assetFields = Object.values(CONFIG.assets).filter(name =>
    fieldExists(assetsTable, name)
  );
  const homeworkFields = [homeworkSubmissionField].filter(Boolean);

  const [submissionQuery, assetQuery, homeworkQuery] = await Promise.all([
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
  ]);

  const submissionById = new Map();
  const submissionByRecordIdText = new Map();
  const submissionsByEnrollment = new Map();

  for (const submission of submissionQuery.records) {
    submissionById.set(submission.id, submission);
    const recordIdText = getText(submission, submissionsTable, CONFIG.submissions.recordId);
    if (recordIdText) submissionByRecordIdText.set(recordIdText, submission);

    const enrollmentId = getFirstLinkedId(
      submission,
      submissionsTable,
      CONFIG.submissions.enrollment
    );
    if (enrollmentId) {
      if (!submissionsByEnrollment.has(enrollmentId)) {
        submissionsByEnrollment.set(enrollmentId, []);
      }
      submissionsByEnrollment.get(enrollmentId).push(submission);
    }
  }

  const homeworkById = new Map();
  for (const hw of homeworkQuery.records) {
    homeworkById.set(hw.id, hw);
  }

  const targetSet = new Set(TARGET_ASSET_IDS.filter(Boolean));
  const context = {
    assetsTable,
    homeworkTable,
    submissionsTable,
    homeworkSubmissionField,
    submissionById,
    submissionByRecordIdText,
    submissionsByEnrollment,
    homeworkById,
  };

  const orphanAssets = assetQuery.records.filter(asset => {
    if (targetSet.size > 0 && !targetSet.has(asset.id)) return false;
    const hasFile = hasAttachments(asset, assetsTable, CONFIG.assets.attachment);
    const submissionLinked = getLinkedIds(asset, assetsTable, CONFIG.assets.submission);
    const enrollmentId = getFirstLinkedId(asset, assetsTable, CONFIG.assets.enrollment);
    return hasFile && submissionLinked.length === 0 && enrollmentId;
  });

  const plannedRepairs = [];
  const skipped = [];

  for (const asset of orphanAssets) {
    const plan = planAssetRepair(asset, context);
    if (plan.submissionId && submissionById.has(plan.submissionId)) {
      const submission = submissionById.get(plan.submissionId);
      plannedRepairs.push({
        ...plan,
        submissionName: getText(submission, submissionsTable, CONFIG.submissions.name),
      });
    } else {
      skipped.push(plan);
    }
  }

  const batch = plannedRepairs.slice(0, BATCH_LIMIT);
  const remainingCount = Math.max(0, plannedRepairs.length - batch.length);

  console.log(`===== ${CONFIG.scriptName} ${CONFIG.version} =====`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(`CONFIRM_WRITE: ${CONFIRM_WRITE}`);
  console.log(`Orphan assets found: ${orphanAssets.length}`);
  console.log(`Planned repairs: ${plannedRepairs.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Batch this run: ${batch.length}`);
  console.log(`Remaining after batch: ${remainingCount}`);

  console.log("\n----- PLANNED REPAIRS -----");
  for (const row of plannedRepairs) {
    console.log(JSON.stringify(row));
  }

  if (skipped.length) {
    console.log("\n----- SKIPPED -----");
    for (const row of skipped) {
      console.log(JSON.stringify(row));
    }
  }

  if (typeof output !== "undefined" && output.table && plannedRepairs.length) {
    output.markdown(`### Planned repairs (${plannedRepairs.length})`);
    output.table(plannedRepairs);
  }

  if (!batch.length) {
    console.log(JSON.stringify({ status: "success", updatedCount: 0, remainingCount: 0 }));
    return;
  }

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nDry run only — set DRY_RUN = false and CONFIRM_WRITE = true to apply.");
    console.log(
      JSON.stringify({
        status: "dry_run",
        plannedCount: plannedRepairs.length,
        batchCount: batch.length,
        remainingCount,
      })
    );
    return;
  }

  const updates = batch.map(plan => ({
    id: plan.assetId,
    fields: {
      [CONFIG.assets.submission]: [{ id: plan.submissionId }],
    },
  }));

  await assetsTable.updateRecordsAsync(updates);

  console.log(
    JSON.stringify({
      status: "success",
      updatedCount: batch.length,
      remainingCount,
      updatedAssetIds: batch.map(row => row.assetId),
    })
  );
}

await main();
