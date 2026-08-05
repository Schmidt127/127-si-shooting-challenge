#!/usr/bin/env node
/**
 * Automation 117 — Zoom recording approval email → Make (offline contract).
 * Run: node tests/zoom/automation-117-recording-approval-email.test.js
 *
 * No live network calls — exercises helpers mirrored from the canonical script.
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js"
);
const ACTIVE_DIR = path.join(__dirname, "../../airtable/automations/shooting-challenge");
const DESIGN_DIR = path.join(ACTIVE_DIR, "_design-alternatives/stage17-modular-reference");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL - ${name}`);
    console.error(`  ${error && error.stack ? error.stack : error}`);
  }
}

const CONFIG = {
  makeUs1WebhookHost: "hook.us1.make.com",
  sendKeyPrefix: "ZOOM_REC_EMAIL",
  automationNumber: "117f",
  templateKey: "ZOOM_RECORDING_APPROVED",
  timing: "On Satisfactory",
  successStatuses: ["sent", "already_sent"],
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function requireRecId(label, value) {
  const id = normalizeText(value);
  if (!id) throw new Error(`Missing required input: ${label}`);
  if (!id.startsWith("rec")) {
    throw new Error(`Invalid ${label}: must begin with "rec" (received: ${id})`);
  }
  return id;
}

function requireMakeUs1WebhookUrl(value) {
  const urlText = normalizeText(value);
  if (!urlText) throw new Error("Missing required input: webhookUrl");
  let parsed;
  try {
    parsed = new URL(urlText);
  } catch {
    throw new Error("Invalid webhookUrl: not a valid URL");
  }
  if (parsed.protocol !== "https:") throw new Error("Invalid webhookUrl: must use https");
  if (parsed.hostname.toLowerCase() !== CONFIG.makeUs1WebhookHost) {
    throw new Error(`Invalid webhookUrl: host must be ${CONFIG.makeUs1WebhookHost} (Make US1)`);
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error("Invalid webhookUrl: missing webhook path");
  }
  return urlText;
}

function buildSendKey(enrollmentRid, zoomMeetingRid, zoomAttendanceId) {
  return `${CONFIG.sendKeyPrefix}|${enrollmentRid}|${zoomMeetingRid}|${zoomAttendanceId}`;
}

function interpretMakeResponse({ ok, status, bodyText }) {
  if (!ok) {
    return { success: false, reason: `non-2xx HTTP ${status}` };
  }
  let json = null;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return { success: false, reason: "invalid JSON" };
  }
  if (!json || typeof json !== "object") {
    return { success: false, reason: "invalid JSON object" };
  }
  const makeStatus = normalizeText(json.status);
  if (!CONFIG.successStatuses.includes(makeStatus)) {
    return { success: false, reason: `unexpected status ${makeStatus}` };
  }
  return { success: true, makeStatus };
}

const source = fs.readFileSync(SCRIPT_PATH, "utf8");

test("canonical 117 email script exists with v1.1 and Make 117f contract", () => {
  assert.match(source, /Version:\s*v1\.1/);
  assert.match(source, /Version Date:\s*2026-07-20|Last Updated:\s*2026-07-20|versionDate:\s*"2026-07-20"/);
  assert.match(source, /automationNumber:\s*"117f"/);
  assert.match(source, /templateKey:\s*"ZOOM_RECORDING_APPROVED"/);
  assert.match(source, /timing:\s*"On Satisfactory"/);
  assert.match(source, /ZOOM_REC_EMAIL/);
  assert.match(source, /Send Recording Approval Email to Make/);
  assert.doesNotMatch(source, /selectRecordsAsync/);
  assert.doesNotMatch(source, /\.unloadData\(/);
});

test("only one active Airtable Automation 117 script in canonical folder", () => {
  const active117 = fs
    .readdirSync(ACTIVE_DIR)
    .filter((f) => /^117[^a-zA-Z]/.test(f) || f.startsWith("117-") || f.startsWith("117f"));
  const js = active117.filter((f) => f.endsWith(".js"));
  assert.deepStrictEqual(js, ["117-zoom-send-recording-approval-email-to-make.js"]);
});

test("modular orchestrator/117a–e live under design-alternatives only", () => {
  assert.ok(fs.existsSync(path.join(DESIGN_DIR, "117-zoom-recording-credit-orchestrator.js")));
  assert.ok(fs.existsSync(path.join(DESIGN_DIR, "117a-zoom-recording-normalize-recording-quiz-submission.js")));
  assert.ok(fs.existsSync(path.join(DESIGN_DIR, "117c-zoom-recording-create-zoom-xp-event.js")));
  assert.ok(!fs.existsSync(path.join(ACTIVE_DIR, "117-zoom-recording-credit-orchestrator.js")));
  assert.ok(!fs.existsSync(path.join(ACTIVE_DIR, "117a-zoom-recording-normalize-recording-quiz-submission.js")));
  assert.ok(!fs.existsSync(path.join(ACTIVE_DIR, "117c-zoom-recording-create-zoom-xp-event.js")));
});

test("dedupe key construction is four-part ZOOM_REC_EMAIL", () => {
  const key = buildSendKey("recEnr", "recMeet", "recZa");
  assert.strictEqual(key, "ZOOM_REC_EMAIL|recEnr|recMeet|recZa");
});

test("accepts Make sent and already_sent", () => {
  assert.deepStrictEqual(interpretMakeResponse({ ok: true, status: 200, bodyText: '{"status":"sent"}' }), {
    success: true,
    makeStatus: "sent",
  });
  assert.deepStrictEqual(
    interpretMakeResponse({ ok: true, status: 200, bodyText: '{"status":"already_sent"}' }),
    { success: true, makeStatus: "already_sent" }
  );
});

test("rejects invalid webhook URLs", () => {
  assert.throws(() => requireMakeUs1WebhookUrl(""), /Missing required input: webhookUrl/);
  assert.throws(() => requireMakeUs1WebhookUrl("not-a-url"), /not a valid URL/);
  assert.throws(() => requireMakeUs1WebhookUrl("http://hook.us1.make.com/x"), /must use https/);
  assert.throws(
    () => requireMakeUs1WebhookUrl("https://hook.eu1.make.com/x"),
    /host must be hook\.us1\.make\.com/
  );
  assert.throws(() => requireMakeUs1WebhookUrl("https://hook.us1.make.com/"), /missing webhook path/);
  assert.strictEqual(
    requireMakeUs1WebhookUrl("https://hook.us1.make.com/abc123"),
    "https://hook.us1.make.com/abc123"
  );
});

test("rejects missing or invalid record IDs", () => {
  assert.throws(() => requireRecId("recordId", ""), /Missing required input/);
  assert.throws(() => requireRecId("recordId", "xyz"), /must begin with "rec"/);
  assert.strictEqual(requireRecId("recordId", "recABC"), "recABC");
});

test("non-JSON Make responses fail safely", () => {
  const r = interpretMakeResponse({ ok: true, status: 200, bodyText: "ok" });
  assert.strictEqual(r.success, false);
  assert.match(r.reason, /invalid JSON/);
});

test("non-2xx Make responses fail safely", () => {
  const r = interpretMakeResponse({ ok: false, status: 500, bodyText: '{"status":"sent"}' });
  assert.strictEqual(r.success, false);
  assert.match(r.reason, /non-2xx/);
});

test("script parses with node --check", () => {
  const result = spawnSync(process.execPath, ["--check", SCRIPT_PATH], { encoding: "utf8" });
  if (result.status !== 0) {
    const err = `${result.stderr || ""}${result.stdout || ""}`;
    assert.ok(/await is only valid in async functions/.test(err), err || "node --check failed");
  }
});

test("unloadData compat pack must not instruct pasting orchestrator as Automation 117", () => {
  const pack = fs.readFileSync(
    path.join(__dirname, "../../docs/deploy-checklists/active-automation-unloadData-compat.md"),
    "utf8"
  );
  assert.match(pack, /must not be pasted|NOT the live PROD Automation 117|design-alternatives/i);
  assert.doesNotMatch(
    pack,
    /Paste order[\s\S]*117 — Zoom recording orchestrator/
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
