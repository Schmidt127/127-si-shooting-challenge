#!/usr/bin/env node
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

const root = path.join(__dirname, "../../airtable/automations/shooting-challenge");
const files = fs.readdirSync(root).filter((f) => f.endsWith(".js"));
const hasPrefix = (n) => files.some((f) => f.startsWith(`${n}-`) || f.startsWith(`${n}`));

test("retired/wrong prompt numbers are not present as live script files", () => {
  assert.ok(!hasPrefix("012"), "012 was deleted; homework create is 020");
  assert.ok(!hasPrefix("051"), "051 not in SC streak path");
  assert.ok(!hasPrefix("052"), "052 not in SC streak path");
});

test("current critical automations exist in repo", () => {
  for (const n of [
    "010", "020", "041", "042", "043", "053", "054", "059", "064", "065",
    "066", "072", "074", "075", "101", "111", "118", "119",
  ]) {
    assert.ok(hasPrefix(n), `expected script for ${n}`);
  }
});

test("075 is welcome email, not Zoom XP; Zoom XP is 101 / 117", () => {
  const welcome = files.find((f) => f.startsWith("075-"));
  assert.ok(welcome);
  const body = fs.readFileSync(path.join(root, welcome), "utf8");
  assert.ok(/Welcome/i.test(welcome) || /Welcome/i.test(body));
  assert.ok(files.some((f) => f.startsWith("101-")));
  assert.ok(files.some((f) => f.startsWith("117-") || f.startsWith("117c-")));
});

test("no Team Shot Tracker inactivity alert scripts in SC automations folder", () => {
  const joined = files.join("\n").toLowerCase();
  assert.ok(!joined.includes("inactivity"));
  assert.ok(!joined.includes("3-day"));
  assert.ok(!joined.includes("7-day"));
  assert.ok(!joined.includes("10-day"));
  assert.ok(!joined.includes("team-shot-tracker"));
});

console.log("known-reference-numbers tests passed");
