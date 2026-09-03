#!/usr/bin/env node
"use strict";

/**
 * Live-schema field assertion for Automation 057 Perfect Week video minimum.
 *
 * Offline half (always run): repo source + shared helper must use the live Config
 * field name `Perfect Week Video Minimum` and must not embed the retired typo
 * `Perfect Week Video MInimum`.
 *
 * Optional live half: when AIRTABLE_API_TOKEN (or AIRTABLE_TOKEN) is set and
 * ASSERT_057_LIVE=1, fetch Config Meta and assert the field exists by name.
 *
 * Evidence companion (MCP get_automation 2026-08-30): live script CONFIG already
 * uses the correct name — do not repaste. Automations Code tracker column may lag.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  PERFECT_WEEK_VIDEO_MINIMUM_FIELD,
} = require("../../lib/config-selection/perfect-week-video-minimum");

const ROOT = path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(
  ROOT,
  "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"
);

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("shared helper exports live Config field name", () => {
  assert.equal(PERFECT_WEEK_VIDEO_MINIMUM_FIELD, "Perfect Week Video Minimum");
  assert.notEqual(PERFECT_WEEK_VIDEO_MINIMUM_FIELD, "Perfect Week Video MInimum");
});

test("057 repo source CONFIG matches live Config field name", () => {
  const script = fs.readFileSync(SCRIPT_PATH, "utf8");
  assert.match(
    script,
    /perfectWeekVideoMinimum:\s*"Perfect Week Video Minimum"/
  );
  assert.doesNotMatch(script, /Perfect Week Video MInimum/);
  assert.match(script, /Version:\s*2\.3/);
});

async function optionalLiveMetaAssert() {
  if (process.env.ASSERT_057_LIVE !== "1") {
    console.log("ok - live Config Meta assert skipped (set ASSERT_057_LIVE=1 to enable)");
    return;
  }
  const token = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID || process.env.BASE_ID || "appn84sqPw03zEbTT";
  assert.ok(token, "AIRTABLE_API_TOKEN required when ASSERT_057_LIVE=1");

  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200, `Meta API HTTP ${res.status}`);
  const body = await res.json();
  const configTable = (body.tables || []).find((t) => t.name === "Config");
  assert.ok(configTable, "Config table missing from live Meta");
  const field = (configTable.fields || []).find(
    (f) => f.name === PERFECT_WEEK_VIDEO_MINIMUM_FIELD
  );
  assert.ok(
    field,
    `Config field "${PERFECT_WEEK_VIDEO_MINIMUM_FIELD}" missing from live schema`
  );
  const typo = (configTable.fields || []).find(
    (f) => f.name === "Perfect Week Video MInimum"
  );
  assert.equal(typo, undefined, "retired typo field name still present on Config");
  console.log(
    `ok - live Config Meta has "${PERFECT_WEEK_VIDEO_MINIMUM_FIELD}" (${field.id})`
  );
}

async function main() {
  await optionalLiveMetaAssert();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
