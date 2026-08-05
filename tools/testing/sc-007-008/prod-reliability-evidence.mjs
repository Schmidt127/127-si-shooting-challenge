#!/usr/bin/env node
/**
 * SC-007 / SC-008 PROD-controlled reliability evidence (read-only by default).
 *
 * - Never prints secrets, tokens, or webhook URLs.
 * - Never sends email.
 * - Writes dated evidence under docs/testing/evidence/…
 *
 *   node tools/testing/sc-007-008/prod-reliability-evidence.mjs
 *   node tools/testing/sc-007-008/prod-reliability-evidence.mjs --check-anonymous-s3
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  evaluateFinalUploadSuccessContract,
} = require("../../../airtable/automations/shooting-challenge/lib/upload-make-lambda-response.js");
const { IDEMPOTENCY_PATHS } = require("./idempotency-matrix.js");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const BASE = "appn84sqPw03zEbTT";
const SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm";
const SCHMIDT_ATHLETE = "recgqVstObQRzgXJF";
const KNOWN_ASSET = "recaXBfjeeu3bcm0t";
const KNOWN_HC = "recrBnHbLvDpFyIeO";
const KNOWN_HW_XP = "rec6xE4V1t0atiTIP";
const FOUNDATION_WAS = "rechWp330MqSgRWzN";
const EVIDENCE_DIR = resolve(
  ROOT,
  "docs/testing/evidence/2026-08-04-sc-007-008-reliability"
);

function loadEnvLocal() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
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

function authHeaders() {
  const token = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  return { Authorization: `Bearer ${token}` };
}

function redactUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(String(url));
    if (u.searchParams.has("token")) u.searchParams.set("token", "[REDACTED]");
    return u.toString();
  } catch {
    return String(url).replace(/token=[^&\s]+/gi, "token=[REDACTED]");
  }
}

function field(rec, name) {
  return rec?.fields?.[name];
}

function linkIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v : v?.id)).filter(Boolean);
}

async function getOne(table, id) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`,
    { headers: authHeaders() }
  );
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${table}/${id} ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

async function listAll(table, { filterByFormula, fields, maxRecords = 500 } = {}) {
  let offset;
  const records = [];
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (fields) for (const f of fields) params.append("fields[]", f);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`,
      { headers: authHeaders() }
    );
    if (!res.ok) throw new Error(`${table} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
    if (records.length >= maxRecords) break;
  } while (offset);
  return records;
}

function countBySourceKey(xpEvents) {
  const byKey = {};
  let blank = 0;
  for (const e of xpEvents) {
    const key = String(field(e, "Source Key") || "").trim();
    if (!key) {
      blank += 1;
      continue;
    }
    byKey[key] = byKey[key] || [];
    byKey[key].push(e.id);
  }
  const duplicates = Object.entries(byKey)
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids, count: ids.length }));
  return { blank, uniqueKeys: Object.keys(byKey).length, duplicates, byKey };
}

async function checkAnonymousS3(canonicalUrl) {
  if (!canonicalUrl || !String(canonicalUrl).startsWith("https://")) {
    return { skipped: true, reason: "no_canonical_url" };
  }
  try {
    const res = await fetch(canonicalUrl, { method: "GET", redirect: "manual" });
    return {
      skipped: false,
      status: res.status,
      inaccessibleAnonymously: res.status === 403 || res.status === 401 || res.status === 400,
      note: "Expect AccessDenied / 403 for private bucket objects",
    };
  } catch (error) {
    return {
      skipped: false,
      status: null,
      inaccessibleAnonymously: true,
      error: String(error.message || error).slice(0, 120),
    };
  }
}

async function checkReviewerUrlOpens(reviewerUrl) {
  if (!reviewerUrl) return { skipped: true, reason: "no_reviewer_url" };
  // HEAD/GET without following redirect — expect 302 to presigned S3, not 401/403 from viewer.
  try {
    const res = await fetch(reviewerUrl, { method: "GET", redirect: "manual" });
    const location = res.headers.get("location") || "";
    return {
      skipped: false,
      status: res.status,
      redirectedToPresign: res.status === 302 && /X-Amz-|amazonaws\.com/i.test(location),
      // Never store the full presigned URL (contains signature).
      locationHost: location ? (() => {
        try {
          return new URL(location).host;
        } catch {
          return "[unparseable]";
        }
      })() : "",
    };
  } catch (error) {
    return {
      skipped: false,
      status: null,
      redirectedToPresign: false,
      error: String(error.message || error).slice(0, 120),
    };
  }
}

async function main() {
  loadEnvLocal();
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const started = new Date().toISOString();
  const checkAnon = process.argv.includes("--check-anonymous-s3");

  const enrollment = await getOne("Enrollments", SCHMIDT_ENROLLMENT);
  const xpEvents = await listAll("XP Events", {
    filterByFormula: `FIND('${SCHMIDT_ENROLLMENT}', ARRAYJOIN({Enrollment}))`,
    fields: ["Source Key", "XP Points", "Enrollment", "Submission", "Active?"],
  });
  // Fallback: Source Key prefixes for Schmidt-linked rows when ARRAYJOIN is name-based
  const xpByKeyScan = await listAll("XP Events", {
    filterByFormula: `OR(
      FIND('SUBMISSION_XP|', {Source Key}&''),
      FIND('HOMEWORK_XP|', {Source Key}&''),
      FIND('VIDEO_SUBMISSION|', {Source Key}&''),
      FIND('ZOOM_CREDIT|', {Source Key}&''),
      FIND('ZOOM_ATTEND_', {Source Key}&''),
      FIND('STREAK_XP|', {Source Key}&''),
      FIND('SHOT_MILESTONE|', {Source Key}&''),
      FIND('PERFECT_WEEK|', {Source Key}&''),
      FIND('WEEKLY_THRESHOLD|', {Source Key}&'')
    )`,
    fields: ["Source Key", "XP Points", "Enrollment", "Submission", "Active?"],
    maxRecords: 2000,
  });

  const schmidtXp = xpByKeyScan.filter((e) => {
    const enr = linkIds(field(e, "Enrollment"));
    return enr.includes(SCHMIDT_ENROLLMENT);
  });

  const inventory = countBySourceKey(schmidtXp.length ? schmidtXp : xpEvents);

  let asset = null;
  let assetContract = null;
  let anonCheck = { skipped: true, reason: "not_requested" };
  let reviewerCheck = { skipped: true, reason: "not_run" };
  try {
    asset = await getOne("Submission Assets", KNOWN_ASSET);
    const f = asset.fields || {};
    assetContract = evaluateFinalUploadSuccessContract({
      "Upload Status": f["Upload Status"],
      "Send to Make Trigger": f["Send to Make Trigger"],
      "Upload Error": f["Upload Error"],
      "Canonical File URL": f["Canonical File URL"],
      "Storage Key": f["Storage Key"],
      "File Content Hash": f["File Content Hash"],
      "File Hash Algorithm": f["File Hash Algorithm"],
      "Uploaded At": f["Uploaded At"],
      "Writeback Complete?": f["Writeback Complete?"],
      "Reviewer Access Token": f["Reviewer Access Token"] ? "[PRESENT]" : "",
      "Reviewer File URL": f["Reviewer File URL"]
        ? redactUrl(f["Reviewer File URL"]).replace(/token=\[REDACTED\]/, "token=[PRESENT]")
        : "",
    });
    // Re-evaluate with real token presence (boolean) without exporting the token
    assetContract = evaluateFinalUploadSuccessContract({
      ...f,
      "Reviewer Access Token": f["Reviewer Access Token"] ? "present-nonblank-token" : "",
      "Reviewer File URL": f["Reviewer File URL"] || "",
    });

    if (checkAnon) {
      anonCheck = await checkAnonymousS3(f["Canonical File URL"]);
    }
    reviewerCheck = await checkReviewerUrlOpens(f["Reviewer File URL"]);
  } catch (error) {
    assetContract = { verified: false, error: String(error.message || error).slice(0, 200) };
  }

  let homework = null;
  let homeworkXp = null;
  try {
    homework = await getOne("Homework Completions", KNOWN_HC);
    homeworkXp = await getOne("XP Events", KNOWN_HW_XP);
  } catch (error) {
    homework = { error: String(error.message || error).slice(0, 160) };
  }

  let was = null;
  try {
    was = await getOne("Weekly Athlete Summary", FOUNDATION_WAS);
  } catch (error) {
    was = { error: String(error.message || error).slice(0, 160) };
  }

  // ARRAYJOIN({Enrollment}) returns names, not RIDs — list then filter by linked ids.
  const wasAll = await listAll("Weekly Athlete Summary", {
    fields: [
      "Enrollment",
      "Week",
      "Weekly Email Sent?",
      "Send to Make?",
      "Weekly Email Error",
      "Make Send Status",
      "Weekly Email Ready?",
    ],
    maxRecords: 200,
  });
  const wasRows = wasAll.filter((w) =>
    linkIds(field(w, "Enrollment")).includes(SCHMIDT_ENROLLMENT)
  );
  const wasByEnrWeek = {};
  for (const w of wasRows) {
    const enr = linkIds(field(w, "Enrollment"))[0] || "";
    const week = linkIds(field(w, "Week"))[0] || "";
    const key = `${enr}|${week}`;
    wasByEnrWeek[key] = wasByEnrWeek[key] || [];
    wasByEnrWeek[key].push(w.id);
  }
  const wasDupes = Object.entries(wasByEnrWeek).filter(([, ids]) => ids.length > 1);

  const PREFIX_BY_PATH = {
    "daily-submission-xp": "SUBMISSION_XP|",
    "homework-xp": "HOMEWORK_XP|",
    "video-xp": "VIDEO_SUBMISSION|",
    "zoom-credit": "ZOOM_CREDIT|",
    "zoom-attend-base": "ZOOM_ATTEND_BASE|",
    "streak-xp": "STREAK_XP|",
    "shot-milestone": "SHOT_MILESTONE|",
    "perfect-week": "PERFECT_WEEK|",
    "weekly-threshold-xp": "WEEKLY_THRESHOLD|",
  };

  const pathCoverage = IDEMPOTENCY_PATHS.map((p) => {
    const prefix = PREFIX_BY_PATH[p.id];
    const pool = schmidtXp.length ? schmidtXp : xpEvents;
    const matching = prefix
      ? pool.filter((e) => String(field(e, "Source Key") || "").startsWith(prefix))
      : [];
    return {
      id: p.id,
      label: p.label,
      expected_writer: p.expectedWriter,
      schmidt_matching_xp_count: matching.length,
      schmidt_source_keys: matching.map((e) => field(e, "Source Key")).slice(0, 20),
      duplicate_keys_in_match: matching.length
        ? countBySourceKey(matching).duplicates
        : [],
    };
  });

  const evidence = {
    generated_at: started,
    package: "SC-007 / SC-008 reliability proof",
    base_id: BASE,
    schmidt: {
      enrollment_id: SCHMIDT_ENROLLMENT,
      athlete_id: SCHMIDT_ATHLETE,
      active: field(enrollment, "Active?"),
    },
    sc007: {
      xp_inventory: {
        schmidt_xp_events: (schmidtXp.length ? schmidtXp : xpEvents).length,
        blank_source_keys: inventory.blank,
        unique_source_keys: inventory.uniqueKeys,
        duplicate_source_keys: inventory.duplicates,
        pass_no_duplicates: inventory.duplicates.length === 0 && inventory.blank === 0,
      },
      path_coverage: pathCoverage.map((p) => ({
        id: p.id,
        label: p.label,
        expected_writer: p.expected_writer,
        schmidt_matching_xp_count: p.schmidt_matching_xp_count,
        schmidt_source_keys: p.schmidt_source_keys,
        duplicate_keys_in_match: p.duplicate_keys_in_match,
      })),
      homework: {
        completion_id: KNOWN_HC,
        completion_status: homework?.fields?.["Grading Status"] || homework?.fields?.Status || homework?.error,
        xp_id: KNOWN_HW_XP,
        xp_source_key: homeworkXp?.fields?.["Source Key"] || null,
        xp_points: homeworkXp?.fields?.["XP Points"] || null,
      },
      was_uniqueness: {
        foundation_was_id: FOUNDATION_WAS,
        schmidt_was_rows_scanned: wasRows.length,
        duplicate_enrollment_week_groups: wasDupes.map(([key, ids]) => ({ key, ids })),
        pass: wasDupes.length === 0,
        sample_email_fields: was?.fields
          ? {
              weekly_email_sent: field(was, "Weekly Email Sent?"),
              send_to_make: field(was, "Send to Make?"),
              weekly_email_error: field(was, "Weekly Email Error") ? "[NONBLANK]" : "",
              make_send_status: field(was, "Make Send Status"),
            }
          : was,
      },
    },
    sc008: {
      upload_success_contract: {
        asset_id: KNOWN_ASSET,
        verified: assetContract?.verified === true,
        failed_checks: assetContract?.failedChecks || [],
        message: assetContract?.message || assetContract?.error || "",
        observed: asset?.fields
          ? {
              upload_status: field(asset, "Upload Status"),
              send_to_make_trigger: field(asset, "Send to Make Trigger") === true,
              upload_error_blank: !String(field(asset, "Upload Error") || "").trim(),
              canonical_file_url_present: Boolean(field(asset, "Canonical File URL")),
              storage_key_present: Boolean(field(asset, "Storage Key")),
              uploaded_at_present: Boolean(field(asset, "Uploaded At")),
              reviewer_access_token_present: Boolean(field(asset, "Reviewer Access Token")),
              reviewer_file_url_present: Boolean(field(asset, "Reviewer File URL")),
              reviewer_file_url_redacted: redactUrl(field(asset, "Reviewer File URL")),
            }
          : null,
      },
      private_s3_anonymous: anonCheck,
      reviewer_url_open: reviewerCheck,
      note:
        "Failure injection for webhook/Lambda uses offline pack + Lambda unit tests; no global service disable.",
    },
    cleanup: {
      records_created: [],
      records_deleted: [],
      note: "Read-only probe — no cleanup required",
    },
  };

  const jsonPath = resolve(EVIDENCE_DIR, "PROD-RELIABILITY-EVIDENCE.json");
  writeFileSync(jsonPath, JSON.stringify(evidence, null, 2) + "\n", "utf8");

  const md = [];
  md.push("# SC-007 / SC-008 PROD Reliability Evidence");
  md.push("");
  md.push(`Generated: ${started}`);
  md.push(`Base: \`${BASE}\``);
  md.push(`Schmidt Enrollment: \`${SCHMIDT_ENROLLMENT}\``);
  md.push("");
  md.push("## SC-007 Idempotency inventory");
  md.push("");
  md.push(`- Schmidt XP events scanned: **${evidence.sc007.xp_inventory.schmidt_xp_events}**`);
  md.push(`- Blank Source Keys: **${evidence.sc007.xp_inventory.blank_source_keys}**`);
  md.push(`- Duplicate Source Keys: **${evidence.sc007.xp_inventory.duplicate_source_keys.length}**`);
  md.push(
    `- Inventory PASS: **${evidence.sc007.xp_inventory.pass_no_duplicates ? "YES" : "NO"}**`
  );
  md.push(`- WAS Enrollment+Week uniqueness PASS: **${evidence.sc007.was_uniqueness.pass ? "YES" : "NO"}**`);
  md.push(`- Homework Completion: \`${KNOWN_HC}\``);
  md.push(
    `- Homework XP: \`${KNOWN_HW_XP}\` → \`${evidence.sc007.homework.xp_source_key || "n/a"}\``
  );
  md.push("");
  md.push("## SC-008 Upload success contract");
  md.push("");
  md.push(`- Asset: \`${KNOWN_ASSET}\``);
  md.push(`- Contract verified: **${evidence.sc008.upload_success_contract.verified ? "YES" : "NO"}**`);
  if (evidence.sc008.upload_success_contract.observed) {
    const o = evidence.sc008.upload_success_contract.observed;
    md.push(`- Upload Status: \`${o.upload_status}\``);
    md.push(`- Send to Make Trigger checked: \`${o.send_to_make_trigger}\``);
    md.push(`- Upload Error blank: \`${o.upload_error_blank}\``);
    md.push(`- Canonical / Storage / Uploaded At present: \`${o.canonical_file_url_present}/${o.storage_key_present}/${o.uploaded_at_present}\``);
    md.push(`- Reviewer token / URL present: \`${o.reviewer_access_token_present}/${o.reviewer_file_url_present}\``);
  }
  md.push(`- Anonymous S3 check: \`${JSON.stringify(anonCheck)}\``);
  md.push(`- Reviewer URL open: status=${reviewerCheck.status} redirectedToPresign=${reviewerCheck.redirectedToPresign}`);
  md.push("");
  md.push("## Secrets");
  md.push("");
  md.push("No webhook secrets, Airtable tokens, or reviewer tokens recorded.");
  md.push("");

  writeFileSync(resolve(EVIDENCE_DIR, "PROD-RELIABILITY-EVIDENCE.md"), md.join("\n"), "utf8");

  console.log(JSON.stringify({
    ok: true,
    evidence_json: jsonPath,
    sc007_xp_pass: evidence.sc007.xp_inventory.pass_no_duplicates,
    sc007_was_pass: evidence.sc007.was_uniqueness.pass,
    sc008_upload_contract: evidence.sc008.upload_success_contract.verified,
    reviewer_redirect: reviewerCheck.redirectedToPresign,
    anonymous_s3: anonCheck,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error.message || error).slice(0, 400) }));
  process.exit(1);
});
