#!/usr/bin/env node
/**
 * Read-only Weekly Athlete Summary XP reconciliation.
 * Usage: node tools/testing/was_xp_reconciliation.mjs [wasId] [outPath]
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WAS_ID = process.argv[2] || "reczxTIpVI8ZJLex0";
const OUT =
  process.argv[3] ||
  `/opt/cursor/artifacts/was-xp-reconciliation-${WAS_ID}.json`;

function loadEnv() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();
const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = process.env.AIRTABLE_BASE_ID || "appn84sqPw03zEbTT";
if (!TOKEN) {
  console.error("Missing AIRTABLE_API_TOKEN");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}` };

async function api(path, params) {
  const url = `https://api.airtable.com/v0/${BASE}${path}${params ? `?${params}` : ""}`;
  const res = await fetch(url, { headers });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function getRecord(table, id) {
  return api(`/${encodeURIComponent(table)}/${id}`);
}

async function listAll(table, formula, fields = []) {
  const out = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (formula) params.set("filterByFormula", formula);
    fields.forEach((f) => params.append("fields[]", f));
    if (offset) params.set("offset", offset);
    const body = await api(`/${encodeURIComponent(table)}`, params);
    out.push(...(body.records || []));
    offset = body.offset;
  } while (offset);
  return out;
}

function first(arr) {
  return Array.isArray(arr) ? arr[0] : undefined;
}

function asBool(v) {
  return v === true || v === 1 || v === "1";
}

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asText(v) {
  if (v == null) return "";
  if (typeof v === "object" && v.name) return String(v.name);
  return String(v);
}

const XP_FIELDS = [
  "Active?",
  "Active XP Points",
  "XP Points",
  "XP Source",
  "XP Bucket",
  "XP Activity Date",
  "Created",
  "Source Key",
  "Duplicate Status",
  "Enrollment",
  "Week",
  "Weekly Athlete Summary",
  "Submission",
  "Homework Completion",
  "Video Feedback",
  "Zoom Meeting",
  "Achievement Unlock",
  "Streak Occurrence",
  "Enrollment Record ID",
];

const WAS_FIELDS = [
  "Enrollment",
  "Week",
  "XP Earned This Week",
  "XP Events",
  "Summary Calculation Status",
  "Weekly Email Status",
  "Build Weekly Email Now?",
  "Weekly Email Sent?",
  "Total XP After Week",
  "Previous Total XP",
  "Created",
];

async function main() {
  const was = await getRecord("Weekly Athlete Summary", WAS_ID);
  const wf = was.fields || {};
  const enrollmentId = first(wf.Enrollment);
  const weekId = first(wf.Week);
  const linkedXpIds = new Set(wf["XP Events"] || []);
  const storedWeeklyXp = asNum(wf["XP Earned This Week"]);

  if (!enrollmentId || !weekId) {
    throw new Error(`WAS ${WAS_ID} missing Enrollment or Week link`);
  }

  const enrollment = await getRecord("Enrollments", enrollmentId);
  const week = await getRecord("Weeks", weekId);

  const xpByEnrollment = await listAll(
    "XP Events",
    `{Enrollment Record ID}="${enrollmentId}"`,
    XP_FIELDS,
  );

  const allXp = xpByEnrollment.filter((r) => (r.fields.Week || []).includes(weekId));

  const activeCanonical = allXp.filter((r) => asBool(r.fields["Active?"]));
  const canonicalTotal = activeCanonical.reduce(
    (sum, r) => sum + asNum(r.fields["XP Points"]),
    0,
  );
  const canonicalActivePointsTotal = activeCanonical.reduce(
    (sum, r) => sum + asNum(r.fields["Active XP Points"]),
    0,
  );

  const linkedActive = allXp.filter(
    (r) => linkedXpIds.has(r.id) && asBool(r.fields["Active?"]),
  );
  const linkedRollupTotal = linkedActive.reduce(
    (sum, r) => sum + asNum(r.fields["Active XP Points"]),
    0,
  );

  const rows = allXp
    .map((r) => {
      const f = r.fields || {};
      const active = asBool(f["Active?"]);
      const dup = asText(f["Duplicate Status"]);
      const xpEnrollment = first(f.Enrollment);
      const xpWeek = first(f.Week);
      const xpWasIds = f["Weekly Athlete Summary"] || [];
      const linkedToWas = xpWasIds.includes(WAS_ID);
      const inCanonical =
        active &&
        xpEnrollment === enrollmentId &&
        xpWeek === weekId &&
        dup !== "Duplicate - Remove";
      const inWeeklyRollup = linkedToWas && active;
      const reasons = [];
      if (!active) reasons.push("inactive");
      if (dup === "Duplicate - Remove") reasons.push("duplicate_remove");
      if (xpEnrollment !== enrollmentId) reasons.push("wrong_enrollment");
      if (xpWeek !== weekId) reasons.push("wrong_week");
      if (active && !linkedToWas) reasons.push("not_linked_to_was");
      if (linkedToWas && !active) reasons.push("linked_but_inactive");
      if (
        inCanonical &&
        !linkedToWas &&
        asText(f["XP Source"]).toLowerCase().includes("submission base")
      ) {
        reasons.push("submission_base_excluded_from_031_link_repair");
      }
      if (inCanonical && !linkedToWas && f.Created) {
        reasons.push("added_or_unlinked_after_rollup_settled");
      }

      return {
        xpEventId: r.id,
        xpBucket: asText(f["XP Bucket"]),
        xpSource: asText(f["XP Source"]),
        xpPoints: asNum(f["XP Points"]),
        activeXpPoints: asNum(f["Active XP Points"]),
        active,
        duplicateStatus: dup || null,
        sourceKey: asText(f["Source Key"]),
        xpActivityDate: f["XP Activity Date"] || null,
        created: f.Created || null,
        enrollmentLink: xpEnrollment || null,
        weekLink: xpWeek || null,
        wasLinks: xpWasIds,
        linkedToWas,
        submissionLink: first(f.Submission) || null,
        homeworkLink: first(f["Homework Completion"]) || null,
        videoLink: first(f["Video Feedback"]) || null,
        zoomLink: first(f["Zoom Meeting"]) || null,
        unlockLink: first(f["Achievement Unlock"]) || null,
        streakLink: first(f["Streak Occurrence"]) || null,
        inCanonicalTotal: inCanonical,
        inWeeklyXpRollup: inWeeklyRollup,
        reasonForDifference: reasons.length ? reasons.join("; ") : null,
      };
    })
    .sort((a, b) => {
      const da = String(a.xpActivityDate || a.created || "");
      const db = String(b.xpActivityDate || b.created || "");
      return da.localeCompare(db) || a.xpEventId.localeCompare(b.xpEventId);
    });

  const notLinkedCanonical = rows.filter((r) => r.inCanonicalTotal && !r.linkedToWas);
  const outsideWeek = rows.filter(
    (r) => r.active && (r.enrollmentLink !== enrollmentId || r.weekLink !== weekId),
  );
  const inactiveOrDup = rows.filter(
    (r) => !r.active || r.duplicateStatus === "Duplicate - Remove",
  );

  const report = {
    generatedAt: new Date().toISOString(),
    wasId: WAS_ID,
    enrollmentId,
    enrollmentName: enrollment.fields?.["Full Athlete Name"] || null,
    weekId,
    weekName: week.fields?.["Week Name"] || null,
    weekDates: {
      start: week.fields?.["Week Start Date"] || null,
      end: week.fields?.["Week End Date"] || null,
    },
    wasStatus: {
      summaryCalculationStatus: wf["Summary Calculation Status"] || null,
      weeklyEmailStatus: wf["Weekly Email Status"] || null,
      buildWeeklyEmailNow: wf["Build Weekly Email Now?"] ?? null,
      weeklyEmailSent: wf["Weekly Email Sent?"] ?? null,
      totalXpAfterWeek: wf["Total XP After Week"] ?? null,
      previousTotalXp: wf["Previous Total XP"] ?? null,
      created: wf.Created || null,
      lastModified: was.createdTime || null,
    },
    totals: {
      A_storedWeeklyXp: storedWeeklyXp,
      B_activeCanonicalXpPoints: canonicalTotal,
      B_activeCanonicalActiveXpPoints: canonicalActivePointsTotal,
      C_activeCanonicalEnrollmentWeek: canonicalTotal,
      D_activeOutsideWeek: outsideWeek.reduce((s, r) => s + asNum(r.xpPoints), 0),
      E_inactiveOrDuplicateXpPoints: inactiveOrDup.reduce(
        (s, r) => s + asNum(r.xpPoints),
        0,
      ),
      F_unlinkedCanonicalXpPoints: notLinkedCanonical.reduce(
        (s, r) => s + asNum(r.xpPoints),
        0,
      ),
      linkedRollupRecomputed: linkedRollupTotal,
      discrepancy: canonicalTotal - storedWeeklyXp,
      linkedXpEventCount: linkedXpIds.size,
      allXpEventCount: allXp.length,
      activeCanonicalCount: activeCanonical.length,
      notLinkedCanonicalCount: notLinkedCanonical.length,
    },
    notLinkedCanonicalEvents: notLinkedCanonical,
    reconciliationTable: rows,
    diagnosis: [],
    recommendedRepair: null,
  };

  if (Math.abs(storedWeeklyXp - canonicalTotal) < 0.001) {
    report.diagnosis.push("No disagreement between stored Weekly XP and active canonical total.");
  } else if (Math.abs(linkedRollupTotal - storedWeeklyXp) < 0.001) {
    report.diagnosis.push(
      "Stored Weekly XP matches linked active rollup; canonical 072 total is higher because active XP Events exist for Enrollment+Week that are not linked to this WAS.",
    );
  }

  const submissionBaseUnlinked = notLinkedCanonical.filter((r) =>
    r.xpSource.toLowerCase().includes("submission base"),
  );
  if (submissionBaseUnlinked.length) {
    report.diagnosis.push(
      `${submissionBaseUnlinked.length} active Submission Base XP Event(s) are not linked to WAS — consistent with 031 excluding Submission Base from summary-link repair.`,
    );
  }

  if (notLinkedCanonical.length && Math.abs(report.totals.F_unlinkedCanonicalXpPoints - report.totals.discrepancy) < 0.001) {
    report.diagnosis.push(
      "Full discrepancy explained by unlinked canonical XP Events; likely post-repair linking gap rather than wrong XP amounts.",
    );
    report.recommendedRepair =
      "Link missing active XP Events to WAS reczxTIpVI8ZJLex0 (or rerun approved 031 repair flow on a counted submission for this Enrollment+Week) so XP Earned This Week rollup settles to 1260; then rerun 072 weekly summary build. Do not create new XP Events.";
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));

  console.log(
    JSON.stringify(
      {
        outPath: OUT,
        totals: report.totals,
        diagnosis: report.diagnosis,
        notLinkedCanonicalEvents: report.notLinkedCanonicalEvents.map((r) => ({
          id: r.xpEventId,
          bucket: r.xpBucket,
          points: r.xpPoints,
          sourceKey: r.sourceKey,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
