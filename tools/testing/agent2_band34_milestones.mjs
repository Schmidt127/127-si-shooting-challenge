#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const ENR = "recCyFEPeATOVNlr9";
const BAND = "reclWDQZzKbVBtdhG";

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

async function listAll(table) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` } }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 400));
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

async function main() {
  loadEnvLocal();
  const enrRes = await fetch(`https://api.airtable.com/v0/${BASE}/Enrollments/${ENR}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` },
  });
  const enr = await enrRes.json();
  const shots = enr.fields["Total Shots Counted"] || 0;
  const milestones = await listAll("Shot Milestones");
  const band34 = milestones
    .filter((r) => (r.fields["Grade Band"] || []).includes(BAND))
    .map((r) => ({
      id: r.id,
      label: r.fields["Milestone Label"],
      active: r.fields.Active === true || r.fields["Active?"] === true,
      activeRaw: r.fields.Active ?? r.fields["Active?"],
      shots: r.fields["Milestone Shot Count"],
      points: r.fields["Points Awarded"],
      key: r.fields["Milestone Unique Key"],
      crossed: (r.fields["Milestone Shot Count"] || 0) <= shots,
    }))
    .sort((a, b) => (a.shots || 0) - (b.shots || 0));

  const eligible = band34.filter((m) => m.active && m.crossed);
  const out = {
    shots,
    runCheck: enr.fields["Run Shot Milestone Check?"],
    band34,
    eligibleCount: eligible.length,
    eligible,
    inactiveBand34: band34.filter((m) => !m.active),
  };
  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/066-BAND34-MILESTONES.json",
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
