/*
Extension Script: Preview Weekly Athlete Summary duplicates (challenge year)
System: 127 SI Shooting Challenge
Purpose:
  Dry-run detection of duplicate WAS rows for Enrollment + Week identity.
  Emits repair recommendations only — never merges or deletes.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-challenge-year-was-duplicates",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    was: "Weekly Athlete Summary",
    enrollments: "Enrollments",
    weeks: "Weeks",
  },
  was: {
    enrollment: "Enrollment",
    week: "Week",
    summaryKey: "Summary Key",
    buildNow: "Build Weekly Email Now?",
    sendToMake: "Send to Make?",
    emailSent: "Weekly Email Sent?",
  },
  enrollments: {
    schoolYear: "School Year",
    active: "Active?",
  },
  limits: {
    maxWas: 5000,
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

function firstLinkedId(cell) {
  if (!cell) return null;
  if (Array.isArray(cell) && cell[0]) return cell[0].id || null;
  return cell.id || null;
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

async function main() {
  const opts = requireInput();
  const wasTable = base.getTable(CONFIG.tables.was);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const wasQuery = await wasTable.selectRecordsAsync({
    fields: [
      CONFIG.was.enrollment,
      CONFIG.was.week,
      CONFIG.was.summaryKey,
      CONFIG.was.buildNow,
      CONFIG.was.sendToMake,
      CONFIG.was.emailSent,
    ],
  });
  if (wasQuery.records.length > CONFIG.limits.maxWas) {
    throw new Error("Refuse to continue: WAS scan limit exceeded.");
  }

  const enrQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.schoolYear, CONFIG.enrollments.active],
  });
  const enrYear = new Map();
  for (const rec of enrQuery.records) {
    enrYear.set(rec.id, normalizeYear(rec.getCellValueAsString(CONFIG.enrollments.schoolYear)));
  }

  const byIdentity = new Map();
  const missingLinks = [];
  for (const rec of wasQuery.records) {
    const enrollmentId = firstLinkedId(rec.getCellValue(CONFIG.was.enrollment));
    const weekId = firstLinkedId(rec.getCellValue(CONFIG.was.week));
    if (!enrollmentId || !weekId) {
      missingLinks.push({ wasId: rec.id, enrollmentId, weekId });
      continue;
    }
    const year = enrYear.get(enrollmentId);
    if (year && year !== opts.challengeYear) continue;
    const key = `${enrollmentId}|${weekId}`;
    if (!byIdentity.has(key)) byIdentity.set(key, []);
    byIdentity.get(key).push({
      wasId: rec.id,
      enrollmentId,
      weekId,
      summaryKey: rec.getCellValueAsString(CONFIG.was.summaryKey) || "",
      buildNow: Boolean(rec.getCellValue(CONFIG.was.buildNow)),
      sendToMake: Boolean(rec.getCellValue(CONFIG.was.sendToMake)),
      emailSent: Boolean(rec.getCellValue(CONFIG.was.emailSent)),
    });
  }

  const duplicates = [];
  const repairRecommendations = [];
  for (const [key, rows] of byIdentity.entries()) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort((a, b) => a.wasId.localeCompare(b.wasId));
    duplicates.push({ identity: key, count: rows.length, ids: sorted.map((r) => r.wasId) });
    repairRecommendations.push({
      action: "manual_review_keep_lowest_id",
      keepId: sorted[0].wasId,
      reviewIds: sorted.slice(1).map((r) => r.wasId),
      note: "Dry-run only. Do not auto-merge or delete. Confirm XP/email links first.",
    });
  }

  const report = {
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    dryRun: true,
    configRecordId: opts.configRecordId,
    challengeYear: opts.challengeYear,
    scannedWas: wasQuery.records.length,
    duplicateGroups: duplicates.length,
    duplicates: duplicates.slice(0, 50),
    missingLinks: missingLinks.slice(0, 50),
    repairRecommendations: repairRecommendations.slice(0, 50),
    writesPerformed: 0,
  };

  console.log(JSON.stringify(report, null, 2));
  output.set("statusOut", duplicates.length ? "skipped" : "success");
  output.set("actionOut", "preview_was_duplicates");
  output.set("errorOut", "");
  output.set("debugStep", "complete");
  output.set("dryRunOut", true);
  output.set("duplicateGroupsOut", duplicates.length);
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
