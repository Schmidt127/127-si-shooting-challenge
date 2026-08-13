/*
GitHub source: 041-levels-and-progression-mark-enrollment-for-level-recalculation.js

Version: 5.0
Date Written: 2026-08-08
Last Updated: 2026-08-13

PURPOSE
Queue Enrollment recalculation whenever an authoritative progression input
changes, including positive/negative XP corrections, deactivation, ownership
moves, manual XP adjustments, gate-stat changes, and active gate-rule changes.

IMPORTANT DESIGN RULES
- This is a queue/request mechanism only. It never writes progression outputs.
- Automation 042 remains the only writer of Current Level, Next Level,
  Level Gate Rule, Level Status, and the queue checkbox after processing.
- The scheduled trigger scans the authoritative Enrollment, Levels, and Level
  Gate Rules inputs. A controlled recordId input may be used for a single-record
  proof.
- Progression Last Queued Signature is additive state used to make replay
  idempotent. Progression Last Reconciled Signature is written only by 042;
  queueing compares the current input/output state to that acknowledged state.
- Inactive enrollments are not queued, but their signature state is advanced.
  This makes a later deactivation/reactivation observable without assigning
  progression while inactive.
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
- Enrollments.Progression Last Reconciled Signature (single line text, writable)

FOLDER
- 04 - Levels and Progression
*/

const SCRIPT = {
    scriptName: "041 - Levels and Progression - Mark Enrollment for Level Recalculation",
    version: "5.0",
    versionDate: "2026-08-08",
    originalWrittenDate: "2026-05-28",
    lastUpdated: "2026-08-13",
    folder: "04 - Levels and Progression",
    automationName: "041 - Levels and Progression - Mark Enrollment for Level Recalculation",
};

const CONFIG = {
    tables: {
        enrollments: "Enrollments",
        levelGateRules: "Level Gate Rules",
        levels: "Levels",
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
        programInstance: "Program Instance",
        gateDebugSummary: "Gate Debug Summary",
        currentLevel: "Current Level",
        nextLevel: "Next Level",
        levelGateRule: "Level Gate Rule",
        levelStatus: "Level Status",
        levelRecalcNeeded: "Level Recalc Needed?",
        lastQueuedSignature: "Progression Last Queued Signature",
        lastReconciledSignature: "Progression Last Reconciled Signature",
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
    levelFields: {
        name: "Level Name",
        xpRequired: "XP Required (Cumulative)",
        active: "Active?",
        sortOrder: "Sort Order",
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

function assertOptionalRecordId(recordId) {
    if (recordId && !recordId.startsWith("rec")) {
        throw new Error(`Invalid recordId: expected an Airtable record ID starting with "rec".`);
    }
    return recordId;
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
    let value;
    try {
        value = record.getCellValue(fieldName);
    } catch (error) {
        return [];
    }
    if (!Array.isArray(value)) return [];
    return value.map((item) => cleanString(item?.id)).filter(Boolean).sort();
}

function getBoolean(record, fieldName) {
    return normalizeBoolean(record.getCellValue(fieldName));
}

function isSharedSchoolYear(value) {
    const normalized = cleanString(value).toLowerCase();
    return (
        normalized === "" ||
        normalized === "shared" ||
        normalized === "default" ||
        normalized === "all years"
    );
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

function getLevelSignature(record) {
    return {
        id: record.id,
        name: getText(record, CONFIG.levelFields.name),
        xpRequired: normalizeNumber(record.getCellValue(CONFIG.levelFields.xpRequired)),
        active: getBoolean(record, CONFIG.levelFields.active),
        sortOrder: normalizeNumber(record.getCellValue(CONFIG.levelFields.sortOrder)),
    };
}

function getOutputSignatureValues(record) {
    return {
        currentLevel: getLinkedIds(record, CONFIG.enrollmentFields.currentLevel),
        nextLevel: getLinkedIds(record, CONFIG.enrollmentFields.nextLevel),
        levelGateRule: getLinkedIds(record, CONFIG.enrollmentFields.levelGateRule),
        levelStatus: getText(record, CONFIG.enrollmentFields.levelStatus),
    };
}

function buildRelevantConfiguration(enrollment, gateRules, levels) {
    const lifetimeXp = normalizeNumber(
        enrollment.getCellValue(CONFIG.enrollmentFields.lifetimeXpTotal)
    );
    const currentLevelIds = getLinkedIds(
        enrollment,
        CONFIG.enrollmentFields.currentLevel
    );
    const nextLevelIds = getLinkedIds(
        enrollment,
        CONFIG.enrollmentFields.nextLevel
    );
    const relevantLevelIds = new Set([...currentLevelIds, ...nextLevelIds]);
    const activeLevels = levels
        .map((level) => ({
            record: level,
            threshold: normalizeNumber(
                level.getCellValue(CONFIG.levelFields.xpRequired)
            ),
            active: getBoolean(level, CONFIG.levelFields.active),
        }))
        .filter((level) => level.active)
        .sort((a, b) => a.threshold - b.threshold);

    for (const level of activeLevels) {
        if (level.threshold <= lifetimeXp) {
            relevantLevelIds.add(level.record.id);
            continue;
        }
        relevantLevelIds.add(level.record.id);
        break;
    }

    const relevantLevels = levels.filter((level) =>
        relevantLevelIds.has(level.id)
    );
    const enrollmentSchoolYear = getText(
        enrollment,
        CONFIG.enrollmentFields.schoolYear
    ).replace(/[–—−]/g, "-");
    const relevantGateRules = gateRules.filter((rule) =>
        getLinkedIds(rule, CONFIG.gateRuleFields.level).some((levelId) =>
            relevantLevelIds.has(levelId)
        ) &&
        (isSharedSchoolYear(
            getText(rule, CONFIG.gateRuleFields.schoolYearRuleSet)
        ) ||
            getText(rule, CONFIG.gateRuleFields.schoolYearRuleSet).replace(
                /[–—−]/g,
                "-"
            ) === enrollmentSchoolYear)
    );

    return { relevantLevels, relevantGateRules };
}

function buildProgressionSignature(enrollment, gateRules, levels) {
    const { relevantLevels, relevantGateRules } = buildRelevantConfiguration(
        enrollment,
        gateRules,
        levels
    );
    const gateRuleValues = relevantGateRules
        .map(getGateRuleSignature)
        .sort((a, b) => a.id.localeCompare(b.id));
    const levelValues = relevantLevels
        .map(getLevelSignature)
        .sort((a, b) => a.id.localeCompare(b.id));

    return JSON.stringify({
        version: 2,
        enrollmentId: enrollment.id,
        enrollment: getEnrollmentSignatureValues(enrollment),
        outputs: getOutputSignatureValues(enrollment),
        programInstance: getLinkedIds(enrollment, CONFIG.enrollmentFields.programInstance),
        levels: levelValues,
        gateRules: gateRuleValues,
    });
}

function shouldQueue(enrollment, currentSignature) {
    if (getBoolean(enrollment, CONFIG.enrollmentFields.levelRecalcNeeded)) {
        return { queue: false, reason: "already_pending" };
    }

    const lastReconciledSignature = getText(
        enrollment,
        CONFIG.enrollmentFields.lastReconciledSignature
    );

    if (lastReconciledSignature === currentSignature) {
        return { queue: false, reason: "unchanged_signature" };
    }

    return {
        queue: true,
        reason: lastReconciledSignature ? "signature_changed" : "initial_signature",
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
    const requestedRecordId = assertOptionalRecordId(
        cleanString(inputConfig.recordId)
    );
    const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    const gateRulesTable = base.getTable(CONFIG.tables.levelGateRules);
    const levelsTable = base.getTable(CONFIG.tables.levels);

    const requiredEnrollmentFields = [
        ...NUMBER_FIELDS,
        ...TEXT_FIELDS,
        CONFIG.enrollmentFields.active,
        CONFIG.enrollmentFields.levelRecalcNeeded,
        CONFIG.enrollmentFields.lastQueuedSignature,
        CONFIG.enrollmentFields.lastReconciledSignature,
        CONFIG.enrollmentFields.currentLevel,
        CONFIG.enrollmentFields.nextLevel,
        CONFIG.enrollmentFields.levelGateRule,
        CONFIG.enrollmentFields.levelStatus,
        CONFIG.enrollmentFields.programInstance,
    ];
    const requiredGateRuleFields = Object.values(CONFIG.gateRuleFields);
    const requiredLevelFields = Object.values(CONFIG.levelFields);

    try {
        setOutputSafe(CONFIG.outputs.debugStep, "01 - Validate schema");
        requireFields(enrollmentsTable, requiredEnrollmentFields);
        requireFields(gateRulesTable, requiredGateRuleFields);
        requireFields(levelsTable, requiredLevelFields);

        setOutputSafe(CONFIG.outputs.debugStep, "02 - Load gate rules");
        const gateRuleQuery = await gateRulesTable.selectRecordsAsync({
            fields: requiredGateRuleFields,
        });
        const gateRules = gateRuleQuery.records;

        setOutputSafe(CONFIG.outputs.debugStep, "03 - Load levels");
        const levelQuery = await levelsTable.selectRecordsAsync({
            fields: requiredLevelFields,
        });
        const levels = levelQuery.records;

        setOutputSafe(CONFIG.outputs.debugStep, "04 - Load enrollments");
        const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
            fields: requiredEnrollmentFields,
        });
        const enrollments = requestedRecordId
            ? enrollmentQuery.records.filter(
                  (record) => record.id === requestedRecordId
              )
            : enrollmentQuery.records;

        const updates = [];
        const signatureOnlyUpdates = [];
        let skippedPending = 0;
        let skippedUnchanged = 0;

        for (const enrollment of enrollments) {
            const signature = buildProgressionSignature(enrollment, gateRules, levels);
            const decision = shouldQueue(enrollment, signature);

            if (!getBoolean(enrollment, CONFIG.enrollmentFields.active)) {
                if (
                    decision.reason !== "already_pending" &&
                    getText(enrollment, CONFIG.enrollmentFields.lastQueuedSignature) !== signature
                ) {
                    signatureOnlyUpdates.push({
                        id: enrollment.id,
                        fields: {
                            [CONFIG.enrollmentFields.lastQueuedSignature]: signature,
                        },
                    });
                }
                continue;
            }

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

        setOutputSafe(CONFIG.outputs.debugStep, "05 - Queue changed enrollments");
        for (let index = 0; index < signatureOnlyUpdates.length; index += 50) {
            await enrollmentsTable.updateRecordsAsync(
                signatureOnlyUpdates.slice(index, index + 50)
            );
        }
        for (let index = 0; index < updates.length; index += 50) {
            await enrollmentsTable.updateRecordsAsync(updates.slice(index, index + 50));
        }

        unloadQuerySafe(gateRuleQuery);
        unloadQuerySafe(levelQuery);
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
            debugStep: "06 - Complete",
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
