/**
 * Full read-only XP reconciliation for one enrollment.
 * Usage: npx tsx scripts/full-xp-reconciliation.mjs [enrollmentId] [outPath]
 */
import { writeFileSync } from "node:fs";
import { loadXpActivityForEnrollment } from "../lib/data/xp-activity-loader.ts";
import {
  mergeRecentActivity,
  mapRecentSubmissions,
  mapRecentXpEvents,
} from "../lib/data/public-athlete-profile.ts";
import { asBoolean, asOptionalNumber, asText, linkedRecordIds, toAirtableDateKey } from "../lib/data/airtable-values.ts";

const ENR = process.argv[2] || "rec93mAfo5jKqP3g5";
const OUT = process.argv[3] || `/opt/cursor/artifacts/full-reconciliation-${ENR}.json`;

const token = process.env.AIRTABLE_API_TOKEN?.trim();
const base = process.env.AIRTABLE_BASE_ID?.trim();
if (!token || !base) {
  console.error("Missing AIRTABLE_API_TOKEN or AIRTABLE_BASE_ID");
  process.exit(1);
}

async function api(path, params) {
  const url = `https://api.airtable.com/v0/${base}${path}${params ? `?${params}` : ""}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(body)}`);
  return body;
}

async function fetchByIds(table, ids, fields) {
  if (!ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const filter =
      chunk.length === 1
        ? `RECORD_ID()="${chunk[0]}"`
        : `OR(${chunk.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
    const params = new URLSearchParams({ filterByFormula: filter, pageSize: "100", maxRecords: "100" });
    fields.forEach((f) => params.append("fields[]", f));
    const body = await api(`/${encodeURIComponent(table)}`, params);
    out.push(...body.records);
  }
  return out;
}

async function fetchEnrollmentFilter(table, filter, fields, sortField) {
  const params = new URLSearchParams({
    filterByFormula: filter,
    pageSize: "100",
    maxRecords: "100",
  });
  fields.forEach((f) => params.append("fields[]", f));
  if (sortField) {
    params.append("sort[0][field]", sortField);
    params.append("sort[0][direction]", "desc");
  }
  const body = await api(`/${encodeURIComponent(table)}`, params);
  return body.records;
}

const SUB_FIELDS = [
  "Activity Date",
  "Created",
  "Total Shots Counted",
  "Count This Submission?",
  "XP Events",
  "Enrollment",
];
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
  "Submission",
  "Enrollment Record ID",
  "Homework Completion",
  "Video Feedback",
  "Zoom Meeting",
  "Achievement Unlock",
  "Weekly Athlete Summary",
  "Streak Occurrence",
];
const UNLOCK_FIELDS = [
  "Active?",
  "Visible?",
  "Achievement",
  "Achievement Type",
  "Category",
  "Date Unlocked",
  "XP Awarded",
  "Shot Milestone",
  "Enrollment",
  "Week",
];

function xpSourceCategory(source) {
  const s = String(source || "").toLowerCase();
  if (s.includes("submission base")) return "submission";
  if (s.includes("shot milestone")) return "milestone";
  if (s.includes("streak")) return "streak";
  if (s.includes("perfect week")) return "perfect_week";
  if (s.includes("homework")) return "homework";
  if (s.includes("video")) return "video";
  if (s.includes("zoom")) return "zoom";
  if (s.includes("weekly threshold") || s.includes("threshold")) return "weekly_threshold";
  if (s.includes("manual")) return "manual";
  return "other";
}

function simulateProfileActivity(submissions, xpEvents) {
  const PUBLIC_PROFILE_RECENT_SUBMISSIONS = 12;
  const PUBLIC_PROFILE_RECENT_XP = 12;
  const submissionIds = submissions.map((s) => s.id).slice(0, 40);
  const xpIds = xpEvents.map((x) => x.id).slice(0, 40);

  const subRecords = submissions
    .filter((s) => submissionIds.includes(s.id))
    .sort((a, b) =>
      String(b.fields["Activity Date"] || "").localeCompare(String(a.fields["Activity Date"] || "")),
    )
    .slice(0, PUBLIC_PROFILE_RECENT_SUBMISSIONS)
    .filter((s) => asBoolean(s.fields["Count This Submission?"]));

  const xpRecords = xpEvents
    .filter((x) => xpIds.includes(x.id))
    .sort((a, b) => String(b.fields.Created || "").localeCompare(String(a.fields.Created || "")))
    .slice(0, PUBLIC_PROFILE_RECENT_XP)
    .filter((x) => asBoolean(x.fields["Active?"]));

  const merged = mergeRecentActivity(
    mapRecentSubmissions(subRecords),
    mapRecentXpEvents(xpRecords),
    12,
  );
  return { subRecords, xpRecords, merged };
}

async function main() {
  const enr = await api(`/Enrollments/${ENR}`);
  const linkedSubIds = linkedRecordIds(enr.fields.Submissions);
  const linkedXpIds = linkedRecordIds(enr.fields["XP Events"]);
  const linkedUnlockIds = linkedRecordIds(enr.fields["Athlete Achievement Unlocks"]);

  const allSubs = await fetchByIds("Submissions", linkedSubIds, SUB_FIELDS);
  const allXpByEnrollment = await fetchEnrollmentFilter(
    "XP Events",
    `{Enrollment Record ID}="${ENR}"`,
    XP_FIELDS,
    "XP Activity Date",
  );
  const allXpByLink = await fetchByIds("XP Events", linkedXpIds, XP_FIELDS);
  const xpMap = new Map();
  for (const r of [...allXpByEnrollment, ...allXpByLink]) xpMap.set(r.id, r);
  const allXp = [...xpMap.values()];

  const unlocks = await fetchByIds(
    "Athlete Achievement Unlocks",
    linkedUnlockIds,
    UNLOCK_FIELDS,
  );

  const dashboardLoader = await loadXpActivityForEnrollment(ENR, { maxRows: 100 });
  const dashboardLoader25 = await loadXpActivityForEnrollment(ENR, { maxRows: 25 });
  const profileSim = simulateProfileActivity(allSubs, allXp);

  const xpById = Object.fromEntries(allXp.map((x) => [x.id, x]));
  const xpBySubmission = new Map();
  for (const x of allXp) {
    for (const sid of linkedRecordIds(x.fields.Submission)) {
      const arr = xpBySubmission.get(sid) || [];
      arr.push(x);
      xpBySubmission.set(sid, arr);
    }
    const sk = asText(x.fields["Source Key"], "");
    const m = sk.match(/^SUBMISSION_XP\|(rec[a-zA-Z0-9]+)/);
    if (m) {
      const arr = xpBySubmission.get(m[1]) || [];
      arr.push(x);
      xpBySubmission.set(m[1], arr);
    }
  }

  const dashboardDisplayedIds = new Set(dashboardLoader.rows.map((r) => r.id));
  const dashboard25Ids = new Set(dashboardLoader25.rows.map((r) => r.id));

  const submissionRows = allSubs.map((s) => {
    const f = s.fields;
    const linkedXp = (s.fields["XP Events"] || [])
      .map((id) => xpById[id])
      .filter(Boolean);
    const byKey = xpBySubmission.get(s.id) || [];
    const xpCandidates = [...new Map([...linkedXp, ...byKey].map((x) => [x.id, x])).values()];
    const canonical = xpCandidates.find(
      (x) => asText(x.fields["Source Key"], "") === `SUBMISSION_XP|${s.id}`,
    );
    const xp = canonical || xpCandidates.find((x) => asBoolean(x.fields["Active?"])) || xpCandidates[0];
    const subDate = toAirtableDateKey(f["Activity Date"]);
    const onProfile = profileSim.merged.some(
      (item) => item.kind === "submission" && item.date === subDate && item.shots === asOptionalNumber(f["Total Shots Counted"]),
    );
    const onDashboard = xp ? dashboardDisplayedIds.has(xp.id) : false;

    let exclusionReason = null;
    if (!asBoolean(f["Count This Submission?"])) exclusionReason = "not_counted";
    else if (!xp) exclusionReason = "missing_xp_event";
    else if (!asBoolean(xp.fields["Active?"])) exclusionReason = "inactive_xp_event";
    else if (asText(xp.fields["Duplicate Status"], "") === "Duplicate - Remove")
      exclusionReason = "duplicate_remove";
    else if (!onDashboard && onProfile) exclusionReason = "dashboard_row_limit_or_filter";
    else if (!onDashboard && !onProfile) exclusionReason = "ui_limits_or_not_in_merged_feed";

    return {
      submissionId: s.id,
      submissionActivityDate: f["Activity Date"],
      submissionActivityDateKey: subDate,
      created: f.Created,
      shots: asOptionalNumber(f["Total Shots Counted"]),
      counted: asBoolean(f["Count This Submission?"]),
      xpEventId: xp?.id ?? null,
      xpBucket: xp ? asText(xp.fields["XP Bucket"], "") : null,
      xpSource: xp ? asText(xp.fields["XP Source"], "") : null,
      xpAmount: xp ? asOptionalNumber(xp.fields["Active XP Points"]) : null,
      active: xp ? asBoolean(xp.fields["Active?"]) : null,
      duplicateStatus: xp ? asText(xp.fields["Duplicate Status"], "") : null,
      sourceKey: xp ? asText(xp.fields["Source Key"], "") : null,
      onAthleteProfile: onProfile,
      onDashboardPreview: onDashboard,
      onDashboardMain: dashboard25Ids.has(xp?.id),
      exclusionReason,
    };
  });

  const nonSubmissionXp = allXp.filter(
    (x) => xpSourceCategory(x.fields["XP Source"]) !== "submission",
  );

  const unlockXpRows = unlocks.map((u) => {
    const f = u.fields;
    const type = asText(f["Achievement Type"], "") || asText(f.Category, "");
    const xpForUnlock = allXp.filter((x) =>
      linkedRecordIds(x.fields["Achievement Unlock"]).includes(u.id),
    );
    const xp =
      xpForUnlock.find((x) => asBoolean(x.fields["Active?"])) || xpForUnlock[0] || null;
    const onDashboard = xp ? dashboardDisplayedIds.has(xp.id) : false;
    const onProfileXp = profileSim.merged.some(
      (item) => item.kind === "xp" && xp && item.title.includes(asText(f["Achievement Type"], "Achievement")),
    );

    return {
      sourceRecordId: u.id,
      expectedAwardType: type,
      expectedXp: asOptionalNumber(f["XP Awarded"]),
      xpEventId: xp?.id ?? null,
      activityDate: xp ? toAirtableDateKey(xp.fields["XP Activity Date"]) ?? toAirtableDateKey(xp.fields.Created) : null,
      active: xp ? asBoolean(xp.fields["Active?"]) : null,
      duplicateStatus: xp ? asText(xp.fields["Duplicate Status"], "") : null,
      sourceKey: xp ? asText(xp.fields["Source Key"], "") : null,
      visible: asBoolean(f["Visible?"]),
      unlockActive: asBoolean(f["Active?"]),
      onAthleteProfileAchievements: asBoolean(f["Active?"]) && asBoolean(f["Visible?"]),
      onAthleteProfileActivity: onProfileXp,
      onDashboard: onDashboard,
      exclusionReason: !xp
        ? "missing_xp_event_for_unlock"
        : !onDashboard
          ? "not_in_dashboard_top_rows_or_filtered"
          : null,
    };
  });

  const otherXpRows = nonSubmissionXp.map((x) => {
    const f = x.fields;
    const cat = xpSourceCategory(f["XP Source"]);
    const onDashboard = dashboardDisplayedIds.has(x.id);
    const onProfile = profileSim.merged.some((item) => item.kind === "xp" && item.title === asText(f["XP Reason Public"], ""));

    let exclusionReason = null;
    if (!asBoolean(f["Active?"])) exclusionReason = "inactive";
    else if (asText(f["Duplicate Status"], "") === "Duplicate - Remove") exclusionReason = "duplicate_remove";
    else if (!onDashboard && !onProfile) exclusionReason = "ui_row_limits_or_merge_cap";

    return {
      xpEventId: x.id,
      category: cat,
      xpSource: asText(f["XP Source"], ""),
      xpBucket: asText(f["XP Bucket"], ""),
      xpAmount: asOptionalNumber(f["Active XP Points"]),
      activityDate: toAirtableDateKey(f["XP Activity Date"]),
      created: toAirtableDateKey(f.Created),
      active: asBoolean(f["Active?"]),
      duplicateStatus: asText(f["Duplicate Status"], ""),
      sourceKey: asText(f["Source Key"], ""),
      onAthleteProfileActivity: onProfile,
      onDashboardPreview: onDashboard,
      onDashboardMain: dashboard25Ids.has(x.id),
      exclusionReason,
    };
  });

  const countedSubs = submissionRows.filter((r) => r.counted);
  const missingXpSubs = submissionRows.filter((r) => r.counted && !r.xpEventId);
  const activeXp = allXp.filter((x) => asBoolean(x.fields["Active?"]));

  const summary = {
    enrollmentId: ENR,
    athleteName: enr.fields["Full Athlete Name"],
    linkedCounts: {
      submissions: linkedSubIds.length,
      xpEvents: linkedXpIds.length,
      achievementUnlocks: linkedUnlockIds.length,
    },
    totals: {
      submissionsRetrieved: allSubs.length,
      countedSubmissions: countedSubs.length,
      xpEventsRetrieved: allXp.length,
      activeXpEvents: activeXp.length,
      achievementUnlocks: unlocks.length,
      expectedSubmissionXpAwards: countedSubs.length,
      expectedNonSubmissionXpAwards: nonSubmissionXp.filter((x) => asBoolean(x.fields["Active?"])).length,
    },
    displayed: {
      athleteProfileRecentActivity: profileSim.merged.length,
      athleteProfileSubmissionsFetched: profileSim.subRecords.length,
      athleteProfileXpFetched: profileSim.xpRecords.length,
      dashboardPreviewRows: dashboardLoader.rows.length,
      dashboardMainRows: dashboardLoader25.rows.length,
    },
    missing: {
      submissionsWithoutXp: missingXpSubs.map((r) => r.submissionId),
      milestonesWithoutXpOnActivityFeed: unlockXpRows
        .filter((u) => u.expectedAwardType.toLowerCase().includes("milestone") && !u.onAthleteProfileActivity)
        .map((u) => u.sourceRecordId),
      streakUnlocksNotOnActivityFeed: unlockXpRows
        .filter((u) => u.expectedAwardType.toLowerCase().includes("streak") && !u.onAthleteProfileActivity)
        .map((u) => u.sourceRecordId),
    },
    codeLimits: {
      athleteProfile: {
        submissionLinkSlice: 40,
        xpLinkSlice: 40,
        maxSubmissionsFetched: 12,
        maxXpFetched: 12,
        mergedActivityCap: 12,
        xpEventsUseCreatedForDate: true,
        achievementsSectionSeparateFromActivity: true,
      },
      dashboard: {
        maxRowsPreview: 100,
        maxRowsMain: 25,
        showsXpEventsOnly: true,
        excludesSubmissionsWithoutXp: true,
      },
    },
    submissionRows,
    unlockRows: unlockXpRows,
    nonSubmissionXpRows: otherXpRows,
    athleteProfileMergedKeys: profileSim.merged.map((r) => ({
      key: r.key,
      kind: r.kind,
      date: r.date,
      title: r.title,
      detail: r.detail,
    })),
    dashboardPreviewRows: dashboardLoader.rows.map((r) => ({
      id: r.id,
      date: r.activityDate,
      source: r.sourceLabel,
      points: r.points,
    })),
  };

  writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ outPath: OUT, summary: {
    totals: summary.totals,
    displayed: summary.displayed,
    missing: summary.missing,
    codeLimits: summary.codeLimits,
  }}, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
