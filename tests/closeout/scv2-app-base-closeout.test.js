import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packetPath = path.join(
  repoRoot,
  "docs",
  "prod-completion",
  "2026-08-10",
  "SCV2-APP-BASE-CLOSEOUT-001.md",
);
const packet = fs.readFileSync(packetPath, "utf8");

test("closeout packet preserves the verified homework identity chain", () => {
  for (const id of [
    "rectWmGA1K2RSN4bp",
    "recPPrwds0oz0EB4C",
    "recyU1G9mWC1rQSst",
    "recgj8dPk4ouTwCOj",
    "rechVLOeyEVIqmy2v",
  ]) {
    assert.match(packet, new RegExp(id));
  }

  assert.match(packet, /005 → 009 → 020/);
  assert.match(packet, /no duplicate created/i);
});

test("each Mike production test card contains the required safety contract", () => {
  for (const title of [
    "Mike-only PROD test card: Automation 067 v3.4",
    "Mike-only PROD paste/install and test card: Automation 115 v2.1",
  ]) {
    assert.match(packet, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const requiredText of [
    "Table:",
    "Trigger:",
    "Run order",
    "Expected result",
    "Return to Cursor",
    "Cleanup",
    "duplicate",
    "console JSON",
  ]) {
    assert.match(packet, new RegExp(requiredText, "i"));
  }

  assert.match(packet, /Automation 115 v2\.1/);
  assert.match(packet, /recCyFEPeATOVNlr9/);
  assert.match(packet, /recgP9qZYjAhE7NXm/);
  assert.match(packet, /Corrected v2\.1 allowlist/i);
  assert.match(packet, /all other enrollments must fail closed/i);
  assert.match(packet, /Paste the committed v2\.1 body/i);
});

test("closeout packet keeps production mutations Mike-owned", () => {
  assert.match(packet, /No web, schema, production-data, automation-activation, or deployment changes/i);
  assert.match(packet, /Cursor did not modify PROD Airtable data/i);
  assert.match(packet, /Do not redesign/i);
  assert.match(packet, /Package 10.*Closed/i);
});
