#!/usr/bin/env node
/**
 * Offline tests for canonical Automation 117 (email-to-Make handoff).
 * Does NOT test Stage 17 orchestrator (design-alt only).
 *
 * Run: node tools/testing/tests/test_117_email_handoff_offline.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT_PATH = resolve(
  ROOT,
  "airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js"
);

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, error: e?.message || String(e) });
  }
}

function makeOutput() {
  const values = {};
  return {
    values,
    set(k, v) {
      values[k] = v;
    },
  };
}

async function run117({ inputs, fetchImpl }) {
  const source = readFileSync(SCRIPT_PATH, "utf8");
  const output = makeOutput();
  const logs = [];
  const context = {
    console: {
      log: (...args) => logs.push(args),
    },
    input: {
      config: () => ({ ...inputs }),
    },
    output,
    fetch: fetchImpl,
    remoteFetchAsync: undefined,
    URL,
    JSON,
    String,
    Error,
    Date,
    Math,
    Object,
    Array,
    Map,
    Set,
    Promise,
    parseInt,
    Number,
    Boolean,
  };
  vm.createContext(context);
  let threw = null;
  try {
    await vm.runInContext("(async () => {\n" + source + "\n})()", context, {
      timeout: 5000,
      filename: "117-email.js",
    });
  } catch (e) {
    threw = e;
  }
  return { output, threw, logs };
}

const GOOD_URL = "https://hook.us1.make.com/abcdefghijklmnopqrstuvwxyz012345";
const IDS = {
  za: "recZoomAttend00001",
  enr: "recEnrollment0001",
  mtg: "recZoomMeeting001",
};

await test("sent response → success + actionOut=sent", async () => {
  const { output, threw } = await run117({
    inputs: {
      webhookUrl: GOOD_URL,
      recordId: IDS.za,
      enrollmentRid: IDS.enr,
      zoomMeetingRid: IDS.mtg,
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "sent" }),
    }),
  });
  assert.equal(threw, null);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "sent");
  assert.equal(output.values.makeStatus, "sent");
  assert.equal(
    output.values.sendKey,
    `ZOOM_REC_EMAIL|${IDS.enr}|${IDS.mtg}|${IDS.za}`
  );
});

await test("already_sent → success (idempotent)", async () => {
  const { output, threw } = await run117({
    inputs: {
      webhookUrl: GOOD_URL,
      recordId: IDS.za,
      enrollmentRid: IDS.enr,
      zoomMeetingRid: IDS.mtg,
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "already_sent" }),
    }),
  });
  assert.equal(threw, null);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "already_sent");
});

await test("rejects non-US1 webhook host", async () => {
  const { output, threw } = await run117({
    inputs: {
      webhookUrl: "https://hook.eu1.make.com/abc",
      recordId: IDS.za,
      enrollmentRid: IDS.enr,
      zoomMeetingRid: IDS.mtg,
    },
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => "{}" }),
  });
  assert.ok(threw);
  assert.equal(output.values.statusOut, "error");
});

await test("rejects invalid recordId", async () => {
  const { threw } = await run117({
    inputs: {
      webhookUrl: GOOD_URL,
      recordId: "not-a-rec",
      enrollmentRid: IDS.enr,
      zoomMeetingRid: IDS.mtg,
    },
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => "{}" }),
  });
  assert.ok(threw);
});

await test("HTTP 502 → error and does not claim sent", async () => {
  const { output, threw } = await run117({
    inputs: {
      webhookUrl: GOOD_URL,
      recordId: IDS.za,
      enrollmentRid: IDS.enr,
      zoomMeetingRid: IDS.mtg,
    },
    fetchImpl: async () => ({
      ok: false,
      status: 502,
      text: async () => "bad gateway",
    }),
  });
  assert.ok(threw);
  assert.equal(output.values.statusOut, "error");
  assert.notEqual(output.values.actionOut, "sent");
});

await test("unexpected Make status → error", async () => {
  const { output, threw } = await run117({
    inputs: {
      webhookUrl: GOOD_URL,
      recordId: IDS.za,
      enrollmentRid: IDS.enr,
      zoomMeetingRid: IDS.mtg,
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "queued" }),
    }),
  });
  assert.ok(threw);
  assert.equal(output.values.statusOut, "error");
});

await test("script does not reference Airtable base writes", async () => {
  const src = readFileSync(SCRIPT_PATH, "utf8");
  assert.equal(/updateRecordAsync|createRecordAsync/.test(src), false);
  assert.ok(src.includes('automationNumber: "117f"') || src.includes('automationNumber: CONFIG.automationNumber'));
  assert.ok(src.includes("ZOOM_RECORDING_APPROVED"));
});

const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    {
      suite: "117-email-handoff-offline",
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: failed.length,
      results,
    },
    null,
    2
  )
);
process.exit(failed.length ? 1 : 0);
