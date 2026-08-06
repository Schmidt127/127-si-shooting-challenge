#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

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

const BASE = "appn84sqPw03zEbTT";

async function main() {
  loadEnvLocal();
  const token = process.env.AIRTABLE_API_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };

  const meta = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers,
  }).then((r) => r.json());
  const xp = meta.tables.find((t) => t.name === "XP Events");
  const want = new Set(["fldOQBVTSNODRhRcd", "fldxVAackD0buQIba", "fldvA0LSFK6uDlreq"]);
  const resolved = xp.fields
    .filter(
      (f) =>
        want.has(f.id) ||
        ["XP Bucket", "XP Source", "XP Activity Date", "Enrollment", "Source Key", "XP Date Resolved"].includes(
          f.name
        )
    )
    .map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      choices: f.options?.choices?.map((c) => c.name) || undefined,
    }));

  const enrLike = xp.fields
    .filter((f) => /enroll|athlete/i.test(f.name))
    .map((f) => ({ id: f.id, name: f.name, type: f.type }));

  // Bucket vs Source choice values
  const bucket = xp.fields.find((f) => f.name === "XP Bucket");
  const source = xp.fields.find((f) => f.name === "XP Source");

  // Schmidt XP via Source Key patterns known from prior evidence
  const formulas = [
    `FIND("recgqVstObQRzgXJF", ARRAYJOIN({Enrollment} & ""))`,
    `OR(FIND("recgP9qZYjAhE7NXm", {Source Key} & ""), FIND("recCyFEPeATOVNlr9", {Source Key} & ""))`,
    `{Active?} = 1`,
  ];

  const counts = {};
  for (const f of formulas) {
    const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent("XP Events")}?pageSize=100&filterByFormula=${encodeURIComponent(f)}`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    counts[f] = res.ok
      ? { ok: true, n: (data.records || []).length, sampleKeys: (data.records || []).slice(0, 3).map((r) => r.fields["Source Key"]) }
      : { ok: false, err: data };
  }

  // Full active XP count
  let offset;
  let active = 0;
  let shootingBaseBlankDate = 0;
  let submissionBaseBucketMismatch = 0;
  const byBucket = {};
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const data = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent("XP Events")}?${params}`,
      { headers }
    ).then((r) => r.json());
    for (const r of data.records || []) {
      if (r.fields["Active?"] !== true && r.fields["Active?"] !== undefined) continue;
      active++;
      const b = r.fields["XP Bucket"] || "(none)";
      byBucket[b] = (byBucket[b] || 0) + 1;
      if (b === "Shooting Base" && !r.fields["XP Activity Date"]) shootingBaseBlankDate++;
      if (r.fields["XP Source"] === "Submission Base" && b !== "Shooting Base") submissionBaseBucketMismatch++;
    }
    offset = data.offset;
  } while (offset);

  const out = {
    formulaFieldResolution: resolved,
    enrollmentLikeFields: enrLike,
    bucketChoices: bucket?.options?.choices?.map((c) => c.name) || null,
    sourceChoices: source?.options?.choices?.map((c) => c.name) || null,
    switchFieldIs: resolved.find((r) => r.id === "fldOQBVTSNODRhRcd")?.name || null,
    filterCounts: counts,
    activeXp: active,
    byBucket,
    shootingBaseBlankDate,
    submissionBaseBucketMismatch,
  };

  // Verdict on formula fix
  const switchName = out.switchFieldIs;
  if (switchName === "XP Source") {
    out.formulaVerdict =
      'SWITCH is on XP Source; case "Submission Base" is CORRECT. Do NOT change to Shooting Base.';
  } else if (switchName === "XP Bucket") {
    out.formulaVerdict =
      'SWITCH is on XP Bucket; case should be "Shooting Base". Current "Submission Base" is a BUG.';
  } else {
    out.formulaVerdict = `Unknown switch field: ${switchName}`;
  }

  mkdirSync("docs/testing/evidence/2026-08-05-agent2-foundation", { recursive: true });
  writeFileSync(
    "docs/testing/evidence/2026-08-05-agent2-foundation/XP-DATE-FORMULA-AUDIT.json",
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
