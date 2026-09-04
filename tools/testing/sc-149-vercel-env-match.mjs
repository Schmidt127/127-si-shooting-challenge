#!/usr/bin/env node
/**
 * SC-149 / MRW-E02 — Vercel Production branding env MATCH check.
 *
 * Pulls Production env via Vercel CLI into a temp file, compares the three
 * NEXT_PUBLIC branding URLs, prints MATCH/MISMATCH only (never raw values),
 * then deletes the temp file.
 *
 * Usage (from repo root, with `.vercel` linked):
 *   node tools/testing/sc-149-vercel-env-match.mjs
 *   node tools/testing/sc-149-vercel-env-match.mjs --environment preview
 *
 * Exit 0 = all required keys MATCH; exit 1 = MISSING/MISMATCH or CLI failure.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const EXPECTED = {
  NEXT_PUBLIC_LANDING_URL: "https://www.fairfieldbasketballclub.com",
  NEXT_PUBLIC_SITE_URL: "https://www.fairfieldbasketballclub.com/shoot",
  NEXT_PUBLIC_BASE_PATH: "/shoot",
};

function parseArgs(argv) {
  let environment = "production";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--environment" && argv[i + 1]) {
      environment = argv[++i];
    }
  }
  return { environment };
}

function parseEnvFile(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    map[line.slice(0, i).trim()] = v;
  }
  return map;
}

function main() {
  const { environment } = parseArgs(process.argv);
  const dir = mkdtempSync(join(tmpdir(), "sc149-vercel-env-"));
  const envPath = join(dir, ".env.local");
  const outPath = join(dir, "pull.out");

  try {
    const pull = spawnSync(
      "vercel",
      ["env", "pull", envPath, "--environment", environment, "--yes"],
      {
        cwd: ROOT,
        encoding: "utf8",
        shell: true,
      },
    );
    writeFileSync(
      outPath,
      `${pull.stdout || ""}\n${pull.stderr || ""}`.trim(),
    );

    if (pull.status !== 0 || !existsSync(envPath)) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            environment,
            error: "vercel env pull failed",
            exitCode: pull.status,
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const map = parseEnvFile(readFileSync(envPath, "utf8"));
    const matrix = {};
    let allMatch = true;

    for (const [key, expected] of Object.entries(EXPECTED)) {
      const present = Object.prototype.hasOwnProperty.call(map, key);
      const actual = present ? map[key] : null;
      let status = "MISSING";
      if (present && actual === expected) status = "MATCH";
      else if (present) status = "MISMATCH";
      if (status !== "MATCH") allMatch = false;
      matrix[key] = {
        status,
        legacyHost: present && /hoop+challenges/i.test(actual || ""),
      };
    }

    const payload = {
      harness: "SC-149-vercel-env-match",
      backlog: ["SC-149", "MRW-E02"],
      environment,
      ok: allMatch,
      matrix,
      note: "Values are never printed — status only.",
    };

    console.log(JSON.stringify(payload, null, 2));
    process.exitCode = allMatch ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
