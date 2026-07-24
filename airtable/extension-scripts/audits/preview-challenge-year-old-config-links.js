/*
Extension Script: Preview records linked to an old Config / prior challenge year
System: 127 SI Shooting Challenge
Purpose:
  Dry-run listing of Enrollments (and related counts) still tied to a prior
  challenge year while a new Config is being prepared. Never rewrites links.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-challenge-year-old-config-links",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    enrollments: "Enrollments",
    was: "Weekly Athlete Summary",
  },
  enrollments: {
    schoolYear: "School Year",
    active: "Active?",
    athlete: "Athlete",
    programInstance: "Program Instance",
  },
  was: {
    enrollment: "Enrollment",
  },
  limits: {
    maxEnrollments: 3000,
    maxWas: 5000,
    sampleLimit: 40,
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
  const challengeYear = normalizeYear(inputConfig.challengeYear); // NEW year
  const priorChallengeYear = normalizeYear(inputConfig.priorChallengeYear);
  const dryRun = inputConfig.dryRun !== false && inputConfig.dryRun !== "false";
  if (!configRecordId.startsWith("rec")) {
    throw new Error("configRecordId (new Config) is required (rec…)");
  }
  if (!challengeYear) throw new Error("challengeYear (new year) is required");
  if (!priorChallengeYear) {
    throw new Error("priorChallengeYear is required");
  }
  if (challengeYear === priorChallengeYear) {
    throw new Error("challengeYear and priorChallengeYear must differ");
  }
  if (!dryRun) throw new Error("Preview-only. dryRun must remain true.");
  return { configRecordId, challengeYear, priorChallengeYear, dryRun: true };
}

async function main() {
  const opts = requireInput();
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const wasTable = base.getTable(CONFIG.tables.was);

  const enrQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [
      CONFIG.enrollments.schoolYear,
      CONFIG.enrollments.active,
      CONFIG.enrollments.athlete,
      CONFIG.enrollments.programInstance,
    ],
  });
  if (enrQuery.records.length > CONFIG.limits.maxEnrollments) {
    throw new Error("Refuse to continue: enrollment scan limit exceeded.");
  }

  const priorActive = [];
  const priorInactive = [];
  for (const rec of enrQuery.records) {
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.enrollments.schoolYear));
    if (year !== opts.priorChallengeYear) continue;
    const row = {
      enrollmentId: rec.id,
      active: Boolean(rec.getCellValue(CONFIG.enrollments.active)),
      schoolYear: year,
    };
    if (row.active) priorActive.push(row);
    else priorInactive.push(row);
  }

  const wasQuery = await wasTable.selectRecordsAsync({
    fields: [CONFIG.was.enrollment],
  });
  if (wasQuery.records.length > CONFIG.limits.maxWas) {
    throw new Error("Refuse to continue: WAS scan limit exceeded.");
  }

  const priorIds = new Set([...priorActive, ...priorInactive].map((r) => r.enrollmentId));
  let wasLinkedToPrior = 0;
  for (const rec of wasQuery.records) {
    const cell = rec.getCellValue(CONFIG.was.enrollment);
    const enrId = Array.isArray(cell) && cell[0] ? cell[0].id : null;
    if (enrId && priorIds.has(enrId)) wasLinkedToPrior += 1;
  }

  const report = {
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    dryRun: true,
    newConfigRecordId: opts.configRecordId,
    newChallengeYear: opts.challengeYear,
    priorChallengeYear: opts.priorChallengeYear,
    priorActiveEnrollmentCount: priorActive.length,
    priorInactiveEnrollmentCount: priorInactive.length,
    wasLinkedToPriorCount: wasLinkedToPrior,
    samplePriorActive: priorActive.slice(0, CONFIG.limits.sampleLimit),
    proposedChanges: [],
    writesPerformed: 0,
    note: "Dry-run only. Prior-year rows should usually remain historical — do not rewrite links automatically.",
  };

  console.log(JSON.stringify(report, null, 2));
  output.set("statusOut", "success");
  output.set("actionOut", "preview_old_config_links");
  output.set("errorOut", "");
  output.set("debugStep", "complete");
  output.set("dryRunOut", true);
  output.set("priorActiveCountOut", priorActive.length);
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
