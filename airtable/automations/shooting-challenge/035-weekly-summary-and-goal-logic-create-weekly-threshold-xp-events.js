/*
Automation: 035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth — PROD paste only after Mike UI attestation
Last GitHub Update: 2026-07-25

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
 * Version: v1.0
 * Date Written: 2026-07-25
 * Last Updated: 2026-07-25
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary (WAS) when Threshold XP Ready? = 1.
 * - Awards one XP Event per met goal tier: 100%, 125%, 150%.
 * - Amounts come from active XP Reward Rules
 *   WEEKLY_THRESHOLD_{100|125|150}_{K2|34|56|78|912}.
 * - Prevents duplicates with Source Key:
 *      WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}
 * - Writes XP Activity Date from Week End Date (America/Denver).
 * - Marks WAS Threshold XP Status = Processed and clears Requeue Threshold XP.
 *
 * IMPORTANT DESIGN RULES
 * - One WAS × percent tier = one XP Event (append-only; recheck-before-create).
 * - Do not write formula/rollup fields (Goal Completion %, Threshold XP Ready?).
 * - Do not invent XP amounts — missing/invalid rules error that tier.
 * - XP Bucket = "Weekly Threshold".
 * - XP Source = "Weekly Threshold 100" | "Weekly Threshold 125" | "Weekly Threshold 150".
 * - XP Activity Date Source = "Weekly Summary Week End Date" when that option exists.
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
  version: "v1.0",
  versionDate: "2026-07-25",
  originalWrittenDate: "2026-07-25",
  lastUpdated: "2026-07-25",
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

function buildSourceKey(enrollmentId, weekId, percent) {
  return `${CONFIG.values.sourceKeyPrefix}${enrollmentId}|${weekId}|${percent}`;
}

function buildRuleKey(percent, bandCode) {
  return `WEEKLY_THRESHOLD_${percent}_${bandCode}`;
}

function goalMeetsPercent(goalCompletionValue, percent) {
  const raw = Number(goalCompletionValue);
  if (!Number.isFinite(raw)) return false;
  const ratio = raw > 3 ? raw / 100 : raw;
  return ratio + 1e-9 >= percent / 100;
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
    const label = `Weekly Threshold ${percent}`;
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

  const goalCompletion = getNumber(was, CONFIG.was.goalCompletion);
  if (goalCompletion == null || !goalMeetsPercent(goalCompletion, 100)) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_goal_below_100");
    setOutputSafe("errorOut", "");
    setOutputSafe("createdCountOut", 0);
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
  let gradeBandText = getText(was, CONFIG.was.gradeBand);
  if (!gradeBandText && fieldExists(enrollmentsTable, CONFIG.enrollment.gradeBand)) {
    const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, {
      fields: [CONFIG.enrollment.gradeBand],
    });
    if (enrollment) gradeBandText = getText(enrollment, CONFIG.enrollment.gradeBand);
  }
  const bandCode = normalizeGradeBandCode(gradeBandText);
  if (!bandCode) {
    throw new Error(`Unable to normalize Grade Band for threshold rules: "${gradeBandText}"`);
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
  for (const rule of rulesQuery.records) {
    const active = !fieldExists(rulesTable, CONFIG.xpRule.active)
      || getCheckbox(rule, CONFIG.xpRule.active);
    if (!active) continue;
    const ruleKey = getText(rule, CONFIG.xpRule.ruleKey);
    if (!ruleKey) continue;
    if (rulesByKey[ruleKey]) {
      throw new Error(`Duplicate active XP Reward Rule key: ${ruleKey}`);
    }
    rulesByKey[ruleKey] = {
      id: rule.id,
      xpAmount: getNumber(rule, CONFIG.xpRule.xpAmount),
    };
  }
  try {
    rulesQuery.unloadData();
  } catch (e) {
    // optional
  }

  setDebug("load_existing_source_keys");
  const existingKeys = new Set();
  const xpQuery = await xpTable.selectRecordsAsync({
    fields: [CONFIG.xp.sourceKey, CONFIG.xp.enrollment, CONFIG.xp.week].filter((f) =>
      fieldExists(xpTable, f)
    ),
  });
  for (const xp of xpQuery.records) {
    const key = getText(xp, CONFIG.xp.sourceKey);
    if (!key || !key.startsWith(CONFIG.values.sourceKeyPrefix)) continue;
    const xpEnrollmentIds = fieldExists(xpTable, CONFIG.xp.enrollment)
      ? getLinkedIds(xp, CONFIG.xp.enrollment)
      : [];
    if (xpEnrollmentIds.length && !xpEnrollmentIds.includes(enrollmentId)) continue;
    existingKeys.add(key);
  }
  try {
    xpQuery.unloadData();
  } catch (e) {
    // optional
  }

  setDebug("plan_awards");
  const plans = [];
  for (const percent of CONFIG.thresholdPercents) {
    if (!goalMeetsPercent(goalCompletion, percent)) {
      plans.push({ percent, action: "skip_not_met" });
      continue;
    }
    const sourceKey = buildSourceKey(enrollmentId, weekId, percent);
    const ruleKey = buildRuleKey(percent, bandCode);
    const rule = rulesByKey[ruleKey];
    if (existingKeys.has(sourceKey)) {
      plans.push({ percent, action: "skip_existing", sourceKey, ruleKey });
      continue;
    }
    if (!rule || !Number.isFinite(Number(rule.xpAmount)) || Number(rule.xpAmount) <= 0) {
      plans.push({ percent, action: "error_missing_rule", sourceKey, ruleKey });
      continue;
    }
    plans.push({
      percent,
      action: "create",
      sourceKey,
      ruleKey,
      xpAmount: Number(rule.xpAmount),
      xpSourceLabel: `Weekly Threshold ${percent}`,
    });
  }

  const missingRules = plans.filter((p) => p.action === "error_missing_rule");
  if (missingRules.length) {
    const detail = missingRules.map((p) => p.ruleKey).join(", ");
    throw new Error(`Missing/invalid active XP Reward Rules for: ${detail}`);
  }

  const toCreate = plans.filter((p) => p.action === "create");
  const createdIds = [];

  setDebug("create_xp_events");
  for (const plan of toCreate) {
    // Recheck-before-create for this exact Source Key.
    const recheck = await xpTable.selectRecordsAsync({
      fields: [CONFIG.xp.sourceKey],
    });
    let already = null;
    for (const xp of recheck.records) {
      if (getText(xp, CONFIG.xp.sourceKey) === plan.sourceKey) {
        already = xp.id;
        break;
      }
    }
    try {
      recheck.unloadData();
    } catch (e) {
      // optional
    }
    if (already) {
      existingKeys.add(plan.sourceKey);
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

  const skipExistingCount = plans.filter((p) => p.action === "skip_existing").length;
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
  setOutputSafe("sourceKeysOut", plans.map((p) => p.sourceKey || "").filter(Boolean).join(","));
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
    weekEndKey,
    createdCount: createdIds.length,
    createdIds,
    plans: plans.map((p) => ({
      percent: p.percent,
      action: p.action,
      sourceKey: p.sourceKey || "",
      ruleKey: p.ruleKey || "",
      xpAmount: p.xpAmount || 0,
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
