/*
Extension Script: Audit XP Linkage Coverage
System: 127 SI Shooting Challenge
Purpose:
  Read-only classification of XP Events by source type and link completeness.
  Explains expected partial fill (e.g. Zoom/achievement XP without Submission link).

Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 15;

const CONFIG = {
  scriptName: "audit-xp-linkage-coverage",
  version: "v1.0",

  tables: {
    xpEvents: "XP Events",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    submission: "Submission",
    homeworkCompletion: "Homework Completion",
    videoFeedback: "Video Feedback",
    achievementUnlock: "Achievement Unlock",
    streakOccurrence: "Streak Occurrence",
    sourceKey: "Source Key",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
    xpPoints: "XP Points",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function hasLink(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName).length > 0;
}

function bump(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

function pushSample(bucket, row) {
  if (bucket.length < SAMPLE_LIMIT) bucket.push(row);
}

async function main() {
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));
  const xpQuery = await xpEventsTable.selectRecordsAsync({ fields: xpFields });

  const byXpSource = {};
  const byXpBucket = {};
  const bySourceKeyPrefix = {};

  let withSubmission = 0;
  let withoutSubmission = 0;
  let withWeek = 0;
  let withoutWeek = 0;
  let withWas = 0;
  let withoutWas = 0;
  let withHomework = 0;
  let withVideo = 0;
  let withAchievementUnlock = 0;
  let withStreakOccurrence = 0;

  const noSubmissionSample = [];
  const noWasSample = [];
  const noWeekSample = [];

  for (const xpRecord of xpQuery.records) {
    const xpSource = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpSource) || "(blank)";
    const xpBucket = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpBucket) || "(blank)";
    const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const prefix = sourceKey.includes("|") ? sourceKey.split("|")[0] : "(no pipe)";

    bump(byXpSource, xpSource);
    bump(byXpBucket, xpBucket);
    bump(bySourceKeyPrefix, prefix);

    const submissionLinked = hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.submission);
    const weekLinked = hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.week);
    const wasLinked = hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.weeklySummary);

    if (submissionLinked) withSubmission += 1;
    else {
      withoutSubmission += 1;
      pushSample(noSubmissionSample, {
        id: xpRecord.id,
        xpSource,
        xpBucket,
        sourceKey,
      });
    }

    if (weekLinked) withWeek += 1;
    else {
      withoutWeek += 1;
      pushSample(noWeekSample, {
        id: xpRecord.id,
        xpSource,
        xpBucket,
        sourceKey,
      });
    }

    if (wasLinked) withWas += 1;
    else {
      withoutWas += 1;
      pushSample(noWasSample, {
        id: xpRecord.id,
        xpSource,
        xpBucket,
        sourceKey,
        hasEnrollment: hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.enrollment),
        hasWeek: weekLinked,
      });
    }

    if (hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.homeworkCompletion)) withHomework += 1;
    if (hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.videoFeedback)) withVideo += 1;
    if (hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.achievementUnlock)) {
      withAchievementUnlock += 1;
    }
    if (hasLink(xpRecord, xpEventsTable, CONFIG.xpEvents.streakOccurrence)) {
      withStreakOccurrence += 1;
    }
  }

  const total = xpQuery.records.length;

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    xpEventsChecked: total,
    linkage: {
      submission: { withLink: withSubmission, withoutLink: withoutSubmission },
      week: { withLink: withWeek, withoutLink: withoutWeek },
      weeklyAthleteSummary: { withLink: withWas, withoutLink: withoutWas },
      homeworkCompletion: withHomework,
      videoFeedback: withVideo,
      achievementUnlock: withAchievementUnlock,
      streakOccurrence: withStreakOccurrence,
    },
    byXpSource,
    byXpBucket,
    bySourceKeyPrefix,
    noSubmissionSample,
    noWeekSample,
    noWasSample,
    note:
      "Missing Submission on Zoom, Streak, Perfect Week, and Shot Milestone XP is expected. Run audit-orphan-xp-events.js to repair WAS gaps.",
  };

  console.log("===== XP LINKAGE COVERAGE =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
