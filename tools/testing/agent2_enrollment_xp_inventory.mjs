#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const ENR = "recCyFEPeATOVNlr9";

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

async function listAll(filterByFormula) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent("XP Events")}?${params}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` } }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

async function getEnr() {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/Enrollments/${ENR}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}` },
  });
  return res.json();
}

async function main() {
  loadEnvLocal();
  const enr = await getEnr();
  // FIND on linked record IDs
  const formulas = [
    `FIND("${ENR}", ARRAYJOIN({Enrollment}))`,
    `{Enrollment Record ID} = "${ENR}"`,
  ];
  const results = {};
  for (const f of formulas) {
    try {
      const rows = await listAll(f);
      results[f] = {
        n: rows.length,
        byBucket: {},
        keys: rows.map((r) => r.fields["Source Key"]),
        sumPoints: rows.reduce((a, r) => a + (Number(r.fields["XP Points"]) || 0), 0),
        blankDates: rows.filter((r) => !r.fields["XP Activity Date"]).length,
        sample: rows.slice(0, 5).map((r) => ({
          id: r.id,
          key: r.fields["Source Key"],
          bucket: r.fields["XP Bucket"],
          pts: r.fields["XP Points"],
          date: r.fields["XP Activity Date"],
          dateResolved: r.fields["XP Date Resolved"],
        })),
      };
      for (const r of rows) {
        const b = r.fields["XP Bucket"] || "(none)";
        results[f].byBucket[b] = (results[f].byBucket[b] || 0) + 1;
      }
    } catch (e) {
      results[f] = { error: String(e.message || e) };
    }
  }

  const out = {
    lifetimeXpEarned: enr.fields["Lifetime XP Earned"],
    lifetimeXpTotal: enr.fields["Lifetime XP Total"],
    totalShotsCounted: enr.fields["Total Shots Counted"],
    totalShotsSubmitted: enr.fields["Total Shots Submitted"],
    currentStreak: enr.fields["Current Shooting Streak"],
    longestStreak: enr.fields["Longest Streak Days"],
    levelStatus: enr.fields["Level Status"],
    gateSummary: enr.fields["Gate Summary"],
    runShotMilestoneCheck: enr.fields["Run Shot Milestone Check?"],
    results,
  };
  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/ENROLLMENT-XP-LINK-INVENTORY.json",
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
