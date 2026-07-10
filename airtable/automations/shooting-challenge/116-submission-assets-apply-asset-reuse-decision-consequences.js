/*
Automation: 116 - Submission Assets - Apply Asset Reuse Decision Consequences
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-07-10 (DEV deployed and validated)
Last GitHub Update: 2026-07-10

Purpose:
Applies C-023 Stage 5 duplicate consequences when Mike updates Asset Reuse Decision on a Submission Asset.

Trigger:
Submission Assets when Asset Reuse Decision is updated.

Important Tables:
Submission Assets, Video Feedback, Homework Completions, XP Events, Enrollments

Important Fields:
Asset Reuse Decision, Duplicate Resolution Applied?, Do Not Award XP?, Award Status, Active?

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Does not modify Lambda detection or upload automations 070a/070b.
*/

/************************************************************
 * 116 - SUBMISSION ASSETS
 * Apply Asset Reuse Decision Consequences (C-023 Stage 5)
 *
 * Version: v1.0.1
 * Date Written: 2026-07-10
 * Last Updated: 2026-07-10
 *
 * VERSION HISTORY
 * - v1.0 (2026-07-10): Initial DEV Stage 5 consequence workflow.
 * - v1.0.1 (2026-07-10): Write dateTime fields with Date objects; notes-only Upload Destination read.
 *
 * PURPOSE
 * - Runs from one Submission Asset when Mike updates Asset Reuse Decision.
 * - Keeps Lambda detection separate from operator consequences.
 * - Confirmed Duplicate → zero XP (deactivate ledger row, block future award).
 * - Approved Reuse / False Positive → restore XP idempotently when reversing Confirmed.
 * - Not Reviewed → no automatic consequence (pipeline continues by default).
 *
 * IMPORTANT DESIGN RULES
 * - Never delete Submission Assets, activity rows, or S3 objects.
 * - One activity source → at most one XP Event (reactivate same row on reversal).
 * - Idempotent: re-selecting the same decision makes no additional changes.
 * - Only deactivate XP Events marked with [C-023-S5] audit suffix in XP Reason Debug.
 * - Do not write computed fields (rollups, formulas, lookups).
 *
 * THIS IS NOT
 * - Upload or duplicate detection (DEV Lambda / 070a / 070b).
 * - Athlete or parent notification.
 * - Automatic blocking on detection alone.
 *
 * FOLDER
 * - 12 - Asset Reuse Review
 *
 * AUTOMATION NAME
 * - 116 - Submission Assets - Apply Asset Reuse Decision Consequences
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Asset Reuse Decision is not empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Submission Asset record ID
 *
 * OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut
 * - errorOut
 * - debugStep
 * - assetIdOut
 * - activityRouteOut
 * - activityRecordIdOut
 * - xpEventIdOut
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "116 - Submission Assets - Apply Asset Reuse Decision Consequences",
  version: "v1.0.1",
  versionDate: "2026-07-10",
  originalWrittenDate: "2026-07-10",
  lastUpdated: "2026-07-10",
  folder: "12 - Asset Reuse Review",
  automationName: "116 - Submission Assets - Apply Asset Reuse Decision Consequences",
};

/* =========================================================
   SECTION 2 — CONFIGURATION
========================================================= */

const CONFIG = {
  auditMarker: "[C-023-S5]",
  lastAppliedPrefix: "[C-023-S5-LAST] ",
  sourceKeys: {
    videoPrefix: "VIDEO_SUBMISSION|",
    homeworkPrefix: "HOMEWORK_XP|",
  },

  decisions: {
    notReviewed: ["Not Reviewed"],
    approved: [
      "Approved Reuse",
      "Allowed — Legitimate Reuse",
      "Allowed — Correction/Resubmission",
    ],
    confirmed: ["Confirmed Duplicate"],
    falsePositive: [
      "False Positive",
      "Unable to Determine",
      "Resolved — Duplicate Record Error",
    ],
  },

  tables: {
    submissionAssets: "Submission Assets",
    videoFeedback: "Video Feedback",
    homeworkCompletions: "Homework Completions",
    xpEvents: "XP Events",
    enrollments: "Enrollments",
  },

  assetFields: {
    reuseDecision: "Asset Reuse Decision",
    resolutionApplied: "Duplicate Resolution Applied?",
    resolutionAppliedAt: "Duplicate Resolution Applied At",
    resolutionError: "Duplicate Resolution Error",
    resolutionLastApplied: "Duplicate Resolution Last Applied Decision",
    reviewNotes: "Asset Reuse Review Notes",
    uploadDestination: "Upload Destination",
    homeworkCompletions: "Homework Completions",
    videoFeedback: "Video Feedback",
    enrollment: "Enrollment - Linked",
    canonicalUrl: "Canonical File URL",
  },

  videoFields: {
    doNotAwardXp: "Do Not Award XP?",
    awardStatus: "Award Status",
    xpEvents: "XP Events",
    enrollment: "Enrollment",
  },

  homeworkFields: {
    awardStatus: "Award Status",
    xpEvents: "XP Events",
    enrollment: "Enrollment",
    satisfactory: "Satisfactory?",
  },

  xpFields: {
    sourceKey: "Source Key",
    active: "Active?",
    duplicateStatus: "Duplicate Status",
    reasonDebug: "XP Reason Debug",
    enrollment: "Enrollment",
  },

  enrollmentFields: {
    levelRecalcNeeded: "Level Recalc Needed?",
  },

  awardStatuses: {
    pending: "Pending",
    awarded: "Awarded",
    doNotAward: "Do Not Award",
  },

  duplicateStatuses: {
    unique: "Unique",
    remove: "Duplicate - Remove",
  },

  actions: {
    appliedConfirmed: "applied_confirmed_duplicate",
    restoredApproved: "restored_approved_reuse",
    restoredFalsePositive: "restored_false_positive",
    skippedNotReviewed: "skipped_not_reviewed",
    skippedIdempotent: "skipped_idempotent_same_decision",
    skippedNothingToRestore: "skipped_nothing_to_restore",
    skippedNoActivity: "skipped_no_activity_target",
    skippedUnknownDecision: "skipped_unknown_decision",
    error: "error",
  },
};

/* =========================================================
   SECTION 3 — HELPERS
========================================================= */

function cleanString(value) {
  return String(value ?? "").trim();
}

function getSelectName(value) {
  if (!value) return "";
  if (typeof value === "string") return cleanString(value);
  if (typeof value === "object" && value.name) return cleanString(value.name);
  return "";
}

function getFirstLinkedId(value) {
  if (!Array.isArray(value) || !value.length) return "";
  return cleanString(value[0]?.id || value[0]);
}

function getCheckbox(value) {
  return value === true;
}

function nowDate() {
  return new Date();
}

function nowIso() {
  return new Date().toISOString();
}

function appendNote(existing, line) {
  const base = cleanString(existing);
  return base ? `${base}\n${line}` : line;
}

function hasAuditMarker(text) {
  return cleanString(text).includes(CONFIG.auditMarker);
}

function getLastApplied(record) {
  const explicit = cleanString(record.getCellValue(CONFIG.assetFields.resolutionLastApplied));
  if (explicit) return explicit;
  const notes = cleanString(record.getCellValue(CONFIG.assetFields.reviewNotes));
  for (const line of notes.split("\n")) {
    if (line.startsWith(CONFIG.lastAppliedPrefix)) {
      return cleanString(line.slice(CONFIG.lastAppliedPrefix.length));
    }
  }
  return "";
}

function buildNotesWithLastApplied(existingNotes, auditLine, lastAppliedValue) {
  const withoutLast = cleanString(existingNotes)
    .split("\n")
    .filter((line) => line && !line.startsWith(CONFIG.lastAppliedPrefix));
  const merged = [...withoutLast, `${CONFIG.lastAppliedPrefix}${lastAppliedValue}`];
  if (auditLine) merged.push(auditLine);
  return merged.join("\n");
}

function setOutputSafe(key, value) {
  try {
    output.set(key, value ?? "");
  } catch (_err) {
    // dry-run / missing output bindings
  }
}

function categorizeDecision(decision) {
  const d = cleanString(decision);
  if (!d) return "empty";
  if (CONFIG.decisions.notReviewed.includes(d)) return "not_reviewed";
  if (CONFIG.decisions.confirmed.includes(d)) return "confirmed";
  if (CONFIG.decisions.approved.includes(d)) return "approved";
  if (CONFIG.decisions.falsePositive.includes(d)) return "false_positive";
  return "unknown";
}

async function getTable(name) {
  return base.getTable(name);
}

async function requireField(table, fieldName, types) {
  const field = table.getField(fieldName);
  if (!field) {
    throw new Error(`Missing required field ${fieldName} on ${table.name}`);
  }
  if (types && types.length && !types.includes(field.type)) {
    throw new Error(`Field ${fieldName} on ${table.name} must be one of ${types.join(", ")}`);
  }
  return field;
}

async function loadAsset(recordId) {
  const table = await getTable(CONFIG.tables.submissionAssets);
  const query = await table.selectRecordsAsync({
    recordIds: [recordId],
  });
  const record = query.getRecord(recordId);
  if (!record) {
    throw new Error(`Submission Asset not found: ${recordId}`);
  }
  return { table, record };
}

function resolveActivityTarget(record) {
  const destination = getSelectName(record.getCellValue(CONFIG.assetFields.uploadDestination));
  const vfId = getFirstLinkedId(record.getCellValue(CONFIG.assetFields.videoFeedback));
  const hwId = getFirstLinkedId(record.getCellValue(CONFIG.assetFields.homeworkCompletions));

  if (destination === "Video Feedback" || vfId) {
    if (!vfId) return null;
    return {
      route: "video",
      tableName: CONFIG.tables.videoFeedback,
      recordId: vfId,
      sourceKey: `${CONFIG.sourceKeys.videoPrefix}${vfId}`,
    };
  }

  if (destination === "Homework Completions" || hwId) {
    if (!hwId) return null;
    return {
      route: "homework",
      tableName: CONFIG.tables.homeworkCompletions,
      recordId: hwId,
      sourceKey: `${CONFIG.sourceKeys.homeworkPrefix}${hwId}`,
    };
  }

  return null;
}

async function findXpEventBySourceKey(sourceKey) {
  const table = await getTable(CONFIG.tables.xpEvents);
  const query = await table.selectRecordsAsync({
    fields: [
      CONFIG.xpFields.sourceKey,
      CONFIG.xpFields.active,
      CONFIG.xpFields.duplicateStatus,
      CONFIG.xpFields.reasonDebug,
      CONFIG.xpFields.enrollment,
    ],
  });

  for (const rec of query.records) {
    if (cleanString(rec.getCellValue(CONFIG.xpFields.sourceKey)) === sourceKey) {
      return rec;
    }
  }
  return null;
}

async function flagEnrollmentRecalc(enrollmentId) {
  if (!enrollmentId) return;
  const table = await getTable(CONFIG.tables.enrollments);
  await requireField(table, CONFIG.enrollmentFields.levelRecalcNeeded, ["checkbox"]);
  await table.updateRecordAsync(enrollmentId, {
    [CONFIG.enrollmentFields.levelRecalcNeeded]: true,
  });
}

async function resolveEnrollmentId(assetRecord, activityRecord, activityRoute) {
  const fromAsset = getFirstLinkedId(assetRecord.getCellValue(CONFIG.assetFields.enrollment));
  if (fromAsset) return fromAsset;
  if (!activityRecord) return "";
  const field =
    activityRoute === "video" ? CONFIG.videoFields.enrollment : CONFIG.homeworkFields.enrollment;
  return getFirstLinkedId(activityRecord.getCellValue(field));
}

async function loadActivityRecord(target) {
  const table = await getTable(target.tableName);
  const query = await table.selectRecordsAsync({ recordIds: [target.recordId] });
  return query.getRecord(target.recordId);
}

async function applyConfirmedDuplicate({
  assetTable,
  assetRecord,
  target,
  activityRecord,
  enrollmentId,
}) {
  const lastApplied = getLastApplied(assetRecord);
  const alreadyApplied = getCheckbox(
    assetRecord.getCellValue(CONFIG.assetFields.resolutionApplied),
  );

  if (alreadyApplied && lastApplied === "Confirmed Duplicate") {
    return { idempotent: true };
  }

  const activityTable = await getTable(target.tableName);
  const xpEvent = await findXpEventBySourceKey(target.sourceKey);
  const timestamp = nowDate();
  const auditLine = `${CONFIG.auditMarker} Confirmed Duplicate applied ${nowIso()}`;

  if (target.route === "video") {
    await requireField(activityTable, CONFIG.videoFields.doNotAwardXp, ["checkbox"]);
    await activityTable.updateRecordAsync(target.recordId, {
      [CONFIG.videoFields.doNotAwardXp]: true,
    });
  } else {
    await requireField(activityTable, CONFIG.homeworkFields.awardStatus, ["singleSelect"]);
    await activityTable.updateRecordAsync(target.recordId, {
      [CONFIG.homeworkFields.awardStatus]: { name: CONFIG.awardStatuses.doNotAward },
    });
  }

  if (xpEvent) {
    const xpTable = await getTable(CONFIG.tables.xpEvents);
    const priorDebug = cleanString(xpEvent.getCellValue(CONFIG.xpFields.reasonDebug));
    await xpTable.updateRecordAsync(xpEvent.id, {
      [CONFIG.xpFields.active]: false,
      [CONFIG.xpFields.duplicateStatus]: { name: CONFIG.duplicateStatuses.remove },
      [CONFIG.xpFields.reasonDebug]: appendNote(
        priorDebug,
        `${CONFIG.auditMarker} Confirmed duplicate — XP deactivated ${nowIso()}`,
      ),
    });
  }

  const assetPatch = {
    [CONFIG.assetFields.resolutionApplied]: true,
    [CONFIG.assetFields.resolutionAppliedAt]: timestamp,
    [CONFIG.assetFields.resolutionError]: null,
    [CONFIG.assetFields.reviewNotes]: buildNotesWithLastApplied(
      assetRecord.getCellValue(CONFIG.assetFields.reviewNotes),
      auditLine,
      "Confirmed Duplicate",
    ),
  };

  try {
    await requireField(assetTable, CONFIG.assetFields.resolutionLastApplied, ["singleLineText"]);
    assetPatch[CONFIG.assetFields.resolutionLastApplied] = "Confirmed Duplicate";
  } catch (_optionalField) {
    // DEV may not yet have Duplicate Resolution Last Applied Decision
  }

  await assetTable.updateRecordAsync(assetRecord.id, assetPatch);
  await flagEnrollmentRecalc(enrollmentId);

  return {
    idempotent: false,
    xpEventId: xpEvent?.id || "",
  };
}

async function restoreFromConfirmed({
  assetTable,
  assetRecord,
  target,
  activityRecord,
  enrollmentId,
  decisionCategory,
}) {
  const lastApplied = getLastApplied(assetRecord);

  if (lastApplied !== "Confirmed Duplicate") {
    return { nothingToRestore: true };
  }

  const activityTable = await getTable(target.tableName);
  const xpEvent = await findXpEventBySourceKey(target.sourceKey);
  const timestamp = nowDate();
  const decisionLabel =
    decisionCategory === "approved" ? "Approved Reuse" : "False Positive";
  const auditLine = `${CONFIG.auditMarker} Restored after ${decisionLabel} ${nowIso()}`;

  if (target.route === "video") {
    await activityTable.updateRecordAsync(target.recordId, {
      [CONFIG.videoFields.doNotAwardXp]: false,
    });
  } else {
    const currentStatus = getSelectName(
      activityRecord.getCellValue(CONFIG.homeworkFields.awardStatus),
    );
    const restoreStatus =
      xpEvent && hasAuditMarker(xpEvent.getCellValue(CONFIG.xpFields.reasonDebug))
        ? CONFIG.awardStatuses.awarded
        : CONFIG.awardStatuses.pending;
    if (currentStatus === CONFIG.awardStatuses.doNotAward) {
      await activityTable.updateRecordAsync(target.recordId, {
        [CONFIG.homeworkFields.awardStatus]: { name: restoreStatus },
      });
    }
  }

  if (xpEvent && hasAuditMarker(xpEvent.getCellValue(CONFIG.xpFields.reasonDebug))) {
    const xpTable = await getTable(CONFIG.tables.xpEvents);
    const priorDebug = cleanString(xpEvent.getCellValue(CONFIG.xpFields.reasonDebug));
    await xpTable.updateRecordAsync(xpEvent.id, {
      [CONFIG.xpFields.active]: true,
      [CONFIG.xpFields.duplicateStatus]: { name: CONFIG.duplicateStatuses.unique },
      [CONFIG.xpFields.reasonDebug]: appendNote(
        priorDebug,
        `${CONFIG.auditMarker} Restored — decision reversed ${nowIso()}`,
      ),
    });
  }

  const restorePatch = {
    [CONFIG.assetFields.resolutionApplied]: false,
    [CONFIG.assetFields.resolutionAppliedAt]: timestamp,
    [CONFIG.assetFields.resolutionError]: null,
    [CONFIG.assetFields.reviewNotes]: buildNotesWithLastApplied(
      assetRecord.getCellValue(CONFIG.assetFields.reviewNotes),
      auditLine,
      decisionLabel,
    ),
  };

  try {
    await requireField(assetTable, CONFIG.assetFields.resolutionLastApplied, ["singleLineText"]);
    restorePatch[CONFIG.assetFields.resolutionLastApplied] = decisionLabel;
  } catch (_optionalField) {
    // optional field
  }

  await assetTable.updateRecordAsync(assetRecord.id, restorePatch);

  await flagEnrollmentRecalc(enrollmentId);

  return {
    nothingToRestore: false,
    xpEventId: xpEvent?.id || "",
  };
}

/* =========================================================
   SECTION 4 — MAIN
========================================================= */

async function main() {
  const inputConfig = input.config();
  const recordId = cleanString(inputConfig.recordId);

  setOutputSafe("debugStep", "start");
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", "");
  setOutputSafe("assetIdOut", recordId);
  setOutputSafe("activityRouteOut", "");
  setOutputSafe("activityRecordIdOut", "");
  setOutputSafe("xpEventIdOut", "");

  if (!recordId || !recordId.startsWith("rec")) {
    setOutputSafe("errorOut", "recordId must be a non-empty Airtable record ID");
    setOutputSafe("debugStep", "validate_record_id_failed");
    throw new Error("Invalid recordId");
  }

  setOutputSafe("debugStep", "load_asset");
  const { table: assetTable, record: assetRecord } = await loadAsset(recordId);

  await requireField(assetTable, CONFIG.assetFields.reuseDecision, ["singleSelect"]);
  await requireField(assetTable, CONFIG.assetFields.resolutionApplied, ["checkbox"]);

  const decision = getSelectName(assetRecord.getCellValue(CONFIG.assetFields.reuseDecision));
  const category = categorizeDecision(decision);

  setOutputSafe("debugStep", `decision_${category}`);

  if (category === "empty" || category === "unknown") {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe(
      "actionOut",
      category === "unknown"
        ? CONFIG.actions.skippedUnknownDecision
        : CONFIG.actions.skippedNotReviewed,
    );
    setOutputSafe("debugStep", "done");
    console.log(
      JSON.stringify({
        automation: SCRIPT.automationName,
        version: SCRIPT.version,
        recordId,
        decision,
        category,
        statusOut: "skipped",
      }),
    );
    return;
  }

  if (category === "not_reviewed") {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", CONFIG.actions.skippedNotReviewed);
    setOutputSafe("debugStep", "done");
    console.log(
      JSON.stringify({
        automation: SCRIPT.automationName,
        version: SCRIPT.version,
        recordId,
        decision,
        actionOut: CONFIG.actions.skippedNotReviewed,
      }),
    );
    return;
  }

  setOutputSafe("debugStep", "resolve_activity");
  const target = resolveActivityTarget(assetRecord);
  if (!target) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", CONFIG.actions.skippedNoActivity);
    setOutputSafe("errorOut", "No linked Video Feedback or Homework Completion");
    setOutputSafe("debugStep", "done");
    return;
  }

  setOutputSafe("activityRouteOut", target.route);
  setOutputSafe("activityRecordIdOut", target.recordId);

  const activityRecord = await loadActivityRecord(target);
  if (!activityRecord) {
    setOutputSafe("statusOut", "error");
    setOutputSafe("errorOut", `Activity record not found: ${target.recordId}`);
    setOutputSafe("debugStep", "activity_missing");
    throw new Error("Activity record missing");
  }

  const enrollmentId = await resolveEnrollmentId(assetRecord, activityRecord, target.route);

  if (category === "confirmed") {
    setOutputSafe("debugStep", "apply_confirmed");
    const result = await applyConfirmedDuplicate({
      assetTable,
      assetRecord,
      target,
      activityRecord,
      enrollmentId,
    });

    if (result.idempotent) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", CONFIG.actions.skippedIdempotent);
      setOutputSafe("xpEventIdOut", result.xpEventId || "");
    } else {
      setOutputSafe("statusOut", "success");
      setOutputSafe("actionOut", CONFIG.actions.appliedConfirmed);
      setOutputSafe("xpEventIdOut", result.xpEventId || "");
    }
  } else {
    setOutputSafe("debugStep", "restore_eligibility");
    const result = await restoreFromConfirmed({
      assetTable,
      assetRecord,
      target,
      activityRecord,
      enrollmentId,
      decisionCategory: category,
    });

    if (result.nothingToRestore) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", CONFIG.actions.skippedNothingToRestore);
    } else {
      setOutputSafe("statusOut", "success");
      setOutputSafe(
        "actionOut",
        category === "approved"
          ? CONFIG.actions.restoredApproved
          : CONFIG.actions.restoredFalsePositive,
      );
      setOutputSafe("xpEventIdOut", result.xpEventId || "");
    }
  }

  setOutputSafe("debugStep", "done");
  console.log(
    JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      recordId,
      decision,
      category,
      route: target.route,
      activityRecordId: target.recordId,
      statusOut: output.get?.("statusOut") ?? "",
      actionOut: output.get?.("actionOut") ?? "",
    }),
  );
}

try {
  await main();
} catch (err) {
  const message = err?.message || String(err);
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", message);
  console.error(JSON.stringify({ automation: SCRIPT.automationName, error: message }));
  throw err;
}
