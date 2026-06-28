/*
Extension Script: Audit Make Upload Engine — Test Submission
System: 127 SI Shooting Challenge
Purpose:
  Read-only, stage-by-stage trace for a Fillout test submission through the Make
  upload engine pipeline. Finds the target enrollment/submission, then reports
  pass / fail / wait at each automation boundary so you can see where processing
  stopped.

  Default test athlete: Schmidt, Testing
  Default expected payload: HW1×2, HW2×2, Video×3 (7 assets total)

Default: read-only (no writes)

Pipeline stages audited:
  A — Find target enrollment + submission
  B — Submission intake (023/005/007)
  C — Source attachments on Submission (Fillout → Airtable)
  D — Asset creation (009)
  E — Child record links (020 homework, 013 video)
  F — Make send queue (070a homework, 070b video)
  G — Make writeback (022) + Drive URLs
  H — Submission XP (010) for shot totals
  I — Weekly Athlete Summary link (031)

Recommended follow-up:
  audit-stuck-upload-processing.js (Processing-without-Drive)
  audit-video-and-homework-attachment-linkage.js (linkage drift)
  Re-run this script after Make finishes — stages F/G may show "wait" until uploads complete.
*/

// @ts-nocheck

const CONFIG = {
  scriptName: "audit-make-upload-engine-test-submission",
  displayName: "AUDIT - Make Upload Engine Test Submission",
  version: "v1.0",

  // --- Edit before run ---
  submissionRecordId: "", // optional: "recSlHaZeBY0MKera" to pin Schmidt test submission
  enrollmentNamePatterns: ["schmidt", "testing"], // all patterns must match (case-insensitive)
  recentHours: 72, // ignore older submissions unless submissionRecordId is set
  maxSubmissions: 3,

  expected: {
    hwSub1Attachments: 2,
    hwSub2Attachments: 2,
    videoAttachments: 3,
    assetsBySlot: { HW1: 2, HW2: 2, VIDEO: 3 },
    totalAssets: 7,
    homeworkCompletionCount: 2,
    videoFeedbackCount: 3,
  },

  stuckProcessingMinutes: 30,

  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
    assets: "Submission Assets",
    homework: "Homework Completions",
    video: "Video Feedback",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  enrollments: {
    fullName: "Full Athlete Name",
    fullNameBackward: "Full Athlete Name - Backward",
    submissions: "Submissions",
  },

  submissions: {
    name: "Submission Full Name",
    athleteName: "Athlete Name",
    enrollment: "Enrollment",
    week: "Week",
    activityDate: "Activity Date",
    submittedAt: "Submitted At",
    countThisSubmission: "Count This Submission?",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
    homeworkName1: "Homework Name 1",
    homeworkName2: "Homework Name 2",
    submissionAssets: "Submission Assets",
    hwSub1: "HW Sub 1",
    hwSub2: "HW Sub 2",
    videoUpload: "Video Upload",
    attachmentUploadStatus: "Attachment Upload Status",
    attachmentUploadError: "Attachment Upload Error",
    shotTotal: "Shot Total",
    totalShotsCanonical: "Total Shots Canonical",
    totalMakesCanonical: "Total Makes Canonical",
  },

  assets: {
    fullName: "Submission Assets Full Name",
    assetLabel: "Asset Label",
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetPurpose: "Asset Purpose",
    assetSlot: "Asset Slot",
    uploadDestination: "Upload Destination",
    attachment: "Airtable Attachment",
    sourceAttachmentId: "Source Attachment ID",
    originalFileName: "Original File Name",
    homeworkCompletions: "Homework Completions",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    sendToMakeTrigger: "Send to Make Trigger",
    readyToSendToMake: "Ready to Send to Make?",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    writebackComplete: "Writeback Complete?",
    uploadedAt: "Uploaded At",
  },

  homework: {
    name: "Homework Completion Full Name",
    submission: "Submissions - Linked",
    submissionAssets: "Submission Assets",
    assetSlot: "Asset Slot",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    googleDriveFileUrl: "Google Drive File URL",
    writebackComplete: "Writeback Complete?",
    awardStatus: "Award Status",
  },

  video: {
    name: "Video Feedback Name",
    submission: "Submission",
    submissionAsset: "Submission Asset",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    googleDriveFileUrl: "Google Drive File URL",
    writebackComplete: "Writeback Complete?",
  },

  xpEvents: {
    sourceKey: "Source Key",
    submission: "Submission",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    uploadDestHomework: "Homework Completions",
    uploadDestVideo: "Video Feedback",
    submissionXpPrefix: "SUBMISSION_XP|",
    xpAwarded: "Awarded",
    statuses: {
      pendingLink: "Pending Link",
      ready: "Ready",
      processing: "Processing",
      uploaded: "Uploaded",
      error: "Error",
    },
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

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

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function attachmentCount(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  return Array.isArray(raw) ? raw.length : 0;
}

function hasAttachment(record, table, fieldName) {
  return attachmentCount(record, table, fieldName) > 0;
}

function minutesSince(isoTime) {
  if (!isoTime) return null;
  const ms = Date.now() - new Date(isoTime).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / 60000));
}

function matchesAllPatterns(text, patterns) {
  const hay = normalizeKey(text);
  if (!hay) return false;
  return patterns.every(pattern => hay.includes(normalizeKey(pattern)));
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function stageResult(stage, label, status, details = {}) {
  return {
    stage,
    label,
    status,
    ...details,
  };
}

function setOutputSafe(name, value) {
  try {
    if (typeof output !== "undefined" && typeof output.set === "function") {
      output.set(name, value);
    }
  } catch {
    // Extension scripting has no output.set — console JSON is the report.
  }
}

function getRecordCreatedMs(record, table, submittedAtField) {
  const fromMeta = record?.createdTime ? new Date(record.createdTime).getTime() : NaN;
  if (Number.isFinite(fromMeta)) return fromMeta;

  if (submittedAtField && fieldExists(table, submittedAtField)) {
    const raw = record.getCellValue(submittedAtField);
    if (raw) {
      const fromField = new Date(raw).getTime();
      if (Number.isFinite(fromField)) return fromField;
    }
    const fromText = String(record.getCellValueAsString(submittedAtField) || "").trim();
    if (fromText) {
      const fromTextMs = new Date(fromText).getTime();
      if (Number.isFinite(fromTextMs)) return fromTextMs;
    }
  }

  return NaN;
}

function worstStatus(statuses) {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("wait")) return "wait";
  if (statuses.includes("skip")) return "skip";
  return "pass";
}

function describeAsset(asset, assetsTable) {
  const slot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot);
  const uploadStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
  const driveUrl = getText(asset, assetsTable, CONFIG.assets.googleDriveFileUrl);
  const driveId = getText(asset, assetsTable, CONFIG.assets.googleDriveFileId);
  const uploadError = getText(asset, assetsTable, CONFIG.assets.uploadError);
  const sendTrigger = getCheckbox(asset, assetsTable, CONFIG.assets.sendToMakeTrigger);
  const readyToSend = getText(asset, assetsTable, CONFIG.assets.readyToSendToMake);
  const dest = getText(asset, assetsTable, CONFIG.assets.uploadDestination);
  const hwIds = getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions);
  const vfIds = getLinkedIds(asset, assetsTable, CONFIG.assets.videoFeedback);
  const hasFile =
    hasAttachment(asset, assetsTable, CONFIG.assets.attachment) || Boolean(driveUrl);

  return {
    id: asset.id,
    name:
      getText(asset, assetsTable, CONFIG.assets.fullName) ||
      getText(asset, assetsTable, CONFIG.assets.assetLabel) ||
      asset.name,
    slot,
    purpose: getSelectName(asset, assetsTable, CONFIG.assets.assetPurpose),
    uploadDestination: dest,
    uploadStatus,
    uploadError,
    sendToMakeTrigger: sendTrigger,
    readyToSendToMake: readyToSend,
    hasAttachment: hasFile,
    googleDriveFileUrl: driveUrl,
    googleDriveFileId: driveId,
    writebackComplete: getCheckbox(asset, assetsTable, CONFIG.assets.writebackComplete),
    homeworkCompletionIds: hwIds,
    videoFeedbackIds: vfIds,
    sourceAttachmentId: getText(asset, assetsTable, CONFIG.assets.sourceAttachmentId),
    originalFileName: getText(asset, assetsTable, CONFIG.assets.originalFileName),
    ageMinutes: minutesSince(asset.lastModifiedTime),
  };
}

function inferUploadDestination(assetDetail) {
  const dest = normalizeText(assetDetail.uploadDestination);
  if (dest) return dest;

  const slot = normalizeKey(assetDetail.slot);
  const purpose = normalizeKey(assetDetail.purpose);

  if (slot === "hw1" || slot === "hw2" || purpose.includes("homework")) {
    return CONFIG.values.uploadDestHomework;
  }
  if (slot === "video" || purpose.includes("video")) {
    return CONFIG.values.uploadDestVideo;
  }
  return "";
}

function evaluateAssetMakeStages(asset, assetsTable) {
  const a = describeAsset(asset, assetsTable);
  const uploadDestination = inferUploadDestination(a);
  const checks = [];
  const blockers = [];
  let makeQueueStatus = "pass";
  let writebackStatus = "pass";

  const isHomework = uploadDestination === CONFIG.values.uploadDestHomework;
  const isVideo = uploadDestination === CONFIG.values.uploadDestVideo;
  const childIds = isHomework ? a.homeworkCompletionIds : isVideo ? a.videoFeedbackIds : [];
  const childType = isHomework ? "Homework Completion" : isVideo ? "Video Feedback" : "";

  if (!a.hasAttachment) {
    blockers.push("asset_missing_attachment");
    makeQueueStatus = "fail";
    writebackStatus = "fail";
  }

  if (isHomework || isVideo) {
    if (childIds.length === 0) {
      blockers.push(`missing_${isHomework ? "homework_completion" : "video_feedback"}_link`);
      makeQueueStatus = "fail";
      writebackStatus = "fail";
    } else if (childIds.length > 1 && isVideo) {
      blockers.push("multiple_video_feedback_links");
      makeQueueStatus = "fail";
    }
  } else if (uploadDestination) {
    blockers.push("unexpected_upload_destination");
    makeQueueStatus = "fail";
  }

  const statusKey = normalizeKey(a.uploadStatus);

  if (statusKey === normalizeKey(CONFIG.values.statuses.error)) {
    blockers.push(a.uploadError || "upload_status_error");
    makeQueueStatus = "fail";
    writebackStatus = "fail";
  } else if (
    statusKey === normalizeKey(CONFIG.values.statuses.processing) &&
    !a.googleDriveFileUrl &&
    !a.googleDriveFileId
  ) {
    const recent =
      a.ageMinutes !== null && a.ageMinutes < CONFIG.stuckProcessingMinutes;
    blockers.push(recent ? "processing_wait_for_make" : "stuck_processing_no_drive");
    makeQueueStatus = recent ? "wait" : "fail";
    writebackStatus = recent ? "wait" : "fail";
  } else if (statusKey === normalizeKey(CONFIG.values.statuses.pendingLink)) {
    if (childIds.length > 0 && a.sendToMakeTrigger) {
      checks.push("pending_link_with_send_trigger_ready_for_070");
      makeQueueStatus = "wait";
    } else if (childIds.length > 0 && !a.sendToMakeTrigger) {
      blockers.push("child_linked_but_send_trigger_not_checked");
      makeQueueStatus = "fail";
    } else {
      blockers.push("still_pending_link_before_020_or_013");
      makeQueueStatus = "fail";
    }
    writebackStatus = "wait";
  } else if (statusKey === normalizeKey(CONFIG.values.statuses.uploaded)) {
    if (!a.googleDriveFileUrl && !a.googleDriveFileId) {
      blockers.push("uploaded_status_missing_drive_url");
      writebackStatus = "fail";
    } else {
      checks.push("drive_url_present");
    }
    if (a.sendToMakeTrigger) {
      blockers.push("send_trigger_still_checked_after_upload");
      writebackStatus = "fail";
    } else {
      checks.push("send_trigger_cleared");
    }
  } else if (statusKey === normalizeKey(CONFIG.values.statuses.ready)) {
    blockers.push("upload_status_ready_use_pending_link_ladder");
    makeQueueStatus = "fail";
  } else if (!statusKey) {
    blockers.push("missing_upload_status");
    makeQueueStatus = "fail";
    writebackStatus = "fail";
  }

  return {
    ...a,
    childType,
    childIds,
    makeQueue: { status: makeQueueStatus, checks, blockers },
    writeback: { status: writebackStatus, checks, blockers },
  };
}

function describeHomework(hw, homeworkTable, assetsById) {
  const assetIds = getLinkedIds(hw, homeworkTable, CONFIG.homework.submissionAssets);
  const assets = assetIds.map(id => assetsById.get(id)).filter(Boolean);
  return {
    id: hw.id,
    name: getText(hw, homeworkTable, CONFIG.homework.name) || hw.name,
    slot: getSelectName(hw, homeworkTable, CONFIG.homework.assetSlot),
    submissionId: getFirstLinkedId(hw, homeworkTable, CONFIG.homework.submission),
    linkedAssetIds: assetIds,
    linkedAssetCount: assetIds.length,
    uploadStatus: getSelectName(hw, homeworkTable, CONFIG.homework.uploadStatus),
    uploadError: getText(hw, homeworkTable, CONFIG.homework.uploadError),
    googleDriveFileUrl: getText(hw, homeworkTable, CONFIG.homework.googleDriveFileUrl),
    writebackComplete: getCheckbox(hw, homeworkTable, CONFIG.homework.writebackComplete),
    awardStatus: getSelectName(hw, homeworkTable, CONFIG.homework.awardStatus),
    assets: assets.map(asset => describeAsset(asset, base.getTable(CONFIG.tables.assets))),
  };
}

function describeVideo(vf, videoTable) {
  return {
    id: vf.id,
    name: getText(vf, videoTable, CONFIG.video.name) || vf.name,
    submissionId: getFirstLinkedId(vf, videoTable, CONFIG.video.submission),
    submissionAssetId: getFirstLinkedId(vf, videoTable, CONFIG.video.submissionAsset),
    uploadStatus: getSelectName(vf, videoTable, CONFIG.video.uploadStatus),
    uploadError: getText(vf, videoTable, CONFIG.video.uploadError),
    googleDriveFileUrl: getText(vf, videoTable, CONFIG.video.googleDriveFileUrl),
    writebackComplete: getCheckbox(vf, videoTable, CONFIG.video.writebackComplete),
  };
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const videoTable = base.getTable(CONFIG.tables.video);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const enrollmentFields = Object.values(CONFIG.enrollments).filter(name =>
    fieldExists(enrollmentsTable, name)
  );
  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const assetFields = Object.values(CONFIG.assets).filter(name =>
    fieldExists(assetsTable, name)
  );
  const homeworkFields = Object.values(CONFIG.homework).filter(name =>
    fieldExists(homeworkTable, name)
  );
  const videoFields = Object.values(CONFIG.video).filter(name =>
    fieldExists(videoTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name =>
    fieldExists(xpEventsTable, name)
  );
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [
    enrollmentQuery,
    submissionQuery,
    assetQuery,
    homeworkQuery,
    videoQuery,
    xpQuery,
    summaryQuery,
  ] = await Promise.all([
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    videoTable.selectRecordsAsync({ fields: videoFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const assetsById = new Map(assetQuery.records.map(record => [record.id, record]));
  const assetsBySubmission = new Map();
  for (const asset of assetQuery.records) {
    const submissionId = getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission);
    if (!submissionId) continue;
    if (!assetsBySubmission.has(submissionId)) assetsBySubmission.set(submissionId, []);
    assetsBySubmission.get(submissionId).push(asset);
  }

  const homeworkBySubmission = new Map();
  for (const hw of homeworkQuery.records) {
    const submissionId = getFirstLinkedId(hw, homeworkTable, CONFIG.homework.submission);
    if (!submissionId) continue;
    if (!homeworkBySubmission.has(submissionId)) homeworkBySubmission.set(submissionId, []);
    homeworkBySubmission.get(submissionId).push(hw);
  }

  const videoBySubmission = new Map();
  for (const vf of videoQuery.records) {
    for (const submissionId of getLinkedIds(vf, videoTable, CONFIG.video.submission)) {
      if (!videoBySubmission.has(submissionId)) videoBySubmission.set(submissionId, []);
      videoBySubmission.get(submissionId).push(vf);
    }
  }

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (sourceKey) xpBySourceKey.set(sourceKey, xp.id);
  }

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    const weekId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week);
    if (enrollmentId && weekId) {
      summaryIndex.set(buildSummaryIndexKey(enrollmentId, weekId), summary.id);
    }
  }

  const matchingEnrollments = enrollmentQuery.records.filter(record => {
    const names = [
      getText(record, enrollmentsTable, CONFIG.enrollments.fullName),
      getText(record, enrollmentsTable, CONFIG.enrollments.fullNameBackward),
    ].filter(Boolean);
    return names.some(name => matchesAllPatterns(name, CONFIG.enrollmentNamePatterns));
  });

  const cutoffMs = CONFIG.submissionRecordId
    ? 0
    : Date.now() - CONFIG.recentHours * 60 * 60 * 1000;

  const enrollmentIds = new Set(matchingEnrollments.map(record => record.id));

  const submissionIdsFromEnrollment = new Set();
  for (const enrollment of matchingEnrollments) {
    for (const submissionId of getLinkedIds(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.submissions
    )) {
      submissionIdsFromEnrollment.add(submissionId);
    }
  }

  const submissionById = new Map(submissionQuery.records.map(record => [record.id, record]));

  let targetSubmissions = submissionQuery.records.filter(submission => {
    if (CONFIG.submissionRecordId) {
      return submission.id === CONFIG.submissionRecordId;
    }

    const linkedEnrollment = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.enrollment);
    const linkedFromEnrollmentSide = submissionIdsFromEnrollment.has(submission.id);
    const enrollmentMatch =
      enrollmentIds.has(linkedEnrollment) || linkedFromEnrollmentSide;

    if (!enrollmentMatch) return false;

    const createdMs = getRecordCreatedMs(
      submission,
      submissionsTable,
      CONFIG.submissions.submittedAt
    );
    if (!Number.isFinite(createdMs)) {
      // No reliable timestamp — keep if linked to target enrollment.
      return linkedFromEnrollmentSide || enrollmentIds.has(linkedEnrollment);
    }
    return createdMs >= cutoffMs;
  });

  // Fallback: submission linked on enrollment but missing from filtered query fields load.
  if (!CONFIG.submissionRecordId) {
    for (const submissionId of submissionIdsFromEnrollment) {
      const submission = submissionById.get(submissionId);
      if (!submission || targetSubmissions.some(row => row.id === submissionId)) continue;

      const createdMs = getRecordCreatedMs(
        submission,
        submissionsTable,
        CONFIG.submissions.submittedAt
      );
      if (!Number.isFinite(createdMs) || createdMs >= cutoffMs) {
        targetSubmissions.push(submission);
      }
    }
  }

  targetSubmissions.sort((a, b) => {
    const aMs = getRecordCreatedMs(a, submissionsTable, CONFIG.submissions.submittedAt);
    const bMs = getRecordCreatedMs(b, submissionsTable, CONFIG.submissions.submittedAt);
    return (bMs || 0) - (aMs || 0);
  });
  targetSubmissions = targetSubmissions.slice(0, CONFIG.maxSubmissions);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    generatedAt: new Date().toISOString(),
    filter: {
      submissionRecordId: CONFIG.submissionRecordId || null,
      enrollmentNamePatterns: CONFIG.enrollmentNamePatterns,
      recentHours: CONFIG.recentHours,
      expected: CONFIG.expected,
    },
    matchingEnrollments: matchingEnrollments.map(record => ({
      id: record.id,
      fullName: getText(record, enrollmentsTable, CONFIG.enrollments.fullName),
      fullNameBackward: getText(record, enrollmentsTable, CONFIG.enrollments.fullNameBackward),
    })),
    submissionsFound: targetSubmissions.length,
    submissionReports: [],
    overallStatus: "pass",
  };

  if (matchingEnrollments.length === 0 && !CONFIG.submissionRecordId) {
    report.overallStatus = "fail";
    report.blocker = "no_enrollment_match";
    report.nextAction =
      "Confirm test athlete exists in Enrollments and update enrollmentNamePatterns in CONFIG.";
    console.log(JSON.stringify(report, null, 2));
    setOutputSafe("statusOut", "error");
    setOutputSafe("errorOut", report.blocker);
    return;
  }

  if (targetSubmissions.length === 0) {
    report.overallStatus = "fail";
    report.blocker = "no_recent_submission";
    report.nextAction = CONFIG.submissionRecordId
      ? `Submission ${CONFIG.submissionRecordId} not found.`
      : "Submit the Fillout test form, then re-run this audit (or set submissionRecordId).";
    report.debug = {
      enrollmentSubmissionLinkIds: [...submissionIdsFromEnrollment],
      submissionsInBase: submissionQuery.records.length,
      hint:
        submissionIdsFromEnrollment.size > 0
          ? "Enrollment has linked submissions but time/enrollment filter excluded them — set submissionRecordId."
          : "No submissions linked on enrollment yet — check Fillout/023 intake.",
    };
    console.log(JSON.stringify(report, null, 2));
    setOutputSafe("statusOut", "error");
    setOutputSafe("errorOut", report.blocker);
    return;
  }

  for (const submission of targetSubmissions) {
    const submissionId = submission.id;
    const submissionName = getText(submission, submissionsTable, CONFIG.submissions.name) || submission.name;
    const enrollmentId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.enrollment);
    const weekId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.week);
    const stages = [];

    // --- Stage A ---
    stages.push(
      stageResult("A", "Find target", "pass", {
        submissionId,
        submissionName,
        enrollmentId,
        createdTime:
          submission.createdTime ||
          getText(submission, submissionsTable, CONFIG.submissions.submittedAt),
        ageMinutes: minutesSince(
          submission.createdTime ||
            getText(submission, submissionsTable, CONFIG.submissions.submittedAt)
        ),
      })
    );

    // --- Stage B: Submission intake ---
    const intakeChecks = [];
    const intakeBlockers = [];
    if (!enrollmentId) intakeBlockers.push("missing_enrollment");
    if (!weekId) intakeBlockers.push("missing_week");
    if (!getText(submission, submissionsTable, CONFIG.submissions.activityDate)) {
      intakeBlockers.push("missing_activity_date");
    }

    const shotTotal =
      getNumberish(submission, submissionsTable, CONFIG.submissions.totalShotsCanonical) ||
      getNumberish(submission, submissionsTable, CONFIG.submissions.shotTotal);
    const makesTotal = getNumberish(submission, submissionsTable, CONFIG.submissions.totalMakesCanonical);

    if (shotTotal <= 0) intakeBlockers.push("zero_or_missing_shot_total");
    else intakeChecks.push(`shots=${shotTotal}`);

    if (makesTotal > 0) intakeChecks.push(`makes=${makesTotal}`);

    const counted = getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission);
    if (counted !== 1) intakeBlockers.push("count_this_submission_not_checked");

    stages.push(
      stageResult("B", "Submission intake (023/005/007)", intakeBlockers.length ? "fail" : "pass", {
        automation: "023, 005, 007",
        checks: intakeChecks,
        blockers: intakeBlockers,
        attachmentUploadStatus: getSelectName(
          submission,
          submissionsTable,
          CONFIG.submissions.attachmentUploadStatus
        ),
        attachmentUploadError: getText(
          submission,
          submissionsTable,
          CONFIG.submissions.attachmentUploadError
        ),
        shotTotal,
        makesTotal,
        countThisSubmission: counted,
      })
    );

    // --- Stage C: Source attachments ---
    const hw1Count = attachmentCount(submission, submissionsTable, CONFIG.submissions.hwSub1);
    const hw2Count = attachmentCount(submission, submissionsTable, CONFIG.submissions.hwSub2);
    const videoCount = attachmentCount(submission, submissionsTable, CONFIG.submissions.videoUpload);

    const attachmentChecks = [];
    const attachmentBlockers = [];

    function expectAttachment(label, actual, expected) {
      attachmentChecks.push(`${label}: ${actual}/${expected}`);
      if (actual !== expected) attachmentBlockers.push(`${label}_count_${actual}_expected_${expected}`);
    }

    expectAttachment("HW Sub 1", hw1Count, CONFIG.expected.hwSub1Attachments);
    expectAttachment("HW Sub 2", hw2Count, CONFIG.expected.hwSub2Attachments);
    expectAttachment("Video Upload", videoCount, CONFIG.expected.videoAttachments);

    stages.push(
      stageResult("C", "Fillout source attachments", attachmentBlockers.length ? "fail" : "pass", {
        checks: attachmentChecks,
        blockers: attachmentBlockers,
        homeworkName1Id: getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName1),
        homeworkName2Id: getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName2),
      })
    );

    // --- Stage D: Assets (009) ---
    const assets = assetsBySubmission.get(submissionId) || [];
    const assetsBySlot = { HW1: [], HW2: [], VIDEO: [], OTHER: [] };

    for (const asset of assets) {
      const slot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot) || "OTHER";
      if (assetsBySlot[slot]) assetsBySlot[slot].push(asset);
      else assetsBySlot.OTHER.push(asset);
    }

    const assetBlockers = [];
    const assetChecks = [];

    assetChecks.push(`total_assets=${assets.length}/${CONFIG.expected.totalAssets}`);
    if (assets.length !== CONFIG.expected.totalAssets) {
      assetBlockers.push(`asset_count_${assets.length}_expected_${CONFIG.expected.totalAssets}`);
    }

    for (const [slot, expectedCount] of Object.entries(CONFIG.expected.assetsBySlot)) {
      const actual = (assetsBySlot[slot] || []).length;
      assetChecks.push(`${slot}=${actual}/${expectedCount}`);
      if (actual !== expectedCount) {
        assetBlockers.push(`${slot}_asset_count_${actual}_expected_${expectedCount}`);
      }
    }

    for (const asset of assets) {
      const submissionLink = getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission);
      const enrollmentLink = getFirstLinkedId(asset, assetsTable, CONFIG.assets.enrollment);
      if (submissionLink !== submissionId) assetBlockers.push(`asset_${asset.id}_wrong_submission_link`);
      if (!enrollmentLink) assetBlockers.push(`asset_${asset.id}_missing_enrollment_link`);
      if (!getText(asset, assetsTable, CONFIG.assets.sourceAttachmentId)) {
        assetBlockers.push(`asset_${asset.id}_missing_source_attachment_id`);
      }
    }

    const assetDetails = assets.map(asset => describeAsset(asset, assetsTable));

    stages.push(
      stageResult("D", "Asset creation (009)", assetBlockers.length ? "fail" : "pass", {
        automation: "009",
        checks: assetChecks,
        blockers: assetBlockers,
        assets: assetDetails,
      })
    );

    // --- Stage E: Child links (020 / 013) ---
    const homeworkRows = (homeworkBySubmission.get(submissionId) || []).map(hw =>
      describeHomework(hw, homeworkTable, assetsById)
    );
    const videoRows = (videoBySubmission.get(submissionId) || []).map(vf =>
      describeVideo(vf, videoTable)
    );

    const childBlockers = [];
    const childChecks = [];

    childChecks.push(`homework_completions=${homeworkRows.length}/${CONFIG.expected.homeworkCompletionCount}`);
    if (homeworkRows.length !== CONFIG.expected.homeworkCompletionCount) {
      childBlockers.push(
        `homework_completion_count_${homeworkRows.length}_expected_${CONFIG.expected.homeworkCompletionCount}`
      );
    }

    childChecks.push(`video_feedback=${videoRows.length}/${CONFIG.expected.videoFeedbackCount}`);
    if (videoRows.length !== CONFIG.expected.videoFeedbackCount) {
      childBlockers.push(
        `video_feedback_count_${videoRows.length}_expected_${CONFIG.expected.videoFeedbackCount}`
      );
    }

    for (const hw of homeworkRows) {
      if (hw.linkedAssetCount === 0) {
        childBlockers.push(`homework_${hw.id}_no_linked_assets`);
      } else {
        childChecks.push(`${hw.slot || "?"}_hw_links_${hw.linkedAssetCount}_assets`);
      }
      if (!hw.submissionId || hw.submissionId !== submissionId) {
        childBlockers.push(`homework_${hw.id}_submission_link_mismatch`);
      }
    }

    for (const asset of assets) {
      const slot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot);
      const purpose = getSelectName(asset, assetsTable, CONFIG.assets.assetPurpose);
      const dest =
        getText(asset, assetsTable, CONFIG.assets.uploadDestination) ||
        inferUploadDestination(describeAsset(asset, assetsTable));

      if (dest === CONFIG.values.uploadDestHomework || slot === "HW1" || slot === "HW2") {
        const hwLink = getFirstLinkedId(asset, assetsTable, CONFIG.assets.homeworkCompletions);
        if (!hwLink) childBlockers.push(`hw_asset_${asset.id}_missing_homework_completion`);
      }
      if (
        dest === CONFIG.values.uploadDestVideo ||
        slot === "VIDEO" ||
        purpose === "Video For Feedback"
      ) {
        const vfLink = getFirstLinkedId(asset, assetsTable, CONFIG.assets.videoFeedback);
        if (!vfLink) childBlockers.push(`video_asset_${asset.id}_missing_video_feedback`);
      }
    }

    for (const vf of videoRows) {
      if (!vf.submissionAssetId) childBlockers.push(`video_feedback_${vf.id}_missing_submission_asset`);
      if (vf.submissionId !== submissionId) childBlockers.push(`video_feedback_${vf.id}_submission_mismatch`);
    }

    stages.push(
      stageResult("E", "Child record links (020 / 013)", childBlockers.length ? "fail" : "pass", {
        automation: "020, 013",
        checks: childChecks,
        blockers: childBlockers,
        homeworkCompletions: homeworkRows,
        videoFeedback: videoRows,
      })
    );

    // --- Stage F & G: per-asset Make queue + writeback ---
    const assetPipeline = assets.map(asset => evaluateAssetMakeStages(asset, assetsTable));
    const makeBlockers = [];
    const writebackBlockers = [];
    const makeWaits = [];
    const writebackWaits = [];

    for (const row of assetPipeline) {
      makeBlockers.push(...row.makeQueue.blockers.map(item => `${row.id}:${item}`));
      writebackBlockers.push(...row.writeback.blockers.map(item => `${row.id}:${item}`));
      if (row.makeQueue.status === "wait") makeWaits.push(row.id);
      if (row.writeback.status === "wait") writebackWaits.push(row.id);
    }

    const makeStatus = worstStatus(assetPipeline.map(row => row.makeQueue.status));
    const writebackStatus = worstStatus(assetPipeline.map(row => row.writeback.status));

    stages.push(
      stageResult("F", "Make send queue (070a / 070b)", makeStatus, {
        automation: "070a, 070b",
        blockers: makeBlockers,
        waitingAssetIds: makeWaits,
        assets: assetPipeline.map(row => ({
          id: row.id,
          name: row.name,
          slot: row.slot,
          uploadStatus: row.uploadStatus,
          sendToMakeTrigger: row.sendToMakeTrigger,
          readyToSendToMake: row.readyToSendToMake,
          childType: row.childType,
          childIds: row.childIds,
          status: row.makeQueue.status,
          blockers: row.makeQueue.blockers,
        })),
        nextAction:
          makeWaits.length > 0
            ? "Make may still be processing — wait a few minutes and re-run this audit."
            : makeBlockers.length > 0
              ? "Check Make scenario history (070a/070b) and Airtable automation runs for 020/013/070."
              : null,
      })
    );

    stages.push(
      stageResult("G", "Make writeback (022) + Drive URLs", writebackStatus, {
        automation: "022",
        blockers: writebackBlockers,
        waitingAssetIds: writebackWaits,
        assets: assetPipeline.map(row => ({
          id: row.id,
          name: row.name,
          slot: row.slot,
          uploadStatus: row.uploadStatus,
          googleDriveFileUrl: row.googleDriveFileUrl,
          writebackComplete: row.writebackComplete,
          status: row.writeback.status,
          blockers: row.writeback.blockers,
        })),
        homeworkWriteback: homeworkRows.map(hw => ({
          id: hw.id,
          name: hw.name,
          uploadStatus: hw.uploadStatus,
          googleDriveFileUrl: hw.googleDriveFileUrl,
          writebackComplete: hw.writebackComplete,
        })),
        videoWriteback: videoRows.map(vf => ({
          id: vf.id,
          name: vf.name,
          uploadStatus: vf.uploadStatus,
          googleDriveFileUrl: vf.googleDriveFileUrl,
          writebackComplete: vf.writebackComplete,
        })),
      })
    );

    // --- Stage H: Submission XP ---
    const expectedXpKey = `${CONFIG.values.submissionXpPrefix}${submissionId}`;
    const xpEventId = xpBySourceKey.get(expectedXpKey) || "";
    const linkedXpIds = getLinkedIds(submission, submissionsTable, CONFIG.submissions.xpEvents);
    const xpAwardStatus = getSelectName(submission, submissionsTable, CONFIG.submissions.xpAwardStatus);

    const xpBlockers = [];
    if (!xpEventId && linkedXpIds.length === 0) xpBlockers.push("missing_submission_xp_event");
    if (xpAwardStatus !== CONFIG.values.xpAwarded && (xpEventId || linkedXpIds.length > 0)) {
      xpBlockers.push("xp_award_status_not_awarded");
    }

    stages.push(
      stageResult("H", "Submission XP (010)", xpBlockers.length ? "fail" : "pass", {
        automation: "010",
        expectedSourceKey: expectedXpKey,
        xpEventId: xpEventId || linkedXpIds[0] || "",
        xpAwardStatus,
        blockers: xpBlockers,
        note:
          shotTotal > 500
            ? "Large shot total — confirm XP amount on XP Event record manually."
            : null,
      })
    );

    // --- Stage I: Weekly summary ---
    const weeklySummaryId = getFirstLinkedId(
      submission,
      submissionsTable,
      CONFIG.submissions.weeklySummary
    );
    const expectedSummaryId =
      enrollmentId && weekId
        ? summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || ""
        : "";

    const summaryBlockers = [];
    if (enrollmentId && weekId && !weeklySummaryId) {
      summaryBlockers.push(
        expectedSummaryId ? "missing_weekly_summary_link" : "missing_weekly_summary_record"
      );
    }

    stages.push(
      stageResult("I", "Weekly Athlete Summary (031)", summaryBlockers.length ? "fail" : "pass", {
        automation: "031",
        weeklySummaryId,
        expectedSummaryId,
        blockers: summaryBlockers,
      })
    );

    const submissionStatus = worstStatus(stages.map(stage => stage.status));
    const failedStages = stages.filter(stage => stage.status === "fail").map(stage => stage.stage);
    const waitingStages = stages.filter(stage => stage.status === "wait").map(stage => stage.stage);

    report.submissionReports.push({
      submissionId,
      submissionName,
      createdTime:
        submission.createdTime ||
        getText(submission, submissionsTable, CONFIG.submissions.submittedAt),
      overallStatus: submissionStatus,
      failedStages,
      waitingStages,
      firstFailedStage: failedStages[0] || null,
      stages,
    });
  }

  const allStatuses = report.submissionReports.map(item => item.overallStatus);
  report.overallStatus = worstStatus(allStatuses);

  const firstBroken = report.submissionReports.find(item => item.overallStatus !== "pass");
  if (firstBroken) {
    report.summary = {
      submissionId: firstBroken.submissionId,
      submissionName: firstBroken.submissionName,
      overallStatus: firstBroken.overallStatus,
      firstFailedStage: firstBroken.firstFailedStage,
      waitingStages: firstBroken.waitingStages,
      stageRollup: firstBroken.stages.map(stage => ({
        stage: stage.stage,
        label: stage.label,
        status: stage.status,
      })),
    };
  }

  console.log("===== MAKE UPLOAD ENGINE TEST SUBMISSION AUDIT =====");
  console.log(JSON.stringify(report, null, 2));

  if (report.summary) {
    console.log("\n--- Stage rollup (first non-pass submission) ---");
    for (const row of report.summary.stageRollup) {
      console.log(`${row.stage} ${row.label}: ${row.status.toUpperCase()}`);
    }
  }

  setOutputSafe("statusOut", report.overallStatus === "pass" ? "success" : "error");
  setOutputSafe("overallStatus", report.overallStatus);
  setOutputSafe("submissionsFound", report.submissionsFound);
  if (report.summary) {
    setOutputSafe("firstFailedStage", report.summary.firstFailedStage || "");
    setOutputSafe("submissionId", report.summary.submissionId);
  }
}

await main();
