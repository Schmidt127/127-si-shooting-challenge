/**
 * SC-160 weekless WAS → 065 live proof (disposable Athlete1 path).
 *
 * Proves live 020 v4.1:
 * - Weekless Submission + HW asset → HC Week = PHA.Week
 * - Exactly one WAS for Enrollment + PHA Week (020 find-or-create)
 * - HC links to that WAS; Submission.Week stays empty
 * - Satisfactory → exactly one HOMEWORK_XP|{hcId}
 * - 020 / 065 retry → no duplicate HC / WAS / XP
 *
 * Does NOT pre-create WAS (020 must create it).
 * Never touches Mike reported Rene evidence. Never Season Simulation.
 *
 * Usage:
 *   node tools/testing/sc-160-weekless-was-proof.mjs --apply
 *   node tools/testing/sc-160-weekless-was-proof.mjs --cleanup
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
const HARNESS = "SC-160-WEEKLESS-WAS";
const PREFIX = "SC160|WL|";
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/sc-160-stage6");
const MANIFEST_PATH = resolve(EVIDENCE_DIR, "_weekless-was-manifest-last.json");

const ENROLLMENT_ID = "recZEwkkXTJanDlG6";
const ATHLETE_ID = "recTfxT6WMsPvobAW";
const EARLY_BIRD_WEEK = "recBrZ1sV8byWEHZU";
const PHA_HW1 = "recrpWRmt0MntieCL";
const TEMPLATE_ASSET_ID = "recLiRlImmPkZyTSF";
const ASSET_TYPE = "Homework Image";
/** On-time date inside Early Bird week window. */
const ACTIVITY_DATE = "2027-04-28";

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
    `weekless-was-${report.mode}-${new Date().toISOString().replace(/[:.]/g, "")}.json`
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

function choiceName(value) {
  if (!value) return "";
  if (typeof value === "object") return String(value.name || value.id || "");
  return String(value);
}

function pushCheck(report, id, pass, actual, expected) {
  report.checks.push({
    id,
    pass: Boolean(pass),
    status: pass ? "PASS" : "FAIL",
    ...(expected ? { expected } : {}),
    actual,
  });
  if (!pass) report.defects.push(id);
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

async function listExactWas(token, baseId) {
  // FIND(ARRAYJOIN({Week})) intermittently misses linked rows. Prefer Summary Key text.
  const existing = await listRecords(token, baseId, "Weekly Athlete Summary", {
    filterByFormula: `AND(FIND("Early Bird", {Summary Key}&""), FIND("2026-2027", {Summary Key}&""))`,
    fields: ["Enrollment", "Week", "Summary Key", "Submissions", "Homework Completions Link"],
    maxRecords: 100,
  });
  const rows = Array.isArray(existing) ? existing : existing?.records || [];
  return rows.filter((r) => {
    const e = linkIds(r.fields?.Enrollment);
    const w = linkIds(r.fields?.Week);
    return e.length === 1 && e[0] === ENROLLMENT_ID && w.length === 1 && w[0] === EARLY_BIRD_WEEK;
  });
}

async function listXpBySourceKey(token, baseId, sourceKey) {
  const res = await listRecords(token, baseId, "XP Events", {
    filterByFormula: `{Source Key}="${sourceKey}"`,
    fields: ["Source Key", "XP Points", "Active?", "Week"],
    maxRecords: 10,
  });
  return Array.isArray(res) ? res : res?.records || [];
}

async function getTemplateAttachment(token, baseId) {
  const row = await getRecord(token, baseId, "Submission Assets", TEMPLATE_ASSET_ID);
  const atts = row.fields?.["Airtable Attachment"] || [];
  const first = Array.isArray(atts) ? atts[0] : null;
  if (!first?.url) throw new Error("Template asset missing Airtable Attachment URL");
  return { url: first.url, filename: first.filename || "template.jpg" };
}

async function clearMakeTrigger(token, baseId, assetId) {
  await updateRecords(token, baseId, "Submission Assets", [
    { id: assetId, fields: { "Send to Make Trigger": false } },
  ]);
}

async function waitForAssetHc(token, baseId, assetId, timeoutMs = 180000) {
  return pollUntil(
    async () => {
      const row = await getRecord(token, baseId, "Submission Assets", assetId);
      const hcIds = linkIds(row.fields?.["Homework Completions"]);
      const uploadStatus = choiceName(row.fields?.["Upload Status"]);
      const uploadError = row.fields?.["Upload Error"] || "";
      if (hcIds.length) {
        return { done: true, hcIds, uploadStatus, uploadError };
      }
      if (String(uploadStatus).toLowerCase() === "error") {
        return { done: true, error: true, hcIds: [], uploadStatus, uploadError };
      }
      return { done: false, uploadStatus, uploadError };
    },
    { timeoutMs, intervalMs: 6000, label: `asset:${assetId}` }
  );
}

async function rearrm020(token, baseId, assetId) {
  await updateRecords(token, baseId, "Submission Assets", [
    { id: assetId, fields: { "Enrollment - Linked": [] } },
  ]);
  await sleep(2500);
  await updateRecords(token, baseId, "Submission Assets", [
    {
      id: assetId,
      fields: { "Enrollment - Linked": [ENROLLMENT_ID], "Send to Make Trigger": false },
    },
  ]);
  await sleep(8000);
}

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
  await pollUntil(async () => {
    const row = await getRecord(token, baseId, "Homework Completions", hcId);
    const needed = row.fields?.["Homework XP Reconciliation Needed?"];
    if (needed === 0 || needed === false || needed == null) return { done: true };
    return { done: false, needed };
  }, { timeoutMs: 60000, intervalMs: 3000, label: "reconcile-0" });
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
    phaWeekId: EARLY_BIRD_WEEK,
    phaId: PHA_HW1,
    submissionIds: [],
    assetIds: [],
    homeworkIds: [],
    xpEventIds: [],
    wasId: null,
    wasCreatedBy020: null,
  };
  const report = {
    harness: HARNESS,
    mode: "apply",
    startedAt: new Date().toISOString(),
    liveVersionsExpected: { "020": "v4.1", "065": "v10.7" },
    checks: [],
    defects: [],
    notes: [],
    created,
  };

  // Precondition: zero WAS for Athlete1+Early Bird so 020 must create (or we prove reuse of exactly one).
  let preWas = await listExactWas(token, baseId);
  if (preWas.length > 1) {
    throw new Error(
      `HARD STOP: ${preWas.length} Athlete1+Early Bird WAS before proof. Clean duplicates via MCP first.`
    );
  }
  const preWasIds = new Set(preWas.map((r) => r.id));
  report.notes.push({ preWasCount: preWas.length, preWasIds: [...preWasIds].map(redactId) });

  const att = await getTemplateAttachment(token, baseId);

  // Weekless submission — no Week, no WAS link.
  const subRes = await createRecords(token, baseId, "Submissions", [
    {
      fields: {
        Enrollment: [ENROLLMENT_ID],
        Athlete: [ATHLETE_ID],
        "Activity Date": denverNoon(ACTIVITY_DATE),
        "Homework Name 1": [PHA_HW1],
        "Daily Email Subject": `${batchKey}|weekless-hw1`,
      },
    },
  ]);
  const submissionId = subRes.records[0].id;
  created.submissionIds.push({ id: submissionId, tag: "weekless-hw1" });

  const assetRes = await createRecords(token, baseId, "Submission Assets", [
    {
      fields: {
        "Asset Label": `${batchKey}|HW1`,
        "Asset Purpose": "Homework 1",
        "Asset Slot": "HW1",
        "Asset Type": ASSET_TYPE,
        "Original File Name": `${batchKey}-weekless-hw1.jpg`,
        "Source Attachment ID": `${PREFIX}${batchKey}-weekless-hw1`,
        "Submission - Linked": [submissionId],
        "Enrollment - Linked": [ENROLLMENT_ID],
        "Airtable Attachment": [{ url: att.url, filename: `${batchKey}-weekless-hw1.jpg` }],
        "Uploaded At": denverNoon(ACTIVITY_DATE),
        "Send to Make Trigger": false,
      },
    },
  ]);
  const assetId = assetRes.records[0].id;
  created.assetIds.push({ id: assetId, tag: "weekless-hw1" });

  const waitHc = await waitForAssetHc(token, baseId, assetId);
  await clearMakeTrigger(token, baseId, assetId);

  const hcOk = Boolean(waitHc.done && waitHc.hcIds?.length === 1 && !waitHc.error);
  pushCheck(report, "020.weekless_asset_creates_or_links_hc", hcOk, {
    done: waitHc.done,
    timeout: waitHc.timeout || false,
    hcCount: waitHc.hcIds?.length || 0,
    uploadStatus: waitHc.uploadStatus,
    uploadError: waitHc.uploadError ? String(waitHc.uploadError).slice(0, 200) : "",
  });
  if (!hcOk) {
    saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const hcId = waitHc.hcIds[0];
  created.homeworkIds.push({ id: hcId, kind: "weekless-hw1" });

  const hc = await getRecord(token, baseId, "Homework Completions", hcId);
  const sub = await getRecord(token, baseId, "Submissions", submissionId);
  const weekOk = firstLinkId(hc.fields?.Week) === EARLY_BIRD_WEEK;
  const phaOk = firstLinkId(hc.fields?.["Program Homework Assignment"]) === PHA_HW1;
  const subWeekEmpty = linkIds(sub.fields?.Week).length === 0;
  const hcWasId = firstLinkId(hc.fields?.["Weekly Athlete Summary Link"]);

  pushCheck(
    report,
    "020.hc_week_from_pha",
    weekOk && phaOk,
    {
      week: firstLinkId(hc.fields?.Week),
      pha: firstLinkId(hc.fields?.["Program Homework Assignment"]),
    },
    { week: EARLY_BIRD_WEEK, pha: PHA_HW1 }
  );
  pushCheck(report, "submission.week_remains_empty", subWeekEmpty, {
    weekLinks: linkIds(sub.fields?.Week).length,
  });

  // Allow formula/link settle for WAS create.
  let postWas = [];
  for (let i = 0; i < 12; i += 1) {
    postWas = await listExactWas(token, baseId);
    if (postWas.length >= 1 && hcWasId) break;
    await sleep(2500);
  }
  // Refresh HC WAS link
  const hc2 = await getRecord(token, baseId, "Homework Completions", hcId);
  const hcWasId2 = firstLinkId(hc2.fields?.["Weekly Athlete Summary Link"]);
  created.wasId = hcWasId2 || (postWas[0] && postWas[0].id) || null;
  created.wasCreatedBy020 = created.wasId ? !preWasIds.has(created.wasId) : null;

  pushCheck(report, "020.exactly_one_was_enrollment_pha_week", postWas.length === 1, {
    count: postWas.length,
    ids: postWas.map((r) => redactId(r.id)),
    wasCreatedBy020: created.wasCreatedBy020,
  });
  pushCheck(
    report,
    "020.hc_links_canonical_was",
    Boolean(hcWasId2) && postWas.length === 1 && hcWasId2 === postWas[0].id,
    {
      hcWas: redactId(hcWasId2),
      canonicalWas: postWas[0] ? redactId(postWas[0].id) : null,
    }
  );

  // Grade → 065
  await updateRecords(token, baseId, "Homework Completions", [
    {
      id: hcId,
      fields: {
        "Coach Feedback": `${batchKey}|weekless WAS proof satisfactory`,
        "Satisfactory?": true,
        "Review Complete": true,
        "Automation Error": "",
      },
    },
  ]);

  const sourceKey = homeworkXpKey(hcId);
  let xpPoll = await pollUntil(async () => {
    const rows = await listXpBySourceKey(token, baseId, sourceKey);
    if (rows.length >= 1) return { done: true, rows };
    const row = await getRecord(token, baseId, "Homework Completions", hcId);
    return {
      done: false,
      award: choiceName(row.fields?.["Award Status"]),
      reconcile: row.fields?.["Homework XP Reconciliation Needed?"],
      err: row.fields?.["Automation Error"]
        ? String(row.fields["Automation Error"]).slice(0, 160)
        : null,
    };
  }, { timeoutMs: 90000, intervalMs: 6000, label: "xp" });

  if (!xpPoll.rows?.length) {
    await force065Reentry(token, baseId, hcId, report);
    xpPoll = await pollUntil(async () => {
      const rows = await listXpBySourceKey(token, baseId, sourceKey);
      if (rows.length >= 1) return { done: true, rows };
      return { done: false };
    }, { timeoutMs: 120000, intervalMs: 6000, label: "xp-reentry" });
  }

  const xpRows = xpPoll.rows || [];
  created.xpEventIds.push(...xpRows.map((r) => r.id));
  const xpOk =
    xpRows.length === 1 &&
    Number(xpRows[0].fields?.["XP Points"]) > 0 &&
    xpRows[0].fields?.["Active?"] === true;
  pushCheck(report, "065.exactly_one_homework_xp", xpOk, {
    count: xpRows.length,
    points: xpRows.map((r) => r.fields?.["XP Points"]),
    active: xpRows.map((r) => r.fields?.["Active?"]),
    week: xpRows.map((r) => firstLinkId(r.fields?.Week)),
    sourceKey,
    timeout: xpPoll.timeout || false,
  });

  // Retry 020 — no duplicate HC
  const hcBeforeRetry = linkIds(
    (await getRecord(token, baseId, "Submission Assets", assetId)).fields?.["Homework Completions"]
  );
  await rearrm020(token, baseId, assetId);
  await sleep(10000);
  const assetAfter = await getRecord(token, baseId, "Submission Assets", assetId);
  const hcAfterRetry = linkIds(assetAfter.fields?.["Homework Completions"]);
  const wasAfterRetry = await listExactWas(token, baseId);
  pushCheck(report, "retry.020_no_duplicate_hc", hcAfterRetry.length === 1 && hcAfterRetry[0] === hcId, {
    before: hcBeforeRetry.length,
    after: hcAfterRetry.length,
    sameHc: hcAfterRetry[0] === hcId,
  });
  pushCheck(report, "retry.020_no_duplicate_was", wasAfterRetry.length === 1, {
    count: wasAfterRetry.length,
    ids: wasAfterRetry.map((r) => redactId(r.id)),
  });

  // Retry 065 — no duplicate XP
  await force065Reentry(token, baseId, hcId, report);
  await sleep(15000);
  const xpAfter = await listXpBySourceKey(token, baseId, sourceKey);
  pushCheck(report, "retry.065_no_duplicate_xp", xpAfter.length === 1, {
    count: xpAfter.length,
    ids: xpAfter.map((r) => redactId(r.id)),
  });

  // Final submission week empty
  const subFinal = await getRecord(token, baseId, "Submissions", submissionId);
  pushCheck(report, "submission.week_still_empty_after_flow", linkIds(subFinal.fields?.Week).length === 0, {
    weekLinks: linkIds(subFinal.fields?.Week).length,
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
    errors: [],
    notes: [],
  };
  if (!manifest) {
    report.notes.push("No manifest");
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const safeDelete = async (table, ids, label) => {
    for (const id of [...new Set(ids.filter(Boolean))]) {
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
    "Submission Assets",
    (manifest.assetIds || []).map((x) => x.id || x),
    "asset"
  );
  await safeDelete(
    "Homework Completions",
    (manifest.homeworkIds || []).map((x) => x.id || x),
    "hc"
  );
  await safeDelete(
    "Submissions",
    (manifest.submissionIds || []).map((x) => x.id || x),
    "submission"
  );
  // Only delete WAS if this proof created it (not a pre-existing row).
  if (manifest.wasCreatedBy020 && manifest.wasId) {
    await safeDelete("Weekly Athlete Summary", [manifest.wasId], "was");
  } else if (manifest.wasId) {
    report.notes.push(
      `Preserved pre-existing WAS ${redactId(manifest.wasId)} (wasCreatedBy020=${manifest.wasCreatedBy020})`
    );
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.apply && !args.cleanup)) {
    console.log(`Usage:
  node tools/testing/sc-160-weekless-was-proof.mjs --apply
  node tools/testing/sc-160-weekless-was-proof.mjs --cleanup`);
    process.exit(args.help ? 0 : 1);
  }
  const { token, baseId } = requireToken();
  let report;
  try {
    report = args.apply ? await runApply(token, baseId) : await runCleanup(token, baseId);
  } catch (err) {
    report = {
      harness: HARNESS,
      mode: args.apply ? "apply" : "cleanup",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      checks: [],
      defects: [String(err.message || err)],
      notes: ["fatal error"],
      error: String(err.message || err).slice(0, 400),
    };
    console.error(err);
  }
  const evidencePath = writeEvidence(report);
  const failed = (report.defects || []).length > 0 || (report.summary?.failCount || 0) > 0;
  console.log(
    JSON.stringify(
      {
        evidencePath,
        summary: report.summary || null,
        defects: report.defects || [],
        checks: (report.checks || []).map((c) => ({ id: c.id, status: c.status })),
        cleanupErrors: report.errors || null,
        deleted: report.deleted || null,
        notes: report.notes || null,
        error: report.error || null,
      },
      null,
      2
    )
  );
  if (args.apply && report?.created) {
    const needed = {
      harness: HARNESS,
      reason: "MCP delete if PAT 403; preserve Mike reported evidence",
      created: report.created,
    };
    writeFileSync(resolve(EVIDENCE_DIR, "_weekless-was-cleanup-needed.json"), JSON.stringify(needed, null, 2));
  }
  process.exit(failed && args.apply ? 1 : 0);
}

main();
