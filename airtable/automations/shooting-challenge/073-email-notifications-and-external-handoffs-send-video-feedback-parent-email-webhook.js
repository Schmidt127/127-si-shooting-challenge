/*
Automation: 073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-17
Last GitHub Update: 2026-08-20 (v4.2 V2 standard structure)

Purpose:
Validate one Video Feedback record ready for parent email and create exactly
one Ready Email Handoff Queue row for Communications Hub (079 → Resend).

Trigger:
Video Feedback when Parent Feedback Ready? and related gates match
(confirm exact conditions in Airtable UI); pass the dynamic recordId.

Important Tables:
Video Feedback, Enrollments, Submissions, Submission Assets, XP Events,
Email Handoff Queue

Important Fields:
Parent Feedback Ready?, Parent Feedback Sent?, Feedback Posted?, Coach Feedback,
Video URL or Drive Link, Handoff Key, Status

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Filename may still say webhook; current path is Hub queue create only.
*/

/************************************************************
 * 073 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Create Video Feedback Communications Hub Handoff
 *
 * Version: v4.2
 * Date Written: 2026-06-17
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v4.2 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, numbered sections, hoisted debugStep, outer run
 *   wrapper. Business logic unchanged from v4.1.
 * - v4.1 (2026-08-17): Require VF Video URL or Drive Link only for parent
 *   Hub handoff (022 writeback); no asset URL / Drive field fallback.
 *
 * PURPOSE
 * - Validate one Video Feedback record that is ready for parent email.
 * - Create exactly one Ready Email Handoff Queue row for Communications Hub.
 * - Hand off template data to Automation 079 / Communications Hub / Resend.
 *
 * IMPORTANT DESIGN RULES
 * - Hub owns subject, HTML, plain text, branding, delivery, and Delivery proof.
 * - This script never calls Make, Gmail, Resend, or the Communications Hub ingress.
 * - Only Automation 079 may send Email Handoff Queue rows to the Hub.
 * - One Video Feedback maps to VIDEO_FEEDBACK|VIDEO_FEEDBACK|{Video Feedback Record ID}.
 * - Idempotent: reuse an existing matching Handoff Key; conflicting payload → Needs Review.
 * - Do not write Parent Feedback Sent? or Parent Feedback Sent On (Hub/downstream writeback).
 * - Parent-facing video link is ONLY Video Feedback "Video URL or Drive Link" (written by 022).
 * - Do not read Reviewer File URL, Canonical File URL, or any Google Drive File/Folder ID/URL/Name.
 * - Missing/invalid VF video URL → error (no asset-field fallback).
 * - Enrollment Parent Email - Cleaned is the authoritative recipient (076 Hub pattern).
 *
 * THIS IS NOT
 * - Video Feedback create/link (013).
 * - Child upload writeback (022).
 * - Video XP create (114).
 * - Homework feedback Hub handoff (071).
 * - Queue dispatcher to Hub (079).
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff
 *
 * TRIGGER TABLE
 * - Video Feedback
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Parent Feedback Ready? checked
 * - Parent Feedback Sent? unchecked
 * - Feedback Posted? checked
 * - Coach Feedback not empty
 * - Enrollment not empty
 * - Submission not empty
 * - Total Video XP Awarded > 0
 * - Base XP Awarded > 0
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Video Feedback record ID
 *
 * OPTIONAL INPUT VARIABLES
 * - testMode = optional; default true for controlled Hub sends
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_handoff | existing_handoff | needs_review | error
 * - queueRecordId / handoffKey / errorOut / debugStep
 *
 * PRIMARY TABLES USED
 * - Video Feedback, Enrollments, Submissions, Submission Assets, XP Events,
 *   Email Handoff Queue
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Email Handoff Queue → Handoff Key, Status, payload/recipients, Test Mode?
 * - Video Feedback → Parent Feedback Send Error (clear on success), Subject (prep note)
 *
 * HANDOFF KEY
 * - VIDEO_FEEDBACK|VIDEO_FEEDBACK|{Video Feedback Record ID}
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff",
  version: "v4.2",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-06-17",
  lastUpdated: "2026-08-20",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  timeZone: "America/Denver",
  tables: {
    videoFeedback: "Video Feedback",
    enrollments: "Enrollments",
    submissions: "Submissions",
    assets: "Submission Assets",
    xpEvents: "XP Events",
    queue: "Email Handoff Queue",
  },
  statuses: {
    draft: "Draft",
    ready: "Ready",
    needsReview: "Needs Review",
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    createdHandoff: "created_handoff",
    existingHandoff: "existing_handoff",
    needsReview: "needs_review",
    error: "error",
  },
  fields: {
    vf: {
      enrollment: "Enrollment",
      submission: "Submission",
      asset: "Submission Asset",
      key: "Video Feedback Key",
      active: "Active?",
      coach: "Coach Feedback",
      posted: "Feedback Posted?",
      reviewedAt: "Reviewed At",
      week: "Week",
      ready: "Parent Feedback Ready?",
      sent: "Parent Feedback Sent?",
      error: "Parent Feedback Send Error",
      subject: "Parent Feedback Subject",
      xpEvents: "XP Events",
      totalXp: "Total Video XP Awarded",
      baseXp: "Base XP Awarded",
      name: "Video Feedback Name",
      videoUrl: "Video URL or Drive Link",
      uploadStatus: "Upload Status",
      uploadedAt: "Video Asset Uploaded At",
      fileName: "Video Asset File Name",
    },
    enr: {
      active: "Active?",
      program: "Program Instance",
      parentClean: "Parent Email - Cleaned",
      parentFirst: "Parent First Name",
      athlete: "Full Athlete Name",
    },
    sub: {
      enrollment: "Enrollment",
      week: "Week",
      activityDate: "Activity Date",
      countable: "Count This Submission?",
      videoUpload: "Video Upload",
      note: "Video Upload Note",
    },
    asset: {
      submission: "Submission - Linked",
      enrollment: "Enrollment - Linked",
      videoFeedback: "Video Feedback",
      trueVideo: "Is True Video Feedback Asset?",
      original: "Original File Name",
      // Intentionally omit Reviewer/Canonical File URL — parent email must not read them.
    },
    xp: {
      active: "Active?",
      enrollment: "Enrollment",
      week: "Week",
      videoFeedback: "Video Feedback",
      points: "XP Points",
    },
    queue: {
      key: "Handoff Key",
      status: "Status",
      sourceTable: "Source Table",
      eventType: "Event Type",
      payload: "Payload JSON",
      attempts: "Attempt Count",
      pi: "Program Instance Record ID",
      source: "Source Record ID",
      enrollment: "Enrollment Record ID",
      recipients: "Recipients JSON",
      template: "Template Key",
      testMode: "Test Mode?",
    },
  },
  values: {
    eventType: "VIDEO_FEEDBACK",
    templateKey: "VIDEO_FEEDBACK",
    sourceTableToken: "VIDEO_FEEDBACK",
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

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch {
    return false;
  }
}

function getRaw(rec, table, name) {
  return rec && fieldExists(table, name) ? rec.getCellValue(name) : null;
}

function getText(rec, table, name) {
  return rec && fieldExists(table, name) ? String(rec.getCellValueAsString(name) || "").trim() : "";
}

function linkedIds(rec, table, name) {
  const value = getRaw(rec, table, name);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function checked(rec, table, name) {
  return getRaw(rec, table, name) === true;
}

function getNumber(rec, table, name) {
  const value = getRaw(rec, table, name);
  const n = typeof value === "number" ? value : Number(getText(rec, table, name).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function truthyFormula(rec, table, name) {
  const value = getRaw(rec, table, name);
  if (value === true || value === 1) return true;
  const s = getText(rec, table, name).toLowerCase();
  return ["1", "true", "yes", "y", "count", "counted"].includes(s);
}

function oneLinkedId(values, label) {
  if (values.length !== 1) throw new Error(`${label} must contain exactly one linked record; found ${values.length}.`);
  return values[0];
}

function sameIds(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function firstNonEmpty(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function cleanEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientEmail(rec, table, name) {
  const email = cleanEmail(getText(rec, table, name));
  return validEmail(email) ? email : "";
}

function parseDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function denverDateKey(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function todayDenverKey() {
  return denverDateKey(new Date());
}

function dateText(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function selectValue(table, name, value) {
  const field = table.getField(name);
  if (field.type !== "singleSelect") return value;
  const choice = (field.options?.choices || []).find(
    (item) => String(item.name || "").toLowerCase() === String(value || "").toLowerCase()
  );
  if (!choice) throw new Error(`Missing option ${value} on ${table.name}.${name}`);
  return { name: choice.name };
}

function queueFields(queueTable, values) {
  return Object.fromEntries(Object.entries(values).filter(([name]) => fieldExists(queueTable, name)));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function samePayload(left, right) {
  try {
    return stableJson(JSON.parse(left || "{}")) === stableJson(right);
  } catch {
    return false;
  }
}

async function markQueueNeedsReview(queueTable, rows) {
  for (const row of rows) {
    if (fieldExists(queueTable, CONFIG.fields.queue.status)) {
      await queueTable.updateRecordAsync(row.id, {
        [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview),
      });
    }
  }
}

function parentVideoUrl(vf, vfTable) {
  const url = getText(vf, vfTable, CONFIG.fields.vf.videoUrl);
  if (!url) {
    throw new Error(
      'Video Feedback "Video URL or Drive Link" is blank. Parent handoff blocked (022 writeback required; no asset URL fallback).'
    );
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("non-http");
    }
  } catch {
    throw new Error(
      'Video Feedback "Video URL or Drive Link" must be a valid http(s) URL. Parent handoff blocked.'
    );
  }
  return url;
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("1 - Validate recordId");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
    throw new Error("recordId must be a valid Airtable record ID.");
  }
  const testMode = cfg.testMode === undefined ? true : Boolean(cfg.testMode);

  step("2 - Load tables");
  const vfTable = base.getTable(CONFIG.tables.videoFeedback);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const queueTable = base.getTable(CONFIG.tables.queue);

  step("01 - Load Video Feedback");
  const vf = await vfTable.selectRecordAsync(recordId);
  if (!vf) throw new Error(`Video Feedback not found: ${recordId}`);

  const handoffKey = `${CONFIG.values.eventType}|${CONFIG.values.sourceTableToken}|${recordId}`;

  step("02 - Validate readiness gates");
  if (!checked(vf, vfTable, CONFIG.fields.vf.active)) {
    throw new Error("Video Feedback is inactive/retired. Handoff blocked.");
  }
  if (!checked(vf, vfTable, CONFIG.fields.vf.posted)) {
    throw new Error("Feedback Posted? is not checked. Handoff blocked.");
  }
  if (!checked(vf, vfTable, CONFIG.fields.vf.ready)) {
    throw new Error("Parent Feedback Ready? is not checked. Handoff blocked.");
  }
  if (checked(vf, vfTable, CONFIG.fields.vf.sent)) {
    throw new Error("Parent Feedback Sent? is already checked. Duplicate handoff blocked.");
  }
  const coachFeedback = getText(vf, vfTable, CONFIG.fields.vf.coach);
  if (!coachFeedback) throw new Error("Coach Feedback is blank. Handoff blocked.");

  step("03 - Validate canonical source chain");
  const enrollmentId = oneLinkedId(linkedIds(vf, vfTable, CONFIG.fields.vf.enrollment), "Video Feedback Enrollment");
  const submissionId = oneLinkedId(linkedIds(vf, vfTable, CONFIG.fields.vf.submission), "Video Feedback Submission");
  const assetId = oneLinkedId(linkedIds(vf, vfTable, CONFIG.fields.vf.asset), "Video Feedback Submission Asset");
  const [enrollment, submission, asset] = await Promise.all([
    enrollmentsTable.selectRecordAsync(enrollmentId),
    submissionsTable.selectRecordAsync(submissionId),
    assetsTable.selectRecordAsync(assetId),
  ]);
  if (!enrollment || !submission || !asset) {
    throw new Error("Canonical Video Feedback source chain contains a missing record.");
  }
  if (!checked(enrollment, enrollmentsTable, CONFIG.fields.enr.active)) {
    throw new Error("Enrollment is inactive. Handoff blocked.");
  }

  const expectedKey = `VIDEO_FEEDBACK|${assetId}`;
  if (getText(vf, vfTable, CONFIG.fields.vf.key) !== expectedKey) {
    throw new Error(`Video Feedback Key mismatch. Expected ${expectedKey}.`);
  }
  if (!sameIds(linkedIds(asset, assetsTable, CONFIG.fields.asset.submission), [submissionId])) {
    throw new Error("Submission Asset does not belong exclusively to the linked Submission.");
  }
  if (!sameIds(linkedIds(asset, assetsTable, CONFIG.fields.asset.enrollment), [enrollmentId])) {
    throw new Error("Submission Asset Enrollment does not match Video Feedback Enrollment.");
  }
  if (!linkedIds(asset, assetsTable, CONFIG.fields.asset.videoFeedback).includes(recordId)) {
    throw new Error("Submission Asset does not link back to this canonical Video Feedback.");
  }
  if (!truthyFormula(asset, assetsTable, CONFIG.fields.asset.trueVideo)) {
    throw new Error("Submission Asset is not a true Video Feedback asset.");
  }

  if (!sameIds(linkedIds(submission, submissionsTable, CONFIG.fields.sub.enrollment), [enrollmentId])) {
    throw new Error("Submission Enrollment does not match Video Feedback Enrollment.");
  }
  const weekIds = linkedIds(submission, submissionsTable, CONFIG.fields.sub.week);
  if (weekIds.length !== 1) {
    throw new Error(`Submission must have exactly one Week; found ${weekIds.length}.`);
  }
  const weekId = weekIds[0];
  if (!getText(vf, vfTable, CONFIG.fields.vf.week)) {
    throw new Error("Video Feedback Week lookup is blank. Handoff blocked.");
  }
  if (!truthyFormula(submission, submissionsTable, CONFIG.fields.sub.countable)) {
    throw new Error("Linked Submission is not countable/current. Handoff blocked.");
  }
  if (
    !Array.isArray(getRaw(submission, submissionsTable, CONFIG.fields.sub.videoUpload)) ||
    getRaw(submission, submissionsTable, CONFIG.fields.sub.videoUpload).length === 0
  ) {
    throw new Error("Linked Submission has no Video Upload. Handoff blocked.");
  }
  const activityDate = getRaw(submission, submissionsTable, CONFIG.fields.sub.activityDate);
  if (!parseDate(activityDate)) throw new Error("Submission Activity Date is missing/invalid.");
  if (denverDateKey(activityDate) > todayDenverKey()) {
    throw new Error("Submission Activity Date is in the future. Handoff blocked.");
  }

  step("04 - Validate active Video XP ownership");
  const xpIds = linkedIds(vf, vfTable, CONFIG.fields.vf.xpEvents);
  if (!xpIds.length) throw new Error("Video Feedback has no linked XP Events. Handoff blocked.");
  let activeVideoXp = 0;
  for (const xpId of xpIds) {
    const xpEvent = await xpEventsTable.selectRecordAsync(xpId);
    if (!xpEvent || !checked(xpEvent, xpEventsTable, CONFIG.fields.xp.active)) continue;
    if (!sameIds(linkedIds(xpEvent, xpEventsTable, CONFIG.fields.xp.enrollment), [enrollmentId])) continue;
    if (!sameIds(linkedIds(xpEvent, xpEventsTable, CONFIG.fields.xp.week), [weekId])) continue;
    if (!linkedIds(xpEvent, xpEventsTable, CONFIG.fields.xp.videoFeedback).includes(recordId)) continue;
    activeVideoXp += Math.max(0, getNumber(xpEvent, xpEventsTable, CONFIG.fields.xp.points));
  }
  if (activeVideoXp <= 0) {
    throw new Error("No active Video Feedback XP Event matches Enrollment + Week + source. Handoff blocked.");
  }
  if (getNumber(vf, vfTable, CONFIG.fields.vf.totalXp) <= 0 || getNumber(vf, vfTable, CONFIG.fields.vf.baseXp) <= 0) {
    throw new Error("Video Feedback XP award fields are not positive. Handoff blocked.");
  }

  step("05 - Resolve recipients and Hub payload");
  const programId = oneLinkedId(linkedIds(enrollment, enrollmentsTable, CONFIG.fields.enr.program), "Enrollment Program Instance");
  const parent = recipientEmail(enrollment, enrollmentsTable, CONFIG.fields.enr.parentClean);
  if (!parent) throw new Error("No usable cleaned parent recipient on Enrollment.");
  const athleteName = firstNonEmpty(
    getText(enrollment, enrollmentsTable, CONFIG.fields.enr.athlete),
    getText(vf, vfTable, CONFIG.fields.vf.name),
    "Athlete"
  );
  const originalFileName = firstNonEmpty(
    getText(vf, vfTable, CONFIG.fields.vf.fileName),
    getText(asset, assetsTable, CONFIG.fields.asset.original),
    "Video submission"
  );
  const videoUrl = parentVideoUrl(vf, vfTable);
  const recipients = [{ email: parent, role: "guardian", displayName: athleteName }];
  const payload = {
    athleteName,
    parentFirstName: getText(enrollment, enrollmentsTable, CONFIG.fields.enr.parentFirst),
    coachFeedback,
    reviewedAt: dateText(getRaw(vf, vfTable, CONFIG.fields.vf.reviewedAt)),
    weekName: getText(vf, vfTable, CONFIG.fields.vf.week),
    originalFileName,
    videoUrl,
    videoSubmissionNote: getText(submission, submissionsTable, CONFIG.fields.sub.note),
    totalVideoXpAwarded: activeVideoXp,
    baseXpAwarded: getNumber(vf, vfTable, CONFIG.fields.vf.baseXp),
    uploadStatus: getText(vf, vfTable, CONFIG.fields.vf.uploadStatus),
    videoAssetUploadedAt: dateText(getRaw(vf, vfTable, CONFIG.fields.vf.uploadedAt)),
    videoFeedbackKey: expectedKey,
    canonicalSubmissionId: submissionId,
    canonicalSubmissionAssetId: assetId,
    canonicalWeekId: weekId,
  };

  const queueData = queueFields(queueTable, {
    [CONFIG.fields.queue.key]: handoffKey,
    [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.videoFeedback,
    [CONFIG.fields.queue.eventType]: selectValue(queueTable, CONFIG.fields.queue.eventType, CONFIG.values.eventType),
    [CONFIG.fields.queue.template]: CONFIG.values.templateKey,
    [CONFIG.fields.queue.source]: recordId,
    [CONFIG.fields.queue.enrollment]: enrollmentId,
    [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients),
    [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: testMode,
    [CONFIG.fields.queue.attempts]: 0,
  });

  step("06 - Idempotent Email Handoff Queue create");
  const existing = (
    await queueTable.selectRecordsAsync({
      fields: Object.values(CONFIG.fields.queue).filter((name) => fieldExists(queueTable, name)),
    })
  ).records.filter((row) => getText(row, queueTable, CONFIG.fields.queue.key) === handoffKey);

  if (existing.length > 1) {
    await markQueueNeedsReview(queueTable, existing);
    setOutputSafe("statusOut", CONFIG.statuses.error);
    setOutputSafe("actionOut", CONFIG.actions.needsReview);
    throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }

  if (existing.length === 1) {
    if (!samePayload(getText(existing[0], queueTable, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueTable, existing);
      setOutputSafe("statusOut", CONFIG.statuses.error);
      setOutputSafe("actionOut", CONFIG.actions.needsReview);
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    if (fieldExists(vfTable, CONFIG.fields.vf.error)) {
      await vfTable.updateRecordAsync(recordId, { [CONFIG.fields.vf.error]: "" });
    }
    setOutputSafe("statusOut", CONFIG.statuses.success);
    setOutputSafe("actionOut", CONFIG.actions.existingHandoff);
    setOutputSafe("queueRecordId", existing[0].id);
    setOutputSafe("handoffKey", handoffKey);
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", debugStep);
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.existingHandoff,
        queueRecordId: existing[0].id,
        handoffKey,
      })
    );
    return;
  }

  const recheck = (
    await queueTable.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => fieldExists(queueTable, name)),
    })
  ).records.filter((row) => getText(row, queueTable, CONFIG.fields.queue.key) === handoffKey);
  if (recheck.length) {
    if (recheck.length > 1) {
      await markQueueNeedsReview(queueTable, recheck);
      throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey} after recheck.`);
    }
    setOutputSafe("statusOut", CONFIG.statuses.success);
    setOutputSafe("actionOut", CONFIG.actions.existingHandoff);
    setOutputSafe("queueRecordId", recheck[0].id);
    setOutputSafe("handoffKey", handoffKey);
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", debugStep);
    return;
  }

  const created = await queueTable.createRecordAsync(queueData);
  const afterCreate = (
    await queueTable.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => fieldExists(queueTable, name)),
    })
  ).records.filter((row) => getText(row, queueTable, CONFIG.fields.queue.key) === handoffKey);
  if (afterCreate.length !== 1) {
    await markQueueNeedsReview(queueTable, afterCreate);
    throw new Error(`Concurrent Email Handoff Queue creation requires review for ${handoffKey}.`);
  }

  await queueTable.updateRecordAsync(created, {
    [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.ready),
  });

  const vfUpdates = {};
  if (fieldExists(vfTable, CONFIG.fields.vf.error)) vfUpdates[CONFIG.fields.vf.error] = "";
  if (fieldExists(vfTable, CONFIG.fields.vf.subject)) {
    vfUpdates[CONFIG.fields.vf.subject] = `Video Feedback Hub handoff prepared for ${athleteName}`;
  }
  if (Object.keys(vfUpdates).length) await vfTable.updateRecordAsync(recordId, vfUpdates);

  step("07 - Complete");
  setOutputSafe("statusOut", CONFIG.statuses.success);
  setOutputSafe("actionOut", CONFIG.actions.createdHandoff);
  setOutputSafe("queueRecordId", created);
  setOutputSafe("handoffKey", handoffKey);
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", debugStep);
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.success,
      actionOut: CONFIG.actions.createdHandoff,
      queueRecordId: created,
      handoffKey,
    })
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
  try {
    const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
    const recordId = String(cfg.recordId || "").trim();
    if (/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
      const vfTable = base.getTable(CONFIG.tables.videoFeedback);
      if (fieldExists(vfTable, CONFIG.fields.vf.error)) {
        await vfTable.updateRecordAsync(recordId, {
          [CONFIG.fields.vf.error]: message,
        });
      }
    }
  } catch {
    // Best-effort error writeback.
  }
  throw error;
}
