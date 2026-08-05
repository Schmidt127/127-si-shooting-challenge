/**
 * Perfect Week fixture evaluation helpers (read-only).
 * Used by verify_perfect_week_fixtures.mjs and offline tests.
 */
"use strict";

const STATUSES = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "BLOCKED",
});

function truthy(value) {
  return value === true || value === 1 || value === "1";
}

function linkIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v && v.id))
      .filter(Boolean);
  }
  if (typeof value === "object" && value.id) return [value.id];
  return [];
}

function field(record, name) {
  if (!record) return undefined;
  if (record.fields && Object.prototype.hasOwnProperty.call(record.fields, name)) {
    return record.fields[name];
  }
  return record[name];
}

function asNumber(value) {
  if (typeof value === "number") return value;
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildPerfectWeekSourceKey(enrollmentId, weekId) {
  return `PERFECT_WEEK|${enrollmentId}|${weekId}`;
}

/**
 * Denver calendar date key from ISO / Date / date-only string.
 * Mirrors 057 getDateKeyFromDateOnly for offline boundary tests.
 */
function getDateKeyAmericaDenver(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = String(value).trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const localMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (localMatch) {
      return `${localMatch[3]}-${localMatch[1].padStart(2, "0")}-${localMatch[2].padStart(2, "0")}`;
    }
  }
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey, daysToAdd) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function buildRequiredWeekDates(startDateKey, count = 7) {
  const dates = [];
  for (let i = 0; i < count; i += 1) {
    dates.push(addDaysToDateKey(startDateKey, i));
  }
  return dates;
}

function dailyMinimumFromGoal(weeklyGoal, requiredDailyCount = 7) {
  return Math.ceil(Number(weeklyGoal) / requiredDailyCount);
}

/**
 * Aggregate shots by Denver date key for countable submissions only.
 */
function aggregateCountableShotsByDate(submissions, { requiredDateSet } = {}) {
  const dayMap = new Map();
  let ignored = 0;
  let outside = 0;
  for (const sub of submissions || []) {
    const countable = truthy(field(sub, "Perfect Week Countable Submission?"));
    if (!countable) {
      ignored += 1;
      continue;
    }
    const dateKey = getDateKeyAmericaDenver(field(sub, "Activity Date"));
    if (!dateKey) {
      ignored += 1;
      continue;
    }
    if (requiredDateSet && !requiredDateSet.has(dateKey)) {
      outside += 1;
      continue;
    }
    const shots = asNumber(field(sub, "Total Shots Counted")) || 0;
    dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + shots);
  }
  return { dayMap, ignored, outside };
}

function evaluateDailyRequirement({
  weekStartDateKey,
  submissions,
  weeklyGoal,
  requiredDailyCount = 7,
}) {
  const requiredDates = buildRequiredWeekDates(weekStartDateKey, requiredDailyCount);
  const requiredDateSet = new Set(requiredDates);
  const dailyMinimum = dailyMinimumFromGoal(weeklyGoal, requiredDailyCount);
  const { dayMap, ignored, outside } = aggregateCountableShotsByDate(submissions, {
    requiredDateSet,
  });
  const missingDays = [];
  const failingDays = [];
  const passingDays = [];
  for (const dateKey of requiredDates) {
    const shots = dayMap.get(dateKey) || 0;
    if (shots <= 0) missingDays.push(dateKey);
    else if (shots < dailyMinimum) failingDays.push(`${dateKey}:${shots}/${dailyMinimum}`);
    else passingDays.push(dateKey);
  }
  return {
    dailyMet: missingDays.length === 0 && failingDays.length === 0,
    daysLoggedDistinct: passingDays.length + failingDays.length,
    missingDays,
    failingDays,
    passingDays,
    dailyMinimum,
    ignored,
    outside,
    requiredDates,
  };
}

function makeResult(caseId, status, reason, details = {}) {
  return { caseId, status, reason, ...details };
}

/**
 * Evaluate one fixture case from already-fetched records (no network).
 *
 * @param {object} caseSpec - manifest case entry
 * @param {object} actual - { was, xpEvents[], unlocks[], submissions? }
 */
function evaluatePerfectWeekCase(caseId, caseSpec, actual = {}) {
  if (!caseSpec) {
    return makeResult(caseId, STATUSES.BLOCKED, "Case missing from manifest");
  }

  if (caseId === "CASE-16") {
    return evaluateTimezoneCase(caseSpec, actual);
  }

  if (caseSpec.batch === "B" && caseSpec.calendarComplete === false) {
    return makeResult(caseId, STATUSES.BLOCKED, "calendar_incomplete — Batch B day-by-day creates not finished");
  }

  const was = actual.was;
  if (!caseSpec.wasId && !was) {
    return makeResult(caseId, STATUSES.BLOCKED, "WAS id not in manifest — Omni create pending");
  }
  if (!was) {
    return makeResult(caseId, STATUSES.BLOCKED, "WAS record not loaded", {
      wasId: caseSpec.wasId,
    });
  }

  const enrollmentId = caseSpec.enrollmentId || linkIds(field(was, "Enrollment"))[0];
  const weekId = caseSpec.weekId || linkIds(field(was, "Week"))[0];
  const dailyMet = truthy(field(was, "Perfect Week Daily Requirement Met?"));
  const videoCount = asNumber(field(was, "Perfect Week Video Count"));
  const videoMet = asNumber(field(was, "Perfect Week Video Requirement Met?"));
  const zoomMeetings = asNumber(field(was, "Perfect Week Zoom Meeting Count"));
  const zoomAttendance = asNumber(field(was, "Perfect Week Zoom Attendance Count"));
  const zoomMet = asNumber(field(was, "Perfect Week Zoom Requirement Met?"));
  const eligible = asNumber(field(was, "Perfect Week Eligible?"));
  const daysLogged = asNumber(field(was, "Days Logged This Week"));
  const automationStatus = String(field(was, "Perfect Week Automation Status") || "");
  const testOverride = truthy(field(was, "Perfect Week Test Override?"));
  const unlockIds = linkIds(field(was, "Perfect Week Unlock"));
  const xpEvents = actual.xpEvents || [];
  const sourceKey = buildPerfectWeekSourceKey(enrollmentId, weekId);
  const matchingXp = xpEvents.filter((ev) => {
    const key = field(ev, "Source Key") || field(ev, "XP Dedupe Key");
    return key === sourceKey;
  });

  const failures = [];
  const expectAward = caseSpec.expectAward === true;

  if (testOverride) {
    return makeResult(
      caseId,
      STATUSES.FAIL,
      "test_override_must_not_be_used — Perfect Week Test Override? does not bypass same-day/countable and must stay unchecked",
      { testOverride: true }
    );
  }

  if (automationStatus && automationStatus !== "Ready" && automationStatus !== "Error") {
    // Pending/Needs Review may mean not run yet
  }
  if (!automationStatus || automationStatus === "Pending") {
    return makeResult(caseId, STATUSES.BLOCKED, "Perfect Week Automation Status not Ready yet", {
      automationStatus,
    });
  }

  if (caseSpec.expectedDaysLogged != null && daysLogged != null) {
    if (daysLogged !== caseSpec.expectedDaysLogged) {
      failures.push(`Days Logged ${daysLogged} !== ${caseSpec.expectedDaysLogged}`);
    }
  }

  if (caseSpec.expectedVideoCount != null && videoCount != null) {
    if (videoCount !== caseSpec.expectedVideoCount) {
      failures.push(`Video Count ${videoCount} !== ${caseSpec.expectedVideoCount}`);
    }
  }

  if (caseId === "CASE-07" && actual.submissions?.length) {
    for (const sub of actual.submissions) {
      if (truthy(field(sub, "Perfect Week Countable Submission?"))) {
        failures.push("CASE-07 submission unexpectedly Perfect Week Countable");
      }
      if (truthy(field(sub, "Submitted Same Day?"))) {
        failures.push("CASE-07 submission unexpectedly Submitted Same Day");
      }
    }
  }

  if (caseId === "CASE-02" && dailyMet) {
    failures.push("Daily Met should be false when all shots are on one day");
  }
  if (caseId === "CASE-03" && dailyMet) {
    failures.push("Daily Met should be false with only six days");
  }
  if ((caseId === "CASE-08" || caseId === "CASE-09") && videoMet === 1) {
    failures.push("Video Met should be 0");
  }
  if (caseId === "CASE-12" && zoomMet === 1) {
    failures.push("Zoom Met should be 0 when meeting exists without attendance");
  }
  if (caseId === "CASE-13" && zoomMet === 1) {
    failures.push("Zoom Met should be 0 when only other Enrollment attended");
  }
  if (caseId === "CASE-14" && daysLogged != null && daysLogged > 7) {
    failures.push(`Days Logged inflated to ${daysLogged}`);
  }

  if (caseId === "CASE-05" && actual.wasSubmissionIds && caseSpec.submissionBIds?.length) {
    const leaked = caseSpec.submissionBIds.filter((id) =>
      actual.wasSubmissionIds.includes(id)
    );
    if (leaked.length) failures.push(`Enrollment B submissions linked on WAS: ${leaked.join(",")}`);
  }

  if (caseId === "CASE-04" && actual.contaminationCounted === true) {
    failures.push("Adjacent-week contamination submissions were counted toward daily Met");
  }

  if (expectAward) {
    if (!dailyMet) failures.push("Daily Met expected true");
    if (videoMet !== 1 && videoMet !== true) failures.push("Video Met expected 1");
    if (zoomMet !== 1 && zoomMet !== true) failures.push("Zoom Met expected 1");
    if (eligible !== 1 && eligible !== true) failures.push("Eligible expected 1");
    if (unlockIds.length !== 1) failures.push(`Unlock count ${unlockIds.length} !== 1`);
    if (matchingXp.length !== 1) {
      failures.push(`PERFECT_WEEK XP count ${matchingXp.length} !== 1 (key ${sourceKey})`);
    } else {
      const pts = asNumber(field(matchingXp[0], "XP Points"));
      if (pts != null && pts !== 100) failures.push(`XP Points ${pts} !== 100`);
    }
  } else {
    if (eligible === 1 || eligible === true) {
      if (caseSpec.defectIfAwards) {
        return makeResult(
          caseId,
          STATUSES.FAIL,
          "DEFECT: mismatched Week submission counted and week awarded",
          { eligible, unlockIds, matchingXp: matchingXp.length }
        );
      }
      failures.push("Eligible should be 0");
    }
    if (matchingXp.length !== 0) {
      failures.push(`Expected 0 PERFECT_WEEK XP, found ${matchingXp.length}`);
    }
    if (caseId !== "CASE-06" && unlockIds.length !== 0 && !expectAward) {
      failures.push(`Expected 0 Unlock, found ${unlockIds.length}`);
    }
  }

  if (caseId === "CASE-15" && matchingXp.length > 1) {
    failures.push(`Idempotency broken: ${matchingXp.length} XP events`);
  }

  if (failures.length) {
    return makeResult(caseId, STATUSES.FAIL, failures.join("; "), {
      dailyMet,
      videoCount,
      videoMet,
      zoomMeetings,
      zoomAttendance,
      zoomMet,
      eligible,
      daysLogged,
      unlockCount: unlockIds.length,
      xpCount: matchingXp.length,
      sourceKey,
    });
  }

  return makeResult(caseId, STATUSES.PASS, expectAward ? "Award path matches" : "No-award path matches", {
    dailyMet,
    videoCount,
    videoMet,
    zoomMeetings,
    zoomAttendance,
    zoomMet,
    eligible,
    daysLogged,
    unlockCount: unlockIds.length,
    xpCount: matchingXp.length,
    sourceKey,
  });
}

function evaluateTimezoneCase(caseSpec, actual) {
  const sat = actual.saturdayLateSubmission;
  const sun = actual.sundayEarlySubmission;
  if (!sat || !sun) {
    return makeResult("CASE-16", STATUSES.BLOCKED, "Boundary submissions not loaded / missing from manifest");
  }
  const satKey = getDateKeyAmericaDenver(
    field(sat, "Activity Date") || field(sat, "Submitted At")
  );
  const sunKey = getDateKeyAmericaDenver(
    field(sun, "Activity Date") || field(sun, "Submitted At")
  );
  const failures = [];
  if (satKey !== "2026-08-08") failures.push(`Saturday late keyed as ${satKey}, want 2026-08-08`);
  if (sunKey !== "2026-08-09") failures.push(`Sunday early keyed as ${sunKey}, want 2026-08-09`);

  const endingWeekId = caseSpec.endingWeekId;
  const newWeekId = caseSpec.newWeekId;
  if (endingWeekId && newWeekId) {
    const satWeek = linkIds(field(sat, "Week"))[0];
    const sunWeek = linkIds(field(sun, "Week"))[0];
    if (satWeek && satWeek !== endingWeekId) failures.push("Saturday submission linked to wrong Week");
    if (sunWeek && sunWeek !== newWeekId) failures.push("Sunday submission linked to wrong Week");
  }

  if (failures.length) {
    return makeResult("CASE-16", STATUSES.FAIL, failures.join("; "), { satKey, sunKey });
  }
  return makeResult("CASE-16", STATUSES.PASS, "Denver boundary keys correct", { satKey, sunKey });
}

module.exports = {
  STATUSES,
  truthy,
  linkIds,
  field,
  asNumber,
  buildPerfectWeekSourceKey,
  getDateKeyAmericaDenver,
  addDaysToDateKey,
  buildRequiredWeekDates,
  dailyMinimumFromGoal,
  aggregateCountableShotsByDate,
  evaluateDailyRequirement,
  evaluatePerfectWeekCase,
};
