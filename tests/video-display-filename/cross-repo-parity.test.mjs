#!/usr/bin/env node

/**
 * Cross-repository parity: shooting-challenge lib vs communications formatters.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sc = require("../../lib/video-display-filename");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commRoot = (() => {
  for (const candidate of [
    path.join(path.dirname(root), "communications"),
    path.join(root, "communications"),
  ]) {
    if (fs.existsSync(path.join(candidate, "emails/lib/formatters.js"))) return candidate;
  }
  return null;
})();

if (!commRoot) {
  console.log("skip - communications repo not found beside shooting-challenge");
  process.exit(0);
}

const commFormattersPath = path.join(commRoot, "emails/lib/formatters.js");
const commSource = fs.readFileSync(commFormattersPath, "utf8");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const cases = [
  { custom: "OffTheDribble", original: "upload.mov", expected: "OffTheDribble" },
  { custom: "  ", original: "upload.mov", expected: "upload.mov" },
  { custom: "—", original: "upload.mov", expected: "upload.mov" },
  { custom: "  FreeThrows  ", original: "upload.mov", expected: "FreeThrows" },
  { custom: "", original: "", expected: sc.FALLBACK_LABEL },
];

test("communications resolveVideoFileName matches shared lib precedence", async () => {
  const { resolveVideoFileName } = await import(pathToFileURL(commFormattersPath).href);
  for (const { custom, original, expected } of cases) {
    const scResult = sc.resolveVideoDisplayFileNameWithFallback(custom, original);
    const commResult = resolveVideoFileName({ customVideoFileName: custom, originalFileName: original });
    assert.equal(commResult, expected, `custom=${JSON.stringify(custom)} original=${JSON.stringify(original)}`);
    assert.equal(scResult, expected);
  }
});

test("communications formatters source handles em dash on custom name", () => {
  assert.match(commSource, /custom !== "—"/);
  assert.match(commSource, /resolveVideoFileName/);
});

console.log("cross-repo video-display-filename parity tests passed");
