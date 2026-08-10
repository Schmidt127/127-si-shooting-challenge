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

function runWithDiff(diff) {
  try {
    const stdout = execFileSync(process.execPath, [audit], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, SOT_AUDIT_DIFF: diff },
    });
    return { status: 0, output: stdout };
  } catch (error) {
    return {
      status: error.status,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

test("implementation changes without Completion Master update fail", () => {
  const result = runWithDiff(
    [
      "diff --git a/web/example.tsx b/web/example.tsx",
      "+++ b/web/example.tsx",
      "+changed implementation",
    ].join("\n"),
  );
  assert.equal(result.status, 1);
  assert.match(result.output, /must update the Completion Master evidence row/);
});

test("Completion Master update without structured trace entry fails", () => {
  const result = runWithDiff(
    [
      "diff --git a/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md b/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
      "+++ b/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
      "+ordinary documentation update",
    ].join("\n"),
  );
  assert.equal(result.status, 0);

  const implementationResult = runWithDiff(
    [
      "diff --git a/tools/example.mjs b/tools/example.mjs",
      "+++ b/tools/example.mjs",
      "+implementation change",
      "diff --git a/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md b/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
      "+++ b/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
      "+ordinary documentation update",
    ].join("\n"),
  );
  assert.equal(implementationResult.status, 1);
  assert.match(
    implementationResult.output,
    /must add "Execution matrix IDs advanced: PKG-###"/,
  );
});

test("valid structured trace entry passes", () => {
  const result = runWithDiff(
    [
      "diff --git a/tools/example.mjs b/tools/example.mjs",
      "+++ b/tools/example.mjs",
      "+implementation change",
      "diff --git a/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md b/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
      "+++ b/docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
      "@@ -1,1 +1,2 @@",
      "+Execution matrix IDs advanced: PKG-001",
    ].join("\n"),
  );
  assert.equal(result.status, 0);
  assert.match(result.output, /^PASS source-of-truth audit:/);
});
