/************************************************************
 * 013 - Submission Intake - Create or Link Video Feedback
 * Version: v3.1.0
 * Date Written: 2026-05-20
 * Last Updated: 2026-08-09
 * Supersedes: separate 111 (copy Enrollment Grade Band → Video Feedback)
 *
 * v3.1.0 preserves v3.0.0 behavior and adds #103 provenance hardening:
 * - 013 remains the sole canonical Submission Asset → Video Feedback writer.
 * - 112 remains OFF / do not recreate.
 * - Requires Asset Slot = VIDEO exactly.
 * - Requires exactly one linked Submission and one linked Enrollment.
 * - Requires Submission Enrollment = asset Enrollment.
 * - Requires Source Attachment ID to exist in linked Submission.Video Upload.
 * - Video Upload source is authoritative regardless of MIME (video/PDF/image allowed).
 * - Existing Video Feedback ownership conflicts fail closed.
 * - Preserves v3.0 race guard and blank-only Grade Band repair.
 ************************************************************/

// @ts-nocheck

const CONFIG = {
  scriptName: "013 - Submission Intake - Create or Link Video Feedback",
  version: "v3.1.0",
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
  enrollment: { gradeBand: "Grade Band" },
  values: {
    makeSendStatus: "Pending Link",
    videoKeyPrefix: "VIDEO_FEEDBACK",
  },
  outputStatuses: { success: "success", skipped: "skipped", error: "error" },
};

function out(name, value) { try { output.set(name, value); } catch {} }
function field(table, name) { return table.fields.find(f => f.name === name); }
function exists(table, name) { return Boolean(field(table, name)); }
function writable(table, name) {
  const f = field(table, name);
  if (!f) return false;
  return !new Set([
    "formula","rollup","count","lookup","multipleLookupValues","createdTime",
    "lastModifiedTime","autoNumber","createdBy","lastModifiedBy","button","externalSyncSource"
  ]).has(f.type);
}
function safe(table, names) { return [...new Set(names)].filter(n => exists(table, n)); }
function cell(record, name) { try { return record.getCellValue(name); } catch { return null; } }
function text(record, name) { try { return String(record.getCellValueAsString(name) || "").trim(); } catch { return ""; } }
function links(record, name) {
  const v = cell(record, name);
  return Array.isArray(v) ? v.map(x => x?.id).filter(Boolean) : [];
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
function mergeIds(a, b) { return [...new Set([...(a || []), ...(b || [])].filter(Boolean))]; }
function choiceExists(table, name, choice) {
  const f = field(table, name);
  return Boolean(f?.options?.choices?.some(c => c.name === choice));
}
function firstChoice(table, name, choices) { return choices.find(c => c && choiceExists(table, name, c)) || ""; }
function setLink(fields, table, name, ids) {
  if (writable(table, name)) fields[name] = [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}
function setText(fields, table, name, value) {
  if (writable(table, name) && value !== undefined && value !== null) fields[name] = String(value);
}
function setChoice(fields, table, name, value) {
  if (writable(table, name) && value && choiceExists(table, name, value)) fields[name] = { name: value };
}
function setCheck(fields, table, name, value) { if (writable(table, name)) fields[name] = Boolean(value); }
function videoKey(assetId) { return `${CONFIG.values.videoKeyPrefix}|${assetId}`; }

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

function finalOutputs(data) {
  for (const [k, v] of Object.entries(data)) out(k, v);
  console.log(JSON.stringify({ automation: CONFIG.scriptName, version: CONFIG.version, ...data }));
}

async function main() {
  let debugStep = "start";
  const recordId = String(input.config().recordId || "").trim();
  if (!recordId) throw new Error("Missing required input variable: recordId");
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const videoTable = base.getTable(CONFIG.tables.videoFeedback);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  debugStep = "load_submission_asset";
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

  debugStep = "validate_video_provenance";
  if (slot !== "VIDEO") throw new Error(`Asset Slot must be VIDEO exactly; found '${slot || "blank"}'`);
  if (submissionIds.length !== 1) throw new Error(`Video asset must link exactly one Submission; found ${submissionIds.length}`);
  if (enrollmentIds.length !== 1) throw new Error(`Video asset must link exactly one Enrollment; found ${enrollmentIds.length}`);
  if (existingAssetVideoIds.length > 1) throw new Error(`Video asset links multiple Video Feedback records; found ${existingAssetVideoIds.length}`);
  if (fileCount === 0) throw new Error(`Video asset has no Airtable Attachment: ${asset.id}`);
  if (!sourceAttachmentId) throw new Error(`Video asset is missing Source Attachment ID: ${asset.id}`);

  const sq = await submissionsTable.selectRecordsAsync({ fields: safe(submissionsTable, Object.values(CONFIG.submissions)) });
  const submission = sq.getRecord(submissionIds[0]);
  if (!submission) throw new Error(`Linked Submission not found: ${submissionIds[0]}`);

  const submissionEnrollmentIds = links(submission, CONFIG.submissions.enrollment);
  if (submissionEnrollmentIds.length !== 1 || submissionEnrollmentIds[0] !== enrollmentIds[0]) {
    throw new Error(`Submission Enrollment does not match asset Enrollment for ${asset.id}`);
  }

  const videoUploadIds = attachments(submission, CONFIG.submissions.videoUpload).map(a => a?.id).filter(Boolean);
  if (!videoUploadIds.includes(sourceAttachmentId)) {
    throw new Error(`Source Attachment ID ${sourceAttachmentId} is not present in linked Submission.Video Upload; repair 009 provenance first`);
  }

  debugStep = "load_enrollment_grade_band";
  let gradeBandIds = [];
  if (exists(enrollmentsTable, CONFIG.enrollment.gradeBand)) {
    const eq = await enrollmentsTable.selectRecordsAsync({ fields: safe(enrollmentsTable, [CONFIG.enrollment.gradeBand]) });
    const enrollment = eq.getRecord(enrollmentIds[0]);
    if (enrollment) gradeBandIds = links(enrollment, CONFIG.enrollment.gradeBand);
  }

  debugStep = "find_existing_video_feedback";
  let vq = await videoTable.selectRecordsAsync({ fields: safe(videoTable, Object.values(CONFIG.video)) });
  const key = videoKey(asset.id);
  let candidates = findCandidates(vq, asset.id, key, existingAssetVideoIds);
  if (candidates.length > 1) throw new Error(`Multiple Video Feedback candidates found: ${candidates.map(v => v.id).join(", ")}`);

  let vf = candidates[0] || null;
  let videoFeedbackId = "";
  let actionOut = "";
  let gradeBandActionOut = gradeBandIds.length ? "" : "skipped_no_enrollment_grade_band";
  let finalGradeBandId = "";

  if (!vf) {
    // v3.0 race guard: re-query immediately before create.
    debugStep = "recheck_video_feedback_before_create";
    vq = await videoTable.selectRecordsAsync({ fields: safe(videoTable, Object.values(CONFIG.video)) });
    candidates = findCandidates(vq, asset.id, key, existingAssetVideoIds);
    if (candidates.length > 1) throw new Error(`Multiple Video Feedback candidates found during race guard: ${candidates.map(v => v.id).join(", ")}`);
    vf = candidates[0] || null;
  }

  if (vf) {
    debugStep = "repair_existing_video_feedback";
    assertOwnership(vf, { assetId: asset.id, submissionId: submission.id, enrollmentId: enrollmentIds[0], key });

    const fields = {};
    const currentAssetIds = links(vf, CONFIG.video.submissionAsset);
    const currentSubmissionIds = links(vf, CONFIG.video.submission);
    const currentEnrollmentIds = links(vf, CONFIG.video.enrollment);
    const currentGradeBandIds = links(vf, CONFIG.video.gradeBand);

    if (!sameIds(currentAssetIds, [asset.id])) setLink(fields, videoTable, CONFIG.video.submissionAsset, [asset.id]);
    if (!sameIds(currentSubmissionIds, [submission.id])) setLink(fields, videoTable, CONFIG.video.submission, [submission.id]);
    if (!sameIds(currentEnrollmentIds, enrollmentIds)) setLink(fields, videoTable, CONFIG.video.enrollment, enrollmentIds);

    const gb = decideGradeBandRepair({ currentGradeBandIds, enrollmentGradeBandIds: gradeBandIds });
    gradeBandActionOut = gb.action;
    finalGradeBandId = gb.ids[0] || "";
    if (gb.write) setLink(fields, videoTable, CONFIG.video.gradeBand, gb.ids);

    setText(fields, videoTable, CONFIG.video.key, key);
    if (cell(vf, CONFIG.video.active) !== true) setCheck(fields, videoTable, CONFIG.video.active, true);

    if (!text(vf, CONFIG.video.workflowStatus)) {
      const c = firstChoice(videoTable, CONFIG.video.workflowStatus, ["Pending Upload","Pending","Ready","Processing"]);
      if (c) setChoice(fields, videoTable, CONFIG.video.workflowStatus, c);
    }
    if (!text(vf, CONFIG.video.uploadStatus)) {
      const c = firstChoice(videoTable, CONFIG.video.uploadStatus, ["Pending Upload","Pending","Ready"]);
      if (c) setChoice(fields, videoTable, CONFIG.video.uploadStatus, c);
    }
    if (writable(videoTable, CONFIG.video.uploadError)) fields[CONFIG.video.uploadError] = "";

    if (Object.keys(fields).length) await videoTable.updateRecordAsync(vf.id, fields);
    videoFeedbackId = vf.id;
    actionOut = "linked_existing_or_repaired";
  } else {
    debugStep = "create_video_feedback";
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

    const typeChoice = firstChoice(videoTable, CONFIG.video.assetType, [assetType,"Video Feedback","Video"]);
    const workflowChoice = firstChoice(videoTable, CONFIG.video.workflowStatus, ["Pending Upload","Pending","Ready","Processing"]);
    const uploadChoice = firstChoice(videoTable, CONFIG.video.uploadStatus, ["Pending Upload","Pending","Ready"]);
    if (typeChoice) setChoice(fields, videoTable, CONFIG.video.assetType, typeChoice);
    if (workflowChoice) setChoice(fields, videoTable, CONFIG.video.workflowStatus, workflowChoice);
    if (uploadChoice) setChoice(fields, videoTable, CONFIG.video.uploadStatus, uploadChoice);

    videoFeedbackId = await videoTable.createRecordAsync(fields);
    actionOut = "created_new_video_feedback";
  }

  debugStep = "mark_asset_pending_link";
  const assetFields = {};
  const desiredVideoIds = mergeIds(existingAssetVideoIds, [videoFeedbackId]);
  if (!sameIds(existingAssetVideoIds, desiredVideoIds)) setLink(assetFields, assetsTable, CONFIG.assets.videoFeedback, desiredVideoIds);

  const pendingLinkChoice = firstChoice(assetsTable, CONFIG.assets.uploadStatus, [CONFIG.values.makeSendStatus]);
  if (pendingLinkChoice && text(asset, CONFIG.assets.uploadStatus) !== pendingLinkChoice) {
    setChoice(assetFields, assetsTable, CONFIG.assets.uploadStatus, pendingLinkChoice);
  }
  if (cell(asset, CONFIG.assets.sendToMakeTrigger) !== true) setCheck(assetFields, assetsTable, CONFIG.assets.sendToMakeTrigger, true);
  if (text(asset, CONFIG.assets.uploadError) && writable(assetsTable, CONFIG.assets.uploadError)) assetFields[CONFIG.assets.uploadError] = "";
  if (Object.keys(assetFields).length) await assetsTable.updateRecordAsync(asset.id, assetFields);

  debugStep = "finalize_outputs";
  const finalAssetQuery = await assetsTable.selectRecordsAsync({ fields: safe(assetsTable, Object.values(CONFIG.assets)) });
  const finalAsset = finalAssetQuery.getRecord(asset.id);

  if (!finalGradeBandId && gradeBandIds.length) finalGradeBandId = gradeBandIds[0];

  finalOutputs({
    statusOut: CONFIG.outputStatuses.success,
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

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  finalOutputs({
    statusOut: CONFIG.outputStatuses.error,
    actionOut: "error",
    gradeBandActionOut: "",
    errorOut: message,
    debugStep: "error",
  });
  throw error;
}
