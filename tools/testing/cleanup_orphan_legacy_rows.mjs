#!/usr/bin/env node
/**
 * Dry-run-first cleanup for orphan legacy rows left after empty-base reset.
 *
 * Default: dry-run only (counts + sample IDs).
 * Destructive delete requires: --confirm-delete
 *
 * Never deletes rows linked to Schmidt Enrollment recgP9qZYjAhE7NXm.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SCHMIDT = "recgP9qZYjAhE7NXm";
const BASE_DEFAULT = "appn84sqPw03zEbTT";

function loadEnvLocal() {
  for (const p of [resolve("web/.env.local"), resolve(".env.local"), resolve(".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2];
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

async function listAll(baseId, table, fields) {
  const token = process.env.AIRTABLE_API_TOKEN;
  let offset;
  const records = [];
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    for (const f of fields) params.append("fields[]", f);
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`${table} ${res.status}`);
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

async function deleteBatch(baseId, table, ids) {
  const token = process.env.AIRTABLE_API_TOKEN;
  // Airtable allows up to 10 deletes per request
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const params = new URLSearchParams();
    for (const id of chunk) params.append("records[]", id);
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`DELETE ${table} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

function isOrphanXp(rec) {
  const enr = rec.fields.Enrollment || [];
  const sub = rec.fields.Submission || [];
  return enr.length === 0 && sub.length === 0;
}

function isOrphanWas(rec) {
  const enr = rec.fields.Enrollment || [];
  return enr.length === 0;
}

function isOrphanAsset(rec) {
  const enr = rec.fields["Enrollment - Linked"] || [];
  const sub = rec.fields["Submission - Linked"] || [];
  return enr.length === 0 && sub.length === 0;
}

function touchesSchmidt(rec, fieldNames) {
  for (const f of fieldNames) {
    const v = rec.fields[f] || [];
    if (v.includes(SCHMIDT)) return true;
  }
  return false;
}

async function main() {
  loadEnvLocal();
  const confirm = process.argv.includes("--confirm-delete");
  const argBase = process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : null;
  const baseId = argBase || BASE_DEFAULT;
  if (!process.env.AIRTABLE_API_TOKEN) {
    console.error("AIRTABLE_API_TOKEN missing");
    process.exit(1);
  }

  const xp = await listAll(baseId, "XP Events", ["Enrollment", "Submission", "Source Key"]);
  const was = await listAll(baseId, "Weekly Athlete Summary", ["Enrollment", "Week", "Summary Key"]);
  const assets = await listAll(baseId, "Submission Assets", [
    "Enrollment - Linked",
    "Submission - Linked",
  ]);

  const xpOrphans = xp.filter(isOrphanXp).filter((r) => !touchesSchmidt(r, ["Enrollment"]));
  const wasOrphans = was.filter(isOrphanWas).filter((r) => !touchesSchmidt(r, ["Enrollment"]));
  const assetOrphans = assets
    .filter(isOrphanAsset)
    .filter((r) => !touchesSchmidt(r, ["Enrollment - Linked"]));

  const plan = {
    mode: confirm ? "DELETE" : "DRY_RUN",
    base_id: baseId,
    schmidt_protected: SCHMIDT,
    counts: {
      xp_total: xp.length,
      xp_orphan_delete_candidates: xpOrphans.length,
      was_total: was.length,
      was_orphan_delete_candidates: wasOrphans.length,
      assets_total: assets.length,
      assets_orphan_delete_candidates: assetOrphans.length,
    },
    samples: {
      xp: xpOrphans.slice(0, 5).map((r) => r.id),
      was: wasOrphans.slice(0, 5).map((r) => r.id),
      assets: assetOrphans.slice(0, 5).map((r) => r.id),
    },
  };

  if (!confirm) {
    console.log(JSON.stringify(plan, null, 2));
    console.error("Dry-run only. Re-run with --confirm-delete after Mike approval.");
    return;
  }

  await deleteBatch(
    baseId,
    "XP Events",
    xpOrphans.map((r) => r.id)
  );
  await deleteBatch(
    baseId,
    "Weekly Athlete Summary",
    wasOrphans.map((r) => r.id)
  );
  await deleteBatch(
    baseId,
    "Submission Assets",
    assetOrphans.map((r) => r.id)
  );
  plan.deleted = true;
  console.log(JSON.stringify(plan, null, 2));
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
