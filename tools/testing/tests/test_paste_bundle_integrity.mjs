#!/usr/bin/env node
/**
 * Validates production QA paste bundles match GitHub source scripts.
 * Run: node tools/testing/tests/test_paste_bundle_integrity.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const PRODUCTION_DOCBLOCK = "/************************************************************\n * 0";

function extractFromProductionDocblock(text) {
  const idx = text.indexOf(PRODUCTION_DOCBLOCK);
  assert.ok(idx >= 0, "production docblock marker missing");
  return text.slice(idx);
}

function extractFromSingleCommentBlock(text) {
  assert.ok(text.startsWith("/*"), "expected opening block comment");
  const lines = text.split("\n");
  const out = ["/*"];
  let pastHeader = false;
  for (const line of lines.slice(1)) {
    if (!pastHeader) {
      if (line.trim().startsWith("Version:")) {
        pastHeader = true;
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

const BUNDLES = [
  {
    id: "010",
    version: "v10.14",
    source:
      "airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js",
    paste: "docs/deploy-checklists/010-v10.14-PASTE.txt",
    extract: (text) => {
      const start = "/************************************************************\n * 010 - SUBMISSION INTAKE";
      const idx = text.indexOf(start);
      assert.ok(idx >= 0, "010 start marker missing");
      return text.slice(idx);
    },
    mustInclude: [
      'version: "v10.14"',
      "skipped_not_ready",
      "formulaSettlementAttempts",
      "SUBMISSION_XP|",
      "America/Denver",
    ],
  },
  {
    id: "057",
    version: "2.7",
    source:
      "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js",
    paste: "docs/deploy-checklists/057-v2.7-PASTE.txt",
    extract: (text) => {
      const idx = text.indexOf(
        "/***************************************************************************************************\n * 057 - Achievements",
      );
      assert.ok(idx >= 0);
      return text.slice(idx);
    },
    mustInclude: [
      "Version: 2.7",
      "Week End Saturday only",
      "Goal Shots Target",
      "Weekly Goal Shots Target",
      "America/Denver",
      "Perfect Week Automation Status",
      "terminal partial Week",
    ],
  },
  {
    id: "071",
    version: "v4.5",
    source:
      "airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js",
    paste: "docs/deploy-checklists/071-v4.5-PASTE.txt",
    extract: extractFromSingleCommentBlock,
    mustInclude: ['version: "v4.5"', "athleteProfileUrl", "Structured Curriculum HC-only"],
    mustExclude: ["fetch(", "makeWebhookUrl"],
  },
  {
    id: "072",
    version: "v4.9.2",
    source:
      "airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js",
    paste: "docs/deploy-checklists/072-v4.9.2-PASTE.txt",
    extract: extractFromProductionDocblock,
    mustInclude: [
      'version: "v4.9.2"',
      "athleteFirstName",
      "Unlinked canonical XP",
      "WAS-linked active XP",
      "orphanXp",
      "America/Denver",
    ],
    mustExclude: ["fetch(", "makeWebhookUrl"],
  },
  {
    id: "073",
    version: "v4.7",
    source:
      "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js",
    paste: "docs/deploy-checklists/073-v4.7-PASTE.txt",
    extract: extractFromProductionDocblock,
    mustInclude: ['version: "v4.7"', "athleteFirstName", "valid_lambda_viewer"],
    mustExclude: ["fetch(", "makeWebhookUrl"],
  },
  {
    id: "074",
    version: "v3.6",
    source:
      "airtable/automations/shooting-challenge/074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js",
    paste: "docs/deploy-checklists/074-v3.6-PASTE.txt",
    extract: extractFromProductionDocblock,
    mustInclude: ['version: "v3.6"', "athleteFirstName", "WEEKLY_ATHLETE_SUMMARY"],
    mustExclude: ["fetch(", "makeWebhookUrl"],
  },
  {
    id: "076",
    version: "v8.14",
    source:
      "airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js",
    paste: "docs/deploy-checklists/076-v8.14-PASTE.txt",
    extract: extractFromProductionDocblock,
    mustInclude: [
      'version: "v8.14"',
      "athleteFirstName",
      "currentStreak",
      "DAILY_SUBMISSION",
      "Removes xpExtraCredit",
    ],
  },
  {
    id: "117",
    version: "v2.2",
    source:
      "airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js",
    paste: "docs/deploy-checklists/117-v2.2-PASTE.txt",
    extract: extractFromSingleCommentBlock,
    mustInclude: [
      'version: "v2.2"',
      "athleteFirstName",
      "ZOOM_RECORDING_APPROVAL",
      "meetingDisplayName",
    ],
    mustExclude: ["makeWebhookUrl", 'automationNumber: "117f"'],
  },
];

for (const spec of BUNDLES) {
  const sourceText = readFileSync(resolve(ROOT, spec.source), "utf8");
  const pasteText = readFileSync(resolve(ROOT, spec.paste), "utf8");
  const expected = spec.extract(sourceText);
  assert.equal(pasteText, expected, `${spec.id} paste bundle drift from source`);
  assert.ok(!/\bimport\s+/.test(pasteText), `${spec.id} must not use ES imports`);
  assert.ok(!/\brequire\s*\(/.test(pasteText), `${spec.id} must not use require()`);
  for (const needle of spec.mustInclude) {
    assert.ok(pasteText.includes(needle), `${spec.id} missing ${needle}`);
  }
  for (const bad of spec.mustExclude || []) {
    assert.ok(!pasteText.includes(bad), `${spec.id} must not include ${bad}`);
  }
  const hash = createHash("sha256").update(pasteText).digest("hex").slice(0, 12);
  console.log(`OK ${spec.id} ${spec.version} paste bundle sha256:${hash}`);
}

console.log("PASS test_paste_bundle_integrity.mjs");
