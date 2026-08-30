/**
 * Core workflow season calendar + XP/homework policy contracts (2026–2027).
 *
 * Authority: Mike-confirmed product rules (2026-08-30) + live Production Weeks/PHA.
 * Plain Node — shared by offline tests and live audit harnesses.
 */

"use strict";

const { toDateKeyFromText, evaluateHomeworkSubmissionDeadline } = require("../homework-contracts/assignment-identity");

/** Confirmed 2026–2027 challenge calendar (America/Denver date keys). */
const SEASON_2026_2027 = Object.freeze({
  challengeYear: "2026-2027",
  earlyBirdStart: "2027-04-25",
  earlyBirdEnd: "2027-05-01",
  week1Start: "2027-05-02",
  programEnd: "2027-06-30",
  /** Common final homework deadline for all Program Homework Assignments. */
  commonHomeworkDueDate: "2027-06-29",
  earlyBirdCountable: true,
  regularHomeworkWeeks: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]),
  /** Week 9 exists as a countable shooting week but has no homework. */
  week9HasHomework: false,
  /** Early Bird (2) + Weeks 1–8 (16) = 18 active PHA rows (all grade bands share one row). */
  expectedActiveHomeworkAssignmentCount: 18,
  homeworkSlotsPerHomeworkWeek: 2,
});

/**
 * Submission XP Source Key: one XP Event per Count It submission (not per Denver day).
 * Same-day dual Count It submissions → two SUBMISSION_XP events is correct.
 */
const SUBMISSION_XP_POLICY = Object.freeze({
  mode: "once_per_count_it_submission",
  sourceKeyTemplate: "SUBMISSION_XP|{submissionId}",
  sameDayMultipleAllowed: true,
  /** Closed former SC-005 B3 / MRW-I13 open item. */
  decisionId: "MRW-I13-CLOSED-2026-08-30",
});

const HOMEWORK_XP_POLICY = Object.freeze({
  mode: "once_per_homework_completion",
  sourceKeyTemplate: "HOMEWORK_XP|{homeworkCompletionId}",
  identity: "enrollment_plus_pha",
  /** Multiple assets for one homework slot → one Homework Completion. */
  multiAssetOneCompletion: true,
  ownershipField: "Week",
});

function denverDateKeyFromIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // Date-only keys (YYYY-MM-DD or M/D/YYYY) stay calendar-literal.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    return toDateKeyFromText(raw);
  }
  // Datetimes must convert via America/Denver (UTC midnight boundaries ≠ Denver day).
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return toDateKeyFromText(raw);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return y && m && day ? `${y}-${m}-${day}` : "";
}

function isDateInInclusiveRange(dateKey, startKey, endKey) {
  const d = toDateKeyFromText(dateKey);
  const s = toDateKeyFromText(startKey);
  const e = toDateKeyFromText(endKey);
  if (!d || !s || !e) return false;
  return d >= s && d <= e;
}

function evaluateEarlyBirdActivityDate(activityDateKey, policy = SEASON_2026_2027) {
  const key = toDateKeyFromText(activityDateKey);
  const inWindow = isDateInInclusiveRange(key, policy.earlyBirdStart, policy.earlyBirdEnd);
  return {
    activityDateKey: key,
    inEarlyBirdWindow: inWindow,
    countable: inWindow && policy.earlyBirdCountable === true,
    note: inWindow
      ? "Activity Date falls in Early Bird window (countable)."
      : "Activity Date outside Early Bird window.",
  };
}

function evaluateHomeworkWeekOwnership({ weekLabel = "", activePhaCountForWeek = 0 } = {}, policy = SEASON_2026_2027) {
  const label = String(weekLabel || "").trim();
  const isWeek9 = /^week\s*9$/i.test(label);
  const isEarlyBird = /^early\s*bird$/i.test(label);
  const weekNumMatch = label.match(/^week\s*(\d+)$/i);
  const weekNum = weekNumMatch ? Number(weekNumMatch[1]) : null;

  if (isWeek9) {
    const ok = activePhaCountForWeek === 0 && policy.week9HasHomework === false;
    return {
      ok,
      weekLabel: label,
      expectHomework: false,
      actualActivePhaCount: activePhaCountForWeek,
      reason: ok
        ? "Week 9 correctly has no active homework."
        : `Week 9 must have 0 active PHA (got ${activePhaCountForWeek}).`,
    };
  }

  if (isEarlyBird || (weekNum != null && policy.regularHomeworkWeeks.includes(weekNum))) {
    const expect = policy.homeworkSlotsPerHomeworkWeek;
    const ok = activePhaCountForWeek === expect;
    return {
      ok,
      weekLabel: label,
      expectHomework: true,
      expectedActivePhaCount: expect,
      actualActivePhaCount: activePhaCountForWeek,
      reason: ok
        ? `${label} has ${expect} active homework slots.`
        : `${label} expected ${expect} active PHA, got ${activePhaCountForWeek}.`,
    };
  }

  return {
    ok: activePhaCountForWeek === 0,
    weekLabel: label,
    expectHomework: false,
    actualActivePhaCount: activePhaCountForWeek,
    reason: "Non-homework week; active PHA should be 0.",
  };
}

/**
 * @param {Array<{ id: string, weekName?: string, active?: boolean, dueDate?: string, slot?: string }>} rows
 */
function auditProgramHomeworkSchedule(rows, policy = SEASON_2026_2027) {
  const findings = [];
  const active = (rows || []).filter((r) => r.active !== false && r.active !== 0 && r.active !== "0");
  const byWeek = new Map();

  for (const row of active) {
    const week = String(row.weekName || "").trim() || "(missing-week)";
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(row);

    const due = toDateKeyFromText(row.dueDate);
    if (due !== policy.commonHomeworkDueDate) {
      findings.push({
        severity: "P0",
        code: "pha_due_date_mismatch",
        recordId: row.id,
        message: `PHA ${row.id} Due Date ${due || "(empty)"} != ${policy.commonHomeworkDueDate}`,
        fixOwner: "airtable",
      });
    }
  }

  if (active.length !== policy.expectedActiveHomeworkAssignmentCount) {
    findings.push({
      severity: "P0",
      code: "active_pha_count",
      message: `Active PHA count ${active.length} != expected ${policy.expectedActiveHomeworkAssignmentCount}`,
      fixOwner: "airtable",
    });
  }

  const week9 = evaluateHomeworkWeekOwnership(
    {
      weekLabel: "Week 9",
      activePhaCountForWeek: (byWeek.get("Week 9") || []).length,
    },
    policy
  );
  if (!week9.ok) {
    findings.push({
      severity: "P0",
      code: "week9_has_homework",
      message: week9.reason,
      fixOwner: "airtable",
    });
  }

  for (const label of ["Early Bird", ...policy.regularHomeworkWeeks.map((n) => `Week ${n}`)]) {
    const owned = evaluateHomeworkWeekOwnership(
      {
        weekLabel: label,
        activePhaCountForWeek: (byWeek.get(label) || []).length,
      },
      policy
    );
    if (!owned.ok) {
      findings.push({
        severity: "P1",
        code: "homework_week_slot_count",
        message: owned.reason,
        fixOwner: "airtable",
      });
    }
  }

  return {
    ok: findings.length === 0,
    activeCount: active.length,
    expectedActiveCount: policy.expectedActiveHomeworkAssignmentCount,
    byWeek: Object.fromEntries([...byWeek.entries()].map(([k, v]) => [k, v.length])),
    findings,
    policy,
  };
}

function evaluateSubmissionXpPolicy(xpEventsForSubmissions) {
  const events = xpEventsForSubmissions || [];
  const bySubmission = new Map();
  const duplicates = [];

  for (const ev of events) {
    const key = String(ev.sourceKey || "");
    const m = key.match(/^SUBMISSION_XP\|(rec[A-Za-z0-9]{14})$/);
    if (!m) continue;
    if (ev.active === false) continue;
    const sid = m[1];
    if (!bySubmission.has(sid)) bySubmission.set(sid, []);
    bySubmission.get(sid).push(ev);
  }

  for (const [sid, list] of bySubmission.entries()) {
    if (list.length > 1) {
      duplicates.push({ submissionId: sid, count: list.length });
    }
  }

  const sameDayGroups = new Map();
  for (const ev of events) {
    if (ev.active === false) continue;
    if (!String(ev.sourceKey || "").startsWith("SUBMISSION_XP|")) continue;
    const day = toDateKeyFromText(ev.activityDate) || "(unknown)";
    if (!sameDayGroups.has(day)) sameDayGroups.set(day, []);
    sameDayGroups.get(day).push(ev);
  }

  const multiSameDay = [...sameDayGroups.entries()].filter(([, list]) => list.length > 1);

  return {
    ok: duplicates.length === 0,
    mode: SUBMISSION_XP_POLICY.mode,
    uniqueSubmissionXpCount: bySubmission.size,
    duplicateSubmissionKeys: duplicates,
    sameDayMultiXpDays: multiSameDay.map(([day, list]) => ({ day, count: list.length })),
    sameDayMultipleAllowed: SUBMISSION_XP_POLICY.sameDayMultipleAllowed,
    note:
      duplicates.length > 0
        ? "Duplicate SUBMISSION_XP for same submission id — idempotency defect."
        : multiSameDay.length > 0
          ? "Multiple SUBMISSION_XP on same Denver day — EXPECTED (once per Count It submission)."
          : "Submission XP inventory OK.",
    decisionId: SUBMISSION_XP_POLICY.decisionId,
  };
}

function evaluateLateWeekOnTimeDeadline({
  submissionDateKey,
  weekEndDate,
  phaDueDate = SEASON_2026_2027.commonHomeworkDueDate,
} = {}) {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey,
    phaDueDate,
    weekEndDate,
  });
  const afterWeek =
    toDateKeyFromText(submissionDateKey) &&
    toDateKeyFromText(weekEndDate) &&
    toDateKeyFromText(submissionDateKey) > toDateKeyFromText(weekEndDate);
  return {
    ...result,
    afterLinkedWeekEnd: Boolean(afterWeek),
    expectedCreditWhenBeforeCommonDue: afterWeek && result.creditEligible === true,
  };
}

function auditOperationalWeeksCalendar(weeks, policy = SEASON_2026_2027) {
  const findings = [];
  const byName = new Map();
  for (const w of weeks || []) {
    byName.set(String(w.weekName || "").trim(), w);
  }

  const early = byName.get("Early Bird");
  if (!early) {
    findings.push({
      severity: "P0",
      code: "missing_early_bird",
      message: "Early Bird week missing",
      fixOwner: "airtable",
    });
  } else {
    const start = denverDateKeyFromIso(early.startDate);
    const end = denverDateKeyFromIso(early.endDate);
    if (start !== policy.earlyBirdStart || end !== policy.earlyBirdEnd) {
      findings.push({
        severity: "P0",
        code: "early_bird_dates",
        message: `Early Bird ${start}..${end} != ${policy.earlyBirdStart}..${policy.earlyBirdEnd}`,
        fixOwner: "airtable",
      });
    }
    if (early.countsTowardChallenge === false) {
      findings.push({
        severity: "P0",
        code: "early_bird_not_countable",
        message: "Early Bird Counts Toward Challenge? is false",
        fixOwner: "airtable",
      });
    }
  }

  const week1 = byName.get("Week 1");
  if (!week1) {
    findings.push({
      severity: "P0",
      code: "missing_week_1",
      message: "Week 1 missing",
      fixOwner: "airtable",
    });
  } else {
    const start = denverDateKeyFromIso(week1.startDate);
    if (start !== policy.week1Start) {
      findings.push({
        severity: "P0",
        code: "week_1_start",
        message: `Week 1 start ${start} != ${policy.week1Start}`,
        fixOwner: "airtable",
      });
    }
  }

  if (!byName.get("Week 9")) {
    findings.push({
      severity: "P1",
      code: "missing_week_9",
      message: "Week 9 missing (shooting week without homework)",
      fixOwner: "airtable",
    });
  }

  return { ok: findings.length === 0, findings, policy };
}

module.exports = {
  SEASON_2026_2027,
  SUBMISSION_XP_POLICY,
  HOMEWORK_XP_POLICY,
  denverDateKeyFromIso,
  isDateInInclusiveRange,
  evaluateEarlyBirdActivityDate,
  evaluateHomeworkWeekOwnership,
  auditProgramHomeworkSchedule,
  evaluateSubmissionXpPolicy,
  evaluateLateWeekOnTimeDeadline,
  auditOperationalWeeksCalendar,
};
