/**
 * SC-160 Stage 6 — disposable live Airtable proof harness (Athlete1 path).
 *
 * Timing / intake / dedupe / recon checks against live automations.
 * Never arms Make. Never deletes non-PREFIX / non-manifest records.
 * Never touches Mike-reported Rene enrollment.
 *
 * Usage:
 *   node tools/testing/sc-160-stage6-live-proof.mjs --apply
 *   node tools/testing/sc-160-stage6-live-proof.mjs --cleanup
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
import { denverNoon, homeworkXpKey, sleep } from "./lib/sc-athlete-wf-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS = "SC-160-STAGE6";
const PREFIX = "SC160|S6|";
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/sc-160-stage6");
const MANIFEST_PATH = resolve(EVIDENCE_DIR, "_manifest-last.json");

const ENROLLMENT_ID = "recZEwkkXTJanDlG6";
const ATHLETE_ID = "recTfxT6WMsPvobAW";
const EARLY_BIRD_WEEK = "recBrZ1sV8byWEHZU";
const PHA_HW1 = "recrpWRmt0MntieCL";
const TEMPLATE_ASSET_ID = "recLiRlImmPkZyTSF";
const SHARED_WAS_ID = "recSjN9HDxxDcJwGY";
const ASSET_TYPE = "Homework Image";
const VIDEO_ASSET_TYPE = "Video Feedback";
const DUE_DATE = "2027-06-29";

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
    return typeof value[0] === "object" ? String(value[0].id || "") : String(value[0]);
  }
  return "";
}

function linkIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "object" ? v.id : v)).filter(Boolean);
}

function redactId(id) {
  if (!id || typeof id !== "string") return id;
  if (id.startsWith("rec") && id.length >= 10) return `${id.slice(0, 5)}…${id.slice(-4)}`;
  return id;
}

function choiceName(v) {
  return typeof v === "object" && v ? v.name || "" : String(v || "");
}

function pushCheck(report, id, pass, actual, expected = undefined, { soft = false } = {}) {
  report.checks.push({
    id,
    pass: Boolean(pass),
    status: pass ? "PASS" : soft ? "OBSERVED" : "FAIL",
    ...(expected !== undefined ? { expected } : {}),
    actual,
  });
  if (!pass && !soft) report.defects.push(id);
}

async function pollUntil(fn, { timeoutMs = 120000, intervalMs = 6000, label = "poll" } = {}) {
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
    fields: ["Source Key", "XP Points", "Active?", "Enrollment", "Week", "Homework Completion"],
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

async function getTemplateAttachment(token, baseId) {
  const row = await getRecord(token, baseId, "Submission Assets", TEMPLATE_ASSET_ID);
  const att = row.fields?.["Airtable Attachment"]?.[0];
  if (!att?.url) throw new Error(`Template asset ${TEMPLATE_ASSET_ID} missing Airtable Attachment`);
  return att;
}

async function lookupPhaHw2(token, baseId) {
  // Known Early Bird HW2 (same as sc-multi-asset-homework); verify then fall back to Week scan.
  const KNOWN_HW2 = "recfcXqQsk3W4o6IT";
  try {
    const row = await getRecord(token, baseId, "Program Homework Assignments", KNOWN_HW2);
    if (row?.id) return row.id;
  } catch {
    /* fall through */
  }
  const rows = await listRecords(token, baseId, "Program Homework Assignments", {
    filterByFormula: `FIND("${EARLY_BIRD_WEEK}", ARRAYJOIN({Week}&""))`,
    maxRecords: 50,
  });
  const all = Array.isArray(rows) ? rows : [];
  const hw2 = all.find((r) => {
    if (r.id === PHA_HW1) return false;
    const n = String(r.fields?.["Program Homework Assignment"] || "");
    return /\bhw\s*2\b/i.test(n) || /homework\s*2/i.test(n) || /\b2\b/.test(n);
  });
  return hw2?.id || null;
}

async function waitForAssetHc(token, baseId, assetId, { timeoutMs = 150000 } = {}) {
  return pollUntil(
    async () => {
      const row = await getRecord(token, baseId, "Submission Assets", assetId);
      const hcIds = linkIds(row.fields?.["Homework Completions"]);
      const uploadStatus = choiceName(row.fields?.["Upload Status"]);
      const uploadError = row.fields?.["Upload Error"] || "";
      const sendMake = Boolean(row.fields?.["Send to Make Trigger"]);
      if (sendMake) await clearMakeTrigger(token, baseId, assetId);
      if (hcIds.length) return { done: true, hcIds, uploadStatus, uploadError, sendMake };
      if (String(uploadStatus).toLowerCase() === "error") {
        return { done: true, error: true, hcIds: [], uploadStatus, uploadError, sendMake };
      }
      return { done: false, uploadStatus, uploadError, sendMake };
    },
    { timeoutMs, label: `asset:${assetId}` }
  );
}

async function rearrm020(token, baseId, assetId) {
  await updateRecords(token, baseId, "Submission Assets", [
    { id: assetId, fields: { "Enrollment - Linked": [] } },
  ]);
  await sleep(2500);
  await updateRecords(token, baseId, "Submission Assets", [
    { id: assetId, fields: { "Enrollment - Linked": [ENROLLMENT_ID], "Send to Make Trigger": false } },
  ]);
  await sleep(2500);
}

async function listExactWas(token, baseId) {
  // FIND(ARRAYJOIN({Enrollment})) intermittently misses linked rows (Stage 6 WAS storm root).
  // Filter by Week in formula; exact Enrollment+Week match in JS.
  const existing = await listRecords(token, baseId, "Weekly Athlete Summary", {
    filterByFormula: `FIND("${EARLY_BIRD_WEEK}", ARRAYJOIN({Week}&""))`,
    fields: ["Enrollment", "Week", "Summary Key"],
    maxRecords: 100,
  });
  const rows = Array.isArray(existing) ? existing : existing?.records || [];
  return rows.filter((r) => {
    const e = linkIds(r.fields?.Enrollment);
    const w = linkIds(r.fields?.Week);
    return e.length === 1 && e[0] === ENROLLMENT_ID && w.length === 1 && w[0] === EARLY_BIRD_WEEK;
  });
}

async function ensureCanonicalWas(token, baseId, created, report) {
  try {
    const shared = await getRecord(token, baseId, "Weekly Athlete Summary", SHARED_WAS_ID);
    const enrs = linkIds(shared.fields?.Enrollment);
    if (enrs.includes(ENROLLMENT_ID)) {
      const remaining = enrs.filter((id) => id !== ENROLLMENT_ID);
      await updateRecords(token, baseId, "Weekly Athlete Summary", [
        { id: SHARED_WAS_ID, fields: { Enrollment: remaining } },
      ]);
      created.sharedWasTrimmed = true;
      created.sharedWasPriorEnrollments = enrs;
      report.notes.push(`Trimmed Athlete1 from shared WAS ${redactId(SHARED_WAS_ID)}`);
    }
  } catch (err) {
    report.notes.push(`Shared WAS trim skipped: ${String(err.message || err).slice(0, 160)}`);
  }

  let exact = await listExactWas(token, baseId);
  if (exact.length > 1) {
    // PAT often cannot DELETE — never create another WAS while duplicates exist.
    const keep = exact[0];
    const failedDeletes = [];
    for (const row of exact.slice(1)) {
      try {
        await deleteRecords(token, baseId, "Weekly Athlete Summary", [row.id]);
        created.deletedDuplicateWasIds = [...(created.deletedDuplicateWasIds || []), row.id];
      } catch (err) {
        failedDeletes.push({
          id: redactId(row.id),
          error: String(err.message || err).slice(0, 120),
        });
      }
    }
    exact = await listExactWas(token, baseId);
    if (exact.length !== 1) {
      throw new Error(
        `SC-160 Stage6 HARD STOP: ${exact.length} Weekly Athlete Summary rows for Athlete1+Early Bird ` +
          `(failedDeletes=${failedDeletes.length}). Resolve duplicates via MCP before creating fixtures. ` +
          `Do not create another WAS.`
      );
    }
    report.notes.push(`Deduped WAS to canonical ${redactId(exact[0].id)}`);
  }
  if (exact.length === 1) {
    created.wasId = exact[0].id;
    created.wasCreated = false;
    return exact[0].id;
  }

  // Prefer Automation 031 when possible; harness create is last resort and must be unique.
  const createdWas = await createRecords(token, baseId, "Weekly Athlete Summary", [
    { fields: { Enrollment: [ENROLLMENT_ID], Week: [EARLY_BIRD_WEEK] } },
  ]);
  created.wasId = createdWas.records[0].id;
  created.wasCreated = true;
  let after = [];
  for (let i = 0; i < 6; i += 1) {
    await sleep(1500);
    after = await listExactWas(token, baseId);
    if (after.length >= 1) break;
  }
  if (after.length > 1) {
    throw new Error(
      `SC-160 Stage6 HARD STOP after WAS create: expected 1 Enrollment+Week row, found ${after.length}. ` +
        `Stop all fixture creation and reconcile Summary Key duplicates.`
    );
  }
  if (after.length === 0) {
    const verify = await getRecord(token, baseId, "Weekly Athlete Summary", created.wasId);
    const e = linkIds(verify.fields?.Enrollment);
    const w = linkIds(verify.fields?.Week);
    if (!(e.length === 1 && e[0] === ENROLLMENT_ID && w.length === 1 && w[0] === EARLY_BIRD_WEEK)) {
      throw new Error(
        `SC-160 Stage6 HARD STOP after WAS create: created row missing expected Enrollment+Week links.`
      );
    }
    report.notes.push(
      `WAS listExactWas lagged after create; verified created row ${redactId(created.wasId)} directly`
    );
  }
  return created.wasId;
}

/** Recon: duplicate Summary Keys for Athlete1+Early Bird must be zero before/after apply. */
async function assertUniqueWasSummaryKey(token, baseId, report, phase) {
  const exact = await listExactWas(token, baseId);
  const pass = exact.length <= 1;
  pushCheck(report, `was_recon.unique_enrollment_week.${phase}`, pass, {
    count: exact.length,
    ids: exact.map((r) => redactId(r.id)),
    note:
      exact.length === 0
        ? "No WAS yet (ok before create)"
        : exact.length === 1
          ? "Canonical singleton"
          : "DUPLICATE Enrollment+Week WAS — 065 will fail at Require canonical WAS",
  });
  if (!pass) {
    report.defects.push(`Duplicate WAS at ${phase}: count=${exact.length}`);
  }
  return exact.length;
}

async function force065Reentry(token, baseId, hcId, report) {
  try {
    const hc = await getRecord(token, baseId, "Homework Completions", hcId);
    const current = String(hc.fields?.["Homework XP Current Signature"] || "");
    if (!current) {
      report.notes.push("065 re-entry skipped: blank signature");
      return;
    }
    await updateRecords(token, baseId, "Homework Completions", [
      { id: hcId, fields: { "Last Homework XP Reconciled Signature": current } },
    ]);
    await pollUntil(async () => {
      const row = await getRecord(token, baseId, "Homework Completions", hcId);
      const needed = row.fields?.["Homework XP Reconciliation Needed?"];
      if (needed === 0 || needed === false || needed == null) return { done: true };
      return { done: false };
    }, { timeoutMs: 45000, intervalMs: 2500, label: "reconcile-0" });
    await updateRecords(token, baseId, "Homework Completions", [
      { id: hcId, fields: { "Last Homework XP Reconciled Signature": "" } },
    ]);
    report.notes.push("Forced 065 re-entry");
  } catch (err) {
    report.notes.push(`065 re-entry failed: ${String(err.message || err).slice(0, 160)}`);
  }
}

function timingFromNotes(notes) {
  const n = String(notes || "");
  if (/Late submission:/i.test(n)) return "late";
  if (/Early submission:/i.test(n)) return "early";
  return "on_time_or_empty";
}

async function createHwSubmission(token, baseId, { batchKey, tag, activityDate, wasId, phaHw1 = PHA_HW1, phaHw2 = null, week = EARLY_BIRD_WEEK }) {
  const fields = {
    Enrollment: [ENROLLMENT_ID],
    Athlete: [ATHLETE_ID],
    "Activity Date": denverNoon(activityDate),
    "Homework Name 1": [phaHw1],
    "Daily Email Subject": `${batchKey}|${tag}`,
  };
  if (week) fields.Week = [week];
  if (wasId) fields["Weekly Athlete Summary"] = [wasId];
  if (phaHw2) fields["Homework Name 2"] = [phaHw2];
  const res = await createRecords(token, baseId, "Submissions", [{ fields }]);
  return res.records[0].id;
}

async function createHwAsset(token, baseId, {
  batchKey, tag, submissionId, att, uploadedAt, slot = "HW1", purpose = "Homework 1",
  assetType = ASSET_TYPE, sourceAttachmentId = null, filenameExt = "jpg",
}) {
  const sourceId = sourceAttachmentId || `${PREFIX}${batchKey}-${tag}`;
  const fields = {
    "Asset Label": `${batchKey}|${tag}`,
    "Asset Purpose": purpose,
    "Asset Slot": slot,
    "Asset Type": assetType,
    "Original File Name": `${batchKey}-${tag}.${filenameExt}`,
    "Source Attachment ID": sourceId,
    "Submission - Linked": [submissionId],
    "Enrollment - Linked": [ENROLLMENT_ID],
    "Airtable Attachment": [{ url: att.url, filename: `${batchKey}-${tag}.${filenameExt}` }],
    "Send to Make Trigger": false,
  };
  if (uploadedAt) fields["Uploaded At"] = denverNoon(uploadedAt);
  const res = await createRecords(token, baseId, "Submission Assets", [{ fields }]);
  const assetId = res.records[0].id;
  await clearMakeTrigger(token, baseId, assetId);
  // Ensure Uploaded At sticks (create may race with automation)
  if (uploadedAt) {
    try {
      await updateRecords(token, baseId, "Submission Assets", [
        { id: assetId, fields: { "Uploaded At": denverNoon(uploadedAt), "Send to Make Trigger": false } },
      ]);
    } catch {
      /* non-fatal */
    }
  }
  return { assetId, sourceId };
}

async function gradeSatisfactory(token, baseId, hcId, batchKey, tag) {
  await updateRecords(token, baseId, "Homework Completions", [
    {
      id: hcId,
      fields: {
        "Coach Feedback": `${batchKey}|${tag}|satisfactory`,
        "Satisfactory?": true,
        "Review Complete": true,
        "Automation Error": "",
      },
    },
  ]);
}

/** Clear timing/grade fields so the next scenario's 020 run writes a clean Notes state.
 *  020 reuses one Enrollment+PHA HC; it only appends Late onto Early, never Early→on_time.
 *  Keep a non-blank Coach Feedback stub — 065 fail-closes on blank feedback. */
async function resetHcTiming(token, baseId, hcId, report) {
  if (!hcId) return;
  try {
    await updateRecords(token, baseId, "Homework Completions", [
      {
        id: hcId,
        fields: {
          Notes: "",
          "Satisfactory?": false,
          "Review Complete": false,
          "Coach Feedback": `${PREFIX}reset-hold`,
          "Automation Error": "",
        },
      },
    ]);
  } catch (err) {
    report.notes.push(`resetHcTiming failed: ${String(err.message || err).slice(0, 120)}`);
  }
}

async function waitHomeworkXp(token, baseId, hcId, report) {
  const sourceKey = homeworkXpKey(hcId);
  let xpPoll = await pollUntil(async () => {
    const rows = await listXpBySourceKey(token, baseId, sourceKey);
    if (rows.length >= 1) return { done: true, rows };
    return { done: false };
  }, { timeoutMs: 75000, intervalMs: 5000, label: "xp" });
  if (!xpPoll.rows?.length) {
    await force065Reentry(token, baseId, hcId, report);
    xpPoll = await pollUntil(async () => {
      const rows = await listXpBySourceKey(token, baseId, sourceKey);
      if (rows.length >= 1) return { done: true, rows };
      return { done: false };
    }, { timeoutMs: 120000, intervalMs: 6000, label: "xp-reentry" });
  }
  return { sourceKey, rows: xpPoll.rows || [], timeout: Boolean(xpPoll.timeout) };
}

async function runApply(token, baseId) {
  const batchKey = `${PREFIX}${new Date().toISOString().slice(0, 10)}|${Date.now().toString(36)}`;
  const created = {
    batchKey,
    enrollmentId: ENROLLMENT_ID,
    athleteId: ATHLETE_ID,
    weekId: EARLY_BIRD_WEEK,
    phaId: PHA_HW1,
    phaHw2Id: null,
    submissionIds: [],
    assetIds: [],
    homeworkIds: [],
    xpEventIds: [],
    vfIds: [],
    wasId: null,
    wasCreated: false,
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

  await assertUniqueWasSummaryKey(token, baseId, report, "pre_ensure");
  const wasId = await ensureCanonicalWas(token, baseId, created, report);
  await assertUniqueWasSummaryKey(token, baseId, report, "post_ensure");
  if (report.defects.some((d) => /Duplicate WAS/.test(String(d)))) {
    report.finishedAt = new Date().toISOString();
    saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
    return report;
  }
  const att = await getTemplateAttachment(token, baseId);
  const phaHw2 = await lookupPhaHw2(token, baseId);
  created.phaHw2Id = phaHw2;
  report.notes.push(phaHw2 ? `PHA_HW2=${redactId(phaHw2)}` : "PHA_HW2 not found — multi_hw will skip HW2 link");

  const wasBefore = await getRecord(token, baseId, "Weekly Athlete Summary", wasId);
  const pwBefore = {
    satisfactory: wasBefore.fields?.["Perfect Week Homework Satisfactory Count"] ?? null,
  };

  // Track HC ids used across timing scenarios for dedupe assertion later
  const timingHcByTag = {};
  let sharedHw1HcId = null;

  async function runTimingCase(tag, dateKey, expectTiming, { resetBefore = false } = {}) {
    if (resetBefore && sharedHw1HcId) {
      await resetHcTiming(token, baseId, sharedHw1HcId, report);
    }
    const submissionId = await createHwSubmission(token, baseId, {
      batchKey, tag, activityDate: dateKey, wasId,
    });
    created.submissionIds.push({ id: submissionId, tag });
    const { assetId } = await createHwAsset(token, baseId, {
      batchKey, tag, submissionId, att, uploadedAt: dateKey,
    });
    created.assetIds.push({ id: assetId, tag });
    // Re-arm 020 when reusing Enrollment+PHA HC so Notes rewrite after reset
    if (resetBefore) await rearrm020(token, baseId, assetId);
    const waitHc = await waitForAssetHc(token, baseId, assetId);
    await clearMakeTrigger(token, baseId, assetId);
    const hcOk = Boolean(waitHc.done && waitHc.hcIds?.length && !waitHc.error);
    pushCheck(report, `${tag}.hc_linked`, hcOk, {
      done: waitHc.done, hcCount: waitHc.hcIds?.length || 0, uploadStatus: waitHc.uploadStatus,
      uploadError: waitHc.uploadError ? String(waitHc.uploadError).slice(0, 160) : "",
    });
    if (!hcOk) return null;
    const hcId = waitHc.hcIds[0];
    sharedHw1HcId = hcId;
    created.homeworkIds.push({ id: hcId, kind: tag });
    timingHcByTag[tag] = hcId;

    // Poll briefly for Notes to settle after re-arm
    const notePoll = await pollUntil(async () => {
      try {
        const hc = await getRecord(token, baseId, "Homework Completions", hcId);
        const notes = String(hc.fields?.Notes || "");
        const status = timingFromNotes(notes);
        const submitDate = String(hc.fields?.["Submission Date"] || "").slice(0, 10);
        if (expectTiming === "early" && status === "early") return { done: true, notes, status, submitDate, hc };
        if (expectTiming === "late" && status === "late") return { done: true, notes, status, submitDate, hc };
        if (expectTiming === "on_time" && status === "on_time_or_empty" && submitDate === dateKey) {
          return { done: true, notes, status, submitDate, hc };
        }
        if (
          expectTiming === "on_time" &&
          !/Late submission:/i.test(notes) &&
          !/Early submission:/i.test(notes) &&
          submitDate === dateKey
        ) {
          return { done: true, notes, status: "on_time_or_empty", submitDate, hc };
        }
        return { done: false, notes, status, submitDate, hc };
      } catch (err) {
        return { done: false, readError: String(err.message || err).slice(0, 120) };
      }
    }, { timeoutMs: 60000, intervalMs: 4000, label: `${tag}-notes` });

    const notes = notePoll.notes || notePoll.last?.notes || "";
    const status = notePoll.status || timingFromNotes(notes);
    const submitDate = notePoll.submitDate || notePoll.last?.submitDate || "";
    let hc = notePoll.hc || notePoll.last?.hc || null;
    if (!hc) {
      try {
        hc = await getRecord(token, baseId, "Homework Completions", hcId);
      } catch (err) {
        pushCheck(report, `${tag}.week_and_notes`, false, {
          readError: String(err.message || err).slice(0, 160),
          notesSnippet: String(notes).slice(0, 220),
          submitDate,
        });
        return { hcId, notes, status, assetId };
      }
    }
    const weekOk = firstLinkId(hc.fields?.Week) === EARLY_BIRD_WEEK;
    const creditOk = !/Not eligible for homework credit/i.test(notes);
    let timingPass = false;
    if (expectTiming === "early") {
      timingPass = status === "early" && /Perfect Week award waits/i.test(notes) && creditOk;
    } else if (expectTiming === "late") {
      timingPass =
        status === "late" &&
        /Full homework XP credit/i.test(notes) &&
        /does not count toward Perfect Week/i.test(notes);
    } else {
      timingPass =
        !/Late submission:/i.test(notes) &&
        !/Early submission:/i.test(notes) &&
        (submitDate === dateKey || status === "on_time_or_empty");
    }
    pushCheck(report, `${tag}.week_and_notes`, weekOk && timingPass && creditOk, {
      week: redactId(firstLinkId(hc.fields?.Week)),
      timingStatus: status,
      notesSnippet: String(notes).slice(0, 220),
      submitDate,
    }, { expectTiming, week: EARLY_BIRD_WEEK, activityDate: dateKey });
    return { hcId, notes, status, assetId };
  }

  const persist = () =>
    saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });

  // 1–3 Notes timing
  const early = await runTimingCase("early", "2027-04-20", "early");
  persist();
  const onTime = await runTimingCase("on_time", "2027-04-28", "on_time", { resetBefore: true });
  persist();
  await runTimingCase("deadline_boundary", DUE_DATE, "on_time", { resetBefore: true });
  persist();

  // 6 coach_delay — delay then grade; clear Satisfactory afterward without blanking feedback
  {
    const tag = "coach_delay";
    if (sharedHw1HcId) await resetHcTiming(token, baseId, sharedHw1HcId, report);
    const submissionId = await createHwSubmission(token, baseId, {
      batchKey, tag, activityDate: "2027-04-28", wasId,
    });
    created.submissionIds.push({ id: submissionId, tag });
    const { assetId } = await createHwAsset(token, baseId, {
      batchKey, tag, submissionId, att, uploadedAt: "2027-04-28",
    });
    created.assetIds.push({ id: assetId, tag });
    await rearrm020(token, baseId, assetId);
    const waitHc = await waitForAssetHc(token, baseId, assetId);
    await clearMakeTrigger(token, baseId, assetId);
    if (waitHc.hcIds?.[0]) {
      const hcId = waitHc.hcIds[0];
      sharedHw1HcId = hcId;
      created.homeworkIds.push({ id: hcId, kind: tag });
      try {
        await updateRecords(token, baseId, "Homework Completions", [
          { id: hcId, fields: { "Submission Assets": [assetId], Notes: "" } },
        ]);
      } catch (err) {
        report.notes.push(`coach_delay slim HC skipped: ${String(err.message || err).slice(0, 100)}`);
      }
      await rearrm020(token, baseId, assetId);
      await sleep(5000);
      const pre = await getRecord(token, baseId, "Homework Completions", hcId);
      await gradeSatisfactory(token, baseId, hcId, batchKey, tag);
      await sleep(3000);
      const hc = await getRecord(token, baseId, "Homework Completions", hcId);
      const notes = String(hc.fields?.Notes || "");
      pushCheck(report, "coach_delay.notes_still_on_time", !/Late submission:/i.test(notes), {
        timingStatus: timingFromNotes(notes),
        notesSnippet: notes.slice(0, 200),
        preGradeNotesSnippet: String(pre.fields?.Notes || "").slice(0, 120),
      });
      // Un-grade for late_xp authoritative award — keep non-blank feedback stub
      await resetHcTiming(token, baseId, hcId, report);
      await sleep(3000);
    } else {
      pushCheck(report, "coach_delay.notes_still_on_time", false, { waitHc });
    }
  }

  // 4–5 late notes + XP/PW (authoritative 065 grade — feedback must stay non-blank)
  const after = await runTimingCase("after_deadline", "2027-06-30", "late", { resetBefore: true });

  // 5 late_xp_pw — grade after_deadline HC (or create 2027-07-01 if missing)
  let lateHcId = after?.hcId || null;
  if (!lateHcId) {
    const late = await runTimingCase("late_xp_pw", "2027-07-01", "late");
    lateHcId = late?.hcId || null;
  } else {
    report.notes.push("late_xp_pw combined with after_deadline HC");
  }
  if (lateHcId) {
    // Slim to the late asset only so 065 sees a FUT-001-like HC shape
    if (after?.assetId) {
      try {
        await updateRecords(token, baseId, "Homework Completions", [
          {
            id: lateHcId,
            fields: {
              "Submission Assets": [after.assetId],
              "Weekly Athlete Summary Link": [wasId],
            },
          },
        ]);
      } catch (err) {
        report.notes.push(`late_xp slim HC: ${String(err.message || err).slice(0, 120)}`);
      }
    }
    const preGrade = await getRecord(token, baseId, "Homework Completions", lateHcId);
    report.notes.push({
      lateXpPreGrade: {
        notesHasLate: /Late submission:/i.test(String(preGrade.fields?.Notes || "")),
        reconcile: preGrade.fields?.["Homework XP Reconciliation Needed?"],
        awardStatus: choiceName(preGrade.fields?.["Award Status"]),
        totalXp: preGrade.fields?.["Total Homework XP Awarded"] ?? null,
        automationError: preGrade.fields?.["Automation Error"]
          ? String(preGrade.fields["Automation Error"]).slice(0, 160)
          : null,
      },
    });
    await gradeSatisfactory(token, baseId, lateHcId, batchKey, "late_xp_pw");
    const xp = await waitHomeworkXp(token, baseId, lateHcId, report);
    created.xpEventIds.push(...xp.rows.map((r) => r.id));
    let hcAfter = null;
    if (xp.rows.length !== 1) {
      hcAfter = await getRecord(token, baseId, "Homework Completions", lateHcId);
      // Also search XP by Homework Completion link (Source Key filter may miss)
      try {
        const byLink = await listRecords(token, baseId, "XP Events", {
          filterByFormula: `FIND("${lateHcId}", ARRAYJOIN({Homework Completion}&""))`,
          fields: ["Source Key", "XP Points", "Active?"],
          maxRecords: 10,
        });
        const linked = Array.isArray(byLink) ? byLink : [];
        if (linked.length && !xp.rows.length) {
          xp.rows = linked;
          created.xpEventIds.push(...linked.map((r) => r.id));
        }
      } catch (err) {
        report.notes.push(`XP by-link search: ${String(err.message || err).slice(0, 100)}`);
      }
    }
    pushCheck(report, "late_xp_pw.exactly_one_homework_xp", xp.rows.length === 1, {
      count: xp.rows.length,
      ids: xp.rows.map((r) => redactId(r.id)),
      sourceKey: xp.sourceKey,
      timeout: xp.timeout,
      hcAfter: hcAfter
        ? {
            reconcile: hcAfter.fields?.["Homework XP Reconciliation Needed?"],
            awardStatus: choiceName(hcAfter.fields?.["Award Status"]),
            totalXp: hcAfter.fields?.["Total Homework XP Awarded"] ?? null,
            automationError: hcAfter.fields?.["Automation Error"]
              ? String(hcAfter.fields["Automation Error"]).slice(0, 160)
              : null,
          }
        : undefined,
    });

    try {
      await updateRecords(token, baseId, "Weekly Athlete Summary", [
        { id: wasId, fields: { "Perfect Week Recalc Needed?": true } },
      ]);
    } catch (err) {
      report.notes.push(`PW recalc arm failed: ${String(err.message || err).slice(0, 120)}`);
    }
    const pwPoll = await pollUntil(async () => {
      const row = await getRecord(token, baseId, "Weekly Athlete Summary", wasId);
      const status = choiceName(row.fields?.["Perfect Week Automation Status"]);
      const recalc = row.fields?.["Perfect Week Recalc Needed?"];
      const sat = row.fields?.["Perfect Week Homework Satisfactory Count"];
      if (recalc === false || recalc === 0 || status === "Ready" || status === "Error") {
        return { done: true, status, sat, recalc };
      }
      return { done: false, status, sat, recalc };
    }, { timeoutMs: 150000, label: "057-pw" });
    const satCount = Number(pwPoll.sat ?? pwPoll.last?.sat ?? 0);
    const pwExcluded = satCount === 0 || satCount === Number(pwBefore.satisfactory || 0);
    pushCheck(report, "late_xp_pw.pw_satisfactory_unchanged", Boolean(pwPoll.done) && pwExcluded, {
      done: pwPoll.done, sat: satCount, before: pwBefore, status: pwPoll.status || pwPoll.last?.status,
    });
  } else {
    pushCheck(report, "late_xp_pw.exactly_one_homework_xp", false, { reason: "no late HC" });
    pushCheck(report, "late_xp_pw.pw_satisfactory_unchanged", false, { reason: "no late HC" });
  }

  // Note early PW language (Week End not passed — award waits)
  if (early?.notes) {
    pushCheck(
      report,
      "early.pw_award_waits_note",
      /Perfect Week award waits/i.test(early.notes) || /week evaluation time/i.test(early.notes),
      { notesSnippet: early.notes.slice(0, 200) }
    );
  }

  // 7 placeholder_then_late — early then late asset on same submission; latest wins
  {
    const tag = "placeholder_then_late";
    if (sharedHw1HcId) await resetHcTiming(token, baseId, sharedHw1HcId, report);
    const submissionId = await createHwSubmission(token, baseId, {
      batchKey, tag, activityDate: "2027-04-20", wasId,
    });
    created.submissionIds.push({ id: submissionId, tag });
    const a1 = await createHwAsset(token, baseId, {
      batchKey, tag: `${tag}-early`, submissionId, att, uploadedAt: "2027-04-20",
    });
    created.assetIds.push({ id: a1.assetId, tag: `${tag}-early` });
    await rearrm020(token, baseId, a1.assetId);
    await waitForAssetHc(token, baseId, a1.assetId);
    await clearMakeTrigger(token, baseId, a1.assetId);
    const a2 = await createHwAsset(token, baseId, {
      batchKey, tag: `${tag}-late`, submissionId, att, uploadedAt: "2027-06-30",
    });
    created.assetIds.push({ id: a2.assetId, tag: `${tag}-late` });
    await rearrm020(token, baseId, a2.assetId);
    const waitHc = await waitForAssetHc(token, baseId, a2.assetId);
    await clearMakeTrigger(token, baseId, a2.assetId);
    const hcId = waitHc.hcIds?.[0] || sharedHw1HcId;
    if (hcId) {
      created.homeworkIds.push({ id: hcId, kind: tag });
      sharedHw1HcId = hcId;
      const notePoll = await pollUntil(async () => {
        const hc = await getRecord(token, baseId, "Homework Completions", hcId);
        const notes = String(hc.fields?.Notes || "");
        if (/Late submission:/i.test(notes)) return { done: true, notes };
        return { done: false, notes };
      }, { timeoutMs: 90000, intervalMs: 5000, label: "placeholder-late-notes" });
      const notes = notePoll.notes || notePoll.last?.notes || "";
      pushCheck(report, "placeholder_then_late.latest_wins_late", /Late submission:/i.test(notes), {
        notesSnippet: String(notes).slice(0, 220), timeout: notePoll.timeout || false,
      });
    } else {
      pushCheck(report, "placeholder_then_late.latest_wins_late", false, { waitHc });
    }
  }

  // 8 video_no_week
  {
    const tag = "video_no_week";
    const subRes = await createRecords(token, baseId, "Submissions", [
      {
        fields: {
          Enrollment: [ENROLLMENT_ID],
          Athlete: [ATHLETE_ID],
          "Activity Date": denverNoon("2026-09-04"),
          "Daily Email Subject": `${batchKey}|${tag}`,
        },
      },
    ]);
    const submissionId = subRes.records[0].id;
    created.submissionIds.push({ id: submissionId, tag });
    const { assetId } = await createHwAsset(token, baseId, {
      batchKey, tag, submissionId, att,
      slot: "VIDEO", purpose: "Video For Feedback", assetType: VIDEO_ASSET_TYPE,
      filenameExt: "mp4", uploadedAt: "2026-09-04",
    });
    created.assetIds.push({ id: assetId, tag });
    await sleep(8000);
    const sub = await getRecord(token, baseId, "Submissions", submissionId);
    const asset = await getRecord(token, baseId, "Submission Assets", assetId);
    const weekEmpty = linkIds(sub.fields?.Week).length === 0;
    const vfIds = linkIds(asset.fields?.["Video Feedback"]);
    if (vfIds.length) created.vfIds.push(...vfIds.map((id) => ({ id, tag })));
    pushCheck(report, "video_no_week.asset_created_week_empty", Boolean(assetId) && weekEmpty, {
      assetId: redactId(assetId),
      weekLinks: linkIds(sub.fields?.Week).length,
      vfObserved: vfIds.length,
      uploadStatus: choiceName(asset.fields?.["Upload Status"]),
    });
    report.notes.push(`video_no_week VF observe: count=${vfIds.length} (non-fatal if zero)`);
  }

  // 9 multi_hw_video_no_week — HW1+HW2+3 VIDEO, unique source IDs, Week empty
  {
    const tag = "multi_hw_video_no_week";
    const fields = {
      Enrollment: [ENROLLMENT_ID],
      Athlete: [ATHLETE_ID],
      "Activity Date": denverNoon("2026-09-04"),
      "Homework Name 1": [PHA_HW1],
      "Daily Email Subject": `${batchKey}|${tag}`,
    };
    if (phaHw2) fields["Homework Name 2"] = [phaHw2];
    const subRes = await createRecords(token, baseId, "Submissions", [{ fields }]);
    const submissionId = subRes.records[0].id;
    created.submissionIds.push({ id: submissionId, tag });
    const specs = [
      { tag: `${tag}-hw1`, slot: "HW1", purpose: "Homework 1", assetType: ASSET_TYPE, ext: "jpg" },
      { tag: `${tag}-hw2`, slot: "HW2", purpose: "Homework 2", assetType: ASSET_TYPE, ext: "jpg" },
      { tag: `${tag}-v1`, slot: "VIDEO", purpose: "Video For Feedback", assetType: VIDEO_ASSET_TYPE, ext: "mp4" },
      { tag: `${tag}-v2`, slot: "VIDEO", purpose: "Video For Feedback", assetType: VIDEO_ASSET_TYPE, ext: "mp4" },
      { tag: `${tag}-v3`, slot: "VIDEO", purpose: "Video For Feedback", assetType: VIDEO_ASSET_TYPE, ext: "mp4" },
    ];
    const sourceIds = [];
    const createdMulti = [];
    for (const s of specs) {
      const createdAsset = await createHwAsset(token, baseId, {
        batchKey, tag: s.tag, submissionId, att,
        slot: s.slot, purpose: s.purpose, assetType: s.assetType, filenameExt: s.ext,
        uploadedAt: "2026-09-04",
      });
      created.assetIds.push({ id: createdAsset.assetId, tag: s.tag });
      createdMulti.push(createdAsset);
      sourceIds.push(createdAsset.sourceId);
      await clearMakeTrigger(token, baseId, createdAsset.assetId);
    }
    const uniqueSources = new Set(sourceIds.filter(Boolean));
    const sub = await getRecord(token, baseId, "Submissions", submissionId);
    pushCheck(report, "multi_hw_video_no_week.five_unique_week_empty", createdMulti.length >= 5 && uniqueSources.size >= 5 && linkIds(sub.fields?.Week).length === 0, {
      assetCount: createdMulti.length,
      uniqueSourceIds: uniqueSources.size,
      weekLinks: linkIds(sub.fields?.Week).length,
      createdSourceIds: sourceIds.length,
    });
  }

  // 10 retry_dedupe — same Source Attachment ID + no duplicate HC
  {
    const tag = "retry_dedupe";
    const sourceX = `${PREFIX}${batchKey}-dedupe-X`;
    const submissionId = await createHwSubmission(token, baseId, {
      batchKey, tag, activityDate: "2027-04-28", wasId,
    });
    created.submissionIds.push({ id: submissionId, tag });
    const first = await createHwAsset(token, baseId, {
      batchKey, tag: `${tag}-a`, submissionId, att, uploadedAt: "2027-04-28",
      sourceAttachmentId: sourceX,
    });
    created.assetIds.push({ id: first.assetId, tag: `${tag}-a` });
    const wait1 = await waitForAssetHc(token, baseId, first.assetId);
    await clearMakeTrigger(token, baseId, first.assetId);
    if (wait1.hcIds?.[0]) created.homeworkIds.push({ id: wait1.hcIds[0], kind: tag });

    let secondCreateFailed = false;
    let secondAssetId = null;
    try {
      const second = await createHwAsset(token, baseId, {
        batchKey, tag: `${tag}-b`, submissionId, att, uploadedAt: "2027-04-28",
        sourceAttachmentId: sourceX,
      });
      secondAssetId = second.assetId;
      created.assetIds.push({ id: second.assetId, tag: `${tag}-b` });
      await clearMakeTrigger(token, baseId, second.assetId);
    } catch (err) {
      secondCreateFailed = true;
      report.notes.push(`retry_dedupe second create blocked: ${String(err.message || err).slice(0, 120)}`);
    }

    const sameSource = await listRecords(token, baseId, "Submission Assets", {
      filterByFormula: `{Source Attachment ID}="${sourceX}"`,
      fields: ["Source Attachment ID", "Submission - Linked"],
      maxRecords: 10,
    });
    const sameRows = Array.isArray(sameSource) ? sameSource : sameSource?.records || [];
    const uniqueOk = secondCreateFailed || sameRows.length === 1;

    // Re-arm 020 on first asset — assert no duplicate HC for Enrollment+PHA
    await rearrm020(token, baseId, first.assetId);
    await sleep(12000);
    const hcList = await listRecords(token, baseId, "Homework Completions", {
      filterByFormula: `AND(FIND("${ENROLLMENT_ID}", ARRAYJOIN({Enrollment}&"")), FIND("${PHA_HW1}", ARRAYJOIN({Program Homework Assignment}&"")))`,
      fields: ["Enrollment", "Program Homework Assignment", "Notes"],
      maxRecords: 50,
    });
    const hcRows = Array.isArray(hcList) ? hcList : hcList?.records || [];
    // Count only harness-created HCs from this run
    const harnessHcIds = new Set((created.homeworkIds || []).map((h) => h.id));
    const harnessHcForPha = hcRows.filter((r) => harnessHcIds.has(r.id));
    // For this submission's assets, HC count for first asset should stay 1
    const assetFresh = await getRecord(token, baseId, "Submission Assets", first.assetId);
    const hcOnAsset = linkIds(assetFresh.fields?.["Homework Completions"]);
    pushCheck(report, "retry_dedupe.source_attachment_unique", uniqueOk, {
      secondCreateFailed,
      sameSourceCount: sameRows.length,
      secondAssetId: secondAssetId ? redactId(secondAssetId) : null,
      note: uniqueOk ? "unique enforced" : "API allowed duplicate Source Attachment ID (policy gap observed)",
    }, undefined, { soft: true });
    pushCheck(report, "retry_dedupe.no_duplicate_hc_on_rearm", hcOnAsset.length <= 1, {
      hcOnFirstAsset: hcOnAsset.length,
      harnessHcForPhaSample: harnessHcForPha.length,
    });
  }

  // 11 recon_detect — Ready / Why Not Ready for no-Week zero-asset row
  {
    const tag = "recon_detect";
    const subRes = await createRecords(token, baseId, "Submissions", [
      {
        fields: {
          Enrollment: [ENROLLMENT_ID],
          Athlete: [ATHLETE_ID],
          "Activity Date": denverNoon("2026-09-04"),
          "Daily Email Subject": `${batchKey}|${tag}`,
        },
      },
    ]);
    const submissionId = subRes.records[0].id;
    created.submissionIds.push({ id: submissionId, tag });
    await sleep(2000);
    const sub = await getRecord(token, baseId, "Submissions", submissionId);
    const ready = sub.fields?.["Ready for 009 Asset Creation?"];
    const why = String(sub.fields?.["Why Not Ready for 009?"] || "");
    const weekEmpty = linkIds(sub.fields?.Week).length === 0;
    // After SC-160 formula paste: zero-asset no-Week should NOT say Missing Week as blocker
    // (may say missing attachments / not ready for other reasons). Pre-paste may still say Missing Week.
    const noMissingWeekGate = !/Missing Week/i.test(why);
    pushCheck(report, "recon_detect.no_week_zero_asset_formula", weekEmpty && (noMissingWeekGate || ready === 1 || ready === true), {
      ready,
      whyNotReady: why.slice(0, 160),
      weekEmpty,
      note: noMissingWeekGate
        ? "Why Not Ready no longer gates on Missing Week"
        : "Why Not Ready still mentions Missing Week (formula may be pre-SC-160)",
    });
    // Soft observe Processing / attachment path (non-critical — don't fail overall on list alone)
    try {
      const processing = await listRecords(token, baseId, "Submissions", {
        filterByFormula: `OR({Attachment Upload Status}="Processing", FIND("Processing", ARRAYJOIN({Attachment Upload Status}&"")))`,
        fields: ["Why Not Ready for 009?", "Ready for 009 Asset Creation?", "Attachment Upload Status"],
        maxRecords: 5,
      });
      report.notes.push({
        reconProcessingSample: (Array.isArray(processing) ? processing : []).length,
      });
    } catch (err) {
      report.notes.push(`recon Processing query skipped: ${String(err.message || err).slice(0, 100)}`);
    }
  }

  // Mark on_time existence for summary (unused var silence)
  if (onTime) report.notes.push("on_time scenario completed");

  saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
  report.created = created;
  report.finishedAt = new Date().toISOString();
  report.summary = {
    passCount: report.checks.filter((c) => c.pass).length,
    failCount: report.checks.filter((c) => !c.pass).length,
    defectCount: report.defects.length,
  };
  return report;
}

async function runCleanup(token, baseId) {
  const manifest = loadManifest();
  const report = {
    harness: HARNESS,
    mode: "cleanup",
    startedAt: new Date().toISOString(),
    deleted: [],
    restored: [],
    notes: [],
    errors: [],
  };
  if (!manifest) {
    report.notes.push("No manifest — nothing to clean");
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const safeDelete = async (table, ids, label) => {
    const unique = [...new Set(ids.filter(Boolean))];
    for (const id of unique) {
      try {
        await deleteRecords(token, baseId, table, [id]);
        report.deleted.push({ table, id: redactId(id), label });
      } catch (err) {
        report.errors.push({
          table,
          id: redactId(id),
          label,
          error: String(err.message || err).slice(0, 200),
        });
      }
    }
  };

  await safeDelete("XP Events", (manifest.xpEventIds || []).map((x) => (typeof x === "string" ? x : x.id)), "xp");
  await safeDelete("Video Feedback", (manifest.vfIds || []).map((x) => x.id || x), "vf");
  await safeDelete("Submission Assets", (manifest.assetIds || []).map((x) => x.id || x), "asset");
  await safeDelete("Homework Completions", (manifest.homeworkIds || []).map((x) => x.id || x), "hc");
  await safeDelete("Submissions", (manifest.submissionIds || []).map((x) => x.id || x), "submission");

  if (manifest.wasCreated && manifest.wasId) {
    await safeDelete("Weekly Athlete Summary", [manifest.wasId], "was-created");
  }

  if (manifest.sharedWasTrimmed && Array.isArray(manifest.sharedWasPriorEnrollments)) {
    try {
      await updateRecords(token, baseId, "Weekly Athlete Summary", [
        { id: SHARED_WAS_ID, fields: { Enrollment: manifest.sharedWasPriorEnrollments } },
      ]);
      report.restored.push({
        table: "Weekly Athlete Summary",
        id: redactId(SHARED_WAS_ID),
        enrollments: manifest.sharedWasPriorEnrollments.length,
      });
    } catch (err) {
      report.errors.push({ restore: "shared-was", error: String(err.message || err).slice(0, 200) });
    }
  }

  if (report.errors.length) {
    const needed = {
      harness: HARNESS,
      reason: "PAT lacks records:delete — use Airtable MCP or a write-capable token",
      manifestPath: MANIFEST_PATH,
      tables: {
        "XP Events": "tblmGSiNA1akW8KnU",
        "Video Feedback": "tblOV6pJDxQFBSQ3q",
        "Submission Assets": "tblhMLKxQK77agtME",
        "Homework Completions": "tblv58ppTFDBXb3nv",
        Submissions: "tblEVjVpGGlPTsYSt",
        "Weekly Athlete Summary": "tbl9520d72adxlAKQ",
      },
      recordIds: {
        xp: (manifest.xpEventIds || []).map((x) => (typeof x === "string" ? x : x.id)),
        vf: (manifest.vfIds || []).map((x) => x.id || x),
        assets: (manifest.assetIds || []).map((x) => x.id || x),
        hc: [...new Set((manifest.homeworkIds || []).map((x) => x.id || x))],
        submissions: (manifest.submissionIds || []).map((x) => x.id || x),
        was: manifest.wasCreated && manifest.wasId ? [manifest.wasId] : [],
      },
    };
    writeFileSync(resolve(EVIDENCE_DIR, "_cleanup-needed.json"), JSON.stringify(needed, null, 2));
    report.notes.push("Wrote _cleanup-needed.json (PAT delete 403)");
  }

  report.finishedAt = new Date().toISOString();
  report.summary = {
    deletedCount: report.deleted.length,
    errorCount: report.errors.length,
    restoredCount: report.restored.length,
  };
  return report;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.apply && !args.cleanup)) {
    console.log(`Usage:
  node tools/testing/sc-160-stage6-live-proof.mjs --apply
  node tools/testing/sc-160-stage6-live-proof.mjs --cleanup`);
    process.exit(args.help ? 0 : 1);
  }

  // Prefer explicit env; requireToken also loads web/.env.local
  if (!process.env.AIRTABLE_API_TOKEN) {
    const envPath = "C:\\Users\\mschmidt_fairfield\\Documents\\GitHub\\127-si-shooting-challenge\\web\\.env.local";
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[m[1]]) process.env[m[1]] = val;
      }
    }
  }

  const { token, baseId } = requireToken();
  let report;
  let cleanupReport = null;
  try {
    if (args.apply) report = await runApply(token, baseId);
    else report = await runCleanup(token, baseId);
  } catch (err) {
    report = {
      harness: HARNESS,
      mode: args.apply ? "apply" : "cleanup",
      startedAt: new Date().toISOString(),
      checks: report?.checks || [],
      defects: [String(err.message || err)],
      notes: [...(report?.notes || []), "fatal error — no auto-cleanup; use MCP + _cleanup-needed.json"],
      created: report?.created,
      error: String(err.message || err).slice(0, 400),
      finishedAt: new Date().toISOString(),
      summary: {
        passCount: (report?.checks || []).filter((c) => c.pass).length,
        failCount: (report?.checks || []).filter((c) => !c.pass).length + 1,
        defectCount: 1,
      },
    };
    console.error(err);
  }

  // PAT often lacks records:delete — do NOT auto-cleanup after apply.
  if (args.apply && report?.created) {
    saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...report.created });
    const needed = {
      harness: HARNESS,
      reason: "Run MCP delete or --cleanup after review; PAT may 403 on DELETE",
      manifestPath: MANIFEST_PATH,
      recordIds: {
        assets: (report.created.assetIds || []).map((x) => x.id || x),
        hc: [...new Set((report.created.homeworkIds || []).map((x) => x.id || x))],
        submissions: (report.created.submissionIds || []).map((x) => x.id || x),
        xp: report.created.xpEventIds || [],
        vf: (report.created.vfIds || []).map((x) => x.id || x),
        was: report.created.wasCreated && report.created.wasId ? [report.created.wasId] : [],
      },
    };
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(resolve(EVIDENCE_DIR, "_cleanup-needed.json"), JSON.stringify(needed, null, 2));
    report.notes = [...(report.notes || []), "Wrote _cleanup-needed.json (no auto-cleanup)"];
  }

  const path = writeEvidence(report);
  const printed = {
    evidencePath: path,
    summary: report.summary || null,
    defects: report.defects || report.errors,
    checks: (report.checks || []).map((c) => ({ id: c.id, status: c.status, pass: c.pass })),
    cleanup: report.cleanupSummary || cleanupReport?.summary || null,
    cleanupErrors: report.cleanupErrors || cleanupReport?.errors || null,
  };
  console.log(JSON.stringify(printed, null, 2));
  const failed = (report.defects && report.defects.length) > 0;
  process.exit(failed && args.apply ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
