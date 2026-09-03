#!/usr/bin/env node
/**
 * Parent-email Live cutover — preflight + disposable path verification.
 *
 *   node tools/testing/parent-email-live-cutover.mjs preflight
 *   node tools/testing/parent-email-live-cutover.mjs cleanup-welcome
 *   node tools/testing/parent-email-live-cutover.mjs verify-all [--apply] [--skip-welcome]
 *
 * Safety: only schmidt@fairfieldbasketballclub.com; disposable VERIFY rows;
 * never logs secrets.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requireToken,
  listRecords,
  updateRecords,
  ROOT,
} from "./lib/airtable-client.mjs";
import { bootstrapDisposableEnrollment, cleanupBootstrapManifest } from "./lib/post-fut030-bootstrap.mjs";
import {
  cleanupScopedWelcome,
  runRemainingPathApplies,
} from "./lib/parent-email-path-verify.mjs";

const SAFE_EMAIL = "schmidt@fairfieldbasketballclub.com";
const HUB_HEALTH_URL = "https://communications-two-blue.vercel.app/api/health";
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/parent-email-live-cutover");
const VERSION_SLOTS = ["071", "072", "073", "074", "076", "078A", "079", "117", "118", "119"];
const EVENT_MAP = {
  WELCOME: "WELCOME",
  DAILY: "DAILY_SUBMISSION",
  WEEKLY: "WEEKLY_ATHLETE_SUMMARY",
  HOMEWORK: "HOMEWORK_FEEDBACK",
  VIDEO: "VIDEO_FEEDBACK",
  ZOOM_RECORDING_APPROVAL: "ZOOM_RECORDING_APPROVAL",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractVersion(code) {
  if (!code) return "";
  const m =
    code.match(/version:\s*["'](v?[\d.]+)["']/i) ||
    code.match(/\*\s*Version:\s*(v?[\d.]+)/i);
  return m ? (m[1].startsWith("v") ? m[1] : `v${m[1]}`) : "";
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

function redactEmail(s) {
  return String(s || "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
}

async function hubHealth() {
  const res = await fetch(HUB_HEALTH_URL);
  const json = await res.json();
  return { ok: res.ok, json };
}

async function auditAutomationVersions(token, baseId) {
  const dir = resolve(ROOT, "airtable/automations/shooting-challenge");
  const repo = {};
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(\d{3}[A-Z]?)-/);
    if (!m) continue;
    repo[m[1]] = extractVersion(readFileSync(resolve(dir, f), "utf8"));
  }
  const rows = await listRecords(token, baseId, "Automations", { maxRecords: 200 });
  const out = [];
  for (const slot of VERSION_SLOTS) {
    const row = rows.find((r) => String(r.fields?.Name || "").match(new RegExp(`\\b${slot}\\b`)));
    const prodVersion = extractVersion(String(row?.fields?.["Automation Code"] || ""));
    const repoVersion = repo[slot] || "";
    out.push({
      slot,
      repoVersion,
      prodVersion,
      status: row?.fields?.Status?.name || row?.fields?.Status || "missing",
      match: repoVersion && prodVersion ? repoVersion === prodVersion : "UNKNOWN",
    });
  }
  return out;
}

async function listActiveEnrollments(token, baseId) {
  const formula = 'AND({Active?}=TRUE(), OR({Parent Email - Cleaned}!="", {Parent Email}!=""))';
  return listRecords(token, baseId, "Enrollments", {
    filterByFormula: formula,
    fields: [
      "Athlete First Name",
      "Athlete Last Name",
      "Parent Email",
      "Parent Email - Cleaned",
      "School Year",
    ],
  });
}

function isDisposableEnrollment(rec) {
  const f = rec.fields || {};
  const first = String(f["Athlete First Name"] || "");
  const last = String(f["Athlete Last Name"] || "");
  const parent = String(f["Parent Email - Cleaned"] || f["Parent Email"] || "").toLowerCase();
  if (first === "VERIFY" || /schmidt/i.test(`${first} ${last}`)) return true;
  if (parent === SAFE_EMAIL || parent.includes("mschmidt@fairfield")) return true;
  return false;
}

function looksLikeRealFamily(rec) {
  const f = rec.fields || {};
  const first = String(f["Athlete First Name"] || "");
  if (first === "VERIFY" || /schmidt/i.test(first)) return false;
  const parent = String(f["Parent Email - Cleaned"] || f["Parent Email"] || "").toLowerCase();
  if (!parent || parent === SAFE_EMAIL || parent.includes("mschmidt@fairfield")) return false;
  return /\./.test(parent);
}

async function ensureDisposableRecipient(token, baseId, apply) {
  const rows = await listActiveEnrollments(token, baseId);
  const updates = [];
  for (const rec of rows) {
    if (!isDisposableEnrollment(rec)) continue;
    const parent = String(rec.fields?.["Parent Email"] || "").toLowerCase();
    if (parent === SAFE_EMAIL) continue;
    updates.push({
      id: rec.id,
      fields: { "Parent Email": SAFE_EMAIL, "Athlete Email": SAFE_EMAIL },
    });
  }
  if (updates.length && apply) await updateRecords(token, baseId, "Enrollments", updates);
  return { examined: rows.length, pendingOrUpdated: updates.length, ids: updates.map((u) => u.id) };
}

async function waitForQueueHandoff(token, baseId, { handoffKey, timeoutMs = 120000 }) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const rows = await listRecords(token, baseId, "Email Handoff Queue", {
      filterByFormula: `{Handoff Key}="${handoffKey}"`,
      maxRecords: 3,
    });
    const match = rows[0];
    if (match && (match.fields?.Status === "Accepted" || match.fields?.Status === "Failed")) {
      return match;
    }
    await sleep(4000);
  }
  return null;
}

async function verifyQueueRow(row) {
  const f = row?.fields || {};
  const recipients = parseRecipients(f["Recipients JSON"]);
  const bad = recipients.filter((e) => e !== SAFE_EMAIL);
  return {
    queueId: row?.id || null,
    status: f.Status,
    testMode: f["Test Mode?"],
    handoffKey: f["Handoff Key"],
    sourceRecordId: f["Source Record ID"],
    hubEventId: f["Hub Event ID"] || null,
    recipients,
    recipientOk: recipients.length > 0 && bad.length === 0,
    accepted: f.Status === "Accepted",
  };
}

async function verifyWelcome(token, baseId) {
  const manifest = await bootstrapDisposableEnrollment(token, baseId, {
    stamp: `PELC|${Date.now()}`,
    parentEmail: SAFE_EMAIL,
  });
  const handoffKey = `WELCOME|ENROLLMENTS|${manifest.enrollmentId}`;
  const row = await waitForQueueHandoff(token, baseId, { handoffKey });
  const first = row ? await verifyQueueRow(row) : { error: "timeout" };
  await cleanupBootstrapManifest(token, baseId, manifest);
  return { path: "WELCOME", enrollmentId: manifest.enrollmentId, first };
}

async function verifyPathFromExisting(token, baseId, path) {
  const eventType = EVENT_MAP[path];
  const rows = await listRecords(token, baseId, "Email Handoff Queue", {
    filterByFormula: `{Event Type}="${eventType}"`,
    maxRecords: 30,
  });
  const recent = rows
    .map((r) => {
      const recipients = parseRecipients(r.fields?.["Recipients JSON"]);
      return {
        id: r.id,
        status: r.fields?.Status,
        testMode: r.fields?.["Test Mode?"],
        handoffKey: r.fields?.["Handoff Key"],
        sourceRecordId: r.fields?.["Source Record ID"],
        created: r.fields?.Created,
        recipients,
        safeOnly: recipients.length > 0 && recipients.every((e) => e === SAFE_EMAIL),
      };
    })
    .sort((a, b) => (a.created > b.created ? -1 : 1));
  const accepted = recent.filter((r) => r.status === "Accepted" && r.safeOnly);
  return {
    path,
    eventType,
    acceptedSafeCount: accepted.length,
    latestAccepted: accepted[0] || null,
  };
}

async function runPreflight() {
  const { token, baseId } = requireToken();
  const enrollments = await listActiveEnrollments(token, baseId);
  const report = {
    at: new Date().toISOString(),
    hub: await hubHealth(),
    activeEnrollmentCount: enrollments.length,
    realFamilyCount: enrollments.filter(looksLikeRealFamily).length,
    recipientAudit: enrollments.map((r) => ({
      id: r.id,
      name: `${r.fields?.["Athlete First Name"] || ""} ${r.fields?.["Athlete Last Name"] || ""}`.trim(),
      parentCleaned: redactEmail(r.fields?.["Parent Email - Cleaned"]),
      disposable: isDisposableEnrollment(r),
    })),
    automationVersions: await auditAutomationVersions(token, baseId),
    stopReasons: [],
  };
  report.mismatches = report.automationVersions.filter((v) => v.match === false);
  if (report.realFamilyCount) report.stopReasons.push("real_enrollment_found");
  if (!report.hub.ok || report.hub.json?.status !== "ready") report.stopReasons.push("hub_not_ready");
  if (report.mismatches.length) report.stopReasons.push("automation_version_mismatch");
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(
    resolve(EVIDENCE_DIR, `${new Date().toISOString().slice(0, 10)}-preflight.json`),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.stopReasons.length) process.exit(2);
}

async function runCleanupWelcome() {
  const { token, baseId } = requireToken();
  const report = await cleanupScopedWelcome(token, baseId, {
    athleteId: "recAPXHpWRINmxl6R",
    enrollmentId: "recVOEATdGqpydWCs",
  });
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(
    resolve(EVIDENCE_DIR, `${new Date().toISOString().slice(0, 10)}-cleanup-welcome.json`),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.errors?.length) process.exit(2);
}

async function runVerifyAll(apply, skipWelcome) {
  const { token, baseId } = requireToken();
  const results = {
    at: new Date().toISOString(),
    apply,
    skipWelcome,
    recipientSync: await ensureDisposableRecipient(token, baseId, apply),
    paths: {},
  };
  if (apply && !skipWelcome) results.paths.WELCOME = await verifyWelcome(token, baseId);
  if (apply && skipWelcome) {
    const applied = await runRemainingPathApplies(token, baseId);
    results.manifest = applied.manifest;
    results.bootstrapCleanup = applied.bootstrapCleanup;
    results.paths = applied.paths;
  } else {
    for (const path of Object.keys(EVENT_MAP)) {
      if (path === "WELCOME" && apply && !skipWelcome) continue;
      results.paths[path] = await verifyPathFromExisting(token, baseId, path);
    }
  }
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(
    resolve(EVIDENCE_DIR, `${new Date().toISOString().slice(0, 10)}-verify-all.json`),
    `${JSON.stringify(results, null, 2)}\n`
  );
  console.log(JSON.stringify(results, null, 2));
}

const cmd = process.argv[2];
const apply = process.argv.includes("--apply");
const skipWelcome = process.argv.includes("--skip-welcome");
if (cmd === "preflight") await runPreflight();
else if (cmd === "cleanup-welcome") await runCleanupWelcome();
else if (cmd === "verify-all") await runVerifyAll(apply, skipWelcome);
else {
  console.log("Usage: preflight | cleanup-welcome | verify-all [--apply] [--skip-welcome]");
  process.exit(1);
}
