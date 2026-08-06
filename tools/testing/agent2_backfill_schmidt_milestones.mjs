#!/usr/bin/env node
/**
 * Controlled PROD backfill: create Shot Milestone unlocks for Schmidt 2026-27
 * using the same Milestone Source Key contract as Automation 066.
 * Then poll for 059 XP awards. Clears Run Shot Milestone Check? when done.
 *
 *   node tools/testing/agent2_backfill_schmidt_milestones.mjs --dry-run
 *   node tools/testing/agent2_backfill_schmidt_milestones.mjs --confirm-write
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "appn84sqPw03zEbTT";
const ENR = "recCyFEPeATOVNlr9";
const BAND = "reclWDQZzKbVBtdhG";
const DRY = process.argv.includes("--dry-run") || !process.argv.includes("--confirm-write");

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

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 600)}`);
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadEnvLocal();
  const enr = await api(`Enrollments/${ENR}`);
  const shots = enr.fields["Total Shots Counted"] || 0;

  // Find SHOT_MILESTONE achievement
  const achievements = await listAll("Achievements");
  const shotAch =
    achievements.find(
      (r) =>
        String(r.fields["Reward Rule Key"] || r.fields["Achievement Reward Rule Key"] || "") ===
          "SHOT_MILESTONE" ||
        /shot milestone/i.test(String(r.fields.Name || ""))
    ) || null;

  const milestones = (await listAll("Shot Milestones"))
    .filter((r) => (r.fields["Grade Band"] || []).includes(BAND))
    .filter((r) => r.fields.Active === true)
    .filter((r) => (r.fields["Milestone Shot Count"] || 0) <= shots)
    .map((r) => ({
      id: r.id,
      label: r.fields["Milestone Label"],
      shotCount: r.fields["Milestone Shot Count"],
      points: r.fields["Points Awarded"],
      sourceKey: `SHOT_MILESTONE|${ENR}|${r.id}`,
    }))
    .sort((a, b) => a.shotCount - b.shotCount);

  const existingUnlocks = await listAll(
    "Athlete Achievement Unlocks",
    `OR(${milestones.map((m) => `{Milestone Source Key}="${m.sourceKey}"`).join(",")})`
  ).catch(async () => {
    // fallback: all for enrollment
    return listAll(
      "Athlete Achievement Unlocks",
      `FIND("${ENR}", ARRAYJOIN({Enrollment}))`
    );
  });

  const existingKeys = new Set(
    existingUnlocks.map((r) => r.fields["Milestone Source Key"]).filter(Boolean)
  );

  const toCreate = milestones.filter((m) => !existingKeys.has(m.sourceKey));

  // Activity date: latest counted submission for enrollment
  const subs = await listAll(
    "Submissions",
    `AND(FIND("${ENR}", ARRAYJOIN({Enrollment})), {Count It?} = 1)`
  ).catch(() => []);
  let activityDate = "2026-08-05";
  if (subs.length) {
    const dated = subs
      .map((r) => r.fields["Activity Date"] || r.fields["Submission Date"] || r.fields.Date)
      .filter(Boolean)
      .sort()
      .reverse();
    if (dated[0]) activityDate = String(dated[0]).slice(0, 10);
  }

  const evidence = {
    dryRun: DRY,
    enrollmentId: ENR,
    shots,
    shotAchievementId: shotAch?.id || null,
    shotAchievementName: shotAch?.fields?.Name || null,
    shotAchievementKeys: shotAch ? Object.keys(shotAch.fields) : [],
    milestoneEligible: milestones.length,
    existingUnlockCount: existingUnlocks.length,
    existingKeys: [...existingKeys],
    toCreateCount: toCreate.length,
    toCreate,
    activityDate,
  };

  if (!shotAch) {
    evidence.error = "No SHOT_MILESTONE achievement found";
    writeEvidence(evidence);
    throw new Error(evidence.error);
  }

  if (DRY) {
    evidence.result = "DRY_RUN";
    writeEvidence(evidence);
    console.log(JSON.stringify({ dryRun: true, toCreate: toCreate.length, existing: existingKeys.size, achievement: shotAch.id }, null, 2));
    return;
  }

  const created = [];
  // Airtable allows 10 records per create
  for (let i = 0; i < toCreate.length; i += 10) {
    const batch = toCreate.slice(i, i + 10).map((m) => ({
      fields: {
        Enrollment: [ENR],
        Achievement: [shotAch.id],
        "Shot Milestone": [m.id],
        "Milestone Source Key": m.sourceKey,
        "Milestone Activity Date": activityDate,
        "XP Award Status": "Pending",
        "Active?": true,
        "Coach Note": [
          "Created by Agent2 controlled backfill 2026-08-05 (066 automation did not fire).",
          `Enrollment shots: ${shots}.`,
          `Milestone: ${m.label}.`,
          `Points Awarded: ${m.points}.`,
          "Source Key matches Automation 066 contract.",
        ].join("\n"),
      },
    }));
    // try XP Award Status Pending if field exists
    try {
      const res = await api("Athlete%20Achievement%20Unlocks", {
        method: "POST",
        body: { records: batch, typecast: true },
      });
      created.push(...(res.records || []).map((r) => ({ id: r.id, key: r.fields["Milestone Source Key"] })));
    } catch (e) {
      evidence.createError = String(e.message || e);
      writeEvidence(evidence);
      throw e;
    }
  }
  evidence.created = created;

  // Clear the stuck checkbox
  await api(`Enrollments/${ENR}`, {
    method: "PATCH",
    body: { fields: { "Run Shot Milestone Check?": false }, typecast: true },
  });
  evidence.clearedRunCheck = true;

  // Poll for XP from 059
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const xp = await listAll(
      "XP Events",
      `AND({Enrollment Record ID}="${ENR}",{XP Bucket}="Shot Milestone")`
    );
    evidence.xpPoll = {
      poll: i + 1,
      at: new Date().toISOString(),
      count: xp.length,
      keys: xp.map((r) => r.fields["Source Key"]),
      points: xp.reduce((a, r) => a + (Number(r.fields["XP Points"]) || 0), 0),
    };
    if (xp.length >= created.length) {
      evidence.result = "XP_AWARDED";
      break;
    }
  }
  if (!evidence.result) evidence.result = "UNLOCKS_CREATED_XP_PENDING_OR_059_OFF";

  writeEvidence(evidence);
  console.log(
    JSON.stringify(
      {
        result: evidence.result,
        created: created.length,
        xp: evidence.xpPoll,
      },
      null,
      2
    )
  );
}

function writeEvidence(evidence) {
  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/066-MILESTONE-BACKFILL.json",
    JSON.stringify(evidence, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
