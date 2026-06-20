/*
Automation: 034 - Weekly Summary and Goal Logic - Set Previous Week Helper Values
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
To be confirmed from production script.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
To be confirmed from production script.

Important Fields:
To be confirmed from production script.

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************************************************
 * 034 - WEEKLY SUMMARY AND GOAL LOGIC
 * Set Previous Week Helper Values
 *
 * Version: v3.3
 * Date Written: 2026-05-20
 * Last Updated: 2026-06-17
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary record.
 * - Reads the linked Enrollment and Week.
 * - Finds the previous Weekly Athlete Summary for the same Enrollment.
 * - Uses Weeks -> Start Date to determine chronological order.
 * - Writes previous-week helper values into the current Weekly Athlete Summary.
 * - Sets Summary Calculation Status = Complete.
 * - Sets Perfect Week Automation Status = Pending when that field exists and is writable.
 *
 * IMPORTANT DESIGN RULES
 * - Total Shots This Week is read-only and must not be written by script.
 * - Total XP After Week is read-only and must not be written by script.
 * - Week Start Date comes from the linked Weeks record.
 * - The previous summary must belong to the same Enrollment.
 * - The previous summary must have a Week with Start Date before the current Week Start Date.
 * - If no previous weekly summary exists, Previous Week Shots and Previous Total XP are set to 0.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId = Airtable record ID from the triggering Weekly Athlete Summary record
 ************************************************************************************************/

// @ts-nocheck

async function main() {
  const CONFIG = {
    scriptName: "034 - Weekly Summary and Goal Logic - Set Previous Week Helper Values",
    version: "v3.3",

    tables: {
      weeklySummary: "Weekly Athlete Summary",
      weeks: "Weeks",
    },

    weeklySummary: {
      enrollment: "Enrollment",
      week: "Week",

      totalShotsThisWeek: "Total Shots This Week",
      totalXpAfterWeek: "Total XP After Week",

      previousWeekShots: "Previous Week Shots",
      previousTotalXp: "Previous Total XP",

      summaryCalculationStatus: "Summary Calculation Status",
      perfectWeekAutomationStatus: "Perfect Week Automation Status",
    },

    weeks: {
      startDate: "Start Date",
      weekName: "Week Name",
    },

    statusValues: {
      complete: "Complete",
      error: "Error",
      perfectWeekPending: "Pending",
    },

    outputStatuses: {
      complete: "complete",
      skipped: "skipped",
      error: "error",
    },

    debug: {
      logToConsole: true,
    },
  };

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();

  if (!recordId) {
    throw new Error("Missing required input: recordId");
  }

  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  const fieldCache = new Map();

  function log(message, data = null) {
    if (!CONFIG.debug.logToConsole) return;

    if (data === null || data === undefined) {
      console.log(message);
    } else {
      console.log(message, JSON.stringify(data, null, 2));
    }
  }

  function setOutputSafe(key, value) {
    try {
      output.set(key, value);
    } catch {
      // Ignore output mapping errors.
    }
  }

  function getFieldSafe(table, fieldName) {
    if (!table || !fieldName) return null;

    const cacheKey = `${table.name}:${fieldName}`;

    if (fieldCache.has(cacheKey)) {
      return fieldCache.get(cacheKey);
    }

    try {
      const field = table.getField(fieldName);
      fieldCache.set(cacheKey, field);
      return field;
    } catch {
      fieldCache.set(cacheKey, null);
      return null;
    }
  }

  function fieldExists(table, fieldName) {
    return Boolean(getFieldSafe(table, fieldName));
  }

  function isWritableField(table, fieldName) {
    const field = getFieldSafe(table, fieldName);
    if (!field) return false;

    if (field.isComputed === true) return false;

    const nonWritableTypes = new Set([
      "formula",
      "rollup",
      "count",
      "lookup",
      "multipleLookupValues",
      "createdTime",
      "lastModifiedTime",
      "createdBy",
      "lastModifiedBy",
      "autoNumber",
      "button",
      "aiText",
      "externalSyncSource",
    ]);

    return !nonWritableTypes.has(field.type);
  }

  function requireField(table, fieldName, label) {
    if (!fieldExists(table, fieldName)) {
      throw new Error(`Missing required field: ${label} (${table.name} -> ${fieldName})`);
    }
  }

  function requireWritableField(table, fieldName, label) {
    requireField(table, fieldName, label);

    if (!isWritableField(table, fieldName)) {
      throw new Error(`Required field is not writable: ${label} (${table.name} -> ${fieldName})`);
    }
  }

  function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
  }

  function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
  }

  function getNumber(record, table, fieldName, fallback = 0) {
    const raw = getRaw(record, table, fieldName);

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }

    const displayText = record && fieldExists(table, fieldName)
      ? String(record.getCellValueAsString(fieldName) || "")
      : "";

    const text = String(displayText || raw || "")
      .replace(/[$,%]/g, "")
      .replace(/,/g, "")
      .trim();

    if (!text) return fallback;

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getLinkedRecordIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => item?.id)
      .filter(Boolean);
  }

  function getFirstLinkedRecordId(record, table, fieldName) {
    return getLinkedRecordIds(record, table, fieldName)[0] || "";
  }

  function parseDateValue(value) {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  function dateKeyFromValue(value) {
    const date = parseDateValue(value);
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getDateKey(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";

    const raw = record.getCellValue(fieldName);
    const rawKey = dateKeyFromValue(raw);

    if (rawKey) return rawKey;

    const display = record.getCellValueAsString(fieldName);
    return dateKeyFromValue(display);
  }

  function buildSingleSelectValue(table, fieldName, optionName) {
    const field = getFieldSafe(table, fieldName);

    if (!field) return undefined;

    if (field.type !== "singleSelect") {
      return optionName;
    }

    const cleanOptionName = String(optionName || "").trim();
    const choices = field?.options?.choices || [];

    const match = choices.find((choice) => {
      return (
        String(choice.name || "").trim().toLowerCase() ===
        cleanOptionName.toLowerCase()
      );
    });

    if (!match) {
      const available = choices.map((choice) => choice.name).join(", ");
      throw new Error(
        `Missing single-select option "${cleanOptionName}" in ${table.name}.${fieldName}. Available options: ${available}`
      );
    }

    return { name: match.name };
  }

  async function updateRecordSafe(table, targetRecordId, updates) {
    const safeUpdates = {};

    for (const [fieldName, value] of Object.entries(updates || {})) {
      if (!fieldExists(table, fieldName)) {
        log(`Skipped missing field: ${table.name}.${fieldName}`);
        continue;
      }

      if (!isWritableField(table, fieldName)) {
        log(`Skipped non-writable field: ${table.name}.${fieldName}`);
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      safeUpdates[fieldName] = value;
    }

    if (Object.keys(safeUpdates).length === 0) {
      return [];
    }

    await table.updateRecordAsync(targetRecordId, safeUpdates);
    return Object.keys(safeUpdates);
  }

  function buildWeeklySummaryFieldsToLoad() {
    return [
      CONFIG.weeklySummary.enrollment,
      CONFIG.weeklySummary.week,
      CONFIG.weeklySummary.totalShotsThisWeek,
      CONFIG.weeklySummary.totalXpAfterWeek,
      CONFIG.weeklySummary.previousWeekShots,
      CONFIG.weeklySummary.previousTotalXp,
      CONFIG.weeklySummary.summaryCalculationStatus,
      CONFIG.weeklySummary.perfectWeekAutomationStatus,
    ].filter((fieldName) => fieldExists(weeklySummaryTable, fieldName));
  }

  function buildWeekFieldsToLoad() {
    return [
      CONFIG.weeks.startDate,
      CONFIG.weeks.weekName,
    ].filter((fieldName) => fieldExists(weeksTable, fieldName));
  }

  function setFinalOutputs({
    ok,
    enrollmentId,
    currentWeekId,
    currentWeekStartDate,
    previousSummaryFound,
    previousSummaryId,
    previousWeekShots,
    previousTotalXp,
    summaryCalculationStatus,
    perfectWeekAutomationStatus,
    updatedFields,
    statusOut,
    errorOut,
    debugStep,
  }) {
    setOutputSafe("ok", ok);
    setOutputSafe("recordId", recordId);
    setOutputSafe("enrollmentId", enrollmentId || "");
    setOutputSafe("currentWeekId", currentWeekId || "");
    setOutputSafe("currentWeekStartDate", currentWeekStartDate || "");
    setOutputSafe("previousSummaryFound", Boolean(previousSummaryFound));
    setOutputSafe("previousSummaryId", previousSummaryId || "");
    setOutputSafe("previousWeekShots", previousWeekShots || 0);
    setOutputSafe("previousTotalXp", previousTotalXp || 0);
    setOutputSafe("summaryCalculationStatus", summaryCalculationStatus || "");
    setOutputSafe("perfectWeekAutomationStatus", perfectWeekAutomationStatus || "");
    setOutputSafe("updatedFields", (updatedFields || []).join(", "));
    setOutputSafe("statusOut", statusOut || "");
    setOutputSafe("errorOut", errorOut || "");
    setOutputSafe("debugStep", debugStep || "");
  }

  function assertRequiredSchema() {
    requireField(
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment,
      "Weekly Athlete Summary -> Enrollment"
    );

    requireField(
      weeklySummaryTable,
      CONFIG.weeklySummary.week,
      "Weekly Athlete Summary -> Week"
    );

    requireField(
      weeklySummaryTable,
      CONFIG.weeklySummary.totalShotsThisWeek,
      "Weekly Athlete Summary -> Total Shots This Week"
    );

    requireField(
      weeklySummaryTable,
      CONFIG.weeklySummary.totalXpAfterWeek,
      "Weekly Athlete Summary -> Total XP After Week"
    );

    requireWritableField(
      weeklySummaryTable,
      CONFIG.weeklySummary.previousWeekShots,
      "Weekly Athlete Summary -> Previous Week Shots"
    );

    requireWritableField(
      weeklySummaryTable,
      CONFIG.weeklySummary.previousTotalXp,
      "Weekly Athlete Summary -> Previous Total XP"
    );

    requireWritableField(
      weeklySummaryTable,
      CONFIG.weeklySummary.summaryCalculationStatus,
      "Weekly Athlete Summary -> Summary Calculation Status"
    );

    requireField(
      weeksTable,
      CONFIG.weeks.startDate,
      "Weeks -> Start Date"
    );
  }

  let debugStep = "Start";

  let enrollmentId = "";
  let currentWeekId = "";
  let currentWeekStartDate = "";
  let previousSummaryFound = false;
  let previousSummaryId = "";
  let previousWeekShots = 0;
  let previousTotalXp = 0;
  let updatedFields = [];

  try {
    debugStep = "1 - Validate recordId";
    setOutputSafe("debugStep", debugStep);

    if (!recordId.startsWith("rec")) {
      throw new Error(`Invalid Weekly Athlete Summary recordId input: ${recordId}`);
    }

    debugStep = "2 - Validate schema";
    setOutputSafe("debugStep", debugStep);
    assertRequiredSchema();

    debugStep = "3 - Load Current Weekly Athlete Summary";
    setOutputSafe("debugStep", debugStep);

    const currentSummary = await weeklySummaryTable.selectRecordAsync(recordId, {
      fields: buildWeeklySummaryFieldsToLoad(),
    });

    if (!currentSummary) {
      throw new Error(`Weekly Athlete Summary record not found: ${recordId}`);
    }

    debugStep = "4 - Read Current Links";
    setOutputSafe("debugStep", debugStep);

    enrollmentId = getFirstLinkedRecordId(
      currentSummary,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment
    );

    currentWeekId = getFirstLinkedRecordId(
      currentSummary,
      weeklySummaryTable,
      CONFIG.weeklySummary.week
    );

    log("034 current summary input", {
      recordId,
      enrollmentId,
      currentWeekId,
      enrollmentDisplay: getText(
        currentSummary,
        weeklySummaryTable,
        CONFIG.weeklySummary.enrollment
      ),
      weekDisplay: getText(
        currentSummary,
        weeklySummaryTable,
        CONFIG.weeklySummary.week
      ),
    });

    if (!enrollmentId) {
      throw new Error("Current Weekly Athlete Summary is missing Enrollment.");
    }

    if (!currentWeekId) {
      throw new Error("Current Weekly Athlete Summary is missing Week.");
    }

    debugStep = "5 - Load Current Week";
    setOutputSafe("debugStep", debugStep);

    const currentWeek = await weeksTable.selectRecordAsync(currentWeekId, {
      fields: buildWeekFieldsToLoad(),
    });

    if (!currentWeek) {
      throw new Error(`Linked Week record not found: ${currentWeekId}`);
    }

    currentWeekStartDate = getDateKey(
      currentWeek,
      weeksTable,
      CONFIG.weeks.startDate
    );

    log("034 current week", {
      currentWeekId,
      currentWeekName: getText(currentWeek, weeksTable, CONFIG.weeks.weekName),
      currentWeekStartDate,
      rawStartDate: currentWeek.getCellValue(CONFIG.weeks.startDate),
      displayStartDate: currentWeek.getCellValueAsString(CONFIG.weeks.startDate),
    });

    if (!currentWeekStartDate) {
      throw new Error(
        `Linked Week is missing or has an unreadable Start Date: ${currentWeekId}. Display value: "${currentWeek.getCellValueAsString(CONFIG.weeks.startDate)}"`
      );
    }

    debugStep = "6 - Load All Summaries and Weeks";
    setOutputSafe("debugStep", debugStep);

    const summariesQuery = await weeklySummaryTable.selectRecordsAsync({
      fields: buildWeeklySummaryFieldsToLoad(),
    });

    const weeksQuery = await weeksTable.selectRecordsAsync({
      fields: buildWeekFieldsToLoad(),
    });

    const weekStartById = new Map();

    for (const weekRecord of weeksQuery.records) {
      const startDate = getDateKey(
        weekRecord,
        weeksTable,
        CONFIG.weeks.startDate
      );

      if (startDate) {
        weekStartById.set(weekRecord.id, startDate);
      }
    }

    debugStep = "7 - Find Previous Weekly Summary";
    setOutputSafe("debugStep", debugStep);

    const previousCandidates = summariesQuery.records
      .filter((summaryRecord) => {
        if (summaryRecord.id === recordId) return false;

        const rowEnrollmentId = getFirstLinkedRecordId(
          summaryRecord,
          weeklySummaryTable,
          CONFIG.weeklySummary.enrollment
        );

        if (rowEnrollmentId !== enrollmentId) return false;

        const rowWeekId = getFirstLinkedRecordId(
          summaryRecord,
          weeklySummaryTable,
          CONFIG.weeklySummary.week
        );

        if (!rowWeekId) return false;

        const rowWeekStartDate = weekStartById.get(rowWeekId);

        if (!rowWeekStartDate) return false;

        return rowWeekStartDate < currentWeekStartDate;
      })
      .map((summaryRecord) => {
        const rowWeekId = getFirstLinkedRecordId(
          summaryRecord,
          weeklySummaryTable,
          CONFIG.weeklySummary.week
        );

        return {
          record: summaryRecord,
          weekId: rowWeekId,
          weekStartDate: weekStartById.get(rowWeekId),
        };
      })
      .sort((a, b) => {
        if (a.weekStartDate < b.weekStartDate) return 1;
        if (a.weekStartDate > b.weekStartDate) return -1;
        return 0;
      });

    log("034 previous candidates", {
      count: previousCandidates.length,
      candidates: previousCandidates.slice(0, 5).map((item) => ({
        summaryId: item.record.id,
        weekId: item.weekId,
        weekStartDate: item.weekStartDate,
        totalShotsThisWeek: getNumber(
          item.record,
          weeklySummaryTable,
          CONFIG.weeklySummary.totalShotsThisWeek,
          0
        ),
        totalXpAfterWeek: getNumber(
          item.record,
          weeklySummaryTable,
          CONFIG.weeklySummary.totalXpAfterWeek,
          0
        ),
      })),
    });

    if (previousCandidates.length > 0) {
      const previousSummary = previousCandidates[0].record;

      previousSummaryFound = true;
      previousSummaryId = previousSummary.id;

      previousWeekShots = getNumber(
        previousSummary,
        weeklySummaryTable,
        CONFIG.weeklySummary.totalShotsThisWeek,
        0
      );

      previousTotalXp = getNumber(
        previousSummary,
        weeklySummaryTable,
        CONFIG.weeklySummary.totalXpAfterWeek,
        0
      );
    }

    debugStep = "8 - Write Helper Values";
    setOutputSafe("debugStep", debugStep);

    const completeStatusValue = buildSingleSelectValue(
      weeklySummaryTable,
      CONFIG.weeklySummary.summaryCalculationStatus,
      CONFIG.statusValues.complete
    );

    const updateFields = {
      [CONFIG.weeklySummary.previousWeekShots]: previousWeekShots,
      [CONFIG.weeklySummary.previousTotalXp]: previousTotalXp,
      [CONFIG.weeklySummary.summaryCalculationStatus]: completeStatusValue,
    };

    if (
      fieldExists(weeklySummaryTable, CONFIG.weeklySummary.perfectWeekAutomationStatus) &&
      isWritableField(weeklySummaryTable, CONFIG.weeklySummary.perfectWeekAutomationStatus)
    ) {
      updateFields[CONFIG.weeklySummary.perfectWeekAutomationStatus] =
        buildSingleSelectValue(
          weeklySummaryTable,
          CONFIG.weeklySummary.perfectWeekAutomationStatus,
          CONFIG.statusValues.perfectWeekPending
        );
    }

    updatedFields = await updateRecordSafe(
      weeklySummaryTable,
      recordId,
      updateFields
    );

    debugStep = "9 - Outputs";
    setOutputSafe("debugStep", debugStep);

    setFinalOutputs({
      ok: true,
      enrollmentId,
      currentWeekId,
      currentWeekStartDate,
      previousSummaryFound,
      previousSummaryId,
      previousWeekShots,
      previousTotalXp,
      summaryCalculationStatus: CONFIG.statusValues.complete,
      perfectWeekAutomationStatus: fieldExists(
        weeklySummaryTable,
        CONFIG.weeklySummary.perfectWeekAutomationStatus
      )
        ? CONFIG.statusValues.perfectWeekPending
        : "",
      updatedFields,
      statusOut: CONFIG.outputStatuses.complete,
      errorOut: "",
      debugStep,
    });

    log("034 completed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      recordId,
      enrollmentId,
      currentWeekId,
      currentWeekStartDate,
      previousSummaryFound,
      previousSummaryId,
      previousWeekShots,
      previousTotalXp,
      updatedFields,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    setFinalOutputs({
      ok: false,
      enrollmentId,
      currentWeekId,
      currentWeekStartDate,
      previousSummaryFound,
      previousSummaryId,
      previousWeekShots,
      previousTotalXp,
      summaryCalculationStatus: CONFIG.statusValues.error,
      perfectWeekAutomationStatus: "",
      updatedFields,
      statusOut: CONFIG.outputStatuses.error,
      errorOut: message,
      debugStep: `FAILED AT: ${debugStep}`,
    });

    log("034 failed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      recordId,
      debugStep,
      error: message,
      enrollmentId,
      currentWeekId,
      currentWeekStartDate,
    });

    try {
      if (
        fieldExists(weeklySummaryTable, CONFIG.weeklySummary.summaryCalculationStatus) &&
        isWritableField(weeklySummaryTable, CONFIG.weeklySummary.summaryCalculationStatus)
      ) {
        const errorStatusValue = buildSingleSelectValue(
          weeklySummaryTable,
          CONFIG.weeklySummary.summaryCalculationStatus,
          CONFIG.statusValues.error
        );

        await updateRecordSafe(weeklySummaryTable, recordId, {
          [CONFIG.weeklySummary.summaryCalculationStatus]: errorStatusValue,
        });
      }
    } catch (writebackError) {
      log("034 could not write Error status", {
        error:
          writebackError instanceof Error
            ? writebackError.message
            : String(writebackError),
      });
    }

    throw error;
  }
}

await main();
