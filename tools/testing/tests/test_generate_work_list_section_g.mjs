#!/usr/bin/env node
/**
 * Contract: Section G summary counts match generated operator queue.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const generator = resolve(root, "tools/docs/generate-work-list-section-g.mjs");
const generatedPath = resolve(root, "docs/_generated-work-list-section-g.md");
const masterPath = resolve(root, "docs/127-SI-MASTER-FUTURE-WORK-LIST.md");

function parseSummaryCounts(text) {
  const pick = (label) => {
    const m = text.match(new RegExp(`\\| ${label} \\| (\\d+) \\|`));
    assert.ok(m, `missing summary row: ${label}`);
    return Number(m[1]);
  };
  return {
    total: pick("Total items"),
    COMPLETE: pick("COMPLETE"),
    IN_PROGRESS: pick("IN PROGRESS"),
    BLOCKED: pick("BLOCKED"),
    READY: pick("READY"),
    DEFERRED: pick("DEFERRED"),
  };
}

test("generate-work-list-section-g produces matching summary arithmetic", () => {
  execFileSync(process.execPath, [generator], { cwd: root, encoding: "utf8" });
  const generated = readFileSync(generatedPath, "utf8");
  const counts = parseSummaryCounts(generated);
  assert.equal(
    counts.COMPLETE +
      counts.IN_PROGRESS +
      counts.BLOCKED +
      counts.READY +
      counts.DEFERRED,
    counts.total,
    "status buckets must sum to total",
  );

  const queueRows = [...generated.matchAll(/^\| \*\*[^*]+\*\* \|/gm)];
  assert.equal(queueRows.length, counts.total, "queue row count must equal Total items");

  assert.match(generated, /\*\*SC-163\*\*.*COMPLETE/s);
  assert.match(generated, /\*\*SC-166\*\*.*Mike-owned\/manual/s);
  assert.match(generated, /\*\*FUT-029\*\*.*DEFERRED/s);
  assert.match(generated, /\*\*AUT-122\*\*.*DEFERRED/s);
  assert.match(generated, /never install/i);
  assert.match(generated, /\*\*SC-SEASON-SIM-002\*\*.*READY/s);
  assert.match(generated, /RUN SEASON SIMULATION/);
});

test("master list Section G summary matches generated file", () => {
  execFileSync(process.execPath, [generator, "--patch-master"], {
    cwd: root,
    encoding: "utf8",
  });
  const generated = parseSummaryCounts(readFileSync(generatedPath, "utf8"));
  const master = readFileSync(masterPath, "utf8");
  const sectionG = master.split("## G. Current work list snapshot")[1] || "";
  const masterCounts = parseSummaryCounts(sectionG);
  assert.deepEqual(masterCounts, generated);
});
