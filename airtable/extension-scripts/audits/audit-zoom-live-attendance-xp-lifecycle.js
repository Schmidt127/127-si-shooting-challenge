/*
 * PKG-034 — Read-only Zoom live-attendance XP lifecycle audit
 *
 * This extension never writes, deletes, or repairs records. It reports
 * evidence gaps and exact-key ownership problems for Automation 101's
 * ZOOM_ATTEND_* families. Recording-credit families are reported as
 * unsupported-by-PKG-034 and are never treated as live attendance.
 */

// @ts-nocheck

const CONFIG = {
  scriptName: "audit-zoom-live-attendance-xp-lifecycle",
  version: "v1.0",
  dryRun: true,
  tables: {
    zoom: "Zoom Meetings",
    enrollments: "Enrollments",
    weeks: "Weeks",
    rules: "XP Reward Rules",
    xp: "XP Events",
    was: "Weekly Athlete Summary",
  },
  zoom: {
    key: "Zoom Meeting Key",
    attendees: "Attendees",
    week: "Week",
    status: "Meeting Status",
    create: "Create XP Events",
    awardStatus: "XP Award Status",
    xpEvents: "XP Events",
    currentSignature: "Zoom XP Current Signature",
    lastSignature: "Last Zoom XP Reconciled Signature",
    needed: "Zoom XP Reconciliation Needed?",
    startFieldCandidates: ["Start Time", "Start Date", "Meeting Date", "Date"],
    enrollmentSignatureLookup: "Zoom XP Enrollment Signature - Lkp",
    weekSignatureLookup: "Zoom XP Week Signature - Lkp",
    eventSignatureLookup: "Zoom XP Event Signature - Lkp",
  },
  enrollment: {
    active: "Active?",
    athlete: "Athlete",
    programInstance: "Program Instance",
    schoolYear: "School Year",
    signature: "Zoom XP Enrollment Signature",
  },
  week: {
    programInstance: "Program Instance",
    schoolYear: "School Year",
    signature: "Zoom XP Week Signature",
  },
  rule: {
    key: "Rule Key",
    active: "Active?",
    amount: "XP Amount",
    source: "XP Source Label",
  },
  xp: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    week: "Week",
    was: "Weekly Athlete Summary",
    meeting: "Zoom Meeting",
    active: "Active?",
    bucket: "XP Bucket",
    source: "XP Source",
    points: "XP Points",
  },
  was: {
    enrollment: "Enrollment",
    week: "Week",
  },
  sourcePrefixes: ["ZOOM_ATTEND_BASE|", "ZOOM_ATTEND_BONUS_2|", "ZOOM_ATTEND_BONUS_3|"],
  supportedRuleKeys: ["ZOOM_ATTEND_BASE", "ZOOM_ATTEND_BONUS_2", "ZOOM_ATTEND_BONUS_3"],
  bonusSourceFallbacks: {
    bonus2: "Zoom Attendance Bonus 2",
    bonus3: "Zoom Attendance Bonus 3",
  },
};

const SAMPLE_LIMIT = 25;

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function raw(record, table, fieldName) {
  return fieldExists(table, fieldName) ? record.getCellValue(fieldName) : null;
}

function text(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function ids(record, table, fieldName) {
  const value = raw(record, table, fieldName);
  return Array.isArray(value) ? [...new Set(value.map((item) => item?.id).filter(Boolean))] : [];
}

function booleanish(record, table, fieldName) {
  const value = raw(record, table, fieldName);
  if (value === true || value === 1) return true;
  return ["true", "1", "yes", "checked", "active"].includes(
    String(value?.name ?? value ?? "").trim().toLowerCase(),
  );
}

function numberValue(record, table, fieldName) {
  const value = raw(record, table, fieldName);
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(/[$,%]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function addIssue(report, type, row) {
  report.issueCounts[type] = (report.issueCounts[type] || 0) + 1;
  if ((report.samples[type] || []).length < SAMPLE_LIMIT) report.samples[type].push(row);
}

function one(idsValue) {
  const values = [...new Set(idsValue || [])];
  return values.length === 1 ? values[0] : "";
}

function sourceType(sourceKey) {
  const value = String(sourceKey || "");
  if (value.startsWith("ZOOM_ATTEND_BASE|")) return "base";
  if (value.startsWith("ZOOM_ATTEND_BONUS_2|")) return "bonus2";
  if (value.startsWith("ZOOM_ATTEND_BONUS_3|")) return "bonus3";
  if (value.startsWith("ZOOM_CREDIT|") || value.startsWith("ZOOM_RECORDING|")) return "unsupported_recording";
  return "";
}

function bonusThreshold(type) {
  return type === "bonus2" ? 2 : type === "bonus3" ? 3 : 0;
}

function canonicalBonusMeeting(meetings, threshold) {
  return [...meetings]
    .sort((left, right) =>
      left.dateKey.localeCompare(right.dateKey) ||
      left.meetingKey.localeCompare(right.meetingKey) ||
      left.id.localeCompare(right.id)
    )[threshold - 1] || null;
}

function resolveStartField(zoomTable) {
  return CONFIG.zoom.startFieldCandidates.find((fieldName) => fieldExists(zoomTable, fieldName)) || "";
}

function dateKey(record, zoomTable, startField) {
  const value = raw(record, zoomTable, startField);
  const date = new Date(value);
  if (!startField || Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function exactRuleMap(ruleRecords, rulesTable) {
  const map = new Map();
  for (const record of ruleRecords) {
    const key = text(record, rulesTable, CONFIG.rule.key).toUpperCase();
    if (!CONFIG.supportedRuleKeys.includes(key) || !booleanish(record, rulesTable, CONFIG.rule.active)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  }
  return map;
}

async function main() {
  const zoomTable = base.getTable(CONFIG.tables.zoom);
  const enrollmentTable = base.getTable(CONFIG.tables.enrollments);
  const weekTable = base.getTable(CONFIG.tables.weeks);
  const rulesTable = base.getTable(CONFIG.tables.rules);
  const xpTable = base.getTable(CONFIG.tables.xp);
  const wasTable = base.getTable(CONFIG.tables.was);
  const startField = resolveStartField(zoomTable);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    readOnly: true,
    scope: "Zoom Meetings and XP Events using Automation 101 live source-key families",
    issueCounts: {},
    samples: {},
    counts: {},
    rewardRules: {},
    unsupportedRecordingXpEvents: [],
    deferredRecordingXpEvents: [],
    backlinkGaps: [],
    lifecycleStateMismatches: [],
  };

  const zoomFields = Object.values(CONFIG.zoom).filter((fieldName) => fieldExists(zoomTable, fieldName));
  const enrollmentFields = Object.values(CONFIG.enrollment).filter((fieldName) => fieldExists(enrollmentTable, fieldName));
  const weekFields = Object.values(CONFIG.week).filter((fieldName) => fieldExists(weekTable, fieldName));
  const xpFields = Object.values(CONFIG.xp).filter((fieldName) => fieldExists(xpTable, fieldName));
  const wasFields = Object.values(CONFIG.was).filter((fieldName) => fieldExists(wasTable, fieldName));
  const ruleFields = Object.values(CONFIG.rule).filter((fieldName) => fieldExists(rulesTable, fieldName));

  const missingReconciliationFields = [
    CONFIG.zoom.currentSignature,
    CONFIG.zoom.lastSignature,
    CONFIG.zoom.needed,
    CONFIG.zoom.enrollmentSignatureLookup,
    CONFIG.zoom.weekSignatureLookup,
    CONFIG.zoom.eventSignatureLookup,
  ].filter((fieldName) => !fieldExists(zoomTable, fieldName));
  if (!fieldExists(enrollmentTable, CONFIG.enrollment.signature)) {
    missingReconciliationFields.push(`Enrollments.${CONFIG.enrollment.signature}`);
  }
  if (!fieldExists(weekTable, CONFIG.week.signature)) {
    missingReconciliationFields.push(`Weeks.${CONFIG.week.signature}`);
  }
  report.counts.missingReconciliationFields = missingReconciliationFields;
  if (missingReconciliationFields.length) {
    addIssue(report, "reconciliation_schema_missing", { missingReconciliationFields });
  }

  const [zoomQuery, enrollmentQuery, weekQuery, rulesQuery, xpQuery, wasQuery] = await Promise.all([
    zoomTable.selectRecordsAsync({ fields: zoomFields }),
    enrollmentTable.selectRecordsAsync({ fields: enrollmentFields }),
    weekTable.selectRecordsAsync({ fields: weekFields }),
    rulesTable.selectRecordsAsync({ fields: ruleFields }),
    xpTable.selectRecordsAsync({ fields: xpFields }),
    wasTable.selectRecordsAsync({ fields: wasFields }),
  ]);

  const enrollments = new Map(enrollmentQuery.records.map((record) => [record.id, record]));
  const weeks = new Map(weekQuery.records.map((record) => [record.id, record]));
  const zooms = new Map(zoomQuery.records.map((record) => [record.id, record]));
  const xpByKey = new Map();
  const xpByMeeting = new Map();
  for (const event of xpQuery.records) {
    const key = text(event, xpTable, CONFIG.xp.sourceKey);
    const type = sourceType(key);
    if (type === "unsupported_recording") {
      const deferred = { id: event.id, sourceKey: key, scope: "unsupported_recording_deferred" };
      report.unsupportedRecordingXpEvents.push(deferred);
      report.deferredRecordingXpEvents.push(deferred);
    }
    if (!type || type === "unsupported_recording") continue;
    if (!xpByKey.has(key)) xpByKey.set(key, []);
    xpByKey.get(key).push(event);
    for (const meetingId of ids(event, xpTable, CONFIG.xp.meeting)) {
      if (!xpByMeeting.has(meetingId)) xpByMeeting.set(meetingId, []);
      xpByMeeting.get(meetingId).push(event);
    }
  }
  const wasByPair = new Map();
  for (const record of wasQuery.records) {
    const key = `${one(ids(record, wasTable, CONFIG.was.enrollment))}|${one(ids(record, wasTable, CONFIG.was.week))}`;
    if (!key.startsWith("|")) {
      if (!wasByPair.has(key)) wasByPair.set(key, []);
      wasByPair.get(key).push(record);
    }
  }

  const rules = exactRuleMap(rulesQuery.records, rulesTable);
  for (const key of CONFIG.supportedRuleKeys) {
    const records = rules.get(key) || [];
    report.rewardRules[key] = {
      activeCount: records.length,
      recordIds: records.map((record) => record.id),
      amounts: records.map((record) => numberValue(record, rulesTable, CONFIG.rule.amount)),
      exactKeyOnly: true,
    };
    if (records.length !== 1) addIssue(report, "reward_rule_ambiguity", { ruleKey: key, recordIds: records.map((record) => record.id) });
    if (records.length === 1 && !(numberValue(records[0], rulesTable, CONFIG.rule.amount) > 0)) {
      addIssue(report, "reward_rule_invalid_amount", { ruleKey: key, recordId: records[0].id });
    }
  }

  const duplicateMeetingKeys = new Map();
  for (const meeting of zoomQuery.records) {
    const key = text(meeting, zoomTable, CONFIG.zoom.key);
    if (!key) continue;
    if (!duplicateMeetingKeys.has(key)) duplicateMeetingKeys.set(key, []);
    duplicateMeetingKeys.get(key).push(meeting.id);
  }
  for (const [key, recordIds] of duplicateMeetingKeys) {
    if (recordIds.length > 1) addIssue(report, "duplicate_attendance_import", { meetingKey: key, recordIds });
  }

  const qualifyingByEnrollment = new Map();
  for (const meeting of zoomQuery.records) {
    const meetingKey = text(meeting, zoomTable, CONFIG.zoom.key);
    const dateKeyValue = dateKey(meeting, zoomTable, startField) || meeting.id;
    const weekIds = ids(meeting, zoomTable, CONFIG.zoom.week);
    const week = weekIds.length === 1 ? weeks.get(weekIds[0]) : null;
    if (
      !meetingKey ||
      text(meeting, zoomTable, CONFIG.zoom.status).toLowerCase() !== "completed" ||
      !week ||
      ids(week, weekTable, CONFIG.week.programInstance).length !== 1
    ) continue;
    for (const enrollmentId of ids(meeting, zoomTable, CONFIG.zoom.attendees)) {
      const enrollment = enrollments.get(enrollmentId);
      if (!enrollment || !booleanish(enrollment, enrollmentTable, CONFIG.enrollment.active)) continue;
      const enrollmentPi = ids(enrollment, enrollmentTable, CONFIG.enrollment.programInstance);
      const weekPi = ids(week, weekTable, CONFIG.week.programInstance);
      if (
        enrollmentPi.length !== 1 ||
        enrollmentPi[0] !== weekPi[0] ||
        !text(enrollment, enrollmentTable, CONFIG.enrollment.schoolYear) ||
        text(enrollment, enrollmentTable, CONFIG.enrollment.schoolYear) !== text(week, weekTable, CONFIG.week.schoolYear)
      ) continue;
      if (!qualifyingByEnrollment.has(enrollmentId)) qualifyingByEnrollment.set(enrollmentId, []);
      qualifyingByEnrollment.get(enrollmentId).push({
        id: meeting.id,
        meetingKey,
        dateKey: dateKeyValue,
        weekId: weekIds[0],
        programInstanceId: weekPi[0],
        schoolYear: text(week, weekTable, CONFIG.week.schoolYear),
      });
    }
  }

  for (const [enrollmentId, qualifyingMeetings] of qualifyingByEnrollment) {
    for (const type of ["bonus2", "bonus3"]) {
      const threshold = bonusThreshold(type);
      const prefix = type === "bonus2" ? "ZOOM_ATTEND_BONUS_2|" : "ZOOM_ATTEND_BONUS_3|";
      const sourceKey = `${prefix}${enrollmentId}`;
      const events = xpByKey.get(sourceKey) || [];
      const canonical = canonicalBonusMeeting(qualifyingMeetings, threshold);
      if (qualifyingMeetings.length >= threshold && events.length === 0) {
        addIssue(report, "bonus_missing_canonical_event", { enrollmentId, type, sourceKey, threshold });
      }
      if (events.length > 1) {
        addIssue(report, "bonus_duplicate_canonical_key", { enrollmentId, type, sourceKey, xpEventIds: events.map((event) => event.id) });
      }
      const ruleRows = rules.get(type === "bonus2" ? "ZOOM_ATTEND_BONUS_2" : "ZOOM_ATTEND_BONUS_3") || [];
      const expectedPoints = ruleRows.length === 1 ? numberValue(ruleRows[0], rulesTable, CONFIG.rule.amount) : null;
      const expectedSource = ruleRows.length === 1
        ? text(ruleRows[0], rulesTable, CONFIG.rule.source) ||
          CONFIG.bonusSourceFallbacks[type]
        : "";
      for (const event of events) {
        const active = booleanish(event, xpTable, CONFIG.xp.active);
        const meetingIds = ids(event, xpTable, CONFIG.xp.meeting);
        const eventWeekIds = ids(event, xpTable, CONFIG.xp.week);
        const eventEnrollmentIds = ids(event, xpTable, CONFIG.xp.enrollment);
        const eventWasIds = ids(event, xpTable, CONFIG.xp.was);
        const expectedActive = qualifyingMeetings.length >= threshold;
        if (active && !expectedActive) addIssue(report, "bonus_active_below_threshold", { eventId: event.id, enrollmentId, type, count: qualifyingMeetings.length, threshold });
        if (!active && expectedActive) addIssue(report, "bonus_inactive_threshold_met", { eventId: event.id, enrollmentId, type, count: qualifyingMeetings.length, threshold });
        if (meetingIds.length !== 1) addIssue(report, "bonus_meeting_link_cardinality", { eventId: event.id, enrollmentId, type, meetingIds });
        if (eventEnrollmentIds.length !== 1 || eventEnrollmentIds[0] !== enrollmentId) addIssue(report, "bonus_enrollment_link_ownership", { eventId: event.id, enrollmentId, type, eventEnrollmentIds });
        const expectedWeekId = canonical?.weekId || "";
        if (eventWeekIds.length !== 1 || (expectedActive && eventWeekIds[0] !== expectedWeekId)) addIssue(report, "bonus_week_link_ownership", { eventId: event.id, enrollmentId, type, eventWeekIds, expectedWeekId });
        const expectedWas = expectedWeekId ? wasByPair.get(`${enrollmentId}|${expectedWeekId}`) || [] : [];
        if (eventWasIds.length !== 1 || (expectedActive && (expectedWas.length !== 1 || eventWasIds[0] !== expectedWas[0].id))) addIssue(report, "bonus_was_link_ownership", { eventId: event.id, enrollmentId, type, eventWasIds, expectedWasIds: expectedWas.map((row) => row.id) });
        if (meetingIds.length === 1 && (!canonical || meetingIds[0] !== canonical.id)) addIssue(report, "bonus_wrong_canonical_meeting", { eventId: event.id, enrollmentId, type, meetingIds, expectedMeetingId: canonical?.id || "" });
        if (expectedPoints !== null && numberValue(event, xpTable, CONFIG.xp.points) !== expectedPoints) addIssue(report, "bonus_wrong_points_or_rule", { eventId: event.id, enrollmentId, type, expectedPoints, actualPoints: numberValue(event, xpTable, CONFIG.xp.points) });
        if (expectedSource && text(event, xpTable, CONFIG.xp.source) !== expectedSource) addIssue(report, "bonus_wrong_source_or_rule", { eventId: event.id, enrollmentId, type, expectedSource, actualSource: text(event, xpTable, CONFIG.xp.source) });
        if (text(event, xpTable, CONFIG.xp.bucket) !== "Zoom Attendance") addIssue(report, "bonus_wrong_source_or_bucket", { eventId: event.id, enrollmentId, type, bucket: text(event, xpTable, CONFIG.xp.bucket) });
      }
    }
  }

  for (const meeting of zoomQuery.records) {
    const attendeeIds = ids(meeting, zoomTable, CONFIG.zoom.attendees);
    const weekIds = ids(meeting, zoomTable, CONFIG.zoom.week);
    const meetingKey = text(meeting, zoomTable, CONFIG.zoom.key);
    const completed = text(meeting, zoomTable, CONFIG.zoom.status).toLowerCase() === "completed";
    const eventRows = xpByMeeting.get(meeting.id) || [];

    if (attendeeIds.length === 0) addIssue(report, "missing_enrollment_links", { meetingId: meeting.id, attendeeIds });
    if (weekIds.length !== 1) addIssue(report, "wrong_or_multiple_week_links", { meetingId: meeting.id, weekIds });
    if (!meetingKey) addIssue(report, "missing_meeting_identity", { meetingId: meeting.id });

    for (const enrollmentId of attendeeIds) {
      const enrollment = enrollments.get(enrollmentId);
      const week = weeks.get(weekIds[0]);
      if (!enrollment) {
        addIssue(report, "participant_identity_ambiguity", { meetingId: meeting.id, enrollmentId });
        continue;
      }
      if (!booleanish(enrollment, enrollmentTable, CONFIG.enrollment.active)) {
        addIssue(report, "inactive_enrollment", { meetingId: meeting.id, enrollmentId });
      }
      const enrollmentPi = ids(enrollment, enrollmentTable, CONFIG.enrollment.programInstance);
      const weekPi = week ? ids(week, weekTable, CONFIG.week.programInstance) : [];
      const enrollmentYear = text(enrollment, enrollmentTable, CONFIG.enrollment.schoolYear);
      const weekYear = week ? text(week, weekTable, CONFIG.week.schoolYear) : "";
      const scopeEligible =
        completed &&
        booleanish(enrollment, enrollmentTable, CONFIG.enrollment.active) &&
        enrollmentPi.length === 1 &&
        weekPi.length === 1 &&
        enrollmentPi[0] === weekPi[0] &&
        enrollmentYear &&
        weekYear &&
        enrollmentYear === weekYear;
      if (enrollmentPi.length !== 1 || weekPi.length !== 1 || enrollmentPi[0] !== weekPi[0]) {
        addIssue(report, "wrong_program_instance", { meetingId: meeting.id, enrollmentId, enrollmentPi, weekPi });
      }
      if (!enrollmentYear || !weekYear || enrollmentYear !== weekYear) {
        addIssue(report, "wrong_school_year", { meetingId: meeting.id, enrollmentId, enrollmentYear, weekYear });
      }

      const baseKey = meetingKey ? `ZOOM_ATTEND_BASE|${meetingKey}|${enrollmentId}` : "";
      const baseEvents = baseKey ? (xpByKey.get(baseKey) || []) : [];
      if (scopeEligible && baseEvents.length === 0) addIssue(report, "eligible_attendance_missing_xp", { meetingId: meeting.id, enrollmentId, sourceKey: baseKey });
      if (baseEvents.length > 1) addIssue(report, "duplicate_canonical_key", { meetingId: meeting.id, enrollmentId, sourceKey: baseKey, xpEventIds: baseEvents.map((event) => event.id) });

      for (const event of baseEvents) {
        const eventEnrollmentIds = ids(event, xpTable, CONFIG.xp.enrollment);
        const eventWeekIds = ids(event, xpTable, CONFIG.xp.week);
        const eventMeetingIds = ids(event, xpTable, CONFIG.xp.meeting);
        const eventWasIds = ids(event, xpTable, CONFIG.xp.was);
        if (!same(eventEnrollmentIds, [enrollmentId])) addIssue(report, "event_enrollment_ownership_gap", { eventId: event.id, meetingId: meeting.id, enrollmentId, eventEnrollmentIds });
        if (!same(eventWeekIds, weekIds)) addIssue(report, "event_week_ownership_gap", { eventId: event.id, meetingId: meeting.id, eventWeekIds, weekIds });
        if (!same(eventMeetingIds, [meeting.id])) addIssue(report, "event_meeting_ownership_gap", { eventId: event.id, meetingId: meeting.id, eventMeetingIds });
        const wasMatches = wasByPair.get(`${enrollmentId}|${weekIds[0]}`) || [];
        if (wasMatches.length === 0) addIssue(report, "zero_canonical_was", { eventId: event.id, enrollmentId, weekId: weekIds[0] });
        if (wasMatches.length > 1) addIssue(report, "multiple_canonical_was", { eventId: event.id, enrollmentId, weekId: weekIds[0], wasIds: wasMatches.map((row) => row.id) });
        if (eventWasIds.length !== 1 || (wasMatches.length === 1 && eventWasIds[0] !== wasMatches[0].id)) {
          addIssue(report, "blank_or_wrong_was_backlink", { eventId: event.id, eventWasIds, expectedWasIds: wasMatches.map((row) => row.id) });
        }
        if (!booleanish(event, xpTable, CONFIG.xp.active) && scopeEligible) addIssue(report, "eligible_inactive_xp", { eventId: event.id, meetingId: meeting.id, enrollmentId });
        if (booleanish(event, xpTable, CONFIG.xp.active) && !scopeEligible) {
          addIssue(report, "ineligible_active_xp", { eventId: event.id, meetingId: meeting.id, enrollmentId });
        }
      }
    }

    for (const event of eventRows) {
      const sourceKey = text(event, xpTable, CONFIG.xp.sourceKey);
      if (!sourceType(sourceKey)) continue;
      if (!ids(event, xpTable, CONFIG.xp.meeting).includes(meeting.id)) {
        addIssue(report, "orphan_zoom_xp_event", { eventId: event.id, meetingId: meeting.id, sourceKey });
      }
      if (!ids(event, xpTable, CONFIG.xp.was).length) addIssue(report, "backlink_gap", { eventId: event.id, field: CONFIG.xp.was });
    }

    if (fieldExists(zoomTable, CONFIG.zoom.needed)) {
      const needed = numberValue(meeting, zoomTable, CONFIG.zoom.needed);
      if (![0, 1].includes(needed)) addIssue(report, "reconciliation_needed_not_numeric", { meetingId: meeting.id, value: needed });
    }
  }

  for (const event of xpQuery.records) {
    const sourceKey = text(event, xpTable, CONFIG.xp.sourceKey);
    if (!sourceType(sourceKey) || sourceType(sourceKey) === "unsupported_recording") continue;
    if (sourceType(sourceKey) !== "base") {
      const enrollmentId = sourceKey.split("|")[1] || "";
      if (!qualifyingByEnrollment.has(enrollmentId)) {
        addIssue(report, "bonus_orphan_or_stolen_event", { eventId: event.id, sourceKey, enrollmentId });
      }
    }
    const meetingIds = ids(event, xpTable, CONFIG.xp.meeting);
    if (meetingIds.length !== 1 || !zooms.has(meetingIds[0])) addIssue(report, "orphan_zoom_xp_event", { eventId: event.id, sourceKey, meetingIds });
  }

  report.counts.zoomMeetings = zoomQuery.records.length;
  report.counts.enrollments = enrollmentQuery.records.length;
  report.counts.weeks = weekQuery.records.length;
  report.counts.xpEvents = xpQuery.records.length;
  report.counts.zoomXpEvents = [...xpByKey.values()].reduce((sum, rows) => sum + rows.length, 0);
  report.counts.unsupportedRecordingXpEvents = report.unsupportedRecordingXpEvents.length;
  report.counts.issueTotal = Object.values(report.issueCounts).reduce((sum, value) => sum + value, 0);

  console.log("===== PKG-034 ZOOM LIVE-ATTENDANCE XP AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

function same(left, right) {
  const a = [...new Set(left || [])].sort();
  const b = [...new Set(right || [])].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

await main();
