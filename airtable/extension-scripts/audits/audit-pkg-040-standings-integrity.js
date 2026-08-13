/*
PKG-040 Standings and Leaderboard Integrity Audit

Read-only Airtable Scripting Extension audit. It never creates, updates,
deletes, sends, or invokes automations. It evaluates every Enrollment record
and reports full counts plus capped samples.

Scope: Enrollments → active XP Events → Current Level / Level Rank → the
required Web - Leaderboard view contract. Airtable Scripting cannot read view
membership, so that boundary is reported as unobservable rather than guessed.
*/
// @ts-nocheck

const SAMPLE_LIMIT = 25;
const CONFIG = {
  tables: { enrollments: "Enrollments", levels: "Levels", xpEvents: "XP Events" },
  enrollment: {
    active: "Active?", athlete: "Athlete", program: "Program Instance", schoolYear: "School Year",
    currentLevel: "Current Level", levelRank: "Level Sort Order - For Softr",
    levelStatus: "Level Status", lifetimeXp: "Lifetime XP Total", shots: "Total Shots Counted",
    xpEvents: "XP Events", programName: "Program Instance Name Only", fullName: "Full Athlete Name",
    recalc: "Level Recalc Needed?",
  },
  level: { active: "Active?", sortOrder: "Sort Order", name: "Level Name" },
  xp: { active: "Active?", enrollment: "Enrollment", activePoints: "Active XP Points" },
  knownIssueTypes: [
    "missing_required_field", "inactive_enrollment", "missing_athlete_link", "multiple_athlete_links",
    "missing_program_instance", "multiple_program_instances", "missing_school_year", "duplicate_canonical_enrollment",
    "missing_current_level", "multiple_current_levels", "current_level_inactive", "missing_level_rank",
    "duplicate_level_rank", "invalid_level_rank", "lifetime_xp_blank", "lifetime_xp_invalid",
    "lifetime_xp_negative", "lifetime_xp_unsettled", "counted_shots_blank", "counted_shots_invalid",
    "counted_shots_negative", "counted_shots_unsettled", "inactive_xp_event_linked", "lifetime_xp_mismatch",
    "progression_recalc_pending", "level_xp_inconsistency", "test_athlete_name_match",
    "view_membership_unobservable", "formula_timing_limitation", "public_view_contract",
  ],
};

function fieldExists(table, name) {
  try { table.getField(name); return true; } catch { return false; }
}
function raw(record, field) { return record ? record.getCellValue(field) : null; }
function text(record, field) { return record ? String(record.getCellValueAsString(field) || "").trim() : ""; }
function linkedIds(record, field) {
  const value = raw(record, field);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}
function bool(record, field) {
  const value = raw(record, field);
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}
function numericState(record, field) {
  const value = raw(record, field);
  if (value === null || value === undefined || value === "") return { kind: "blank", value: null };
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? { kind: "number", value: parsed } : { kind: "invalid", value: null };
}
function addIssue(report, type, severity, row) {
  if (!Object.prototype.hasOwnProperty.call(report.issueCounts, type)) report.issueCounts[type] = 0;
  if (!Array.isArray(report.samples[type])) report.samples[type] = [];
  report.issueCounts[type] += 1;
  if (report.samples[type].length < SAMPLE_LIMIT) report.samples[type].push({ severity, ...row });
}
function configuredFields(group) { return Object.values(group); }
function selectionFields(table, names) { return [...new Set(names.filter((name) => fieldExists(table, name)))]; }
function identity(enrollment, table) {
  const athlete = linkedIds(enrollment, CONFIG.enrollment.athlete);
  const program = linkedIds(enrollment, CONFIG.enrollment.program);
  return athlete.length === 1 && program.length === 1 && text(enrollment, CONFIG.enrollment.schoolYear)
    ? `${athlete[0]}|${program[0]}|${text(enrollment, CONFIG.enrollment.schoolYear)}`
    : "";
}

function analyze({ enrollments, levels, xpEvents, enrollmentTable, levelTable, xpTable }) {
  const report = {
    audit: "PKG-040 standings-integrity",
    readOnly: true,
    issueCounts: Object.fromEntries(CONFIG.knownIssueTypes.map((type) => [type, 0])),
    samples: Object.fromEntries(CONFIG.knownIssueTypes.map((type) => [type, []])),
    counts: { enrollments: enrollments.length, activeEnrollments: 0, activeXpEvents: 0 },
    limitations: [
      "Airtable Scripting cannot inspect named-view membership; compare this audit with Web - Leaderboard manually.",
      "Formula and rollup values are one read only; blank computed values are classified separately from zero.",
      "The public REST adapter receives linked-record display values, not linked record IDs; the approved view remains the authoritative public scope boundary.",
    ],
  };
  const levelById = new Map(levels.map((level) => [level.id, level]));
  const activeXpByEnrollment = new Map();
  for (const xp of xpEvents) {
    if (!bool(xp, CONFIG.xp.active)) continue;
    report.counts.activeXpEvents += 1;
    for (const enrollmentId of linkedIds(xp, CONFIG.xp.enrollment)) {
      if (!activeXpByEnrollment.has(enrollmentId)) activeXpByEnrollment.set(enrollmentId, []);
      activeXpByEnrollment.get(enrollmentId).push(xp);
    }
  }
  const byIdentity = new Map();
  const activeLevelRanks = new Map();
  for (const level of levels) {
    if (!bool(level, CONFIG.level.active)) continue;
    const rank = numericState(level, CONFIG.level.sortOrder);
    if (rank.kind === "number") activeLevelRanks.set(rank.value, [...(activeLevelRanks.get(rank.value) || []), level.id]);
  }
  for (const enrollment of enrollments) {
    const id = enrollment.id;
    if (!bool(enrollment, CONFIG.enrollment.active)) {
      addIssue(report, "inactive_enrollment", "info", { recordId: id });
      continue;
    }
    report.counts.activeEnrollments += 1;
    const athlete = linkedIds(enrollment, CONFIG.enrollment.athlete);
    const program = linkedIds(enrollment, CONFIG.enrollment.program);
    const year = text(enrollment, CONFIG.enrollment.schoolYear);
    if (athlete.length === 0) addIssue(report, "missing_athlete_link", "error", { recordId: id });
    if (athlete.length > 1) addIssue(report, "multiple_athlete_links", "error", { recordId: id, athleteIds: athlete });
    if (program.length === 0) addIssue(report, "missing_program_instance", "error", { recordId: id });
    if (program.length > 1) addIssue(report, "multiple_program_instances", "error", { recordId: id, programIds: program });
    if (!year) addIssue(report, "missing_school_year", "error", { recordId: id });
    const key = identity(enrollment, enrollmentTable);
    if (key) byIdentity.set(key, [...(byIdentity.get(key) || []), id]);

    const current = linkedIds(enrollment, CONFIG.enrollment.currentLevel);
    if (current.length === 0) addIssue(report, "missing_current_level", "error", { recordId: id });
    if (current.length > 1) addIssue(report, "multiple_current_levels", "error", { recordId: id, levelIds: current });
    if (current.length === 1 && !bool(levelById.get(current[0]), CONFIG.level.active)) {
      addIssue(report, "current_level_inactive", "error", { recordId: id, levelId: current[0] });
    }
    const rank = numericState(enrollment, CONFIG.enrollment.levelRank);
    if (rank.kind === "blank") addIssue(report, "missing_level_rank", "error", { recordId: id });
    else if (rank.kind === "invalid") addIssue(report, "invalid_level_rank", "error", { recordId: id });
    else if (rank.value < 0) addIssue(report, "invalid_level_rank", "error", { recordId: id, value: rank.value });

    const xp = numericState(enrollment, CONFIG.enrollment.lifetimeXp);
    const shots = numericState(enrollment, CONFIG.enrollment.shots);
    for (const [state, blank, invalid, negative, unsettled] of [
      [xp, "lifetime_xp_blank", "lifetime_xp_invalid", "lifetime_xp_negative", "lifetime_xp_unsettled"],
      [shots, "counted_shots_blank", "counted_shots_invalid", "counted_shots_negative", "counted_shots_unsettled"],
    ]) {
      if (state.kind === "blank") {
        addIssue(report, blank, "warning", { recordId: id });
        addIssue(report, unsettled, "warning", { recordId: id });
      } else if (state.kind === "invalid") addIssue(report, invalid, "error", { recordId: id });
      else if (state.value < 0) addIssue(report, negative, "error", { recordId: id, value: state.value });
    }
    const activeXp = activeXpByEnrollment.get(id) || [];
    const linkedXpIds = new Set(linkedIds(enrollment, CONFIG.enrollment.xpEvents));
    for (const event of xpEvents) {
      if (linkedXpIds.has(event.id) && !bool(event, CONFIG.xp.active)) {
        addIssue(report, "inactive_xp_event_linked", "warning", { recordId: id, xpEventId: event.id });
      }
    }
    if (xp.kind === "number") {
      const expected = activeXp.reduce((sum, event) => {
        const value = numericState(event, CONFIG.xp.activePoints);
        return sum + (value.kind === "number" ? value.value : 0);
      }, 0);
      if (xp.value !== expected) addIssue(report, "lifetime_xp_mismatch", "error", { recordId: id, expected, actual: xp.value });
    }
    if (bool(enrollment, CONFIG.enrollment.recalc)) addIssue(report, "progression_recalc_pending", "warning", { recordId: id });
    if (current.length === 1 && xp.kind === "number") {
      const levelRank = numericState(levelById.get(current[0]), CONFIG.level.sortOrder);
      if (levelRank.kind !== "number" || rank.kind !== "number" || levelRank.value !== rank.value) {
        addIssue(report, "level_xp_inconsistency", "error", { recordId: id, currentLevelId: current[0] });
      }
    }
    if (/test|fixture|schmidt/i.test(text(enrollment, CONFIG.enrollment.fullName))) {
      addIssue(report, "test_athlete_name_match", "info", { recordId: id, classification: "review_only_not_auto_excluded" });
    }
  }
  for (const [key, ids] of byIdentity) {
    if (ids.length > 1) addIssue(report, "duplicate_canonical_enrollment", "error", { identity: key, enrollmentIds: ids });
  }
  for (const [rank, ids] of activeLevelRanks) {
    if (ids.length > 1) addIssue(report, "duplicate_level_rank", "error", { rank, levelIds: ids });
  }
  addIssue(report, "view_membership_unobservable", "warning", { requiredView: "Web - Leaderboard" });
  addIssue(report, "formula_timing_limitation", "warning", { rereadRecommendation: "Rerun after Airtable formulas and rollups settle." });
  addIssue(report, "public_view_contract", "info", { required: "Active? + exact one Athlete + exact current Program Instance/School Year + settled rank/XP/shots." });
  report.findingCount = Object.values(report.issueCounts).reduce((sum, count) => sum + count, 0);
  return report;
}

async function main() {
  const enrollmentTable = base.getTable(CONFIG.tables.enrollments);
  const levelTable = base.getTable(CONFIG.tables.levels);
  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  for (const [table, fields] of [
    [enrollmentTable, configuredFields(CONFIG.enrollment)],
    [levelTable, configuredFields(CONFIG.level)],
    [xpTable, configuredFields(CONFIG.xp)],
  ]) for (const field of fields) {
    if (!fieldExists(table, field)) throw new Error(`Missing required field ${table.name}.${field}`);
  }
  const [enrollmentQuery, levelQuery, xpQuery] = await Promise.all([
    enrollmentTable.selectRecordsAsync({ fields: selectionFields(enrollmentTable, configuredFields(CONFIG.enrollment)) }),
    levelTable.selectRecordsAsync({ fields: selectionFields(levelTable, configuredFields(CONFIG.level)) }),
    xpTable.selectRecordsAsync({ fields: selectionFields(xpTable, configuredFields(CONFIG.xp)) }),
  ]);
  console.log(JSON.stringify(analyze({
    enrollments: enrollmentQuery.records, levels: levelQuery.records, xpEvents: xpQuery.records,
    enrollmentTable, levelTable, xpTable,
  }), null, 2));
}

await main();
