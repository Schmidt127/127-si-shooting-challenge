/*
Extension Script: Preview stale weekly-email build/send flags
System: 127 SI Shooting Challenge
Purpose:
  Dry-run scan for WAS rows with Build/Send/Sent flags whose Enrollment
  School Year != required challenge year (possible copied flags / wrong season).
  Never clears flags automatically. Never deletes.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-stale-email-flags",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    config: "Config",
    enrollments: "Enrollments",
    was: "Weekly Athlete Summary",
  },
  config: {
    activeSchoolYear: "Active School Year",
  },
  enrollments: {
    schoolYear: "School Year",
  },
  was: {
    enrollment: "Enrollment",
    week: "Week",
    buildNow: "Build Weekly Email Now?",
    ready: "Weekly Email Ready?",
    sendToMake: "Send to Make?",
    sent: "Weekly Email Sent?",
  },
  limits: {
    maxWas: 5000,
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
  const wasTable = base.getTable(CONFIG.tables.was);

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

  const wasQuery = await wasTable.selectRecordsAsync({
    fields: [
      CONFIG.was.enrollment,
      CONFIG.was.week,
      CONFIG.was.buildNow,
      CONFIG.was.ready,
      CONFIG.was.sendToMake,
      CONFIG.was.sent,
    ],
  });

  const stale = [];
  for (const rec of wasQuery.records) {
    const enrId = linkedId(rec.getCellValue(CONFIG.was.enrollment));
    const year = enrId ? enrollmentYear[enrId] : null;
    const buildNow = !!rec.getCellValue(CONFIG.was.buildNow);
    const ready = !!rec.getCellValue(CONFIG.was.ready);
    const sendToMake = !!rec.getCellValue(CONFIG.was.sendToMake);
    const sent = !!rec.getCellValue(CONFIG.was.sent);
    const anyFlag = buildNow || ready || sendToMake || sent;
    if (!anyFlag) continue;
    if (year && year !== opts.challengeYear) {
      stale.push({
        wasRecordId: rec.id,
        enrollmentId: enrId,
        enrollmentYear: year,
        flags: { buildNow, ready, sendToMake, sent },
        proposed: "manual_clear_only_after_mike_review",
      });
      if (stale.length >= CONFIG.limits.sample) break;
    }
  }

  console.log(
    JSON.stringify(
      {
        script: SCRIPT,
        dryRun: true,
        status: stale.length ? "PASS WITH WARNINGS" : "PASS",
        challengeYear: opts.challengeYear,
        findings: { staleEmailFlags: stale },
        proposedChanges: [],
        skipped: [],
        note: "Do not clear Weekly Email Sent? on historical seasons from this script",
      },
      null,
      2
    )
  );
}

await main();
