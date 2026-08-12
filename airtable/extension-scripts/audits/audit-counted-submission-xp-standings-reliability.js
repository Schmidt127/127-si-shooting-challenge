/*
Extension Script: Counted Submission XP and Standings Reliability Audit
System: 127 SI Shooting Challenge
Purpose: Read-only reconciliation for counted Submission -> Submission Base XP ->
canonical WAS -> Enrollment totals -> progression/standings inputs.
Default: read-only. This script never creates, updates, deletes, or sends.
*/
// @ts-nocheck
const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";
const CONFIG = {
  tables: { submissions: "Submissions", xp: "XP Events", was: "Weekly Athlete Summary", enrollments: "Enrollments" },
  f: {
    sub: { count: "Count This Submission?", enrollment: "Enrollment", week: "Week", was: "Weekly Athlete Summary" },
    xp: { key: "Source Key", active: "Active?", points: "XP Points", activePoints: "Active XP Points", submission: "Submission", enrollment: "Enrollment", week: "Week", was: "Weekly Athlete Summary" },
    was: { enrollment: "Enrollment", week: "Week", goalRecord: "Goal Record", goalLookup: "Goal Shots Target", weeklyGoal: "Weekly Goal Shots Target", weeklyXp: "XP Earned This Week" },
    enr: { active: "Active?", xp: "Lifetime XP Total", manual: "Lifetime XP Manual Adjustments", recalc: "Level Recalc Needed?", status: "Level Status", current: "Current Level", sort: "Level Sort Order - For Softr", program: "Program Instance", schoolYear: "School Year" },
  },
  prefix: "SUBMISSION_XP|",
};
const field = (t, n) => { try { return t.getField(n); } catch { return null; } };
const raw = (r, t, n) => field(t, n) ? r.getCellValue(n) : null;
const text = (r, t, n) => String(r?.getCellValueAsString(n) || "").trim();
const links = (r, t, n) => Array.isArray(raw(r, t, n)) ? raw(r, t, n).map((v) => v?.id).filter(Boolean) : [];
const one = (r, t, n) => links(r, t, n)[0] || "";
const yes = (r, t, n) => { const v = raw(r, t, n); return v === true || v === 1 || String(v).toLowerCase() === "true"; };
const numberState = (r, t, n) => {
  const v = raw(r, t, n);
  if (v === null || v === undefined || v === "") return { kind: "blank", value: null };
  const value = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(value) ? { kind: "number", value } : { kind: "invalid", value: null };
};
const sameOne = (actual, expected) => actual.length === 1 && actual[0] === expected;

async function main() {
  const subT = base.getTable(CONFIG.tables.submissions), xpT = base.getTable(CONFIG.tables.xp);
  const wasT = base.getTable(CONFIG.tables.was), enrT = base.getTable(CONFIG.tables.enrollments);
  const [subs, xps, summaries, enrollments] = await Promise.all([
    subT.selectRecordsAsync(), xpT.selectRecordsAsync(), wasT.selectRecordsAsync(), enrT.selectRecordsAsync(),
  ]);
  const findings = [], counts = {};
  const add = (code, severity, record, detail, action) => {
    counts[code] = (counts[code] || 0) + 1;
    if (findings.length < SAMPLE_LIMIT) findings.push({ code, severity, recordId: record?.id || "", detail, recommendedAction: action });
  };
  const wasByPair = new Map(), xpByKey = new Map(), activeXpByEnrollment = new Map();
  for (const was of summaries.records) {
    const e = one(was, wasT, CONFIG.f.was.enrollment), w = one(was, wasT, CONFIG.f.was.week);
    if (e && w) { const key = `${e}|${w}`; wasByPair.set(key, [...(wasByPair.get(key) || []), was]); }
  }
  for (const xp of xps.records) {
    const key = text(xp, xpT, CONFIG.f.xp.key);
    if (key) xpByKey.set(key, [...(xpByKey.get(key) || []), xp]);
    const e = one(xp, xpT, CONFIG.f.xp.enrollment);
    if (e && yes(xp, xpT, CONFIG.f.xp.active)) activeXpByEnrollment.set(e, [...(activeXpByEnrollment.get(e) || []), xp]);
  }
  for (const sub of subs.records) {
    if (!yes(sub, subT, CONFIG.f.sub.count)) continue;
    const enrollmentId = one(sub, subT, CONFIG.f.sub.enrollment), weekId = one(sub, subT, CONFIG.f.sub.week);
    if (!enrollmentId || !weekId) { add("counted_submission_missing_identity", "error", sub, { enrollmentId, weekId }, "Repair intake links before XP replay."); continue; }
    const canonicalWas = wasByPair.get(`${enrollmentId}|${weekId}`) || [];
    if (!canonicalWas.length) add("missing_canonical_was", "error", sub, { enrollmentId, weekId }, "Run 031 in a controlled repair flow.");
    if (canonicalWas.length > 1) add("duplicate_canonical_was", "error", sub, { enrollmentId, weekId, wasIds: canonicalWas.map((r) => r.id) }, "Manual review; do not delete automatically.");
    const expected = `${CONFIG.prefix}${sub.id}`, events = xpByKey.get(expected) || [];
    if (!events.length) add("missing_submission_base_xp", "error", sub, { expectedSourceKey: expected }, "Audit 010 preconditions, then controlled replay/backfill.");
    if (events.length > 1) add("duplicate_submission_base_xp", "error", sub, { expectedSourceKey: expected, xpIds: events.map((r) => r.id) }, "Manual duplicate review; do not auto-deactivate.");
    for (const xp of events) {
      if (!yes(xp, xpT, CONFIG.f.xp.active)) add("inactive_canonical_submission_xp", "error", xp, { submissionId: sub.id }, "Review duplicate/deactivation state before re-award.");
      if (!sameOne(links(xp, xpT, CONFIG.f.xp.submission), sub.id)) add("submission_xp_wrong_submission_link", "error", xp, { expected: sub.id }, "Repair via Automation 010.");
      if (!sameOne(links(xp, xpT, CONFIG.f.xp.enrollment), enrollmentId)) add("submission_xp_wrong_enrollment_link", "error", xp, { expected: enrollmentId }, "Repair via Automation 010.");
      if (!sameOne(links(xp, xpT, CONFIG.f.xp.week), weekId)) add("submission_xp_wrong_week_link", "error", xp, { expected: weekId }, "Repair via Automation 010.");
      if (canonicalWas.length === 1 && !sameOne(links(xp, xpT, CONFIG.f.xp.was), canonicalWas[0].id)) add("submission_xp_wrong_was_link", "error", xp, { expected: canonicalWas[0].id }, "Repair via Automation 010; 031 excludes Submission Base XP.");
    }
  }
  for (const was of summaries.records) {
    const goalRecordIds = links(was, wasT, CONFIG.f.was.goalRecord);
    const lookup = numberState(was, wasT, CONFIG.f.was.goalLookup), formula = numberState(was, wasT, CONFIG.f.was.weeklyGoal);
    if (!goalRecordIds.length) add("weekly_goal_missing_goal_record", "warn", was, {}, "030/032 configuration link is missing; zero is not treated as configured.");
    else if (goalRecordIds.length !== 1) add("weekly_goal_ambiguous_goal_record", "error", was, { goalRecordIds }, "Resolve to exactly one goal record.");
    else if (lookup.kind === "blank") add("weekly_goal_blank_lookup", "warn", was, { goalRecordId: goalRecordIds[0] }, "Goal Record exists but lookup is blank; inspect source goal configuration.");
    else if (lookup.kind === "number" && lookup.value === 0 && formula.kind === "number" && formula.value === 0) add("weekly_goal_configured_zero", "info", was, { goalRecordId: goalRecordIds[0] }, "Configured zero is reported separately and is not a missing-goal finding.");
    else if (lookup.kind === "number" && lookup.value > 0 && formula.kind === "blank") add("weekly_goal_formula_unsettled_or_invalid", "warn", was, { lookup: lookup.value }, "Formula is blank after populated lookup; reread after settlement, then inspect formula if persistent.");
    else if (lookup.kind === "number" && lookup.value > 0 && formula.kind === "number" && formula.value === 0) add("weekly_goal_formula_zero_from_nonzero_lookup", "error", was, { lookup: lookup.value }, "Formula result conflicts with populated lookup; inspect formula configuration.");
  }
  for (const enrollment of enrollments.records) {
    const id = enrollment.id, activeXp = activeXpByEnrollment.get(id) || [];
    const computed = activeXp.reduce((sum, xp) => sum + (numberState(xp, xpT, CONFIG.f.xp.activePoints).value || 0), 0);
    const total = numberState(enrollment, enrT, CONFIG.f.enr.xp), manual = numberState(enrollment, enrT, CONFIG.f.enr.manual);
    const expected = computed + (manual.value || 0);
    if (total.kind === "number" && total.value !== expected) add("lifetime_xp_discrepancy", "error", enrollment, { expected, actual: total.value, activeXp: computed, manualAdjustment: manual.value || 0 }, "Run 090E and inspect rollup links/active flags.");
    if (yes(enrollment, enrT, CONFIG.f.enr.recalc)) add("progression_recalc_pending", "warn", enrollment, { levelStatus: text(enrollment, enrT, CONFIG.f.enr.status) }, "041 has queued work; verify 042 consumes it. No timestamp field means age is not inferable.");
    if (yes(enrollment, enrT, CONFIG.f.enr.active) && (!text(enrollment, enrT, CONFIG.f.enr.current) || numberState(enrollment, enrT, CONFIG.f.enr.sort).kind !== "number" || !one(enrollment, enrT, CONFIG.f.enr.program) || !text(enrollment, enrT, CONFIG.f.enr.schoolYear))) add("likely_absent_from_standings", "warn", enrollment, { active: true }, "Check Web - Leaderboard view and required standings inputs; this audit cannot read view membership.");
  }
  console.log(JSON.stringify({ audit: "counted-submission-xp-standings-reliability", schemaSnapshot: SCHEMA_SNAPSHOT, readOnly: true, counts, findingCount: Object.values(counts).reduce((a, b) => a + b, 0), samples: findings, limitations: ["Formula/rollup timing cannot be proved from one read; formula_unsettled_or_invalid is intentionally distinct from missing configuration.", "Standings view membership is not available to Scripting extension reads."] }, null, 2));
}
await main();
