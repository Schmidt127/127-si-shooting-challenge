#!/usr/bin/env node
/**
 * Lightweight read-only HTTP smoke for `/shoot`.
 *
 * Does not use a browser, does not submit forms, and does not create Airtable data.
 *
 * Usage:
 *   node scripts/http-smoke.mjs
 *   SMOKE_BASE_URL=https://www.fairfieldbasketballclub.com/shoot node scripts/http-smoke.mjs
 *   SMOKE_REQUIRE_AIRTABLE_CONFIG=true node scripts/http-smoke.mjs
 *   SMOKE_BASE_URL=https://<preview>.vercel.app/shoot node scripts/http-smoke.mjs
 *
 * Exit 0 on pass, 1 on failure. Writes JSON summary to stdout (and optional file).
 */

const DEFAULT_BASE = "http://127.0.0.1:3001/shoot";
const base = (process.env.SMOKE_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
const outPath = process.env.SMOKE_OUT || "";
const requireAirtableConfig = process.env.SMOKE_REQUIRE_AIRTABLE_CONFIG === "true";

const ROUTES = [
  "",
  "/leaderboard",
  "/homework",
  "/tutorials",
  "/shoutouts",
  "/articles",
  "/levels",
  "/achievements",
  "/zoom-meetings",
  "/game-manual",
  "/public-display",
  "/dashboard",
  "/athletes/demo-athlete",
  "/athletes/schmidt",
  "/admin",
  "/api/airtable",
  "/definitely-not-a-smoke-route",
];

const ASSETS = [
  "/favicon.ico",
  "/favicon.png",
  "/brand/logo-circle-blue-orange.png",
  "/brand/logo-v1-blue-orange.png",
];

const FILL_OUT = [
  "https://forms.fairfieldbasketballclub.com/shoot-playerregistration",
  "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
];

const LANDING = "https://www.fairfieldbasketballclub.com";

async function fetchStatus(url, { followRedirects = true } = {}) {
  const res = await fetch(url, {
    redirect: followRedirects ? "follow" : "manual",
    headers: { "user-agent": "shooting-challenge-http-smoke/1.0" },
  });
  const text = await res.text();
  return { status: res.status, url: res.url, text, ok: res.ok };
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

async function main() {
  const startedAt = new Date().toISOString();
  const failures = [];
  const results = { routes: [], assets: [], checks: [] };

  for (const path of ROUTES) {
    const url = `${base}${path}`;
    try {
      const { status, text } = await fetchStatus(url);
      const isNotFoundProbe = path.includes("definitely-not-a-smoke-route");
      const entry = { path: path || "/", url, status };
      results.routes.push(entry);

      if (isNotFoundProbe) {
        assert(status === 404, `expected 404 for ${path}, got ${status}`, failures);
      } else if (path === "/api/airtable") {
        assert(status === 200, `api health status ${status}`, failures);
        try {
          const json = JSON.parse(text);
          assert(typeof json.ok === "boolean", "api health ok is not boolean", failures);
          if (requireAirtableConfig) {
            assert(json.ok === true, "api health ok!==true", failures);
          }
          results.checks.push({
            name: "airtable-health",
            tokenValid: Boolean(json?.airtable?.tokenValid),
            configured: Boolean(json?.airtable?.configured),
            required: requireAirtableConfig,
          });
        } catch {
          failures.push("api health response is not JSON");
        }
      } else {
        assert(status < 500, `${path || "/"} returned ${status}`, failures);
        assert(status !== 404, `${path || "/"} returned 404`, failures);
        assert(!text.includes("/shoot/shoot"), `${path || "/"} HTML contains /shoot/shoot`, failures);
      }
    } catch (err) {
      failures.push(`${path || "/"} fetch failed: ${err.message}`);
      results.routes.push({ path: path || "/", url, error: err.message });
    }
  }

  for (const asset of ASSETS) {
    const url = `${base}${asset}`;
    try {
      const { status } = await fetchStatus(url);
      results.assets.push({ asset, url, status });
      assert(status < 400 && status !== 404, `asset ${asset} status ${status}`, failures);
    } catch (err) {
      failures.push(`asset ${asset} failed: ${err.message}`);
      results.assets.push({ asset, url, error: err.message });
    }
  }

  // Home HTML external URL checks (read-only — do not POST forms).
  try {
    const home = await fetchStatus(`${base}/`);
    for (const formUrl of FILL_OUT) {
      const present = home.text.includes(formUrl);
      results.checks.push({ name: "fillout-url", url: formUrl, present });
      assert(present, `home missing Fillout URL ${formUrl}`, failures);
    }
    const landingPresent = home.text.includes(`href="${LANDING}"`);
    results.checks.push({ name: "landing-url", url: LANDING, present: landingPresent });
    assert(landingPresent, `home missing landing href ${LANDING}`, failures);
    assert(
      !/hoopchallenges/i.test(home.text),
      "home still references legacy or typo Hoop Challenges host",
      failures,
    );
  } catch (err) {
    failures.push(`home external URL scan failed: ${err.message}`);
  }

  const summary = {
    ok: failures.length === 0,
    base,
    startedAt,
    finishedAt: new Date().toISOString(),
    failureCount: failures.length,
    failures,
    results,
    notes: [
      "Read-only HTTP smoke — no form submissions, no Airtable writes.",
      requireAirtableConfig
        ? "Airtable health is required for this run."
        : "Airtable health is reported but not required for this configuration-free local run.",
      "Browser console and interactive nav coverage live in Playwright production-smoke.spec.ts.",
    ],
  };

  const json = JSON.stringify(summary, null, 2);
  process.stdout.write(`${json}\n`);
  if (outPath) {
    const fs = await import("node:fs/promises");
    await fs.writeFile(outPath, `${json}\n`, "utf8");
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.stack || err) }, null, 2));
  process.exit(1);
});
