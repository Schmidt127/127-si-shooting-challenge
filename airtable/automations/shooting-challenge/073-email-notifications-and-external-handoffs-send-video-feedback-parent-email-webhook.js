/*
Automation: 073 - Email, Notifications, and External Handoffs - Send Video Feedback Parent Email Webhook
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v3.3
Date: 2026-08-08

Issue #105 hardening:
- Fail closed unless Video Feedback is Active and has one canonical Submission Asset.
- Validate VIDEO_FEEDBACK|{asset RID}, asset/submission/enrollment ownership, countable/non-future submission, and Week.
- Require active Video Feedback-linked XP evidence with matching Enrollment + Week.
- Treat HTTP 200 semantic failures ({ok:false}/{success:false}/{sent:false}) as failures.
- Preserve Test/Live recipient isolation and Make ownership of final Sent writeback.
*/

// @ts-nocheck

const VERSION = "v3.3";
const TABLES = {
  videoFeedback: "Video Feedback",
  enrollments: "Enrollments",
  submissions: "Submissions",
  assets: "Submission Assets",
  xpEvents: "XP Events",
};

const F = {
  vf: {
    enrollment: "Enrollment", submission: "Submission", asset: "Submission Asset",
    key: "Video Feedback Key", active: "Active?", coach: "Coach Feedback",
    posted: "Feedback Posted?", reviewedAt: "Reviewed At", week: "Week",
    ready: "Parent Feedback Ready?", sent: "Parent Feedback Sent?",
    error: "Parent Feedback Send Error", subject: "Parent Feedback Subject",
    xpEvents: "XP Events", totalXp: "Total Video XP Awarded", baseXp: "Base XP Awarded",
    name: "Video Feedback Name", videoUrl: "Video URL or Drive Link",
  },
  enr: {
    active: "Active?", parentClean: "Parent Email - Cleaned", parent: "Parent Email",
    parentFirst: "Parent First Name", athlete: "Full Athlete Name",
  },
  sub: {
    enrollment: "Enrollment", week: "Week", activityDate: "Activity Date",
    countable: "Count This Submission?", videoUpload: "Video Upload", note: "Video Upload Note",
  },
  asset: {
    submission: "Submission - Linked", enrollment: "Enrollment - Linked", videoFeedback: "Video Feedback",
    trueVideo: "Is True Video Feedback Asset?", original: "Original File Name",
    reviewer: "Reviewer File URL", driveView: "Google Drive View URL", driveFile: "Google Drive File URL",
  },
  xp: {
    active: "Active?", enrollment: "Enrollment", week: "Week", videoFeedback: "Video Feedback",
    points: "XP Points",
  },
};

const DEFAULT_REPLY_TO = "mschmidt@fairfield.k12.mt.us";

function hasField(table, name) { try { table.getField(name); return true; } catch { return false; } }
function raw(rec, table, name) { return rec && hasField(table, name) ? rec.getCellValue(name) : null; }
function text(rec, table, name) { return rec && hasField(table, name) ? String(rec.getCellValueAsString(name) || "").trim() : ""; }
function linkedIds(rec, table, name) { const v = raw(rec, table, name); return Array.isArray(v) ? v.map(x => x?.id).filter(Boolean) : []; }
function oneLinkedId(rec, table, name, label) {
  const ids = linkedIds(rec, table, name);
  if (ids.length !== 1) throw new Error(`${label} must contain exactly one linked record; found ${ids.length}.`);
  return ids[0];
}
function checked(rec, table, name) { return raw(rec, table, name) === true; }
function number(rec, table, name) { const v = raw(rec, table, name); const n = typeof v === "number" ? v : Number(text(rec, table, name).replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
function first(...values) { return values.map(v => String(v ?? "").trim()).find(Boolean) || ""; }
function cleanEmails(v) { return [...new Set(String(v || "").split(/[,;\n]+/).map(s => s.trim()).filter(Boolean))].join(","); }
function esc(v) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;"); }
function sameSet(a,b) { return a.length === b.length && a.every(x => b.includes(x)); }
function truthyFormula(rec, table, name) {
  const v = raw(rec, table, name);
  if (v === true || v === 1) return true;
  const s = text(rec, table, name).toLowerCase();
  return ["1","true","yes","y","count","counted"].includes(s);
}
function parseDate(v) { const d = v instanceof Date ? v : new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
function denverDateKey(v) {
  const d = parseDate(v); if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", {timeZone:"America/Denver",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}
function todayDenverKey() { return denverDateKey(new Date()); }
function normalizeSendMode(v) {
  const s = String(v || "").trim().toLowerCase();
  if (["live","l","real","send","parent"].includes(s)) return "live";
  if (["test","t","preview","practice","draft"].includes(s)) return "test";
  return "";
}
function semanticFailure(body) {
  const s = String(body || "").trim(); if (!s) return "";
  try {
    const j = JSON.parse(s);
    for (const k of ["ok","success","sent"]) if (Object.prototype.hasOwnProperty.call(j,k) && j[k] === false) return `${k}=false`;
  } catch {}
  return "";
}
async function postJson(url, payload) {
  const req = {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)};
  if (typeof fetch === "function") return await fetch(url, req);
  if (typeof remoteFetchAsync === "function") return await remoteFetchAsync(url, req);
  throw new Error("No supported HTTP method is available in this Airtable automation environment.");
}
function parentVideoUrl(assetRec, assetTable) {
  return first(text(assetRec,assetTable,F.asset.reviewer), text(assetRec,assetTable,F.asset.driveView), text(assetRec,assetTable,F.asset.driveFile));
}
function emailHtml({parentFirstName, athleteName, coachFeedback, totalXp, fileName, sendMode}) {
  const banner = sendMode === "test" ? `<p><strong>TEST MODE — not sent to the real parent.</strong></p>` : "";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#262626">${banner}<h2 style="color:#0034B7">Video Feedback Posted</h2><p>Hello ${esc(parentFirstName || "Parent")},</p><p>I finished reviewing ${esc(athleteName || "your athlete")}'s video submission.</p><p><strong>File:</strong> ${esc(fileName || "Video submission")}<br><strong>XP Awarded:</strong> ${esc(totalXp)}</p><h3 style="color:#0034B7">Coach Feedback</h3><p>${esc(coachFeedback).replace(/\n/g,"<br>")}</p><p>Thank you,<br>Coach Mike</p></body></html>`;
}

async function main() {
  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();
  const makeWebhookUrl = String(cfg.makeWebhookUrl || "").trim();
  const sendMode = normalizeSendMode(cfg.sendMode);
  const testRecipientEmail = String(cfg.testRecipientEmail || "").trim();
  const replyTo = String(cfg.replyTo || DEFAULT_REPLY_TO).trim();
  if (!recordId) throw new Error("Missing required input: recordId");
  if (!makeWebhookUrl) throw new Error("Missing required input: makeWebhookUrl");
  if (!sendMode) throw new Error("Invalid sendMode. Expected Test or Live.");
  if (sendMode === "test" && !testRecipientEmail) throw new Error("Missing testRecipientEmail for Test mode.");

  const vfT = base.getTable(TABLES.videoFeedback), enrT = base.getTable(TABLES.enrollments), subT = base.getTable(TABLES.submissions), assetT = base.getTable(TABLES.assets), xpT = base.getTable(TABLES.xpEvents);
  const vf = await vfT.selectRecordAsync(recordId); if (!vf) throw new Error(`Video Feedback not found: ${recordId}`);

  if (!checked(vf,vfT,F.vf.active)) throw new Error("Video Feedback is inactive/retired. Email blocked.");
  if (!checked(vf,vfT,F.vf.posted)) throw new Error("Feedback Posted? is not checked. Email blocked.");
  if (!checked(vf,vfT,F.vf.ready)) throw new Error("Parent Feedback Ready? is not checked. Email blocked.");
  if (checked(vf,vfT,F.vf.sent)) throw new Error("Parent Feedback Sent? is already checked. Duplicate send blocked.");
  const coachFeedback = text(vf,vfT,F.vf.coach); if (!coachFeedback) throw new Error("Coach Feedback is blank. Email blocked.");

  const enrollmentId = oneLinkedId(vf,vfT,F.vf.enrollment,"Video Feedback Enrollment");
  const submissionId = oneLinkedId(vf,vfT,F.vf.submission,"Video Feedback Submission");
  const assetId = oneLinkedId(vf,vfT,F.vf.asset,"Video Feedback Submission Asset");
  const [enr, sub, asset] = await Promise.all([enrT.selectRecordAsync(enrollmentId), subT.selectRecordAsync(submissionId), assetT.selectRecordAsync(assetId)]);
  if (!enr || !sub || !asset) throw new Error("Canonical Video Feedback source chain contains a missing record.");
  if (!checked(enr,enrT,F.enr.active)) throw new Error("Enrollment is inactive. Email blocked.");

  const expectedKey = `VIDEO_FEEDBACK|${assetId}`;
  if (text(vf,vfT,F.vf.key) !== expectedKey) throw new Error(`Video Feedback Key mismatch. Expected ${expectedKey}.`);
  if (!sameSet(linkedIds(asset,assetT,F.asset.submission),[submissionId])) throw new Error("Submission Asset does not belong exclusively to the linked Submission.");
  if (!sameSet(linkedIds(asset,assetT,F.asset.enrollment),[enrollmentId])) throw new Error("Submission Asset Enrollment does not match Video Feedback Enrollment.");
  if (!linkedIds(asset,assetT,F.asset.videoFeedback).includes(recordId)) throw new Error("Submission Asset does not link back to this canonical Video Feedback.");
  if (!truthyFormula(asset,assetT,F.asset.trueVideo)) throw new Error("Submission Asset is not a true Video Feedback asset.");

  if (!sameSet(linkedIds(sub,subT,F.sub.enrollment),[enrollmentId])) throw new Error("Submission Enrollment does not match Video Feedback Enrollment.");
  const weekIds = linkedIds(sub,subT,F.sub.week); if (weekIds.length !== 1) throw new Error(`Submission must have exactly one Week; found ${weekIds.length}.`);
  const weekId = weekIds[0];
  if (!text(vf,vfT,F.vf.week)) throw new Error("Video Feedback Week lookup is blank. Email blocked.");
  if (!truthyFormula(sub,subT,F.sub.countable)) throw new Error("Linked Submission is not countable/current. Email blocked.");
  if (!Array.isArray(raw(sub,subT,F.sub.videoUpload)) || raw(sub,subT,F.sub.videoUpload).length === 0) throw new Error("Linked Submission has no Video Upload. Email blocked.");
  const activityDate = raw(sub,subT,F.sub.activityDate); if (!parseDate(activityDate)) throw new Error("Submission Activity Date is missing/invalid.");
  if (denverDateKey(activityDate) > todayDenverKey()) throw new Error("Submission Activity Date is in the future. Email blocked.");

  const xpIds = linkedIds(vf,vfT,F.vf.xpEvents); if (!xpIds.length) throw new Error("Video Feedback has no linked XP Events. Email blocked.");
  let activeVideoXp = 0;
  for (const xpId of xpIds) {
    const xp = await xpT.selectRecordAsync(xpId); if (!xp || !checked(xp,xpT,F.xp.active)) continue;
    if (!sameSet(linkedIds(xp,xpT,F.xp.enrollment),[enrollmentId])) continue;
    if (!sameSet(linkedIds(xp,xpT,F.xp.week),[weekId])) continue;
    if (!linkedIds(xp,xpT,F.xp.videoFeedback).includes(recordId)) continue;
    activeVideoXp += Math.max(0, number(xp,xpT,F.xp.points));
  }
  if (activeVideoXp <= 0) throw new Error("No active Video Feedback XP Event matches Enrollment + Week + source. Email blocked.");
  if (number(vf,vfT,F.vf.totalXp) <= 0 || number(vf,vfT,F.vf.baseXp) <= 0) throw new Error("Video Feedback XP award fields are not positive. Email blocked.");

  const parentEmailsCsv = cleanEmails(first(text(enr,enrT,F.enr.parentClean),text(enr,enrT,F.enr.parent)));
  if (!parentEmailsCsv) throw new Error("No parent recipient email found on linked Enrollment.");
  const toEmail = sendMode === "test" ? testRecipientEmail : parentEmailsCsv;
  const athleteName = first(text(enr,enrT,F.enr.athlete),text(vf,vfT,F.vf.name));
  const subjectBase = `New Video Feedback for ${athleteName || "Athlete"}`;
  const subjectOut = sendMode === "test" ? `[TEST] ${subjectBase}` : subjectBase;
  const originalFileName = text(asset,assetT,F.asset.original);
  const videoUrl = parentVideoUrl(asset,assetT);
  const htmlOut = emailHtml({parentFirstName:text(enr,enrT,F.enr.parentFirst),athleteName,coachFeedback,totalXp:activeVideoXp,fileName:originalFileName,sendMode});
  const payload = {recordId,sourceTable:TABLES.videoFeedback,sendType:"video_feedback",sendMode,sendTag:"VIDEO_FEEDBACK_PARENT",toEmail,liveRecipientEmail:parentEmailsCsv,testRecipientEmail,athleteName,subjectOut,htmlOut,replyTo,videoUrl,originalFileName,videoSubmissionNote:text(sub,subT,F.sub.note),totalVideoXpAwarded:activeVideoXp,baseXpAwarded:number(vf,vfT,F.vf.baseXp),canonicalSubmissionId:submissionId,canonicalSubmissionAssetId:assetId,canonicalWeekId:weekId,videoFeedbackKey:expectedKey};

  try {
    const response = await postJson(makeWebhookUrl,payload); const body = await response.text();
    if (!response.ok) throw new Error(`Webhook failed with status ${response.status}: ${body}`);
    const sem = semanticFailure(body); if (sem) throw new Error(`Webhook semantic failure: ${sem}: ${body}`);
    const updates = {}; if (hasField(vfT,F.vf.error)) updates[F.vf.error] = ""; if (hasField(vfT,F.vf.subject)) updates[F.vf.subject] = subjectOut;
    if (Object.keys(updates).length) await vfT.updateRecordAsync(recordId,updates);
    for (const [k,v] of Object.entries({ok:true,version:VERSION,recordId,sendMode,toEmail,subjectOut,activeVideoXp,canonicalSubmissionId:submissionId,canonicalSubmissionAssetId:assetId,canonicalWeekId:weekId,makeResponse:body,errorOut:""})) output.set(k,v);
  } catch (err) {
    if (hasField(vfT,F.vf.error)) await vfT.updateRecordAsync(recordId,{[F.vf.error]:String(err.message || err)});
    output.set("ok",false); output.set("version",VERSION); output.set("recordId",recordId); output.set("errorOut",String(err.message || err));
    throw err;
  }
}

await main();