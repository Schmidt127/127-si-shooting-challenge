/*
Automation: 013 - Submission Intake - Create or Link Video Feedback
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-09
Last GitHub Update: 2026-08-20 (v3.2.0 V2 standard structure)

Purpose:
Create or link one Video Feedback row from a VIDEO Submission Asset,
with provenance hardening and blank-only Grade Band repair.

Trigger:
Submission Assets when a video asset is ready for Video Feedback prep
(confirm exact conditions in Airtable UI); pass the dynamic recordId.

Important Tables:
Submission Assets, Video Feedback, Submissions, Enrollments

Important Fields:
Asset Slot, Source Attachment ID, Submission - Linked, Enrollment - Linked,
Airtable Attachment, Video Feedback, Upload Status, Send to Make Trigger,
Video Feedback Key, Grade Band

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Supersedes separate 111 (copy Enrollment Grade Band → Video Feedback).
112 remains OFF / do not recreate.
*/

/************************************************************
 * 013 - SUBMISSION INTAKE AND ASSET CREATION
 * Create or Link Video Feedback
 *
 * Version: v3.2.0
 * Date Written: 2026-05-20
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v3.2.0 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, SCRIPT metadata separated from CONFIG, numbered
 *   sections, required outputs, debugStep reporting. Business logic unchanged
 *   from v3.1.0.
 * - v3.1.0 (2026-08-09): #103 provenance hardening — Asset Slot = VIDEO;
 *   exact Submission/Enrollment links; Source Attachment ID must exist on
 *   Submission.Video Upload; ownership conflicts fail closed.
 * - v3.0.0: Race guard before create; blank-only Grade Band repair;
 *   supersedes 111 Grade Band copy path.
 *
 * PURPOSE
 * - Runs from one Submission Asset record when the video asset is ready for
 *   Video Feedback prep.
 * - Creates or links exactly one Video Feedback row for that asset.
 * - Copies Enrollment Grade Band only when Video Feedback.Grade Band is blank.
 * - Marks the asset Pending Link and arms Send to Make Trigger for 070b.
 *
 * IMPORTANT DESIGN RULES
 * - 013 is the sole canonical Submission Asset → Video Feedback writer.
 * - 112 remains OFF / do not recreate.
 * - Requires Asset Slot = VIDEO exactly.
 * - Requires exactly one linked Submission and one linked Enrollment.
 * - Requires Submission Enrollment = asset Enrollment.
 * - Requires Source Attachment ID to exist in linked Submission.Video Upload.
 * - Video Upload source is authoritative regardless of MIME (video/PDF/image allowed).
 * - Existing Video Feedback ownership conflicts fail closed.
 * - Preserves v3.0 race guard and blank-only Grade Band repair.
 * - Video Feedback Key = VIDEO_FEEDBACK|{Submission Asset ID}.
 *
 * THIS IS NOT
 * - Submission asset creation (009).
 * - Make / S3 video upload handoff (070b / 070c).
 * - Child upload writeback sync (022).
 * - Video XP award (113 / 114).
 * - Legacy Grade Band-only copy (111 — retired; do not recreate).
 *
 * FOLDER
 * - 01 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 013 - Submission Intake - Create or Link Video Feedback
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Asset Slot = VIDEO
 * - Video asset ready for Video Feedback prep (confirm exact UI conditions)
 * - Input variable recordId = triggering Submission Asset record ID
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Airtable Attachment is not empty (script also fails closed if missing)
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Run 112 in parallel (legacy duplicate writer — must stay OFF)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Submission Asset record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_new_video_feedback | linked_existing_or_repaired | error
 * - gradeBandActionOut = copied_grade_band | already_has_grade_band |
 *   skipped_no_enrollment_grade_band | (empty when N/A)
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - submissionAssetId / videoFeedbackId / submissionId / enrollmentId / gradeBandId
 * - readyToSendToMake / whyNotReadyForMake
 *
 * PRIMARY TABLES USED
 * - Submission Assets, Video Feedback, Submissions, Enrollments
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Video Feedback → Submission Asset, Submission, Enrollment, Grade Band,
 *   Video Feedback Key, Active?, Asset Type, Workflow Status, Upload Status,
 *   Upload Error
 * - Submission Assets → Video Feedback, Upload Status, Send to Make Trigger,
 *   Upload Error
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "013 - Submission Intake - Create or Link Video Feedback",
  version: "v3.2.0",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-05-20",
  lastUpdated: "2026-08-20",
  folder: "01 - Submission Intake and Asset Creation",
  automationName: "013 - Submission Intake - Create or Link Video Feedback",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    videoFeedback: "Video Feedback",
    submissions: "Submissions",
    enrollments: "Enrollments",
  },
  assets: {
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetPurpose: "Asset Purpose",
    uploadDestination: "Upload Destination",
    attachment: "Airtable Attachment",
    sourceAttachmentId: "Source Attachment ID",
    assetType: "Asset Type",
    assetSlot: "Asset Slot",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    sendToMakeTrigger: "Send to Make Trigger",
    readyToSendToMake: "Ready to Send to Make?",
    whyNotReadyForMake: "Why Not Ready for Make?",
  },
  submissions: {
    enrollment: "Enrollment",
    videoUpload: "Video Upload",
  },
  video: {
    key: "Video Feedback Key",
    submissionAsset: "Submission Asset",
    submission: "Submission",
    enrollment: "Enrollment",
    gradeBand: "Grade Band",
    assetType: "Asset Type",
    active: "Active?",
    workflowStatus: "Video Feedback Workflow Status",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
  },
  enrollment: {
    gradeBand: "Grade Band",
  },
  values: {
    makeSendStatus: "Pending Link",
    videoKeyPrefix: "VIDEO_FEEDBACK",
  },
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    created: "created_new_video_feedback",
    linkedOrRepaired: "linked_existing_or_repaired",
    error: "error",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped output keys.
  }
}

function step(name) {
  debugStep = name;
  setOutputSafe("debugStep", debugStep);
}

function setOutputs(data) {
  for (const [k, v] of Object.entries(data)) setOutputSafe(k, v);
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      ...data,
    })
  );
}

function field(table, name) {
  return table.fields.find((f) => f.name === name);
}

function exists(table, name) {
  return Boolean(field(table, name));
}

function writable(table, name) {
  const f = field(table, name);
  if (!f) return false;
  return !new Set([
    "formula",
    "rollup",
    "count",
    "lookup",
    "multipleLookupValues",
    "createdTime",
    "lastModifiedTime",
    "autoNumber",
    "createdBy",
    "lastModifiedBy",
    "button",
    "externalSyncSource",
  ]).has(f.type);
}

function safe(table, names) {
  return [...new Set(names)].filter((n) => exists(table, n));
}

function cell(record, name) {
  try {
    return record.getCellValue(name);
  } catch {
    return null;
  }
}

function text(record, name) {
  try {
    return String(record.getCellValueAsString(name) || "").trim();
  } catch {
    return "";
  }
}

function links(record, name) {
  const v = cell(record, name);
  return Array.isArray(v) ? v.map((x) => x?.id).filter(Boolean) : [];
}

function attachments(record, name) {
  const v = cell(record, name);
  return Array.isArray(v) ? v : [];
}

function sameIds(a, b) {
  const x = [...new Set((a || []).filter(Boolean))].sort();
  const y = [...new Set((b || []).filter(Boolean))].sort();
  return x.length === y.length && x.every((id, i) => id === y[i]);
}

function mergeIds(a, b) {
  return [...new Set([...(a || []), ...(b || [])].filter(Boolean))];
}

function choiceExists(table, name, choice) {
  const f = field(table, name);
  return Boolean(f?.options?.choices?.some((c) => c.name === choice));
}

function firstChoice(table, name, choices) {
  return choices.find((c) => c && choiceExists(table, name, c)) || "";
}

function setLink(fields, table, name, ids) {
  if (writable(table, name)) fields[name] = [...new Set((ids || []).filter(Boolean))].map((id) => ({ id }));
}

function setText(fields, table, name, value) {
  if (writable(table, name) && value !== undefined && value !== null) fields[name] = String(value);
}

function setChoice(fields, table, name, value) {
  if (writable(table, name) && value && choiceExists(table, name, value)) fields[name] = { name: value };
}

function setCheck(fields, table, name, value) {
  if (writable(table, name)) fields[name] = Boolean(value);
}

function videoKey(assetId) {
  return `${CONFIG.values.videoKeyPrefix}|${assetId}`;
}

function decideGradeBandRepair({ currentGradeBandIds, enrollmentGradeBandIds }) {
  if ((currentGradeBandIds || []).length > 0) {
    return { action: "already_has_grade_band", write: false, ids: currentGradeBandIds };
  }
  if (!(enrollmentGradeBandIds || []).length) {
    return { action: "skipped_no_enrollment_grade_band", write: false, ids: [] };
  }
  return { action: "copied_grade_band", write: true, ids: enrollmentGradeBandIds };
}

function findCandidates(videoQuery, assetId, key, assetLinkedIds) {
  const map = new Map();
  for (const vf of videoQuery.records) {
    const linkedAssetIds = links(vf, CONFIG.video.submissionAsset);
    if (linkedAssetIds.includes(assetId) || text(vf, CONFIG.video.key) === key || assetLinkedIds.includes(vf.id)) {
      map.set(vf.id, vf);
    }
  }
  return [...map.values()];
}

function assertOwnership(vf, { assetId, submissionId, enrollmentId, key }) {
  const a = links(vf, CONFIG.video.submissionAsset);
  const s = links(vf, CONFIG.video.submission);
  const e = links(vf, CONFIG.video.enrollment);
  const k = text(vf, CONFIG.video.key);
  const conflicts = [];
  if (a.length && !sameIds(a, [assetId])) conflicts.push("Submission Asset");
  if (s.length && !sameIds(s, [submissionId])) conflicts.push("Submission");
  if (e.length && !sameIds(e, [enrollmentId])) conflicts.push("Enrollment");
  if (k && k !== key) conflicts.push("Video Feedback Key");
  if (conflicts.length) throw new Error(`Video Feedback ${vf.id} ownership conflict: ${conflicts.join(", ")}`);
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("1 - Validate recordId");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  if (!recordId) throw new Error("Missing required input variable: recordId");
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);

  step("2 - Load tables");
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const videoTable = base.getTable(CONFIG.tables.videoFeedback);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  step("3 - Load submission asset");
  const aq = await assetsTable.selectRecordsAsync({ fields: safe(assetsTable, Object.values(CONFIG.assets)) });
  const asset = aq.getRecord(recordId);
  if (!asset) throw new Error(`Submission Asset not found: ${recordId}`);

  const slot = text(asset, CONFIG.assets.assetSlot);
  const sourceAttachmentId = text(asset, CONFIG.assets.sourceAttachmentId);
  const submissionIds = links(asset, CONFIG.assets.submission);
  const enrollmentIds = links(asset, CONFIG.assets.enrollment);
  const existingAssetVideoIds = links(asset, CONFIG.assets.videoFeedback);
  const fileCount = attachments(asset, CONFIG.assets.attachment).length;
  const assetType = text(asset, CONFIG.assets.assetType);

  step("4 - Validate video provenance");
  if (slot !== "VIDEO") throw new Error(`Asset Slot must be VIDEO exactly; found '${slot || "blank"}'`);
  if (submissionIds.length !== 1) {
    throw new Error(`Video asset must link exactly one Submission; found ${submissionIds.length}`);
  }
  if (enrollmentIds.length !== 1) {
    throw new Error(`Video asset must link exactly one Enrollment; found ${enrollmentIds.length}`);
  }
  if (existingAssetVideoIds.length > 1) {
    throw new Error(`Video asset links multiple Video Feedback records; found ${existingAssetVideoIds.length}`);
  }
  if (fileCount === 0) throw new Error(`Video asset has no Airtable Attachment: ${asset.id}`);
  if (!sourceAttachmentId) throw new Error(`Video asset is missing Source Attachment ID: ${asset.id}`);

  const sq = await submissionsTable.selectRecordsAsync({
    fields: safe(submissionsTable, Object.values(CONFIG.submissions)),
  });
  const submission = sq.getRecord(submissionIds[0]);
  if (!submission) throw new Error(`Linked Submission not found: ${submissionIds[0]}`);

  const submissionEnrollmentIds = links(submission, CONFIG.submissions.enrollment);
  if (submissionEnrollmentIds.length !== 1 || submissionEnrollmentIds[0] !== enrollmentIds[0]) {
    throw new Error(`Submission Enrollment does not match asset Enrollment for ${asset.id}`);
  }

  const videoUploadIds = attachments(submission, CONFIG.submissions.videoUpload)
    .map((a) => a?.id)
    .filter(Boolean);
  if (!videoUploadIds.includes(sourceAttachmentId)) {
    throw new Error(
      `Source Attachment ID ${sourceAttachmentId} is not present in linked Submission.Video Upload; repair 009 provenance first`
    );
  }

  step("5 - Load enrollment grade band");
  let gradeBandIds = [];
  if (exists(enrollmentsTable, CONFIG.enrollment.gradeBand)) {
    const eq = await enrollmentsTable.selectRecordsAsync({
      fields: safe(enrollmentsTable, [CONFIG.enrollment.gradeBand]),
    });
    const enrollment = eq.getRecord(enrollmentIds[0]);
    if (enrollment) gradeBandIds = links(enrollment, CONFIG.enrollment.gradeBand);
    try {
      if (typeof eq.unloadData === "function") eq.unloadData();
    } catch {
      // unload is best-effort
    }
  }

  step("6 - Find existing video feedback");
  let vq = await videoTable.selectRecordsAsync({ fields: safe(videoTable, Object.values(CONFIG.video)) });
  const key = videoKey(asset.id);
  let candidates = findCandidates(vq, asset.id, key, existingAssetVideoIds);
  if (candidates.length > 1) {
    throw new Error(`Multiple Video Feedback candidates found: ${candidates.map((v) => v.id).join(", ")}`);
  }

  let vf = candidates[0] || null;
  let videoFeedbackId = "";
  let actionOut = "";
  let gradeBandActionOut = gradeBandIds.length ? "" : "skipped_no_enrollment_grade_band";
  let finalGradeBandId = "";

  if (!vf) {
    // v3.0 race guard: re-query immediately before create.
    step("7 - Recheck video feedback before create");
    vq = await videoTable.selectRecordsAsync({ fields: safe(videoTable, Object.values(CONFIG.video)) });
    candidates = findCandidates(vq, asset.id, key, existingAssetVideoIds);
    if (candidates.length > 1) {
      throw new Error(
        `Multiple Video Feedback candidates found during race guard: ${candidates.map((v) => v.id).join(", ")}`
      );
    }
    vf = candidates[0] || null;
  }

  if (vf) {
    step("8 - Repair existing video feedback");
    assertOwnership(vf, {
      assetId: asset.id,
      submissionId: submission.id,
      enrollmentId: enrollmentIds[0],
      key,
    });

    const fields = {};
    const currentAssetIds = links(vf, CONFIG.video.submissionAsset);
    const currentSubmissionIds = links(vf, CONFIG.video.submission);
    const currentEnrollmentIds = links(vf, CONFIG.video.enrollment);
    const currentGradeBandIds = links(vf, CONFIG.video.gradeBand);

    if (!sameIds(currentAssetIds, [asset.id])) setLink(fields, videoTable, CONFIG.video.submissionAsset, [asset.id]);
    if (!sameIds(currentSubmissionIds, [submission.id])) {
      setLink(fields, videoTable, CONFIG.video.submission, [submission.id]);
    }
    if (!sameIds(currentEnrollmentIds, enrollmentIds)) {
      setLink(fields, videoTable, CONFIG.video.enrollment, enrollmentIds);
    }

    const gb = decideGradeBandRepair({
      currentGradeBandIds,
      enrollmentGradeBandIds: gradeBandIds,
    });
    gradeBandActionOut = gb.action;
    finalGradeBandId = gb.ids[0] || "";
    if (gb.write) setLink(fields, videoTable, CONFIG.video.gradeBand, gb.ids);

    setText(fields, videoTable, CONFIG.video.key, key);
    if (cell(vf, CONFIG.video.active) !== true) setCheck(fields, videoTable, CONFIG.video.active, true);

    if (!text(vf, CONFIG.video.workflowStatus)) {
      const c = firstChoice(videoTable, CONFIG.video.workflowStatus, [
        "Pending Upload",
        "Pending",
        "Ready",
        "Processing",
      ]);
      if (c) setChoice(fields, videoTable, CONFIG.video.workflowStatus, c);
    }
    if (!text(vf, CONFIG.video.uploadStatus)) {
      const c = firstChoice(videoTable, CONFIG.video.uploadStatus, ["Pending Upload", "Pending", "Ready"]);
      if (c) setChoice(fields, videoTable, CONFIG.video.uploadStatus, c);
    }
    if (writable(videoTable, CONFIG.video.uploadError)) fields[CONFIG.video.uploadError] = "";

    if (Object.keys(fields).length) await videoTable.updateRecordAsync(vf.id, fields);
    videoFeedbackId = vf.id;
    actionOut = CONFIG.actions.linkedOrRepaired;
  } else {
    step("8 - Create video feedback");
    const fields = {};
    setLink(fields, videoTable, CONFIG.video.submissionAsset, [asset.id]);
    setLink(fields, videoTable, CONFIG.video.submission, [submission.id]);
    setLink(fields, videoTable, CONFIG.video.enrollment, enrollmentIds);
    if (gradeBandIds.length) {
      setLink(fields, videoTable, CONFIG.video.gradeBand, gradeBandIds);
      gradeBandActionOut = "copied_grade_band";
      finalGradeBandId = gradeBandIds[0] || "";
    }
    setText(fields, videoTable, CONFIG.video.key, key);
    setCheck(fields, videoTable, CONFIG.video.active, true);
    if (writable(videoTable, CONFIG.video.uploadError)) fields[CONFIG.video.uploadError] = "";

    const typeChoice = firstChoice(videoTable, CONFIG.video.assetType, [assetType, "Video Feedback", "Video"]);
    const workflowChoice = firstChoice(videoTable, CONFIG.video.workflowStatus, [
      "Pending Upload",
      "Pending",
      "Ready",
      "Processing",
    ]);
    const uploadChoice = firstChoice(videoTable, CONFIG.video.uploadStatus, ["Pending Upload", "Pending", "Ready"]);
    if (typeChoice) setChoice(fields, videoTable, CONFIG.video.assetType, typeChoice);
    if (workflowChoice) setChoice(fields, videoTable, CONFIG.video.workflowStatus, workflowChoice);
    if (uploadChoice) setChoice(fields, videoTable, CONFIG.video.uploadStatus, uploadChoice);

    videoFeedbackId = await videoTable.createRecordAsync(fields);
    actionOut = CONFIG.actions.created;
  }

  try {
    if (typeof aq.unloadData === "function") aq.unloadData();
  } catch {
    // unload is best-effort
  }
  try {
    if (typeof sq.unloadData === "function") sq.unloadData();
  } catch {
    // unload is best-effort
  }
  try {
    if (typeof vq.unloadData === "function") vq.unloadData();
  } catch {
    // unload is best-effort
  }

  step("9 - Mark asset pending link");
  const assetFields = {};
  const desiredVideoIds = mergeIds(existingAssetVideoIds, [videoFeedbackId]);
  if (!sameIds(existingAssetVideoIds, desiredVideoIds)) {
    setLink(assetFields, assetsTable, CONFIG.assets.videoFeedback, desiredVideoIds);
  }

  const pendingLinkChoice = firstChoice(assetsTable, CONFIG.assets.uploadStatus, [CONFIG.values.makeSendStatus]);
  if (pendingLinkChoice && text(asset, CONFIG.assets.uploadStatus) !== pendingLinkChoice) {
    setChoice(assetFields, assetsTable, CONFIG.assets.uploadStatus, pendingLinkChoice);
  }
  if (cell(asset, CONFIG.assets.sendToMakeTrigger) !== true) {
    setCheck(assetFields, assetsTable, CONFIG.assets.sendToMakeTrigger, true);
  }
  if (text(asset, CONFIG.assets.uploadError) && writable(assetsTable, CONFIG.assets.uploadError)) {
    assetFields[CONFIG.assets.uploadError] = "";
  }
  if (Object.keys(assetFields).length) await assetsTable.updateRecordAsync(asset.id, assetFields);

  step("10 - Finalize outputs");
  const finalAssetQuery = await assetsTable.selectRecordsAsync({
    fields: safe(assetsTable, Object.values(CONFIG.assets)),
  });
  const finalAsset = finalAssetQuery.getRecord(asset.id);
  try {
    if (typeof finalAssetQuery.unloadData === "function") finalAssetQuery.unloadData();
  } catch {
    // unload is best-effort
  }

  if (!finalGradeBandId && gradeBandIds.length) finalGradeBandId = gradeBandIds[0];

  setOutputs({
    statusOut: CONFIG.statuses.success,
    actionOut,
    gradeBandActionOut,
    errorOut: "",
    debugStep,
    submissionAssetId: asset.id,
    videoFeedbackId,
    submissionId: submission.id,
    enrollmentId: enrollmentIds[0],
    gradeBandId: finalGradeBandId,
    readyToSendToMake: finalAsset ? text(finalAsset, CONFIG.assets.readyToSendToMake) : "",
    whyNotReadyForMake: finalAsset ? text(finalAsset, CONFIG.assets.whyNotReadyForMake) : "",
  });
}

/* =========================================================
   SECTION 5: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputs({
    statusOut: CONFIG.statuses.error,
    actionOut: CONFIG.actions.error,
    gradeBandActionOut: "",
    errorOut: `FAILED AT: ${debugStep} | ${message}`,
    debugStep,
  });
  throw error;
}
