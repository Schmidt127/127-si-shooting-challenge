const NUMBER_FIELDS = [
  "Lifetime XP Total",
  "Lifetime XP Manual Adjustments",
  "Total Submissions",
  "Total Homework Completions",
  "Total Video Submissions",
  "Total Zoom Attendances",
  "Longest Streak Days",
];

const TEXT_FIELDS = [
  "School Year",
];

const BOOLEAN_FIELDS = ["Active?"];

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === "1";
}

function normalizeRecordValue(record, fieldName) {
  const value = record[fieldName];

  if (NUMBER_FIELDS.includes(fieldName)) return normalizeNumber(value);
  if (BOOLEAN_FIELDS.includes(fieldName)) return normalizeBoolean(value);
  return normalizeText(value);
}

export function buildGateRulesSignature(gateRules = []) {
  return gateRules
    .map((rule) => ({
      id: normalizeText(rule.id),
      level: normalizeText(rule.level),
      schoolYear: normalizeText(rule.schoolYear),
      ruleSet: normalizeText(rule.ruleSet),
      versionActive: normalizeBoolean(rule.versionActive),
      gateEnabled: normalizeBoolean(rule.gateEnabled),
      minimumSubmissions: normalizeNumber(rule.minimumSubmissions),
      minimumHomework: normalizeNumber(rule.minimumHomework),
      minimumVideos: normalizeNumber(rule.minimumVideos),
      minimumZoomMeetings: normalizeNumber(rule.minimumZoomMeetings),
      minimumStreakDays: normalizeNumber(rule.minimumStreakDays),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function buildProgressionSignature(record, gateRules = []) {
  const values = {};

  for (const fieldName of [...NUMBER_FIELDS, ...TEXT_FIELDS, ...BOOLEAN_FIELDS]) {
    values[fieldName] = normalizeRecordValue(record, fieldName);
  }

  return JSON.stringify({
    version: 1,
    enrollmentId: normalizeText(record.id),
    values,
    gateRules: buildGateRulesSignature(gateRules),
  });
}

export function shouldQueueRecalculation({
  currentSignature,
  lastQueuedSignature,
  levelRecalcNeeded,
}) {
  if (levelRecalcNeeded === true) {
    return {
      queue: false,
      reason: "already_pending",
    };
  }

  if (normalizeText(currentSignature) === normalizeText(lastQueuedSignature)) {
    return {
      queue: false,
      reason: "unchanged_signature",
    };
  }

  return {
    queue: true,
    reason: lastQueuedSignature ? "signature_changed" : "initial_signature",
  };
}

export { NUMBER_FIELDS, TEXT_FIELDS, BOOLEAN_FIELDS };
