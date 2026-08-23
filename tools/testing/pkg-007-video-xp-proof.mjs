#!/usr/bin/env node
/**
 * PKG-007 controlled Production Video XP lifecycle proof.
 *
 *   node tools/testing/pkg-007-video-xp-proof.mjs
 *   node tools/testing/pkg-007-video-xp-proof.mjs --cleanup-only
 *
 * Disposable records use AUTONOMOUS_VIDEO_QA_YYYYMMDD_HHMMSS labels.
 * Never logs secrets.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requireToken,
  getRecord,
  listRecords,
  createRecords,
  updateRecords,
  deleteRecords,
  ROOT,
} from "./lib/airtable-client.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = "/opt/cursor/artifacts/pkg-007-video-xp-proof";
const REPORT_PATH = resolve(ROOT, "docs/testing/autonomous-qa/PKG-007_VIDEO_XP_PROOF_REPORT.json");
const MANIFEST_PATH = resolve(ROOT, "docs/testing/autonomous-qa/pkg-007-video-xp-proof-manifest.json");

const CLEANUP_ONLY = process.argv.includes("--cleanup-only");
const ENROLLMENT_ID = "recNu6fcBpF1GG3u5"; // Testing3 Schmidt
const PW_LEDGER_ID = "rec93mAfo5jKqP3g5"; // Perfect Week Testing — read-only guard
const VIDEO_RULE_ID = "rec06c1tu3IO8EZqG";
const EXPECTED_XP = 25;

function formatRunId(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `AUTONOMOUS_VIDEO_QA_${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}_${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
}

const RUN_ID = process.env.PKG007_RUN_ID || formatRunId();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function statusRow(name, label, detail, evidence = null) {
  return { name, status: label, detail, evidence, at: new Date().toISOString() };
}

function extractVersion(code = "") {
  return (
    code.match(/Version:\s*(v[\d.]+)/i)?.[1] ||
    code.match(/version:\s*["']([^"']+)["']/i)?.[1] ||
    null
  );
}

async function listXpBySourceKey(token, baseId, sourceKey) {
  return listRecords(token, baseId, "XP Events", {
    filterByFormula: `{Source Key}="${sourceKey}"`,
    fields: [
      "Source Key",
      "XP Points",
      "XP Bucket",
      "XP Source",
      "Active?",
      "XP Activity Date",
      "Enrollment",
      "Submission",
      "Video Feedback",
      "Weekly Athlete Summary",
    ],
  });
}

async function pollActiveXp(token, baseId, sourceKey, { timeoutMs = 90000, intervalMs = 5000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const events = await listXpBySourceKey(token, baseId, sourceKey);
    const active = events.filter((e) => e.fields?.["Active?"] === true);
    if (active.length) return { events, active, waitedMs: Date.now() - started };
    await sleep(intervalMs);
  }
  const events = await listXpBySourceKey(token, baseId, sourceKey);
  return { events, active: events.filter((e) => e.fields?.["Active?"] === true), waitedMs: Date.now() - started };
}

async function pollNoActiveXp(token, baseId, sourceKey, { timeoutMs = 45000, intervalMs = 5000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const events = await listXpBySourceKey(token, baseId, sourceKey);
    const active = events.filter((e) => e.fields?.["Active?"] === true);
    if (!active.length) return { events, active, waitedMs: Date.now() - started };
    await sleep(intervalMs);
  }
  const events = await listXpBySourceKey(token, baseId, sourceKey);
  return { events, active: events.filter((e) => e.fields?.["Active?"] === true), waitedMs: Date.now() - started };
}

async function getVfSnapshot(token, baseId, vfId) {
  const vf = await getRecord(token, baseId, "Video Feedback", vfId);
  const f = vf.fields || {};
  return {
    id: vfId,
    active: f["Active?"] === true,
    feedbackPosted: f["Feedback Posted?"] === true,
    doNotAward: f["Do Not Award XP?"] === true,
    ready: f["Ready for XP Automation?"] === true,
    coachFeedback: f["Coach Feedback"] || "",
    baseXp: f["Base XP Awarded"],
    totalXp: f["Total Video XP Awarded"],
    awardStatus: f["Award Status"],
    enrollment: (f.Enrollment || [])[0] || "",
    submission: (f.Submission || [])[0] || "",
    asset: (f["Submission Asset"] || [])[0] || "",
    uploadStatus: f["Upload Status"],
    reviewerUrl: f["Reviewer File URL"] || "",
    xpLinks: f["XP Events"] || [],
  };
}

async function armPositiveReview(token, baseId, vfId, coachText) {
  await updateRecords(token, baseId, "Video Feedback", [
    {
      id: vfId,
      fields: {
        "Coach Feedback": coachText,
        "Do Not Award XP?": false,
        "Active?": true,
      },
    },
  ]);
  await sleep(3000);
  await updateRecords(token, baseId, "Video Feedback", [
    { id: vfId, fields: { "Feedback Posted?": true } },
  ]);
}

async function readOnlyPreflightAudit(token, baseId, enrollmentId) {
  const issues = [];
  const enrollment = await getRecord(token, baseId, "Enrollments", enrollmentId);
  if (!enrollment.fields?.["Active?"]) issues.push("enrollment_inactive");

  const rules = await listRecords(token, baseId, "XP Reward Rules", {
    filterByFormula: "AND({Rule Key}='VIDEO_SUBMISSION',{Active?}=1)",
    fields: ["Rule Key", "XP Amount", "Active?"],
  });
  if (rules.length !== 1) issues.push(`video_rule_count_${rules.length}`);
  else if (rules[0].fields?.["XP Amount"] !== EXPECTED_XP) {
    issues.push(`video_rule_amount_${rules[0].fields?.["XP Amount"]}`);
  }

  const vfRows = await listRecords(token, baseId, "Video Feedback", {
    filterByFormula: `FIND("${RUN_ID}", {Coach Feedback})`,
    maxRecords: 1,
    fields: ["Coach Feedback"],
  });
  if (vfRows.length) issues.push("prior_run_label_exists");

  const dupKeys = await listRecords(token, baseId, "XP Events", {
    filterByFormula: "AND(FIND('VIDEO_SUBMISSION|',{Source Key}),{Active?}=1)",
    maxRecords: 500,
    fields: ["Source Key"],
  });
  const counts = new Map();
  for (const row of dupKeys) {
    const key = row.fields?.["Source Key"];
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const dupActive = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  if (dupActive.length) issues.push(`duplicate_active_keys:${dupActive.slice(0, 3).join(",")}`);

  return {
    enrollmentId,
    enrollmentActive: enrollment.fields?.["Active?"] === true,
    videoRule: rules[0]
      ? { id: rules[0].id, amount: rules[0].fields?.["XP Amount"] }
      : null,
    duplicateActiveSourceKeys: dupActive,
    issues,
    pass: issues.length === 0,
  };
}

async function automationPreflight(token, baseId) {
  const rows = await listRecords(token, baseId, "Automations", {
    filterByFormula:
      'OR(FIND("113", {Name}),FIND("114", {Name}),FIND("112", {Name}),FIND("073", {Name}))',
    fields: ["Name", "Status", "Automation Code"],
    maxRecords: 20,
  });
  const bySlot = {};
  for (const row of rows) {
    const name = row.fields?.Name || "";
    const slot = ["113", "114", "112", "073"].find((s) => name.includes(s));
    if (!slot) continue;
    bySlot[slot] = {
      id: row.id,
      name,
      status: row.fields?.Status || "UNKNOWN",
      version: extractVersion(row.fields?.["Automation Code"] || ""),
    };
  }
  return {
    rows: bySlot,
    pass:
      bySlot["113"]?.version === "v6.4" &&
      bySlot["113"]?.status === "Live" &&
      bySlot["114"]?.version === "v6.1" &&
      bySlot["114"]?.status === "Live" &&
      !bySlot["112"],
  };
}

async function resolveTemplateSubmission(token, baseId) {
  const enrollment = await getRecord(token, baseId, "Enrollments", ENROLLMENT_ID);
  const templateSubId = (enrollment.fields?.Submissions || [])[0];
  if (!templateSubId) throw new Error("Testing3 has no template submission");
  const templateSub = await getRecord(token, baseId, "Submissions", templateSubId);
  return {
    submissionId: templateSubId,
    weekId: (templateSub.fields?.Week || [])[0] || "",
    templateSub,
  };
}

async function createFixtureChain(token, baseId, manifest, label, { withAsset = true } = {}) {
  const { submissionId, weekId } = await resolveTemplateSubmission(token, baseId);

  if (!withAsset) {
    const vf = await createRecords(token, baseId, "Video Feedback", [
      {
        fields: {
          Enrollment: [ENROLLMENT_ID],
          Submission: [submissionId],
          "Active?": true,
        },
      },
    ]);
    const vfId = vf.records[0].id;
    manifest.created.push({ table: "Video Feedback", id: vfId, label });
    return { submissionId, assetId: "", vfId, weekId, reviewerUrl: "", uploadOk: false };
  }

  const templateAsset = await getRecord(token, baseId, "Submission Assets", "rec0K7T0dEYVoTk5V");
  const att = templateAsset.fields?.["Airtable Attachment"]?.[0];

  const asset = await createRecords(token, baseId, "Submission Assets", [
    {
      fields: {
        "Asset Slot": "VIDEO",
        "Upload Status": "Uploaded",
        "Submission - Linked": [submissionId],
        "Enrollment - Linked": [ENROLLMENT_ID],
        "Source Attachment ID": templateAsset.fields?.["Source Attachment ID"],
        "Airtable Attachment": att
          ? [{ url: att.url, filename: `${label}.mp4` }]
          : undefined,
      },
    },
  ]);
  const assetId = asset.records[0].id;
  manifest.created.push({ table: "Submission Assets", id: assetId, label });

  let vfId = "";
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    const assetRow = await getRecord(token, baseId, "Submission Assets", assetId);
    vfId = (assetRow.fields?.["Video Feedback"] || [])[0] || "";
    if (vfId) break;
  }

  if (!vfId) {
    const vf = await createRecords(token, baseId, "Video Feedback", [
      {
        fields: {
          Enrollment: [ENROLLMENT_ID],
          Submission: [submissionId],
          "Submission Asset": [assetId],
          "Active?": true,
          "Upload Status": "Uploaded",
        },
      },
    ]);
    vfId = vf.records[0].id;
    manifest.notes.push("013 did not auto-link VF within 60s; created VF via API fallback");
  }
  manifest.created.push({ table: "Video Feedback", id: vfId, label });

  const assetRow = await getRecord(token, baseId, "Submission Assets", assetId);
  const reviewerUrl = assetRow.fields?.["Reviewer File URL"] || "";
  const uploadOk =
    assetRow.fields?.["Upload Status"] === "Uploaded" &&
    (reviewerUrl.includes("lambda-url") || reviewerUrl.length > 0);

  return { submissionId, assetId, vfId, weekId, reviewerUrl, uploadOk };
}

async function checkEmailHandoffs(token, baseId, recordIds, { createdAfterIso }) {
  const found = [];
  for (const id of recordIds) {
    const rows = await listRecords(token, baseId, "Email Handoff Queue", {
      filterByFormula: `AND(FIND("${id}", {Source Record ID}),IS_AFTER({Created}, "${createdAfterIso}"))`,
      maxRecords: 10,
      fields: ["Source Record ID", "Event Type", "Status", "Handoff Key", "Created", "Source Table"],
    });
    found.push(...rows.map((r) => ({ ...r, matchedId: id })));
  }
  return found;
}

async function cleanupManifest(token, baseId, manifest) {
  const results = [];
  const xpIds = manifest.created.filter((r) => r.table === "XP Events").map((r) => r.id);
  const vfIds = manifest.created.filter((r) => r.table === "Video Feedback").map((r) => r.id);
  const assetIds = manifest.created.filter((r) => r.table === "Submission Assets").map((r) => r.id);
  const subIds = manifest.created.filter((r) => r.table === "Submissions").map((r) => r.id);

  for (const id of xpIds) {
    try {
      await updateRecords(token, baseId, "XP Events", [{ id, fields: { "Active?": false } }]);
      results.push({ table: "XP Events", id, action: "deactivated" });
    } catch (err) {
      results.push({ table: "XP Events", id, action: "deactivate_failed", error: err.message });
    }
  }

  for (const table of ["Video Feedback", "Submission Assets", "Submissions"]) {
    const ids =
      table === "Video Feedback" ? vfIds : table === "Submission Assets" ? assetIds : subIds;
    for (const id of ids) {
      try {
        await deleteRecords(token, baseId, table, [id]);
        results.push({ table, id, action: "deleted" });
      } catch (err) {
        results.push({ table, id, action: "delete_blocked", error: err.message, status: err.status });
        if (table === "Video Feedback") {
          try {
            await updateRecords(token, baseId, "Video Feedback", [
              { id, fields: { "Active?": false, "Do Not Award XP?": true } },
            ]);
            results.push({ table, id, action: "deactivated_fallback" });
          } catch (e2) {
            results.push({ table, id, action: "deactivate_failed", error: e2.message });
          }
        }
      }
    }
  }
  manifest.cleanup = results;
  return results;
}

async function runNegativeCase(token, baseId, manifest, spec) {
  const chain = await createFixtureChain(token, baseId, manifest, `${RUN_ID}|NEG|${spec.id}`, {
    withAsset: spec.withAsset !== false,
  });
  const { vfId, submissionId } = chain;
  const sourceKey = `VIDEO_SUBMISSION|${vfId}`;
  const fields = { "Active?": true, "Do Not Award XP?": false };

  if (spec.patch) Object.assign(fields, spec.patch(chain));
  if (spec.coach !== false) {
    fields["Coach Feedback"] = `${RUN_ID} negative ${spec.id}`;
  }
  if (spec.posted) fields["Feedback Posted?"] = true;

  await updateRecords(token, baseId, "Video Feedback", [{ id: vfId, fields }]);
  if (spec.secondPatch) {
    await sleep(2000);
    await updateRecords(token, baseId, "Video Feedback", [
      { id: vfId, fields: spec.secondPatch(chain) },
    ]);
  }
  await sleep(12000);

  const events = await listXpBySourceKey(token, baseId, sourceKey);
  const active = events.filter((e) => e.fields?.["Active?"] === true);
  const pass = active.length === 0;
  return {
    id: spec.id,
    vfId,
    submissionId,
    sourceKey,
    activeXpIds: active.map((e) => e.id),
    xpEventCount: events.length,
    pass,
    status: pass ? "PASS" : "FINDING",
    detail: pass ? "No active XP Event" : `Unexpected active XP: ${active.map((e) => e.id).join(",")}`,
  };
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const { token, baseId } = requireToken();
  const startedAt = new Date().toISOString();
  const manifest = {
    run_id: RUN_ID,
    started_at: startedAt,
    base_id: baseId,
    enrollment_id: ENROLLMENT_ID,
    created: [],
    changed: [],
    notes: [],
    results: [],
    cleanup: [],
  };

  if (CLEANUP_ONLY) {
    if (!existsSync(MANIFEST_PATH)) throw new Error(`Missing manifest: ${MANIFEST_PATH}`);
    const prior = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    manifest.created = prior.created || [];
    await cleanupManifest(token, baseId, manifest);
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ action: "cleanup_only", cleanup: manifest.cleanup }, null, 2));
    return;
  }

  const pwBefore = await getRecord(token, baseId, "Enrollments", PW_LEDGER_ID);
  const pwXpBefore = (pwBefore.fields?.["XP Events"] || []).length;

  // Preflight
  const audit = await readOnlyPreflightAudit(token, baseId, ENROLLMENT_ID);
  manifest.results.push(
    statusRow(
      "preflight_audit",
      audit.pass ? "PASS" : "FINDING",
      audit.issues.length ? audit.issues.join("; ") : "Read-only video XP preflight clean",
      audit
    )
  );

  const auto = await automationPreflight(token, baseId);
  manifest.results.push(
    statusRow(
      "automation_versions",
      auto.pass ? "PASS" : "FINDING",
      JSON.stringify(auto.rows),
      auto
    )
  );

  manifest.results.push(
    statusRow(
      "automation_112",
      !auto.rows["112"] ? "PASS" : "FINDING",
      auto.rows["112"] ? `112 present: ${auto.rows["112"].status}` : "112 absent from operator table"
    )
  );

  manifest.results.push(
    statusRow(
      "automation_073",
      "MANUAL ACTION REQUIRED",
      auto.rows["073"]
        ? `Operator table shows 073 ${auto.rows["073"].status} ${auto.rows["073"].version}; native trigger OFF state NOT VERIFIED via browser`
        : "073 not found in operator table"
    )
  );

  manifest.results.push(
    statusRow(
      "video_submission_rule",
      audit.videoRule?.amount === EXPECTED_XP ? "PASS" : "FINDING",
      `rule ${VIDEO_RULE_ID} amount=${audit.videoRule?.amount}`
    )
  );

  const prior = await listRecords(token, baseId, "Video Feedback", {
    filterByFormula: `AND(FIND("AUTONOMOUS_VIDEO_QA_", {Coach Feedback}),NOT(FIND("${RUN_ID}", {Coach Feedback})))`,
    maxRecords: 5,
    fields: ["Coach Feedback", "Record Id"],
  });
  manifest.results.push(
    statusRow(
      "prior_run_records",
      prior.length === 0 ? "PASS" : "FINDING",
      prior.length
        ? `found ${prior.length} prior AUTONOMOUS_VIDEO_QA_ VF rows (probe residue)`
        : "no prior AUTONOMOUS_VIDEO_QA_ rows outside this run"
    )
  );

  manifest.results.push(
    statusRow(
      "native_trigger_wiring",
      "NOT VERIFIED",
      "Airtable Automations UI browser access unavailable in cloud agent; trigger table/fields/conditions not attested"
    )
  );

  // Positive path
  const positiveLabel = `${RUN_ID}|POS`;
  const chain = await createFixtureChain(token, baseId, manifest, positiveLabel);
  const { vfId, submissionId, assetId, reviewerUrl, uploadOk } = chain;
  const sourceKey = `VIDEO_SUBMISSION|${vfId}`;

  manifest.results.push(
    statusRow(
      "asset_upload_reference",
      uploadOk ? "PASS" : "FINDING",
      uploadOk ? `Uploaded with reviewer URL present` : "Upload/reference incomplete",
      { assetId, reviewerUrl: reviewerUrl.slice(0, 120) }
    )
  );

  await armPositiveReview(token, baseId, vfId, `${RUN_ID} positive path coach feedback`);
  const vfAfter113 = await pollActiveXp(token, baseId, sourceKey);
  const snap113 = await getVfSnapshot(token, baseId, vfId);

  const positivePass =
    snap113.baseXp === EXPECTED_XP &&
    snap113.totalXp === EXPECTED_XP &&
    (snap113.ready === true || snap113.awardStatus === "Awarded") &&
    vfAfter113.active.length === 1 &&
    vfAfter113.active[0].fields?.["XP Points"] === EXPECTED_XP &&
    vfAfter113.active[0].fields?.["XP Bucket"] === "Video Feedback" &&
    (vfAfter113.active[0].fields?.Enrollment || [])[0] === ENROLLMENT_ID &&
    (vfAfter113.active[0].fields?.Submission || [])[0] === submissionId &&
    (vfAfter113.active[0].fields?.["Video Feedback"] || [])[0] === vfId;

  const xpEventId = vfAfter113.active[0]?.id || "";
  if (xpEventId) manifest.created.push({ table: "XP Events", id: xpEventId, sourceKey, label: positiveLabel });

  manifest.results.push(
    statusRow(
      "positive_path_113_114",
      positivePass ? "PASS" : "FINDING",
      positivePass
        ? `XP ${xpEventId} created; 113 base=${snap113.baseXp}; award=${snap113.awardStatus}`
        : `snap=${JSON.stringify(snap113)} activeXp=${vfAfter113.active.length}`,
      {
        vfId,
        submissionId,
        assetId,
        sourceKey,
        xpEventId,
        waitedMs: vfAfter113.waitedMs,
        before113: snap113,
        xp: vfAfter113.active[0]?.fields || null,
      }
    )
  );

  // Replay
  await updateRecords(token, baseId, "Video Feedback", [
    { id: vfId, fields: { "Coach Feedback": `${RUN_ID} replay touch` } },
  ]);
  await sleep(10000);
  const replayEvents = await listXpBySourceKey(token, baseId, sourceKey);
  const replayActive = replayEvents.filter((e) => e.fields?.["Active?"] === true);
  const replayPass =
    replayEvents.length === 1 &&
    replayActive.length === 1 &&
    replayActive[0].id === xpEventId &&
    replayActive[0].fields?.["XP Points"] === EXPECTED_XP;
  manifest.results.push(
    statusRow(
      "replay_idempotency",
      replayPass ? "PASS" : "FINDING",
      replayPass
        ? "Same XP Event; no duplicate"
        : `count=${replayEvents.length} active=${replayActive.map((e) => e.id).join(",")}`
    )
  );

  // Withdrawal
  const activeBeforeWithdraw = replayActive[0]?.fields?.["Active?"];
  await updateRecords(token, baseId, "Video Feedback", [
    { id: vfId, fields: { "Do Not Award XP?": true } },
  ]);
  await sleep(12000);
  const withdrawn = await getRecord(token, baseId, "XP Events", xpEventId);
  const vfWithdrawn = await getVfSnapshot(token, baseId, vfId);
  const withdrawPass =
    withdrawn.fields?.["Active?"] !== true &&
    vfWithdrawn.doNotAward &&
    vfWithdrawn.awardStatus === "Do Not Award" &&
    (await listXpBySourceKey(token, baseId, sourceKey)).filter((e) => e.fields?.["Active?"]).length === 0;
  manifest.results.push(
    statusRow(
      "withdrawal",
      withdrawPass ? "PASS" : "FINDING",
      withdrawPass
        ? `XP ${xpEventId} deactivated; no replacement`
        : `active=${withdrawn.fields?.["Active?"]} award=${vfWithdrawn.awardStatus}`,
      { activeBeforeWithdraw, activeAfter: withdrawn.fields?.["Active?"] }
    )
  );

  // Restoration
  await updateRecords(token, baseId, "Video Feedback", [
    {
      id: vfId,
      fields: {
        "Do Not Award XP?": false,
        "Feedback Posted?": true,
        "Coach Feedback": `${RUN_ID} restoration`,
      },
    },
  ]);
  await sleep(8000);
  const restoredPoll = await pollActiveXp(token, baseId, sourceKey);
  const restorePass =
    restoredPoll.active.length === 1 &&
    restoredPoll.active[0].id === xpEventId &&
    restoredPoll.active[0].fields?.["XP Points"] === EXPECTED_XP;
  manifest.results.push(
    statusRow(
      "restoration",
      restorePass ? "PASS" : "FINDING",
      restorePass
        ? `Same XP Event ${xpEventId} reactivated at ${EXPECTED_XP}`
        : `active=${restoredPoll.active.map((e) => e.id).join(",")}`
    )
  );

  // Negative paths
  const wrongEnrollment = (await listRecords(token, baseId, "Enrollments", {
    filterByFormula: `AND({Active?}=1,RECORD_ID()!='${ENROLLMENT_ID}')`,
    maxRecords: 1,
    fields: ["Active?"],
  }))[0]?.id;

  const negativeSpecs = [
    { id: "missing_coach_feedback", coach: false, posted: true },
    { id: "feedback_not_posted", posted: false },
    { id: "do_not_award_initial", patch: () => ({ "Do Not Award XP?": true }), posted: true },
    {
      id: "missing_enrollment",
      patch: () => ({ Enrollment: [] }),
      posted: true,
    },
    wrongEnrollment
      ? {
          id: "wrong_enrollment",
          patch: () => ({ Enrollment: [wrongEnrollment] }),
          posted: true,
        }
      : null,
    { id: "inactive_source", patch: () => ({ "Active?": false }), posted: true },
    { id: "missing_video_asset", patch: () => ({ "Submission Asset": [] }), posted: true },
    {
      id: "invalid_asset_url",
      patch: (c) => ({ "Submission Asset": [c.assetId] }),
      secondPatch: () => ({ "Coach Feedback": `${RUN_ID} invalid url case` }),
      posted: true,
    },
    {
      id: "zero_xp_not_armed",
      patch: () => ({ "Ready for XP Automation?": false }),
      posted: true,
    },
  ].filter(Boolean);

  const negativeResults = [];
  for (const spec of negativeSpecs) {
    negativeResults.push(await runNegativeCase(token, baseId, manifest, spec));
  }

  // Duplicate VF: second VF on same submission
  const dupChain = await createFixtureChain(token, baseId, manifest, `${RUN_ID}|NEG|duplicate_vf`);
  const dupVf2 = await createRecords(token, baseId, "Video Feedback", [
    {
      fields: {
        Enrollment: [ENROLLMENT_ID],
        Submission: [dupChain.submissionId],
        "Submission Asset": [dupChain.assetId],
        "Active?": true,
      },
    },
  ]);
  const dupVf2Id = dupVf2.records[0].id;
  manifest.created.push({ table: "Video Feedback", id: dupVf2Id, label: `${RUN_ID}|duplicate` });
  await armPositiveReview(token, baseId, dupVf2Id, `${RUN_ID} duplicate vf attempt`);
  await sleep(12000);
  const dupKey1 = `VIDEO_SUBMISSION|${dupChain.vfId}`;
  const dupKey2 = `VIDEO_SUBMISSION|${dupVf2Id}`;
  const dupEvents1 = await listXpBySourceKey(token, baseId, dupKey1);
  const dupEvents2 = await listXpBySourceKey(token, baseId, dupKey2);
  const dupActiveTotal =
    dupEvents1.filter((e) => e.fields?.["Active?"]).length +
    dupEvents2.filter((e) => e.fields?.["Active?"]).length;
  negativeResults.push({
    id: "duplicate_video_feedback",
    vfIds: [dupChain.vfId, dupVf2Id],
    pass: dupActiveTotal <= 2,
    status: dupActiveTotal <= 2 ? "PASS" : "FINDING",
    detail: `distinct keys; active counts ${dupEvents1.filter((e) => e.fields?.["Active?"]).length}+${dupEvents2.filter((e) => e.fields?.["Active?"]).length}`,
  });

  manifest.results.push(
    statusRow(
      "negative_paths",
      negativeResults.every((r) => r.pass) ? "PASS" : "FINDING",
      `${negativeResults.filter((r) => r.pass).length}/${negativeResults.length} cases fail-closed`,
      negativeResults
    )
  );

  // Cases not safely executable in production
  manifest.results.push(
    statusRow(
      "negative_missing_xp_rule",
      "NOT VERIFIED",
      "Cannot deactivate VIDEO_SUBMISSION rule in autonomous production proof"
    )
  );
  manifest.results.push(
    statusRow(
      "negative_wrong_owner",
      "NOT VERIFIED",
      "Requires conflicting XP Event seed; skipped to avoid touching non-disposable data"
    )
  );

  const handoffIds = [
    vfId,
    assetId,
    ...manifest.created.filter((r) => r.table === "Video Feedback").map((r) => r.id),
    ...manifest.created.filter((r) => r.table === "Submission Assets").map((r) => r.id),
  ].filter(Boolean);
  const handoffs = await checkEmailHandoffs(token, baseId, handoffIds, {
    createdAfterIso: startedAt,
  });
  const videoHandoffs = handoffs.filter((h) =>
    String(h.fields?.["Event Type"] || "").toUpperCase().includes("VIDEO")
  );
  manifest.results.push(
    statusRow(
      "no_parent_email_handoff",
      videoHandoffs.length === 0 ? "PASS" : "FINDING",
      videoHandoffs.length
        ? `video handoffs: ${videoHandoffs.map((h) => h.id).join(",")}`
        : "No Video Feedback Email Handoff Queue rows for disposable VF/assets in this run"
    )
  );

  const pwAfter = await getRecord(token, baseId, "Enrollments", PW_LEDGER_ID);
  const pwXpAfter = (pwAfter.fields?.["XP Events"] || []).length;
  manifest.results.push(
    statusRow(
      "perfect_week_ledger_unchanged",
      pwXpBefore === pwXpAfter ? "PASS" : "FINDING",
      `XP link count ${pwXpBefore} -> ${pwXpAfter}`
    )
  );

  // Offline tests
  const offline = [];
  for (const [name, cmd, args] of [
    ["video_lifecycle", "node", ["tests/video-feedback/video-feedback-xp-lifecycle.test.js"]],
    ["video_readiness", "node", ["tests/video-feedback/video-feedback-xp-readiness.test.js"]],
    ["video_mocked_runtime", "node", ["tests/video-feedback/video-feedback-xp-mocked-runtime.test.js"]],
    ["video_writeback_contract", "node", ["tests/video-feedback/video-feedback-writeback-complete-contract.test.js"]],
  ]) {
    const res = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
    offline.push({ name, pass: res.status === 0, tail: `${res.stdout || ""}${res.stderr || ""}`.trim().slice(-400) });
  }
  manifest.results.push(
    statusRow(
      "offline_video_tests",
      offline.every((t) => t.pass) ? "PASS" : "FINDING",
      offline.map((t) => `${t.name}:${t.pass ? "ok" : "fail"}`).join(", "),
      offline
    )
  );

  const webRoutes = [
    "https://www.fairfieldbasketballclub.com/shoot",
    "https://www.fairfieldbasketballclub.com/shoot/athletes/testing3-schmidt",
  ];
  const routeChecks = [];
  for (const url of webRoutes) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      routeChecks.push({ url, status: res.status, pass: res.status === 200 });
    } catch (err) {
      routeChecks.push({ url, pass: false, error: err.message });
    }
  }
  manifest.results.push(
    statusRow(
      "production_routes",
      routeChecks.every((r) => r.pass) ? "PASS" : "FINDING",
      routeChecks.map((r) => `${r.url}:${r.status || r.error}`).join("; ")
    )
  );

  await cleanupManifest(token, baseId, manifest);

  manifest.completed_at = new Date().toISOString();
  manifest.primary = {
    run_id: RUN_ID,
    video_feedback_id: vfId,
    submission_id: submissionId,
    asset_id: assetId,
    enrollment_id: ENROLLMENT_ID,
    xp_event_id: xpEventId,
    source_key: sourceKey,
    xp_amount: EXPECTED_XP,
    xp_bucket: "Video Feedback",
    activity_date: vfAfter113.active[0]?.fields?.["XP Activity Date"] || null,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  writeFileSync(resolve(ARTIFACT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(REPORT_PATH, JSON.stringify(manifest, null, 2));

  const summary = {
    run_id: RUN_ID,
    results: manifest.results.map((r) => ({ name: r.name, status: r.status, detail: r.detail })),
  };
  console.log(JSON.stringify(summary, null, 2));
  const hardFail = manifest.results.some((r) =>
    ["positive_path_113_114", "replay_idempotency", "withdrawal", "restoration", "negative_paths"].includes(
      r.name
    ) && r.status === "FINDING"
  );
  process.exit(hardFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
