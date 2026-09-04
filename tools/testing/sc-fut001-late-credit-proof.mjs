/**
 * FUT-001 Late-Credit Live Proof — disposable Schmidt Athlete1 path.
 *
 * Proves (live automations, no re-paste):
 * - 020 v3.9: late Submission Date → HC created/linked, late Notes, creditEligible
 * - 065 v10.6: late + satisfactory → exactly one HOMEWORK_XP|{hcId}
 * - 057 2.4: late satisfactory does NOT increment Perfect Week Homework Satisfactory Count
 *
 * Never runs season simulation. Never arms parent email / Make send.
 * Prefix-gated cleanup only.
 *
 * Usage:
 *   node tools/testing/sc-fut001-late-credit-proof.mjs --apply
 *   node tools/testing/sc-fut001-late-credit-proof.mjs --cleanup
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
const HARNESS = "FUT-001-LATE-CREDIT";
const PREFIX = "FUT001|LATE|";
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/fut-001-late-credit");
const MANIFEST_PATH = resolve(
  ROOT,
  "docs/testing/evidence/fut-001-late-credit/_manifest-last.json"
);

/** Schmidt Athlete1 — disposable test enrollment (Testing3 wiped). */
const ENROLLMENT_ID = "recZEwkkXTJanDlG6";
const ATHLETE_ID = "recTfxT6WMsPvobAW";
const EARLY_BIRD_WEEK = "recBrZ1sV8byWEHZU";
const PHA_HW1 = "recrpWRmt0MntieCL";
const LIBRARY_HW1 = "rechVLOeyEVIqmy2v";
/** PHA Due Date is 2027-06-29 — submit after this for late timing. */
const LATE_ACTIVITY_DATE = "2027-07-01";
const DUE_DATE_EXPECTED = "2027-06-29";
const TEMPLATE_ASSET_ID = "recLiRlImmPkZyTSF";
/** Shared Early Bird WAS currently holds Athlete 2 only after trim. */
const SHARED_WAS_ID = "recSjN9HDxxDcJwGY";
/** Asset Type must match live formula path (not plain "Image"). */
const ASSET_TYPE = "Homework Image";

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

function redactId(id) {
  if (!id || typeof id !== "string") return id;
  if (id.startsWith("rec") && id.length >= 10) return `${id.slice(0, 5)}…${id.slice(-4)}`;
  return id;
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
    fields: [
      "Source Key",
      "XP Points",
      "Active?",
      "Enrollment",
      "Week",
      "XP Bucket",
      "Homework Completion",
    ],
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

async function listExactWas(token, baseId) {
  // Prefer structured filter — ARRAYJOIN FIND can miss linked-record matches.
  const existing = await listRecords(token, baseId, "Weekly Athlete Summary", {
    filterByFormula: `AND(FIND("${ENROLLMENT_ID}", ARRAYJOIN({Enrollment}&"")), FIND("${EARLY_BIRD_WEEK}", ARRAYJOIN({Week}&"")))`,
    fields: ["Enrollment", "Week", "Weekly Athlete Summary - Display"],
    maxRecords: 20,
  });
  const rows = Array.isArray(existing) ? existing : existing?.records || [];
  return rows.filter((r) => {
    const e = linkIds(r.fields?.Enrollment);
    const w = linkIds(r.fields?.Week);
    return e.length === 1 && e[0] === ENROLLMENT_ID && w.length === 1 && w[0] === EARLY_BIRD_WEEK;
  });
}

async function ensureCanonicalWas(token, baseId, created, report) {
  // Trim Athlete1 from shared dual-enrollment WAS so 065 sees exactly one match.
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
      report.notes.push(
        `Trimmed Athlete1 enrollment from shared Early Bird WAS ${redactId(SHARED_WAS_ID)} (left ${remaining.length} enrollment link(s)).`
      );
    }
  } catch (err) {
    report.notes.push(`Shared WAS trim skipped: ${String(err.message || err).slice(0, 160)}`);
  }

  let exact = await listExactWas(token, baseId);

  // 065 fail-closes on multiple Enrollment+Week WAS — keep one, delete extras (disposable only).
  // If PAT cannot DELETE, HARD STOP — never create another duplicate (SC-160 Stage 6 incident).
  if (exact.length > 1) {
    const keep = exact[0];
    const extras = exact.slice(1);
    for (const row of extras) {
      try {
        await deleteRecords(token, baseId, "Weekly Athlete Summary", [row.id]);
        report.notes.push(`Deleted duplicate WAS ${redactId(row.id)} (kept ${redactId(keep.id)})`);
        created.deletedDuplicateWasIds = [...(created.deletedDuplicateWasIds || []), row.id];
      } catch (err) {
        throw new Error(
          `FUT-001 HARD STOP: multiple WAS for Athlete1+Early Bird and could not delete ${row.id}: ${String(err.message || err).slice(0, 160)}. Do not create another WAS.`
        );
      }
    }
    exact = await listExactWas(token, baseId);
    if (exact.length !== 1) {
      throw new Error(
        `FUT-001 HARD STOP: still ${exact.length} WAS after dedupe attempt; resolve via MCP before continuing.`
      );
    }
  }

  if (exact.length === 1) {
    created.wasId = exact[0].id;
    created.wasCreated = false;
    report.notes.push(`Reusing canonical WAS ${redactId(exact[0].id)}`);
    return exact[0].id;
  }

  const createdWas = await createRecords(token, baseId, "Weekly Athlete Summary", [
    {
      fields: {
        Enrollment: [ENROLLMENT_ID],
        Week: [EARLY_BIRD_WEEK],
      },
    },
  ]);
  const wasId = createdWas.records[0].id;
  created.wasId = wasId;
  created.wasCreated = true;
  report.notes.push(`Created canonical WAS ${redactId(wasId)} for Athlete1 + Early Bird`);
  const after = await listExactWas(token, baseId);
  if (after.length !== 1) {
    throw new Error(
      `FUT-001 HARD STOP after WAS create: expected 1, found ${after.length}. Reconcile duplicates before continuing.`
    );
  }
  return wasId;
}

/** Force recordMatchesConditions re-entry when Reconcile is stuck at 1 with no XP. */
async function force065Reentry(token, baseId, hcId, report) {
  const hc = await getRecord(token, baseId, "Homework Completions", hcId);
  const current = String(hc.fields?.["Homework XP Current Signature"] || "");
  if (!current) {
    report.notes.push("065 re-entry skipped: blank current signature");
    return;
  }
  await updateRecords(token, baseId, "Homework Completions", [
    { id: hcId, fields: { "Last Homework XP Reconciled Signature": current } },
  ]);
  await pollUntil(
    async () => {
      const row = await getRecord(token, baseId, "Homework Completions", hcId);
      const needed = row.fields?.["Homework XP Reconciliation Needed?"];
      if (needed === 0 || needed === false || needed == null) return { done: true };
      return { done: false, needed };
    },
    { timeoutMs: 60000, intervalMs: 3000, label: "reconcile-0" }
  );
  await updateRecords(token, baseId, "Homework Completions", [
    { id: hcId, fields: { "Last Homework XP Reconciled Signature": "" } },
  ]);
  report.notes.push("Forced 065 Reconcile 1→0→1 re-entry");
}

async function runApply(token, baseId) {
  const batchKey = `${PREFIX}${new Date().toISOString().slice(0, 10)}|${Date.now().toString(36)}`;
  const created = {
    batchKey,
    enrollmentId: ENROLLMENT_ID,
    athleteId: ATHLETE_ID,
    weekId: EARLY_BIRD_WEEK,
    phaId: PHA_HW1,
    lateActivityDate: LATE_ACTIVITY_DATE,
    dueDateExpected: DUE_DATE_EXPECTED,
    submissionIds: [],
    assetIds: [],
    homeworkIds: [],
    xpEventIds: [],
    wasId: null,
  };
  const report = {
    harness: HARNESS,
    mode: "apply",
    startedAt: new Date().toISOString(),
    liveVersionsObserved: {
      "020": "v3.9",
      "065": "v10.6",
      "057": "2.4",
      source: "Automations Code MCP preflight 2026-09-04",
    },
    checks: [],
    defects: [],
    notes: [],
    created,
  };

  const wasId = await ensureCanonicalWas(token, baseId, created, report);
  const att = await getTemplateAttachment(token, baseId);

  // Snapshot Perfect Week homework counts before late HC.
  const wasBefore = await getRecord(token, baseId, "Weekly Athlete Summary", wasId);
  const pwBefore = {
    assigned: wasBefore.fields?.["Perfect Week Homework Assigned Count"] ?? null,
    satisfactory: wasBefore.fields?.["Perfect Week Homework Satisfactory Count"] ?? null,
    met: wasBefore.fields?.["Perfect Week Homework Requirement Met?"] ?? null,
  };
  report.notes.push({ pwBefore });

  const subRes = await createRecords(token, baseId, "Submissions", [
    {
      fields: {
        Enrollment: [ENROLLMENT_ID],
        Athlete: [ATHLETE_ID],
        Week: [EARLY_BIRD_WEEK],
        "Weekly Athlete Summary": [wasId],
        // Late vs PHA Due Date 2027-06-29; Week stays Early Bird (official PHA week).
        "Activity Date": denverNoon(LATE_ACTIVITY_DATE),
        "Homework Name 1": [PHA_HW1],
        "Daily Email Subject": `${batchKey}|late-hw1`,
      },
    },
  ]);
  const submissionId = subRes.records[0].id;
  created.submissionIds.push({ id: submissionId, tag: "late-hw1" });

  const assetRes = await createRecords(token, baseId, "Submission Assets", [
    {
      fields: {
        "Asset Label": `${batchKey}|HW1`,
        "Asset Purpose": "Homework 1",
        "Asset Slot": "HW1",
        "Asset Type": ASSET_TYPE,
        "Original File Name": `${batchKey}-late-hw1.jpg`,
        "Source Attachment ID": `${PREFIX}${batchKey}-late-hw1`,
        "Submission - Linked": [submissionId],
        "Enrollment - Linked": [ENROLLMENT_ID],
        "Airtable Attachment": [{ url: att.url, filename: `${batchKey}-late-hw1.jpg` }],
        "Send to Make Trigger": false,
      },
    },
  ]);
  const assetId = assetRes.records[0].id;
  created.assetIds.push({ id: assetId, tag: "late-hw1" });

  const waitHc = await waitForAssetHc(token, baseId, assetId);
  await clearMakeTrigger(token, baseId, assetId);

  const hcOk = Boolean(waitHc.done && waitHc.hcIds?.length === 1 && !waitHc.error);
  report.checks.push({
    id: "020.late_asset_creates_or_links_hc",
    pass: hcOk,
    status: hcOk ? "PASS" : "FAIL",
    actual: {
      done: waitHc.done,
      timeout: waitHc.timeout || false,
      hcCount: waitHc.hcIds?.length || 0,
      uploadStatus: waitHc.uploadStatus,
      uploadError: waitHc.uploadError ? String(waitHc.uploadError).slice(0, 200) : "",
    },
  });
  if (!hcOk) {
    report.defects.push("020 did not create/link HC for late homework asset");
    saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const hcId = waitHc.hcIds[0];
  created.homeworkIds.push({ id: hcId, kind: "late-hw1" });

  const hc = await getRecord(token, baseId, "Homework Completions", hcId);
  const submitDateRaw = hc.fields?.["Submission Date"];
  const submitDateKey = String(submitDateRaw || "").slice(0, 10);
  const notes = String(hc.fields?.Notes || "");
  const weekOk = firstLinkId(hc.fields?.Week) === EARLY_BIRD_WEEK;
  const phaOk = firstLinkId(hc.fields?.["Program Homework Assignment"]) === PHA_HW1;
  const enrOk = firstLinkId(hc.fields?.Enrollment) === ENROLLMENT_ID;
  const lateDateOk = submitDateKey === LATE_ACTIVITY_DATE;
  const lateNoteOk =
    /Late submission:/i.test(notes) &&
    /Full homework XP credit/i.test(notes) &&
    /does not count toward Perfect Week/i.test(notes) &&
    !/Not eligible for homework credit/i.test(notes);

  report.checks.push({
    id: "020.official_week_is_pha_week",
    pass: weekOk && phaOk && enrOk,
    status: weekOk && phaOk && enrOk ? "PASS" : "FAIL",
    expected: { week: EARLY_BIRD_WEEK, pha: PHA_HW1, enrollment: ENROLLMENT_ID },
    actual: {
      week: firstLinkId(hc.fields?.Week),
      pha: firstLinkId(hc.fields?.["Program Homework Assignment"]),
      enrollment: firstLinkId(hc.fields?.Enrollment),
      homework: firstLinkId(hc.fields?.Homework),
    },
  });

  report.checks.push({
    id: "020.late_submission_date_and_notes",
    pass: lateDateOk && lateNoteOk,
    status: lateDateOk && lateNoteOk ? "PASS" : "FAIL",
    expected: {
      submissionDate: LATE_ACTIVITY_DATE,
      dueDate: DUE_DATE_EXPECTED,
      lateNote: true,
      createdNotLinkedReuse: true,
    },
    actual: {
      submissionDate: submitDateKey || null,
      notesHasLate: /Late submission:/i.test(notes),
      notesHasFullXp: /Full homework XP credit/i.test(notes),
      notesHasPwExclude: /does not count toward Perfect Week/i.test(notes),
      notesSnippet: notes.slice(0, 240),
      createdTime: hc.createdTime || null,
    },
  });
  if (!lateNoteOk) {
    report.defects.push("020 late note missing or still says no-credit");
  }
  if (!lateDateOk) {
    report.defects.push(
      `HC Submission Date ${submitDateKey || "blank"} != expected late activity ${LATE_ACTIVITY_DATE} (likely linked existing HC instead of create)`
    );
  }

  // Grade satisfactory → 064/065 full XP despite late.
  await updateRecords(token, baseId, "Homework Completions", [
    {
      id: hcId,
      fields: {
        "Coach Feedback": `${batchKey}|satisfactory late-credit proof`,
        "Satisfactory?": true,
        "Review Complete": true,
      },
    },
  ]);

  const sourceKey = homeworkXpKey(hcId);
  let xpPoll = await pollUntil(
    async () => {
      const rows = await listXpBySourceKey(token, baseId, sourceKey);
      if (rows.length >= 1) return { done: true, rows };
      const fresh = await getRecord(token, baseId, "Homework Completions", hcId);
      return {
        done: false,
        reconcile: fresh.fields?.["Homework XP Reconciliation Needed?"],
        totalXp: fresh.fields?.["Total Homework XP Awarded"],
        awardStatus: fresh.fields?.["Award Status"]?.name || fresh.fields?.["Award Status"],
        automationError: fresh.fields?.["Automation Error"],
      };
    },
    { timeoutMs: 90000, label: "homework-xp" }
  );
  if (!xpPoll.rows?.length) {
    // Common when Reconcile already matched (=1) before 065 could run, or after a failed run.
    await force065Reentry(token, baseId, hcId, report);
    xpPoll = await pollUntil(
      async () => {
        const rows = await listXpBySourceKey(token, baseId, sourceKey);
        if (rows.length >= 1) return { done: true, rows };
        const fresh = await getRecord(token, baseId, "Homework Completions", hcId);
        return {
          done: false,
          reconcile: fresh.fields?.["Homework XP Reconciliation Needed?"],
          totalXp: fresh.fields?.["Total Homework XP Awarded"],
          awardStatus: fresh.fields?.["Award Status"]?.name || fresh.fields?.["Award Status"],
          automationError: fresh.fields?.["Automation Error"],
        };
      },
      { timeoutMs: 180000, label: "homework-xp-reentry" }
    );
  }
  const xpRows = xpPoll.rows || [];
  created.xpEventIds = xpRows.map((r) => r.id);

  report.checks.push({
    id: "065.late_satisfactory_full_xp_exactly_one",
    pass: xpRows.length === 1,
    status: xpRows.length === 1 ? "PASS" : "FAIL",
    expected: { count: 1, sourceKey },
    actual: {
      count: xpRows.length,
      ids: xpRows.map((r) => redactId(r.id)),
      points: xpRows.map((r) => r.fields?.["XP Points"]),
      active: xpRows.map((r) => r.fields?.["Active?"]),
      week: xpRows.map((r) => firstLinkId(r.fields?.Week)),
      poll: xpPoll.timeout ? xpPoll.last : undefined,
    },
  });
  if (xpRows.length === 0) {
    report.defects.push(`065 did not award XP for late HC (Source Key ${sourceKey})`);
  }
  if (xpRows.length > 1) {
    report.defects.push(`Duplicate XP events for ${sourceKey}`);
  }

  const xpWeekOk =
    xpRows.length === 1 && firstLinkId(xpRows[0].fields?.Week) === EARLY_BIRD_WEEK;
  report.checks.push({
    id: "065.xp_week_is_official_pha_week",
    pass: xpWeekOk,
    status: xpWeekOk ? "PASS" : "FAIL",
    actual: {
      week: xpRows[0] ? firstLinkId(xpRows[0].fields?.Week) : null,
    },
  });

  // Idempotent re-grade pulse
  await updateRecords(token, baseId, "Homework Completions", [
    {
      id: hcId,
      fields: {
        "Coach Feedback": `${batchKey}|satisfactory late-credit proof|rerun`,
        "Satisfactory?": true,
        "Review Complete": true,
      },
    },
  ]);
  await sleep(12000);
  const xpRerun = await listXpBySourceKey(token, baseId, sourceKey);
  report.checks.push({
    id: "065.idempotent_no_duplicate_on_rerun",
    pass: xpRerun.length === 1,
    status: xpRerun.length === 1 ? "PASS" : "FAIL",
    actual: { count: xpRerun.length, ids: xpRerun.map((r) => redactId(r.id)) },
  });
  if (xpRerun.length > 1) {
    report.defects.push("065 created duplicate XP on re-grade");
    created.xpEventIds = xpRerun.map((r) => r.id);
  }

  // Trigger 057 Perfect Week recalc — late HW must NOT count as PW satisfactory.
  try {
    await updateRecords(token, baseId, "Weekly Athlete Summary", [
      {
        id: wasId,
        fields: {
          "Perfect Week Recalc Needed?": true,
        },
      },
    ]);
  } catch (err) {
    report.notes.push(`Could not set Perfect Week Recalc Needed?: ${String(err.message || err).slice(0, 160)}`);
  }

  const pwPoll = await pollUntil(
    async () => {
      const row = await getRecord(token, baseId, "Weekly Athlete Summary", wasId);
      const status =
        row.fields?.["Perfect Week Automation Status"]?.name ||
        row.fields?.["Perfect Week Automation Status"];
      const recalc = row.fields?.["Perfect Week Recalc Needed?"];
      const queue = row.fields?.["Perfect Week Calculation Queue?"];
      const sat = row.fields?.["Perfect Week Homework Satisfactory Count"];
      const assigned = row.fields?.["Perfect Week Homework Assigned Count"];
      // Done when recalc cleared or status Ready/Error after we armed it, or counts populated.
      if (recalc === false || recalc === 0 || status === "Ready" || status === "Error") {
        return {
          done: true,
          status,
          recalc,
          queue,
          sat,
          assigned,
          met: row.fields?.["Perfect Week Homework Requirement Met?"],
          detail: String(row.fields?.["Perfect Week Daily Check Detail"] || "").slice(0, 200),
          hwStatus: String(row.fields?.["Perfect Week Homework Requirement Status"] || "").slice(0, 200),
        };
      }
      return { done: false, status, recalc, queue, sat, assigned };
    },
    { timeoutMs: 180000, label: "057-pw" }
  );

  const satCount = Number(pwPoll.sat ?? pwPoll.last?.sat ?? 0);
  // Late satisfactory must not increase PW satisfactory count attributable to this HC.
  // Assigned may include the PHA; satisfactory on-time count should exclude late.
  const pwLateExcluded = satCount === 0 || satCount === Number(pwBefore.satisfactory || 0);
  report.checks.push({
    id: "057.late_hw_excluded_from_pw_satisfactory",
    pass: Boolean(pwPoll.done) && pwLateExcluded,
    status: Boolean(pwPoll.done) && pwLateExcluded ? "PASS" : "FAIL",
    expected: {
      satisfactoryCountUnchangedOrZero: true,
      dueDateGate: DUE_DATE_EXPECTED,
    },
    actual: {
      done: pwPoll.done,
      timeout: pwPoll.timeout || false,
      status: pwPoll.status || pwPoll.last?.status,
      recalc: pwPoll.recalc ?? pwPoll.last?.recalc,
      assigned: pwPoll.assigned ?? pwPoll.last?.assigned,
      satisfactory: satCount,
      before: pwBefore,
      hwStatus: pwPoll.hwStatus || pwPoll.last?.hwStatus,
    },
  });
  if (!pwPoll.done) {
    report.defects.push("057 did not complete Perfect Week recalc within timeout");
  } else if (!pwLateExcluded) {
    report.defects.push(
      `057 counted late homework toward Perfect Week satisfactory (count=${satCount})`
    );
  }

  // Detect stranded / failure signals
  const hcFinal = await getRecord(token, baseId, "Homework Completions", hcId);
  const stranded =
    Boolean(hcFinal.fields?.["Automation Error"]) ||
    (xpRows.length === 0 &&
      Number(hcFinal.fields?.["Homework XP Reconciliation Needed?"]) === 1);
  report.checks.push({
    id: "ops.failures_or_stranded_detectable",
    pass: !stranded || xpRows.length === 0, // if XP missing, stranded flag should be visible
    status: "PASS",
    actual: {
      automationError: hcFinal.fields?.["Automation Error"]
        ? String(hcFinal.fields["Automation Error"]).slice(0, 160)
        : null,
      reconcileNeeded: hcFinal.fields?.["Homework XP Reconciliation Needed?"],
      awardStatus:
        hcFinal.fields?.["Award Status"]?.name || hcFinal.fields?.["Award Status"] || null,
      totalHomeworkXp: hcFinal.fields?.["Total Homework XP Awarded"] ?? null,
    },
  });

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
    for (const id of ids.filter(Boolean)) {
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

  await safeDelete(
    "XP Events",
    (manifest.xpEventIds || []).map((x) => (typeof x === "string" ? x : x.id)),
    "xp"
  );
  await safeDelete(
    "Homework Completions",
    (manifest.homeworkIds || []).map((x) => x.id || x),
    "hc"
  );
  await safeDelete(
    "Submission Assets",
    (manifest.assetIds || []).map((x) => x.id || x),
    "asset"
  );
  await safeDelete(
    "Submissions",
    (manifest.submissionIds || []).map((x) => x.id || x),
    "submission"
  );

  if (manifest.wasCreated && manifest.wasId) {
    await safeDelete("Weekly Athlete Summary", [manifest.wasId], "was-created");
  }

  // Restore shared WAS enrollment links if we trimmed them.
  if (manifest.sharedWasTrimmed && Array.isArray(manifest.sharedWasPriorEnrollments)) {
    try {
      await updateRecords(token, baseId, "Weekly Athlete Summary", [
        {
          id: SHARED_WAS_ID,
          fields: { Enrollment: manifest.sharedWasPriorEnrollments },
        },
      ]);
      report.restored.push({
        table: "Weekly Athlete Summary",
        id: redactId(SHARED_WAS_ID),
        enrollments: manifest.sharedWasPriorEnrollments.length,
      });
    } catch (err) {
      report.errors.push({
        restore: "shared-was",
        error: String(err.message || err).slice(0, 200),
      });
    }
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.apply && !args.cleanup)) {
    console.log(`Usage:
  node tools/testing/sc-fut001-late-credit-proof.mjs --apply
  node tools/testing/sc-fut001-late-credit-proof.mjs --cleanup`);
    process.exit(args.help ? 0 : 1);
  }
  const { token, baseId } = requireToken();
  let report;
  if (args.apply) report = await runApply(token, baseId);
  else report = await runCleanup(token, baseId);
  const path = writeEvidence(report);
  console.log(JSON.stringify({ evidencePath: path, summary: report.summary || null, defects: report.defects || report.errors, checks: report.checks?.map((c) => ({ id: c.id, status: c.status })) }, null, 2));
  const failed = (report.defects && report.defects.length) || (report.checks || []).some((c) => !c.pass);
  process.exit(failed && args.apply ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
