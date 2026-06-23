/*
Extension Script: Repair Video Feedback XP Link
System: 127 SI Shooting Challenge
Purpose:
  Repairs a Video Feedback record that was linked to the wrong XP Event (wrong
  submission/week). Clears the bad link, restores the old XP Event's Video Feedback
  link when configured, then creates or links the correct XP Event for this
  Video Feedback record.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply writes
  - Refuses to reuse an XP Event whose Submission or Week conflicts with the target
  - Creates a new XP Event only when no matching VIDEO_SUBMISSION Source Key exists

Setup:
  1. Set CONFIG.videoFeedbackRecordId (required)
  2. Optionally set CONFIG.badXpEventId and CONFIG.restoreVideoFeedbackId
  3. Run dry-run, review plannedActions, then set CONFIRM_WRITE = true

Default IDs (Riley Week 8 case):
  - Video Feedback: recq7SZsELfyCX5Kn
  - Bad XP Event: rec6TfmjvAj2mxoPc
  - Restore Week 6 Video Feedback on bad XP Event: rec5hZzedk7OTW4V7
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const CONFIG = {
  videoFeedbackRecordId: "recq7SZsELfyCX5Kn",
  badXpEventId: "rec6TfmjvAj2mxoPc",
  restoreVideoFeedbackId: "rec5hZzedk7OTW4V7",

  tables: {
    videoFeedback: "Video Feedback",
    submissions: "Submissions",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  videoFeedback: {
    submission: "Submission",
    enrollment: "Enrollment",
    totalVideoXpAwarded: "Total Video XP Awarded",
    xpEvents: "XP Events",
    awardStatus: "Award Status",
    readyForXpAutomation: "Ready for XP Automation?",
    videoFeedbackKey: "Video Feedback Key",
  },

  submissions: {
    week: "Week",
    activityDate: "Activity Date",
    weeklySummary: "Weekly Athlete Summary",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  xpEvents: {
    enrollment: "Enrollment",
    submission: "Submission",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    videoFeedback: "Video Feedback",
    xpSource: "XP Source",
    xpBucketKey: "XP Bucket",
    xpPoints: "XP Points",
    xpReasonPublic: "XP Reason Public",
    xpReasonDebug: "XP Reason Debug",
    active: "Active?",
    sourceKey: "Source Key",
    xpSourceDate: "XP Source Date",
    xpDateSource: "XP Date Source",
  },

  values: {
    sourceKeyPrefix: "VIDEO_SUBMISSION",
    xpSource: "Video Submission",
    xpBucketKey: "Video Feedback",
    xpReasonPublic: "Video feedback XP earned.",
    xpDateSource: "Video Submission Activity Date",
    awardStatusAwarded: "Awarded",
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

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;

  try {
    const field = table.getField(fieldName);
    return field.isComputed !== true;
  } catch {
    return false;
  }
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName, fallback = 0) {
  const raw = getRaw(record, table, fieldName);

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  const text = String(raw ?? "")
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();

  if (!text) return fallback;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getLinkedIds(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return [];
  const raw = getRaw(record, table, fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function buildSingleSelectValue(table, fieldName, optionName) {
  if (!fieldExists(table, fieldName)) return undefined;

  const field = table.getField(fieldName);
  if (field.type !== "singleSelect") return optionName;

  const cleanOptionName = String(optionName || "").trim();
  const choices = field?.options?.choices || [];
  const match = choices.find(
    choice => String(choice.name || "").trim().toLowerCase() === cleanOptionName.toLowerCase()
  );

  return match ? { id: match.id } : undefined;
}

function buildWritablePayload(table, fields) {
  const payload = {};

  for (const [fieldName, value] of Object.entries(fields || {})) {
    if (!fieldExists(table, fieldName) || !isWritableField(table, fieldName)) continue;
    if (value === undefined) continue;
    payload[fieldName] = value;
  }

  return payload;
}

function buildSourceKey(videoFeedbackRecordId) {
  return `${CONFIG.values.sourceKeyPrefix}|${videoFeedbackRecordId}`;
}

function buildXpReasonDebug({
  videoFeedbackRecordId,
  videoFeedbackDisplayKey,
  submissionId,
  enrollmentId,
  weekId,
  xpSourceDateText,
  sourceKey,
  xpPoints,
}) {
  return [
    "Repaired by extension script repair-video-feedback-xp-link.js",
    `Video Feedback Record ID: ${videoFeedbackRecordId}`,
    `Video Feedback Key: ${videoFeedbackDisplayKey || "(blank)"}`,
    `Submission Record ID: ${submissionId}`,
    `Enrollment Record ID: ${enrollmentId}`,
    `Week Record ID: ${weekId || "(blank)"}`,
    `XP Source Date: ${xpSourceDateText || "(blank)"}`,
    `Source Key: ${sourceKey}`,
    `XP Points: ${xpPoints}`,
  ].join("\n");
}

async function findWeeklySummaryId(enrollmentId, weekId, sourceWeeklySummaryIds = []) {
  const fromSource = [...new Set((sourceWeeklySummaryIds || []).filter(Boolean))];

  if (fromSource.length === 1) {
    return fromSource[0];
  }

  if (fromSource.length > 1) {
    throw new Error(
      `Submission has multiple Weekly Athlete Summary links: ${fromSource.join(", ")}`
    );
  }

  if (!enrollmentId || !weekId) {
    return "";
  }

  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  const query = await weeklySummaryTable.selectRecordsAsync({
    fields: [CONFIG.weeklySummary.enrollment, CONFIG.weeklySummary.week],
  });

  const matches = query.records.filter(record => {
    const summaryEnrollmentId = getFirstLinkedId(
      record,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment
    );
    const summaryWeekId = getFirstLinkedId(
      record,
      weeklySummaryTable,
      CONFIG.weeklySummary.week
    );

    return summaryEnrollmentId === enrollmentId && summaryWeekId === weekId;
  });

  if (typeof query.unloadData === "function") {
    query.unloadData();
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple Weekly Athlete Summary records for Enrollment ${enrollmentId} + Week ${weekId}: ${matches.map(record => record.id).join(", ")}`
    );
  }

  return matches.length === 1 ? matches[0].id : "";
}

async function findExistingCorrectXpEvent(sourceKey, videoFeedbackRecordId) {
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  if (!fieldExists(xpEventsTable, CONFIG.xpEvents.sourceKey)) {
    return null;
  }

  const fields = [
    CONFIG.xpEvents.sourceKey,
    CONFIG.xpEvents.videoFeedback,
    CONFIG.xpEvents.submission,
    CONFIG.xpEvents.week,
  ].filter(name => fieldExists(xpEventsTable, name));

  const query = await xpEventsTable.selectRecordsAsync({ fields });

  const match = query.records.find(record => {
    const recordSourceKey = getText(record, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (recordSourceKey !== sourceKey) return false;

    const linkedVideoFeedbackIds = getLinkedIds(
      record,
      xpEventsTable,
      CONFIG.xpEvents.videoFeedback
    );

    return (
      linkedVideoFeedbackIds.length === 0 ||
      linkedVideoFeedbackIds.includes(videoFeedbackRecordId)
    );
  });

  if (typeof query.unloadData === "function") {
    query.unloadData();
  }

  return match || null;
}

function xpEventConflictsWithTarget(xpRecord, xpEventsTable, targetContext) {
  const xpSubmissionId = getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.submission);
  const xpWeekId = getFirstLinkedId(xpRecord, xpEventsTable, CONFIG.xpEvents.week);

  if (xpSubmissionId && xpSubmissionId !== targetContext.submissionId) {
    return true;
  }

  if (targetContext.weekId && xpWeekId && xpWeekId !== targetContext.weekId) {
    return true;
  }

  return false;
}

async function main() {
  const videoFeedbackRecordId = String(CONFIG.videoFeedbackRecordId || "").trim();
  const configuredBadXpEventId = String(CONFIG.badXpEventId || "").trim();
  const restoreVideoFeedbackId = String(CONFIG.restoreVideoFeedbackId || "").trim();

  if (!videoFeedbackRecordId.startsWith("rec")) {
    throw new Error("Set CONFIG.videoFeedbackRecordId to a valid Video Feedback record ID.");
  }

  const videoTable = base.getTable(CONFIG.tables.videoFeedback);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  const videoRecord = await videoTable.selectRecordAsync(videoFeedbackRecordId);

  if (!videoRecord) {
    throw new Error(`Video Feedback record not found: ${videoFeedbackRecordId}`);
  }

  const submissionId = getFirstLinkedId(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.submission
  );
  const enrollmentId = getFirstLinkedId(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.enrollment
  );
  const linkedXpEventIds = getLinkedIds(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.xpEvents
  );
  const xpPoints = getNumber(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.totalVideoXpAwarded,
    0
  );
  const videoFeedbackDisplayKey = getText(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.videoFeedbackKey
  ) || videoRecord.name;

  if (!submissionId) {
    throw new Error(`Video Feedback ${videoFeedbackRecordId} is missing Submission.`);
  }

  if (!enrollmentId) {
    throw new Error(`Video Feedback ${videoFeedbackRecordId} is missing Enrollment.`);
  }

  if (!(xpPoints > 0)) {
    throw new Error(`Video Feedback ${videoFeedbackRecordId} has no Total Video XP Awarded.`);
  }

  const submissionRecord = await submissionsTable.selectRecordAsync(submissionId);

  if (!submissionRecord) {
    throw new Error(`Submission record not found: ${submissionId}`);
  }

  const weekId = getFirstLinkedId(submissionRecord, submissionsTable, CONFIG.submissions.week);
  const xpSourceDate = fieldExists(submissionsTable, CONFIG.submissions.activityDate)
    ? getRaw(submissionRecord, submissionsTable, CONFIG.submissions.activityDate)
    : null;
  const xpSourceDateText = fieldExists(submissionsTable, CONFIG.submissions.activityDate)
    ? getText(submissionRecord, submissionsTable, CONFIG.submissions.activityDate)
    : "";
  const submissionWeeklySummaryIds = fieldExists(
    submissionsTable,
    CONFIG.submissions.weeklySummary
  )
    ? getLinkedIds(submissionRecord, submissionsTable, CONFIG.submissions.weeklySummary)
    : [];

  const targetContext = {
    videoFeedbackRecordId,
    submissionId,
    enrollmentId,
    weekId,
  };

  const sourceKey = buildSourceKey(videoFeedbackRecordId);
  const weeklySummaryId = await findWeeklySummaryId(
    enrollmentId,
    weekId,
    submissionWeeklySummaryIds
  );

  const plannedActions = [];
  const badXpEventIds = [];

  for (const xpEventId of linkedXpEventIds) {
    const xpRecord = await xpEventsTable.selectRecordAsync(xpEventId);

    if (!xpRecord) continue;

    if (xpEventConflictsWithTarget(xpRecord, xpEventsTable, targetContext)) {
      badXpEventIds.push(xpEventId);
    }
  }

  if (configuredBadXpEventId && !badXpEventIds.includes(configuredBadXpEventId)) {
    badXpEventIds.push(configuredBadXpEventId);
  }

  const uniqueBadXpEventIds = [...new Set(badXpEventIds)];

  if (uniqueBadXpEventIds.length > 0) {
    plannedActions.push({
      step: "clear_video_feedback_xp_links",
      videoFeedbackId: videoFeedbackRecordId,
      removeXpEventIds: uniqueBadXpEventIds,
    });
  }

  for (const badXpEventId of uniqueBadXpEventIds) {
    const badXpRecord = await xpEventsTable.selectRecordAsync(badXpEventId);

    if (!badXpRecord) {
      throw new Error(`Bad XP Event record not found: ${badXpEventId}`);
    }

    const linkedVideoFeedbackIds = getLinkedIds(
      badXpRecord,
      xpEventsTable,
      CONFIG.xpEvents.videoFeedback
    );

    if (linkedVideoFeedbackIds.includes(videoFeedbackRecordId)) {
      const restoredIds = restoreVideoFeedbackId
        ? [restoreVideoFeedbackId]
        : linkedVideoFeedbackIds.filter(id => id !== videoFeedbackRecordId);

      plannedActions.push({
        step: "restore_bad_xp_event_video_feedback_link",
        xpEventId: badXpEventId,
        fromVideoFeedbackIds: linkedVideoFeedbackIds,
        toVideoFeedbackIds: restoredIds,
      });
    }
  }

  const existingCorrectXp = await findExistingCorrectXpEvent(
    sourceKey,
    videoFeedbackRecordId
  );

  let targetXpEventId = existingCorrectXp?.id || "";

  if (!targetXpEventId) {
    plannedActions.push({
      step: "create_correct_xp_event",
      sourceKey,
      submissionId,
      enrollmentId,
      weekId,
      weeklySummaryId,
      xpPoints,
    });
  } else {
    plannedActions.push({
      step: "link_existing_correct_xp_event",
      xpEventId: targetXpEventId,
      sourceKey,
    });
  }

  plannedActions.push({
    step: "writeback_video_feedback",
    videoFeedbackId: videoFeedbackRecordId,
    xpEventId: targetXpEventId || "(new)",
    awardStatus: CONFIG.values.awardStatusAwarded,
    readyForXpAutomation: false,
  });

  const report = {
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    videoFeedbackRecordId,
    videoFeedbackDisplayKey,
    submissionId,
    enrollmentId,
    weekId,
    xpPoints,
    sourceKey,
    weeklySummaryId,
    configuredBadXpEventId: configuredBadXpEventId || null,
    restoreVideoFeedbackId: restoreVideoFeedbackId || null,
    linkedXpEventIds,
    badXpEventIds: uniqueBadXpEventIds,
    existingCorrectXpEventId: existingCorrectXp?.id || "",
    plannedActions,
  };

  console.log("===== REPAIR VIDEO FEEDBACK XP LINK =====");
  console.log(JSON.stringify(report, null, 2));

  if (DRY_RUN) {
    console.log("DRY_RUN is true. No records were updated.");
    console.log("Set DRY_RUN = false and CONFIRM_WRITE = true to apply the repair.");
    return;
  }

  if (!CONFIRM_WRITE) {
    console.log("Set CONFIRM_WRITE = true to apply the repair.");
    return;
  }

  if (uniqueBadXpEventIds.length > 0) {
    const keptXpEventIds = linkedXpEventIds.filter(id => !uniqueBadXpEventIds.includes(id));

    await videoTable.updateRecordAsync(
      videoFeedbackRecordId,
      buildWritablePayload(videoTable, {
        [CONFIG.videoFeedback.xpEvents]: keptXpEventIds.map(id => ({ id })),
      })
    );
  }

  for (const badXpEventId of uniqueBadXpEventIds) {
    const badXpRecord = await xpEventsTable.selectRecordAsync(badXpEventId);

    if (!badXpRecord) continue;

    const linkedVideoFeedbackIds = getLinkedIds(
      badXpRecord,
      xpEventsTable,
      CONFIG.xpEvents.videoFeedback
    );

    if (!linkedVideoFeedbackIds.includes(videoFeedbackRecordId)) continue;

    const restoredIds = restoreVideoFeedbackId
      ? [restoreVideoFeedbackId]
      : linkedVideoFeedbackIds.filter(id => id !== videoFeedbackRecordId);

    await xpEventsTable.updateRecordAsync(
      badXpEventId,
      buildWritablePayload(xpEventsTable, {
        [CONFIG.xpEvents.videoFeedback]: restoredIds.map(id => ({ id })),
      })
    );
  }

  if (!targetXpEventId) {
    const xpReasonDebug = buildXpReasonDebug({
      videoFeedbackRecordId,
      videoFeedbackDisplayKey,
      submissionId,
      enrollmentId,
      weekId,
      xpSourceDateText,
      sourceKey,
      xpPoints,
    });

    const createFields = buildWritablePayload(xpEventsTable, {
      [CONFIG.xpEvents.enrollment]: [{ id: enrollmentId }],
      [CONFIG.xpEvents.submission]: [{ id: submissionId }],
      [CONFIG.xpEvents.videoFeedback]: [{ id: videoFeedbackRecordId }],
      [CONFIG.xpEvents.xpSource]: buildSingleSelectValue(
        xpEventsTable,
        CONFIG.xpEvents.xpSource,
        CONFIG.values.xpSource
      ),
      [CONFIG.xpEvents.xpBucketKey]: buildSingleSelectValue(
        xpEventsTable,
        CONFIG.xpEvents.xpBucketKey,
        CONFIG.values.xpBucketKey
      ),
      [CONFIG.xpEvents.xpPoints]: xpPoints,
      [CONFIG.xpEvents.xpReasonPublic]: CONFIG.values.xpReasonPublic,
      [CONFIG.xpEvents.xpReasonDebug]: xpReasonDebug,
      [CONFIG.xpEvents.active]: true,
      [CONFIG.xpEvents.sourceKey]: sourceKey,
      [CONFIG.xpEvents.week]: weekId ? [{ id: weekId }] : undefined,
      [CONFIG.xpEvents.xpSourceDate]: xpSourceDate || undefined,
      [CONFIG.xpEvents.xpDateSource]: buildSingleSelectValue(
        xpEventsTable,
        CONFIG.xpEvents.xpDateSource,
        CONFIG.values.xpDateSource
      ),
      [CONFIG.xpEvents.weeklySummary]: weeklySummaryId
        ? [{ id: weeklySummaryId }]
        : undefined,
    });

    if (Object.keys(createFields).length === 0) {
      throw new Error("No writable XP Event fields available for create.");
    }

    targetXpEventId = await xpEventsTable.createRecordAsync(createFields);
  } else if (weeklySummaryId && fieldExists(xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
    const existingSummaryId = getFirstLinkedId(
      existingCorrectXp,
      xpEventsTable,
      CONFIG.xpEvents.weeklySummary
    );

    if (!existingSummaryId) {
      await xpEventsTable.updateRecordAsync(
        targetXpEventId,
        buildWritablePayload(xpEventsTable, {
          [CONFIG.xpEvents.weeklySummary]: [{ id: weeklySummaryId }],
        })
      );
    }
  }

  const mergedXpEventIds = [
    ...new Set(
      linkedXpEventIds
        .filter(id => !uniqueBadXpEventIds.includes(id))
        .concat([targetXpEventId])
    ),
  ];

  await videoTable.updateRecordAsync(
    videoFeedbackRecordId,
    buildWritablePayload(videoTable, {
      [CONFIG.videoFeedback.xpEvents]: mergedXpEventIds.map(id => ({ id })),
      [CONFIG.videoFeedback.awardStatus]: buildSingleSelectValue(
        videoTable,
        CONFIG.videoFeedback.awardStatus,
        CONFIG.values.awardStatusAwarded
      ),
      [CONFIG.videoFeedback.readyForXpAutomation]: false,
    })
  );

  console.log(
    JSON.stringify(
      {
        status: "repaired",
        videoFeedbackRecordId,
        xpEventId: targetXpEventId,
        weeklySummaryId,
        badXpEventIds: uniqueBadXpEventIds,
      },
      null,
      2
    )
  );
}

await main();
