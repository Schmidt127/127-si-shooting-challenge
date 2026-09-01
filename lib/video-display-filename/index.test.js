#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  FALLBACK_LABEL,
  resolveVideoDisplayFileName,
  resolveVideoDisplayFileNameWithFallback,
} = require("./index");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("prefers Custom Video File Name over original upload name", () => {
  assert.equal(resolveVideoDisplayFileName("OffTheDribble", "upload.mov"), "OffTheDribble");
});

test("trims whitespace on custom name before blank test", () => {
  assert.equal(resolveVideoDisplayFileName("  FreeThrows  ", "upload.mov"), "FreeThrows");
  assert.equal(resolveVideoDisplayFileName("   ", "upload.mov"), "upload.mov");
});

test("treats em dash custom name as blank", () => {
  assert.equal(resolveVideoDisplayFileName("—", "upload.mov"), "upload.mov");
  assert.equal(resolveVideoDisplayFileName(" — ", "upload.mov"), "upload.mov");
});

test("falls back to original upload name", () => {
  assert.equal(resolveVideoDisplayFileName("", "athlete-week4.mp4"), "athlete-week4.mp4");
  assert.equal(resolveVideoDisplayFileName(null, "  clip.mov  "), "clip.mov");
});

test("returns empty string when both sources are unusable", () => {
  assert.equal(resolveVideoDisplayFileName("", ""), "");
  assert.equal(resolveVideoDisplayFileName("—", "—"), "");
});

test("withFallback returns Video submission as final fallback", () => {
  assert.equal(resolveVideoDisplayFileNameWithFallback("", ""), FALLBACK_LABEL);
  assert.equal(resolveVideoDisplayFileNameWithFallback("—", ""), FALLBACK_LABEL);
  assert.equal(resolveVideoDisplayFileNameWithFallback("Custom", "orig.mov"), "Custom");
});

console.log("video-display-filename tests passed");
