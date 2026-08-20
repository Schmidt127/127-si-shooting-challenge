/*
Automation: 009 - Submission Intake - Create Submission Assets
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-09
Last GitHub Update: 2026-08-20 (v1.2 V2 standard structure + main())

Purpose:
Create one Submission Asset per source attachment/slot on a Submission,
preserving provenance and safely replaying when Airtable replaces an attachment ID.

Trigger:
Submissions when attachment source fields change (confirm exact conditions in Airtable UI);
pass the dynamic recordId.

Important Tables:
Submissions, Submission Assets

Important Fields:
HW Sub 1, HW Sub 2, Video Upload, Homework Name 1, Homework Name 2,
Enrollment, Week, Attachment Upload Status, Attachment Upload Error,
Asset Slot, Source Attachment ID, Airtable Attachment, Send to Make Trigger

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Contract: GitHub issue #103.
*/

/************************************************************
 * 009 - SUBMISSION INTAKE AND ASSET CREATION
 * Create Submission Assets
 *
 * Version: v1.2
 * Date Written: 2026-06-20
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v1.2 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, SCRIPT metadata, numbered sections, async main(),
 *   required outputs (statusOut / actionOut / errorOut / debugStep).
 *   Business logic unchanged from v1.1.
 * - v1.1 (2026-08-09): Rebuild — one asset per source attachment/slot;
 *   homework slot authorization; attachment-ID replay / restoration.
 * - v1.0 (2026-06-20): Initial create-submission-assets automation.
 *
 * PURPOSE
 * - Create one Submission Asset per source attachment/slot on the triggering Submission.
 * - Preserve source-field provenance (slot, purpose, source attachment ID, filename).
 * - Reject homework attachments when the same-slot Homework Name is not exactly one link.
 * - Replay safely when Airtable replaces an attachment ID (compatible restoration).
 * - Update parent Attachment Upload Status / Error for downstream processing.
 *
 * IMPORTANT DESIGN RULES
 * - Exactly one Enrollment and exactly one Week on the Submission (fail closed).
 * - HW1 / HW2 require exactly one Homework Name 1 / Homework Name 2 link; VIDEO has no homework gate.
 * - Exact Source Attachment ID match → skip (idempotent).
 * - Compatible restoration updates Source Attachment ID / attachment when Airtable re-IDs a file.
 * - Ambiguous matches → needs review (do not create duplicates).
 * - Never write formula / rollup / lookup / count fields.
 *
 * THIS IS NOT
 * - Attachment Upload Status fan-out owner beyond parent status writeback (021).
 * - Make / S3 upload handoff (070a / 070b).
 * - Homework Completion create/link (020) or Video Feedback create/link (013).
 * - XP from submissions (010).
 *
 * FOLDER
 * - 01 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 009 - Submission Intake - Create Submission Assets
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - When a record matches conditions indicating new/changed attachments
 *   (HW Sub 1, HW Sub 2, and/or Video Upload) — confirm exact UI conditions in Airtable
 * - Input variable recordId = triggering Submission record ID
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Enrollment and Week already linked (script fails closed if missing)
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Attachment Upload Status alone (this script writes that field; avoid loops)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Submissions record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created | updated | skipped_no_new_assets | needs_review | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - status = assets_processed | no_new_assets | needs_review (legacy alias)
 * - submissionId = Submission record ID
 * - createdAssetCount / createdAssetIds
 * - repairedAssetCount / needsReviewCount
 *
 * PRIMARY TABLES USED
 * - Submissions, Submission Assets
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Submission Assets → Submission - Linked, Enrollment - Linked, Asset Label,
 *   Asset Purpose, Asset Type, Asset Slot, Source Attachment ID, Original File Name,
 *   Airtable Attachment, Upload Status, Send to Make Trigger
 * - Submissions → Attachment Upload Status, Attachment Upload Error
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "009 - Submission Intake - Create Submission Assets",
  version: "v1.2",
  versionNumber: "1.2",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-06-20",
  lastUpdated: "2026-08-20",
  folder: "01 - Submission Intake and Asset Creation",
  automationName: "009 - Submission Intake - Create Submission Assets",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  batchSize: 50,
  tables: {
    submissions: "Submissions",
    assets: "Submission Assets",
  },
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
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    created: "created",
    updated: "updated",
    skippedNoNewAssets: "skipped_no_new_assets",
    needsReview: "needs_review",
    error: "error",
  },
  uploadStatuses: {
    processing: "Processing",
    noFiles: "No Files",
    pendingLink: "Pending Link",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch {
    // Ignore unmapped output keys.
  }
}

function step(name) {
  debugStep = name;
  setOutputSafe("debugStep", debugStep);
}

function getField(table, name) {
  return table.fields.find((f) => f.name === name);
}

function fieldExists(table, name) {
  return Boolean(getField(table, name));
}

function isWritable(table, name) {
  const f = getField(table, name);
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

function safeFields(table, names) {
  return [...new Set(names)].filter((n) => fieldExists(table, n));
}

function cell(rec, name) {
  try {
    return rec.getCellValue(name);
  } catch {
    return null;
  }
}

function text(rec, name) {
  try {
    return String(rec.getCellValueAsString(name) || "").trim();
  } catch {
    return "";
  }
}

function linkedIds(rec, name) {
  const v = cell(rec, name);
  return Array.isArray(v) ? v.map((x) => x?.id).filter(Boolean) : [];
}

function attachments(rec, name) {
  const v = cell(rec, name);
  return Array.isArray(v) ? v : [];
}

function choiceExists(table, name, choice) {
  const f = getField(table, name);
  return Boolean(f?.options?.choices?.some((c) => c.name === choice));
}

function setLink(fields, table, name, ids) {
  if (isWritable(table, name)) fields[name] = [...new Set(ids.filter(Boolean))].map((id) => ({ id }));
}

function setText(fields, table, name, value, allowBlank = false) {
  if (!isWritable(table, name)) return;
  if (!allowBlank && (value === null || value === undefined || value === "")) return;
  fields[name] = String(value ?? "");
}

function setChoice(fields, table, name, value) {
  if (isWritable(table, name) && choiceExists(table, name, value)) fields[name] = { name: value };
}

function setCheckbox(fields, table, name, value) {
  if (isWritable(table, name)) fields[name] = Boolean(value);
}

function setAttachment(fields, table, name, file) {
  if (!isWritable(table, name) || !file?.url) return;
  fields[name] = [{ url: file.url, filename: file.filename || "uploaded_file" }];
}

function normalizeFilename(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function ext(filename) {
  const p = String(filename || "")
    .toLowerCase()
    .split(".");
  return p.length > 1 ? p.pop() : "";
}

function inferAssetType(file, purpose) {
  if (purpose === "Video For Feedback") return "Video Feedback";
  const type = String(file?.type || "").toLowerCase();
  const e = ext(file?.filename);
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(e)) return "Homework Image";
  if (type.startsWith("video/") || ["mp4", "mov", "m4v", "avi", "webm"].includes(e)) return "Video Feedback";
  if (type === "application/pdf" || e === "pdf") return "Homework PDF";
  if (["doc", "docx", "pages"].includes(e)) return "Homework Document";
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

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("1 - Validate recordId");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  if (!recordId) throw new Error("Missing required input variable: recordId");
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId (expected rec…): ${recordId}`);

  step("2 - Load tables");
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);

  step("3 - Load submission");
  const submissionQuery = await submissionsTable.selectRecordsAsync({
    fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
  });
  const submission = submissionQuery.getRecord(recordId);
  if (!submission) throw new Error(`Submission not found: ${recordId}`);

  const enrollmentIds = linkedIds(submission, CONFIG.submissions.enrollment);
  const weekIds = linkedIds(submission, CONFIG.submissions.week);
  if (enrollmentIds.length !== 1) {
    throw new Error(`Submission must have exactly one Enrollment; found ${enrollmentIds.length}`);
  }
  if (weekIds.length !== 1) {
    throw new Error(`Submission must have exactly one Week; found ${weekIds.length}`);
  }

  step("4 - Authorize slots");
  const sources = [
    {
      field: CONFIG.submissions.hwSub1,
      slot: "HW1",
      purpose: "Homework 1",
      prefix: "HW1",
      homeworkField: CONFIG.submissions.homeworkName1,
    },
    {
      field: CONFIG.submissions.hwSub2,
      slot: "HW2",
      purpose: "Homework 2",
      prefix: "HW2",
      homeworkField: CONFIG.submissions.homeworkName2,
    },
    {
      field: CONFIG.submissions.videoUpload,
      slot: "VIDEO",
      purpose: "Video For Feedback",
      prefix: "VID",
      homeworkField: null,
    },
  ];

  const slotAuthorization = {};
  for (const s of sources) {
    if (!s.homeworkField) {
      slotAuthorization[s.slot] = { ok: true };
      continue;
    }
    const ids = linkedIds(submission, s.homeworkField);
    slotAuthorization[s.slot] = {
      ok: ids.length === 1,
      reason: ids.length === 0 ? `No ${s.homeworkField} assignment` : `${s.homeworkField} has ${ids.length} links`,
    };
  }

  step("5 - Load existing assets");
  const assetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
  });
  const existing = assetQuery.records.filter((a) =>
    linkedIds(a, CONFIG.assets.submission).includes(submission.id)
  );

  const creates = [];
  const repairs = [];
  const skipped = [];
  const needsReview = [];

  step("6 - Plan creates and repairs");
  for (const source of sources) {
    const files = attachments(submission, source.field);
    if (files.length === 0) continue;

    if (!slotAuthorization[source.slot].ok) {
      for (const file of files) {
        skipped.push({
          slot: source.slot,
          field: source.field,
          file: file?.filename || "",
          reason: `UNASSIGNED_SLOT: ${slotAuthorization[source.slot].reason}`,
        });
      }
      continue;
    }

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const d = attachmentDescriptor(file);
      const label = `${source.prefix}-${index + 1}`;

      if (!d.id) {
        needsReview.push({
          slot: source.slot,
          field: source.field,
          file: file?.filename || "",
          reason: "Missing Airtable attachment ID",
        });
        continue;
      }

      const sameSlot = existing.filter((a) => text(a, CONFIG.assets.assetSlot) === source.slot);
      const exact = sameSlot.filter((a) => text(a, CONFIG.assets.sourceAttachmentId) === d.id);
      if (exact.length === 1) {
        skipped.push({
          slot: source.slot,
          field: source.field,
          file: file?.filename || "",
          reason: "Exact source already exists",
          assetId: exact[0].id,
        });
        continue;
      }
      if (exact.length > 1) {
        needsReview.push({
          slot: source.slot,
          field: source.field,
          file: file?.filename || "",
          reason: "Multiple exact source assets",
          assetIds: exact.map((a) => a.id),
        });
        continue;
      }

      const recovery = sameSlot.filter((a) => compatibleRestoration(a, file, label));
      if (recovery.length === 1) {
        const fields = {};
        setText(fields, assetsTable, CONFIG.assets.sourceAttachmentId, d.id);
        setText(fields, assetsTable, CONFIG.assets.originalFileName, file?.filename || "");
        setChoice(fields, assetsTable, CONFIG.assets.assetPurpose, source.purpose);
        setChoice(fields, assetsTable, CONFIG.assets.assetSlot, source.slot);
        setChoice(fields, assetsTable, CONFIG.assets.assetType, inferAssetType(file, source.purpose));
        setAttachment(fields, assetsTable, CONFIG.assets.attachment, file);
        repairs.push({ id: recovery[0].id, fields, slot: source.slot, file: file?.filename || "" });
        continue;
      }
      if (recovery.length > 1) {
        needsReview.push({
          slot: source.slot,
          field: source.field,
          file: file?.filename || "",
          reason: "Ambiguous attachment-restoration fallback",
          assetIds: recovery.map((a) => a.id),
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
      setChoice(fields, assetsTable, CONFIG.assets.uploadStatus, CONFIG.uploadStatuses.pendingLink);
      setCheckbox(fields, assetsTable, CONFIG.assets.sendToMakeTrigger, false);
      setAttachment(fields, assetsTable, CONFIG.assets.attachment, file);
      creates.push({
        fields,
        slot: source.slot,
        field: source.field,
        file: file?.filename || "",
        sourceId: d.id,
      });
    }
  }

  try {
    if (typeof submissionQuery.unloadData === "function") submissionQuery.unloadData();
  } catch {
    // unload is best-effort
  }
  try {
    if (typeof assetQuery.unloadData === "function") assetQuery.unloadData();
  } catch {
    // unload is best-effort
  }

  step("7 - Apply repairs and creates");
  if (repairs.length) {
    for (let i = 0; i < repairs.length; i += CONFIG.batchSize) {
      await assetsTable.updateRecordsAsync(
        repairs.slice(i, i + CONFIG.batchSize).map((r) => ({ id: r.id, fields: r.fields }))
      );
    }
  }

  let createdIds = [];
  if (creates.length) {
    for (let i = 0; i < creates.length; i += CONFIG.batchSize) {
      const ids = await assetsTable.createRecordsAsync(
        creates.slice(i, i + CONFIG.batchSize).map((r) => ({ fields: r.fields }))
      );
      createdIds.push(...ids);
    }
  }

  step("8 - Update parent submission status");
  const parentUpdate = {};
  if (needsReview.length) {
    setChoice(parentUpdate, submissionsTable, CONFIG.submissions.attachmentUploadStatus, CONFIG.uploadStatuses.processing);
    setText(
      parentUpdate,
      submissionsTable,
      CONFIG.submissions.attachmentUploadError,
      `009 needs review: ${needsReview.map((x) => `${x.slot}:${x.reason}`).join(" | ")}`,
      true
    );
  } else if (createdIds.length || repairs.length || skipped.length) {
    setChoice(parentUpdate, submissionsTable, CONFIG.submissions.attachmentUploadStatus, CONFIG.uploadStatuses.processing);
    if (isWritable(submissionsTable, CONFIG.submissions.attachmentUploadError)) {
      parentUpdate[CONFIG.submissions.attachmentUploadError] = "";
    }
  } else {
    setChoice(parentUpdate, submissionsTable, CONFIG.submissions.attachmentUploadStatus, CONFIG.uploadStatuses.noFiles);
  }
  if (Object.keys(parentUpdate).length) {
    await submissionsTable.updateRecordAsync(submission.id, parentUpdate);
  }

  step("9 - Set outputs and finish");
  const legacyStatus = needsReview.length
    ? "needs_review"
    : createdIds.length || repairs.length
      ? "assets_processed"
      : "no_new_assets";

  const actionOut = needsReview.length
    ? CONFIG.actions.needsReview
    : createdIds.length
      ? CONFIG.actions.created
      : repairs.length
        ? CONFIG.actions.updated
        : CONFIG.actions.skippedNoNewAssets;

  const statusOut = needsReview.length || createdIds.length || repairs.length
    ? CONFIG.statuses.success
    : CONFIG.statuses.skipped;

  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("status", legacyStatus);
  setOutputSafe("submissionId", submission.id);
  setOutputSafe("createdAssetCount", createdIds.length);
  setOutputSafe("createdAssetIds", createdIds);
  setOutputSafe("repairedAssetCount", repairs.length);
  setOutputSafe("needsReviewCount", needsReview.length);

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut,
        actionOut,
        submissionId: submission.id,
        created: createdIds.length,
        repaired: repairs.length,
        skipped: skipped.length,
        needsReview: needsReview.length,
        repairs: repairs.map((r) => ({ id: r.id, slot: r.slot, file: r.file })),
        skipped,
        needsReview,
      },
      null,
      2
    )
  );
}

/* =========================================================
   SECTION 5: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", `FAILED AT: ${debugStep} | ${message}`);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("status", "error");
  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.error,
        actionOut: CONFIG.actions.error,
        errorOut: message,
        debugStep,
      },
      null,
      2
    )
  );
  throw error;
}
