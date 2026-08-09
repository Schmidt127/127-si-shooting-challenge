/*
 * 009 - Submission Intake - Create Submission Assets
 * Version: v1.1
 * Rebuilt: 2026-08-09
 * Contract: GitHub issue #103
 *
 * REQUIRED INPUT
 * - recordId = triggering Submissions record ID
 *
 * PURPOSE
 * - Create one Submission Asset per source attachment/slot.
 * - Preserve source-field provenance.
 * - Reject homework attachments when the same-slot Homework Name is not exactly one link.
 * - Replay safely when Airtable replaces an attachment ID.
 */
// @ts-nocheck

const SCRIPT = {
  scriptName: "009 - Submission Intake - Create Submission Assets",
  version: "v1.1",
  versionDate: "2026-08-09",
};

const { recordId } = input.config();
if (!recordId) throw new Error("Missing required input variable: recordId");

const CONFIG = {
  tables: { submissions: "Submissions", assets: "Submission Assets" },
  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    hwSub1: "HW Sub 1",
    hwSub2: "HW Sub 2",
    videoUpload: "Video Upload",
    homeworkName1: "Homework Name 1",
    homeworkName2: "Homework Name 2",
    attachmentUploadStatus: "Attachment Upload Status",
    attachmentUploadError: "Attachment Upload Error",
  },
  assets: {
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetLabel: "Asset Label",
    assetPurpose: "Asset Purpose",
    attachment: "Airtable Attachment",
    sourceAttachmentId: "Source Attachment ID",
    originalFileName: "Original File Name",
    assetType: "Asset Type",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    assetSlot: "Asset Slot",
    sendToMakeTrigger: "Send to Make Trigger",
  },
};

function getField(table, name) { return table.fields.find(f => f.name === name); }
function fieldExists(table, name) { return Boolean(getField(table, name)); }
function isWritable(table, name) {
  const f = getField(table, name);
  if (!f) return false;
  return !new Set(["formula","rollup","count","lookup","multipleLookupValues","createdTime",
    "lastModifiedTime","autoNumber","createdBy","lastModifiedBy","button","externalSyncSource"]).has(f.type);
}
function safeFields(table, names) { return [...new Set(names)].filter(n => fieldExists(table, n)); }
function cell(rec, name) { try { return rec.getCellValue(name); } catch { return null; } }
function text(rec, name) { try { return String(rec.getCellValueAsString(name) || "").trim(); } catch { return ""; } }
function linkedIds(rec, name) {
  const v = cell(rec, name);
  return Array.isArray(v) ? v.map(x => x?.id).filter(Boolean) : [];
}
function attachments(rec, name) {
  const v = cell(rec, name);
  return Array.isArray(v) ? v : [];
}
function choiceExists(table, name, choice) {
  const f = getField(table, name);
  return Boolean(f?.options?.choices?.some(c => c.name === choice));
}
function setLink(fields, table, name, ids) {
  if (isWritable(table, name)) fields[name] = [...new Set(ids.filter(Boolean))].map(id => ({id}));
}
function setText(fields, table, name, value, allowBlank=false) {
  if (!isWritable(table, name)) return;
  if (!allowBlank && (value === null || value === undefined || value === "")) return;
  fields[name] = String(value ?? "");
}
function setChoice(fields, table, name, value) {
  if (isWritable(table, name) && choiceExists(table, name, value)) fields[name] = {name:value};
}
function setCheckbox(fields, table, name, value) {
  if (isWritable(table, name)) fields[name] = Boolean(value);
}
function setAttachment(fields, table, name, file) {
  if (!isWritable(table, name) || !file?.url) return;
  fields[name] = [{url:file.url, filename:file.filename || "uploaded_file"}];
}
function normalizeFilename(v) {
  return String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function ext(filename) {
  const p = String(filename || "").toLowerCase().split(".");
  return p.length > 1 ? p.pop() : "";
}
function inferAssetType(file, purpose) {
  if (purpose === "Video For Feedback") return "Video Feedback";
  const type = String(file?.type || "").toLowerCase();
  const e = ext(file?.filename);
  if (type.startsWith("image/") || ["jpg","jpeg","png","gif","webp","heic"].includes(e)) return "Homework Image";
  if (type.startsWith("video/") || ["mp4","mov","m4v","avi","webm"].includes(e)) return "Video Feedback";
  if (type === "application/pdf" || e === "pdf") return "Homework PDF";
  if (["doc","docx","pages"].includes(e)) return "Homework Document";
  return "Other";
}
function attachmentDescriptor(file) {
  return {
    id: String(file?.id || ""),
    filename: normalizeFilename(file?.filename),
    type: String(file?.type || "").toLowerCase(),
    size: Number.isFinite(Number(file?.size)) ? Number(file.size) : null,
  };
}
function storedDescriptor(asset) {
  const stored = attachments(asset, CONFIG.assets.attachment)[0] || null;
  return {
    filename: normalizeFilename(text(asset, CONFIG.assets.originalFileName) || stored?.filename),
    type: String(stored?.type || "").toLowerCase(),
    size: Number.isFinite(Number(stored?.size)) ? Number(stored.size) : null,
  };
}
function compatibleRestoration(asset, file, expectedLabel) {
  const a = storedDescriptor(asset);
  const f = attachmentDescriptor(file);
  if (!a.filename || a.filename !== f.filename) return false;
  const label = text(asset, CONFIG.assets.assetLabel);
  if (label && expectedLabel && label !== expectedLabel) return false;
  if (a.size !== null && f.size !== null && a.size !== f.size) return false;
  if (a.type && f.type && a.type !== f.type) return false;
  return true;
}

const submissionsTable = base.getTable(CONFIG.tables.submissions);
const assetsTable = base.getTable(CONFIG.tables.assets);

const submissionQuery = await submissionsTable.selectRecordsAsync({
  fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
});
const submission = submissionQuery.getRecord(recordId);
if (!submission) throw new Error(`Submission not found: ${recordId}`);

const enrollmentIds = linkedIds(submission, CONFIG.submissions.enrollment);
const weekIds = linkedIds(submission, CONFIG.submissions.week);
if (enrollmentIds.length !== 1) throw new Error(`Submission must have exactly one Enrollment; found ${enrollmentIds.length}`);
if (weekIds.length !== 1) throw new Error(`Submission must have exactly one Week; found ${weekIds.length}`);

const sources = [
  { field: CONFIG.submissions.hwSub1, slot:"HW1", purpose:"Homework 1", prefix:"HW1", homeworkField:CONFIG.submissions.homeworkName1 },
  { field: CONFIG.submissions.hwSub2, slot:"HW2", purpose:"Homework 2", prefix:"HW2", homeworkField:CONFIG.submissions.homeworkName2 },
  { field: CONFIG.submissions.videoUpload, slot:"VIDEO", purpose:"Video For Feedback", prefix:"VID", homeworkField:null },
];

const slotAuthorization = {};
for (const s of sources) {
  if (!s.homeworkField) { slotAuthorization[s.slot] = {ok:true}; continue; }
  const ids = linkedIds(submission, s.homeworkField);
  slotAuthorization[s.slot] = {
    ok: ids.length === 1,
    reason: ids.length === 0 ? `No ${s.homeworkField} assignment` : `${s.homeworkField} has ${ids.length} links`,
  };
}

const assetQuery = await assetsTable.selectRecordsAsync({
  fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
});
const existing = assetQuery.records.filter(a => linkedIds(a, CONFIG.assets.submission).includes(submission.id));

const creates = [];
const repairs = [];
const skipped = [];
const needsReview = [];

for (const source of sources) {
  const files = attachments(submission, source.field);
  if (files.length === 0) continue;

  if (!slotAuthorization[source.slot].ok) {
    for (const file of files) {
      skipped.push({
        slot: source.slot, field: source.field, file: file?.filename || "",
        reason: `UNASSIGNED_SLOT: ${slotAuthorization[source.slot].reason}`,
      });
    }
    continue;
  }

  for (let index=0; index<files.length; index++) {
    const file = files[index];
    const d = attachmentDescriptor(file);
    const label = `${source.prefix}-${index+1}`;

    if (!d.id) {
      needsReview.push({slot:source.slot, field:source.field, file:file?.filename||"", reason:"Missing Airtable attachment ID"});
      continue;
    }

    const sameSlot = existing.filter(a => text(a, CONFIG.assets.assetSlot) === source.slot);
    const exact = sameSlot.filter(a => text(a, CONFIG.assets.sourceAttachmentId) === d.id);
    if (exact.length === 1) {
      skipped.push({slot:source.slot, field:source.field, file:file?.filename||"", reason:"Exact source already exists", assetId:exact[0].id});
      continue;
    }
    if (exact.length > 1) {
      needsReview.push({slot:source.slot, field:source.field, file:file?.filename||"", reason:"Multiple exact source assets", assetIds:exact.map(a=>a.id)});
      continue;
    }

    const recovery = sameSlot.filter(a => compatibleRestoration(a, file, label));
    if (recovery.length === 1) {
      const fields = {};
      setText(fields, assetsTable, CONFIG.assets.sourceAttachmentId, d.id);
      setText(fields, assetsTable, CONFIG.assets.originalFileName, file?.filename || "");
      setChoice(fields, assetsTable, CONFIG.assets.assetPurpose, source.purpose);
      setChoice(fields, assetsTable, CONFIG.assets.assetSlot, source.slot);
      setChoice(fields, assetsTable, CONFIG.assets.assetType, inferAssetType(file, source.purpose));
      setAttachment(fields, assetsTable, CONFIG.assets.attachment, file);
      repairs.push({id:recovery[0].id, fields, slot:source.slot, file:file?.filename||""});
      continue;
    }
    if (recovery.length > 1) {
      needsReview.push({
        slot:source.slot, field:source.field, file:file?.filename||"",
        reason:"Ambiguous attachment-restoration fallback", assetIds:recovery.map(a=>a.id),
      });
      continue;
    }

    const fields = {};
    setLink(fields, assetsTable, CONFIG.assets.submission, [submission.id]);
    setLink(fields, assetsTable, CONFIG.assets.enrollment, enrollmentIds);
    setText(fields, assetsTable, CONFIG.assets.assetLabel, label);
    setText(fields, assetsTable, CONFIG.assets.sourceAttachmentId, d.id);
    setText(fields, assetsTable, CONFIG.assets.originalFileName, file?.filename || "");
    setChoice(fields, assetsTable, CONFIG.assets.assetPurpose, source.purpose);
    setChoice(fields, assetsTable, CONFIG.assets.assetType, inferAssetType(file, source.purpose));
    setChoice(fields, assetsTable, CONFIG.assets.assetSlot, source.slot);
    setChoice(fields, assetsTable, CONFIG.assets.uploadStatus, "Pending Link");
    setCheckbox(fields, assetsTable, CONFIG.assets.sendToMakeTrigger, false);
    setAttachment(fields, assetsTable, CONFIG.assets.attachment, file);
    creates.push({fields, slot:source.slot, field:source.field, file:file?.filename||"", sourceId:d.id});
  }
}

if (repairs.length) {
  for (let i=0;i<repairs.length;i+=50) {
    await assetsTable.updateRecordsAsync(repairs.slice(i,i+50).map(r => ({id:r.id, fields:r.fields})));
  }
}

let createdIds = [];
if (creates.length) {
  for (let i=0;i<creates.length;i+=50) {
    const ids = await assetsTable.createRecordsAsync(creates.slice(i,i+50).map(r => ({fields:r.fields})));
    createdIds.push(...ids);
  }
}

const parentUpdate = {};
if (needsReview.length) {
  setChoice(parentUpdate, submissionsTable, CONFIG.submissions.attachmentUploadStatus, "Processing");
  setText(parentUpdate, submissionsTable, CONFIG.submissions.attachmentUploadError,
    `009 needs review: ${needsReview.map(x => `${x.slot}:${x.reason}`).join(" | ")}`, true);
} else if (createdIds.length || repairs.length || skipped.length) {
  setChoice(parentUpdate, submissionsTable, CONFIG.submissions.attachmentUploadStatus, "Processing");
  if (isWritable(submissionsTable, CONFIG.submissions.attachmentUploadError)) {
    parentUpdate[CONFIG.submissions.attachmentUploadError] = "";
  }
} else {
  setChoice(parentUpdate, submissionsTable, CONFIG.submissions.attachmentUploadStatus, "No Files");
}
if (Object.keys(parentUpdate).length) await submissionsTable.updateRecordAsync(submission.id, parentUpdate);

console.log(JSON.stringify({
  automation: SCRIPT.scriptName, version: SCRIPT.version, submissionId:submission.id,
  created:createdIds.length, repaired:repairs.length, skipped:skipped.length, needsReview:needsReview.length,
  repairs:repairs.map(r=>({id:r.id,slot:r.slot,file:r.file})), skipped, needsReview,
}, null, 2));

output.set("status", needsReview.length ? "needs_review" : (createdIds.length || repairs.length ? "assets_processed" : "no_new_assets"));
output.set("submissionId", submission.id);
output.set("createdAssetCount", createdIds.length);
output.set("createdAssetIds", createdIds);
output.set("repairedAssetCount", repairs.length);
output.set("needsReviewCount", needsReview.length);
