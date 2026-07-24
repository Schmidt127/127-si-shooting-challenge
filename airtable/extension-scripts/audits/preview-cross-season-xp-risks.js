/*
Extension Script: Preview cross-season XP / achievement risks
System: 127 SI Shooting Challenge
Purpose:
  Dry-run list XP Events and Achievement Unlocks whose Enrollment School Year
  does not match the required challenge year (sample).
  Never writes or deletes. Never rewrites historical records.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-cross-season-xp-risks",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    config: "Config",
    enrollments: "Enrollments",
    xp: "XP Events",
    unlocks: "Athlete Achievement Unlocks",
  },
  config: {
    activeSchoolYear: "Active School Year",
  },
  enrollments: {
    schoolYear: "School Year",
  },
  xp: {
    enrollment: "Enrollment",
    sourceKey: "Source Key",
    active: "Active?",
  },
  unlocks: {
    enrollment: "Enrollment",
    week: "Week",
  },
  limits: {
    maxXp: 4000,
    maxUnlocks: 2000,
    sample: 50,
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
  const dryRun = inputConfig.dryRun !== false && inputConfig.dryRun !== "false";
  if (!configRecordId.startsWith("rec")) {
    throw new Error("configRecordId is required (rec…)");
  }
  if (!challengeYear) throw new Error("challengeYear is required (YYYY-YYYY)");
  if (!dryRun) throw new Error("Preview-only. dryRun must remain true.");
  return { configRecordId, challengeYear, dryRun: true };
}

function linkedId(cell) {
  if (!cell) return null;
  if (Array.isArray(cell) && cell[0]) return cell[0].id || null;
  return cell.id || null;
}

async function main() {
  const opts = requireInput();
  const configTable = base.getTable(CONFIG.tables.config);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const xpTable = base.getTable(CONFIG.tables.xp);
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);

  const configQuery = await configTable.selectRecordsAsync({
    fields: [CONFIG.config.activeSchoolYear],
  });
  const byYear = {};
  for (const rec of configQuery.records) {
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.config.activeSchoolYear));
    if (!year) continue;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(rec.id);
  }
  if ((byYear[opts.challengeYear] || []).length > 1) {
    throw new Error(`Refuse: multiple Configs for ${opts.challengeYear}`);
  }
  if (!configQuery.getRecord(opts.configRecordId)) {
    throw new Error(`Config ${opts.configRecordId} not found`);
  }

  const enrollmentsQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.schoolYear],
  });
  const enrollmentYear = {};
  for (const rec of enrollmentsQuery.records) {
    enrollmentYear[rec.id] = normalizeYear(
      rec.getCellValueAsString(CONFIG.enrollments.schoolYear)
    );
  }

  const xpQuery = await xpTable.selectRecordsAsync({
    fields: [CONFIG.xp.enrollment, CONFIG.xp.sourceKey, CONFIG.xp.active],
  });
  const xpRisks = [];
  for (const rec of xpQuery.records) {
    const enrId = linkedId(rec.getCellValue(CONFIG.xp.enrollment));
    const year = enrId ? enrollmentYear[enrId] : null;
    if (year && year !== opts.challengeYear) {
      xpRisks.push({
        xpRecordId: rec.id,
        enrollmentId: enrId,
        enrollmentYear: year,
        sourceKey: rec.getCellValueAsString(CONFIG.xp.sourceKey),
        active: !!rec.getCellValue(CONFIG.xp.active),
        proposed: "review_only_do_not_auto_deactivate",
      });
      if (xpRisks.length >= CONFIG.limits.sample) break;
    }
  }

  const unlocksQuery = await unlocksTable.selectRecordsAsync({
    fields: [CONFIG.unlocks.enrollment, CONFIG.unlocks.week],
  });
  const unlockRisks = [];
  for (const rec of unlocksQuery.records) {
    const enrId = linkedId(rec.getCellValue(CONFIG.unlocks.enrollment));
    const year = enrId ? enrollmentYear[enrId] : null;
    if (year && year !== opts.challengeYear) {
      unlockRisks.push({
        unlockRecordId: rec.id,
        enrollmentId: enrId,
        enrollmentYear: year,
        proposed: "review_only",
      });
      if (unlockRisks.length >= CONFIG.limits.sample) break;
    }
  }

  console.log(
    JSON.stringify(
      {
        script: SCRIPT,
        dryRun: true,
        status: xpRisks.length || unlockRisks.length ? "PASS WITH WARNINGS" : "PASS",
        challengeYear: opts.challengeYear,
        proposedChanges: [],
        findings: { xpRisks, unlockRisks },
        skipped: [],
        note: "Never auto-rewrite historical XP/unlocks from this script",
      },
      null,
      2
    )
  );
}

await main();
