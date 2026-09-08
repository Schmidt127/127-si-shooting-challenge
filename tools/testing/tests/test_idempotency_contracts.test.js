"use strict";

const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const ROOT = resolve(__dirname, "../../..");
const REGISTRY = JSON.parse(readFileSync(resolve(ROOT, "tools/testing/idempotency-contracts.json"), "utf8"));

const REQUIRED = [
  "submission-xp",
  "homework-completion",
  "homework-xp",
  "video-xp",
  "weekly-athlete-summary",
  "weekly-email-send",
  "upload-asset",
];

test("idempotency registry has required domains", () => {
  const domains = REGISTRY.contracts.map((c) => c.domain);
  for (const d of REQUIRED) assert.ok(domains.includes(d), d);
});

test("every contract declares writer and keyPattern", () => {
  for (const c of REGISTRY.contracts) {
    assert.ok(c.writer, c.domain);
    assert.ok(c.keyPattern, c.domain);
    assert.ok(c.replayPolicy, c.domain);
  }
});

test("no duplicate domain entries", () => {
  const domains = REGISTRY.contracts.map((c) => c.domain);
  assert.equal(domains.length, new Set(domains).size);
});
