"use strict";

const { writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { BASE_ID, CANONICAL_IDENTITY, EVIDENCE_DIR } = require("../config");
const { loadEnvLocal, airtableToken, fetchRecord } = require("../identity");
const { runAudit } = require("../../../../lib/reliability-command-center");

const ROOT = resolve(__dirname, "../../../..");

async function airtableList(table, { filterByFormula, fields, maxRecords = 8000 } = {}) {
  const token = airtableToken();
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    for (const field of fields || []) params.append("fields[]", field);
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${table} list ${res.status}: ${body.slice(0, 180)}`);
    }
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
    if (records.length >= maxRecords) break;
  } while (offset);
  return records;
}

async function listCount(table, enrollmentId, fieldName) {
  const token = airtableToken();
  const formula = `{${fieldName}} = "${enrollmentId}"`;
  const params = new URLSearchParams({ pageSize: "100", filterByFormula: formula });
  let offset;
  let count = 0;
  do {
    if (offset) params.set("offset", offset);
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${table} list ${res.status}`);
    const data = await res.json();
    count += (data.records || []).length;
    offset = data.offset;
  } while (offset);
  return count;
}

async function fetchLiveSnapshot() {
  loadEnvLocal();
  const enrollmentId = CANONICAL_IDENTITY.enrollmentId;
  const enrollment = await fetchRecord("Enrollments", enrollmentId);
  const athleteId = (enrollment.fields?.Athlete || [])[0];
  const athlete = athleteId ? await fetchRecord("Athletes", athleteId) : null;
  const gradeBandLabelRaw = enrollment.fields?.["Grade Band Label"];
  let gradeBandLabel = null;
  if (Array.isArray(gradeBandLabelRaw)) {
    gradeBandLabel = gradeBandLabelRaw.join(", ");
  } else if (gradeBandLabelRaw) {
    gradeBandLabel = String(gradeBandLabelRaw);
  }
  return {
    enrollment,
    athlete,
    counts: {
      submissions: await listCount("Submissions", enrollmentId, "Enrollment"),
      homeworkCompletions: await listCount("Homework Completions", enrollmentId, "Enrollment"),
      videoFeedback: await listCount("Video Feedback", enrollmentId, "Enrollment"),
      zoomAttendance: await listCount("Zoom Attendance", enrollmentId, "Enrollment"),
      xpEvents: await listCount("XP Events", enrollmentId, "Enrollment"),
      was: await listCount("Weekly Athlete Summary", enrollmentId, "Enrollment"),
      achievementUnlocks: await listCount("Athlete Achievement Unlocks", enrollmentId, "Enrollment"),
    },
    enrollmentId,
    athleteId,
    programInstanceId: (enrollment.fields?.["Program Instance"] || [])[0],
    grade: enrollment.fields?.Grade,
    gradeBand: gradeBandLabel,
    active: enrollment.fields?.["Active?"],
    athleteLabel:
      athlete?.fields?.["Full Name"] ||
      athlete?.fields?.Name ||
      athlete?.fields?.["Athlete Name"] ||
      null,
  };
}

/**
 * Fetch only the fields needed by issue #100 reconciliation checks.
 * This is deliberately read-only and scans active XP against authoritative sources.
 */
async function fetchXpHealthSnapshot() {
  const [
    xpEvents,
    submissions,
    homeworkCompletions,
    videoFeedback,
    zoomMeetings,
    zoomAttendance,
    streakOccurrences,
    achievementUnlocks,
    weeklyAthleteSummaries,
    enrollments,
  ] = await Promise.all([
    airtableList("XP Events", {
      filterByFormula: "{Active?}=1",
      fields: [
        "Enrollment",
        "Active?",
        "Source Key",
        "XP Source",
        "XP Points",
        "Submission",
        "Homework Completion",
        "Video Feedback",
        "Zoom Meeting",
        "Streak Occurrence",
        "Achievement Unlock",
        "Weekly Athlete Summary",
        "Awarded By",
        "XP Reason Public",
      ],
    }),
    airtableList("Submissions", {
      fields: ["Enrollment", "Count This Submission?", "XP Award Status", "Week"],
    }),
    airtableList("Homework Completions", {
      fields: ["Enrollment", "Award Status", "Satisfactory?", "Week"],
    }),
    airtableList("Video Feedback", {
      fields: ["Enrollment", "Active?", "Award Status", "Submission", "Week"],
    }),
    airtableList("Zoom Meetings", {
      fields: ["Attendees", "Meeting Status", "Week", "XP Events"],
    }),
    airtableList("Zoom Attendance", {
      fields: [
        "Enrollment",
        "Zoom Meeting",
        "Attendance Method",
        "Recording Quiz Satisfactory?",
        "Zoom Credit Approved?",
      ],
    }),
    airtableList("Streak Occurrences", {
      fields: ["Enrollment", "Achievement", "Streak End Date", "Active?", "Source Status", "XP Events"],
    }),
    airtableList("Athlete Achievement Unlocks", {
      fields: [
        "Enrollment",
        "Shot Milestone",
        "Week",
        "Milestone Source Key",
        "Active?",
        "Source Status",
        "XP Award Status",
        "XP Events",
      ],
    }),
    airtableList("Weekly Athlete Summary", {
      fields: ["Enrollment", "Week", "Threshold XP Status", "Goal Completion %", "XP Events"],
    }),
    airtableList("Enrollments", {
      fields: ["Active?", "School Year", "Program Instance", "Level Recalc Needed?"],
    }),
  ]);

  return {
    xpEvents,
    submissions,
    homeworkCompletions,
    videoFeedback,
    zoomMeetings,
    zoomAttendance,
    streakOccurrences,
    achievementUnlocks,
    weeklyAthleteSummaries,
    enrollments,
  };
}

function summarizeXpHealth(snapshot) {
  const activeXp = (snapshot.xpEvents || []).filter((row) => row?.fields?.["Active?"] === true);
  const orphanActiveXp = activeXp.filter((row) => !Array.isArray(row.fields?.Enrollment) || row.fields.Enrollment.length === 0);
  const audit = runAudit(snapshot, {
    workflows: ["xpEvents", "xpSourceAuthority"],
    source: "prod-readonly-scan",
  });
  const blocking = audit.issues.filter((issue) =>
    ["P0", "P1"].includes(issue.priority) || issue.healthStatus === "Blocking Error"
  );
  const byCode = {};
  for (const issue of audit.issues) byCode[issue.code] = (byCode[issue.code] || 0) + 1;
  const byPrefix = {};
  for (const row of activeXp) {
    const key = String(row.fields?.["Source Key"] || "");
    const prefix = key.includes("|") ? `${key.split("|")[0]}|` : key || "[blank]";
    byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
  }
  return {
    activeXpCount: activeXp.length,
    activeOrphanCount: orphanActiveXp.length,
    issueCount: audit.issues.length,
    blockingIssueCount: blocking.length,
    issuesByCode: byCode,
    activeSourcePrefixes: byPrefix,
    affectedRecordIds: Array.from(new Set(audit.issues.map((issue) => issue.sourceRecordId).filter(Boolean))),
    pass: orphanActiveXp.length === 0 && blocking.length === 0,
  };
}

function identityChecks(live) {
  const checks = [];
  const push = (id, pass, expected, actual, notes) => {
    checks.push({ id, status: pass ? "PASS" : "FAIL", expected, actual, notes });
  };
  push("enrollment.exists", !!live.enrollment, CANONICAL_IDENTITY.enrollmentId, live.enrollmentId);
  push("enrollment.active", live.active === true, true, live.active);
  push(
    "enrollment.program_instance",
    live.programInstanceId === CANONICAL_IDENTITY.programInstanceId,
    CANONICAL_IDENTITY.programInstanceId,
    live.programInstanceId
  );
  push("enrollment.grade", live.grade != null, CANONICAL_IDENTITY.grade, live.grade);
  push(
    "enrollment.grade_band",
    String(live.gradeBand || "").includes(CANONICAL_IDENTITY.gradeBand),
    CANONICAL_IDENTITY.gradeBand,
    live.gradeBand
  );
  push(
    "athlete.id",
    live.athleteId === CANONICAL_IDENTITY.athleteId,
    CANONICAL_IDENTITY.athleteId,
    live.athleteId
  );
  push(
    "athlete.label",
    /testing schmidt/i.test(String(live.athleteLabel || "")),
    CANONICAL_IDENTITY.athleteLabel,
    live.athleteLabel
  );
  for (const [key, val] of Object.entries(live.counts)) {
    checks.push({
      id: `count.${key}`,
      status: "PASS",
      expected: ">=0",
      actual: val,
      notes: "Empty baseline acceptable for newly created controlled identity",
    });
  }
  return checks;
}

function xpHealthChecks(xpHealth) {
  return [
    {
      id: "xp.active_orphan_zero",
      status: xpHealth.activeOrphanCount === 0 ? "PASS" : "FAIL",
      expected: 0,
      actual: xpHealth.activeOrphanCount,
      notes: "Issue #100 health invariant: Active?=true + Enrollment blank must remain zero.",
    },
    {
      id: "xp.authority_integrity",
      status: xpHealth.blockingIssueCount === 0 ? "PASS" : "FAIL",
      expected: 0,
      actual: xpHealth.blockingIssueCount,
      notes: "Layer 1/2 XP authority checks: missing/inactive/moved/ambiguous sources and unaudited manual bonus fail closed.",
    },
    {
      id: "xp.active_inventory",
      status: "PASS",
      expected: ">=0",
      actual: xpHealth.activeXpCount,
      notes: `Active Source Key prefixes: ${JSON.stringify(xpHealth.activeSourcePrefixes)}`,
    },
  ];
}

async function runReadOnlyScan() {
  loadEnvLocal();
  if (!airtableToken()) {
    return {
      overall: "BLOCKED",
      counts: { BLOCKED: 1 },
      checks: [{ id: "readonly.token", status: "BLOCKED", notes: "AIRTABLE_API_TOKEN missing" }],
    };
  }
  let live;
  let xpHealth;
  try {
    live = await fetchLiveSnapshot();
    xpHealth = summarizeXpHealth(await fetchXpHealthSnapshot());
  } catch (err) {
    return {
      overall: "BLOCKED",
      counts: { BLOCKED: 1 },
      checks: [{ id: "readonly.live-fetch", status: "BLOCKED", notes: err.message }],
    };
  }
  const checks = [...identityChecks(live), ...xpHealthChecks(xpHealth)];
  const statusCounts = { PASS: 0, FAIL: 0, BLOCKED: 0 };
  for (const c of checks) statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  const out = {
    overall: statusCounts.FAIL ? "FAIL" : "PASS",
    counts: statusCounts,
    checks,
    liveSnapshot: {
      enrollmentId: live.enrollmentId,
      athleteId: live.athleteId,
      programInstanceId: live.programInstanceId,
      grade: live.grade,
      gradeBand: live.gradeBand,
      active: live.active,
      athleteLabel: live.athleteLabel,
      recordCounts: live.counts,
      xpHealth,
    },
  };
  const outDir = resolve(ROOT, EVIDENCE_DIR);
  mkdirSync(outDir, { recursive: true });
  const path = resolve(outDir, "READONLY-SCAN.json");
  writeFileSync(path, JSON.stringify({ generated_at: new Date().toISOString(), ...out }, null, 2));
  out.evidencePath = path;
  return out;
}

module.exports = {
  runReadOnlyScan,
  fetchLiveSnapshot,
  fetchXpHealthSnapshot,
  summarizeXpHealth,
  xpHealthChecks,
};
