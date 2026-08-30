#!/usr/bin/env node
/**
 * MRW-E02 / SC-149 — Fairfield branding production attestation (read-only).
 *
 * Fetches live `/shoot` HTML and asserts Fairfield landing URLs with no legacy Hoop hosts.
 * Does not read Vercel dashboard env (Mike-only); validates rendered production output.
 *
 * Usage:
 *   node tools/testing/sc-149-fairfield-attestation.mjs
 *   node tools/testing/sc-149-fairfield-attestation.mjs --write-evidence
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PROD_BASE = "https://www.fairfieldbasketballclub.com/shoot";
const LANDING = "https://www.fairfieldbasketballclub.com";
const WRITE = process.argv.includes("--write-evidence");

const ROUTES = ["", "/leaderboard", "/homework", "/game-manual"];

const FILL_OUT = [
  "https://forms.fairfieldbasketballclub.com/shoot-playerregistration",
  "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
];

async function fetchHtml(path) {
  const url = `${PROD_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "user-agent": "sc-149-fairfield-attestation/1.0" },
  });
  const text = await res.text();
  return { url, status: res.status, text, ok: res.ok };
}

function collectLandingHrefs(html) {
  const hrefs = [];
  const re = /href="(https:\/\/www\.fairfieldbasketballclub\.com[^"]*)"/g;
  let match;
  while ((match = re.exec(html)) !== null) hrefs.push(match[1]);
  return hrefs;
}

function runHttpSmoke() {
  const run = spawnSync(
    process.execPath,
    ["scripts/http-smoke.mjs"],
    {
      cwd: resolve(ROOT, "web"),
      encoding: "utf8",
      env: {
        ...process.env,
        SMOKE_BASE_URL: PROD_BASE,
        SMOKE_REQUIRE_AIRTABLE_CONFIG: "true",
      },
    },
  );
  let summary = null;
  try {
    summary = JSON.parse(run.stdout);
  } catch {
    summary = { parseError: true, stdout: run.stdout?.slice(0, 500), stderr: run.stderr?.slice(0, 500) };
  }
  return { exitCode: run.status ?? 1, summary };
}

async function main() {
  const startedAt = new Date().toISOString();
  const checks = [];
  const failures = [];

  for (const path of ROUTES) {
    const { url, status, text, ok } = await fetchHtml(path);
    const landingHrefs = collectLandingHrefs(text);
    const landingOk = landingHrefs.some((href) => href === LANDING);
    const legacyHost = /hoopchallenges/i.test(text);
    const duplicatedBase = text.includes("/shoot/shoot");

    checks.push({
      route: path || "/",
      url,
      status,
      ok,
      landingLinkCount: landingHrefs.length,
      landingRootPresent: landingOk,
      legacyHoopHost: legacyHost,
      duplicatedBasePath: duplicatedBase,
    });

    if (!ok || status >= 500) failures.push(`${path || "/"} HTTP ${status}`);
    if (path === "" && !landingOk) failures.push("home missing Fairfield landing root href");
    if (legacyHost) failures.push(`${path || "/"} references legacy hoopchallenges host`);
    if (duplicatedBase) failures.push(`${path || "/"} contains /shoot/shoot`);
  }

  try {
    const home = await fetchHtml("");
    for (const formUrl of FILL_OUT) {
      const present = home.text.includes(formUrl);
      checks.push({ name: "fillout-url", url: formUrl, present });
      if (!present) failures.push(`home missing Fillout URL ${formUrl}`);
    }
  } catch (err) {
    failures.push(`fillout scan failed: ${err.message}`);
  }

  const httpSmoke = runHttpSmoke();
  if (httpSmoke.exitCode !== 0) {
    failures.push("http-smoke.mjs failed against production");
  }

  const payload = {
    harness: "MRW-E02",
    backlog: ["SC-149", "MRW-E02"],
    startedAt,
    finishedAt: new Date().toISOString(),
    productionBase: PROD_BASE,
    landingUrl: LANDING,
    pass: failures.length === 0 && httpSmoke.exitCode === 0,
    failureCount: failures.length,
    failures,
    checks,
    httpSmoke: {
      exitCode: httpSmoke.exitCode,
      ok: httpSmoke.summary?.ok,
      failureCount: httpSmoke.summary?.failureCount,
    },
    mikeStillRequired: [
      "Vercel Production NEXT_PUBLIC_LANDING_URL explicit attestation",
      "Vercel Production NEXT_PUBLIC_SITE_URL explicit attestation",
      "Vercel Production NEXT_PUBLIC_BASE_PATH attestation",
    ],
    checklist: "docs/deploy-checklists/SC-149-fairfield-branding-url-verification.md",
  };

  console.log(JSON.stringify(payload, null, 2));

  if (WRITE) {
    const dir = resolve(ROOT, "docs/testing/evidence");
    mkdirSync(dir, { recursive: true });
    const stamp = startedAt.slice(0, 10);
    const out = resolve(dir, `SC-149-FAIRFIELD-ATTESTATION-${stamp}.json`);
    writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
    console.error(`Wrote ${out}`);
  }

  process.exitCode = payload.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
