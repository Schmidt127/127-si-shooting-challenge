#!/usr/bin/env node
/** FUT-009 / FUT-010 storage key format — offline tests. */

const assert = require("assert");
const {
  classifyStorageKeyGeneration,
  extractBasenameFromKey,
  isValidStorageKeyFormat,
  prependLayoutPrefix,
} = require("./storage-key-format");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const GEN_B_KEY =
  "Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/" +
  "20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg";

const FUT007_KEY =
  "shooting-challenge/Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/" +
  "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4";

test("Gen B keys pass dual-prefix verification", () => {
  assert.strictEqual(isValidStorageKeyFormat(GEN_B_KEY), true);
  assert.strictEqual(classifyStorageKeyGeneration(GEN_B_KEY), "gen_b");
});

test("Option D FUT-007 keys pass verification", () => {
  assert.strictEqual(isValidStorageKeyFormat(FUT007_KEY), true);
  assert.strictEqual(classifyStorageKeyGeneration(FUT007_KEY), "fut007");
});

test("invalid keys fail verification", () => {
  assert.strictEqual(isValidStorageKeyFormat(""), false);
  assert.strictEqual(isValidStorageKeyFormat("bad/key"), false);
  assert.strictEqual(isValidStorageKeyFormat("../etc/passwd/x/y/z/file.mp4"), false);
});

test("prependLayoutPrefix is idempotent", () => {
  const relative =
    "Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4";
  const once = prependLayoutPrefix(relative);
  assert.strictEqual(once, FUT007_KEY);
  assert.strictEqual(prependLayoutPrefix(once), once);
});

test("extractBasenameFromKey", () => {
  assert.strictEqual(
    extractBasenameFromKey(FUT007_KEY),
    "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4",
  );
});

console.log("\nAll storage-key-format tests passed.");
