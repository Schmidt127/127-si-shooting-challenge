/**
 * PKG-034 Zoom live-attendance lifecycle contracts.
 *
 * Pure helpers only. No Airtable I/O. Automation 101 remains the sole
 * live-attendance XP writer; recording XP is intentionally outside this module.
 */

const LIVE_PREFIX = "ZOOM_ATTEND_BASE";
const BONUS_2_PREFIX = "ZOOM_ATTEND_BONUS_2";
const BONUS_3_PREFIX = "ZOOM_ATTEND_BONUS_3";
const XP_BUCKET = "Zoom Attendance";
const AUTOMATION_OWNER = "Airtable Automation 101";

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function uniqueIds(values) {
  return [...new Set((values || []).map(clean).filter(Boolean))];
}

function exactOne(values, label) {
  const ids = uniqueIds(values);
  if (ids.length !== 1) {
    return {
      ok: false,
      ids,
      error: `${label} must contain exactly one linked record; found ${ids.length}.`,
    };
  }
  return { ok: true, ids, id: ids[0] };
}

function sameSet(left, right) {
  const a = uniqueIds(left).sort();
  const b = uniqueIds(right).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function buildLiveSourceKey(meetingKey, enrollmentId) {
  return `${LIVE_PREFIX}|${clean(meetingKey)}|${clean(enrollmentId)}`;
}

function buildBonus2SourceKey(enrollmentId) {
  return `${BONUS_2_PREFIX}|${clean(enrollmentId)}`;
}

function buildBonus3SourceKey(enrollmentId) {
  return `${BONUS_3_PREFIX}|${clean(enrollmentId)}`;
}

function cumulativeBonusState(qualifyingMeetingCount) {
  const count = Number(qualifyingMeetingCount) || 0;
  return {
    count,
    bonus2Active: count >= 2,
    bonus3Active: count >= 3,
  };
}

function selectCanonicalBonusMeeting(meetings, threshold) {
  const ordered = [...(meetings || [])]
    .filter((meeting) => meeting && meeting.qualifies)
    .sort((left, right) =>
      clean(left.dateKey).localeCompare(clean(right.dateKey)) ||
      clean(left.meetingKey).localeCompare(clean(right.meetingKey)) ||
      clean(left.id).localeCompare(clean(right.id))
    );
  return ordered[Number(threshold) - 1] || null;
}

function planCumulativeBonus({
  threshold,
  qualifyingMeetings,
  existingEvent,
}) {
  const state = cumulativeBonusState(qualifyingMeetings?.length || 0);
  const supported = state.count >= Number(threshold);
  if (!supported) {
    return existingEvent?.active
      ? { action: "deactivate_same_event", supported: false, eventId: existingEvent.id }
      : { action: "already_inactive", supported: false, eventId: existingEvent?.id || "" };
  }
  const canonicalMeeting = selectCanonicalBonusMeeting(qualifyingMeetings, threshold);
  if (!canonicalMeeting) {
    return { action: "error_missing_canonical_meeting", supported: true, ok: false };
  }
  return existingEvent
    ? {
      action: existingEvent.active ? "repair_same_event" : "reactivate_same_event",
      supported: true,
      eventId: existingEvent.id,
      canonicalMeetingId: canonicalMeeting.id,
    }
    : {
      action: "create_after_last_chance_recheck",
      supported: true,
      canonicalMeetingId: canonicalMeeting.id,
    };
}

function planEmptyRosterReconciliation({
  priorOwnedEvents = [],
  duplicate = false,
  wrongOwner = false,
  freshSignature,
  startingSignature,
  needed,
}) {
  if (duplicate || wrongOwner) {
    return { ok: false, action: "error_duplicate_or_wrong_owner" };
  }
  const active = priorOwnedEvents.filter((event) => event.active);
  const settled = settleSignature({
    currentSignature: freshSignature,
    startingSignature,
    freshSignature,
    needed,
  });
  if (!settled.ok) return { ok: false, action: "pending_formula_settlement" };
  return {
    ok: true,
    action: active.length ? "deactivated_empty_roster_events" : "reconciled_empty_roster_no_award",
    eventIds: priorOwnedEvents.map((event) => event.id),
    signature: settled.signature,
  };
}

function parseLiveSourceKey(sourceKey) {
  const parts = clean(sourceKey).split("|");
  if (parts.length !== 3 || parts[0] !== LIVE_PREFIX || !parts[1] || !parts[2]) {
    return null;
  }
  return { meetingKey: parts[1], enrollmentId: parts[2] };
}

function isLiveSourceKey(sourceKey) {
  return Boolean(parseLiveSourceKey(sourceKey));
}

function validateMeetingContext({
  meetingId,
  meetingKey,
  attendeeIds,
  weekIds,
  meetingStatus,
  completedStatus = "Completed",
}) {
  const meeting = clean(meetingId);
  const key = clean(meetingKey);
  const attendees = uniqueIds(attendeeIds);
  const week = exactOne(weekIds, "Zoom Meeting Week");
  const errors = [];

  if (!meeting || !meeting.startsWith("rec")) errors.push("Zoom Meeting record ID is missing or invalid.");
  if (!key) errors.push("Zoom Meeting Key is blank.");
  if (clean(meetingStatus).toLowerCase() !== clean(completedStatus).toLowerCase()) {
    errors.push(`Meeting Status must be "${completedStatus}".`);
  }
  if (attendees.length === 0) errors.push("Zoom Meeting Attendees must contain at least one linked Enrollment.");
  if (!week.ok) errors.push(week.error);

  return {
    ok: errors.length === 0,
    meetingId: meeting,
    meetingKey: key,
    attendeeIds: attendees,
    weekId: week.id || "",
    errors,
  };
}

function validateEnrollmentContext({
  enrollmentId,
  active,
  programInstanceIds,
  schoolYear,
}) {
  const enrollment = clean(enrollmentId);
  const pi = exactOne(programInstanceIds, "Enrollment Program Instance");
  const year = clean(schoolYear);
  const errors = [];

  if (!enrollment || !enrollment.startsWith("rec")) errors.push("Enrollment ID is missing or invalid.");
  if (!active) errors.push("Enrollment is inactive.");
  if (!pi.ok) errors.push(pi.error);
  if (!year) errors.push("Enrollment School Year is blank.");

  return {
    ok: errors.length === 0,
    enrollmentId: enrollment,
    programInstanceId: pi.id || "",
    schoolYear: year,
    errors,
  };
}

function validateWeekContext({
  weekId,
  programInstanceIds,
  schoolYear,
}) {
  const week = clean(weekId);
  const pi = exactOne(programInstanceIds, "Week Program Instance");
  const year = clean(schoolYear);
  const errors = [];

  if (!week || !week.startsWith("rec")) errors.push("Week ID is missing or invalid.");
  if (!pi.ok) errors.push(pi.error);
  if (!year) errors.push("Week School Year is blank.");

  return {
    ok: errors.length === 0,
    weekId: week,
    programInstanceId: pi.id || "",
    schoolYear: year,
    errors,
  };
}

function validateProgramScope(enrollment, week) {
  const errors = [];
  if (!sameSet([enrollment.programInstanceId], [week.programInstanceId])) {
    errors.push("Enrollment and Week Program Instance do not match.");
  }
  if (clean(enrollment.schoolYear) !== clean(week.schoolYear)) {
    errors.push("Enrollment and Week School Year do not match.");
  }
  return { ok: errors.length === 0, errors };
}

function classifyOwnedEvents(events, expected) {
  const matching = (events || []).filter((event) => {
    const keyMatches = clean(event.sourceKey).toUpperCase() === clean(expected.sourceKey).toUpperCase();
    const enrollmentMatches = sameSet(event.enrollmentIds, [expected.enrollmentId]);
    const meetingMatches = sameSet(event.zoomMeetingIds, [expected.meetingId]);
    const weekMatches = sameSet(event.weekIds, [expected.weekId]);
    return keyMatches && enrollmentMatches && meetingMatches && weekMatches;
  });

  const wrongOwner = (events || []).filter((event) => {
    const keyMatches = clean(event.sourceKey).toUpperCase() === clean(expected.sourceKey).toUpperCase();
    return keyMatches && !matching.includes(event);
  });

  return {
    matching,
    wrongOwner,
    duplicate: matching.length > 1,
    event: matching.length === 1 ? matching[0] : null,
  };
}

function planAward({
  eligible,
  expected,
  events,
  weeklySummaryIds,
}) {
  const owned = classifyOwnedEvents(events, expected);
  const was = exactOne(weeklySummaryIds, "Weekly Athlete Summary");

  if (owned.wrongOwner.length > 0) {
    return { action: "error_wrong_owner", ok: false, owned };
  }
  if (owned.duplicate) {
    return { action: "error_duplicate_canonical_event", ok: false, owned };
  }
  if (!eligible) {
    return owned.event
      ? { action: owned.event.active ? "deactivate_same_event" : "already_inactive", ok: true, eventId: owned.event.id, owned }
      : { action: "skip_ineligible_no_owned_event", ok: true, owned };
  }
  if (!was.ok) {
    return { action: "error_weekly_summary_ambiguity", ok: false, owned, was };
  }
  if (owned.event) {
    return {
      action: owned.event.active ? "repair_or_replay_same_event" : "reactivate_same_event",
      ok: true,
      eventId: owned.event.id,
      weeklySummaryId: was.id,
      owned,
    };
  }
  return {
    action: "create_after_last_chance_recheck",
    ok: true,
    weeklySummaryId: was.id,
    owned,
  };
}

function lastChanceCreateDecision(events, expected) {
  const owned = classifyOwnedEvents(events, expected);
  if (owned.wrongOwner.length || owned.duplicate) {
    return { ok: false, action: "error_concurrent_or_wrong_owner", owned };
  }
  if (owned.event) {
    return { ok: true, action: "reuse_existing_same_event", eventId: owned.event.id, owned };
  }
  return { ok: true, action: "safe_to_create", owned };
}

function writebackResult({ eventWrite, wasWrite, meetingWrite }) {
  const failed = [eventWrite, wasWrite, meetingWrite].filter((result) => result && result.ok === false);
  return {
    ok: failed.length === 0,
    warning: failed.length
      ? `Partial writeback: ${failed.map((result) => result.label || "write").join(", ")} failed.`
      : "",
  };
}

function settleSignature({ currentSignature, startingSignature, freshSignature, needed }) {
  if (!freshSignature) {
    return { ok: false, acknowledged: false, error: "Fresh post-write signature is blank." };
  }
  if (currentSignature !== freshSignature || Number(needed) !== 0) {
    return { ok: false, acknowledged: false, error: "Reconciliation Needed? did not return to numeric 0." };
  }
  return { ok: true, acknowledged: true, signature: freshSignature };
}

module.exports = {
  LIVE_PREFIX,
  BONUS_2_PREFIX,
  BONUS_3_PREFIX,
  XP_BUCKET,
  AUTOMATION_OWNER,
  uniqueIds,
  exactOne,
  sameSet,
  buildLiveSourceKey,
  buildBonus2SourceKey,
  buildBonus3SourceKey,
  cumulativeBonusState,
  selectCanonicalBonusMeeting,
  planCumulativeBonus,
  planEmptyRosterReconciliation,
  parseLiveSourceKey,
  isLiveSourceKey,
  validateMeetingContext,
  validateEnrollmentContext,
  validateWeekContext,
  validateProgramScope,
  classifyOwnedEvents,
  planAward,
  lastChanceCreateDecision,
  writebackResult,
  settleSignature,
};
