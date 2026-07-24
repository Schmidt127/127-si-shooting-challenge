/*
Extension Script: Preview Season Launch rollback changes
System: 127 SI Shooting Challenge
Purpose:
  Dry-run preview of rollback from a target (new) Config to a prior Config.
  Requires explicit Config record ID (the new/aborting year) + challenge-year label.
  Never writes or deletes.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-season-launch-rollback",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    config: "Config",
  },
  config: {
    activeSchoolYear: "Active School Year",
  },
};

function normalizeYear(raw) {
  const text = String(raw || "")
    .trim()
    .replace(/[–—]/g, "-");
  const m = /^(\d{4})-(\d{4})$/.exec(text);
  if (!m || Number(m[2]) !== Number(m[1]) + 1) return null;
  return `${m[1]}-${m[2]}`;
}

function requireInput() {
  const inputConfig = input.config();
  const configRecordId = String(inputConfig.configRecordId || "").trim();
  const challengeYear = normalizeYear(inputConfig.challengeYear);
  const priorConfigRecordId = String(inputConfig.priorConfigRecordId || "").trim();
  const dryRun = inputConfig.dryRun !== false && inputConfig.dryRun !== "false";
  if (!configRecordId.startsWith("rec")) {
    throw new Error("configRecordId is required (rec…) — the Config being rolled back");
  }
  if (!challengeYear) throw new Error("challengeYear is required (YYYY-YYYY)");
  if (!dryRun) throw new Error("Preview-only. dryRun must remain true.");
  if (priorConfigRecordId && !priorConfigRecordId.startsWith("rec")) {
    throw new Error("priorConfigRecordId must be rec… when provided");
  }
  return { configRecordId, challengeYear, priorConfigRecordId, dryRun: true };
}

async function main() {
  const opts = requireInput();
  const configTable = base.getTable(CONFIG.tables.config);
  const configQuery = await configTable.selectRecordsAsync({
    fields: [CONFIG.config.activeSchoolYear],
  });

  const target = configQuery.getRecord(opts.configRecordId);
  if (!target) throw new Error(`Config ${opts.configRecordId} not found`);
  const targetYear = normalizeYear(
    target.getCellValueAsString(CONFIG.config.activeSchoolYear)
  );
  if (targetYear !== opts.challengeYear) {
    throw new Error(
      `Config year ${targetYear || "(blank)"} != required ${opts.challengeYear}`
    );
  }

  const others = configQuery.records
    .filter((r) => r.id !== opts.configRecordId)
    .map((r) => ({
      id: r.id,
      year: normalizeYear(r.getCellValueAsString(CONFIG.config.activeSchoolYear)),
    }))
    .filter((r) => r.year);

  let prior = null;
  if (opts.priorConfigRecordId) {
    prior = others.find((r) => r.id === opts.priorConfigRecordId) || null;
    if (!prior) throw new Error(`priorConfigRecordId ${opts.priorConfigRecordId} not found`);
  } else {
    // Prefer immediately previous school year if present
    const [y1] = opts.challengeYear.split("-").map(Number);
    const prevLabel = `${y1 - 1}-${y1}`;
    prior = others.find((r) => r.year === prevLabel) || others[0] || null;
  }

  const proposed = [
    {
      action: "restore_prior_operational_config",
      priorConfigRecordId: prior ? prior.id : null,
      priorYear: prior ? prior.year : null,
      note: prior
        ? "Operator must restore current flags to prior Config"
        : "BLOCKING: no prior Config found — Mike must choose restore target",
    },
    {
      action: "mark_new_config_rolled_back",
      configRecordId: opts.configRecordId,
      challengeYear: opts.challengeYear,
      note: "Set Launch Status Rolled Back if field exists; do not delete Config",
    },
    {
      action: "restore_fillout_hidden_fields",
      note: "UI: prior School Year / Program Instance / Config ids from screenshot",
    },
    {
      action: "optional_abort_email_schedules",
      note: "Only if aborting email: turn 118/119 OFF — not a routine step",
    },
    {
      action: "preserve_bulk_email_make_scenario",
      scenario: "Weekly Athlete Summary - Bulk Email - May 18",
    },
  ];

  const status = prior ? "PASS" : "FAIL";
  console.log(
    JSON.stringify(
      {
        script: SCRIPT,
        dryRun: true,
        status,
        proposedChanges: proposed,
        skipped: [],
        destructiveOperations: "none",
      },
      null,
      2
    )
  );
  if (status === "FAIL") {
    throw new Error("Rollback preview FAIL: no prior Config restore target");
  }
}

await main();
