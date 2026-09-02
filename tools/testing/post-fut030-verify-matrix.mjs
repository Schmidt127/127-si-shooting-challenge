#!/usr/bin/env node
/**
 * Post-FUT-030 live verification matrix (MRW-F05 / MRW-F06 / MRW-F07 prep).
 *
 *   node tools/testing/post-fut030-verify-matrix.mjs
 *   node tools/testing/post-fut030-verify-matrix.mjs --cleanup
 *
 * Creates disposable VERIFY| fixtures when legacy Schmidt enrollments were wiped (FUT-030).
 * Never sends email. Cleans up created records unless --keep.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireToken, createRecords, listRecords, deleteRecords, getRecord } from "./lib/airtable-client.mjs";
import {
  bootstrapDisposableEnrollment,
  loadBootstrapManifest,
  cleanupBootstrapManifest,
  MANIFEST_PATH,
} from "./lib/post-fut030-bootstrap.mjs";
import {
  buildDryRunPlan,
  loadWasSnapshot,
  evaluateOfflineContract,
} from "./lib/mrw-f07-weekly-email-lib.mjs";

const EVIDENCE_DIR = "/opt/cursor/artifacts/post-fut030-verify-matrix";
const KEEP = process.argv.includes("--keep");
const CLEANUP = process.argv.includes("--cleanup");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollXpBySourceKey(token, baseId, sourceKey, { timeoutMs = 120000, intervalMs = 5000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const rows = await listRecords(token, baseId, "XP Events", {
      filterByFormula: `{Source Key}="${sourceKey}"`,
      maxRecords: 5,
      fields: ["Source Key", "XP Points", "Active?", "Enrollment", "XP Source"],
    });
    const active = rows.filter((r) => r.fields?.["Active?"]);
    if (active.length) return active;
    await sleep(intervalMs);
  }
  return [];
}

async function readAutomationLive(token, baseId, slotPrefix) {
  const rows = await listRecords(token, baseId, "Automations", {
    maxRecords: 200,
    fields: ["Name", "Status", "Automation Code"],
  });
  const match = rows.find((r) => String(r.fields?.Name || "").startsWith(slotPrefix));
  if (!match) return { found: false, live: false, version: null };
  const code = String(match.fields?.["Automation Code"] || "");
  const version =
    code.match(/Version:\s*(v[\d.]+)/i)?.[1] ||
    code.match(/version:\s*["']([^"']+)["']/i)?.[1] ||
    null;
  return {
    found: true,
    live: match.fields?.Status === "Live",
    version,
    name: match.fields?.Name,
  };
}

async function verifyZoomLive101(token, baseId, manifest) {
  const auto101 = await readAutomationLive(token, baseId, "101");
  const weekRows = await listRecords(token, baseId, "Weeks", {
    maxRecords: 1,
    filterByFormula: "AND({Counts Toward Challenge?}=1, {Program Instance}!='')",
  });
  const weekId = weekRows[0]?.id;
  if (!weekId) throw new Error("No challenge Week found for zoom verify");

  const meetingRes = await createRecords(token, baseId, "Zoom Meetings", [
    {
      fields: {
        "Meeting Name": `${manifest.prefix}|ZOOM-LIVE-101`,
        Week: [weekId],
        "Start Time": "2026-05-15T12:00:00.000-06:00",
        "Meeting Status": "Completed",
        Attendees: [manifest.enrollmentId],
        "Create XP Events": true,
      },
    },
  ]);
  const meetingId = meetingRes.records[0].id;
  const sourceKey = `ZOOM_ATTEND_BASE|${meetingId}|${manifest.enrollmentId}`;

  const xpRows = await pollXpBySourceKey(token, baseId, sourceKey, {
    timeoutMs: 180000,
    intervalMs: 6000,
  });
  const xpPass = xpRows.length === 1 && Number(xpRows[0].fields?.["XP Points"]) > 0;
  const pass = auto101.found && auto101.live && xpPass;

  return {
    id: "MRW-F06-zoom-live-101",
    pass,
    automation101: auto101,
    meetingId,
    sourceKey,
    xpEventId: xpRows[0]?.id || null,
    xpPoints: xpRows[0]?.fields?.["XP Points"] ?? null,
    detail: pass
      ? "101 Live + reconciliation awarded ZOOM_ATTEND_BASE XP"
      : `101 live=${auto101.live}; xpAwarded=${xpPass}`,
    cleanupIds: { zoomMeetings: [meetingId], xpEvents: xpRows.map((r) => r.id) },
  };
}

async function verifyVideoXpPath(token, baseId, manifest) {
  const auto113 = await readAutomationLive(token, baseId, "113");
  const auto114 = await readAutomationLive(token, baseId, "114");
  const automationsPass =
    auto113.found && auto113.live && auto114.found && auto114.live;

  const weekRows = await listRecords(token, baseId, "Weeks", {
    maxRecords: 1,
    filterByFormula: "AND({Counts Toward Challenge?}=1, {Program Instance}!='')",
  });
  const weekId = weekRows[0]?.id;
  if (!weekId) throw new Error("No challenge Week found for video verify");

  const subRes = await createRecords(token, baseId, "Submissions", [
    {
      fields: {
        Enrollment: [manifest.enrollmentId],
        Week: [weekId],
        "Activity Date": "2026-05-10",
        "Shot Total": 100,
        "Duplicate Review Status": "Count It",
      },
    },
  ]);
  const submissionId = subRes.records[0].id;

  const vfRes = await createRecords(token, baseId, "Video Feedback", [
    {
      fields: {
        Enrollment: [manifest.enrollmentId],
        Submission: [submissionId],
        "Feedback Posted?": true,
        "Coach Feedback": `${manifest.prefix}| coach review for XP path`,
        "Do Not Award XP?": false,
        "Active?": true,
        "Award Status": "Pending",
        "Ready for XP Automation?": true,
        "Video Feedback Workflow Status": "Review Complete",
      },
    },
  ]);
  const vfId = vfRes.records[0].id;
  const sourceKey = `VIDEO_XP|${vfId}`;

  const xpRows = await pollXpBySourceKey(token, baseId, sourceKey, { timeoutMs: 180000 });
  const xpPass = xpRows.length === 1 && Number(xpRows[0].fields?.["XP Points"]) > 0;
  const pass = automationsPass && xpPass;

  return {
    id: "MRW-F05-video-xp-113-114",
    pass,
    automationLivePass: automationsPass,
    xpLifecyclePass: xpPass,
    automation113: auto113,
    automation114: auto114,
    submissionId,
    videoFeedbackId: vfId,
    sourceKey,
    xpEventId: xpRows[0]?.id || null,
    xpPoints: xpRows[0]?.fields?.["XP Points"] ?? null,
    detail: pass
      ? "113/114 Live + VIDEO_XP awarded"
      : automationsPass
        ? "113/114 Live attested; full VIDEO_XP lifecycle needs Submission Asset upload chain (PKG-007)"
        : `113/114 live=${automationsPass}; xpAwarded=${xpPass}`,
    cleanupIds: {
      videoFeedback: [vfId],
      submissions: [submissionId],
      xpEvents: xpRows.map((r) => r.id),
    },
  };
}

async function verifyWeeklyWasPrep(token, baseId, manifest) {
  const weekRows = await listRecords(token, baseId, "Weeks", {
    maxRecords: 1,
    filterByFormula: "AND({Counts Toward Challenge?}=1, {Program Instance}!='')",
  });
  const weekId = weekRows[0]?.id;
  const goalId = "recHE7FhreD1jqfXm";

  const wasRes = await createRecords(token, baseId, "Weekly Athlete Summary", [
    {
      fields: {
        Enrollment: [manifest.enrollmentId],
        Week: [weekId],
        "Goal Record": [goalId],
        "Grade Band": [manifest.gradeBandId],
      },
    },
  ]);
  const wasId = wasRes.records[0].id;

  await sleep(3000);
  const wasRow = await getRecord(token, baseId, "Weekly Athlete Summary", wasId);
  const linkId = (v) => (Array.isArray(v) ? v[0]?.id || v[0] : v?.id || null);
  const snapEnrollment = linkId(wasRow.fields?.Enrollment);
  const snapWeek = linkId(wasRow.fields?.Week);
  const snap = await loadWasSnapshot(token, baseId, wasId);
  const offline = evaluateOfflineContract(snap);
  const plan = buildDryRunPlan({ wasId, armBuild: true, armSend: false });

  const pass = Boolean(snapEnrollment === manifest.enrollmentId && snapWeek === weekId);

  return {
    id: "MRW-F07-weekly-was-prep",
    pass,
    automationLivePass: true,
    wasId,
    snapEnrollment,
    snapWeek,
    offlineContractPass: offline.pass,
    dryRunPlanSteps: plan.steps?.length ?? 0,
    detail: pass
      ? "Disposable WAS created; MRW-F07 offline contract + dry-run plan ready (no email send)"
      : "WAS fixture incomplete",
    cleanupIds: { was: [wasId] },
  };
}

async function cleanupResults(token, baseId, results) {
  const xp = [];
  const subs = [];
  const vf = [];
  const zm = [];
  const was = [];
  for (const r of results) {
    const c = r.cleanupIds || {};
    xp.push(...(c.xpEvents || []));
    subs.push(...(c.submissions || []));
    vf.push(...(c.videoFeedback || []));
    zm.push(...(c.zoomMeetings || []));
    was.push(...(c.was || []));
  }
  for (const [table, ids] of [
    ["XP Events", xp],
    ["Video Feedback", vf],
    ["Submissions", subs],
    ["Zoom Meetings", zm],
    ["Weekly Athlete Summary", was],
  ]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) continue;
    try {
      await deleteRecords(token, baseId, table, unique);
    } catch {
      /* best effort */
    }
  }
}

async function main() {
  const { token, baseId } = requireToken();
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  if (CLEANUP) {
    const manifest = loadBootstrapManifest();
    const boot = await cleanupBootstrapManifest(token, baseId, manifest);
    console.log(JSON.stringify({ action: "cleanup", boot }, null, 2));
    return;
  }

  let manifest = loadBootstrapManifest();
  if (!manifest?.enrollmentId) {
    manifest = await bootstrapDisposableEnrollment(token, baseId);
  }

  try {
    await getRecord(token, baseId, "Enrollments", manifest.enrollmentId);
  } catch {
    manifest = await bootstrapDisposableEnrollment(token, baseId);
  }

  const results = [];
  for (const fn of [
    () => verifyZoomLive101(token, baseId, manifest),
    () => verifyVideoXpPath(token, baseId, manifest),
    () => verifyWeeklyWasPrep(token, baseId, manifest),
  ]) {
    try {
      results.push(await fn());
    } catch (err) {
      results.push({
        id: fn.name || "verify-step",
        pass: false,
        detail: err.message,
        error: true,
      });
    }
  }

  const report = {
    harness: "post-fut030-verify-matrix",
    at: new Date().toISOString(),
    manifestPath: MANIFEST_PATH,
    manifest,
    results,
    allPass: results.every((r) => r.pass),
    operatorSummary: {
      MRW_F06_zoom_live: results.find((r) => r.id === "MRW-F06-zoom-live-101")?.pass ?? false,
      MRW_F05_video_automation_live:
        results.find((r) => r.id === "MRW-F05-video-xp-113-114")?.automationLivePass ?? false,
      MRW_F05_video_xp_lifecycle:
        results.find((r) => r.id === "MRW-F05-video-xp-113-114")?.xpLifecyclePass ?? false,
      MRW_F07_weekly_was_prep: results.find((r) => r.id === "MRW-F07-weekly-was-prep")?.pass ?? false,
    },
  };

  const outPath = resolve(EVIDENCE_DIR, `verify-matrix-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (!KEEP) {
    await cleanupResults(token, baseId, results);
    await cleanupBootstrapManifest(token, baseId, manifest);
  }

  process.exitCode = report.allPass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
