#!/usr/bin/env node
/**
 * Diagnose why 066 Shot Milestone Check is not clearing / awarding.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const ENR = "recCyFEPeATOVNlr9";
const BAND_34 = "reclWDQZzKbVBtdhG";

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
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
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
  const milestones = await listAll("Shot Milestones");
  const achievements = await listAll("Achievements", `FIND("Milestone", {Name} & "")`).catch(
    () => []
  );

  // Normalize milestone fields
  const milNorm = milestones.map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      name: f.Name || f["Milestone Name"] || f["Shot Milestone"] || f["Display Name"],
      active: f["Active?"] === true,
      threshold:
        f.Threshold ??
        f["Shot Threshold"] ??
        f["Shots Required"] ??
        f["Milestone Shots"] ??
        f.Shots,
      gradeBand: f["Grade Band"] || [],
      matchesBand34: (f["Grade Band"] || []).includes(BAND_34),
      allKeys: Object.keys(f),
    };
  });

  const eligible = milNorm.filter(
    (m) =>
      m.active &&
      m.matchesBand34 &&
      typeof m.threshold === "number" &&
      m.threshold <= (enr.fields["Total Shots Counted"] || 0)
  );

  // Gate debug + level fields
  const out = {
    enrollment: {
      id: ENR,
      gradeBand: enr.fields["Grade Band"],
      shots: enr.fields["Total Shots Counted"],
      runCheck: enr.fields["Run Shot Milestone Check?"],
      levelRecalc: enr.fields["Level Recalc Needed?"],
      levelStatus: enr.fields["Level Status"],
      gateSummary: enr.fields["Gate Summary"],
      gateDebug: enr.fields["Gate Debug Summary"],
      gateFailure: enr.fields["Gate Failure Summary - Formula"],
      meets: {
        submissions: enr.fields["Meets Gate: Submissions"],
        streak: enr.fields["Meets Gate: Streak"],
        videos: enr.fields["Meets Gate: Videos"],
        homework: enr.fields["Meets Gate: Homework"],
        zoom: enr.fields["Meets Gate: Zoom Meetings"],
      },
      gateMinimums: {
        submissions: enr.fields["Gate Minimum: Submissions"],
        streak: enr.fields["Gate Minimum: Streak Days"],
        videos: enr.fields["Gate Minimum: Videos"],
        homework: enr.fields["Gate Minimum: Homework"],
        zoom: enr.fields["Gate Minimum: Zoom Meetings"],
      },
      currentLevel: enr.fields["Current Level"],
      nextLevel: enr.fields["Next Level"],
      currentStreak: enr.fields["Current Shooting Streak"],
    },
    shotMilestoneCount: milNorm.length,
    activeMilestones: milNorm.filter((m) => m.active).length,
    band34Milestones: milNorm.filter((m) => m.matchesBand34),
    eligibleByShots: eligible,
    sampleMilestoneFieldKeys: milNorm[0]?.allKeys || [],
    achievementsSample: achievements.slice(0, 5).map((r) => ({
      id: r.id,
      name: r.fields.Name,
      active: r.fields["Active?"],
    })),
  };

  // Try reading Automations inventory table if it tracks 066
  try {
    const autos = await listAll("Automations");
    out.automationsTable = autos.map((r) => ({
      id: r.id,
      name: r.fields.Name || r.fields["Automation Name"] || r.fields.Title,
      status: r.fields.Status || r.fields["On?"] || r.fields.Enabled,
      version: r.fields.Version,
      keys: Object.keys(r.fields),
    }));
  } catch (e) {
    out.automationsTableError = String(e.message || e);
  }

  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/066-MILESTONE-DIAGNOSIS.json",
    JSON.stringify(out, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        shots: out.enrollment.shots,
        runCheck: out.enrollment.runCheck,
        levelStatus: out.enrollment.levelStatus,
        meets: out.enrollment.meets,
        gateMinimums: out.enrollment.gateMinimums,
        activeMilestones: out.activeMilestones,
        band34: out.band34Milestones.length,
        eligible: out.eligibleByShots.length,
        eligibleSample: out.eligibleByShots.slice(0, 5),
        fieldKeys: out.sampleMilestoneFieldKeys,
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
