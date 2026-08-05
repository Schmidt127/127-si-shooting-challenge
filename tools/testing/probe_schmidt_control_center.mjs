#!/usr/bin/env node
/**
 * Live PROD snapshot for SC-003..SC-006 testing control center.
 * Read-only. Never prints secrets.
 *
 *   node tools/testing/probe_schmidt_control_center.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const BASE = "appn84sqPw03zEbTT";
const SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm";
const SCHMIDT_ATHLETE = "recgqVstObQRzgXJF";
const FOUNDATION_WEEK = "recVDKiYATgzsfpmE";
const FOUNDATION_WAS = "rechWp330MqSgRWzN";
const SEED_SCENARIO = "recPdyfYRFgDtpzQ8";
const HW_COMPLETION = "recrBnHbLvDpFyIeO";
const HW_XP = "rec6xE4V1t0atiTIP";

const WANTED_TABLES = [
  "Testing Scenarios",
  "Submissions",
  "XP Events",
  "Weekly Athlete Summary",
  "Submission Assets",
  "Homework Completions",
  "Video Feedback",
  "Athlete Achievement Unlocks",
  "Enrollments",
  "Weeks",
  "Athletes",
  "Zoom Attendance",
  "Zoom Meetings",
  "Streak Occurrences",
];

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
  const token = process.env.AIRTABLE_API_TOKEN;
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  return { Authorization: `Bearer ${token}` };
}

async function getOne(table, id) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`,
    { headers: authHeaders() }
  );
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${table}/${id} ${res.status}: ${text.slice(0, 240)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

async function listAll(table, { filterByFormula, fields, maxPages = 50 } = {}) {
  let offset;
  const records = [];
  let pages = 0;
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
    const text = await res.text();
    if (!res.ok) throw new Error(`${table} ${res.status}: ${text.slice(0, 240)}`);
    const data = JSON.parse(text);
    records.push(...(data.records || []));
    offset = data.offset;
    pages += 1;
  } while (offset && pages < maxPages);
  return records;
}

async function listViaView(table, viewId, { fields, maxRecords = 500 } = {}) {
  let offset;
  const records = [];
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    params.set("view", viewId);
    if (offset) params.set("offset", offset);
    if (fields) for (const f of fields) params.append("fields[]", f);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params}`,
      { headers: authHeaders() }
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`${table}?view= ${res.status}: ${text.slice(0, 240)}`);
    const data = JSON.parse(text);
    records.push(...(data.records || []));
    offset = data.offset;
    if (records.length >= maxRecords) break;
  } while (offset);
  return records.slice(0, maxRecords);
}

async function metaTables() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`meta ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text).tables || [];
}

function pick(fields, names) {
  for (const n of names) {
    if (fields && Object.prototype.hasOwnProperty.call(fields, n) && fields[n] != null) {
      return fields[n];
    }
  }
  return undefined;
}

function safeGet(promise) {
  return promise.then((r) => ({ ok: true, record: r })).catch((e) => ({
    ok: false,
    error: String(e && e.message ? e.message : e),
    status: e && e.status,
  }));
}

async function main() {
  loadEnvLocal();
  const started = new Date().toISOString();

  const athlete = await getOne("Athletes", SCHMIDT_ATHLETE);
  const enrollment = await getOne("Enrollments", SCHMIDT_ENROLLMENT);
  const week = await getOne("Weeks", FOUNDATION_WEEK);
  const scenario = await getOne("Testing Scenarios", SEED_SCENARIO);
  const foundationWas = await safeGet(getOne("Weekly Athlete Summary", FOUNDATION_WAS));
  const hwCompletion = await safeGet(getOne("Homework Completions", HW_COMPLETION));
  const hwXp = await safeGet(getOne("XP Events", HW_XP));

  const enrFields = enrollment.fields || {};
  const submissionIds = enrFields.Submissions || [];
  const wasIds = enrFields["Weekly Athlete Summary"] || [];
  const xpIds = enrFields["XP Events"] || [];
  const hcIds = enrFields["Homework Completions"] || [];
  const assetIds = enrFields["Submission Assets"] || enrFields["Submission Assets - Linked"] || [];
  const vfIds = enrFields["Video Feedback"] || [];
  const unlockIds = enrFields["Athlete Achievement Unlocks"] || [];
  const zoomAttendIds = enrFields["Zoom Attendance"] || [];

  const submissions = [];
  for (const id of submissionIds) {
    const rec = await getOne("Submissions", id);
    submissions.push({
      id: rec.id,
      shotTotal: pick(rec.fields, ["Shot Total"]),
      activityDate: pick(rec.fields, ["Activity Date"]),
      week: pick(rec.fields, ["Week"]),
      duplicateReviewStatus: pick(rec.fields, ["Duplicate Review Status"]),
      xpEvents: pick(rec.fields, ["XP Events"]) || [],
    });
  }

  const wasRows = [];
  for (const id of wasIds) {
    const rec = await getOne("Weekly Athlete Summary", id);
    wasRows.push({
      id: rec.id,
      enrollment: pick(rec.fields, ["Enrollment"]),
      week: pick(rec.fields, ["Week"]),
      shots: pick(rec.fields, ["Total Shots This Week"]),
      summaryKey: pick(rec.fields, ["Summary Key", "Weekly Summary Key"]),
      calculationStatus: pick(rec.fields, ["Calculation Status"]),
    });
  }

  // XP via Source Keys for each submission (reliable)
  const xpBySubmission = [];
  for (const sub of submissions) {
    const key = `SUBMISSION_XP|${sub.id}`;
    const rows = await listAll("XP Events", {
      filterByFormula: `{Source Key}="${key}"`,
      fields: ["Source Key", "XP Points", "Submission", "Enrollment"],
    });
    xpBySubmission.push({ submissionId: sub.id, sourceKey: key, events: rows.map((r) => ({ id: r.id, fields: r.fields })) });
  }

  const hwXpByKey = await listAll("XP Events", {
    filterByFormula: `{Source Key}="HOMEWORK_XP|${HW_COMPLETION}"`,
    fields: ["Source Key", "XP Points", "Enrollment", "Homework Completion"],
  });

  const tables = await metaTables();
  const viewsByTable = {};
  const viewRowChecks = [];
  for (const t of tables) {
    if (!WANTED_TABLES.includes(t.name)) continue;
    const views = (t.views || []).map((v) => ({ id: v.id, name: v.name, type: v.type }));
    viewsByTable[t.name] = views;
    const testingViews = views.filter((v) => /testing/i.test(v.name));
    for (const v of testingViews) {
      try {
        const rows = await listViaView(t.name, v.id, { maxRecords: 400 });
        const ids = rows.map((r) => r.id);
        const schmidtHints = {
          enrollmentIdPresent: ids.includes(SCHMIDT_ENROLLMENT),
          athleteIdPresent: ids.includes(SCHMIDT_ATHLETE),
          knownSubmissionPresent: submissionIds.some((id) => ids.includes(id)),
          knownWasPresent: wasIds.some((id) => ids.includes(id)) || ids.includes(FOUNDATION_WAS),
          knownHcPresent: ids.includes(HW_COMPLETION) || hcIds.some((id) => ids.includes(id)),
          knownScenarioPresent: ids.includes(SEED_SCENARIO),
          knownWeekPresent: ids.includes(FOUNDATION_WEEK),
        };
        // Heuristic: if table has Enrollment field, count how many rows link Schmidt
        let schmidtLinkedCount = null;
        const sampleFields = rows.slice(0, 50).map((r) => r.fields || {});
        const enrollmentFieldNames = [
          "Enrollment",
          "Related Enrollment",
          "Enrollment - Linked",
        ];
        for (const fname of enrollmentFieldNames) {
          if (sampleFields.some((f) => Object.prototype.hasOwnProperty.call(f, fname))) {
            schmidtLinkedCount = rows.filter((r) => {
              const v = r.fields?.[fname];
              if (Array.isArray(v)) return v.includes(SCHMIDT_ENROLLMENT);
              return false;
            }).length;
            break;
          }
        }
        viewRowChecks.push({
          table: t.name,
          viewId: v.id,
          viewName: v.name,
          rowCountSampled: rows.length,
          truncated: rows.length >= 400,
          schmidtLinkedCount,
          schmidtHints,
          suspectWideFilter:
            schmidtLinkedCount != null
              ? schmidtLinkedCount === 0 && rows.length > 50
              : rows.length > 200 && !Object.values(schmidtHints).some(Boolean),
        });
      } catch (e) {
        viewRowChecks.push({
          table: t.name,
          viewId: v.id,
          viewName: v.name,
          error: String(e && e.message ? e.message : e),
        });
      }
    }
  }

  const out = {
    started_at: started,
    completed_at: new Date().toISOString(),
    base_id: BASE,
    read_only: true,
    schmidt: {
      athlete: {
        id: athlete.id,
        name: pick(athlete.fields, ["Athlete Name", "Full Name", "Name"]),
        active: pick(athlete.fields, ["Active?"]),
      },
      enrollment: {
        id: enrollment.id,
        active: pick(enrFields, ["Active?"]),
        athlete: pick(enrFields, ["Athlete"]),
        gradeBand: pick(enrFields, ["Grade Band"]),
        primary: pick(enrFields, ["Full Athlete Name", "Name", "Enrollment Name"]),
        submissionIds,
        wasIds,
        xpLinkCount: (xpIds || []).length,
        homeworkCompletionIds: hcIds,
        assetLinkCount: (assetIds || []).length,
        videoFeedbackIds: vfIds,
        unlockIds,
        zoomAttendanceIds: zoomAttendIds,
      },
      foundationWeek: {
        id: week.id,
        name: pick(week.fields, ["Week Name", "Name"]),
        start: pick(week.fields, ["Week Start Date", "Start Date"]),
        end: pick(week.fields, ["Week End Date", "End Date"]),
        submissions: pick(week.fields, ["Submissions"]) || [],
        was: pick(week.fields, ["Weekly Athlete Summary"]) || [],
      },
      scenario: {
        id: scenario.id,
        lastRunStatus: pick(scenario.fields, ["Last Run Status"]),
        lastRunAt: pick(scenario.fields, ["Last Run At"]),
        linkedSubmission: pick(scenario.fields, ["Linked Submission"]),
        runTest: pick(scenario.fields, ["Run Test?"]),
        dryRun: pick(scenario.fields, ["Dry Run?"]),
        relatedEnrollment: pick(scenario.fields, ["Related Enrollment"]),
      },
      foundationWas,
      homeworkCompletion: hwCompletion,
      homeworkXp: hwXp,
      homeworkXpBySourceKey: hwXpByKey.map((r) => ({ id: r.id, fields: r.fields })),
      submissions,
      wasRows,
      xpBySubmission,
    },
    viewsByTable,
    viewRowChecks,
  };

  const evidenceDir = resolve(
    ROOT,
    "docs/testing/evidence/2026-08-04-sc-003-006-testing-control-center"
  );
  mkdirSync(evidenceDir, { recursive: true });
  const outPath = resolve(evidenceDir, "PROD-LIVE-SNAPSHOT.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify(
      {
        wrote: outPath,
        enrollment_active: out.schmidt.enrollment.active,
        submission_count: submissionIds.length,
        was_count: wasIds.length,
        was_ids: wasIds,
        homework_completion_ids: hcIds,
        homework_xp_count: hwXpByKey.length,
        testing_view_names: Object.fromEntries(
          Object.entries(viewsByTable).map(([k, v]) => [k, v.map((x) => x.name)])
        ),
        view_row_checks_summary: viewRowChecks.map((c) => ({
          table: c.table,
          view: c.viewName,
          rows: c.rowCountSampled,
          schmidtLinked: c.schmidtLinkedCount,
          suspectWide: c.suspectWideFilter,
          error: c.error || null,
        })),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
