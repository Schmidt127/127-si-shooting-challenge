#!/usr/bin/env node
/**
 * Link active canonical XP Events to WAS after read-only reconciliation proves a gap.
 * Only patches Weekly Athlete Summary on XP Events that are already active for the pair.
 *
 * Usage:
 *   node tools/testing/repair_was_xp_links.mjs reczxTIpVI8ZJLex0           # dry-run
 *   node tools/testing/repair_was_xp_links.mjs reczxTIpVI8ZJLex0 --live      # write
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WAS_ID = process.argv[2] || "reczxTIpVI8ZJLex0";
const LIVE = process.argv.includes("--live");
const OUT = `/opt/cursor/artifacts/was-xp-link-repair-${WAS_ID}.json`;

function loadEnv() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();
const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = process.env.AIRTABLE_BASE_ID || "appn84sqPw03zEbTT";
if (!TOKEN) {
  console.error("Missing AIRTABLE_API_TOKEN");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(`${method} ${path}: ${text.slice(0, 800)}`);
  return data;
}

async function get(table, id) {
  return api("GET", `${encodeURIComponent(table)}/${id}`);
}

async function listEnrollmentXp(enrollmentId) {
  const out = [];
  let offset;
  do {
    const params = new URLSearchParams({
      filterByFormula: `{Enrollment Record ID}="${enrollmentId}"`,
      pageSize: "100",
    });
    [
      "Active?",
      "XP Points",
      "Week",
      "Weekly Athlete Summary",
      "XP Source",
      "XP Bucket",
      "Source Key",
    ].forEach((f) => params.append("fields[]", f));
    if (offset) params.set("offset", offset);
    const body = await api("GET", `${encodeURIComponent("XP Events")}?${params}`);
    out.push(...body.records);
    offset = body.offset;
  } while (offset);
  return out;
}

function first(arr) {
  return Array.isArray(arr) ? arr[0] : undefined;
}

async function main() {
  const was = await get("Weekly Athlete Summary", WAS_ID);
  const enrollmentId = first(was.fields?.Enrollment);
  const weekId = first(was.fields?.Week);
  if (!enrollmentId || !weekId) throw new Error("WAS missing Enrollment or Week");

  const beforeWeeklyXp = Number(was.fields?.["XP Earned This Week"] || 0);
  const allXp = (await listEnrollmentXp(enrollmentId)).filter((r) =>
    (r.fields.Week || []).includes(weekId),
  );
  const toLink = allXp.filter(
    (r) =>
      r.fields["Active?"] === true &&
      !(r.fields["Weekly Athlete Summary"] || []).includes(WAS_ID),
  );

  const canonicalTotal = allXp
    .filter((r) => r.fields["Active?"] === true)
    .reduce((sum, r) => sum + Number(r.fields["XP Points"] || 0), 0);
  const linkPoints = toLink.reduce((sum, r) => sum + Number(r.fields["XP Points"] || 0), 0);

  const actions = [];
  for (const row of toLink) {
    const action = {
      xpEventId: row.id,
      xpBucket: row.fields["XP Bucket"],
      xpSource: row.fields["XP Source"]?.name || row.fields["XP Source"],
      xpPoints: row.fields["XP Points"],
      sourceKey: row.fields["Source Key"],
      mode: LIVE ? "linked" : "dry_run_link",
    };
    if (LIVE) {
      await api("PATCH", `${encodeURIComponent("XP Events")}/${row.id}`, {
        fields: { "Weekly Athlete Summary": [WAS_ID] },
      });
    }
    actions.push(action);
  }

  const afterWas = LIVE ? await get("Weekly Athlete Summary", WAS_ID) : null;
  const afterWeeklyXp = LIVE
    ? Number(afterWas.fields?.["XP Earned This Week"] || 0)
    : beforeWeeklyXp + linkPoints;

  const report = {
    ranAt: new Date().toISOString(),
    live: LIVE,
    wasId: WAS_ID,
    enrollmentId,
    weekId,
    beforeWeeklyXp,
    afterWeeklyXp,
    canonicalTotal,
    linkedEventCount: toLink.length,
    linkedXpPoints: linkPoints,
    actions,
    verified: LIVE
      ? Math.abs(afterWeeklyXp - canonicalTotal) < 0.001
      : Math.abs(beforeWeeklyXp + linkPoints - canonicalTotal) < 0.001,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
