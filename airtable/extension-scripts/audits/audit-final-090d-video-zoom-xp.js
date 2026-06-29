/*
Extension Script: Final Pre-Close 090D - Video + Zoom XP
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity audit combining:
  1) Video XP pipeline integrity checks (114 parity model)
  2) Zoom attendance XP source-key checks (101 source-key model)
  Scoped to Active? enrollments only.

Schema gate: 20260629_045741
Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-090d-video-zoom-xp",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    video: "Video Feedback",
    submissions: "Submissions",
    zoom: "Zoom Meetings",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  enrollments: {
    active: "Active?",
  },

  video: {
    submission: "Submission",
    enrollment: "Enrollment",
    totalVideoXp: "Total Video XP Awarded",
    doNotAwardXp: "Do Not Award XP?",
    awardStatus: "Award Status",
    feedbackPosted: "Feedback Posted?",
    active: "Active?",
    readyForXpAutomation: "Ready for XP Automation?",
    xpEvents: "XP Events",
    uploadStatus: "Upload Status",
  },

  submissions: {
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
  },

  zoom: {
    attendees: "Attendees",
    week: "Week",
    meetingStatus: "Meeting Status",
    zoomMeetingKey: "Zoom Meeting Key",
    startFieldCandidates: ["Start Time", "Start Date", "Meeting Date", "Date"],
  },

  xpEvents: {
    sourceKey: "Source Key",
    xpDedupeKeyNormalized: "XP Dedupe Key Normalized",
    videoFeedback: "Video Feedback",
    zoomMeeting: "Zoom Meeting",
    enrollment: "Enrollment",
    submission: "Submission",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpPoints: "XP Points",
    xpSource: "XP Source",
    xpBucketKey: "XP Bucket",
    active: "Active?",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    videoSourceKeyPrefix: "VIDEO_SUBMISSION|",
    videoAwarded: "Awarded",
    zoomCompleted: "Completed",
    zoomBasePrefix: "ZOOM_ATTEND_BASE",
    zoomBonus2Prefix: "ZOOM_ATTEND_BONUS_2",
    zoomBonus3Prefix: "ZOOM_ATTEND_BONUS_3",
    zoomBonus2Count: 2,
    zoomBonus3Count: 3,
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Video Feedback", "Enrollment"],
  ["Video Feedback", "Submission"],
  ["Video Feedback", "XP Events"],
  ["Video Feedback", "Award Status"],
  ["Video Feedback", "Total Video XP Awarded"],
  ["Submissions", "Week"],
  ["XP Events", "Source Key"],
  ["XP Events", "Enrollment"],
  ["XP Events", "XP Points"],
  ["Zoom Meetings", "Attendees"],
  ["Zoom Meetings", "Meeting Status"],
  ["Zoom Meetings", "Zoom Meeting Key"],
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
    throw new Error(`Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`);
  }
}

function getRaw(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
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

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function toDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (isNaN(parsed)) return "";
    return parsed.toISOString().slice(0, 10);
  }
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function compareDateKeys(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

function buildVideoSourceKey(videoFeedbackId) {
  return `${CONFIG.values.videoSourceKeyPrefix}${videoFeedbackId}`;
}

function extractVideoFeedbackIdFromSourceKey(sourceKey) {
  const raw = String(sourceKey || "").trim();
  if (!normalizeText(raw).startsWith("video_submission|")) return "";
  return raw.slice(raw.indexOf("|") + 1).trim();
}

function xpBelongsToVideoFeedback(xpRecord, xpEventsTable, videoFeedbackId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const dedupeKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized);

  if (sourceKey === buildVideoSourceKey(videoFeedbackId)) return true;
  if (dedupeKey === buildVideoSourceKey(videoFeedbackId)) return true;
  if (extractVideoFeedbackIdFromSourceKey(sourceKey) === videoFeedbackId) return true;
  if (extractVideoFeedbackIdFromSourceKey(dedupeKey) === videoFeedbackId) return true;

  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId);
}

function getVideoXpIds(videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();

  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (xp && xpBelongsToVideoFeedback(xp, xpEventsTable, videoFeedbackId)) {
      ids.add(xpId);
    }
  }

  for (const xpId of xpBySourceKey.get(buildVideoSourceKey(videoFeedbackId)) || []) {
    ids.add(xpId);
  }

  return [...ids];
}

function pickPrimaryXpId(xpIds, videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable) {
  const expectedKey = buildVideoSourceKey(videoFeedbackId);
  const scored = xpIds
    .map(xpId => {
      const xp = xpQuery.getRecord(xpId);
      if (!xp) return { xpId, score: -1 };

      const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
      let score = 0;
      if (sourceKey === expectedKey) score = 4;
      else if (linkedXpIds.includes(xpId)) score = 3;
      else if (extractVideoFeedbackIdFromSourceKey(sourceKey) === videoFeedbackId) score = 2;
      else if (getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId)) {
        score = 1;
      }
      return { xpId, score };
    })
    .filter(row => row.score >= 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.xpId || xpIds[0] || "";
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function resolveWeeklySummaryId({ sourceWeeklySummaryIds, enrollmentId, weekId, summaryIndex }) {
  if (sourceWeeklySummaryIds.length === 1) {
    return sourceWeeklySummaryIds[0];
  }

  if (!enrollmentId || !weekId) return "";

  const matches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];
  if (matches.length === 1) return matches[0];
  return "";
}

function assessVideoXpReadiness(videoRecord, videoTable) {
  const missing = [];
  const awardStatus = getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus);
  const totalXp = getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp);
  const feedbackPosted = fieldExists(videoTable, CONFIG.video.feedbackPosted)
    ? getBooleanish(videoRecord, videoTable, CONFIG.video.feedbackPosted)
    : true;
  const doNotAward =
    fieldExists(videoTable, CONFIG.video.doNotAwardXp) &&
    getBooleanish(videoRecord, videoTable, CONFIG.video.doNotAwardXp);
  const hasSubmission = getLinkedIds(videoRecord, videoTable, CONFIG.video.submission).length > 0;
  const hasEnrollment = getLinkedIds(videoRecord, videoTable, CONFIG.video.enrollment).length > 0;

  if (doNotAward || awardStatus === "Do Not Award") {
    missing.push("do_not_award_xp");
  }

  if (
    fieldExists(videoTable, CONFIG.video.active) &&
    !getBooleanish(videoRecord, videoTable, CONFIG.video.active)
  ) {
    missing.push("inactive");
  }

  if (awardStatus === CONFIG.values.videoAwarded && totalXp > 0 && !doNotAward) {
    if (!hasSubmission) missing.push("submission");
    if (!hasEnrollment) missing.push("enrollment");
    return {
      ready: missing.length === 0,
      missing,
      auditMode: "awarded_parity",
    };
  }

  if (fieldExists(videoTable, CONFIG.video.feedbackPosted) && !feedbackPosted) {
    missing.push("feedback_not_posted");
  }

  if (
    fieldExists(videoTable, CONFIG.video.readyForXpAutomation) &&
    !getBooleanish(videoRecord, videoTable, CONFIG.video.readyForXpAutomation)
  ) {
    missing.push("not_ready_for_xp_automation");
  }

  if (!hasSubmission) {
    missing.push("submission");
  }

  if (!hasEnrollment) {
    missing.push("enrollment");
  }

  if (totalXp <= 0) {
    missing.push("zero_xp");
  }

  return {
    ready: missing.length === 0,
    missing,
    auditMode: "trigger_ready",
  };
}

function buildZoomBaseKey(meetingKey, enrollmentId) {
  return `${CONFIG.values.zoomBasePrefix}|${meetingKey}|${enrollmentId}`;
}

function buildZoomBonus2Key(enrollmentId) {
  return `${CONFIG.values.zoomBonus2Prefix}|${enrollmentId}`;
}

function buildZoomBonus3Key(enrollmentId) {
  return `${CONFIG.values.zoomBonus3Prefix}|${enrollmentId}`;
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const videoTable = base.getTable(CONFIG.tables.video);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const zoomTable = base.getTable(CONFIG.tables.zoom);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  requireSchema({
    Enrollments: enrollmentsTable,
    "Video Feedback": videoTable,
    Submissions: submissionsTable,
    "XP Events": xpEventsTable,
    "Zoom Meetings": zoomTable,
  });

  const zoomStartField = (CONFIG.zoom.startFieldCandidates || []).find(fieldName =>
    fieldExists(zoomTable, fieldName)
  ) || "";

  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.active],
  });
  const activeEnrollmentIds = new Set();
  for (const enrollment of enrollmentQuery.records) {
    if (getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) {
      activeEnrollmentIds.add(enrollment.id);
    }
  }

  const videoFields = Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name));
  const submissionFields = Object.values(CONFIG.submissions).filter(name => fieldExists(submissionsTable, name));
  const zoomFields = [...new Set([
    ...Object.values(CONFIG.zoom).filter(v => typeof v === "string"),
    zoomStartField,
  ])].filter(Boolean).filter(name => fieldExists(zoomTable, name));
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [videoQuery, submissionQuery, zoomQuery, xpQuery, summaryQuery] = await Promise.all([
    videoTable.selectRecordsAsync({ fields: videoFields }),
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    zoomTable.selectRecordsAsync({ fields: zoomFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment)[0] || "";
    const weekId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.week)[0] || "";
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, []);
    summaryIndex.get(key).push(summary.id);
  }

  const videoIssueCounts = {};
  const videoSamples = {
    video_not_ready_for_xp: [],
    video_missing_xp_event: [],
    video_duplicate_xp_event: [],
    video_source_key_mismatch: [],
    video_xp_points_mismatch: [],
    video_award_status_gap: [],
    video_missing_weekly_summary_on_xp: [],
    video_ok: [],
  };

  const zoomIssueCounts = {};
  const zoomSamples = {
    zoom_missing_base_xp: [],
    zoom_duplicate_base_xp: [],
    zoom_missing_bonus_2_xp: [],
    zoom_duplicate_bonus_2_xp: [],
    zoom_missing_bonus_3_xp: [],
    zoom_duplicate_bonus_3_xp: [],
    zoom_ok: [],
  };

  function bumpVideo(issue) {
    videoIssueCounts[issue] = (videoIssueCounts[issue] || 0) + 1;
  }

  function bumpZoom(issue) {
    zoomIssueCounts[issue] = (zoomIssueCounts[issue] || 0) + 1;
  }

  function pushVideoSample(bucket, row) {
    if ((videoSamples[bucket] || []).length < SAMPLE_LIMIT) {
      videoSamples[bucket].push(row);
    }
  }

  function pushZoomSample(bucket, row) {
    if ((zoomSamples[bucket] || []).length < SAMPLE_LIMIT) {
      zoomSamples[bucket].push(row);
    }
  }

  let videoScopedChecked = 0;

  for (const videoRecord of videoQuery.records) {
    const enrollmentId = getFirstLinkedId(videoRecord, videoTable, CONFIG.video.enrollment);
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) {
      continue;
    }

    videoScopedChecked += 1;
    const videoFeedbackId = videoRecord.id;
    const readiness = assessVideoXpReadiness(videoRecord, videoTable);

    if (!readiness.ready) {
      bumpVideo("video_not_ready_for_xp");
      pushVideoSample("video_not_ready_for_xp", {
        videoFeedbackId,
        enrollmentId,
        name: videoRecord.name,
        missing: readiness.missing,
        uploadStatus: getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus),
        awardStatus: getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus),
        totalVideoXp: getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp),
      });
      continue;
    }

    const linkedXpIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.xpEvents);
    const xpIds = getVideoXpIds(videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey);
    const awardStatus = getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus);
    const totalXp = getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp);
    const expectedKey = buildVideoSourceKey(videoFeedbackId);
    const submissionId = getFirstLinkedId(videoRecord, videoTable, CONFIG.video.submission);

    const submissionRecord = submissionId ? submissionQuery.getRecord(submissionId) : null;
    const weekId = submissionRecord
      ? getFirstLinkedId(submissionRecord, submissionsTable, CONFIG.submissions.week)
      : "";
    const submissionWeeklySummaryIds = submissionRecord
      ? getLinkedIds(submissionRecord, submissionsTable, CONFIG.submissions.weeklySummary)
      : [];
    const weeklySummaryId = resolveWeeklySummaryId({
      sourceWeeklySummaryIds: submissionWeeklySummaryIds,
      enrollmentId,
      weekId,
      summaryIndex,
    });

    let hasIssue = false;

    if (xpIds.length === 0) {
      bumpVideo("video_missing_xp_event");
      pushVideoSample("video_missing_xp_event", {
        videoFeedbackId,
        enrollmentId,
        name: videoRecord.name,
        expectedSourceKey: expectedKey,
        totalVideoXp: totalXp,
      });
      continue;
    }

    if (xpIds.length > 1) {
      bumpVideo("video_duplicate_xp_event");
      pushVideoSample("video_duplicate_xp_event", {
        videoFeedbackId,
        enrollmentId,
        name: videoRecord.name,
        xpEventIds: xpIds,
      });
      hasIssue = true;
    }

    const primaryXpId = pickPrimaryXpId(xpIds, videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable);
    const primaryXp = primaryXpId ? xpQuery.getRecord(primaryXpId) : null;
    const primarySourceKey = primaryXp ? getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey) : "";
    const primaryPoints = primaryXp ? getNumberish(primaryXp, xpEventsTable, CONFIG.xpEvents.xpPoints) : 0;
    const primaryWasId = primaryXp ? getFirstLinkedId(primaryXp, xpEventsTable, CONFIG.xpEvents.weeklySummary) : "";

    if (primarySourceKey !== expectedKey) {
      bumpVideo("video_source_key_mismatch");
      pushVideoSample("video_source_key_mismatch", {
        videoFeedbackId,
        enrollmentId,
        name: videoRecord.name,
        xpEventId: primaryXpId,
        expectedSourceKey: expectedKey,
        actualSourceKey: primarySourceKey,
      });
      hasIssue = true;
    }

    if (primaryPoints !== totalXp) {
      bumpVideo("video_xp_points_mismatch");
      pushVideoSample("video_xp_points_mismatch", {
        videoFeedbackId,
        enrollmentId,
        name: videoRecord.name,
        xpEventId: primaryXpId,
        videoTotalXp: totalXp,
        xpEventPoints: primaryPoints,
      });
      hasIssue = true;
    }

    if (awardStatus !== CONFIG.values.videoAwarded && primaryXp) {
      bumpVideo("video_award_status_gap");
      pushVideoSample("video_award_status_gap", {
        videoFeedbackId,
        enrollmentId,
        name: videoRecord.name,
        awardStatus,
        xpEventId: primaryXpId,
      });
      hasIssue = true;
    }

    if (weeklySummaryId && primaryXp && !primaryWasId) {
      bumpVideo("video_missing_weekly_summary_on_xp");
      pushVideoSample("video_missing_weekly_summary_on_xp", {
        videoFeedbackId,
        enrollmentId,
        name: videoRecord.name,
        xpEventId: primaryXpId,
        expectedWeeklySummaryId: weeklySummaryId,
      });
      hasIssue = true;
    }

    if (!hasIssue) {
      bumpVideo("video_ok");
      if (videoSamples.video_ok.length < 5) {
        pushVideoSample("video_ok", {
          videoFeedbackId,
          enrollmentId,
          name: videoRecord.name,
          xpEventId: primaryXpId,
          totalVideoXp: totalXp,
        });
      }
    }
  }

  const zoomMeetingsById = new Map(zoomQuery.records.map(record => [record.id, record]));
  let zoomScopedMeetingRows = 0;

  for (const zoomRecord of zoomQuery.records) {
    const attendeeIds = getLinkedIds(zoomRecord, zoomTable, CONFIG.zoom.attendees)
      .filter(id => activeEnrollmentIds.has(id));
    if (!attendeeIds.length) continue;

    const meetingId = zoomRecord.id;
    const meetingName = zoomRecord.name;
    const meetingStatus = getSelectName(zoomRecord, zoomTable, CONFIG.zoom.meetingStatus) ||
      getText(zoomRecord, zoomTable, CONFIG.zoom.meetingStatus);
    const isCompleted = normalizeText(meetingStatus) === normalizeText(CONFIG.values.zoomCompleted);
    const meetingKey = getText(zoomRecord, zoomTable, CONFIG.zoom.zoomMeetingKey);
    const meetingDateKey = zoomStartField ? toDateKey(getRaw(zoomRecord, zoomTable, zoomStartField)) : "";

    for (const enrollmentId of attendeeIds) {
      zoomScopedMeetingRows += 1;

      let hasIssue = false;
      const baseKey = meetingKey ? buildZoomBaseKey(meetingKey, enrollmentId) : "";
      const baseIds = baseKey ? (xpBySourceKey.get(baseKey) || []) : [];

      if (isCompleted) {
        if (!meetingKey || baseIds.length === 0) {
          bumpZoom("zoom_missing_base_xp");
          pushZoomSample("zoom_missing_base_xp", {
            meetingId,
            meetingName,
            enrollmentId,
            meetingStatus,
            expectedSourceKey: baseKey || "(missing meeting key)",
            matchingXpEventIds: baseIds,
          });
          hasIssue = true;
        } else if (baseIds.length > 1) {
          bumpZoom("zoom_duplicate_base_xp");
          pushZoomSample("zoom_duplicate_base_xp", {
            meetingId,
            meetingName,
            enrollmentId,
            expectedSourceKey: baseKey,
            xpEventIds: baseIds,
          });
          hasIssue = true;
        }
      }

      if (isCompleted && meetingDateKey) {
        const qualifyingMeetingKeys = new Set();

        for (const historicalMeeting of zoomMeetingsById.values()) {
          const historicalStatus =
            getSelectName(historicalMeeting, zoomTable, CONFIG.zoom.meetingStatus) ||
            getText(historicalMeeting, zoomTable, CONFIG.zoom.meetingStatus);
          if (normalizeText(historicalStatus) !== normalizeText(CONFIG.values.zoomCompleted)) continue;

          const historicalAttendees = getLinkedIds(historicalMeeting, zoomTable, CONFIG.zoom.attendees);
          if (!historicalAttendees.includes(enrollmentId)) continue;

          const historicalMeetingKey = getText(historicalMeeting, zoomTable, CONFIG.zoom.zoomMeetingKey);
          if (!historicalMeetingKey) continue;

          const historicalDateKey = zoomStartField
            ? toDateKey(getRaw(historicalMeeting, zoomTable, zoomStartField))
            : "";
          if (!historicalDateKey) continue;

          if (compareDateKeys(historicalDateKey, meetingDateKey) > 0) continue;
          qualifyingMeetingKeys.add(historicalMeetingKey);
        }

        const attendanceCount = qualifyingMeetingKeys.size;

        if (attendanceCount === CONFIG.values.zoomBonus2Count) {
          const bonus2Key = buildZoomBonus2Key(enrollmentId);
          const bonus2Ids = xpBySourceKey.get(bonus2Key) || [];
          if (bonus2Ids.length === 0) {
            bumpZoom("zoom_missing_bonus_2_xp");
            pushZoomSample("zoom_missing_bonus_2_xp", {
              meetingId,
              meetingName,
              enrollmentId,
              attendanceCount,
              expectedSourceKey: bonus2Key,
            });
            hasIssue = true;
          } else if (bonus2Ids.length > 1) {
            bumpZoom("zoom_duplicate_bonus_2_xp");
            pushZoomSample("zoom_duplicate_bonus_2_xp", {
              meetingId,
              meetingName,
              enrollmentId,
              attendanceCount,
              expectedSourceKey: bonus2Key,
              xpEventIds: bonus2Ids,
            });
            hasIssue = true;
          }
        }

        if (attendanceCount === CONFIG.values.zoomBonus3Count) {
          const bonus3Key = buildZoomBonus3Key(enrollmentId);
          const bonus3Ids = xpBySourceKey.get(bonus3Key) || [];
          if (bonus3Ids.length === 0) {
            bumpZoom("zoom_missing_bonus_3_xp");
            pushZoomSample("zoom_missing_bonus_3_xp", {
              meetingId,
              meetingName,
              enrollmentId,
              attendanceCount,
              expectedSourceKey: bonus3Key,
            });
            hasIssue = true;
          } else if (bonus3Ids.length > 1) {
            bumpZoom("zoom_duplicate_bonus_3_xp");
            pushZoomSample("zoom_duplicate_bonus_3_xp", {
              meetingId,
              meetingName,
              enrollmentId,
              attendanceCount,
              expectedSourceKey: bonus3Key,
              xpEventIds: bonus3Ids,
            });
            hasIssue = true;
          }
        }
      }

      if (!hasIssue) {
        bumpZoom("zoom_ok");
        if (zoomSamples.zoom_ok.length < 5) {
          pushZoomSample("zoom_ok", {
            meetingId,
            meetingName,
            enrollmentId,
            meetingStatus,
          });
        }
      }
    }
  }

  const videoIssueTotal = Object.entries(videoIssueCounts)
    .filter(([k]) => k !== "video_ok" && k !== "video_not_ready_for_xp")
    .reduce((sum, [, count]) => sum + count, 0);

  const zoomIssueTotal = Object.entries(zoomIssueCounts)
    .filter(([k]) => k !== "zoom_ok")
    .reduce((sum, [, count]) => sum + count, 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    scope: "Active? enrollments only",
    activeEnrollmentCount: activeEnrollmentIds.size,
    video: {
      checked: videoScopedChecked,
      readyCount: videoScopedChecked - (videoIssueCounts.video_not_ready_for_xp || 0),
      okCount: videoIssueCounts.video_ok || 0,
      issueTotal: videoIssueTotal,
      issueCounts: videoIssueCounts,
      samples: videoSamples,
    },
    zoom: {
      checkedMeetingAttendeeRows: zoomScopedMeetingRows,
      okCount: zoomIssueCounts.zoom_ok || 0,
      issueTotal: zoomIssueTotal,
      issueCounts: zoomIssueCounts,
      samples: zoomSamples,
      notes: zoomStartField
        ? [`Attendance-count bonus checks used date field: ${zoomStartField}`]
        : ["Bonus applicability checks skipped because no zoom date field candidate exists."],
    },
  };

  console.log("===== FINAL 090D - VIDEO + ZOOM XP =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
