#!/usr/bin/env node
/**
 * Agent 2 Package B — Streak + Shot Milestone integrity on Schmidt 2026-27.
 * Read-only inventory + optional controlled submission create for streak ladder.
 *
 *   node tools/testing/agent2_streak_milestone_probe.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const ENR = "recCyFEPeATOVNlr9";
const ATH = "recgqVstObQRzgXJF";

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

async function api(path, opts = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text.slice(0, 400)}`);
  return data;
}

async function listAll(table, filterByFormula) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    const data = await api(`${encodeURIComponent(table)}?${params}`);
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

async function main() {
  loadEnvLocal();
  const enr = await api(`Enrollments/${ENR}`);
  const streakXp = await listAll(
    "XP Events",
    `AND(FIND("${ENR}", {Source Key} & ""), OR(FIND("STREAK", {Source Key} & ""), {XP Bucket} = "Streak"))`
  );
  const milestoneXp = await listAll(
    "XP Events",
    `AND(FIND("${ENR}", {Source Key} & ""), OR(FIND("MILESTONE", UPPER({Source Key} & "")), {XP Bucket} = "Shot Milestone"))`
  );
  const allXp = await listAll("XP Events", `FIND("${ENR}", {Source Key} & "")`);
  const streaks = await listAll(
    "Streak Occurrences",
    `FIND("${ENR}", ARRAYJOIN({Enrollment}))`
  ).catch(() => []);
  const milestones = await listAll("Shot Milestones").catch(() => []);

  // Dedup check
  const keys = new Map();
  for (const r of allXp) {
    const k = r.fields["Source Key"] || "";
    keys.set(k, (keys.get(k) || 0) + 1);
  }
  const dups = [...keys.entries()].filter(([, c]) => c > 1);

  const out = {
    enrollmentId: ENR,
    athleteId: ATH,
    lifetimeXp: enr.fields["Lifetime XP Earned"],
    lifetimeShots:
      enr.fields["Lifetime Shots Made"] ??
      enr.fields["Total Shots Made"] ??
      enr.fields["Shots Made (Lifetime)"] ??
      null,
    gradeBand: enr.fields["Grade Band"],
    currentLevel: enr.fields["Current Level"],
    nextLevel: enr.fields["Next Level"],
    gateStatus: enr.fields["Gate Status"] || enr.fields["Level Gate Status"] || null,
    xpCount: allXp.length,
    streakXp: streakXp.map((r) => ({
      id: r.id,
      key: r.fields["Source Key"],
      points: r.fields["XP Points"],
      bucket: r.fields["XP Bucket"],
      source: r.fields["XP Source"],
      date: r.fields["XP Activity Date"],
      dateResolved: r.fields["XP Date Resolved"],
    })),
    milestoneXp: milestoneXp.map((r) => ({
      id: r.id,
      key: r.fields["Source Key"],
      points: r.fields["XP Points"],
      bucket: r.fields["XP Bucket"],
      source: r.fields["XP Source"],
    })),
    streakOccurrences: streaks.map((r) => ({ id: r.id, fields: r.fields })),
    activeShotMilestones: milestones
      .filter((r) => r.fields["Active?"] === true)
      .map((r) => ({
        id: r.id,
        name: r.fields.Name || r.fields["Milestone Name"] || r.fields["Shot Milestone Name"],
        threshold: r.fields.Threshold || r.fields["Shot Threshold"] || r.fields.Shots,
        gradeBand: r.fields["Grade Band"],
      })),
    duplicateSourceKeys: dups,
    byBucket: {},
  };
  for (const r of allXp) {
    const b = r.fields["XP Bucket"] || "(none)";
    out.byBucket[b] = (out.byBucket[b] || 0) + 1;
  }

  // Enrollment field names for shots
  out.enrollmentShotLikeFields = Object.keys(enr.fields).filter((k) =>
    /shot|lifetime|streak|gate|level/i.test(k)
  );

  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/STREAK-MILESTONE-PROBE.json",
    JSON.stringify(out, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        lifetimeXp: out.lifetimeXp,
        lifetimeShots: out.lifetimeShots,
        xpCount: out.xpCount,
        streakXp: out.streakXp.length,
        milestoneXp: out.milestoneXp.length,
        dups: out.duplicateSourceKeys.length,
        byBucket: out.byBucket,
        gateStatus: out.gateStatus,
        shotFields: out.enrollmentShotLikeFields,
        sampleStreak: out.streakXp[0] || null,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
