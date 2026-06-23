/*
Extension Script: Audit Submission Pipeline Integrity
System: 127 SI Shooting Challenge
Purpose:
  Read-only end-to-end check from Submissions through intake links, assets,
  Weekly Athlete Summary, and submission XP Events. Use before backfills to
  see what is missing on counted submissions.

Default: read-only (no writes)

Recommended follow-up backfills (in order):
  1. backfill-submission-pipeline-links.js (when available)
  2. backfill-missing-weekly-summaries-and-xp-links.js
  3. backfill-xp-event-weekly-summary-links.js
  4. backfill-homework-completion-upload-status.js / edge-cases
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const ONLY_COUNTED_SUBMISSIONS = true;

const CONFIG = {
  tables: {
    submissions: "Submissions",
    assets: "Submission Assets",
    homework: "Homework Completions",
    video: "Video Feedback",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    activityDate: "Activity Date",
    countThisSubmission: "Count This Submission?",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
    homeworkName1: "Homework Name 1",
    homeworkName2: "Homework Name 2",
    submissionAssets: "Submission Assets",
  },

  assets: {
    submission: "Submission - Linked",
    uploadDestination: "Upload Destination",
    assetPurpose: "Asset Purpose",
    attachment: "Airtable Attachment",
    homeworkCompletions: "Homework Completions",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    googleDriveFileUrl: "Google Drive File URL",
  },

  homework: {
    submission: "Submissions - Linked",
    homework: "Homework",
    assetSlot: "Asset Slot",
    submissionAssets: "Submission Assets",
    uploadStatus: "Upload Status",
    awardStatus: "Award Status",
    xpEvents: "XP Events",
  },

  video: {
    submissionAsset: "Submission Asset",
    uploadStatus: "Upload Status",
    xpEvents: "XP Events",
  },

  xpEvents: {
    sourceKey: "Source Key",
    submission: "Submission",
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    submissionXpPrefix: "SUBMISSION_XP|",
    homeworkXpPrefix: "HOMEWORK_XP|",
    uploadDestHomework: "Homework Completions",
    uploadDestVideo: "Video Feedback",
    xpAwarded: "Awarded",
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

function hasAttachments(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return Array.isArray(raw) && raw.length > 0;
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function inferSlotFromAsset(asset, assetsTable) {
  const slot = getSelectName(asset, assetsTable, CONFIG.assets.assetPurpose);
  if (slot === "Homework 1") return "HW1";
  if (slot === "Homework 2") return "HW2";
  return "";
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const videoTable = base.getTable(CONFIG.tables.video);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const submissionFields = [
    CONFIG.submissions.enrollment,
    CONFIG.submissions.week,
    CONFIG.submissions.weeklySummary,
    CONFIG.submissions.activityDate,
    CONFIG.submissions.countThisSubmission,
    CONFIG.submissions.xpAwardStatus,
    CONFIG.submissions.xpEvents,
    CONFIG.submissions.homeworkName1,
    CONFIG.submissions.homeworkName2,
    CONFIG.submissions.submissionAssets,
  ].filter(name => fieldExists(submissionsTable, name));

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

  const [submissionQuery, assetQuery, homeworkQuery, videoQuery, xpQuery, summaryQuery] =
    await Promise.all([
      submissionsTable.selectRecordsAsync({ fields: submissionFields }),
      assetsTable.selectRecordsAsync({ fields: assetFields }),
      homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
      videoTable.selectRecordsAsync({ fields: videoFields }),
      xpEventsTable.selectRecordsAsync({ fields: xpFields }),
      weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
    ]);

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    const weekId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week);
    if (enrollmentId && weekId) {
      summaryIndex.set(buildSummaryIndexKey(enrollmentId, weekId), summary.id);
    }
  }

  const xpBySourceKey = new Map();
  const xpBySubmissionId = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (sourceKey) xpBySourceKey.set(sourceKey, xp.id);
    for (const submissionId of getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.submission)) {
      if (!xpBySubmissionId.has(submissionId)) {
        xpBySubmissionId.set(submissionId, xp.id);
      }
    }
  }

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

  const findings = [];
  const issueCounts = {};

  function bump(issue) {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }

  for (const submission of submissionQuery.records) {
    if (ONLY_COUNTED_SUBMISSIONS) {
      const counted = getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission);
      if (counted !== 1) continue;
    }

    const submissionId = submission.id;
    const enrollmentId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.enrollment);
    const weekId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.week);
    const weeklySummaryId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.weeklySummary);
    const expectedSummaryId =
      enrollmentId && weekId
        ? summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || ""
        : "";

    const expectedXpSourceKey = `${CONFIG.values.submissionXpPrefix}${submissionId}`;
    const xpByKey = xpBySourceKey.get(expectedXpSourceKey) || "";
    const xpByLink = xpBySubmissionId.get(submissionId) || "";
    const linkedXpIds = getLinkedIds(submission, submissionsTable, CONFIG.submissions.xpEvents);
    const xpAwardStatus = getSelectName(submission, submissionsTable, CONFIG.submissions.xpAwardStatus);

    const homework1Id = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName1);
    const homework2Id = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName2);

    const assets = assetsBySubmission.get(submissionId) || [];
    const homeworkRows = homeworkBySubmission.get(submissionId) || [];

    const issues = [];

    if (!enrollmentId) {
      issues.push({
        issue: "missing_enrollment",
        recommendedAction: "Run 023 or backfill-submission-pipeline-links",
      });
    }

    if (!weekId) {
      issues.push({
        issue: "missing_week",
        recommendedAction: "Run 005 or backfill-submission-pipeline-links",
      });
    }

    if (!getText(submission, submissionsTable, CONFIG.submissions.activityDate)) {
      issues.push({
        issue: "missing_activity_date",
        recommendedAction: "Manual fix on Submission or intake review",
      });
    }

    if (enrollmentId && weekId && !weeklySummaryId) {
      issues.push({
        issue: expectedSummaryId ? "missing_weekly_summary_link" : "missing_weekly_summary_record",
        expectedSummaryId,
        recommendedAction: expectedSummaryId
          ? "Run 031 or backfill-submission-pipeline-links"
          : "Run backfill-missing-weekly-summaries-and-xp-links",
      });
    }

    if (enrollmentId && weekId && weeklySummaryId && expectedSummaryId && weeklySummaryId !== expectedSummaryId) {
      issues.push({
        issue: "weekly_summary_mismatch",
        expectedSummaryId,
        recommendedAction: "Manual review: link Submission to canonical WAS for enrollment+week",
      });
    }

    if (!xpByKey && !xpByLink && linkedXpIds.length === 0) {
      issues.push({
        issue: "missing_submission_xp_event",
        expectedSourceKey: expectedXpSourceKey,
        recommendedAction: "Re-run 010 or backfill-submission-xp-events (planned)",
      });
    } else if (!xpByKey && (xpByLink || linkedXpIds.length > 0)) {
      issues.push({
        issue: "submission_xp_source_key_mismatch",
        expectedSourceKey: expectedXpSourceKey,
        xpEventId: xpByLink || linkedXpIds[0],
        recommendedAction: "Review XP Event Source Key vs current standard HOMEWORK/SUBMISSION prefixes",
      });
    }

    if (xpAwardStatus !== CONFIG.values.xpAwarded && (xpByKey || xpByLink || linkedXpIds.length > 0)) {
      issues.push({
        issue: "xp_award_status_not_awarded",
        xpAwardStatus,
        recommendedAction: "Re-run 010 repair path or backfill-submission-pipeline-links",
      });
    }

    const hwAssets = assets.filter(asset => {
      const dest = getText(asset, assetsTable, CONFIG.assets.uploadDestination);
      return dest === CONFIG.values.uploadDestHomework;
    });

    const videoAssets = assets.filter(asset => {
      const dest = getText(asset, assetsTable, CONFIG.assets.uploadDestination);
      return dest === CONFIG.values.uploadDestVideo;
    });

    if (hwAssets.length === 0 && (homework1Id || homework2Id)) {
      issues.push({
        issue: "homework_assigned_but_no_homework_assets",
        homework1Id,
        homework2Id,
        recommendedAction: "Check 009/021 intake or athlete did not upload files",
      });
    }

    for (const asset of hwAssets) {
      const hasFile =
        hasAttachments(asset, assetsTable, CONFIG.assets.attachment) ||
        Boolean(getText(asset, assetsTable, CONFIG.assets.googleDriveFileUrl));
      const hwLink = getFirstLinkedId(asset, assetsTable, CONFIG.assets.homeworkCompletions);
      const slot = inferSlotFromAsset(asset, assetsTable);

      if (hasFile && !hwLink) {
        issues.push({
          issue: "homework_asset_not_linked_to_completion",
          assetId: asset.id,
          slot,
          recommendedAction: "Run 020 or backfill-homework-completion-upload-edge-cases",
        });
      }

      if (hasFile && hwLink) {
        const hwRecord = homeworkQuery.getRecord(hwLink);
        const hwSlot = hwRecord
          ? getSelectName(hwRecord, homeworkTable, CONFIG.homework.assetSlot)
          : "";
        if (hwRecord && !hwSlot) {
          issues.push({
            issue: "homework_completion_missing_asset_slot",
            homeworkId: hwLink,
            assetId: asset.id,
            recommendedAction: "Set Asset Slot HW1/HW2 then re-run edge backfill",
          });
        }
      }
    }

    if (homework1Id || homework2Id) {
      for (const hw of homeworkRows) {
        const hwCurriculumId = getFirstLinkedId(hw, homeworkTable, CONFIG.homework.homework);
        const slot = getSelectName(hw, homeworkTable, CONFIG.homework.assetSlot);
        const assetLinks = getLinkedIds(hw, homeworkTable, CONFIG.homework.submissionAssets);

        if (!slot) {
          issues.push({
            issue: "homework_completion_blank_slot",
            homeworkId: hw.id,
            homeworkCurriculumId: hwCurriculumId,
            recommendedAction: "Set Asset Slot from curriculum HW1/HW2 assignment",
          });
        }

        if (assetLinks.length === 0) {
          issues.push({
            issue: "homework_completion_no_linked_assets",
            homeworkId: hw.id,
            recommendedAction: "Link Submission Asset or archive if never uploaded",
          });
        }
      }
    }

    for (const asset of videoAssets) {
      const hasFile =
        hasAttachments(asset, assetsTable, CONFIG.assets.attachment) ||
        Boolean(getText(asset, assetsTable, CONFIG.assets.googleDriveFileUrl));
      const vfLink = getFirstLinkedId(asset, assetsTable, CONFIG.assets.videoFeedback);

      if (hasFile && !vfLink) {
        issues.push({
          issue: "video_asset_not_linked_to_video_feedback",
          assetId: asset.id,
          recommendedAction: "Run 013 (not 112) or backfill-video-pipeline-links (planned)",
        });
      }
    }

    if (issues.length === 0) continue;

    for (const row of issues) bump(row.issue);

    findings.push({
      submissionId,
      name: submission.name,
      enrollmentId,
      weekId,
      weeklySummaryId,
      issueCount: issues.length,
      issues,
    });
  }

  const report = {
    script: "audit-submission-pipeline-integrity",
    dryRun: true,
    onlyCountedSubmissions: ONLY_COUNTED_SUBMISSIONS,
    submissionsScanned: submissionQuery.records.length,
    submissionsWithIssues: findings.length,
    issueCounts,
    sample: findings.slice(0, SAMPLE_LIMIT),
  };

  console.log("===== SUBMISSION PIPELINE INTEGRITY AUDIT =====");
  console.log(JSON.stringify(report, null, 2));

  if (findings.length === 0) {
    console.log("All scanned submissions passed pipeline checks.");
  }
}

await main();
