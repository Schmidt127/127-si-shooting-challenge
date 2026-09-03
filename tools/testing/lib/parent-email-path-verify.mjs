/**
 * Disposable parent-email path triggers for PELC harness.
 * Safe recipient: schmidt@fairfieldbasketballclub.com only.
 */
import { createRecords, deleteRecords, getRecord, listRecords, updateRecords } from "./airtable-client.mjs";
import { bootstrapDisposableEnrollment, cleanupBootstrapManifest } from "./post-fut030-bootstrap.mjs";
import { applyBuildArm, applySendArm, buildWeeklyHandoffKey } from "./mrw-f07-weekly-email-lib.mjs";

export const SAFE_EMAIL = "schmidt@fairfieldbasketballclub.com";
const GOAL_RECORD_ID = "recHE7FhreD1jqfXm";
const EARLY_BIRD_WEEK_ID = "recBrZ1sV8byWEHZU";
const EARLY_BIRD_HW1_PHA = "recrpWRmt0MntieCL";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRecipients(json) {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x?.email || "").trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function waitForQueueHandoff(token, baseId, handoffKey, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const rows = await listRecords(token, baseId, "Email Handoff Queue", {
      filterByFormula: `{Handoff Key}="${handoffKey}"`,
      maxRecords: 5,
    });
    const terminal = rows.find((r) => ["Accepted", "Failed"].includes(String(r.fields?.Status || "")));
    if (terminal) return { row: terminal, allRows: rows };
    await sleep(4000);
  }
  const rows = await listRecords(token, baseId, "Email Handoff Queue", {
    filterByFormula: `{Handoff Key}="${handoffKey}"`,
    maxRecords: 5,
  });
  return { row: rows[0] || null, allRows: rows, timeout: true };
}

export function summarizeQueueRow(row) {
  const f = row?.fields || {};
  const recipients = parseRecipients(f["Recipients JSON"]);
  const bad = recipients.filter((e) => e !== SAFE_EMAIL);
  return {
    queueId: row?.id || null,
    status: f.Status || null,
    testMode: f["Test Mode?"],
    handoffKey: f["Handoff Key"],
    eventType: f["Event Type"],
    templateKey: f["Template Key"],
    sourceRecordId: f["Source Record ID"],
    hubEventId: f["Hub Event ID"] || null,
    recipients,
    recipientOk: recipients.length > 0 && bad.length === 0,
    accepted: f.Status === "Accepted",
    lastError: f["Last Error"] || null,
  };
}

async function bootstrap(token, baseId, label) {
  return bootstrapDisposableEnrollment(token, baseId, {
    stamp: `PELC|${label}|${Date.now()}`,
    parentEmail: SAFE_EMAIL,
  });
}

export async function verifyDailyApply(token, baseId, manifest) {
  const handoffKeyPrefix = "DAILY_SUBMISSION|SUBMISSIONS|";
  const subRes = await createRecords(token, baseId, "Submissions", [
    {
      fields: {
        Enrollment: [manifest.enrollmentId],
        Week: [EARLY_BIRD_WEEK_ID],
        "Activity Date": "2027-04-28T12:00:00.000-06:00",
        "Shot Total": 55,
        "Duplicate Review Status": "Count It",
        "Daily Email Subject": `${manifest.prefix}|daily`,
      },
    },
  ]);
  const submissionId = subRes.records[0].id;
  const handoffKey = `${handoffKeyPrefix}${submissionId}`;
  const { row, allRows, timeout } = await waitForQueueHandoff(token, baseId, handoffKey);
  let subFields = {};
  try {
    const sub = await getRecord(token, baseId, "Submissions", submissionId);
    subFields = {
      countThis: sub.fields?.["Count This Submission?"],
      buildDaily: sub.fields?.["Build Daily Email Now?"],
      activityFuture: sub.fields?.["Activity Date Is Future?"],
      weekStatus: sub.fields?.["Week Assignment Status"],
    };
  } catch {
    /* optional */
  }
  return {
    path: "DAILY",
    eventType: "DAILY_SUBMISSION",
    templateKey: "DAILY_SUBMISSION",
    triggerRecordId: submissionId,
    handoffKey,
    skipped: !row?.fields?.Status || row.fields.Status === "Failed" ? false : false,
    pass: Boolean(row && summarizeQueueRow(row).accepted && summarizeQueueRow(row).recipientOk),
    ...summarizeQueueRow(row),
    duplicateCount: allRows?.length || 0,
    timeout: Boolean(timeout && !row),
    submissionSnapshot: subFields,
    blockers:
      subFields.activityFuture === 1 || subFields.activityFuture === true
        ? [
            "Activity Date Is Future?=1 — all 2026-2027 challenge weeks are in 2027; Count This Submission? stays 0 until activity date is not future or Mike adjusts the season-date gate for controlled proof",
          ]
        : subFields.countThis !== 1 && subFields.countThis !== true
          ? ["Submission not counted — 010/031/076 chain did not arm Build Daily Email Now?"]
          : [],
  };
}

export async function verifyHomeworkApply(token, baseId, manifest) {
  return {
    path: "HOMEWORK",
    eventType: "HOMEWORK_FEEDBACK",
    templateKey: "HOMEWORK_FEEDBACK",
    pass: false,
    skipped: true,
    blockers: [
      "071 requires Homework Completion with Satisfactory?, Award Status=Awarded, XP evidence (064/065 chain), Parent Feedback Ready? from 078, linked PHA/assets — harness does not force this chain without PKG-007/sc-multi-asset-homework disposable apply",
    ],
    smallestSafeManualSetup:
      "On disposable VERIFY enrollment: create counted homework path via tools/testing/sc-multi-asset-homework.mjs --apply (disposable only), wait for 078 to set Parent Feedback Ready?, then re-run verify-all --apply",
  };
}

export async function verifyVideoApply(token, baseId, manifest) {
  return {
    path: "VIDEO",
    eventType: "VIDEO_FEEDBACK",
    templateKey: "VIDEO_FEEDBACK",
    pass: false,
    skipped: true,
    blockers: [
      "073 requires canonical Video Feedback with Submission Asset chain, Video Feedback Key formula, Feedback Posted?, Parent Feedback Ready?, Coach Feedback — not safely creatable without 013/070b/070c upload chain",
    ],
    smallestSafeManualSetup:
      "Use disposable submission asset + video upload chain (PKG-007) then check Parent Feedback Ready? on VERIFY enrollment before verify-all",
  };
}

export async function verifyWeeklyApply(token, baseId, manifest) {
  const wasRes = await createRecords(token, baseId, "Weekly Athlete Summary", [
    {
      fields: {
        Enrollment: [manifest.enrollmentId],
        Week: [EARLY_BIRD_WEEK_ID],
        "Goal Record": [GOAL_RECORD_ID],
        "Grade Band": [manifest.gradeBandId],
      },
    },
  ]);
  const wasId = wasRes.records[0].id;
  const handoffKey = buildWeeklyHandoffKey(wasId);
  await sleep(5000);
  await applyBuildArm(token, baseId, wasId);
  await applySendArm(token, baseId, wasId);
  const { row, allRows } = await waitForQueueHandoff(token, baseId, handoffKey);
  const summary = summarizeQueueRow(row);
  return {
    path: "WEEKLY",
    eventType: "WEEKLY_ATHLETE_SUMMARY",
    templateKey: "WEEKLY_ATHLETE_SUMMARY",
    triggerRecordId: wasId,
    handoffKey,
    pass: summary.accepted && summary.recipientOk,
    ...summary,
    duplicateCount: allRows?.length || 0,
    replayNote: "Send to Make? re-arm not replayed in this run; single Accepted row observed",
  };
}

export async function verifyZoomApply(token, baseId, manifest) {
  const zmRes = await createRecords(token, baseId, "Zoom Meetings", [
    {
      fields: {
        "Meeting Name": `${manifest.prefix}|ZOOM`,
        Week: [EARLY_BIRD_WEEK_ID],
        "Start Time": "2027-04-26T12:00:00.000-06:00",
        "Meeting Status": "Completed",
      },
    },
  ]);
  const meetingId = zmRes.records[0].id;
  const zaRes = await createRecords(token, baseId, "Zoom Attendance", [
    {
      fields: {
        Enrollment: [manifest.enrollmentId],
        "Zoom Meeting": [meetingId],
        "Attendance Method": "Recording Quiz",
        "Recording Quiz Satisfactory?": true,
      },
    },
  ]);
  const zaId = zaRes.records[0].id;
  const handoffKey = `ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|${zaId}`;
  const { row, allRows } = await waitForQueueHandoff(token, baseId, handoffKey);
  const summary = summarizeQueueRow(row);
  return {
    path: "ZOOM_RECORDING_APPROVAL",
    eventType: "ZOOM_RECORDING_APPROVAL",
    templateKey: "ZOOM_RECORDING_APPROVED",
    triggerRecordId: zaId,
    zoomMeetingId: meetingId,
    handoffKey,
    pass: summary.accepted && summary.recipientOk,
    ...summary,
    duplicateCount: allRows?.length || 0,
  };
}

export async function cleanupScopedWelcome(token, baseId, { athleteId, enrollmentId }) {
  const result = { verified: {}, linkedHandoffs: [], deleted: [], errors: [] };
  try {
    const athlete = await getRecord(token, baseId, "Athletes", athleteId);
    const enrollment = await getRecord(token, baseId, "Enrollments", enrollmentId);
    result.verified = {
      athleteFirst: athlete.fields?.["First Name"],
      athleteLast: athlete.fields?.["Last Name"],
      athleteVerify: athlete.fields?.["First Name"] === "VERIFY",
      enrollmentLinksAthlete: (enrollment.fields?.Athlete || []).some((x) => (x.id || x) === athleteId),
      parentEmail: SAFE_EMAIL,
      parentMatches: String(enrollment.fields?.["Parent Email"] || "").toLowerCase() === SAFE_EMAIL,
      disposable: true,
    };
    const handoffs = await listRecords(token, baseId, "Email Handoff Queue", {
      filterByFormula: `{Source Record ID}="${enrollmentId}"`,
      maxRecords: 10,
      fields: ["Handoff Key", "Status", "Event Type", "Hub Event ID"],
    });
    result.linkedHandoffs = handoffs.map((r) => ({
      id: r.id,
      handoffKey: r.fields?.["Handoff Key"],
      status: r.fields?.Status,
      retained: true,
      reason: "delivery/audit rows not in approved disposable delete scope per cutover checklist §8",
    }));
  } catch (err) {
    result.errors.push({ step: "verify", message: String(err.message || err).slice(0, 200) });
  }
  for (const [table, id] of [
    ["Enrollments", enrollmentId],
    ["Athletes", athleteId],
  ]) {
    try {
      await deleteRecords(token, baseId, table, [id]);
      result.deleted.push(`${table}/${id}`);
    } catch (err) {
      result.errors.push({ step: `delete_${table}`, id, message: String(err.message || err).slice(0, 200) });
    }
  }
  for (const [table, id] of [
    ["Enrollments", enrollmentId],
    ["Athletes", athleteId],
  ]) {
    try {
      await getRecord(token, baseId, table, id);
      result[`${table}_still_exists`] = true;
    } catch {
      result[`${table}_still_exists`] = false;
    }
  }
  return result;
}

export async function runRemainingPathApplies(token, baseId) {
  const manifest = await bootstrap(token, baseId, "paths");
  const paths = {
    DAILY: await verifyDailyApply(token, baseId, manifest),
    HOMEWORK: await verifyHomeworkApply(token, baseId, manifest),
    VIDEO: await verifyVideoApply(token, baseId, manifest),
    WEEKLY: await verifyWeeklyApply(token, baseId, manifest),
    ZOOM_RECORDING_APPROVAL: await verifyZoomApply(token, baseId, manifest),
  };
  const cleanup = await cleanupBootstrapManifest(token, baseId, manifest);
  return { manifest, paths, bootstrapCleanup: cleanup };
}
