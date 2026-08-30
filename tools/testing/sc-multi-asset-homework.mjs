/**
 * SC-MULTI-ASSET-HW — live disposable validation:
 * Multiple Submission Assets (same homework slot) → one Homework Completion
 * → satisfactory grading → one HOMEWORK_XP|{hcId} via real Automation 020/064/065.
 *
 * Never sends email. Never restores 075. Never repastes 010/020/022/057/065/072/073.
 * Never runs season simulation. Clears Send to Make Trigger after 020 links.
 */
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
import {
  GATED_ENROLLMENT_ID,
  GATED_ATHLETE_ID,
  denverNoon,
  homeworkXpKey,
  sleep,
} from "./lib/sc-athlete-wf-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS = "SC-MULTI-ASSET-HW";
const PREFIX = "COREWF|MULTI|";
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/sc-multi-asset-homework");
const MANIFEST_PATH = resolve(ROOT, "docs/testing/core-workflow/fixtures/_sc-multi-asset-hw-last.json");

const LIVE = Object.freeze({
  earlyBirdWeek: "recBrZ1sV8byWEHZU",
  earlyBirdHw1: "recgj8dPk4ouTwCOj",
  earlyBirdHw2: "recXXZErbjxxGxWw2",
  libraryHw1: "rechVLOeyEVIqmy2v",
  libraryHw2: "rec6WmXjpLtIWDERo",
  keepWasId: "recIwx50zhNsUqV1L",
  duplicateWasId: "recb1hq4wJKfBcy6z",
  templateAssetId: "rec94yqw5w7tqtJgc",
});

function parseArgs(argv) {
  const args = { apply: false, cleanup: false, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--cleanup") args.cleanup = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function saveManifest(data) {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(data, null, 2));
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function writeEvidence(report) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const path = resolve(
    EVIDENCE_DIR,
    `${report.mode}-${new Date().toISOString().replace(/[:.]/g, "")}.json`
  );
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

function firstLinkId(value) {
  if (Array.isArray(value) && value[0]) {
    if (typeof value[0] === "object") return String(value[0].id || "");
    return String(value[0]);
  }
  return "";
}

function linkIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "object" ? v.id : v)).filter(Boolean);
}

async function pollUntil(fn, { timeoutMs = 180000, intervalMs = 8000, label = "poll" } = {}) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await fn();
    if (last?.done) return last;
    await sleep(intervalMs);
  }
  return { done: false, timeout: true, label, last };
}

async function listXpBySourceKey(token, baseId, sourceKey) {
  const res = await listRecords(token, baseId, "XP Events", {
    filterByFormula: `{Source Key}="${sourceKey}"`,
    fields: ["Source Key", "XP Points", "Active?", "Enrollment", "Week", "XP Bucket"],
    maxRecords: 10,
  });
  return Array.isArray(res) ? res : res?.records || [];
}

async function clearMakeTrigger(token, baseId, assetId) {
  try {
    await updateRecords(token, baseId, "Submission Assets", [
      { id: assetId, fields: { "Send to Make Trigger": false } },
    ]);
    return true;
  } catch (err) {
    return String(err.message || err).slice(0, 160);
  }
}

async function checkEmailHandoffs(token, baseId, recordIds, createdAfterIso) {
  const found = [];
  for (const id of recordIds) {
    const rows = await listRecords(token, baseId, "Email Handoff Queue", {
      filterByFormula: `AND(FIND("${id}", {Source Record ID} & ""), IS_AFTER({Created}, "${createdAfterIso}"))`,
      maxRecords: 5,
      fields: ["Source Record ID", "Event Type", "Status", "Handoff Key", "Created"],
    });
    const list = Array.isArray(rows) ? rows : rows?.records || [];
    for (const r of list) found.push({ matchedId: id, id: r.id, fields: r.fields });
  }
  return found;
}

async function getTemplateAttachment(token, baseId) {
  const row = await getRecord(token, baseId, "Submission Assets", LIVE.templateAssetId);
  const att = row.fields?.["Airtable Attachment"]?.[0];
  if (!att?.url) throw new Error(`Template asset ${LIVE.templateAssetId} missing Airtable Attachment`);
  return att;
}

async function createHomeworkAsset(token, baseId, {
  submissionId,
  enrollmentId,
  purpose,
  slot,
  label,
  filename,
  att,
}) {
  const res = await createRecords(token, baseId, "Submission Assets", [
    {
      fields: {
        "Asset Label": label,
        "Asset Purpose": purpose,
        "Asset Slot": slot,
        "Asset Type": "Image",
        "Original File Name": filename,
        "Source Attachment ID": `${PREFIX}${filename}`,
        "Submission - Linked": [submissionId],
        "Enrollment - Linked": [enrollmentId],
        "Airtable Attachment": [{ url: att.url, filename }],
        "Send to Make Trigger": false,
      },
    },
  ]);
  return res.records[0].id;
}

async function waitForAssetHc(token, baseId, assetId, { timeoutMs = 180000 } = {}) {
  return pollUntil(
    async () => {
      const row = await getRecord(token, baseId, "Submission Assets", assetId);
      const hcIds = linkIds(row.fields?.["Homework Completions"]);
      const uploadStatus =
        typeof row.fields?.["Upload Status"] === "object"
          ? row.fields["Upload Status"]?.name
          : row.fields?.["Upload Status"];
      const uploadError = row.fields?.["Upload Error"] || "";
      const sendMake = Boolean(row.fields?.["Send to Make Trigger"]);
      if (hcIds.length) {
        return {
          done: true,
          hcIds,
          uploadStatus,
          uploadError,
          sendMake,
          uploadDestination: row.fields?.["Upload Destination"],
        };
      }
      if (String(uploadStatus).toLowerCase() === "error") {
        return {
          done: true,
          error: true,
          hcIds: [],
          uploadStatus,
          uploadError,
          sendMake,
        };
      }
      return { done: false, uploadStatus, uploadError, sendMake };
    },
    { timeoutMs, label: `asset:${assetId}` }
  );
}

async function runApply(token, baseId) {
  const batchKey = `${PREFIX}${new Date().toISOString().slice(0, 10)}|${Date.now().toString(36)}`;
  const createdAfterIso = new Date(Date.now() - 5000).toISOString();
  const created = {
    batchKey,
    enrollmentId: GATED_ENROLLMENT_ID,
    athleteId: GATED_ATHLETE_ID,
    weekId: LIVE.earlyBirdWeek,
    wasId: LIVE.keepWasId,
    deletedDuplicateWasId: null,
    submissionIds: [],
    assetIds: [],
    homeworkIds: [],
    xpEventIds: [],
  };
  const report = {
    harness: HARNESS,
    mode: "apply",
    startedAt: new Date().toISOString(),
    checks: [],
    defects: [],
    notes: [],
    created,
  };

  // Deduplicate WAS so 065 can award (exactly one Enrollment+Week).
  try {
    await deleteRecords(token, baseId, "Weekly Athlete Summary", [LIVE.duplicateWasId]);
    created.deletedDuplicateWasId = LIVE.duplicateWasId;
    report.notes.push(`Deleted duplicate Testing3 Early Bird WAS ${LIVE.duplicateWasId}`);
  } catch (err) {
    report.notes.push(`Could not delete duplicate WAS: ${String(err.message || err).slice(0, 180)}`);
  }

  const att = await getTemplateAttachment(token, baseId);

  // --- Scenario A: two assets same HW1 slot → one HC ---
  const subA = await createRecords(token, baseId, "Submissions", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Athlete: [GATED_ATHLETE_ID],
        Week: [LIVE.earlyBirdWeek],
        "Weekly Athlete Summary": [LIVE.keepWasId],
        "Activity Date": denverNoon("2027-04-28"),
        "Homework Name 1": [LIVE.earlyBirdHw1],
        "Daily Email Subject": `${batchKey}|same-slot-a`,
      },
    },
  ]);
  const submissionA = subA.records[0].id;
  created.submissionIds.push({ id: submissionA, tag: "same-slot-hw1" });

  const assetA1 = await createHomeworkAsset(token, baseId, {
    submissionId: submissionA,
    enrollmentId: GATED_ENROLLMENT_ID,
    purpose: "Homework 1",
    slot: "HW1",
    label: `${batchKey}|A1`,
    filename: `${batchKey}-a1.jpg`,
    att,
  });
  created.assetIds.push({ id: assetA1, tag: "hw1-a1", slot: "HW1" });

  const waitA1 = await waitForAssetHc(token, baseId, assetA1);
  await clearMakeTrigger(token, baseId, assetA1);
  report.checks.push({
    id: "020.first_asset_creates_or_links_hc",
    pass: Boolean(waitA1.done && waitA1.hcIds?.length === 1 && !waitA1.error),
    status: waitA1.done && waitA1.hcIds?.length === 1 && !waitA1.error ? "PASS" : "FAIL",
    actual: waitA1,
  });
  if (!waitA1.hcIds?.[0]) {
    report.defects.push("020 did not link first HW1 asset to an HC");
    saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
    report.created = created;
    return report;
  }
  const hcHw1 = waitA1.hcIds[0];
  created.homeworkIds.push({ id: hcHw1, kind: "hw1-multi-asset" });

  const assetA2 = await createHomeworkAsset(token, baseId, {
    submissionId: submissionA,
    enrollmentId: GATED_ENROLLMENT_ID,
    purpose: "Homework 1",
    slot: "HW1",
    label: `${batchKey}|A2`,
    filename: `${batchKey}-a2.jpg`,
    att,
  });
  created.assetIds.push({ id: assetA2, tag: "hw1-a2", slot: "HW1" });

  const waitA2 = await waitForAssetHc(token, baseId, assetA2);
  await clearMakeTrigger(token, baseId, assetA2);
  const sameHc = waitA2.hcIds?.[0] === hcHw1;
  report.checks.push({
    id: "020.second_asset_links_same_hc",
    pass: Boolean(waitA2.done && sameHc && !waitA2.error),
    status: waitA2.done && sameHc && !waitA2.error ? "PASS" : "FAIL",
    expected: hcHw1,
    actual: waitA2,
  });

  // Prefer asset→HC identity over fragile ARRAYJOIN FIND filters.
  const assetHcSet = new Set([...(waitA1.hcIds || []), ...(waitA2.hcIds || [])]);
  report.checks.push({
    id: "hc.no_duplicate_for_enrollment_pha",
    pass: assetHcSet.size === 1 && assetHcSet.has(hcHw1),
    status: assetHcSet.size === 1 && assetHcSet.has(hcHw1) ? "PASS" : "FAIL",
    expected: 1,
    actual: [...assetHcSet],
  });

  const hcSnap = await getRecord(token, baseId, "Homework Completions", hcHw1);
  const linkedAssets = linkIds(hcSnap.fields?.["Submission Assets"]);
  const bothLinked = linkedAssets.includes(assetA1) && linkedAssets.includes(assetA2);
  report.checks.push({
    id: "hc.both_assets_linked",
    pass: bothLinked,
    status: bothLinked ? "PASS" : "FAIL",
    actual: linkedAssets,
  });
  const identityOk =
    firstLinkId(hcSnap.fields?.["Program Homework Assignment"]) === LIVE.earlyBirdHw1 &&
    firstLinkId(hcSnap.fields?.Week) === LIVE.earlyBirdWeek &&
    firstLinkId(hcSnap.fields?.Enrollment) === GATED_ENROLLMENT_ID &&
    firstLinkId(hcSnap.fields?.Homework) === LIVE.libraryHw1;
  report.checks.push({
    id: "hc.assignment_identity",
    pass: identityOk,
    status: identityOk ? "PASS" : "FAIL",
    actual: {
      enrollment: firstLinkId(hcSnap.fields?.Enrollment),
      pha: firstLinkId(hcSnap.fields?.["Program Homework Assignment"]),
      week: firstLinkId(hcSnap.fields?.Week),
      homework: firstLinkId(hcSnap.fields?.Homework),
      itemSlot: hcSnap.fields?.["Item Slot"]?.name || hcSnap.fields?.["Item Slot"],
    },
  });

  // Grade satisfactory → 064/065
  await updateRecords(token, baseId, "Homework Completions", [
    {
      id: hcHw1,
      fields: {
        "Coach Feedback": `${batchKey}|satisfactory multi-asset`,
        "Satisfactory?": true,
        "Review Complete": true,
      },
    },
  ]);

  const sourceKey = homeworkXpKey(hcHw1);
  const xpPoll = await pollUntil(
    async () => {
      const rows = await listXpBySourceKey(token, baseId, sourceKey);
      if (rows.length >= 1) return { done: true, rows };
      const fresh = await getRecord(token, baseId, "Homework Completions", hcHw1);
      return {
        done: false,
        reconcile: fresh.fields?.["Homework XP Reconciliation Needed?"],
        totalXp: fresh.fields?.["Total Homework XP Awarded"],
        awardStatus: fresh.fields?.["Award Status"]?.name || fresh.fields?.["Award Status"],
        automationError: fresh.fields?.["Automation Error"],
      };
    },
    { timeoutMs: 180000, label: "homework-xp" }
  );
  const xpCount = xpPoll.rows?.length || 0;
  report.checks.push({
    id: "065.exactly_one_homework_xp",
    pass: xpCount === 1,
    status: xpCount === 1 ? "PASS" : "FAIL",
    expected: `HOMEWORK_XP|${hcHw1}`,
    actual: {
      count: xpCount,
      ids: (xpPoll.rows || []).map((r) => r.id),
      points: (xpPoll.rows || []).map((r) => r.fields?.["XP Points"]),
      bucket: (xpPoll.rows || []).map((r) => r.fields?.["XP Bucket"]?.name || r.fields?.["XP Bucket"]),
      poll: xpPoll.timeout ? xpPoll.last : undefined,
    },
  });
  for (const r of xpPoll.rows || []) created.xpEventIds.push(r.id);

  // Idempotency: re-arm review slightly and confirm still one XP
  await updateRecords(token, baseId, "Homework Completions", [
    {
      id: hcHw1,
      fields: {
        "Coach Feedback": `${batchKey}|satisfactory multi-asset rerun`,
        "Satisfactory?": true,
        "Review Complete": true,
      },
    },
  ]);
  await sleep(20000);
  const xpReplay = await listXpBySourceKey(token, baseId, sourceKey);
  report.checks.push({
    id: "065.idempotent_rerun",
    pass: xpReplay.length === 1,
    status: xpReplay.length === 1 ? "PASS" : "FAIL",
    actual: xpReplay.map((r) => r.id),
  });

  // --- Scenario B: different slot/PHA must not merge ---
  const subB = await createRecords(token, baseId, "Submissions", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Athlete: [GATED_ATHLETE_ID],
        Week: [LIVE.earlyBirdWeek],
        "Weekly Athlete Summary": [LIVE.keepWasId],
        "Activity Date": denverNoon("2027-04-28"),
        "Homework Name 1": [LIVE.earlyBirdHw2],
        "Daily Email Subject": `${batchKey}|other-slot-b`,
      },
    },
  ]);
  const submissionB = subB.records[0].id;
  created.submissionIds.push({ id: submissionB, tag: "other-slot-hw2" });

  const assetB1 = await createHomeworkAsset(token, baseId, {
    submissionId: submissionB,
    enrollmentId: GATED_ENROLLMENT_ID,
    purpose: "Homework 2",
    slot: "HW2",
    label: `${batchKey}|B1`,
    filename: `${batchKey}-b1.jpg`,
    att,
  });
  created.assetIds.push({ id: assetB1, tag: "hw2-b1", slot: "HW2" });
  const waitB1 = await waitForAssetHc(token, baseId, assetB1);
  await clearMakeTrigger(token, baseId, assetB1);
  const hcHw2 = waitB1.hcIds?.[0] || "";
  if (hcHw2) created.homeworkIds.push({ id: hcHw2, kind: "hw2-isolation" });
  report.checks.push({
    id: "020.other_slot_separate_hc",
    pass: Boolean(hcHw2 && hcHw2 !== hcHw1),
    status: hcHw2 && hcHw2 !== hcHw1 ? "PASS" : "FAIL",
    expected: "different HC from HW1",
    actual: { hcHw1, hcHw2, waitB1 },
  });

  // --- Scenario C: missing assignment identity fails safely ---
  const subC = await createRecords(token, baseId, "Submissions", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Athlete: [GATED_ATHLETE_ID],
        Week: [LIVE.earlyBirdWeek],
        "Weekly Athlete Summary": [LIVE.keepWasId],
        "Activity Date": denverNoon("2027-04-28"),
        "Daily Email Subject": `${batchKey}|missing-pha`,
      },
    },
  ]);
  const submissionC = subC.records[0].id;
  created.submissionIds.push({ id: submissionC, tag: "missing-pha" });

  const assetC1 = await createHomeworkAsset(token, baseId, {
    submissionId: submissionC,
    enrollmentId: GATED_ENROLLMENT_ID,
    purpose: "Homework 1",
    slot: "HW1",
    label: `${batchKey}|C1-missing`,
    filename: `${batchKey}-c1.jpg`,
    att,
  });
  created.assetIds.push({ id: assetC1, tag: "missing-pha", slot: "HW1" });
  const waitC1 = await waitForAssetHc(token, baseId, assetC1, { timeoutMs: 120000 });
  await clearMakeTrigger(token, baseId, assetC1);
  const failSafe =
    Boolean(waitC1.error) ||
    (!waitC1.hcIds?.length && (waitC1.timeout || waitC1.last?.uploadError || waitC1.uploadError));
  // Prefer explicit Error status from 020
  const assetCSnap = await getRecord(token, baseId, "Submission Assets", assetC1);
  const cStatus =
    assetCSnap.fields?.["Upload Status"]?.name || assetCSnap.fields?.["Upload Status"] || "";
  const cError = assetCSnap.fields?.["Upload Error"] || "";
  const cHc = linkIds(assetCSnap.fields?.["Homework Completions"]);
  const safeFail = cStatus === "Error" || (cHc.length === 0 && Boolean(cError));
  report.checks.push({
    id: "020.missing_assignment_fails_safe",
    pass: safeFail,
    status: safeFail ? "PASS" : "FAIL",
    actual: { uploadStatus: cStatus, uploadError: cError, hcIds: cHc, waitC1, failSafe },
  });

  // Email / external send guard
  const emailHits = await checkEmailHandoffs(
    token,
    baseId,
    [
      ...created.submissionIds.map((s) => s.id),
      ...created.assetIds.map((a) => a.id),
      ...created.homeworkIds.map((h) => h.id),
      ...created.xpEventIds,
    ],
    createdAfterIso
  );
  report.checks.push({
    id: "email.no_handoff_queue",
    pass: emailHits.length === 0,
    status: emailHits.length === 0 ? "PASS" : "FAIL",
    actual: emailHits,
  });

  const parentReady = Boolean(hcSnap.fields?.["Parent Feedback Ready?"]);
  // re-read after grading
  const hcAfter = await getRecord(token, baseId, "Homework Completions", hcHw1);
  report.checks.push({
    id: "email.parent_feedback_not_armed",
    pass: !hcAfter.fields?.["Parent Feedback Ready?"],
    status: !hcAfter.fields?.["Parent Feedback Ready?"] ? "PASS" : "FAIL",
    actual: hcAfter.fields?.["Parent Feedback Ready?"],
    note: parentReady,
  });

  // Confirm Make triggers cleared on our assets
  const makeArmed = [];
  for (const a of created.assetIds) {
    const row = await getRecord(token, baseId, "Submission Assets", a.id);
    if (row.fields?.["Send to Make Trigger"]) makeArmed.push(a.id);
  }
  report.checks.push({
    id: "make.send_trigger_cleared",
    pass: makeArmed.length === 0,
    status: makeArmed.length === 0 ? "PASS" : "FAIL",
    actual: makeArmed,
  });

  saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
  report.created = created;
  report.passed = report.checks.every((c) => c.pass);
  report.finishedAt = new Date().toISOString();
  return report;
}

async function cleanup(token, baseId) {
  const manifest = loadManifest();
  if (!manifest) return { ok: false, reason: "no manifest" };
  const actions = [];

  async function tryDelete(table, ids) {
    if (!ids?.length) return;
    try {
      await deleteRecords(token, baseId, table, ids);
      actions.push({ table, deleted: ids, status: "deleted" });
    } catch (err) {
      actions.push({
        table,
        ids,
        status: "error",
        error: String(err.message || err).slice(0, 200),
      });
      if (table === "XP Events") {
        for (const id of ids) {
          try {
            await updateRecords(token, baseId, table, [{ id, fields: { "Active?": false } }]);
            actions.push({ table, id, status: "deactivated" });
          } catch (e2) {
            actions.push({ table, id, status: "deactivate_failed", error: String(e2.message || e2).slice(0, 120) });
          }
        }
      }
    }
  }

  await tryDelete(
    "XP Events",
    manifest.xpEventIds || []
  );
  await tryDelete(
    "Homework Completions",
    (manifest.homeworkIds || []).map((h) => h.id || h)
  );
  await tryDelete(
    "Submission Assets",
    (manifest.assetIds || []).map((a) => a.id || a)
  );
  await tryDelete(
    "Submissions",
    (manifest.submissionIds || []).map((s) => s.id || s)
  );

  // Do not delete Early Bird week or keepWasId (shared Testing3 fixture).
  // Do not recreate deleted duplicate WAS.

  return { ok: true, actions, limitations: [
    "Shared Testing3 Early Bird WAS kept (recIwx50zhNsUqV1L)",
    "Duplicate WAS recb1hq4wJKfBcy6z was deleted during apply if PAT allowed",
    "Early Bird calendar Week not deleted",
    "PAT may 403 DELETE on XP/HC/Submissions — MCP/manual cleanup then required",
  ]};
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`SC-MULTI-ASSET-HW

  node tools/testing/sc-multi-asset-homework.mjs --apply
  node tools/testing/sc-multi-asset-homework.mjs --cleanup
`);
    return;
  }
  const { token, baseId } = requireToken();
  let report;
  if (args.cleanup) {
    report = { harness: HARNESS, mode: "cleanup", startedAt: new Date().toISOString() };
    report.cleanup = await cleanup(token, baseId);
    report.finishedAt = new Date().toISOString();
  } else if (args.apply) {
    report = await runApply(token, baseId);
  } else {
    throw new Error("Specify --apply or --cleanup");
  }
  const path = writeEvidence(report);
  console.log(JSON.stringify({ evidence: path, passed: report.passed, checks: report.checks?.map((c) => ({ id: c.id, status: c.status })) }, null, 2));
  if (args.apply && !report.passed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
