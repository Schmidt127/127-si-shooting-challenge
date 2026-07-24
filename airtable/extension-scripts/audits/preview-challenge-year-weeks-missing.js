/*
Extension Script: Preview missing Challenge-Year Week records
System: 127 SI Shooting Challenge
Purpose:
  Dry-run preview of Weeks missing from the expected challenge-year plan
  (Week 0, Week 1..N, Post-Challenge). Never creates or deletes records.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
Default: DRY RUN only
Requires: explicit Config record ID + challenge-year label inputs
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-challenge-year-weeks-missing",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    weeks: "Weeks",
    config: "Config",
    programInstance: "Program Instance - Synced",
  },
  weeks: {
    name: "Week Name",
    startDate: "Start Date",
    endDate: "End Date",
    weekKey: "Week Key",
    programInstance: "Program Instance",
  },
  config: {
    activeSchoolYear: "Active School Year",
    challengeWeekCount: "Challenge Week Count",
  },
  limits: {
    maxWeeksScan: 500,
  },
};

function requireInput() {
  const inputConfig = input.config();
  const configRecordId = String(inputConfig.configRecordId || "").trim();
  const challengeYear = String(inputConfig.challengeYear || "").trim();
  const regularWeeks = Number(inputConfig.regularWeeks || 0);
  const weekZeroStart = String(inputConfig.weekZeroStart || "").trim();
  const dryRun = inputConfig.dryRun !== false && inputConfig.dryRun !== "false";

  if (!configRecordId.startsWith("rec")) {
    throw new Error("configRecordId is required and must start with rec");
  }
  if (!/^\d{4}-\d{4}$/.test(challengeYear.replace(/[–—]/g, "-"))) {
    throw new Error("challengeYear is required (YYYY-YYYY)");
  }
  if (!dryRun) {
    throw new Error(
      "This helper is preview-only. dryRun must remain true. It never writes."
    );
  }
  return {
    configRecordId,
    challengeYear: challengeYear.replace(/[–—]/g, "-"),
    regularWeeks,
    weekZeroStart,
    dryRun: true,
  };
}

function expectedLabels(regularWeeks) {
  const labels = ["Week 0"];
  const n = Number.isInteger(regularWeeks) && regularWeeks > 0 ? regularWeeks : 0;
  for (let i = 1; i <= n; i += 1) labels.push(`Week ${i}`);
  labels.push("Post-Challenge");
  return labels;
}

async function main() {
  const opts = requireInput();
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  const query = await weeksTable.selectRecordsAsync({
    fields: [
      CONFIG.weeks.name,
      CONFIG.weeks.startDate,
      CONFIG.weeks.endDate,
      CONFIG.weeks.weekKey,
      CONFIG.weeks.programInstance,
    ],
  });

  if (query.records.length > CONFIG.limits.maxWeeksScan) {
    throw new Error(
      `Refuse to continue: Weeks count ${query.records.length} exceeds scan limit ${CONFIG.limits.maxWeeksScan}.`
    );
  }

  const existingNames = new Set(
    query.records.map((r) => String(r.getCellValueAsString(CONFIG.weeks.name) || "").trim())
  );

  const expected = expectedLabels(opts.regularWeeks);
  const missing = expected.filter((label) => !existingNames.has(label));
  const present = expected.filter((label) => existingNames.has(label));

  const proposedCreates = missing.map((label) => ({
    action: "create_week_proposed",
    weekName: label,
    challengeYear: opts.challengeYear,
    configRecordId: opts.configRecordId,
    weekKeyCanonical: `${opts.challengeYear}|${label}`,
    note: "Dry-run only. Import via generated CSV; do not auto-create from this script.",
  }));

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        dryRun: true,
        configRecordId: opts.configRecordId,
        challengeYear: opts.challengeYear,
        weekZeroStart: opts.weekZeroStart || null,
        regularWeeks: opts.regularWeeks || null,
        scannedWeeks: query.records.length,
        expected,
        present,
        missing,
        proposedCreates,
        writesPerformed: 0,
      },
      null,
      2
    )
  );

  output.set("statusOut", missing.length ? "skipped" : "success");
  output.set("actionOut", missing.length ? "preview_missing_weeks" : "preview_complete");
  output.set("errorOut", "");
  output.set("debugStep", "complete");
  output.set("missingCountOut", missing.length);
  output.set("dryRunOut", true);
}

try {
  await main();
} catch (error) {
  console.error(error);
  output.set("statusOut", "error");
  output.set("actionOut", "error");
  output.set("errorOut", error && error.message ? error.message : String(error));
  output.set("debugStep", "error");
  throw error;
}
