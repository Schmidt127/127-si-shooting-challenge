/**
 * Airtable Extension compatibility checks for migrate-tutorials-into-tutorials-and-assets.
 * Run: node airtable/extension-scripts/safe-backfills/migrate-tutorials-into-tutorials-and-assets.compat.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const scriptPath = path.join(__dirname, "migrate-tutorials-into-tutorials-and-assets.js");
const source = fs.readFileSync(scriptPath, "utf8");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("defaults stay dry-run / no write", () => {
  assert.match(source, /const DRY_RUN = true/);
  assert.match(source, /const CONFIRM_WRITE = false/);
});

test("never deletes or creates schema", () => {
  assert.doesNotMatch(source, /\.deleteRecordAsync\s*\(/);
  assert.doesNotMatch(source, /\.deleteTableAsync\s*\(/);
  assert.doesNotMatch(source, /\.createFieldAsync\s*\(/);
  assert.doesNotMatch(source, /\.createTableAsync\s*\(/);
  assert.doesNotMatch(source, /\.updateTableAsync\s*\(/);
  assert.match(source, /No createFieldAsync \/ createTableAsync/);
});

test("unloadData is guarded via safeUnloadQuery", () => {
  assert.match(source, /function safeUnloadQuery\(/);
  assert.match(source, /safeUnloadQuery\(sourceQuery\)/);
  assert.match(source, /safeUnloadQuery\(targetQuery\)/);
  assert.doesNotMatch(source, /^\s*sourceQuery\.unloadData\(\)/m);
  assert.doesNotMatch(source, /^\s*targetQuery\.unloadData\(\)/m);
});

test("primary Name uses confirmed field ID (BOM-safe)", () => {
  assert.match(source, /primaryNameFieldId:\s*"fldduBizp8qAnAMJW"/);
  assert.match(source, /function resolveTargetPrimaryNameField\(/);
  assert.match(source, /writeKey:\s*field\.id/);
  assert.match(source, /Do not create a duplicate Name field/);
});

test("WRITE preflight blocks missing legacy/migration/report schema and wrong base", () => {
  assert.match(source, /function buildWritePreflight\(/);
  assert.match(source, /missing_legacy_tutorials_record_id/);
  assert.match(source, /missing_migration_status/);
  assert.match(source, /missing_report_table/);
  assert.match(source, /wrong_base/);
  assert.match(source, /abortedForPreflight/);
  assert.match(source, /WRITE_ABORTED_PREFLIGHT/);
  assert.match(source, /writesEnabled && !preflight\.ok/);
});

test("select writes use Airtable object shapes + option validation", () => {
  assert.match(source, /function toSingleSelectValue\(/);
  assert.match(source, /function toMultiSelectValue\(/);
  assert.match(source, /select_option_missing/);
  assert.match(source, /out\.push\(\{\s*name:\s*match\.name\s*\}\)/);
  assert.match(source, /return \{\s*name:\s*match\.name\s*\}/);
});

test("mutations are throttled to 15 per 1000ms with retry", () => {
  assert.match(source, /MAX_MUTATIONS_PER_WINDOW = 15/);
  assert.match(source, /MUTATION_WINDOW_MS = 1000/);
  assert.match(source, /function createMutationGate\(/);
  assert.match(source, /function mutateWithRetry\(/);
  assert.match(source, /isRateLimitError/);
  assert.match(source, /trackedMutate/);
});

test("safe behavior: create only NO_MATCH_CREATE; no merge/overwrite path", () => {
  assert.match(source, /CLASSIFICATION\.CREATE/);
  assert.match(source, /never auto-merges/i);
  assert.match(source, /Existing Tutorials & Assets rows were not overwritten/);
  assert.match(source, /Overlaps were not merged/);
  assert.match(source, /reportTable\.updateRecordAsync/);
  assert.doesNotMatch(source, /targetTable\.updateRecordAsync/);
});

test("PROD base and table IDs are locked; no stale Production runtime wording", () => {
  assert.match(source, /baseId:\s*"appn84sqPw03zEbTT"/);
  assert.match(source, /source:\s*"tbldfoVGdhqATi4MS"/);
  assert.match(source, /target:\s*"tblDOTgsWfqPm18bw"/);
  assert.match(source, /report:\s*"tblxualvnUsgcpu0z"/);
  assert.match(source, /getConfiguredTable\(/);
  assert.match(source, /assertProdBaseContext\(/);
  assert.doesNotMatch(source, /live Production schema/i);
  assert.doesNotMatch(source, /appn84sqPw03zEbTT/);
});

test("full report baseline 28 high / 3 possible / 1 create is embedded", () => {
  assert.match(source, /highConfidenceMatches:\s*28/);
  assert.match(source, /possibleMatches:\s*3/);
  assert.match(source, /noMatchCreate:\s*1/);
  assert.match(source, /Shooting Challenge Information Poster/);
  assert.match(source, /fullReport:/);
  assert.match(source, /lastDryRunBaseline/);
});

test("helpers load in a sandbox without calling main / base", () => {
  const helperSource = source.slice(0, source.indexOf("async function main()"));
  assert.ok(helperSource.includes("function safeUnloadQuery"));
  const exported = vm.runInNewContext(
    `(function () {
      ${helperSource}
      return {
        version: CONFIG.version,
        primaryId: CONFIG.target.primaryNameFieldId,
        baseline: CONFIG.lastDryRunBaseline,
        prod: CONFIG.prod,
        safeUnloadQuery,
        resolveTargetPrimaryNameField,
        buildWritePreflight,
        toMultiSelectValue,
        toSingleSelectValue,
        mutateWithRetry,
      };
    })()`,
    { console, URL, setTimeout },
  );
  assert.strictEqual(exported.version, "v1.2");
  assert.strictEqual(exported.primaryId, "fldduBizp8qAnAMJW");
  assert.strictEqual(exported.prod.baseId, "appn84sqPw03zEbTT");
  assert.strictEqual(exported.baseline.highConfidenceMatches, 28);
  assert.strictEqual(exported.baseline.possibleMatches, 3);
  assert.strictEqual(exported.baseline.noMatchCreate, 1);
  assert.strictEqual(typeof exported.toMultiSelectValue, "function");
  assert.strictEqual(typeof exported.toSingleSelectValue, "function");
  assert.strictEqual(typeof exported.mutateWithRetry, "function");
});

console.log("\nAll migrate-tutorials-into-tutorials-and-assets compatibility tests passed.");
