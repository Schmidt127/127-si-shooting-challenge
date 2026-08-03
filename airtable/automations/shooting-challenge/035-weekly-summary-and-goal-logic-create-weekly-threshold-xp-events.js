/*
Automation: 035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last GitHub Update: 2026-08-03

Purpose:
Create XP Events for met Weekly Threshold tiers (100% / 125% / 150%) from one Weekly Athlete Summary.

Trigger:
Weekly Athlete Summary when Threshold XP Ready? = 1

Important Tables:
Weekly Athlete Summary, XP Events, XP Reward Rules, Weeks, Enrollments
*/

/************************************************************
 * 035 - WEEKLY SUMMARY AND GOAL LOGIC
 * Create Weekly Threshold XP Events
 *
 * Version: v1.2
 * Date Written: 2026-07-25
 * Last Updated: 2026-08-03
 *
 * VERSION HISTORY
 * - v1.2 (2026-08-03): Treat Airtable percent values as ratios exactly as returned.
 *   Airtable returns 1 = 100%, 1.25 = 125%, and 83.7 = 8,370%.
 *   Removed the v1.1 raw>3 divide-by-100 heuristic that incorrectly skipped 83.7.
 * - v1.1 (2026-07-25): Semantic legacy-key compatibility, inactive skip,
 *   Grade Band rule matching, targeted duplicate checks, richer outputs.
 * - v1.0 (2026-07-25): Initial SC-049 / XP-D1 rebuild.
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events",
  version: "v1.2",
  versionDate: "2026-08-03",
  originalWrittenDate: "2026-07-25",
  lastUpdated: "2026-08-03",
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
  },
  week: { endDate: "End Date", endKey: "Week End Key" },
  enrollment: { gradeBand: "Grade Band", active: "Active?" },
  xpRule: {
    ruleKey: "Rule Key",
    xpAmount: "XP Amount",
    active: "Active?",
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
function setOutputSafe(key, value) { try { output.set(key, value); } catch (e) { console.log(`output ${key}: ${e.message}`); } }
function setDebug(step) { debugStep = step; setOutputSafe("debugStep", step); }
function fieldExists(table, name) { try { table.getField(name); return true; } catch (_) { return false; } }
function getLinkedIds(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item?.id || item).filter(Boolean);
}
function getText(record, fieldName) {
  try { return String(record.getCellValueAsString(fieldName) || "").trim(); } catch (_) { return ""; }
}
function getNumber(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (value == null || value === "") return null;
  const raw = Array.isArray(value) && value.length === 1 ? value[0] : value;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}
function getCheckboxTriState(record, fieldName) {
  const value = record.getCellValue(fieldName);
  const raw = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (raw === true || raw === 1 || raw === "1") return true;
  if (raw === false || raw === 0 || raw === "0") return false;
  return null;
}
function goalMeetsPercent(goalCompletionValue, percent) {
  const ratio = Number(goalCompletionValue);
  if (!Number.isFinite(ratio)) return false;
  return ratio + 1e-9 >= percent / 100;
}
function normalizeGradeBandCode(label) {
  const original = String(label || "").trim();
  const compact = original.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.includes("K2") || original.includes("K-2")) return "K2";
  if (compact.includes("34") || original.includes("3-4")) return "34";
  if (compact.includes("56") || original.includes("5-6")) return "56";
  if (compact.includes("78") || original.includes("7-8")) return "78";
  if (compact.includes("912") || original.includes("9-12")) return "912";
  return "";
}
function toDateKey(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return `${parts.find(p => p.type === "year").value}-${parts.find(p => p.type === "month").value}-${parts.find(p => p.type === "day").value}`;
}
function option(table, fieldName, name) {
  const field = table.getField(fieldName);
  const found = field.options?.choices?.find(choice => choice.name === name);
  if (!found) throw new Error(`Missing option ${table.name}.${fieldName}: ${name}`);
  return found;
}
function writable(fields, table, name, value) {
  if (!fieldExists(table, name)) return;
  const field = table.getField(name);
  if (!field.isComputed) fields[name] = value;
}

async function main() {
  setDebug("validate_input");
  const recordId = String(input.config().recordId || "").trim();
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);

  const wasTable = base.getTable(CONFIG.tables.weeklySummary);
  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  const rulesTable = base.getTable(CONFIG.tables.xpRules);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const was = await wasTable.selectRecordAsync(recordId);
  if (!was) throw new Error(`Weekly Athlete Summary not found: ${recordId}`);
  const enrollmentIds = getLinkedIds(was, CONFIG.was.enrollment);
  const weekIds = getLinkedIds(was, CONFIG.was.week);
  if (enrollmentIds.length !== 1 || weekIds.length !== 1) throw new Error("WAS must have exactly one Enrollment and one Week");
  const enrollmentId = enrollmentIds[0];
  const weekId = weekIds[0];

  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId);
  if (!enrollment) throw new Error(`Enrollment not found: ${enrollmentId}`);
  if (fieldExists(enrollmentsTable, CONFIG.enrollment.active) && getCheckboxTriState(enrollment, CONFIG.enrollment.active) === false) {
    setOutputSafe("statusOut", "skipped"); setOutputSafe("actionOut", "skipped_inactive_enrollment");
    setOutputSafe("errorOut", ""); setOutputSafe("createdCountOut", 0); setOutputSafe("skippedExistingCountOut", 0);
    setDebug("skipped_inactive_enrollment"); return;
  }

  const goalCompletion = getNumber(was, CONFIG.was.goalCompletion);
  if (goalCompletion == null || !goalMeetsPercent(goalCompletion, 100)) {
    setOutputSafe("statusOut", "skipped"); setOutputSafe("actionOut", "skipped_goal_below_100");
    setOutputSafe("errorOut", ""); setOutputSafe("createdCountOut", 0); setOutputSafe("skippedExistingCountOut", 0);
    setDebug("skipped_goal_below_100");
    console.log(JSON.stringify({ automation: SCRIPT.automationName, version: SCRIPT.version, statusOut: "skipped", actionOut: "skipped_goal_below_100", recordId, goalCompletion }));
    return;
  }

  const gradeBandText = getText(was, CONFIG.was.gradeBand) || getText(enrollment, CONFIG.enrollment.gradeBand);
  const bandCode = normalizeGradeBandCode(gradeBandText);
  if (!bandCode) throw new Error(`Unable to normalize Grade Band: ${gradeBandText}`);

  const week = await weeksTable.selectRecordAsync(weekId);
  if (!week) throw new Error(`Week not found: ${weekId}`);
  const weekEndKey = fieldExists(weeksTable, CONFIG.week.endKey) ? getText(week, CONFIG.week.endKey) || toDateKey(week.getCellValue(CONFIG.week.endDate)) : toDateKey(week.getCellValue(CONFIG.week.endDate));
  if (!weekEndKey) throw new Error("Unable to resolve Week End Date");

  const rulesQuery = await rulesTable.selectRecordsAsync();
  const rules = new Map();
  for (const rule of rulesQuery.records) {
    const key = getText(rule, CONFIG.xpRule.ruleKey);
    if (!key || getCheckboxTriState(rule, CONFIG.xpRule.active) === false) continue;
    const amount = getNumber(rule, CONFIG.xpRule.xpAmount);
    if (amount != null && amount > 0) rules.set(key, amount);
  }

  const xpQuery = await xpTable.selectRecordsAsync({ fields: [CONFIG.xp.sourceKey, CONFIG.xp.enrollment, CONFIG.xp.week, CONFIG.xp.xpSource] });
  const existingKeys = new Set();
  const existingLabels = new Set();
  for (const event of xpQuery.records) {
    if (!getLinkedIds(event, CONFIG.xp.enrollment).includes(enrollmentId) || !getLinkedIds(event, CONFIG.xp.week).includes(weekId)) continue;
    const key = getText(event, CONFIG.xp.sourceKey); if (key) existingKeys.add(key);
    const label = getText(event, CONFIG.xp.xpSource); if (label) existingLabels.add(label);
  }

  const bucketOption = option(xpTable, CONFIG.xp.xpBucket, CONFIG.values.xpBucket);
  const plans = [];
  const creates = [];
  let skippedExisting = 0;
  for (const percent of CONFIG.thresholdPercents) {
    if (!goalMeetsPercent(goalCompletion, percent)) continue;
    const sourceLabel = `Weekly Threshold ${percent}`;
    const sourceKey = `${CONFIG.values.sourceKeyPrefix}${enrollmentId}|${weekId}|${percent}`;
    const ruleKey = `WEEKLY_THRESHOLD_${percent}_${bandCode}`;
    if (existingKeys.has(sourceKey) || existingLabels.has(sourceLabel)) {
      skippedExisting += 1;
      plans.push({ percent, action: "skip_existing", skipVia: existingKeys.has(sourceKey) ? "source_key" : "xp_source_label", sourceKey, ruleKey, xpAmount: 0, xpSourceLabel: sourceLabel });
      continue;
    }
    const xpAmount = rules.get(ruleKey);
    if (!xpAmount) throw new Error(`Missing active XP Reward Rule: ${ruleKey}`);
    const fields = {};
    writable(fields, xpTable, CONFIG.xp.sourceKey, sourceKey);
    writable(fields, xpTable, CONFIG.xp.enrollment, [{ id: enrollmentId }]);
    writable(fields, xpTable, CONFIG.xp.week, [{ id: weekId }]);
    writable(fields, xpTable, CONFIG.xp.weeklySummary, [{ id: recordId }]);
    writable(fields, xpTable, CONFIG.xp.xpPoints, xpAmount);
    writable(fields, xpTable, CONFIG.xp.xpBucket, { id: bucketOption.id });
    writable(fields, xpTable, CONFIG.xp.xpSource, { id: option(xpTable, CONFIG.xp.xpSource, sourceLabel).id });
    writable(fields, xpTable, CONFIG.xp.active, true);
    writable(fields, xpTable, CONFIG.xp.reasonPublic, `Weekly goal threshold reached: ${percent}%`);
    writable(fields, xpTable, CONFIG.xp.reasonDebug, `${ruleKey}; WAS=${recordId}`);
    writable(fields, xpTable, CONFIG.xp.xpActivityDate, `${weekEndKey}T12:00:00.000Z`);
    if (fieldExists(xpTable, CONFIG.xp.xpActivityDateSource)) writable(fields, xpTable, CONFIG.xp.xpActivityDateSource, { id: option(xpTable, CONFIG.xp.xpActivityDateSource, CONFIG.values.xpActivityDateSource).id });
    writable(fields, xpTable, CONFIG.xp.awardedBy, CONFIG.values.awardedBy);
    creates.push({ fields });
    plans.push({ percent, action: "create", skipVia: "", sourceKey, ruleKey, xpAmount, xpSourceLabel: sourceLabel });
  }

  const createdIds = [];
  for (let i = 0; i < creates.length; i += 50) createdIds.push(...await xpTable.createRecordsAsync(creates.slice(i, i + 50)));
  const wasUpdates = {};
  writable(wasUpdates, wasTable, CONFIG.was.thresholdStatus, CONFIG.values.statusProcessed);
  writable(wasUpdates, wasTable, CONFIG.was.thresholdProcessedAt, new Date().toISOString());
  writable(wasUpdates, wasTable, CONFIG.was.thresholdError, "");
  writable(wasUpdates, wasTable, CONFIG.was.requeue, false);
  if (Object.keys(wasUpdates).length) await wasTable.updateRecordAsync(recordId, wasUpdates);

  const actionOut = createdIds.length ? "created" : "skipped_existing";
  setOutputSafe("statusOut", "success"); setOutputSafe("actionOut", actionOut); setOutputSafe("errorOut", "");
  setOutputSafe("createdCountOut", createdIds.length); setOutputSafe("skippedExistingCountOut", skippedExisting);
  setOutputSafe("sourceKeysOut", plans.map(p => p.sourceKey).join(",")); setOutputSafe("weekEndKeyOut", weekEndKey); setOutputSafe("bandCodeOut", bandCode);
  setDebug("done");
  console.log(JSON.stringify({ automation: SCRIPT.automationName, version: SCRIPT.version, statusOut: "success", actionOut, recordId, enrollmentId, weekId, goalCompletion, bandCode, weekEndKey, createdCount: createdIds.length, createdIds, skipExistingCount: skippedExisting, plans }));
}

main().catch(async (error) => {
  setOutputSafe("statusOut", "error"); setOutputSafe("actionOut", "error"); setOutputSafe("errorOut", error?.message || String(error)); setOutputSafe("createdCountOut", 0);
  setDebug(`error:${debugStep}`); console.log(error);
});
