/*
GitHub header
Automation: 073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v4.1
Date Written: 2026-06-17
Last Updated: 2026-08-17

PURPOSE
- Validate one Video Feedback record that is ready for parent email.
- Create exactly one Ready Email Handoff Queue row for Communications Hub.
- Hand off template data to Automation 079 / Communications Hub / Resend.

IMPORTANT DESIGN RULES
- Hub owns subject, HTML, plain text, branding, delivery, and Delivery proof.
- This script never calls Make, Gmail, Resend, or the Communications Hub ingress.
- Only Automation 079 may send Email Handoff Queue rows to the Hub.
- One Video Feedback maps to VIDEO_FEEDBACK|VIDEO_FEEDBACK|{Video Feedback Record ID}.
- Idempotent: reuse an existing matching Handoff Key; conflicting payload → Needs Review.
- Do not write Parent Feedback Sent? or Parent Feedback Sent On (Hub/downstream writeback).
- Parent-facing video link is ONLY Video Feedback "Video URL or Drive Link" (written by 022).
- Do not read Reviewer File URL, Canonical File URL, or any Google Drive File/Folder ID/URL/Name.
- Missing/invalid VF video URL → error (no asset-field fallback).
- Enrollment Parent Email - Cleaned is the authoritative recipient (076 Hub pattern).

TRIGGER (Airtable UI — keep unless Mike revises)
- Video Feedback when record matches conditions:
  Parent Feedback Ready? checked
  Parent Feedback Sent? unchecked
  Feedback Posted? checked
  Coach Feedback not empty
  Enrollment not empty
  Submission not empty
  Total Video XP Awarded > 0
  Base XP Awarded > 0

INPUT
- recordId (required Video Feedback record ID)
- testMode (optional; default true for controlled Hub sends)

OUTPUTS
- statusOut: success | skipped | error
- actionOut: created_handoff | existing_handoff | needs_review | error
- queueRecordId, handoffKey, errorOut, debugStep

FOLDER
- 07 - Email, Notifications, and External Handoffs

AUTOMATION NAME
- 073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff",
  version: "v4.1",
  versionDate: "2026-08-17",
  originalWrittenDate: "2026-06-17",
  lastUpdated: "2026-08-17",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "073 - Email, Notifications, and External Handoffs - Create Video Feedback Communications Hub Handoff",
};

const CONFIG = {
  tables: {
    vf: "Video Feedback",
    enr: "Enrollments",
    sub: "Submissions",
    assets: "Submission Assets",
    xp: "XP Events",
    queue: "Email Handoff Queue",
  },
  statuses: { draft: "Draft", ready: "Ready", needsReview: "Needs Review" },
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

const TZ = "America/Denver";

function setOutput(name, value) {
  try {
    output.set(name, value);
  } catch {}
}

function debug(value) {
  setOutput("debugStep", value);
}

function exists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch {
    return false;
  }
}

function raw(rec, table, name) {
  return rec && exists(table, name) ? rec.getCellValue(name) : null;
}

function text(rec, table, name) {
  return rec && exists(table, name) ? String(rec.getCellValueAsString(name) || "").trim() : "";
}

function ids(rec, table, name) {
  const value = raw(rec, table, name);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function checked(rec, table, name) {
  return raw(rec, table, name) === true;
}

function number(rec, table, name) {
  const value = raw(rec, table, name);
  const n = typeof value === "number" ? value : Number(text(rec, table, name).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function truthyFormula(rec, table, name) {
  const value = raw(rec, table, name);
  if (value === true || value === 1) return true;
  const s = text(rec, table, name).toLowerCase();
  return ["1", "true", "yes", "y", "count", "counted"].includes(s);
}

function one(values, label) {
  if (values.length !== 1) throw new Error(`${label} must contain exactly one linked record; found ${values.length}.`);
  return values[0];
}

function same(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function first(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientEmail(rec, table, name) {
  const email = cleanEmail(text(rec, table, name));
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
    timeZone: TZ,
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
    timeZone: TZ,
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
  return Object.fromEntries(Object.entries(values).filter(([name]) => exists(queueTable, name)));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
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
    if (exists(queueTable, CONFIG.fields.queue.status)) {
      await queueTable.updateRecordAsync(row.id, {
        [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview),
      });
    }
  }
}

function parentVideoUrl(vf, vfTable) {
  const url = text(vf, vfTable, CONFIG.fields.vf.videoUrl);
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

async function main() {
  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
    throw new Error("recordId must be a valid Airtable record ID.");
  }
  const testMode = cfg.testMode === undefined ? true : Boolean(cfg.testMode);

  const vfT = base.getTable(CONFIG.tables.vf);
  const enrT = base.getTable(CONFIG.tables.enr);
  const subT = base.getTable(CONFIG.tables.sub);
  const assetT = base.getTable(CONFIG.tables.assets);
  const xpT = base.getTable(CONFIG.tables.xp);
  const queueT = base.getTable(CONFIG.tables.queue);

  debug("01 - Load Video Feedback");
  const vf = await vfT.selectRecordAsync(recordId);
  if (!vf) throw new Error(`Video Feedback not found: ${recordId}`);

  const handoffKey = `${CONFIG.values.eventType}|${CONFIG.values.sourceTableToken}|${recordId}`;

  debug("02 - Validate readiness gates");
  if (!checked(vf, vfT, CONFIG.fields.vf.active)) {
    throw new Error("Video Feedback is inactive/retired. Handoff blocked.");
  }
  if (!checked(vf, vfT, CONFIG.fields.vf.posted)) {
    throw new Error("Feedback Posted? is not checked. Handoff blocked.");
  }
  if (!checked(vf, vfT, CONFIG.fields.vf.ready)) {
    throw new Error("Parent Feedback Ready? is not checked. Handoff blocked.");
  }
  if (checked(vf, vfT, CONFIG.fields.vf.sent)) {
    throw new Error("Parent Feedback Sent? is already checked. Duplicate handoff blocked.");
  }
  const coachFeedback = text(vf, vfT, CONFIG.fields.vf.coach);
  if (!coachFeedback) throw new Error("Coach Feedback is blank. Handoff blocked.");

  debug("03 - Validate canonical source chain");
  const enrollmentId = one(ids(vf, vfT, CONFIG.fields.vf.enrollment), "Video Feedback Enrollment");
  const submissionId = one(ids(vf, vfT, CONFIG.fields.vf.submission), "Video Feedback Submission");
  const assetId = one(ids(vf, vfT, CONFIG.fields.vf.asset), "Video Feedback Submission Asset");
  const [enr, sub, asset] = await Promise.all([
    enrT.selectRecordAsync(enrollmentId),
    subT.selectRecordAsync(submissionId),
    assetT.selectRecordAsync(assetId),
  ]);
  if (!enr || !sub || !asset) {
    throw new Error("Canonical Video Feedback source chain contains a missing record.");
  }
  if (!checked(enr, enrT, CONFIG.fields.enr.active)) {
    throw new Error("Enrollment is inactive. Handoff blocked.");
  }

  const expectedKey = `VIDEO_FEEDBACK|${assetId}`;
  if (text(vf, vfT, CONFIG.fields.vf.key) !== expectedKey) {
    throw new Error(`Video Feedback Key mismatch. Expected ${expectedKey}.`);
  }
  if (!same(ids(asset, assetT, CONFIG.fields.asset.submission), [submissionId])) {
    throw new Error("Submission Asset does not belong exclusively to the linked Submission.");
  }
  if (!same(ids(asset, assetT, CONFIG.fields.asset.enrollment), [enrollmentId])) {
    throw new Error("Submission Asset Enrollment does not match Video Feedback Enrollment.");
  }
  if (!ids(asset, assetT, CONFIG.fields.asset.videoFeedback).includes(recordId)) {
    throw new Error("Submission Asset does not link back to this canonical Video Feedback.");
  }
  if (!truthyFormula(asset, assetT, CONFIG.fields.asset.trueVideo)) {
    throw new Error("Submission Asset is not a true Video Feedback asset.");
  }

  if (!same(ids(sub, subT, CONFIG.fields.sub.enrollment), [enrollmentId])) {
    throw new Error("Submission Enrollment does not match Video Feedback Enrollment.");
  }
  const weekIds = ids(sub, subT, CONFIG.fields.sub.week);
  if (weekIds.length !== 1) {
    throw new Error(`Submission must have exactly one Week; found ${weekIds.length}.`);
  }
  const weekId = weekIds[0];
  if (!text(vf, vfT, CONFIG.fields.vf.week)) {
    throw new Error("Video Feedback Week lookup is blank. Handoff blocked.");
  }
  if (!truthyFormula(sub, subT, CONFIG.fields.sub.countable)) {
    throw new Error("Linked Submission is not countable/current. Handoff blocked.");
  }
  if (!Array.isArray(raw(sub, subT, CONFIG.fields.sub.videoUpload)) || raw(sub, subT, CONFIG.fields.sub.videoUpload).length === 0) {
    throw new Error("Linked Submission has no Video Upload. Handoff blocked.");
  }
  const activityDate = raw(sub, subT, CONFIG.fields.sub.activityDate);
  if (!parseDate(activityDate)) throw new Error("Submission Activity Date is missing/invalid.");
  if (denverDateKey(activityDate) > todayDenverKey()) {
    throw new Error("Submission Activity Date is in the future. Handoff blocked.");
  }

  debug("04 - Validate active Video XP ownership");
  const xpIds = ids(vf, vfT, CONFIG.fields.vf.xpEvents);
  if (!xpIds.length) throw new Error("Video Feedback has no linked XP Events. Handoff blocked.");
  let activeVideoXp = 0;
  for (const xpId of xpIds) {
    const xp = await xpT.selectRecordAsync(xpId);
    if (!xp || !checked(xp, xpT, CONFIG.fields.xp.active)) continue;
    if (!same(ids(xp, xpT, CONFIG.fields.xp.enrollment), [enrollmentId])) continue;
    if (!same(ids(xp, xpT, CONFIG.fields.xp.week), [weekId])) continue;
    if (!ids(xp, xpT, CONFIG.fields.xp.videoFeedback).includes(recordId)) continue;
    activeVideoXp += Math.max(0, number(xp, xpT, CONFIG.fields.xp.points));
  }
  if (activeVideoXp <= 0) {
    throw new Error("No active Video Feedback XP Event matches Enrollment + Week + source. Handoff blocked.");
  }
  if (number(vf, vfT, CONFIG.fields.vf.totalXp) <= 0 || number(vf, vfT, CONFIG.fields.vf.baseXp) <= 0) {
    throw new Error("Video Feedback XP award fields are not positive. Handoff blocked.");
  }

  debug("05 - Resolve recipients and Hub payload");
  const programId = one(ids(enr, enrT, CONFIG.fields.enr.program), "Enrollment Program Instance");
  const parent = recipientEmail(enr, enrT, CONFIG.fields.enr.parentClean);
  if (!parent) throw new Error("No usable cleaned parent recipient on Enrollment.");
  const athleteName = first(text(enr, enrT, CONFIG.fields.enr.athlete), text(vf, vfT, CONFIG.fields.vf.name), "Athlete");
  const originalFileName = first(
    text(vf, vfT, CONFIG.fields.vf.fileName),
    text(asset, assetT, CONFIG.fields.asset.original),
    "Video submission"
  );
  const videoUrl = parentVideoUrl(vf, vfT);
  const recipients = [{ email: parent, role: "guardian", displayName: athleteName }];
  const payload = {
    athleteName,
    parentFirstName: text(enr, enrT, CONFIG.fields.enr.parentFirst),
    coachFeedback,
    reviewedAt: dateText(raw(vf, vfT, CONFIG.fields.vf.reviewedAt)),
    weekName: text(vf, vfT, CONFIG.fields.vf.week),
    originalFileName,
    videoUrl,
    videoSubmissionNote: text(sub, subT, CONFIG.fields.sub.note),
    totalVideoXpAwarded: activeVideoXp,
    baseXpAwarded: number(vf, vfT, CONFIG.fields.vf.baseXp),
    uploadStatus: text(vf, vfT, CONFIG.fields.vf.uploadStatus),
    videoAssetUploadedAt: dateText(raw(vf, vfT, CONFIG.fields.vf.uploadedAt)),
    videoFeedbackKey: expectedKey,
    canonicalSubmissionId: submissionId,
    canonicalSubmissionAssetId: assetId,
    canonicalWeekId: weekId,
  };

  const queueData = queueFields(queueT, {
    [CONFIG.fields.queue.key]: handoffKey,
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.vf,
    [CONFIG.fields.queue.eventType]: selectValue(queueT, CONFIG.fields.queue.eventType, CONFIG.values.eventType),
    [CONFIG.fields.queue.template]: CONFIG.values.templateKey,
    [CONFIG.fields.queue.source]: recordId,
    [CONFIG.fields.queue.enrollment]: enrollmentId,
    [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients),
    [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: testMode,
    [CONFIG.fields.queue.attempts]: 0,
  });

  debug("06 - Idempotent Email Handoff Queue create");
  const existing = (await queueT.selectRecordsAsync({
    fields: Object.values(CONFIG.fields.queue).filter((name) => exists(queueT, name)),
  })).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);

  if (existing.length > 1) {
    await markQueueNeedsReview(queueT, existing);
    setOutput("statusOut", "error");
    setOutput("actionOut", "needs_review");
    throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }

  if (existing.length === 1) {
    if (!samePayload(text(existing[0], queueT, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueT, existing);
      setOutput("statusOut", "error");
      setOutput("actionOut", "needs_review");
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    if (exists(vfT, CONFIG.fields.vf.error)) {
      await vfT.updateRecordAsync(recordId, { [CONFIG.fields.vf.error]: "" });
    }
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", existing[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
    console.log(JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "success",
      actionOut: "existing_handoff",
      queueRecordId: existing[0].id,
      handoffKey,
    }));
    return;
  }

  const recheck = (await queueT.selectRecordsAsync({
    fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
  })).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (recheck.length) {
    if (recheck.length > 1) {
      await markQueueNeedsReview(queueT, recheck);
      throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey} after recheck.`);
    }
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", recheck[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
    return;
  }

  const created = await queueT.createRecordAsync(queueData);
  const afterCreate = (await queueT.selectRecordsAsync({
    fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
  })).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (afterCreate.length !== 1) {
    await markQueueNeedsReview(queueT, afterCreate);
    throw new Error(`Concurrent Email Handoff Queue creation requires review for ${handoffKey}.`);
  }

  await queueT.updateRecordAsync(created, {
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.ready),
  });

  const vfUpdates = {};
  if (exists(vfT, CONFIG.fields.vf.error)) vfUpdates[CONFIG.fields.vf.error] = "";
  if (exists(vfT, CONFIG.fields.vf.subject)) {
    vfUpdates[CONFIG.fields.vf.subject] = `Video Feedback Hub handoff prepared for ${athleteName}`;
  }
  if (Object.keys(vfUpdates).length) await vfT.updateRecordAsync(recordId, vfUpdates);

  setOutput("statusOut", "success");
  setOutput("actionOut", "created_handoff");
  setOutput("queueRecordId", created);
  setOutput("handoffKey", handoffKey);
  setOutput("errorOut", "");
  console.log(JSON.stringify({
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    statusOut: "success",
    actionOut: "created_handoff",
    queueRecordId: created,
    handoffKey,
  }));
}

try {
  await main();
} catch (error) {
  setOutput("statusOut", "error");
  setOutput("actionOut", "error");
  setOutput("errorOut", String(error.message || error));
  try {
    const cfg = input.config();
    const recordId = String(cfg.recordId || "").trim();
    if (/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
      const vfT = base.getTable(CONFIG.tables.vf);
      if (exists(vfT, CONFIG.fields.vf.error)) {
        await vfT.updateRecordAsync(recordId, {
          [CONFIG.fields.vf.error]: String(error.message || error),
        });
      }
    }
  } catch {}
  throw error;
}
