/*
Extension Script: AUDIT - Orphan Asset / Homework Submission Repair Planner
System: 127 SI Shooting Challenge
Purpose:
  Read-only repair planner for orphan Submission Assets (missing Submission - Linked)
  and Homework Completions missing their Submission link.
  Proposes safe parent Submission matches using RecordId, homework chain, enrollment,
  slot, and date proximity rules. Does NOT write, create, or delete records.

Default: DRY-RUN ONLY (no updateRecordsAsync)

Recommended follow-up:
  Review SAFE_* rows, then run a dedicated live repair script with CONFIRM_WRITE.

Version: v1.0
Date Written: 2026-06-27
Last Updated: 2026-06-27
*/

// @ts-nocheck

const DATE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const CONFIG = {
  scriptName: "audit-orphan-asset-homework-submission-repair-planner",
  displayName: "AUDIT - Orphan Asset / Homework Submission Repair Planner",
  version: "v1.0",

  tables: {
    submissions: "Submissions",
    assets: "Submission Assets",
    homework: "Homework Completions",
    video: "Video Feedback",
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
    homeworkCompletions: "Homework Completions",
    submissionAssets: "Submission Assets",
    videoFeedback: "Video Feedback",
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
    homeworkCompletionsRid: "Homework Completions RID",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    created: "Created",
  },

  homework: {
    nameCandidates: ["Homework Completion Full Name", "Homework Completion Name"],
    recordId: "RecordId",
    enrollment: "Enrollment",
    week: "Week",
    submissionCandidates: ["Submissions - Linked", "Submission"],
    submittedAt: "Submitted At",
    homeworkName: "Homework Name",
    submissionAssets: "Submission Assets",
    submissionAssetForReview: "Submission Asset for Review",
    assetSlot: "Asset Slot",
    created: "Created",
  },

  video: {
    name: "Video Feedback Name",
    recordId: "RecordId",
    submission: "Submission",
  },
};

const GROUPS = {
  SAFE_ASSET: "SAFE_ASSET_TO_SUBMISSION_MATCH",
  AMBIGUOUS_ASSET: "AMBIGUOUS_ASSET_TO_SUBMISSION_MATCH",
  NO_ASSET: "NO_ASSET_TO_SUBMISSION_MATCH",
  SAFE_HOMEWORK: "SAFE_HOMEWORK_TO_SUBMISSION_MATCH",
  AMBIGUOUS_HOMEWORK: "AMBIGUOUS_HOMEWORK_TO_SUBMISSION_MATCH",
  NO_HOMEWORK: "NO_HOMEWORK_TO_SUBMISSION_MATCH",
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

function resolveField(table, candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const name of list) {
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

function formatDate(record, table, fieldName) {
  const text = getText(record, table, fieldName);
  return text || "—";
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

function inferHomeworkSlot(hw, homeworkTable, fields) {
  return normalizeSlotLabel(getSelectName(hw, homeworkTable, fields.assetSlot)) || "";
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

function candidatesWithinDateWindow(candidates, targetMs, windowMs) {
  if (!candidates.length) return [];
  if (targetMs == null) return candidates;
  return candidates.filter(row => {
    if (row.anchorMs == null) return false;
    return Math.abs(row.anchorMs - targetMs) <= windowMs;
  });
}

function pickUniqueClosest(candidates, targetMs) {
  if (!candidates.length) return { unique: [], tied: [] };
  if (targetMs == null) {
    return candidates.length === 1
      ? { unique: candidates, tied: [] }
      : { unique: [], tied: candidates };
  }
  const scored = candidates.map(row => ({
    row,
    diff: Math.abs((row.anchorMs ?? targetMs) - targetMs),
  }));
  scored.sort((a, b) => a.diff - b.diff);
  const bestDiff = scored[0].diff;
  const closest = scored.filter(item => item.diff === bestDiff).map(item => item.row);
  return closest.length === 1
    ? { unique: closest, tied: [] }
    : { unique: [], tied: closest };
}

function buildSubmissionCandidate(submission, submissionsTable, fields) {
  return {
    id: submission.id,
    name: getText(submission, submissionsTable, fields.name),
    activityDate: formatDate(submission, submissionsTable, fields.activityDate),
    submittedAt: formatDate(submission, submissionsTable, fields.submittedAt),
    anchorMs: submissionAnchorMs(submission, submissionsTable, fields),
    recordIdText: getText(submission, submissionsTable, fields.recordId),
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

function printTable(title, rows) {
  console.log(`\n----- ${title} (${rows.length}) -----`);
  if (rows.length === 0) {
    console.log("(none)");
    return;
  }
  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
  if (typeof output !== "undefined" && output.table) {
    output.markdown(`### ${title} (${rows.length})`);
    output.table(rows);
  }
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const videoTable = base.getTable(CONFIG.tables.video);

  const homeworkNameField = resolveField(homeworkTable, CONFIG.homework.nameCandidates);
  const homeworkSubmissionField = resolveField(
    homeworkTable,
    CONFIG.homework.submissionCandidates
  );

  if (!homeworkSubmissionField) {
    console.log(
      "WARNING: No Homework Completions submission link field found (expected Submissions - Linked or Submission)."
    );
  }

  const submissionFieldList = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const assetFieldList = Object.values(CONFIG.assets).filter(name =>
    fieldExists(assetsTable, name)
  );
  const homeworkFieldList = [
    ...new Set([
      homeworkNameField,
      homeworkSubmissionField,
      CONFIG.homework.recordId,
      CONFIG.homework.enrollment,
      CONFIG.homework.week,
      CONFIG.homework.submittedAt,
      CONFIG.homework.homeworkName,
      CONFIG.homework.submissionAssets,
      CONFIG.homework.submissionAssetForReview,
      CONFIG.homework.assetSlot,
      CONFIG.homework.created,
    ]),
  ].filter(name => fieldExists(homeworkTable, name));
  const videoFieldList = Object.values(CONFIG.video).filter(name =>
    fieldExists(videoTable, name)
  );

  const [submissionQuery, assetQuery, homeworkQuery, videoQuery] = await Promise.all([
    submissionsTable.selectRecordsAsync({ fields: submissionFieldList }),
    assetsTable.selectRecordsAsync({ fields: assetFieldList }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFieldList }),
    videoTable.selectRecordsAsync({ fields: videoFieldList }),
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

  const assetById = new Map();
  for (const asset of assetQuery.records) {
    assetById.set(asset.id, asset);
  }

  const results = {
    [GROUPS.SAFE_ASSET]: [],
    [GROUPS.AMBIGUOUS_ASSET]: [],
    [GROUPS.NO_ASSET]: [],
    [GROUPS.SAFE_HOMEWORK]: [],
    [GROUPS.AMBIGUOUS_HOMEWORK]: [],
    [GROUPS.NO_HOMEWORK]: [],
  };

  let orphanAssetCount = 0;
  let homeworkMissingSubmissionCount = 0;

  for (const asset of assetQuery.records) {
    const hasFile = hasAttachments(asset, assetsTable, CONFIG.assets.attachment);
    const submissionLinked = getLinkedIds(asset, assetsTable, CONFIG.assets.submission);
    const enrollmentId = getFirstLinkedId(asset, assetsTable, CONFIG.assets.enrollment);

    if (!hasFile || submissionLinked.length > 0 || !enrollmentId) continue;
    orphanAssetCount += 1;

    const assetName = getText(asset, assetsTable, CONFIG.assets.name);
    const assetCreated = formatDate(asset, assetsTable, CONFIG.assets.created);
    const assetSlot = inferAssetSlot(asset, assetsTable, CONFIG.assets);
    const uploadDestination = getSelectName(
      asset,
      assetsTable,
      CONFIG.assets.uploadDestination
    );
    const assetCreatedMs = getDateMs(asset, assetsTable, CONFIG.assets.created);

    const baseRow = {
      assetName,
      assetRecordId: asset.id,
      assetCreated,
      assetSlot: assetSlot || "—",
      uploadDestination: uploadDestination || "—",
      currentSubmissionLinksCount: submissionLinked.length,
    };

    let match = null;

    const recordIdHints = collectSubmissionHints(
      getText(asset, assetsTable, CONFIG.assets.recordId),
      getText(asset, assetsTable, CONFIG.assets.submissionRecordIdLkp)
    );
    const uniqueRecordIdMatches = resolveRecordIdMatches(
      recordIdHints,
      submissionById,
      submissionByRecordIdText,
      submissionsTable,
      CONFIG.submissions
    );

    if (uniqueRecordIdMatches.length === 1) {
      match = {
        status: GROUPS.SAFE_ASSET,
        reason: "RecordId - Submission Table / asset RecordId matches one Submission",
        submissionId: uniqueRecordIdMatches[0].id,
      };
    } else if (uniqueRecordIdMatches.length > 1) {
      match = {
        status: GROUPS.AMBIGUOUS_ASSET,
        reason: "RecordId hints match multiple Submissions",
        candidates: uniqueRecordIdMatches,
      };
    }

    if (!match) {
      const hwIds = getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions);
      const hwSubmissionIds = new Set();
      for (const hwId of hwIds) {
        const hw = homeworkById.get(hwId);
        if (!hw) continue;
        const hwSubmissionId = getFirstLinkedId(hw, homeworkTable, homeworkSubmissionField);
        if (hwSubmissionId) hwSubmissionIds.add(hwSubmissionId);
      }
      if (hwSubmissionIds.size === 1) {
        const submissionId = [...hwSubmissionIds][0];
        match = {
          status: GROUPS.SAFE_ASSET,
          reason: "Linked Homework Completion points to one Submission",
          submissionId,
        };
      } else if (hwSubmissionIds.size > 1) {
        match = {
          status: GROUPS.AMBIGUOUS_ASSET,
          reason: "Linked Homework Completions point to multiple Submissions",
          candidates: [...hwSubmissionIds]
            .map(id => submissionById.get(id))
            .filter(Boolean)
            .map(submission =>
              buildSubmissionCandidate(submission, submissionsTable, CONFIG.submissions)
            ),
        };
      }
    }

    if (!match) {
      const enrollmentSubmissions = submissionsByEnrollment.get(enrollmentId) || [];
      let slotFiltered = enrollmentSubmissions.filter(submission =>
        submissionMatchesSlot(
          submission,
          submissionsTable,
          CONFIG.submissions,
          assetSlot
        )
      );
      if (slotFiltered.length === 0 && assetSlot) {
        slotFiltered = enrollmentSubmissions;
      }

      const candidateRows = slotFiltered.map(submission =>
        buildSubmissionCandidate(submission, submissionsTable, CONFIG.submissions)
      );
      const withinWindow = candidatesWithinDateWindow(
        candidateRows,
        assetCreatedMs,
        DATE_WINDOW_MS
      );

      if (withinWindow.length === 1) {
        match = {
          status: GROUPS.SAFE_ASSET,
          reason: `Same enrollment${assetSlot ? ` + slot ${assetSlot}` : ""} + exactly one submission within 3 days of asset Created`,
          submissionId: withinWindow[0].id,
        };
      } else if (withinWindow.length > 1) {
        match = {
          status: GROUPS.AMBIGUOUS_ASSET,
          reason: `Same enrollment${assetSlot ? ` + slot ${assetSlot}` : ""} but multiple submissions within 3-day Created window`,
          candidates: withinWindow,
        };
      } else if (candidateRows.length === 0) {
        match = {
          status: GROUPS.NO_ASSET,
          reason: "No submissions for enrollment/slot",
        };
      } else {
        match = {
          status: GROUPS.NO_ASSET,
          reason: "No submission within 3-day Created window",
        };
      }
    }

    const proposed =
      match.submissionId && submissionById.has(match.submissionId)
        ? buildSubmissionCandidate(
            submissionById.get(match.submissionId),
            submissionsTable,
            CONFIG.submissions
          )
        : null;

    const row = {
      ...baseRow,
      proposedSubmissionName: proposed?.name || "—",
      proposedSubmissionId: proposed?.id || "—",
      proposedSubmissionActivityDate: proposed?.activityDate || "—",
      proposedSubmissionSubmittedAt: proposed?.submittedAt || "—",
      matchReason: match.reason,
    };

    if (match.status === GROUPS.AMBIGUOUS_ASSET) {
      row.candidateSubmissions = (match.candidates || [])
        .map(c => `${c.name} (${c.id})`)
        .join("; ");
    }

    results[match.status].push(row);
  }

  for (const hw of homeworkQuery.records) {
    const submissionId = getFirstLinkedId(hw, homeworkTable, homeworkSubmissionField);
    if (submissionId) continue;
    homeworkMissingSubmissionCount += 1;

    const hwName = homeworkNameField
      ? getText(hw, homeworkTable, homeworkNameField)
      : hw.id;
    const linkedAssetIds = [
      ...getLinkedIds(hw, homeworkTable, CONFIG.homework.submissionAssets),
      ...getLinkedIds(hw, homeworkTable, CONFIG.homework.submissionAssetForReview),
    ].filter((id, index, arr) => id && arr.indexOf(id) === index);

    const baseRow = {
      homeworkCompletionName: hwName,
      homeworkRecordId: hw.id,
      linkedAssetCount: linkedAssetIds.length,
    };

    let match = null;

    const assetSubmissionIds = new Set();
    for (const assetId of linkedAssetIds) {
      const asset = assetById.get(assetId);
      if (!asset) continue;
      const linkedSubmissionId = getFirstLinkedId(
        asset,
        assetsTable,
        CONFIG.assets.submission
      );
      if (linkedSubmissionId) assetSubmissionIds.add(linkedSubmissionId);
    }

    if (assetSubmissionIds.size === 1) {
      match = {
        status: GROUPS.SAFE_HOMEWORK,
        reason: "Exactly one linked Submission Asset has Submission - Linked",
        submissionId: [...assetSubmissionIds][0],
      };
    } else if (assetSubmissionIds.size > 1) {
      match = {
        status: GROUPS.AMBIGUOUS_HOMEWORK,
        reason: "Linked Submission Assets point to multiple Submissions",
        candidates: [...assetSubmissionIds]
          .map(id => submissionById.get(id))
          .filter(Boolean)
          .map(submission =>
            buildSubmissionCandidate(submission, submissionsTable, CONFIG.submissions)
          ),
      };
    }

    if (!match) {
      const enrollmentId = getFirstLinkedId(hw, homeworkTable, CONFIG.homework.enrollment);
      const weekId = getFirstLinkedId(hw, homeworkTable, CONFIG.homework.week);
      let hwSlot = inferHomeworkSlot(hw, homeworkTable, CONFIG.homework);
      let anchorMs =
        getDateMs(hw, homeworkTable, CONFIG.homework.submittedAt) ??
        getDateMs(hw, homeworkTable, CONFIG.homework.created) ??
        null;

      for (const assetId of linkedAssetIds) {
        const asset = assetById.get(assetId);
        if (!asset) continue;
        if (!hwSlot) hwSlot = inferAssetSlot(asset, assetsTable, CONFIG.assets);
        if (anchorMs == null) {
          anchorMs = getDateMs(asset, assetsTable, CONFIG.assets.created);
        }
      }

      let candidates = (submissionsByEnrollment.get(enrollmentId) || []).filter(submission => {
        if (weekId) {
          const submissionWeekId = getFirstLinkedId(
            submission,
            submissionsTable,
            CONFIG.submissions.week
          );
          if (submissionWeekId && submissionWeekId !== weekId) return false;
        }
        return submissionMatchesSlot(
          submission,
          submissionsTable,
          CONFIG.submissions,
          hwSlot
        );
      });

      if (candidates.length === 0 && enrollmentId) {
        candidates = submissionsByEnrollment.get(enrollmentId) || [];
      }

      const candidateRows = candidates.map(submission =>
        buildSubmissionCandidate(submission, submissionsTable, CONFIG.submissions)
      );

      if (candidateRows.length === 1) {
        match = {
          status: GROUPS.SAFE_HOMEWORK,
          reason: `Same enrollment${weekId ? " + week" : ""}${hwSlot ? ` + slot ${hwSlot}` : ""}: exactly one candidate`,
          submissionId: candidateRows[0].id,
        };
      } else if (candidateRows.length === 0) {
        match = {
          status: GROUPS.NO_HOMEWORK,
          reason: "No submissions match enrollment/week/slot",
        };
      } else {
        const { unique, tied } = pickUniqueClosest(candidateRows, anchorMs);
        if (unique.length === 1) {
          match = {
            status: GROUPS.SAFE_HOMEWORK,
            reason: `Same enrollment${weekId ? " + week" : ""}${hwSlot ? ` + slot ${hwSlot}` : ""} + closest date match`,
            submissionId: unique[0].id,
          };
        } else {
          match = {
            status: GROUPS.AMBIGUOUS_HOMEWORK,
            reason: "Multiple enrollment/week/slot candidates remain after date narrowing",
            candidates: tied.length ? tied : candidateRows,
          };
        }
      }
    }

    const proposed =
      match.submissionId && submissionById.has(match.submissionId)
        ? buildSubmissionCandidate(
            submissionById.get(match.submissionId),
            submissionsTable,
            CONFIG.submissions
          )
        : null;

    const row = {
      ...baseRow,
      proposedSubmissionName: proposed?.name || "—",
      proposedSubmissionId: proposed?.id || "—",
      matchReason: match.reason,
    };

    if (match.status === GROUPS.AMBIGUOUS_HOMEWORK) {
      row.candidateSubmissions = (match.candidates || [])
        .map(c => `${c.name} (${c.id})`)
        .join("; ");
    }

    results[match.status].push(row);
  }

  const summaryRows = [
    { metric: "Submissions scanned", count: submissionQuery.records.length },
    { metric: "Submission Assets scanned", count: assetQuery.records.length },
    { metric: "Homework Completions scanned", count: homeworkQuery.records.length },
    { metric: "Video Feedback scanned", count: videoQuery.records.length },
    { metric: "Orphan assets found", count: orphanAssetCount },
    { metric: "Safe asset matches", count: results[GROUPS.SAFE_ASSET].length },
    { metric: "Ambiguous asset matches", count: results[GROUPS.AMBIGUOUS_ASSET].length },
    { metric: "No asset matches", count: results[GROUPS.NO_ASSET].length },
    {
      metric: "Homework Completions missing Submission",
      count: homeworkMissingSubmissionCount,
    },
    { metric: "Safe homework matches", count: results[GROUPS.SAFE_HOMEWORK].length },
    { metric: "Ambiguous homework matches", count: results[GROUPS.AMBIGUOUS_HOMEWORK].length },
    { metric: "No homework matches", count: results[GROUPS.NO_HOMEWORK].length },
  ];

  console.log(`===== ${CONFIG.displayName} =====`);
  console.log(`Script: ${CONFIG.scriptName} ${CONFIG.version}`);
  console.log("Mode: DRY-RUN ONLY (no record changes)");
  console.log(
    JSON.stringify(
      {
        resolvedFields: {
          homeworkNameField,
          homeworkSubmissionField,
        },
      },
      null,
      2
    )
  );

  printTable("Summary", summaryRows);
  printTable("SAFE_ASSET_TO_SUBMISSION_MATCH", results[GROUPS.SAFE_ASSET]);
  printTable("AMBIGUOUS_ASSET_TO_SUBMISSION_MATCH", results[GROUPS.AMBIGUOUS_ASSET]);
  printTable("NO_ASSET_TO_SUBMISSION_MATCH", results[GROUPS.NO_ASSET]);
  printTable("SAFE_HOMEWORK_TO_SUBMISSION_MATCH", results[GROUPS.SAFE_HOMEWORK]);
  printTable("AMBIGUOUS_HOMEWORK_TO_SUBMISSION_MATCH", results[GROUPS.AMBIGUOUS_HOMEWORK]);
  printTable("NO_HOMEWORK_TO_SUBMISSION_MATCH", results[GROUPS.NO_HOMEWORK]);

  if (typeof output !== "undefined" && output.markdown) {
    output.markdown(
      "**Review SAFE rows before running a live repair script.** This extension did not update, create, or delete any records."
    );
  }

  console.log("\nReview SAFE rows before running a live repair script.");
}

await main();
