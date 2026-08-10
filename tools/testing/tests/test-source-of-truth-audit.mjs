import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const audit = resolve(repoRoot, "tools/testing/audit-source-of-truth.mjs");

test("active source-of-truth references pass the deterministic audit", () => {
  const output = execFileSync(process.execPath, [audit], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.match(output, /^PASS source-of-truth audit:/);
});
