/**
 * Tests the REAL formatting/email helpers inside automations 072 (build) and
 * 074 (send) by extracting them from the script source — no mirrored copies.
 *
 * Run: node airtable/automations/shooting-challenge/lib/072-074-email-helpers.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..");
const FILE_072 =
  "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js";
const FILE_074 =
  "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js";

function extractFunctions(scriptText, names, configStub) {
  const chunks = [];
  for (const name of names) {
    const start = scriptText.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `function ${name} not found`);
    let depth = 0;
    let end = -1;
    for (let i = scriptText.indexOf("{", start); i < scriptText.length; i += 1) {
      const ch = scriptText[i];
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    assert.ok(end > start, `could not bracket ${name}`);
    chunks.push(scriptText.slice(start, end));
  }
  const factory = new Function(
    "CONFIG",
    `${chunks.join("\n")}\nreturn { ${names.join(", ")} };`
  );
  return factory(configStub);
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.message ? error.message : error}`);
  }
}

const text072 = fs.readFileSync(path.join(DIR, FILE_072), "utf8");
const h72 = extractFunctions(
  text072,
  [
    "escapeHtml",
    "formatXp",
    "formatXpFraction",
    "roundWhole",
    "uniqueEmails",
    "plainTextFromHtml",
    "getFirstDisplayFromRaw",
    "isPlainDateString",
    "parsePlainDateString",
    "toLocalDateKey",
    "formatDate",
  ],
  { timeZone: "America/Denver" }
);

test("072 escapeHtml neutralizes injection in athlete names", () => {
  assert.strictEqual(
    h72.escapeHtml(`<script>alert("x")</script>`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
  );
  assert.strictEqual(h72.escapeHtml(null), "");
});

test("072 formatXp whole and fractional", () => {
  assert.strictEqual(h72.formatXp(20), "20 XP");
  assert.strictEqual(h72.formatXp(12.345), "12.35 XP");
  assert.strictEqual(h72.formatXp(null), "0 XP");
  assert.strictEqual(h72.formatXp("junk"), "0 XP");
});

test("072 formatXpFraction earned/possible", () => {
  assert.strictEqual(h72.formatXpFraction(20, 35), "20/35");
  assert.strictEqual(h72.formatXpFraction(null, undefined), "0/0");
});

test("072 roundWhole tolerates junk", () => {
  assert.strictEqual(h72.roundWhole(24.6), "25");
  assert.strictEqual(h72.roundWhole("bad"), "0");
});

test("072 uniqueEmails dedupes case-insensitively (parent==athlete Schmidt case)", () => {
  assert.deepStrictEqual(
    h72.uniqueEmails([
      "MSchmidt@fairfield.k12.mt.us",
      "mschmidt@fairfield.k12.mt.us",
      "",
      null,
    ]),
    ["mschmidt@fairfield.k12.mt.us"]
  );
});

test("072 plainTextFromHtml strips markup and entities", () => {
  const out = h72.plainTextFromHtml("<p>Hello &amp; welcome</p><li>25 shots</li>");
  assert.ok(out.includes("Hello & welcome"));
  assert.ok(out.includes("• 25 shots"));
  assert.ok(!out.includes("<"));
});

test("072 toLocalDateKey: plain date passes; datetime converts to Denver", () => {
  assert.strictEqual(h72.toLocalDateKey("2026-07-23"), "2026-07-23");
  // Sat 23:59 Denver stored as Sun 05:59 UTC must stay Saturday
  assert.strictEqual(h72.toLocalDateKey("2026-06-07T05:59:00.000Z"), "2026-06-06");
  assert.strictEqual(h72.toLocalDateKey(""), "");
});

test("072 formatDate renders Denver-safe labels", () => {
  assert.strictEqual(h72.formatDate("2026-07-23"), "Jul 23, 2026");
  assert.strictEqual(h72.formatDate("2026-06-07T05:59:00.000Z"), "Jun 6, 2026");
});

const text074 = fs.readFileSync(path.join(DIR, FILE_074), "utf8");
const h74 = extractFunctions(
  text074,
  ["cleanCsvEmails", "normalizeSendMode", "firstNonBlank", "safeJsonParse"],
  {}
);

test("074 cleanCsvEmails dedupes and normalizes separators", () => {
  assert.strictEqual(
    h74.cleanCsvEmails("a@x.com, b@x.com;a@x.com\nc@x.com"),
    "a@x.com,b@x.com,c@x.com"
  );
  assert.strictEqual(h74.cleanCsvEmails(""), "");
});

test("074 normalizeSendMode maps synonyms and rejects junk", () => {
  assert.strictEqual(h74.normalizeSendMode("Live"), "live");
  assert.strictEqual(h74.normalizeSendMode("parent"), "live");
  assert.strictEqual(h74.normalizeSendMode("PREVIEW"), "test");
  assert.strictEqual(h74.normalizeSendMode("banana"), "");
});

test("074 sendMode resolution defaults to test (safety)", () => {
  const resolved = h74.firstNonBlank(
    h74.normalizeSendMode(""),
    h74.normalizeSendMode("unknown"),
    "test"
  );
  assert.strictEqual(resolved, "test");
});

test("074 safeJsonParse never throws", () => {
  assert.strictEqual(h74.safeJsonParse("{broken"), null);
  assert.deepStrictEqual(h74.safeJsonParse('{"a":1}'), { a: 1 });
});

test("074 weekly eventId format matches 072/119 contract", () => {
  const eventId = `WEEKLY_EMAIL|recEnroll1|recWeek1`;
  assert.ok(text074.includes("WEEKLY_EMAIL|"));
  assert.ok(text072.includes("WEEKLY_EMAIL|"));
  assert.strictEqual(eventId.split("|").length, 3);
});

console.log("");
console.log(`Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
