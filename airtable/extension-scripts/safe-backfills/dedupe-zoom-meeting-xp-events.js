/*
Extension Script: Dedupe Zoom Meeting XP Events
System: 127 SI Shooting Challenge
Purpose:
  Finds duplicate Zoom attendance XP Events for one Zoom Meetings record and
  removes extra copies created by a re-run of Automation 101.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_DELETE = true to delete duplicate records
  - Always run dry-run first and review the console output

Setup:
  1. Set CONFIG.zoomMeetingRecordId to the Zoom Meetings record ID, OR
  2. Set CONFIG.zoomMeetingNameMatch (for example "ZOOM MEETING 1")
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_DELETE = false;

const CONFIG = {
  zoomMeetingRecordId: "",
  zoomMeetingNameMatch: "ZOOM MEETING 1",

  tables: {
    zoomMeetings: "Zoom Meetings",
    xpEvents: "XP Events",
  },

  zoom: {
    meetingName: "Meeting Name",
    attendees: "Attendees",
    zoomMeetingKey: "Zoom Meeting Key",
  },

  xpEvents: {
    enrollment: "Enrollment",
    sourceKey: "Source Key",
    xpBucket: "XP Bucket",
    xpPoints: "XP Points",
    zoomMeeting: "Zoom Meeting",
  },

  sourcePrefixes: {
    base: "ZOOM_ATTEND_BASE",
    bonus2: "ZOOM_ATTEND_BONUS_2",
    bonus3: "ZOOM_ATTEND_BONUS_3",
  },
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

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

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function buildBaseSourceKey(zoomMeetingKey, enrollmentId) {
  return `${CONFIG.sourcePrefixes.base}|${zoomMeetingKey}|${enrollmentId}`;
}

function buildBonus2SourceKey(enrollmentId) {
  return `${CONFIG.sourcePrefixes.bonus2}|${enrollmentId}`;
}

function buildBonus3SourceKey(enrollmentId) {
  return `${CONFIG.sourcePrefixes.bonus3}|${enrollmentId}`;
}

function classifyRecordForDedupe(xpRecord, xpTable, zoomMeetingId, zoomMeetingKey, attendeeSet) {
  const enrollmentId = getFirstLinkedId(xpRecord, xpTable, CONFIG.xpEvents.enrollment);
  const sourceKey = getText(xpRecord, xpTable, CONFIG.xpEvents.sourceKey);
  const normalizedSourceKey = normalizeKey(sourceKey);
  const linkedMeetingIds = getLinkedIds(xpRecord, xpTable, CONFIG.xpEvents.zoomMeeting);
  const linkedToMeeting = linkedMeetingIds.includes(zoomMeetingId);

  if (!enrollmentId || !attendeeSet.has(enrollmentId)) {
    return null;
  }

  const expectedBaseSourceKey = normalizeKey(
    buildBaseSourceKey(zoomMeetingKey, enrollmentId)
  );
  const expectedBonus2SourceKey = normalizeKey(buildBonus2SourceKey(enrollmentId));
  const expectedBonus3SourceKey = normalizeKey(buildBonus3SourceKey(enrollmentId));

  if (normalizedSourceKey === expectedBaseSourceKey || linkedToMeeting) {
    return {
      groupKey: `base|${enrollmentId}`,
      awardType: "base",
      enrollmentId,
      sourceKey,
      linkedToMeeting,
      hasExactSourceKey: normalizedSourceKey === expectedBaseSourceKey,
    };
  }

  if (normalizedSourceKey === expectedBonus2SourceKey) {
    return {
      groupKey: `bonus2|${enrollmentId}`,
      awardType: "bonus2",
      enrollmentId,
      sourceKey,
      linkedToMeeting,
      hasExactSourceKey: true,
    };
  }

  if (normalizedSourceKey === expectedBonus3SourceKey) {
    return {
      groupKey: `bonus3|${enrollmentId}`,
      awardType: "bonus3",
      enrollmentId,
      sourceKey,
      linkedToMeeting,
      hasExactSourceKey: true,
    };
  }

  return null;
}

function scoreKeepCandidate(recordMeta) {
  let score = 0;

  if (recordMeta.hasExactSourceKey) score += 100;
  if (recordMeta.linkedToMeeting) score += 50;
  if (recordMeta.createdTimeMs) {
    score -= recordMeta.createdTimeMs / 1_000_000_000;
  }

  return score;
}

async function findZoomMeetingRecord(zoomTable) {
  const configuredId = String(CONFIG.zoomMeetingRecordId || "").trim();

  if (configuredId) {
    const record = await zoomTable.selectRecordAsync(configuredId);
    if (!record) {
      throw new Error(`Zoom Meetings record not found: ${configuredId}`);
    }
    return record;
  }

  const nameMatch = normalizeText(CONFIG.zoomMeetingNameMatch);
  if (!nameMatch) {
    throw new Error("Set CONFIG.zoomMeetingRecordId or CONFIG.zoomMeetingNameMatch.");
  }

  const query = await zoomTable.selectRecordsAsync({
    fields: [
      CONFIG.zoom.meetingName,
      CONFIG.zoom.attendees,
      CONFIG.zoom.zoomMeetingKey,
    ],
  });

  const matches = query.records.filter((record) => {
    const meetingName = normalizeText(
      getText(record, zoomTable, CONFIG.zoom.meetingName) || record.name
    );
    return meetingName.includes(nameMatch);
  });

  if (matches.length === 0) {
    throw new Error(`No Zoom Meetings record matched name: ${CONFIG.zoomMeetingNameMatch}`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple Zoom Meetings records matched "${CONFIG.zoomMeetingNameMatch}": ${matches.map(record => record.id).join(", ")}. Set CONFIG.zoomMeetingRecordId.`
    );
  }

  return matches[0];
}

async function main() {
  const zoomTable = base.getTable(CONFIG.tables.zoomMeetings);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  const zoomRecord = await findZoomMeetingRecord(zoomTable);
  const zoomMeetingId = zoomRecord.id;
  const zoomMeetingKey = getText(zoomRecord, zoomTable, CONFIG.zoom.zoomMeetingKey);
  const meetingName = getText(zoomRecord, zoomTable, CONFIG.zoom.meetingName) || zoomRecord.name;
  const attendeeIds = getLinkedIds(zoomRecord, zoomTable, CONFIG.zoom.attendees);
  const attendeeSet = new Set(attendeeIds);

  if (!zoomMeetingKey) {
    throw new Error(`Zoom Meeting ${zoomMeetingId} is missing Zoom Meeting Key.`);
  }

  const xpFields = [
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.sourceKey,
    CONFIG.xpEvents.xpBucket,
    CONFIG.xpEvents.xpPoints,
    CONFIG.xpEvents.zoomMeeting,
  ].filter(fieldName => fieldExists(xpEventsTable, fieldName));

  const xpQuery = await xpEventsTable.selectRecordsAsync({
    fields: xpFields,
  });

  const groups = new Map();

  for (const xpRecord of xpQuery.records) {
    const classification = classifyRecordForDedupe(
      xpRecord,
      xpEventsTable,
      zoomMeetingId,
      zoomMeetingKey,
      attendeeSet
    );

    if (!classification) continue;

    const recordMeta = {
      id: xpRecord.id,
      awardType: classification.awardType,
      enrollmentId: classification.enrollmentId,
      sourceKey: classification.sourceKey,
      xpPoints: getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpPoints),
      linkedToMeeting: classification.linkedToMeeting,
      hasExactSourceKey: classification.hasExactSourceKey,
      createdTimeMs: xpRecord.createdTime
        ? new Date(xpRecord.createdTime).getTime()
        : 0,
    };

    if (!groups.has(classification.groupKey)) {
      groups.set(classification.groupKey, []);
    }

    groups.get(classification.groupKey).push(recordMeta);
  }

  const keepRecords = [];
  const deleteRecords = [];

  for (const [groupKey, records] of groups.entries()) {
    if (records.length <= 1) {
      if (records.length === 1) {
        keepRecords.push({ groupKey, ...records[0], action: "keep_only" });
      }
      continue;
    }

    const sorted = [...records].sort((a, b) => scoreKeepCandidate(b) - scoreKeepCandidate(a));
    const keeper = sorted[0];

    keepRecords.push({ groupKey, ...keeper, action: "keep" });

    for (const duplicate of sorted.slice(1)) {
      deleteRecords.push({
        groupKey,
        ...duplicate,
        keepRecordId: keeper.id,
        action: DRY_RUN ? "would_delete" : CONFIRM_DELETE ? "delete" : "report_only",
      });
    }
  }

  const report = {
    dryRun: DRY_RUN,
    confirmDelete: CONFIRM_DELETE,
    zoomMeetingId,
    zoomMeetingKey,
    meetingName,
    attendeeCount: attendeeIds.length,
    duplicateGroups: [...groups.entries()]
      .filter(([, records]) => records.length > 1)
      .map(([groupKey, records]) => ({ groupKey, count: records.length })),
    keepCount: keepRecords.length,
    deleteCount: deleteRecords.length,
    keepRecords,
    deleteRecords,
  };

  console.log("===== ZOOM MEETING XP DEDUPE REPORT =====");
  console.log(JSON.stringify(report, null, 2));

  if (deleteRecords.length === 0) {
    console.log("No duplicate Zoom meeting XP Events found.");
    return;
  }

  if (DRY_RUN) {
    console.log("DRY_RUN is true. No records were deleted.");
    return;
  }

  if (!CONFIRM_DELETE) {
    console.log("Set CONFIRM_DELETE = true to delete the duplicate records listed above.");
    return;
  }

  for (const duplicate of deleteRecords) {
    await xpEventsTable.deleteRecordAsync(duplicate.id);
    console.log(`Deleted duplicate XP Event ${duplicate.id} from group ${duplicate.groupKey}`);
  }

  console.log(`Deleted ${deleteRecords.length} duplicate XP Event record(s).`);
}

await main();
