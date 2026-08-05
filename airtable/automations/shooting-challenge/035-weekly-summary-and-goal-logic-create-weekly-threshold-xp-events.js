/*
Automation: 035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth ? PROD paste only after Mike UI attestation
Last GitHub Update: 2026-08-03

Purpose:
Create XP Events for met Weekly Threshold tiers (100% / 125% / 150%) from one Weekly Athlete Summary.

Trigger:
Weekly Athlete Summary when Threshold XP Ready? = 1

Important Tables:
Weekly Athlete Summary, XP Events, XP Reward Rules, Weeks, Enrollments

Important Fields:
Goal Completion %, Threshold XP Status, Requeue Threshold XP, Source Key,
XP Bucket=Weekly Threshold, XP Source=Weekly Threshold {100|125|150}

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Skip GitHub header when pasting into Airtable.
Reconstructed for SC-049 / XP-D1 (writer was missing from repo).
*/

/************************************************************
 * 035 - WEEKLY SUMMARY AND GOAL LOGIC
 * Create Weekly Threshold XP Events
 *
 * Version: v1.3
 * Date Written: 2026-07-25
 * Last Updated: 2026-08-05
 *
 * VERSION HISTORY
 * - v1.3 (2026-08-05): Airtable runtime compatibility — guard optional
 *   QueryResult.unloadData() cleanup so unsupported cleanup cannot fail an
 *   otherwise successful automation run.
 * - v1.2 (2026-08-03): Treat Airtable percent values as ratios exactly as returned
 *   (1 = 100%, 1.25 = 125%, 83.7 = 8,370%). Removed the v1.1 `raw > 3 ? raw / 100`
 *   heuristic that incorrectly skipped Goal Completion 83.7 as below 100%.
 * - v1.1 (2026-07-25): Semantic legacy-key compatibility (Enrollment+Week+XP Source);
 *   skip inactive enrollments; prefer Grade Band link-ID rule match; avoid per-create
 *   full-table XP scans; richer outputs for Mike paste testing.
 * - v1.0 (2026-07-25): Initial SC-049 / XP-D1 rebuild.
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary (WAS) when Threshold XP Ready? = 1.
 * - Awards one XP Event per met goal tier: 100%, 125%, 150%.
 * - Amounts come from active XP Reward Rules
 *   WEEKLY_THRESHOLD_{100|125|150}_{K2|34|56|78|912}.
 * - Prevents duplicates with Source Key:
 *      WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}
 * - Also skips when Enrollment+Week already has XP Source
 *   "Weekly Threshold {100|125|150}" (legacy Source Key shape unknown / wiped).
 * - Writes XP Activity Date from Week End Date (America/Denver).
 * - Marks WAS Threshold XP Status = Processed and clears Requeue Threshold XP.
 *
 * IMPORTANT DESIGN RULES
 * - One enrollment ? week ? percent tier = one XP Event (append-only).
 * - Do not write formula/rollup fields (Goal Completion %, Threshold XP Ready?).
 * - Do not invent XP amounts ? missing/invalid rules error that tier.
 * - XP Bucket = "Weekly Threshold".
 * - XP Source = "Weekly Threshold 100" | "Weekly Threshold 125" | "Weekly Threshold 150".
 * - XP Activity Date Source = "Weekly Summary Week End Date" when that option exists.
 * - Inactive Enrollment (Active?=false) ? skipped (not error).
 * - This is not Perfect Week XP (058/059) and not Submission Base XP (010).
 * - Before PROD paste: Mike must UI-attest no competing Threshold automation still ON.
 *
 * FOLDER
 * - 03 - Weekly Summary and Goal Logic
 *
 * AUTOMATION NAME
 * - 035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Threshold XP Ready? = 1
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Weekly Athlete Summary
 *
 * REQUIRED OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut = created | updated | skipped_* | error
 * - errorOut
 * - debugStep
 *
 * OPTIONAL OUTPUTS
 * - createdCountOut, skippedExistingCountOut, sourceKeysOut
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events",
  version: "v1.3",
  versionDate: "2026-08-05",
  originalWrittenDate: "2026-07-25",
  lastUpdated: "2026-08-05",
  folder: "03 - Weekly Summary and Goal Logic",
  automationName: "035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events",
};

const CONFIG = {
  timeZone: "America/Denver",
  thresholdPercents: [100, 125, 150],

  tables: {
    weeklySummary: "Weekly Athlete Summary",
    xpEvents: "XP Events",
    xpRules: "XP Reward Rules",
    weeks: "Weeks",
    enrollments: "Enrollments",
  },

  was: {
    enrollment: "Enrollment",
    week: "Week",
    gradeBand: "Grade Band",
    goalCompletion: "Goal Completion %",
    thresholdStatus: "Threshold XP Status",
    thresholdProcessedAt: "Threshold XP Processed At",
    thresholdError: "Threshold XP Error Message",
    requeue: "Requeue Threshold XP",
    xpEvents: "XP Events",
    ready: "Threshold XP Ready?",
  },

  week: {
    endDate: "End Date",
    endKey: "Week End Key",
  },

  enrollment: {
    gradeBand: "Grade Band",
    active: "Active?",
  },

  xpRule: {
    ruleKey: "Rule Key",
    xpAmount: "XP Amount",
    active: "Active?",
    sourceLabel: "XP Source Label",
    gradeBand: "Grade Band",
  },

  xp: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpPoints: "XP Points",
    xpBucket: "XP Bucket",
    xpSource: "XP Source",
    active: "Active?",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    xpActivityDate: "XP Activity Date",
    xpActivityDateSource: "XP Activity Date Source",
    awardedBy: "Awarded By",
  },

  values: {
    xpBucket: "Weekly Threshold",
    xpActivityDateSource: "Weekly Summary Week End Date",
    statusProcessed: "Processed",
    statusError: "Error",
    awardedBy: "035-weekly-threshold",
    sourceKeyPrefix: "WEEKLY_THRESHOLD|",
  },
};

let debugStep = "init";

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch (e) {
    console.log(`setOutputSafe(${key}) failed: ${e && e.message ? e.message : e}`);
  }
}

/**
 * Airtable Scripting sometimes exposes unloadData on QueryResult; some automation
 * runtimes do not. Never let cleanup throw after successful business work.
 */
function unloadQuerySafe(queryResult) {
  if (typeof queryResult?.unloadData === "function") {
    try {
      queryResult.unloadData();
    } catch (error) {
      console.log(
        "Query unloadData skipped/failed (non-fatal)",
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }
}

function setDebug(step) {
  debugStep = step;
  setOutputSafe("debugStep", step);
}

function requireRecId(recordId) {
  const value = String(recordId || "").trim();
  if (!value || !value.startsWith("rec")) {
    throw new Error(`Invalid recordId: expected Airtable record id starting with "rec", got "${recordId}"`);
  }
  return value;
}

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch (e) {
    return false;
  }
}

function requireField(table, name) {
  if (!fieldExists(table, name)) {
    throw new Error(`Missing required field "${name}" on table "${table.name}"`);
  }
}

function getLinkedIds(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => (x && x.id) || x).filter(Boolean);
  if (v.id) return [v.id];
  return [];
}

function getText(record, fieldName) {
  try {
    const v = record.getCellValueAsString(fieldName);
    return v == null ? "" : String(v).trim();
  } catch (e) {
    return "";
  }
}

function getNumber(record, fieldName) {
  const raw = record.getCellValue(fieldName);
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return raw;
  if (Array.isArray(raw) && raw.length === 1) {
    const first = raw[0];
    if (typeof first === "number") return first;
    const n = Number(first);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getCheckbox(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (v === true || v === 1 || v === "1") return true;
  if (Array.isArray(v) && v.length === 1) {
    return v[0] === true || v[0] === 1 || v[0] === "1";
  }
  return false;
}

/** true | false | null (blank/unknown). Blank Active? does not force skip. */
function getCheckboxTriState(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (v === true || v === 1 || v === "1") return true;
  if (v === false || v === 0 || v === "0") return false;
  if (Array.isArray(v) && v.length === 1) {
    if (v[0] === true || v[0] === 1 || v[0] === "1") return true;
    if (v[0] === false || v[0] === 0 || v[0] === "0") return false;
  }
  return null;
}

function requireSingleSelectOption(table, fieldName, optionName) {
  const field = table.getField(fieldName);
  const choices = (field.options && field.options.choices) || [];
  const match = choices.find((c) => c && c.name === optionName);
  if (!match) {
    throw new Error(
      `Missing single-select option "${optionName}" on ${table.name}.${fieldName}`
    );
  }
  return match;
}

function toDateKey(value) {
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
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function dateValueFromKey(dateKey) {
  return dateKey ? `${dateKey}T12:00:00.000Z` : null;
}

function normalizeGradeBandCode(label) {
  const original = String(label || "").trim();
  if (!original) return "";
  const compact = original.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.includes("K2") || original.includes("K-2")) return "K2";
  if (compact.includes("34") || original.includes("3-4")) return "34";
  if (compact.includes("56") || original.includes("5-6")) return "56";
  if (compact.includes("78") || original.includes("7-8")) return "78";
  if (compact.includes("912") || original.includes("9-12")) return "912";
  return "";
}

function xpSourceLabelForPercent(percent) {
  return `Weekly Threshold ${percent}`;
}

function buildSourceKey(enrollmentId, weekId, percent) {
  return `${CONFIG.values.sourceKeyPrefix}${enrollmentId}|${weekId}|${percent}`;
}

function buildRuleKey(percent, bandCode) {
  return `WEEKLY_THRESHOLD_${percent}_${bandCode}`;
}

function goalMeetsPercent(goalCompletionValue, percent) {
  const raw = Number(goalCompletionValue);
  if (!Number.isFinite(raw)) return false;
  // Airtable percent fields return ratios (1 = 100%, 1.25 = 125%, 83.7 = 8370%).
  // Compare the raw numeric ratio directly ? do not divide values > 3 by 100.
  return raw + 1e-9 >= percent / 100;
}

function idsIntersect(a, b) {
  if (!a.length || !b.length) return false;
  const setB = new Set(b);
  return a.some((id) => setB.has(id));
}

function tierAlreadyAwarded(sourceKey, xpSourceLabel, existingKeys, existingLabels) {
  if (sourceKey && existingKeys.has(sourceKey)) {
    return { awarded: true, via: "source_key" };
  }
  if (xpSourceLabel && existingLabels.has(xpSourceLabel)) {
    return { awarded: true, via: "xp_source_label" };
  }
  return { awarded: false, via: "" };
}

function escapeFormulaString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function addIfWritable(fields, table, fieldName, value) {
  if (!fieldExists(table, fieldName)) return;
  try {
    const field = table.getField(fieldName);
    if (field.isComputed) return;
  } catch (e) {
    return;
  }
  fields[fieldName] = value;
}

function resolveRuleForTier(rulesByKey, ruleKey, gradeBandIds) {
  const rule = rulesByKey[ruleKey];
  if (!rule) return null;
  // Prefer Grade Band link-ID compatibility: if both sides have links, require overlap.
  if (gradeBandIds.length && rule.gradeBandIds && rule.gradeBandIds.length) {
    if (!idsIntersect(gradeBandIds, rule.gradeBandIds)) return null;
  }
  return rule;
}

async function findExistingBySourceKey(xpTable, sourceKey) {
  // Targeted recheck ? exact Source Key only (no full-table scan).
  try {
    const formula = `{${CONFIG.xp.sourceKey}} = '${escapeFormulaString(sourceKey)}'`;
    const recheck = await xpTable.selectRecordsAsync({
      fields: [CONFIG.xp.sourceKey],
      filterByFormula: formula,
    });
    try {
      const hit = recheck.records.find((xp) => getText(xp, CONFIG.xp.sourceKey) === sourceKey);
      return hit ? hit.id : null;
    } finally {
      unloadQuerySafe(recheck);
    }
  } catch (e) {
    // filterByFormula unsupported / field name issue ? fall back to in-memory only.
    console.log(`findExistingBySourceKey fallback: ${e && e.message ? e.message : e}`);
    return null;
  }
}

async function main() {
  setDebug("validate_input");
  const inputConfig = input.config();
  const recordId = requireRecId(inputConfig.recordId);

  setDebug("load_tables");
  const wasTable = base.getTable(CONFIG.tables.weeklySummary);
  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  const rulesTable = base.getTable(CONFIG.tables.xpRules);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  requireField(wasTable, CONFIG.was.enrollment);
  requireField(wasTable, CONFIG.was.week);
  requireField(wasTable, CONFIG.was.goalCompletion);
  requireField(xpTable, CONFIG.xp.sourceKey);
  requireField(xpTable, CONFIG.xp.xpPoints);
  requireField(xpTable, CONFIG.xp.xpBucket);
  requireField(xpTable, CONFIG.xp.xpSource);

  const bucketOption = requireSingleSelectOption(xpTable, CONFIG.xp.xpBucket, CONFIG.values.xpBucket);
  const sourceOptions = {};
  for (const percent of CONFIG.thresholdPercents) {
    const label = xpSourceLabelForPercent(percent);
    sourceOptions[percent] = requireSingleSelectOption(xpTable, CONFIG.xp.xpSource, label);
  }

  setDebug("load_was");
  const was = await wasTable.selectRecordAsync(recordId);
  if (!was) {
    throw new Error(`Weekly Athlete Summary not found: ${recordId}`);
  }

  const enrollmentIds = getLinkedIds(was, CONFIG.was.enrollment);
  const weekIds = getLinkedIds(was, CONFIG.was.week);
  if (enrollmentIds.length !== 1) {
    throw new Error(`WAS ${recordId} must have exactly one Enrollment link`);
  }
  if (weekIds.length !== 1) {
    throw new Error(`WAS ${recordId} must have exactly one Week link`);
  }
  const enrollmentId = enrollmentIds[0];
  const weekId = weekIds[0];

  setDebug("load_enrollment");
  const enrollmentFields = [
    CONFIG.enrollment.active,
    CONFIG.enrollment.gradeBand,
  ].filter((f) => fieldExists(enrollmentsTable, f));
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: enrollmentFields.length ? enrollmentFields : undefined,
  });
  if (!enrollment) {
    throw new Error(`Enrollment not found: ${enrollmentId}`);
  }

  if (fieldExists(enrollmentsTable, CONFIG.enrollment.active)
    && getCheckboxTriState(enrollment, CONFIG.enrollment.active) === false) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_inactive_enrollment");
    setOutputSafe("errorOut", "");
    setOutputSafe("createdCountOut", 0);
    setOutputSafe("skippedExistingCountOut", 0);
    setDebug("skipped_inactive_enrollment");
    console.log(JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      statusOut: "skipped",
      actionOut: "skipped_inactive_enrollment",
      recordId,
      enrollmentId,
    }));
    return;
  }

  const goalCompletion = getNumber(was, CONFIG.was.goalCompletion);
  if (goalCompletion == null || !goalMeetsPercent(goalCompletion, 100)) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_goal_below_100");
    setOutputSafe("errorOut", "");
    setOutputSafe("createdCountOut", 0);
    setOutputSafe("skippedExistingCountOut", 0);
    setDebug("skipped_goal_below_100");
    console.log(JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      statusOut: "skipped",
      actionOut: "skipped_goal_below_100",
      recordId,
      goalCompletion,
    }));
    return;
  }

  setDebug("resolve_grade_band");
  let gradeBandIds = fieldExists(wasTable, CONFIG.was.gradeBand)
    ? getLinkedIds(was, CONFIG.was.gradeBand)
    : [];
  if (!gradeBandIds.length && fieldExists(enrollmentsTable, CONFIG.enrollment.gradeBand)) {
    gradeBandIds = getLinkedIds(enrollment, CONFIG.enrollment.gradeBand);
  }
  let gradeBandText = fieldExists(wasTable, CONFIG.was.gradeBand)
    ? getText(was, CONFIG.was.gradeBand)
    : "";
  if (!gradeBandText && fieldExists(enrollmentsTable, CONFIG.enrollment.gradeBand)) {
    gradeBandText = getText(enrollment, CONFIG.enrollment.gradeBand);
  }
  const bandCode = normalizeGradeBandCode(gradeBandText);
  if (!bandCode) {
    throw new Error(
      `Unable to normalize Grade Band for threshold rules: text="${gradeBandText}" ids=${gradeBandIds.join(",") || "(none)"}`
    );
  }

  setDebug("resolve_week_end_date");
  const week = await weeksTable.selectRecordAsync(weekId, {
    fields: [CONFIG.week.endDate, CONFIG.week.endKey].filter((f) => fieldExists(weeksTable, f)),
  });
  if (!week) {
    throw new Error(`Week not found: ${weekId}`);
  }
  const weekEndKey = fieldExists(weeksTable, CONFIG.week.endKey)
    ? getText(week, CONFIG.week.endKey) || toDateKey(week.getCellValue(CONFIG.week.endDate))
    : toDateKey(week.getCellValue(CONFIG.week.endDate));
  if (!weekEndKey) {
    throw new Error(`Week ${weekId} is missing End Date / Week End Key`);
  }
  const activityDate = dateValueFromKey(weekEndKey);

  setDebug("load_xp_rules");
  const rulesQuery = await rulesTable.selectRecordsAsync({
    fields: [
      CONFIG.xpRule.ruleKey,
      CONFIG.xpRule.xpAmount,
      CONFIG.xpRule.active,
      CONFIG.xpRule.sourceLabel,
      CONFIG.xpRule.gradeBand,
    ].filter((f) => fieldExists(rulesTable, f)),
  });
  const rulesByKey = {};
  try {
    for (const rule of rulesQuery.records) {
      const active = !fieldExists(rulesTable, CONFIG.xpRule.active)
        || getCheckbox(rule, CONFIG.xpRule.active);
      if (!active) continue;
      const ruleKey = getText(rule, CONFIG.xpRule.ruleKey);
      if (!ruleKey) continue;
      if (!ruleKey.startsWith("WEEKLY_THRESHOLD_")) continue;
      if (rulesByKey[ruleKey]) {
        throw new Error(`Duplicate active XP Reward Rule key: ${ruleKey}`);
      }
      const ruleGradeBandIds = fieldExists(rulesTable, CONFIG.xpRule.gradeBand)
        ? getLinkedIds(rule, CONFIG.xpRule.gradeBand)
        : [];
      rulesByKey[ruleKey] = {
        id: rule.id,
        xpAmount: getNumber(rule, CONFIG.xpRule.xpAmount),
        gradeBandIds: ruleGradeBandIds,
      };
    }
  } finally {
    unloadQuerySafe(rulesQuery);
  }

  setDebug("load_existing_threshold_awards");
  // One XP load for this enrollment (in-memory). Semantic labels cover legacy key shapes.
  const existingKeys = new Set();
  const existingXpSourceLabels = new Set();
  const xpFields = [
    CONFIG.xp.sourceKey,
    CONFIG.xp.enrollment,
    CONFIG.xp.week,
    CONFIG.xp.xpSource,
    CONFIG.xp.xpBucket,
  ].filter((f) => fieldExists(xpTable, f));
  const xpQuery = await xpTable.selectRecordsAsync({ fields: xpFields });
  try {
    for (const xp of xpQuery.records) {
      const xpEnrollmentIds = fieldExists(xpTable, CONFIG.xp.enrollment)
        ? getLinkedIds(xp, CONFIG.xp.enrollment)
        : [];
      if (xpEnrollmentIds.length && !xpEnrollmentIds.includes(enrollmentId)) continue;

      const xpWeekIds = fieldExists(xpTable, CONFIG.xp.week)
        ? getLinkedIds(xp, CONFIG.xp.week)
        : [];
      const sameWeek = !xpWeekIds.length || xpWeekIds.includes(weekId);

      const key = getText(xp, CONFIG.xp.sourceKey);
      if (key && key.startsWith(CONFIG.values.sourceKeyPrefix)) {
        // Canonical keys for this enrollment (any week) block exact-key duplicates.
        existingKeys.add(key);
      }

      if (!sameWeek) continue;

      const xpSource = getText(xp, CONFIG.xp.xpSource);
      if (xpSource && /^Weekly Threshold (100|125|150)$/.test(xpSource)) {
        existingXpSourceLabels.add(xpSource);
      }
    }
  } finally {
    unloadQuerySafe(xpQuery);
  }

  setDebug("plan_awards");
  const plans = [];
  for (const percent of CONFIG.thresholdPercents) {
    const xpSourceLabel = xpSourceLabelForPercent(percent);
    if (!goalMeetsPercent(goalCompletion, percent)) {
      plans.push({ percent, action: "skip_not_met", xpSourceLabel });
      continue;
    }
    const sourceKey = buildSourceKey(enrollmentId, weekId, percent);
    const ruleKey = buildRuleKey(percent, bandCode);
    const already = tierAlreadyAwarded(
      sourceKey,
      xpSourceLabel,
      existingKeys,
      existingXpSourceLabels
    );
    if (already.awarded) {
      plans.push({
        percent,
        action: "skip_existing",
        skipVia: already.via,
        sourceKey,
        ruleKey,
        xpSourceLabel,
      });
      continue;
    }
    const rule = resolveRuleForTier(rulesByKey, ruleKey, gradeBandIds);
    if (!rule || !Number.isFinite(Number(rule.xpAmount)) || Number(rule.xpAmount) <= 0) {
      plans.push({
        percent,
        action: "error_missing_rule",
        sourceKey,
        ruleKey,
        xpSourceLabel,
      });
      continue;
    }
    plans.push({
      percent,
      action: "create",
      sourceKey,
      ruleKey,
      xpAmount: Number(rule.xpAmount),
      xpSourceLabel,
    });
  }

  const missingRules = plans.filter((p) => p.action === "error_missing_rule");
  if (missingRules.length) {
    const detail = missingRules.map((p) => p.ruleKey).join(", ");
    throw new Error(`Missing/invalid active XP Reward Rules for: ${detail}`);
  }

  const toCreate = plans.filter((p) => p.action === "create");
  const createdIds = [];
  let skippedByRecheck = 0;

  setDebug("create_xp_events");
  for (const plan of toCreate) {
    // In-memory recheck (covers this run + prior load) + targeted Source Key formula recheck.
    const memHit = tierAlreadyAwarded(
      plan.sourceKey,
      plan.xpSourceLabel,
      existingKeys,
      existingXpSourceLabels
    );
    if (memHit.awarded) {
      skippedByRecheck += 1;
      continue;
    }

    const alreadyId = await findExistingBySourceKey(xpTable, plan.sourceKey);
    if (alreadyId) {
      existingKeys.add(plan.sourceKey);
      skippedByRecheck += 1;
      continue;
    }

    const fields = {};
    addIfWritable(fields, xpTable, CONFIG.xp.sourceKey, plan.sourceKey);
    addIfWritable(fields, xpTable, CONFIG.xp.enrollment, [{ id: enrollmentId }]);
    addIfWritable(fields, xpTable, CONFIG.xp.week, [{ id: weekId }]);
    addIfWritable(fields, xpTable, CONFIG.xp.weeklySummary, [{ id: recordId }]);
    addIfWritable(fields, xpTable, CONFIG.xp.xpPoints, plan.xpAmount);
    addIfWritable(fields, xpTable, CONFIG.xp.xpBucket, { id: bucketOption.id });
    addIfWritable(fields, xpTable, CONFIG.xp.xpSource, { id: sourceOptions[plan.percent].id });
    addIfWritable(fields, xpTable, CONFIG.xp.active, true);
    addIfWritable(
      fields,
      xpTable,
      CONFIG.xp.reasonPublic,
      `Reached ${plan.percent}% of weekly shot goal.`
    );
    addIfWritable(
      fields,
      xpTable,
      CONFIG.xp.reasonDebug,
      `035 ${plan.ruleKey} goalCompletion=${goalCompletion} sourceKey=${plan.sourceKey}`
    );
    addIfWritable(fields, xpTable, CONFIG.xp.xpActivityDate, activityDate);
    if (fieldExists(xpTable, CONFIG.xp.xpActivityDateSource)) {
      try {
        const dateSourceOption = requireSingleSelectOption(
          xpTable,
          CONFIG.xp.xpActivityDateSource,
          CONFIG.values.xpActivityDateSource
        );
        fields[CONFIG.xp.xpActivityDateSource] = { id: dateSourceOption.id };
      } catch (e) {
        // Option may be absent on some bases; Activity Date still written.
      }
    }
    addIfWritable(fields, xpTable, CONFIG.xp.awardedBy, CONFIG.values.awardedBy);

    const created = await xpTable.createRecordAsync(fields);
    createdIds.push(created);
    existingKeys.add(plan.sourceKey);
    existingXpSourceLabels.add(plan.xpSourceLabel);
  }

  setDebug("update_was_status");
  const wasUpdate = {};
  if (fieldExists(wasTable, CONFIG.was.thresholdStatus)) {
    const processed = requireSingleSelectOption(
      wasTable,
      CONFIG.was.thresholdStatus,
      CONFIG.values.statusProcessed
    );
    wasUpdate[CONFIG.was.thresholdStatus] = { id: processed.id };
  }
  if (fieldExists(wasTable, CONFIG.was.thresholdProcessedAt)) {
    wasUpdate[CONFIG.was.thresholdProcessedAt] = new Date();
  }
  if (fieldExists(wasTable, CONFIG.was.requeue)) {
    wasUpdate[CONFIG.was.requeue] = false;
  }
  if (fieldExists(wasTable, CONFIG.was.thresholdError)) {
    wasUpdate[CONFIG.was.thresholdError] = "";
  }
  if (Object.keys(wasUpdate).length) {
    await wasTable.updateRecordAsync(recordId, wasUpdate);
  }

  const skipExistingCount = plans.filter((p) => p.action === "skip_existing").length
    + skippedByRecheck;
  const actionOut = createdIds.length > 0
    ? "created"
    : skipExistingCount > 0
      ? "skipped_existing"
      : "skipped_none_to_create";

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", "");
  setOutputSafe("createdCountOut", createdIds.length);
  setOutputSafe("skippedExistingCountOut", skipExistingCount);
  setOutputSafe(
    "sourceKeysOut",
    plans.map((p) => p.sourceKey || "").filter(Boolean).join(",")
  );
  setOutputSafe("weekEndKeyOut", weekEndKey);
  setOutputSafe("bandCodeOut", bandCode);
  setDebug("done");

  console.log(JSON.stringify({
    automation: SCRIPT.automationName,
    version: SCRIPT.version,
    statusOut: "success",
    actionOut,
    recordId,
    enrollmentId,
    weekId,
    goalCompletion,
    bandCode,
    gradeBandIds,
    weekEndKey,
    createdCount: createdIds.length,
    createdIds,
    skipExistingCount,
    existingXpSourceLabels: [...existingXpSourceLabels],
    plans: plans.map((p) => ({
      percent: p.percent,
      action: p.action,
      skipVia: p.skipVia || "",
      sourceKey: p.sourceKey || "",
      ruleKey: p.ruleKey || "",
      xpAmount: p.xpAmount || 0,
      xpSourceLabel: p.xpSourceLabel || "",
    })),
  }));
}

try {
  await main();
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", debugStep);
  try {
    const inputConfig = input.config();
    const recordId = String(inputConfig.recordId || "").trim();
    if (recordId.startsWith("rec")) {
      const wasTable = base.getTable(CONFIG.tables.weeklySummary);
      const fields = {};
      if (fieldExists(wasTable, CONFIG.was.thresholdStatus)) {
        const errOpt = requireSingleSelectOption(
          wasTable,
          CONFIG.was.thresholdStatus,
          CONFIG.values.statusError
        );
        fields[CONFIG.was.thresholdStatus] = { id: errOpt.id };
      }
      if (fieldExists(wasTable, CONFIG.was.thresholdError)) {
        fields[CONFIG.was.thresholdError] = message.slice(0, 2000);
      }
      if (fieldExists(wasTable, CONFIG.was.requeue)) {
        fields[CONFIG.was.requeue] = false;
      }
      if (Object.keys(fields).length) {
        await wasTable.updateRecordAsync(recordId, fields);
      }
    }
  } catch (statusError) {
    console.log(`Failed to write Threshold XP Error status: ${statusError}`);
  }
  console.log(JSON.stringify({
    automation: SCRIPT.automationName,
    version: SCRIPT.version,
    statusOut: "error",
    actionOut: "error",
    errorOut: message,
    debugStep,
  }));
  throw error;
}
