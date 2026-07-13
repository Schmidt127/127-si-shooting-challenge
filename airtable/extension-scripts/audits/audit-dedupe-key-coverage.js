/*
Extension Script: Audit Dedupe Key Coverage (C-024)
System: 127 SI Shooting Challenge
Purpose:
  Dry-run audit for C-024 dedupe key coverage across XP Events, Homework Completions,
  Submissions, Submission Assets, Achievement Unlocks, and Zoom XP exclusivity.

  Checks (Stage 3 v0.1.0):
  - DK-01 Duplicate active XP Source Key
  - DK-02 Homework XP key alignment
  - DK-03 Multiple HC rows same enrollment+homework+week
  - DK-04 Identical Submission Duplicate Key collisions
  - DK-05 Achievement duplicate XP same unlock key
  - DK-06 XP Event missing Source Key
  - DK-07 C-023 hash match without review fields
  - DK-08 Zoom live + recording XP same meeting+enrollment

Default: read-only (no writes)
Contract: docs/deploy-checklists/C-024-dedupe-key-contract-stage2.md
Requirements: docs/deploy-checklists/C-024-audit-dedupe-key-coverage-requirements-stage2.md
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCRIPT_VERSION = "0.1.0";

const CONFIG = {
  scriptName: "audit-dedupe-key-coverage",
  displayName: "AUDIT - Dedupe Key Coverage (C-024)",
  version: SCRIPT_VERSION,

  tables: {
    xpEvents: "XP Events",
    homework: "Homework Completions",
    submissions: "Submissions",
    assets: "Submission Assets",
    unlocks: "Athlete Achievement Unlocks",
    videoFeedback: "Video Feedback",
  },

  xpEvents: {
    sourceKey: "Source Key",
    active: "Active?",
    homeworkCompletion: "Homework Completion",
    achievementUnlock: "Achievement Unlock",
    videoFeedback: "Video Feedback",
    enrollment: "Enrollment",
    xpSource: "XP Source",
    xpPoints: "XP Points",
  },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    xpEvents: "XP Events",
  },

  submissions: {
    duplicateKey: "Duplicate Key",
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    needsReview: "Needs Review?",
    excludeIt: "Exclude It?",
  },

  assets: {
    fileContentHash: "File Content Hash",
    uploadStatus: "Upload Status",
    potentialReuse: "Potential Asset Reuse?",
    duplicateReviewStatus: "Duplicate Review Status",
    enrollment: "Enrollment - Linked",
  },

  unlocks: {
    milestoneSourceKey: "Milestone Source Key",
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    xpEvents: "XP Events",
    createdAt: "Created At",
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
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getCheckbox(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  return record.getCellValue(fieldName) === true;
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function pushSample(bucket, row) {
  if (bucket.length < SAMPLE_LIMIT) bucket.push(row);
}

function bumpSummary(summary, severity) {
  summary[severity] = (summary[severity] || 0) + 1;
}

function hcCompositeKey(enrollmentId, homeworkId, weekId) {
  return `${enrollmentId}|${homeworkId}|${weekId}`;
}

function parseZoomMeetingKey(sourceKey, prefix) {
  if (!sourceKey.startsWith(prefix)) return null;
  const parts = sourceKey.split("|");
  if (parts.length < 3) return null;
  return `${parts[1]}|${parts[2]}`;
}

async function main() {
  const summary = { error: 0, warn: 0, info: 0 };
  const samples = [];

  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  const hwTable = base.getTable(CONFIG.tables.homework);
  const subTable = base.getTable(CONFIG.tables.submissions);
  const assetTable = base.getTable(CONFIG.tables.assets);
  const unlockTable = base.getTable(CONFIG.tables.unlocks);

  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpTable, name));
  const hwFields = Object.values(CONFIG.homework).filter(name => fieldExists(hwTable, name));
  const subFields = Object.values(CONFIG.submissions).filter(name => fieldExists(subTable, name));
  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetTable, name));
  const unlockFields = Object.values(CONFIG.unlocks).filter(name => fieldExists(unlockTable, name));

  const xpQuery = await xpTable.selectRecordsAsync({ fields: xpFields });
  const hwQuery = await hwTable.selectRecordsAsync({ fields: hwFields });
  const subQuery = await subTable.selectRecordsAsync({ fields: subFields });
  const assetQuery = await assetTable.selectRecordsAsync({ fields: assetFields });
  const unlockQuery = await unlockTable.selectRecordsAsync({ fields: unlockFields });

  const activeXpByKey = {};

  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpTable, CONFIG.xpEvents.sourceKey);
    const active = getCheckbox(xp, xpTable, CONFIG.xpEvents.active);

    if (!sourceKey) {
      bumpSummary(summary, "info");
      pushSample(samples, {
        checkId: "DK-06",
        severity: "info",
        recordId: xp.id,
        message: "XP Event missing Source Key",
      });
      continue;
    }

    if (active) {
      if (!activeXpByKey[sourceKey]) activeXpByKey[sourceKey] = [];
      activeXpByKey[sourceKey].push(xp.id);
    }

    if (sourceKey.startsWith("HOMEWORK_XP|")) {
      const expectedHcId = sourceKey.split("|")[1] || "";
      const linkedHc = getLinkedIds(xp, xpTable, CONFIG.xpEvents.homeworkCompletion);
      if (expectedHcId && linkedHc.length && !linkedHc.includes(expectedHcId)) {
        bumpSummary(summary, "error");
        pushSample(samples, {
          checkId: "DK-02",
          severity: "error",
          recordId: xp.id,
          sourceKey,
          message: "HOMEWORK_XP key does not match linked Homework Completion",
          linkedHcIds: linkedHc,
        });
      }
    }
  }

  for (const [sourceKey, ids] of Object.entries(activeXpByKey)) {
    if (ids.length > 1) {
      bumpSummary(summary, "error");
      pushSample(samples, {
        checkId: "DK-01",
        severity: "error",
        recordId: ids[0],
        sourceKey,
        duplicateRecordIds: ids.slice(1),
        message: "Multiple active XP Events share Source Key",
      });
    }
  }

  const hcByComposite = {};
  for (const hc of hwQuery.records) {
    const enrollmentIds = getLinkedIds(hc, hwTable, CONFIG.homework.enrollment);
    const homeworkIds = getLinkedIds(hc, hwTable, CONFIG.homework.homework);
    const weekIds = getLinkedIds(hc, hwTable, CONFIG.homework.week);
    const enrollmentId = enrollmentIds[0] || "";
    const homeworkId = homeworkIds[0] || "";
    const weekId = weekIds[0] || "";
    if (!enrollmentId || !homeworkId || !weekId) continue;

    const key = hcCompositeKey(enrollmentId, homeworkId, weekId);
    if (!hcByComposite[key]) hcByComposite[key] = [];
    hcByComposite[key].push(hc.id);
  }

  for (const [compositeKey, ids] of Object.entries(hcByComposite)) {
    if (ids.length > 1) {
      bumpSummary(summary, "warn");
      pushSample(samples, {
        checkId: "DK-03",
        severity: "warn",
        recordId: ids[0],
        compositeKey,
        duplicateRecordIds: ids.slice(1),
        message: "Multiple Homework Completions for same enrollment+homework+week",
      });
    }
  }

  const subsByDuplicateKey = {};
  for (const sub of subQuery.records) {
    const duplicateKey = getText(sub, subTable, CONFIG.submissions.duplicateKey);
    if (!duplicateKey) continue;
    if (!subsByDuplicateKey[duplicateKey]) subsByDuplicateKey[duplicateKey] = [];
    subsByDuplicateKey[duplicateKey].push(sub.id);
  }

  for (const [duplicateKey, ids] of Object.entries(subsByDuplicateKey)) {
    if (ids.length > 1) {
      bumpSummary(summary, "warn");
      pushSample(samples, {
        checkId: "DK-04",
        severity: "warn",
        recordId: ids[0],
        duplicateKey,
        duplicateRecordIds: ids.slice(1),
        message: "Identical Submission Duplicate Key — flag for owner review; do not auto-delete",
      });
    }
  }

  const unlockXpByKey = {};
  for (const unlock of unlockQuery.records) {
    const key =
      getText(unlock, unlockTable, CONFIG.unlocks.milestoneSourceKey) ||
      getText(unlock, unlockTable, CONFIG.unlocks.sourceKey);
    if (!key) continue;
    const xpIds = getLinkedIds(unlock, unlockTable, CONFIG.unlocks.xpEvents);
    if (xpIds.length > 1) {
      bumpSummary(summary, "error");
      pushSample(samples, {
        checkId: "DK-05",
        severity: "error",
        recordId: unlock.id,
        sourceKey: key,
        xpEventIds: xpIds,
        message: "Achievement unlock links multiple XP Events",
      });
    }
    if (!unlockXpByKey[key]) unlockXpByKey[key] = [];
    unlockXpByKey[key].push(unlock.id);
  }

  for (const [key, ids] of Object.entries(unlockXpByKey)) {
    if (ids.length > 1) {
      bumpSummary(summary, "error");
      pushSample(samples, {
        checkId: "DK-05",
        severity: "error",
        recordId: ids[0],
        sourceKey: key,
        duplicateUnlockIds: ids.slice(1),
        message: "Duplicate achievement unlock rows for same source key",
      });
    }
  }

  for (const asset of assetQuery.records) {
    const hash = getText(asset, assetTable, CONFIG.assets.fileContentHash);
    const uploadStatus = getText(asset, assetTable, CONFIG.assets.uploadStatus);
    const potentialReuse = getCheckbox(asset, assetTable, CONFIG.assets.potentialReuse);
    const reviewStatus = getText(asset, assetTable, CONFIG.assets.duplicateReviewStatus);
    if (!hash || uploadStatus !== "Uploaded") continue;
    if (potentialReuse && !reviewStatus) {
      bumpSummary(summary, "warn");
      pushSample(samples, {
        checkId: "DK-07",
        severity: "warn",
        recordId: asset.id,
        fileContentHash: hash,
        message: "C-023 contextual hash match without Duplicate Review Status",
      });
    }
  }

  const zoomLiveByMeetingEnrollment = {};
  const zoomRecordingByMeetingEnrollment = {};
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpTable, CONFIG.xpEvents.sourceKey);
    const active = getCheckbox(xp, xpTable, CONFIG.xpEvents.active);
    if (!active || !sourceKey) continue;

    const liveKey = parseZoomMeetingKey(sourceKey, "ZOOM_LIVE");
    if (liveKey) {
      if (!zoomLiveByMeetingEnrollment[liveKey]) zoomLiveByMeetingEnrollment[liveKey] = [];
      zoomLiveByMeetingEnrollment[liveKey].push(xp.id);
    }

    const recordingKey = parseZoomMeetingKey(sourceKey, "ZOOM_RECORDING");
    if (recordingKey) {
      if (!zoomRecordingByMeetingEnrollment[recordingKey]) zoomRecordingByMeetingEnrollment[recordingKey] = [];
      zoomRecordingByMeetingEnrollment[recordingKey].push(xp.id);
    }
  }

  for (const meetingEnrollment of Object.keys(zoomLiveByMeetingEnrollment)) {
    if (zoomRecordingByMeetingEnrollment[meetingEnrollment]?.length) {
      bumpSummary(summary, "error");
      pushSample(samples, {
        checkId: "DK-08",
        severity: "error",
        recordId: zoomLiveByMeetingEnrollment[meetingEnrollment][0],
        meetingEnrollmentKey: meetingEnrollment,
        liveXpIds: zoomLiveByMeetingEnrollment[meetingEnrollment],
        recordingXpIds: zoomRecordingByMeetingEnrollment[meetingEnrollment],
        message: "Zoom live and recording XP both active for same meeting+enrollment",
      });
    }
  }

  const report = {
    audit: CONFIG.scriptName,
    version: SCRIPT_VERSION,
    mode: "dry-run",
    summary,
    samples,
    counts: {
      xpEventsScanned: xpQuery.records.length,
      homeworkCompletionsScanned: hwQuery.records.length,
      submissionsScanned: subQuery.records.length,
      submissionAssetsScanned: assetQuery.records.length,
      achievementUnlocksScanned: unlockQuery.records.length,
    },
    note:
      "Read-only C-024 dedupe audit. Owner #3: identical Duplicate Key rows are flagged, not auto-deleted. Owner #4: backfills must skip-correct / create-missing only.",
  };

  console.log("===== AUDIT DEDUPE KEY COVERAGE (C-024) =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
