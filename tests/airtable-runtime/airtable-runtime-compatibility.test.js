#!/usr/bin/env node
"use strict";

/**
 * Permanent static gate for Airtable Automation paste targets.
 *
 * The scanner intentionally covers only production paste targets:
 * - root-level `.js` files under airtable/automations/shooting-challenge/
 * - excludes lib/, test files, _superseded/, and _design-alternatives/
 *
 * Keep the allowlist empty unless an Airtable-compatible exception is proven
 * by a runtime test and documented in this file.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { test } = require("node:test");

const ROOT = path.resolve(
  __dirname,
  "../../airtable/automations/shooting-challenge",
);

const ALLOWLIST = new Map();

const CHECKED_HELPERS = [
  "assertFieldExists",
  "fieldExists",
  "getFieldSafe",
  "isWritableField",
  "requireField",
  "requireWritableField",
  "setOutputSafe",
];

function productionScripts() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".js") &&
        !entry.name.endsWith(".test.js"),
    )
    .map((entry) => path.join(ROOT, entry.name))
    .sort();
}

function maskCommentsAndStrings(source) {
  let output = "";
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (lineComment) {
      output += current === "\n" ? "\n" : " ";
      if (current === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      output += current === "\n" ? "\n" : " ";
      if (current === "*" && next === "/") {
        output += " ";
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (!quote && current === "/" && next === "/") {
      output += "  ";
      index += 1;
      lineComment = true;
      continue;
    }

    if (!quote && current === "/" && next === "*") {
      output += "  ";
      index += 1;
      blockComment = true;
      continue;
    }

    if (quote) {
      output += current === "\n" ? "\n" : " ";
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === quote) {
        quote = "";
      }
      continue;
    }

    if (current === "'" || current === '"' || current === "`") {
      quote = current;
      output += " ";
      continue;
    }

    output += current;
  }

  return output;
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function finding(file, source, offset, code, reason, replacement) {
  return {
    file: path.relative(path.resolve(ROOT, "../..", "../.."), file),
    line: lineNumber(source, offset),
    code,
    reason,
    replacement,
  };
}

function matches(file, source, masked, pattern, reason, replacement) {
  const findings = [];
  for (const match of masked.matchAll(pattern)) {
    const offset = match.index ?? 0;
    const line = source.split("\n")[lineNumber(source, offset) - 1].trim();
    const key = `${path.basename(file)}:${lineNumber(source, offset)}:${reason}`;
    if (!ALLOWLIST.has(key)) {
      findings.push(finding(file, source, offset, line, reason, replacement));
    }
  }
  return findings;
}

function undefinedHelperFindings(file, source, masked) {
  const findings = [];
  for (const name of CHECKED_HELPERS) {
    const declaration = new RegExp(
      `\\bfunction\\s+${name}\\s*\\(`,
    ).test(masked);
    if (declaration) continue;

    const callPattern = new RegExp(`\\b${name}\\s*\\(`, "g");
    for (const match of masked.matchAll(callPattern)) {
      const offset = match.index ?? 0;
      const line = source.split("\n")[lineNumber(source, offset) - 1].trim();
      const key = `${path.basename(file)}:${lineNumber(source, offset)}:undefined helper`;
      if (!ALLOWLIST.has(key)) {
        findings.push(
          finding(
            file,
            source,
            offset,
            line,
            `Call to helper "${name}" has no local declaration.`,
            "Define the helper in the pasted script or use an Airtable-supported global.",
          ),
        );
      }
    }
  }

  return findings;
}

function scanFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const masked = maskCommentsAndStrings(source);
  return [
    ...matches(
      file,
      source,
      masked,
      /\b(?:setTimeout|setInterval|clearTimeout|clearInterval)\s*\(/g,
      "Timer APIs are not available in Airtable Automations.",
      "Use record state/latches and a later natural automation run.",
    ),
    ...matches(
      file,
      source,
      masked,
      /new\s+Promise\s*\([^)]*\b(?:setTimeout|setInterval)\b/g,
      "Promise-based timer waits are unsupported in Airtable Automations.",
      "Remove the wait and retry through persisted state on a later run.",
    ),
    ...matches(
      file,
      source,
      masked,
      /(?:const|let|var)\s+\w+\s*=\s*Date\.now\s*\(\s*\)[\s\S]{0,240}\bwhile\s*\(/g,
      "Busy-wait loops block the Airtable Automation execution window.",
      "Use a later natural run instead of blocking the current execution.",
    ),
    ...matches(
      file,
      source,
      masked,
      /\brequire\s*\(|^\s*import\s+|\bprocess\.(?:env|exit|exitCode)\b|\bBuffer\b|\b(?:fs|path|crypto)\./gm,
      "Node.js runtime APIs are unavailable in Airtable Automations.",
      "Keep Node APIs in offline tests; use Airtable runtime globals in paste targets.",
    ),
    ...matches(
      file,
      source,
      masked,
      /\b(?:window|document|localStorage|sessionStorage)\b/g,
      "Browser globals are unavailable in Airtable Automations.",
      "Use Airtable input, output, base, and table APIs.",
    ),
    ...matches(
      file,
      source,
      source,
      /(?<![\w.])fetch\s*\(/g,
      "The Airtable-compatible networking API is remoteFetchAsync.",
      "Call remoteFetchAsync(url, request) directly.",
    ),
    ...undefinedHelperFindings(file, source, masked),
  ];
}

function scanProductionScripts() {
  return productionScripts().flatMap(scanFile);
}

function runCompatibilityScan() {
  const findings = scanProductionScripts();
  assert.deepStrictEqual(
    findings,
    [],
    `Airtable runtime compatibility findings:\n${findings
      .map(
        (item) =>
          `- ${item.file}:${item.line} ${item.code}\n  Reason: ${item.reason}\n  Replacement: ${item.replacement}`,
      )
      .join("\n")}`,
  );
  return findings;
}

test("all Airtable-pasteable production scripts pass runtime compatibility", () => {
  runCompatibilityScan();
});

module.exports = {
  productionScripts,
  scanFile,
  scanProductionScripts,
  runCompatibilityScan,
};
