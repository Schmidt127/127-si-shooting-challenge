/*
Automation: 120 - Weekly Summary and Goal Logic - Reconcile Weekly Threshold XP Eligibility
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth - Production paste and controlled proof required
Issue: #102

Purpose:
Reconcile existing Weekly Threshold XP Events against current authoritative Weekly Athlete Summary
eligibility. This automation does NOT create XP Events. Automation 035 remains the sole creator.

Recommended trigger:
Scheduled/admin reconciliation. Optional input recordId limits the run to one Weekly Athlete Summary.
Optional input execute=true enables writes; omitted/false is dry-run.

Lifecycle contract:
- Current tier no longer met -> retire exact-owned active XP Event (Active? = false).
- Tier regained -> reactivate the same exact-owned XP Event only after Enrollment/Week/Program
  Instance ownership validates.
- Eligible tier with no existing event -> report missing award; leave creation to 035.
- Ambiguous/duplicate/ownership-conflicting events -> fail closed; do not steal or rewrite.
- Any Active? transition -> set Enrollment.Level Recalc Needed? = true.
- Preserve XP Points and historical source/reason fields.
*/

// @ts-nocheck

const SCRIPT = {
  name: "120 - Weekly Summary and Goal Logic - Reconcile Weekly Threshold XP Eligibility",
  version: "v1.0",
  versionDate: "2026-09-08",
};

const CONFIG = {
  tiers: [100, 125, 150],
  tables: {
    summaries: "Weekly Athlete Summary",
    xpEvents: "XP Events",
    enrollments: "Enrollments",
    weeks: "Weeks",
  },
  summary: {
    enrollment: "Enrollment",
    week: "Week",
    goalCompletion: "Goal Completion %",
  },
  xp: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    week: "Week",
    summary: "Weekly Athlete Summary",
    source: "XP Source",
    bucket: "XP Bucket",
    active: "Active?",
    reasonDebug: "XP Reason Debug",
  },
  enrollment: {
    active: "Active?",
    programInstance: "Program Instance",
    levelRecalcNeeded: "Level Recalc Needed?",
  },
  week: {
    programInstance: "Program Instance",
  },
};

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch (_) {
    return false;
  }
}

function linkedIds(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => item && item.id).filter(Boolean))];
}

function exactlyOneLinkedId(record, fieldName) {
  const ids = linkedIds(record, fieldName);
  return ids.length === 1 ? ids[0] : "";
}

function text(record, fieldName) {
  try {
    return String(record.getCellValueAsString(fieldName) || "").trim();
  } catch (_) {
    return "";
  }
}

function selectName(record, fieldName) {
  const value = record.getCellValue(fieldName);
  return value && value.name ? String(value.name) : text(record, fieldName);
}

function numberValue(record, fieldName) {
  const raw = record.getCellValue(fieldName);
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (Array.isArray(raw) && raw.length === 1) {
    const parsed = Number(raw[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isTruthy(value) {
  return value === true || value === 1 || value === "1";
}

function meetsTier(goalCompletionRatio, tier) {
  return Number.isFinite(goalCompletionRatio) && goalCompletionRatio + 1e-9 >= tier / 100;
}

function sourceKey(enrollmentId, weekId, tier) {
  return `WEEKLY_THRESHOLD|${enrollmentId}|${weekId}|${tier}`;
}

function sourceLabel(tier) {
  return `Weekly Threshold ${tier}`;
}

function ownerMatches(xp, enrollmentId, weekId, summaryId) {
  const xpEnrollment = exactlyOneLinkedId(xp, CONFIG.xp.enrollment);
  const xpWeek = exactlyOneLinkedId(xp, CONFIG.xp.week);
  const xpSummaryIds = linkedIds(xp, CONFIG.xp.summary);
  return (
    xpEnrollment === enrollmentId &&
    xpWeek === weekId &&
    (xpSummaryIds.length === 0 || (xpSummaryIds.length === 1 && xpSummaryIds[0] === summaryId))
  );
}

function programOwnershipIsValid(enrollment, week) {
  const enrollmentPi = exactlyOneLinkedId(enrollment, CONFIG.enrollment.programInstance);
  const weekPi = exactlyOneLinkedId(week, CONFIG.week.programInstance);
  return Boolean(enrollmentPi && weekPi && enrollmentPi === weekPi);
}

function appendDebug(existing, line) {
  const clean = String(existing || "").trim();
  if (!clean) return line;
  if (clean.includes(line)) return clean;
  return `${clean}\n${line}`;
}

function setOut(key, value) {
  try { output.set(key, value); } catch (_) {}
}

const inputConfig = input.config();
const recordId = String(inputConfig.recordId || "").trim();
const execute = inputConfig.execute === true || inputConfig.execute === 1 || inputConfig.execute === "1" || String(inputConfig.execute || "").toLowerCase() === "true";

const summariesTable = base.getTable(CONFIG.tables.summaries);
const xpTable = base.getTable(CONFIG.tables.xpEvents);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const weeksTable = base.getTable(CONFIG.tables.weeks);

for (const [table, fields] of [
  [summariesTable, Object.values(CONFIG.summary)],
  [xpTable, Object.values(CONFIG.xp)],
  [enrollmentsTable, Object.values(CONFIG.enrollment)],
  [weeksTable, Object.values(CONFIG.week)],
]) {
  for (const field of fields) {
    if (!fieldExists(table, field)) throw new Error(`Missing required field ${table.name}.${field}`);
  }
}

const summaryQuery = await summariesTable.selectRecordsAsync({ fields: Object.values(CONFIG.summary) });
const xpQuery = await xpTable.selectRecordsAsync({ fields: Object.values(CONFIG.xp) });
const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({ fields: Object.values(CONFIG.enrollment) });
const weekQuery = await weeksTable.selectRecordsAsync({ fields: Object.values(CONFIG.week) });

const enrollmentsById = new Map(enrollmentQuery.records.map((r) => [r.id, r]));
const weeksById = new Map(weekQuery.records.map((r) => [r.id, r]));
const summaries = recordId ? summaryQuery.records.filter((r) => r.id === recordId) : summaryQuery.records;

if (recordId && summaries.length !== 1) {
  throw new Error(`Weekly Athlete Summary not found: ${recordId}`);
}

const stats = {
  summariesScanned: 0,
  tiersScanned: 0,
  retired: 0,
  reactivated: 0,
  unchanged: 0,
  missingAward: 0,
  ambiguous: 0,
  ownershipBlocked: 0,
  levelRecalcQueued: 0,
  dryRun: !execute,
};
const findings = [];
const recalcEnrollmentIds = new Set();

for (const summary of summaries) {
  stats.summariesScanned += 1;
  const enrollmentId = exactlyOneLinkedId(summary, CONFIG.summary.enrollment);
  const weekId = exactlyOneLinkedId(summary, CONFIG.summary.week);
  const goalCompletion = numberValue(summary, CONFIG.summary.goalCompletion);

  if (!enrollmentId || !weekId) {
    findings.push({ summaryId: summary.id, code: "summary_ownership_invalid", enrollmentId, weekId });
    stats.ownershipBlocked += 1;
    continue;
  }

  const enrollment = enrollmentsById.get(enrollmentId);
  const week = weeksById.get(weekId);
  if (!enrollment || !week) {
    findings.push({ summaryId: summary.id, code: "authoritative_owner_missing", enrollmentId, weekId });
    stats.ownershipBlocked += 1;
    continue;
  }

  for (const tier of CONFIG.tiers) {
    stats.tiersScanned += 1;
    const key = sourceKey(enrollmentId, weekId, tier);
    const label = sourceLabel(tier);
    const eligible = meetsTier(goalCompletion, tier);

    const exact = xpQuery.records.filter((xp) => text(xp, CONFIG.xp.sourceKey) === key);
    const semanticLegacy = xpQuery.records.filter((xp) => {
      if (text(xp, CONFIG.xp.sourceKey)) return false;
      if (selectName(xp, CONFIG.xp.source) !== label) return false;
      if (selectName(xp, CONFIG.xp.bucket) !== "Weekly Threshold") return false;
      return ownerMatches(xp, enrollmentId, weekId, summary.id);
    });

    let candidates = exact;
    let legacy = false;
    if (candidates.length === 0 && semanticLegacy.length === 1) {
      candidates = semanticLegacy;
      legacy = true;
    }

    if (candidates.length > 1 || (exact.length > 0 && semanticLegacy.length > 0)) {
      findings.push({ summaryId: summary.id, tier, sourceKey: key, code: "threshold_xp_ambiguous", exactCount: exact.length, legacyCount: semanticLegacy.length });
      stats.ambiguous += 1;
      continue;
    }

    if (candidates.length === 0) {
      if (eligible) {
        findings.push({ summaryId: summary.id, tier, sourceKey: key, code: "eligible_award_missing_delegate_to_035" });
        stats.missingAward += 1;
      } else {
        stats.unchanged += 1;
      }
      continue;
    }

    const xp = candidates[0];
    if (!ownerMatches(xp, enrollmentId, weekId, summary.id)) {
      findings.push({ summaryId: summary.id, tier, sourceKey: key, xpId: xp.id, code: "threshold_xp_owner_mismatch" });
      stats.ownershipBlocked += 1;
      continue;
    }

    const active = isTruthy(xp.getCellValue(CONFIG.xp.active));

    if (!eligible && active) {
      const note = `120 v1.0 retired: current Goal Completion no longer meets ${tier}% threshold.`;
      findings.push({ summaryId: summary.id, tier, sourceKey: key, xpId: xp.id, code: "retire", execute });
      if (execute) {
        await xpTable.updateRecordAsync(xp.id, {
          [CONFIG.xp.active]: false,
          [CONFIG.xp.reasonDebug]: appendDebug(text(xp, CONFIG.xp.reasonDebug), note),
        });
      }
      stats.retired += 1;
      recalcEnrollmentIds.add(enrollmentId);
      continue;
    }

    if (eligible && !active) {
      const enrollmentActive = isTruthy(enrollment.getCellValue(CONFIG.enrollment.active));
      const piValid = programOwnershipIsValid(enrollment, week);
      if (!enrollmentActive || !piValid) {
        findings.push({ summaryId: summary.id, tier, sourceKey: key, xpId: xp.id, code: "reactivation_blocked_owner_or_program_instance", enrollmentActive, programInstanceValid: piValid });
        stats.ownershipBlocked += 1;
        continue;
      }
      const note = `120 v1.0 reactivated: current Goal Completion again meets ${tier}% threshold.`;
      findings.push({ summaryId: summary.id, tier, sourceKey: key, xpId: xp.id, code: "reactivate", execute, legacy });
      if (execute) {
        const update = {
          [CONFIG.xp.active]: true,
          [CONFIG.xp.reasonDebug]: appendDebug(text(xp, CONFIG.xp.reasonDebug), note),
        };
        if (legacy) update[CONFIG.xp.sourceKey] = key;
        await xpTable.updateRecordAsync(xp.id, update);
      }
      stats.reactivated += 1;
      recalcEnrollmentIds.add(enrollmentId);
      continue;
    }

    stats.unchanged += 1;
  }
}

for (const enrollmentId of recalcEnrollmentIds) {
  const enrollment = enrollmentsById.get(enrollmentId);
  if (!enrollment) continue;
  if (!isTruthy(enrollment.getCellValue(CONFIG.enrollment.levelRecalcNeeded))) {
    if (execute) {
      await enrollmentsTable.updateRecordAsync(enrollmentId, {
        [CONFIG.enrollment.levelRecalcNeeded]: true,
      });
    }
    stats.levelRecalcQueued += 1;
  }
}

setOut("statusOut", "success");
setOut("actionOut", execute ? "reconciled" : "dry_run");
setOut("statsOut", JSON.stringify(stats));
setOut("findingsOut", JSON.stringify(findings.slice(0, 100)));
setOut("findingCountOut", findings.length);

console.log(JSON.stringify({ script: SCRIPT, execute, stats, findings }, null, 2));
