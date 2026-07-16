#!/usr/bin/env node
/**
 * Asserts required SCRIPT metadata fields exist on critical automation files.
 * Run: node airtable/automations/shooting-challenge/lib/script-header-contract.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

function extractScriptBlock(text) {
  const match = text.match(/const SCRIPT\s*=\s*\{([\s\S]*?)\n\};/);
  return match ? match[1] : "";
}

function hasMeta(block, key) {
  return new RegExp(`${key}\\s*:`).test(block);
}

const root = path.join(__dirname, "..");
const requiredFiles = [
  "009-submission-intake-create-submission-assets.js",
  "117a-zoom-recording-credit-award-xp-from-quiz-completion.js",
  "117b-zoom-recording-credit-send-approval-email-webhook.js",
  "066-achievements-and-milestones-create-shot-milestone-unlocks.js",
];

for (const fileName of requiredFiles) {
  test(`${fileName} has SCRIPT metadata fields`, () => {
    const text = fs.readFileSync(path.join(root, fileName), "utf8");
    const block = extractScriptBlock(text);
    assert.ok(block, `missing SCRIPT block in ${fileName}`);
    for (const key of ["scriptName", "version", "versionDate", "originalWrittenDate"]) {
      assert.ok(hasMeta(block, key), `${fileName} missing SCRIPT.${key}`);
    }
    // versionNumber is optional alias used on newer scripts
    if (fileName.startsWith("009") || fileName.startsWith("117")) {
      assert.ok(hasMeta(block, "versionNumber"), `${fileName} missing SCRIPT.versionNumber`);
    }
  });
}

test("009 version is established at v1.0", () => {
  const text = fs.readFileSync(path.join(root, "009-submission-intake-create-submission-assets.js"), "utf8");
  const block = extractScriptBlock(text);
  assert.ok(/version:\s*"v1\.0"/.test(block));
});

console.log("\nAll script-header-contract tests passed.");
