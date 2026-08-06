/**
 * Pure Activity Date → Week matching for Automation 005 v4.1+.
 * Mirrors Program Instance scoping used in the Airtable script.
 *
 * Matching path:
 *   Week.Program Instance === submissionProgramInstanceId
 *   AND Active Week? (if present / treated active)
 *   AND Activity Date within Start Date..End Date (inclusive date keys)
 */

/**
 * @typedef {{ id: string, weekName?: string, startKey: string, endKey: string, isActive?: boolean, programInstanceId?: string }} WeekCandidate
 */

/**
 * @param {string} a
 * @param {string} b
 */
export function compareDateKeys(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return String(a).localeCompare(String(b));
}

/**
 * @param {object} args
 * @param {string} args.activityDateKey
 * @param {string} args.submissionProgramInstanceId
 * @param {WeekCandidate[]} args.weeks
 * @returns {{ status: 'match'|'none'|'overlap'|'missing_program_instance', week?: WeekCandidate, candidates: WeekCandidate[], excludedOtherProgramInstanceCount: number }}
 */
export function matchWeekByActivityDateScoped({
  activityDateKey,
  submissionProgramInstanceId,
  weeks,
}) {
  if (!submissionProgramInstanceId) {
    return {
      status: "missing_program_instance",
      candidates: [],
      excludedOtherProgramInstanceCount: 0,
    };
  }

  if (!activityDateKey) {
    return {
      status: "none",
      candidates: [],
      excludedOtherProgramInstanceCount: 0,
    };
  }

  const sameProgramInstance = (weeks || []).filter(
    (item) => item.programInstanceId === submissionProgramInstanceId
  );

  const candidates = sameProgramInstance
    .filter((item) => {
      const isActive = item.isActive !== false;
      return (
        isActive &&
        item.startKey &&
        item.endKey &&
        compareDateKeys(activityDateKey, item.startKey) >= 0 &&
        compareDateKeys(activityDateKey, item.endKey) <= 0
      );
    })
    .slice()
    .sort((a, b) => {
      const startCompare = compareDateKeys(a.startKey, b.startKey);
      if (startCompare !== 0) return startCompare;
      const endCompare = compareDateKeys(a.endKey, b.endKey);
      if (endCompare !== 0) return endCompare;
      return String(a.weekName || "").localeCompare(String(b.weekName || ""));
    });

  const excludedOtherProgramInstanceCount =
    (weeks || []).length - sameProgramInstance.length;

  if (candidates.length === 0) {
    return {
      status: "none",
      candidates,
      excludedOtherProgramInstanceCount,
    };
  }

  if (candidates.length > 1) {
    return {
      status: "overlap",
      candidates,
      excludedOtherProgramInstanceCount,
    };
  }

  return {
    status: "match",
    week: candidates[0],
    candidates,
    excludedOtherProgramInstanceCount,
  };
}

/**
 * Homework-first precedence: HW1 → HW2 → Activity Date scoped fallback.
 * @param {object} args
 * @param {string|null|undefined} args.homework1WeekId
 * @param {string|null|undefined} args.homework2WeekId
 * @param {string} args.activityDateKey
 * @param {string} args.submissionProgramInstanceId
 * @param {WeekCandidate[]} args.weeks
 */
export function resolveWeekHomeworkFirst(args) {
  if (args.homework1WeekId) {
    return {
      sourceUsed: "Homework Name 1",
      weekId: args.homework1WeekId,
      fallback: null,
    };
  }
  if (args.homework2WeekId) {
    return {
      sourceUsed: "Homework Name 2",
      weekId: args.homework2WeekId,
      fallback: null,
    };
  }
  const fallback = matchWeekByActivityDateScoped({
    activityDateKey: args.activityDateKey,
    submissionProgramInstanceId: args.submissionProgramInstanceId,
    weeks: args.weeks,
  });
  return {
    sourceUsed:
      fallback.status === "match" ? "Activity Date Fallback" : "None",
    weekId: fallback.week?.id || null,
    fallback,
  };
}
