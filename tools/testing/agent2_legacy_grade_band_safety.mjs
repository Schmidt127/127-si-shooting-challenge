#!/usr/bin/env node
/**
 * Soft-archive legacy overlapping Grade Bands (Active?=false already) — verify zero live links first.
 * Does NOT delete; only confirms safety + optionally strengthens Notes.
 *
 *   node tools/testing/agent2_legacy_grade_band_safety.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const LEGACY = ["recg6zvMxWsFSn7sf", "recOGisMZRWgk445o"]; // Grades 1-2, Grades 9-10

function loadEnvLocal() {
  for (const p of [".env.local", "web/.env.local", ".env"]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

async function api(path) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` },
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text.slice(0, 400)}`);
  return data;
}

async function main() {
  loadEnvLocal();
  const out = { bands: [], safeToHide: true };
  for (const id of LEGACY) {
    const rec = await api(`Grade%20Bands/${id}`);
    const f = rec.fields;
    const linkFields = [
      "Enrollments",
      "Weekly Athlete Summary",
      "Homework Completions",
      "Video Feedback",
      "Target Goal Shots",
      "XP Reward Rules",
      "FBC Curriculum - SYNC",
      "Shot Milestones",
    ];
    const links = {};
    for (const lf of linkFields) {
      const v = f[lf];
      if (Array.isArray(v) && v.length) links[lf] = v;
    }
    const entry = {
      id,
      name: f["Grade Band Name"],
      active: f["Active?"] === true,
      linkCounts: Object.fromEntries(
        Object.entries(links).map(([k, v]) => [k, v.length])
      ),
      hasLiveAthletePathLinks: Boolean(
        links.Enrollments || links["Weekly Athlete Summary"] || links["Homework Completions"]
      ),
    };
    if (entry.hasLiveAthletePathLinks || entry.active) out.safeToHide = false;
    out.bands.push(entry);
  }
  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/LEGACY-GRADE-BAND-SAFETY.json",
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
