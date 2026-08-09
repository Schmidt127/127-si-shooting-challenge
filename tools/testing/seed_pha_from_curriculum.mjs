#!/usr/bin/env node
/**
 * OBSOLETE — DO NOT USE FOR CURRENT SEASON SEEDING
 *
 * This script embodied the incorrect architecture of creating PHA rows from
 * Homework Library.Week links. PHA is now assigned just-in-time by operators.
 * Homework Library.Week must never be scheduling truth.
 *
 * Archived for historical evidence only. Use docs/prod-completion/2026-08-09/
 * HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md for controlled JIT PHA creation.
 *
 * @deprecated 2026-08-09 Homework Library architecture cleanup
 */
console.error(
  [
    "REFUSED: tools/testing/seed_pha_from_curriculum.mjs is obsolete.",
    "PHA must be created just-in-time — never seeded from Homework Library.Week.",
    "See docs/prod-completion/2026-08-09/HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md",
  ].join("\n")
);
process.exit(2);

/**
 * Seed Program Homework Assignments from curriculum Week links for the active Program Instance.
 * Additive / idempotent by Schedule Key. Does not modify FBC Curriculum Week links.
 *
 * Default: seed for Grade Band 3-4 (Schmidt) + expand to all active grade bands when --all-bands.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = "appn84sqPw03zEbTT";
const ALL_BANDS = process.argv.includes("--all-bands");
const DRY = process.argv.includes("--dry-run");

const IDS = {
  pha: "tblhA3maf7xOa8EUS",
  curriculum: "tblUuxwYlX4EQ9MKE",
  weeks: "tblcsKugv1cla36A6",
  programInstance: "tblMfALZa4YYUy70P",
  gradeBands: "tblOhHrIqpjcsk2WG",
};

if (!TOKEN) {
  console.error("NO_TOKEN");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: method === "GET" ? { Authorization: `Bearer ${TOKEN}` } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

async function listAll(tableId, fields) {
  const out = [];
  let offset;
  do {
    const qs = new URLSearchParams();
    if (fields) for (const f of fields) qs.append("fields[]", f);
    if (offset) qs.set("offset", offset);
    const r = await api("GET", `https://api.airtable.com/v0/${BASE}/${tableId}?${qs}`);
    if (!r.ok) throw new Error(`list ${tableId}: ${JSON.stringify(r.json)}`);
    out.push(...(r.json.records || []));
    offset = r.json.offset;
  } while (offset);
  return out;
}

const evidence = {
  dryRun: DRY,
  allBands: ALL_BANDS,
  created: [],
  skippedExisting: [],
  skippedNoSlot: [],
  errors: [],
};

const [curriculum, weeks, bands, pis, existingPha] = await Promise.all([
  listAll(IDS.curriculum, [
    "Assignment Full Name",
    "Assignment Number",
    "Week",
    "Grade Band",
    "Active?",
    "Published?",
  ]),
  listAll(IDS.weeks, ["Week Name", "Start Date", "End Date", "Week Key"]),
  listAll(IDS.gradeBands, ["Grade Band Name", "Min Grade", "Max Grade", "Active?"]),
  listAll(IDS.programInstance, [
    "Name - Program Instance",
    "Program Instance Key",
    "Status",
    "Season",
  ]),
  listAll(IDS.pha, [
    "Program Homework Assignment",
    "Homework Assignment",
    "Program Instance",
    "Week",
    "Grade Band",
    "Homework Slot",
    "Active?",
    "Schedule Key",
  ]),
]);

// Prefer Shooting Challenge 2026-2027 PI (from existing PHA / name match)
const preferredPi =
  existingPha[0]?.fields["Program Instance"]?.[0] ||
  pis.find((p) =>
    /2026-2027/i.test(
      String(p.fields["Name - Program Instance"] || p.fields["Program Instance Key"] || "")
    )
  )?.id ||
  pis[0]?.id;

if (!preferredPi) throw new Error("No Program Instance found");

const activeBands = bands.filter((b) => b.fields["Active?"] !== false);
const targetBands = ALL_BANDS
  ? activeBands
  : activeBands.filter((b) => {
      const name = b.fields["Grade Band Name"] || b.name || "";
      // Schmidt testing enrollment is Grade 3 → band 3-4
      return name === "3-4" || /3.?4/.test(String(name));
    });

const existingKeys = new Set(
  existingPha.map((r) => r.fields["Schedule Key"]).filter(Boolean)
);

// Also key by PI|Week|GB|Slot|HW without relying on formula lag
function manualKey(pi, week, gb, slot, hw) {
  return `${pi}|${week}|${gb}|${slot}|${hw}`;
}
for (const r of existingPha) {
  const pi = r.fields["Program Instance"]?.[0];
  const week = r.fields.Week?.[0];
  const gb = r.fields["Grade Band"]?.[0];
  const slot = r.fields["Homework Slot"];
  const hw = r.fields["Homework Assignment"]?.[0];
  if (pi && week && gb && slot && hw) existingKeys.add(manualKey(pi, week, gb, slot, hw));
}

const weekById = Object.fromEntries(weeks.map((w) => [w.id, w]));

// Eligible curriculum: Active + Published + has Week link(s)
const eligible = curriculum.filter(
  (r) => r.fields["Active?"] && r.fields["Published?"] && (r.fields.Week || []).length > 0
);

/**
 * For each curriculum row × each of its Week links × overlapping Grade Bands,
 * create HW1/HW2 slots ordered by Assignment Number within that week+band.
 * Slot assignment: lowest Assignment Number → HW1, next → HW2, further → skip (MVP = 2 slots).
 */
const buckets = new Map(); // key week|gb -> [{hwId, assignmentNumber, name}]

for (const row of eligible) {
  const hwId = row.id;
  const name = row.fields["Assignment Full Name"] || row.id;
  const num = Number(row.fields["Assignment Number"] ?? 999);
  const weekIds = row.fields.Week || [];
  const gbIds = row.fields["Grade Band"] || [];
  for (const weekId of weekIds) {
    for (const gbId of gbIds) {
      if (!targetBands.some((b) => b.id === gbId)) continue;
      const key = `${weekId}|${gbId}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ hwId, assignmentNumber: num, name });
    }
  }
}

const toCreate = [];
for (const [key, items] of buckets) {
  const [weekId, gbId] = key.split("|");
  // Dedupe by hwId within bucket
  const uniq = [];
  const seen = new Set();
  for (const item of items.sort((a, b) => a.assignmentNumber - b.assignmentNumber || a.name.localeCompare(b.name))) {
    if (seen.has(item.hwId)) continue;
    seen.add(item.hwId);
    uniq.push(item);
  }
  const slots = [
    { slot: "HW1", item: uniq[0] },
    { slot: "HW2", item: uniq[1] },
  ].filter((s) => s.item);

  for (const { slot, item } of slots) {
    const sk = manualKey(preferredPi, weekId, gbId, slot, item.hwId);
    if (existingKeys.has(sk)) {
      evidence.skippedExisting.push({ sk, name: item.name });
      continue;
    }
    const weekRec = weekById[weekId];
    const weekLabel =
      weekRec?.fields["Week Name"] ||
      weekRec?.fields["Week Key"] ||
      weekId;
    const primary = `${slot} | ${item.name} | ${weekLabel}`.slice(0, 100);
    toCreate.push({
      fields: {
        "Program Homework Assignment": primary,
        "Homework Assignment": [item.hwId],
        "Program Instance": [preferredPi],
        Week: [weekId],
        "Grade Band": [gbId],
        "Homework Slot": slot,
        "Active?": true,
        "Operator Notes": DRY
          ? undefined
          : `Seeded from obsolete curriculum Week architecture (historical log only).`,
      },
      sk,
      meta: { weekId, gbId, slot, hwId: item.hwId, name: item.name },
    });
  }
}

evidence.plannedCreate = toCreate.length;
evidence.bucketCount = buckets.size;

if (!DRY) {
  // Airtable create in batches of 10
  for (let i = 0; i < toCreate.length; i += 10) {
    const batch = toCreate.slice(i, i + 10);
    const r = await api("POST", `https://api.airtable.com/v0/${BASE}/${IDS.pha}`, {
      records: batch.map((b) => ({ fields: Object.fromEntries(Object.entries(b.fields).filter(([, v]) => v !== undefined)) })),
      typecast: true,
    });
    if (!r.ok) {
      evidence.errors.push({ batch: i, body: r.json });
      break;
    }
    for (let j = 0; j < (r.json.records || []).length; j++) {
      evidence.created.push({
        id: r.json.records[j].id,
        ...batch[j].meta,
        primary: r.json.records[j].fields["Program Homework Assignment"],
      });
      existingKeys.add(batch[j].sk);
    }
  }
} else {
  evidence.wouldCreate = toCreate.map((t) => t.meta);
}

evidence.finishedAt = new Date().toISOString();
const dir = resolve(ROOT, "docs/testing/evidence/2026-08-05-agent1-homework");
mkdirSync(dir, { recursive: true });
const outPath = resolve(dir, DRY ? "PHA-SEED-DRYRUN.json" : "PHA-SEED-LIVE.json");
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    {
      ok: evidence.errors.length === 0,
      dryRun: DRY,
      preferredPi,
      targetBandCount: targetBands.length,
      plannedCreate: evidence.plannedCreate,
      created: evidence.created.length,
      skippedExisting: evidence.skippedExisting.length,
      errors: evidence.errors.length,
      outPath,
    },
    null,
    2
  )
);
