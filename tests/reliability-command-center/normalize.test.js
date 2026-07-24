#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  normalizeBlank,
  normalizeLookupArray,
  firstLinkedId,
  getBooleanish,
  getSelectText,
  getNumber,
  toDateKey,
  normalizeSendMode,
  getField,
  getRecordId,
} = require("../../lib/reliability-command-center/normalize");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("normalizeBlank empty variants", () => {
  assert.strictEqual(normalizeBlank(null), "");
  assert.strictEqual(normalizeBlank(undefined), "");
  assert.strictEqual(normalizeBlank("  "), "");
  assert.strictEqual(normalizeBlank(null, { asNull: true }), null);
  assert.strictEqual(normalizeBlank("x"), "x");
});

test("normalizeLookupArray flattens airtable shapes", () => {
  assert.deepStrictEqual(normalizeLookupArray(null), []);
  assert.deepStrictEqual(normalizeLookupArray(["recaaaaaaaaaaaaaa"]), [
    "recaaaaaaaaaaaaaa",
  ]);
  assert.deepStrictEqual(normalizeLookupArray([{ id: "recbbbbbbbbbbbbbb" }]), [
    "recbbbbbbbbbbbbbb",
  ]);
  assert.deepStrictEqual(normalizeLookupArray([{ name: "3-5" }]), ["3-5"]);
  assert.deepStrictEqual(normalizeLookupArray([["reccccccccccccccccc"], { id: "recdddddddddddddd" }]), [
    "reccccccccccccccccc",
    "recdddddddddddddd",
  ]);
});

test("firstLinkedId picks valid rec ids", () => {
  assert.strictEqual(firstLinkedId([{ id: "recEnroll00000001" }]), "recEnroll00000001");
  assert.strictEqual(firstLinkedId(["not-an-id"]), "");
});

test("getBooleanish interprets checkbox-like values", () => {
  assert.strictEqual(getBooleanish(true), true);
  assert.strictEqual(getBooleanish(1), true);
  assert.strictEqual(getBooleanish("checked"), true);
  assert.strictEqual(getBooleanish("YES"), true);
  assert.strictEqual(getBooleanish(false), false);
  assert.strictEqual(getBooleanish("0"), false);
  assert.strictEqual(getBooleanish(""), false);
  assert.strictEqual(getBooleanish([true]), true);
});

test("getSelectText reads string or name object", () => {
  assert.strictEqual(getSelectText("Awarded"), "Awarded");
  assert.strictEqual(getSelectText({ name: "Pending" }), "Pending");
  assert.strictEqual(getSelectText([{ name: "Sent" }]), "Sent");
  assert.strictEqual(getSelectText(null), "");
});

test("getNumber parses numbers and nulls", () => {
  assert.strictEqual(getNumber(10), 10);
  assert.strictEqual(getNumber("1,250"), 1250);
  assert.strictEqual(getNumber(""), null);
  assert.strictEqual(getNumber("x"), null);
});

test("toDateKey denver-safe and slash dates", () => {
  assert.strictEqual(toDateKey("2026-07-15"), "2026-07-15");
  assert.strictEqual(toDateKey("7/15/2026"), "2026-07-15");
  assert.strictEqual(toDateKey(""), "");
});

test("normalizeSendMode test/live", () => {
  assert.strictEqual(normalizeSendMode("Test"), "test");
  assert.strictEqual(normalizeSendMode("Live"), "live");
  assert.strictEqual(normalizeSendMode("PROD"), "live");
  assert.strictEqual(normalizeSendMode(""), "");
});

test("getField and getRecordId", () => {
  assert.strictEqual(getField({ fields: { A: 1 } }, "A"), 1);
  assert.strictEqual(getField({ A: 2 }, "A"), 2);
  assert.strictEqual(getRecordId({ id: "recEnroll00000001" }), "recEnroll00000001");
});

console.log("normalize.test.js passed");
