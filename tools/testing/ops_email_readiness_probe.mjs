#!/usr/bin/env node
/**
 * Agent 4 ops — email / notification launch-readiness probe (read-only).
 *
 * Inspects Schmidt enrollment paths for:
 * - weekly summary package completeness (072 fields)
 * - homework parent feedback send state (071)
 * - video feedback parent email state (073)
 * - welcome handoff via Email Handoff Queue (078A → 079 → Hub)
 *   (legacy Enrollment welcome fields / Automation 075 are retired — do not arm)
 * - Zoom recording attendance eligible for 117
 *
 * Does NOT post webhooks or send email.
 *
 * Usage:
 *   node tools/testing/ops_email_readiness_probe.mjs
 *   node tools/testing/ops_email_readiness_probe.mjs --write-evidence
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  planWeeklyEmailWebhookOutcome,
  decideWeeklyEmailRetryAction,
} from "../../airtable/automations/shooting-challenge/lib/v2-engine-contracts.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "appn84sqPw03zEbTT";
const SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm";
const WRITE = process.argv.includes("--write-evidence");
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent4-ops");

function loadEnv() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, "tools/airtable/.env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const TOKEN = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
if (!TOKEN?.startsWith("pat")) {
  console.error("BLOCKED: AIRTABLE_API_TOKEN missing");
  process.exit(1);
}

async function api(table, qs) {
  const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${qs}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(`${table} ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

async function listByFormula(table, formula, fields, maxRecords = 50) {
  const params = new URLSearchParams();
  params.set("filterByFormula", formula);
  params.set("maxRecords", String(maxRecords));
  if (fields) for (const f of fields) params.append("fields[]", f);
  const json = await api(table, params.toString());
  return json.records || [];
}

function linkedIds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter(Boolean);
}

function truthy(v) {
  if (v === true || v === 1) return true;
  if (Array.isArray(v) && v.length) return true;
  const t = String(v ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "checked"].includes(t);
}

function redactEmail(s) {
  return String(s || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 200);
}

function packageHealth(fields, subjectKey, recipientsKey, htmlKey) {
  const subject = String(fields[subjectKey] || "").trim();
  const recipients = String(fields[recipientsKey] || "").trim();
  const html = String(fields[htmlKey] || "").trim();
  return {
    hasSubject: !!subject,
    hasRecipients: !!recipients,
    hasHtml: html.length > 40,
    htmlChars: html.length,
    recipientsRedacted: redactEmail(recipients),
    subjectPreview: subject.slice(0, 80),
  };
}

async function main() {
  const enrollment = (
    await listByFormula("Enrollments", `RECORD_ID()='${SCHMIDT_ENROLLMENT}'`, [
      "Athlete",
      "Active?",
      "Parent Email",
      "Athlete Email",
      "Welcome Email To",
      "Program Instance",
    ])
  )[0];

  const welcomeQueueRows = await listByFormula(
    "Email Handoff Queue",
    `AND({Enrollment Record ID}='${SCHMIDT_ENROLLMENT}', {Event Type}='WELCOME')`,
    [
      "Handoff Key",
      "Status",
      "Event Type",
      "Enrollment Record ID",
      "Test Mode?",
      "Error Message",
    ],
    20
  );

  const wasRows = await listByFormula(
    "Weekly Athlete Summary",
    `FIND('${SCHMIDT_ENROLLMENT}', ARRAYJOIN({Enrollment}&''))`,
    [
      "Enrollment",
      "Week",
      "Weekly Athlete Summary - Display",
      "Build Weekly Email Now?",
      "Weekly Email Ready?",
      "Send to Make?",
      "Weekly Email Sent?",
      "Weekly Email Subject",
      "Weekly Email Recipients",
      "Weekly Email HTML",
      "Make Send Status",
      "Weekly Summary Sent At",
      "Weekly Email Sent At",
      "Weekly Email Error",
      "sendMode",
    ],
    100
  );

  // Fallback: list all WAS and filter client-side (ARRAYJOIN quirks)
  let wasEffective = wasRows;
  if (wasRows.length === 0) {
    const allWas = await listByFormula("Weekly Athlete Summary", "TRUE()", [
      "Enrollment",
      "Week",
      "Weekly Athlete Summary - Display",
      "Build Weekly Email Now?",
      "Weekly Email Ready?",
      "Send to Make?",
      "Weekly Email Sent?",
      "Weekly Email Subject",
      "Weekly Email Recipients",
      "Weekly Email HTML",
      "Make Send Status",
      "Weekly Summary Sent At",
      "Weekly Email Sent At",
      "Weekly Email Error",
      "sendMode",
    ], 100);
    wasEffective = allWas.filter((r) => linkedIds(r.fields.Enrollment).includes(SCHMIDT_ENROLLMENT));
  }

  const hcRows = await listByFormula(
    "Homework Completions",
    `FIND('${SCHMIDT_ENROLLMENT}', ARRAYJOIN({Enrollment}))`,
    [
      "Enrollment",
      "Satisfactory?",
      "Review Complete",
      "Parent Feedback Ready?",
      "Parent Feedback Sent?",
      "Parent Feedback Sent On",
      "Coach Feedback",
    ],
    50
  );

  const vfRows = await listByFormula(
    "Video Feedback",
    `FIND('${SCHMIDT_ENROLLMENT}', ARRAYJOIN({Enrollment}))`,
    [
      "Enrollment",
      "Feedback Posted?",
      "Parent Feedback Ready?",
      "Parent Feedback Sent?",
      "Parent Feedback Sent On",
      "Coach Feedback",
    ],
    50
  );

  const zoomAttendance = await listByFormula(
    "Zoom Attendance",
    `FIND('${SCHMIDT_ENROLLMENT}', ARRAYJOIN({Enrollment}))`,
    [
      "Enrollment",
      "Zoom Meeting",
      "Attendance Method",
      "Recording Quiz Satisfactory?",
      "Zoom Credit Conflict?",
      "Recording Approval Email Send Key",
      "Recording Approval Email Sent At",
    ],
    50
  );

  const wasSummaries = wasEffective.map((r) => {
    const f = r.fields || {};
    const pkg = packageHealth(f, "Weekly Email Subject", "Weekly Email Recipients", "Weekly Email HTML");
    const emailSent = truthy(f["Weekly Email Sent?"]);
    const sendToMake = truthy(f["Send to Make?"]);
    const ready = truthy(f["Weekly Email Ready?"]);
    const makeStatus = f["Make Send Status"]?.name || f["Make Send Status"] || "";
    const retry = decideWeeklyEmailRetryAction({
      emailSent,
      makeSendStatus: String(makeStatus),
      emailReady: ready,
      sendToMake,
      hasErrorMessage: !!String(f["Weekly Email Error"] || "").trim(),
    });
    const webhookPlan = planWeeklyEmailWebhookOutcome({
      webhookOk: true,
      emailSent,
    });
    return {
      id: r.id,
      display: f["Weekly Athlete Summary - Display"] || null,
      enrollmentIds: linkedIds(f.Enrollment),
      weekIds: linkedIds(f.Week),
      buildNow: truthy(f["Build Weekly Email Now?"]),
      ready,
      sendToMake,
      emailSent,
      makeSendStatus: makeStatus,
      error: String(f["Weekly Email Error"] || "").slice(0, 160),
      sendMode: f.sendMode || null,
      package: pkg,
      retryDecision: retry,
      successWebhookWould: webhookPlan,
      staleSeasonLabel: /2025-2026/.test(String(f["Weekly Athlete Summary - Display"] || "")),
    };
  });

  const retryCandidates = wasSummaries.filter(
    (w) =>
      w.retryDecision?.action === "automatically_retryable" ||
      w.retryDecision?.action === "retryable_after_correcting_data"
  );

  const vfReadyUnsent = vfRows.filter((r) => {
    const f = r.fields || {};
    return truthy(f["Parent Feedback Ready?"]) && !truthy(f["Parent Feedback Sent?"]);
  });
  const hcReadyUnsent = hcRows.filter((r) => {
    const f = r.fields || {};
    return truthy(f["Parent Feedback Ready?"]) && !truthy(f["Parent Feedback Sent?"]);
  });
  const recordingEligible = zoomAttendance.filter((r) => {
    const f = r.fields || {};
    const method = f["Attendance Method"]?.name || f["Attendance Method"] || "";
    return /recording/i.test(String(method)) && truthy(f["Recording Quiz Satisfactory?"]);
  });

  const report = {
    generatedAt: new Date().toISOString(),
    baseId: BASE,
    schmidtEnrollmentId: SCHMIDT_ENROLLMENT,
    emailsSentThisProbe: 0,
    sendSuppression: "read-only probe — no webhook POST, no Gmail",
    enrollment: enrollment
      ? {
          id: enrollment.id,
          active: truthy(enrollment.fields["Active?"]),
          hasParentEmail: !!String(enrollment.fields["Parent Email"] || "").trim(),
          parentEmailRedacted: redactEmail(enrollment.fields["Parent Email"]),
          welcomeToRedacted: redactEmail(enrollment.fields["Welcome Email To"]),
          hasProgramInstance: !!(enrollment.fields["Program Instance"] || []).length,
          // Legacy Enrollment welcome builders (Automation 075) are retired.
          // Live path: 078A → Email Handoff Queue → 079 → Hub → Resend.
          welcomeHandoffs: welcomeQueueRows.map((row) => ({
            id: row.id,
            handoffKey: row.fields["Handoff Key"] || null,
            status: row.fields["Status"] || null,
            testMode: truthy(row.fields["Test Mode?"]),
            error: String(row.fields["Error Message"] || "").slice(0, 160),
          })),
          welcomeHandoffCount: welcomeQueueRows.length,
          welcomeAcceptedOrSent: welcomeQueueRows.some((row) =>
            /accepted|sent|delivered/i.test(String(row.fields["Status"] || "")),
          ),
        }
      : null,
    weekly: {
      wasCount: wasEffective.length,
      sentCount: wasSummaries.filter((w) => w.emailSent).length,
      readyUnsent: wasSummaries.filter((w) => w.ready && !w.emailSent).length,
      packageIncompleteReady: wasSummaries.filter(
        (w) => w.ready && (!w.package.hasSubject || !w.package.hasRecipients || !w.package.hasHtml)
      ).length,
      staleSeasonLabelCount: wasSummaries.filter((w) => w.staleSeasonLabel).length,
      retryCandidates: retryCandidates.map((w) => ({
        id: w.id,
        action: w.retryDecision.action,
        reason: w.retryDecision.reason || w.retryDecision.class || null,
        error: w.error,
      })),
      samples: wasSummaries.slice(0, 8),
    },
    homeworkFeedback: {
      hcCount: hcRows.length,
      sentCount: hcRows.filter((r) => truthy(r.fields["Parent Feedback Sent?"])).length,
      readyUnsentCount: hcReadyUnsent.length,
      readyUnsentIds: hcReadyUnsent.map((r) => r.id),
    },
    videoFeedback: {
      vfCount: vfRows.length,
      sentCount: vfRows.filter((r) => truthy(r.fields["Parent Feedback Sent?"])).length,
      readyUnsentCount: vfReadyUnsent.length,
      readyUnsentIds: vfReadyUnsent.map((r) => r.id),
      note: "073 video parent email still needs controlled live re-proof (SC-045)",
    },
    zoomRecordingApproval: {
      attendanceCount: zoomAttendance.length,
      recordingSatisfactoryCount: recordingEligible.length,
      eligibleIds: recordingEligible.map((r) => ({
        id: r.id,
        meetingIds: (r.fields["Zoom Meeting"] || []).map((x) => x.id),
        conflict: truthy(r.fields["Zoom Credit Conflict?"]),
        approvalSentAt: r.fields["Recording Approval Email Sent At"] || null,
        approvalSendKey: r.fields["Recording Approval Email Send Key"] || null,
      })),
      note: "117 live send not executed by this probe — use Schmidt-only go-live checklist",
    },
    nextActions: [],
  };

  if (!report.enrollment?.hasParentEmail) {
    report.nextActions.push({
      owner: "Mike",
      mikeRequired: true,
      action: "Confirm Schmidt Parent Email is a controlled inbox before any Live email test",
    });
  }
  if (report.videoFeedback.readyUnsentCount > 0) {
    report.nextActions.push({
      owner: "Mike+Agent",
      mikeRequired: true,
      action: `Run 073 on ready-unsent VF ${report.videoFeedback.readyUnsentIds[0]} with Schmidt recipient only`,
      blocker: "Live Gmail send requires operator authorization",
    });
  } else {
    report.nextActions.push({
      owner: "Mike",
      mikeRequired: true,
      action: "Create or arm one Schmidt Video Feedback with Parent Feedback Ready?=true and Sent?=false, then Test automation 073",
    });
  }
  if (report.zoomRecordingApproval.recordingSatisfactoryCount === 0) {
    report.nextActions.push({
      owner: "Mike",
      mikeRequired: true,
      action: "Create Schmidt Zoom Attendance (Recording Quiz + Satisfactory) then Test automation 117 → Make 117f",
    });
  } else {
    report.nextActions.push({
      owner: "Mike",
      mikeRequired: true,
      action: `Test automation 117 on ${report.zoomRecordingApproval.eligibleIds[0].id} (expect makeStatus=sent then already_sent); confirm no XP writes`,
    });
  }
  if (!report.enrollment?.welcomeAcceptedOrSent) {
    report.nextActions.push({
      owner: "Mike",
      mikeRequired: true,
      action:
        "Confirm 078A created a WELCOME Email Handoff Queue row for Schmidt (Test Mode? on), then confirm 079 → Hub → Resend Delivery Sent — do not restore Automation 075 or retired Enrollment welcome-builder fields",
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        enrollment: report.enrollment,
        weekly: {
          wasCount: report.weekly.wasCount,
          sentCount: report.weekly.sentCount,
          readyUnsent: report.weekly.readyUnsent,
          packageIncompleteReady: report.weekly.packageIncompleteReady,
          retryCandidates: report.weekly.retryCandidates,
        },
        homeworkFeedback: report.homeworkFeedback,
        videoFeedback: report.videoFeedback,
        zoomRecordingApproval: report.zoomRecordingApproval,
        nextActions: report.nextActions,
        sendSuppression: report.sendSuppression,
      },
      null,
      2
    )
  );

  if (WRITE) {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(resolve(EVIDENCE_DIR, "EMAIL-READINESS-PROBE.json"), JSON.stringify(report, null, 2));
    console.log("Wrote", resolve(EVIDENCE_DIR, "EMAIL-READINESS-PROBE.json"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
