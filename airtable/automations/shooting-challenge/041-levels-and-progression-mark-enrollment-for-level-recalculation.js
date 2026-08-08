/*
GitHub source: 041-levels-and-progression-mark-enrollment-for-level-recalculation.js

Version: 4.0
Date Written: 2026-08-08
Last Updated: 2026-08-08

PURPOSE
Queue Enrollment recalculation whenever an authoritative progression input
changes, including positive/negative XP corrections, deactivation, ownership
moves, manual XP adjustments, gate-stat changes, and active gate-rule changes.

IMPORTANT DESIGN RULES
- This is a queue/request mechanism only. It never writes progression outputs.
- Automation 042 remains the only writer of Current Level, Next Level,
  Level Gate Rule, Level Status, and the queue checkbox after processing.
- The scheduled trigger scans the authoritative Enrollment and Level Gate Rules
  inputs. A controlled recordId input may be used for a single-record proof.
- Progression Last Queued Signature is additive state used to make replay
  idempotent. 042 may clear the queue checkbox without causing unchanged-input
  churn because the signature remains equal until an input changes.
- Do not close Issue #98 or this package until the PROD field, trigger, paste,
  and controlled Schmidt proof are recorded.

INPUT
- Optional recordId: one Enrollment record for a controlled proof.
- No recordId: scheduled reconciliation of active Enrollments.

OUTPUTS
- statusOut: success | skipped | error
- actionOut: queued | skipped_unchanged | skipped_pending | error
- errorOut
- debugStep
- queuedCount
- scannedCount

TRIGGER
- Scheduled reconciliation (recommended: every 5 minutes), or a controlled
  single-record run using recordId.

REQUIRED PROD ADDITIVE FIELD
- Enrollments.Progression Last Queued Signature (single line text, writable)

FOLDER
- 04 - Levels and Progression
*/

const SCRIPT = {
    scriptName: "041 - Levels and Progression - Mark Enrollment for Level Recalculation",
    version: "4.0",
    versionDate: "2026-08-08",
    originalWrittenDate: "2026-05-28",
    lastUpdated: "2026-08-08",
    folder: "04 - Levels and Progression",
    automationName: "041 - Levels and Progression - Mark Enrollment for Level Recalculation",
};

const CONFIG = {
    tables: {
        enrollments: "Enrollments",
        levelGateRules: "Level Gate Rules",
    },
    enrollmentFields: {
        active: "Active?",
        lifetimeXpTotal: "Lifetime XP Total",
        lifetimeXpManualAdjustments: "Lifetime XP Manual Adjustments",
        totalSubmissions: "Total Submissions",
        totalHomeworkCompletions: "Total Homework Completions",
        totalVideoSubmissions: "Total Video Submissions",
        totalZoomAttendances: "Total Zoom Attendances",
        longestStreakDays: "Longest Streak Days",
        schoolYear: "School Year",
        gateDebugSummary: "Gate Debug Summary",
        currentLevel: "Current Level",
        nextLevel: "Next Level",
        levelGateRule: "Level Gate Rule",
        levelStatus: "Level Status",
        levelRecalcNeeded: "Level Recalc Needed?",
        lastQueuedSignature: "Progression Last Queued Signature",
    },
    gateRuleFields: {
        level: "Level",
        schoolYearRuleSet: "School Year / Rule Set",
        versionActive: "Version Active?",
        gateEnabled: "Gate Enabled?",
        minimumSubmissions: "Minimum Submissions",
        minimumHomework: "Minimum Homework",
        minimumVideos: "Minimum Videos",
        minimumZoomMeetings: "Minimum Zoom Meetings",
        minimumStreakDays: "Minimum Streak Days",
    },
    outputs: {
        status: "statusOut",
        action: "actionOut",
        error: "errorOut",
        debugStep: "debugStep",
        queuedCount: "queuedCount",
        scannedCount: "scannedCount",
    },
};

const NUMBER_FIELDS = [
    CONFIG.enrollmentFields.lifetimeXpTotal,
    CONFIG.enrollmentFields.lifetimeXpManualAdjustments,
    CONFIG.enrollmentFields.totalSubmissions,
    CONFIG.enrollmentFields.totalHomeworkCompletions,
    CONFIG.enrollmentFields.totalVideoSubmissions,
    CONFIG.enrollmentFields.totalZoomAttendances,
    CONFIG.enrollmentFields.longestStreakDays,
];

const TEXT_FIELDS = [
    CONFIG.enrollmentFields.schoolYear,
];

function cleanString(value) {
    return String(value ?? "").trim();
}

function normalizeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function normalizeBoolean(value) {
    return value === true || value === 1 || value === "1";
}

function getText(record, fieldName) {
    try {
        return cleanString(record.getCellValueAsString(fieldName));
    } catch (error) {
        return "";
    }
}

function getLinkedIds(record, fieldName) {
    const value = record.getCellValue(fieldName);
    if (!Array.isArray(value)) return [];
    return value.map((item) => cleanString(item?.id)).filter(Boolean).sort();
}

function getBoolean(record, fieldName) {
    return normalizeBoolean(record.getCellValue(fieldName));
}

function setOutputSafe(name, value) {
    try {
        output.set(name, value);
    } catch (error) {
        console.log(`Optional output unavailable: ${name}`);
    }
}

function setOutputs({
    status,
    action,
    error = "",
    debugStep = "",
    queuedCount = 0,
    scannedCount = 0,
}) {
    setOutputSafe(CONFIG.outputs.status, status);
    setOutputSafe(CONFIG.outputs.action, action);
    setOutputSafe(CONFIG.outputs.error, error);
    setOutputSafe(CONFIG.outputs.debugStep, debugStep);
    setOutputSafe(CONFIG.outputs.queuedCount, queuedCount);
    setOutputSafe(CONFIG.outputs.scannedCount, scannedCount);
}

function fieldExists(table, fieldName) {
    return table.fields.some((field) => field.name === fieldName);
}

function requireFields(table, fieldNames) {
    for (const fieldName of fieldNames) {
        if (!fieldExists(table, fieldName)) {
            throw new Error(`Missing field "${fieldName}" in table "${table.name}".`);
        }
    }
}

function getEnrollmentSignatureValues(record) {
    const values = {};

    for (const fieldName of NUMBER_FIELDS) {
        values[fieldName] = normalizeNumber(record.getCellValue(fieldName));
    }

    for (const fieldName of TEXT_FIELDS) {
        values[fieldName] = getText(record, fieldName);
    }

    values[CONFIG.enrollmentFields.active] = getBoolean(
        record,
        CONFIG.enrollmentFields.active
    );

    return values;
}

function getGateRuleSignature(record) {
    return {
        id: record.id,
        level: getLinkedIds(record, CONFIG.gateRuleFields.level),
        schoolYearRuleSet: getText(record, CONFIG.gateRuleFields.schoolYearRuleSet),
        versionActive: getBoolean(record, CONFIG.gateRuleFields.versionActive),
        gateEnabled: getBoolean(record, CONFIG.gateRuleFields.gateEnabled),
        minimumSubmissions: normalizeNumber(
            record.getCellValue(CONFIG.gateRuleFields.minimumSubmissions)
        ),
        minimumHomework: normalizeNumber(
            record.getCellValue(CONFIG.gateRuleFields.minimumHomework)
        ),
        minimumVideos: normalizeNumber(
            record.getCellValue(CONFIG.gateRuleFields.minimumVideos)
        ),
        minimumZoomMeetings: normalizeNumber(
            record.getCellValue(CONFIG.gateRuleFields.minimumZoomMeetings)
        ),
        minimumStreakDays: normalizeNumber(
            record.getCellValue(CONFIG.gateRuleFields.minimumStreakDays)
        ),
    };
}

function buildProgressionSignature(enrollment, gateRules) {
    const gateRuleValues = gateRules
        .map(getGateRuleSignature)
        .sort((a, b) => a.id.localeCompare(b.id));

    return JSON.stringify({
        version: 1,
        enrollmentId: enrollment.id,
        enrollment: getEnrollmentSignatureValues(enrollment),
        gateRules: gateRuleValues,
    });
}

function shouldQueue(enrollment, currentSignature) {
    if (getBoolean(enrollment, CONFIG.enrollmentFields.levelRecalcNeeded)) {
        return { queue: false, reason: "already_pending" };
    }

    const lastQueuedSignature = getText(
        enrollment,
        CONFIG.enrollmentFields.lastQueuedSignature
    );

    if (lastQueuedSignature === currentSignature) {
        return { queue: false, reason: "unchanged_signature" };
    }

    return {
        queue: true,
        reason: lastQueuedSignature ? "signature_changed" : "initial_signature",
    };
}

function unloadQuerySafe(query) {
    if (typeof query?.unloadData === "function") {
        try {
            query.unloadData();
        } catch (error) {
            console.log("Non-fatal query cleanup failure.");
        }
    }
}

async function main() {
    const inputConfig = input.config();
    const requestedRecordId = cleanString(inputConfig.recordId);
    const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    const gateRulesTable = base.getTable(CONFIG.tables.levelGateRules);

    const requiredEnrollmentFields = [
        ...NUMBER_FIELDS,
        ...TEXT_FIELDS,
        CONFIG.enrollmentFields.active,
        CONFIG.enrollmentFields.levelRecalcNeeded,
        CONFIG.enrollmentFields.lastQueuedSignature,
    ];
    const requiredGateRuleFields = Object.values(CONFIG.gateRuleFields);

    try {
        setOutputSafe(CONFIG.outputs.debugStep, "01 - Validate schema");
        requireFields(enrollmentsTable, requiredEnrollmentFields);
        requireFields(gateRulesTable, requiredGateRuleFields);

        setOutputSafe(CONFIG.outputs.debugStep, "02 - Load gate rules");
        const gateRuleQuery = await gateRulesTable.selectRecordsAsync({
            fields: requiredGateRuleFields,
        });
        const gateRules = gateRuleQuery.records;

        setOutputSafe(CONFIG.outputs.debugStep, "03 - Load enrollments");
        const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
            fields: requiredEnrollmentFields,
        });
        const enrollments = requestedRecordId
            ? enrollmentQuery.records.filter(
                  (record) =>
                      record.id === requestedRecordId &&
                      getBoolean(record, CONFIG.enrollmentFields.active)
              )
            : enrollmentQuery.records.filter((record) =>
                  getBoolean(record, CONFIG.enrollmentFields.active)
              );

        const updates = [];
        let skippedPending = 0;
        let skippedUnchanged = 0;

        for (const enrollment of enrollments) {
            const signature = buildProgressionSignature(enrollment, gateRules);
            const decision = shouldQueue(enrollment, signature);

            if (!decision.queue) {
                if (decision.reason === "already_pending") skippedPending += 1;
                if (decision.reason === "unchanged_signature") skippedUnchanged += 1;
                continue;
            }

            updates.push({
                id: enrollment.id,
                fields: {
                    [CONFIG.enrollmentFields.levelRecalcNeeded]: true,
                    [CONFIG.enrollmentFields.lastQueuedSignature]: signature,
                },
            });
        }

        setOutputSafe(CONFIG.outputs.debugStep, "04 - Queue changed enrollments");
        for (let index = 0; index < updates.length; index += 50) {
            await enrollmentsTable.updateRecordsAsync(updates.slice(index, index + 50));
        }

        unloadQuerySafe(gateRuleQuery);
        unloadQuerySafe(enrollmentQuery);

        const message = `Scanned ${enrollments.length}; queued ${updates.length}; skipped ${skippedPending} pending and ${skippedUnchanged} unchanged.`;
        console.log(
            JSON.stringify({
                automation: SCRIPT.automationName,
                version: SCRIPT.version,
                requestedRecordId,
                scannedCount: enrollments.length,
                queuedCount: updates.length,
                skippedPending,
                skippedUnchanged,
            })
        );
        setOutputs({
            status: updates.length ? "success" : "skipped",
            action: updates.length ? "queued" : "skipped_unchanged",
            debugStep: "05 - Complete",
            queuedCount: updates.length,
            scannedCount: enrollments.length,
        });
        console.log(message);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setOutputs({
            status: "error",
            action: "error",
            error: message,
            debugStep: "99 - Error",
        });
        throw new Error(message);
    }
}

await main();
