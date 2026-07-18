/*
Automation: 042 - Levels and Progression - Assign Current and Next Level with Gate Blocking
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
To be confirmed from production script.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
To be confirmed from production script.

Important Fields:
To be confirmed from production script.

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************************************************
 * 042 - Levels and Progression - Assign Current and Next Level with Gate Blocking
 * Version: 3.1
 * Date Written: 2026-06-02
 * Last Updated: 2026-07-18
 *
 * Purpose:
 * Recalculates an Enrollment's Current Level and Next Level based on Lifetime XP Total,
 * but blocks advancement into a gated level unless the athlete meets that level's active
 * gate requirements.
 *
 * Version 3.1 (C-025 Stage 17):
 * - Zoom gate count = live Total Zoom Attendances meetings ∪ qualifying Recording Quiz
 *   gate credits (Zoom Gate Credit Earned?), deduped by Zoom Meeting.
 * - Prefer live when both exist for the same meeting.
 * - Never writes Zoom Meetings.Attendees.
 * - Sets Gate Credit Applied? on Zoom Attendance rows actually counted for the gate total.
 *
 * Folder:
 * 04 - Levels and Progression
 *
 * Correct Trigger Setup:
 * Table: Enrollments
 * Trigger Type: When record enters view
 * View: 042 - Needs Level Assignment
 *
 * View Filter:
 * Level Recalc Needed? is checked
 *
 * Required Input Variable:
 * recordId = Airtable record ID from the triggering Enrollment record
 *
 * Reads:
 * Enrollments.Lifetime XP Total
 * Enrollments.Total Submissions
 * Enrollments.Total Homework Completions
 * Enrollments.Total Video Submissions
 * Enrollments.Total Zoom Attendances (live baseline; combined with recording in v3.1)
 * Enrollments.Longest Streak Days
 * Zoom Meetings.Attendees (read-only live roster)
 * Zoom Attendance recording-credit fields (Stage 17)
 *
 * Levels.XP Required (Cumulative)
 * Levels.Active?
 *
 * Level Gate Rules.Level
 * Level Gate Rules.Gate Enabled?
 * Level Gate Rules.Minimum Submissions
 * Level Gate Rules.Minimum Homework
 * Level Gate Rules.Minimum Videos
 * Level Gate Rules.Minimum Zoom Meetings
 * Level Gate Rules.Minimum Streak Days
 * Level Gate Rules.Version Active?
 *
 * Writes:
 * Enrollments.Current Level
 * Enrollments.Next Level
 * Enrollments.Level Gate Rule
 * Enrollments.Level Status = Assigned, Gate Blocked, or Error
 * Enrollments.Level Recalc Needed? = unchecked after processing
 * Zoom Attendance.Gate Credit Applied? (only when recording credit counted)
 *
 * Run Order:
 * 041 = Mark Enrollment for Level Recalculation
 * 042 = Assign Current and Next Level with Gate Blocking
 *
 * Important:
 * After this script is tested successfully, Automation 043 should be turned off because
 * this script directly assigns the correct Level Gate Rule.
 ************************************************************************************************/


/************************************************************************************************
 * 1. CONFIG
 ************************************************************************************************/

const CONFIG = {
    automation: {
        name: "042 - Levels and Progression - Assign Current and Next Level with Gate Blocking",
        version: "3.1",
    },

    tables: {
        enrollments: "Enrollments",
        levels: "Levels",
        levelGateRules: "Level Gate Rules",
        zoomMeetings: "Zoom Meetings",
        zoomAttendance: "Zoom Attendance",
    },

    enrollmentFields: {
        lifetimeXpTotal: "Lifetime XP Total",
        currentLevel: "Current Level",
        nextLevel: "Next Level",
        levelGateRule: "Level Gate Rule",
        levelStatus: "Level Status",
        levelRecalcNeeded: "Level Recalc Needed?",

        totalSubmissions: "Total Submissions",
        totalHomeworkCompletions: "Total Homework Completions",
        totalVideoSubmissions: "Total Video Submissions",
        totalZoomAttendances: "Total Zoom Attendances",
        longestStreakDays: "Longest Streak Days",
    },

    levelFields: {
        xpRequired: "XP Required (Cumulative)",
        active: "Active?",
    },

    gateFields: {
        level: "Level",
        versionActive: "Version Active?",
        gateEnabled: "Gate Enabled?",
        minimumSubmissions: "Minimum Submissions",
        minimumHomework: "Minimum Homework",
        minimumVideos: "Minimum Videos",
        minimumZoomMeetings: "Minimum Zoom Meetings",
        minimumStreakDays: "Minimum Streak Days",
    },

    zoomMeetingFields: {
        attendees: "Attendees",
    },

    zoomAttendanceFields: {
        attendanceMethod: "Attendance Method",
        enrollment: "Enrollment",
        zoomMeeting: "Zoom Meeting",
        approved: "Zoom Credit Approved?",
        conflict: "Zoom Credit Conflict?",
        gateEarned: "Zoom Gate Credit Earned?",
        gateApplied: "Gate Credit Applied?",
        reviewStatus: "Recording Quiz Review Status",
    },

    recordingMethod: "Recording Quiz",
    reviewNeedsCorrection: "Needs Correction",

    statusValues: {
        processing: "Processing",
        assigned: "Assigned",
        gateBlocked: "Gate Blocked",
        error: "Error",
    },

    input: {
        recordId: "recordId",
    },

    outputs: {
        status: "statusOut",
        message: "messageOut",
        enrollmentRecordId: "enrollmentRecordIdOut",
        lifetimeXp: "lifetimeXpOut",
        currentLevel: "currentLevelOut",
        nextLevel: "nextLevelOut",
        levelGateRule: "levelGateRuleOut",
        gateBlocked: "gateBlockedOut",
        gateReason: "gateReasonOut",
        effectiveZoomCount: "effectiveZoomCountOut",
    },
};


/************************************************************************************************
 * 2. HELPERS
 ************************************************************************************************/

function cleanString(value) {
    return String(value || "").trim();
}

function getNumber(value, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (Array.isArray(value)) {
        const joined = value
            .map((item) => {
                if (typeof item === "number") return item;
                if (item && typeof item === "object" && "name" in item) return item.name;
                return item;
            })
            .join("");

        const parsedFromArray = Number(joined);

        if (Number.isFinite(parsedFromArray)) {
            return parsedFromArray;
        }

        return fallback;
    }

    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
        return parsed;
    }

    return fallback;
}

function fieldExists(table, fieldName) {
    return table.fields.some((field) => field.name === fieldName);
}

function getLinkedIds(record, fieldName) {
    const value = record.getCellValue(fieldName);
    if (!value) return [];
    if (Array.isArray(value)) return value.map((x) => (x && x.id) || x).filter(Boolean);
    if (value.id) return [value.id];
    return [];
}

function getFirstLinkedId(record, fieldName) {
    const ids = getLinkedIds(record, fieldName);
    return ids.length ? ids[0] : null;
}

function getText(record, fieldName) {
    try {
        const v = record.getCellValueAsString(fieldName);
        return v == null ? "" : String(v).trim();
    } catch (e) {
        return "";
    }
}

function isTruthyFlag(record, fieldName) {
    const v = record.getCellValue(fieldName);
    if (v === true || v === 1 || v === "1") return true;
    if (Array.isArray(v) && v.length === 1) {
        const first = v[0];
        return first === true || first === 1 || first === "1";
    }
    return false;
}

/**
 * Combined Zoom count for gates: live Attendees meetings ∪ qualifying recording credits.
 * Never writes Attendees. Marks Gate Credit Applied? only when recording credit is counted.
 */
async function computeEffectiveZoomAttendanceCount(enrollmentId) {
    const zoomMeetingsTable = base.getTable(CONFIG.tables.zoomMeetings);
    const zoomAttendanceTable = base.getTable(CONFIG.tables.zoomAttendance);

    const liveMeetingIds = [];
    const zmQuery = await zoomMeetingsTable.selectRecordsAsync({
        fields: [CONFIG.zoomMeetingFields.attendees],
    });
    for (const meeting of zmQuery.records) {
        const attendees = getLinkedIds(meeting, CONFIG.zoomMeetingFields.attendees);
        if (attendees.includes(enrollmentId)) {
            liveMeetingIds.push(meeting.id);
        }
    }
    try {
        zmQuery.unloadData();
    } catch (e) {
        /* older runtimes */
    }

    const meetingSet = new Set(liveMeetingIds);
    const recordingZaToMark = [];

    const zaFields = Object.values(CONFIG.zoomAttendanceFields).filter((n) =>
        fieldExists(zoomAttendanceTable, n)
    );
    const zaQuery = await zoomAttendanceTable.selectRecordsAsync({ fields: zaFields });
    for (const za of zaQuery.records) {
        if (getText(za, CONFIG.zoomAttendanceFields.attendanceMethod) !== CONFIG.recordingMethod) continue;
        if (getFirstLinkedId(za, CONFIG.zoomAttendanceFields.enrollment) !== enrollmentId) continue;
        const meetingId = getFirstLinkedId(za, CONFIG.zoomAttendanceFields.zoomMeeting);
        if (!meetingId) continue;
        if (isTruthyFlag(za, CONFIG.zoomAttendanceFields.conflict)) continue;
        if (!isTruthyFlag(za, CONFIG.zoomAttendanceFields.approved)) continue;
        if (!isTruthyFlag(za, CONFIG.zoomAttendanceFields.gateEarned)) continue;
        if (getText(za, CONFIG.zoomAttendanceFields.reviewStatus) === CONFIG.reviewNeedsCorrection) continue;

        if (!meetingSet.has(meetingId)) {
            meetingSet.add(meetingId);
            recordingZaToMark.push(za.id);
        }
    }
    try {
        zaQuery.unloadData();
    } catch (e) {
        /* older runtimes */
    }

    for (const zaId of recordingZaToMark) {
        if (!fieldExists(zoomAttendanceTable, CONFIG.zoomAttendanceFields.gateApplied)) break;
        const zaRec = await zoomAttendanceTable.selectRecordAsync(zaId, {
            fields: [CONFIG.zoomAttendanceFields.gateApplied],
        });
        if (zaRec && !isTruthyFlag(zaRec, CONFIG.zoomAttendanceFields.gateApplied)) {
            await zoomAttendanceTable.updateRecordAsync(zaId, {
                [CONFIG.zoomAttendanceFields.gateApplied]: true,
            });
        }
    }

    return {
        effectiveZoomCount: meetingSet.size,
        liveZoomCount: liveMeetingIds.length,
        recordingMeetingsCounted: recordingZaToMark.length,
    };
}

function assertFieldExists(table, fieldName) {
    if (!fieldExists(table, fieldName)) {
        throw new Error(`Missing field "${fieldName}" in table "${table.name}".`);
    }
}

function singleSelectValue(name) {
    return { name };
}

function linkedRecordValue(recordId) {
    return [{ id: recordId }];
}

function emptyLinkedRecordValue() {
    return [];
}

function firstLinkedRecordId(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return "";
    }

    return value[0]?.id || "";
}

function booleanValue(value) {
    return value === true;
}

function setOutputs({
    status = "",
    message = "",
    enrollmentRecordId = "",
    lifetimeXp = "",
    currentLevel = "",
    nextLevel = "",
    levelGateRule = "",
    gateBlocked = false,
    gateReason = "",
    effectiveZoomCount = "",
}) {
    output.set(CONFIG.outputs.status, status);
    output.set(CONFIG.outputs.message, message);
    output.set(CONFIG.outputs.enrollmentRecordId, enrollmentRecordId);
    output.set(CONFIG.outputs.lifetimeXp, lifetimeXp);
    output.set(CONFIG.outputs.currentLevel, currentLevel);
    output.set(CONFIG.outputs.nextLevel, nextLevel);
    output.set(CONFIG.outputs.levelGateRule, levelGateRule);
    output.set(CONFIG.outputs.gateBlocked, gateBlocked);
    output.set(CONFIG.outputs.gateReason, gateReason);
    if (CONFIG.outputs.effectiveZoomCount) {
        try {
            output.set(CONFIG.outputs.effectiveZoomCount, effectiveZoomCount);
        } catch (e) {
            /* optional output may not be configured yet in Airtable */
        }
    }
}

async function markEnrollmentError(enrollmentsTable, recordId, message) {
    await enrollmentsTable.updateRecordAsync(recordId, {
        [CONFIG.enrollmentFields.levelStatus]: singleSelectValue(CONFIG.statusValues.error),
    });

    setOutputs({
        status: "error",
        message,
        enrollmentRecordId: recordId,
    });
}


/************************************************************************************************
 * 3. VALIDATION
 ************************************************************************************************/

function validateSchema(enrollmentsTable, levelsTable, gateRulesTable) {
    const enrollmentRequiredFields = [
        CONFIG.enrollmentFields.lifetimeXpTotal,
        CONFIG.enrollmentFields.currentLevel,
        CONFIG.enrollmentFields.nextLevel,
        CONFIG.enrollmentFields.levelGateRule,
        CONFIG.enrollmentFields.levelStatus,
        CONFIG.enrollmentFields.levelRecalcNeeded,

        CONFIG.enrollmentFields.totalSubmissions,
        CONFIG.enrollmentFields.totalHomeworkCompletions,
        CONFIG.enrollmentFields.totalVideoSubmissions,
        CONFIG.enrollmentFields.totalZoomAttendances,
        CONFIG.enrollmentFields.longestStreakDays,
    ];

    const levelRequiredFields = [
        CONFIG.levelFields.xpRequired,
    ];

    const gateRequiredFields = [
        CONFIG.gateFields.level,
        CONFIG.gateFields.gateEnabled,
        CONFIG.gateFields.minimumSubmissions,
        CONFIG.gateFields.minimumHomework,
        CONFIG.gateFields.minimumVideos,
        CONFIG.gateFields.minimumZoomMeetings,
        CONFIG.gateFields.minimumStreakDays,
    ];

    for (const fieldName of enrollmentRequiredFields) {
        assertFieldExists(enrollmentsTable, fieldName);
    }

    for (const fieldName of levelRequiredFields) {
        assertFieldExists(levelsTable, fieldName);
    }

    for (const fieldName of gateRequiredFields) {
        assertFieldExists(gateRulesTable, fieldName);
    }
}


/************************************************************************************************
 * 4. LEVEL AND GATE LOGIC
 ************************************************************************************************/

function buildLevelList(levelRecords, levelsTable) {
    const activeFieldExists = fieldExists(levelsTable, CONFIG.levelFields.active);

    const levels = levelRecords
        .map((levelRecord) => {
            const xpRequired = getNumber(
                levelRecord.getCellValue(CONFIG.levelFields.xpRequired),
                null
            );

            const activeValue = activeFieldExists
                ? levelRecord.getCellValue(CONFIG.levelFields.active)
                : true;

            return {
                id: levelRecord.id,
                name: levelRecord.name,
                xpRequired,
                active: Boolean(activeValue),
            };
        })
        .filter((level) => level.active)
        .filter((level) => typeof level.xpRequired === "number" && Number.isFinite(level.xpRequired))
        .sort((a, b) => a.xpRequired - b.xpRequired);

    if (levels.length === 0) {
        throw new Error("No active Levels found with valid XP Required (Cumulative) values.");
    }

    const seenThresholds = new Map();

    for (const level of levels) {
        if (seenThresholds.has(level.xpRequired)) {
            const existingLevelName = seenThresholds.get(level.xpRequired);

            throw new Error(
                `Duplicate active level threshold found: ${level.xpRequired} XP is used by "${existingLevelName}" and "${level.name}".`
            );
        }

        seenThresholds.set(level.xpRequired, level.name);
    }

    return levels;
}

function buildGateRuleMap(gateRecords, gateRulesTable) {
    const versionActiveFieldExists = fieldExists(gateRulesTable, CONFIG.gateFields.versionActive);
    const gateRuleMap = new Map();

    for (const gateRecord of gateRecords) {
        const versionActive = versionActiveFieldExists
            ? booleanValue(gateRecord.getCellValue(CONFIG.gateFields.versionActive))
            : true;

        if (!versionActive) {
            continue;
        }

        const linkedLevelId = firstLinkedRecordId(gateRecord.getCellValue(CONFIG.gateFields.level));

        if (!linkedLevelId) {
            continue;
        }

        if (gateRuleMap.has(linkedLevelId)) {
            const existing = gateRuleMap.get(linkedLevelId);

            throw new Error(
                `Multiple active gate rules found for the same level: "${existing.name}" and "${gateRecord.name}".`
            );
        }

        gateRuleMap.set(linkedLevelId, {
            id: gateRecord.id,
            name: gateRecord.name,
            levelId: linkedLevelId,
            gateEnabled: booleanValue(gateRecord.getCellValue(CONFIG.gateFields.gateEnabled)),
            minimumSubmissions: getNumber(gateRecord.getCellValue(CONFIG.gateFields.minimumSubmissions), 0),
            minimumHomework: getNumber(gateRecord.getCellValue(CONFIG.gateFields.minimumHomework), 0),
            minimumVideos: getNumber(gateRecord.getCellValue(CONFIG.gateFields.minimumVideos), 0),
            minimumZoomMeetings: getNumber(gateRecord.getCellValue(CONFIG.gateFields.minimumZoomMeetings), 0),
            minimumStreakDays: getNumber(gateRecord.getCellValue(CONFIG.gateFields.minimumStreakDays), 0),
        });
    }

    return gateRuleMap;
}

function getEnrollmentGateStats(enrollment) {
    return {
        totalSubmissions: getNumber(enrollment.getCellValue(CONFIG.enrollmentFields.totalSubmissions), 0),
        totalHomeworkCompletions: getNumber(enrollment.getCellValue(CONFIG.enrollmentFields.totalHomeworkCompletions), 0),
        totalVideoSubmissions: getNumber(enrollment.getCellValue(CONFIG.enrollmentFields.totalVideoSubmissions), 0),
        totalZoomAttendances: getNumber(enrollment.getCellValue(CONFIG.enrollmentFields.totalZoomAttendances), 0),
        longestStreakDays: getNumber(enrollment.getCellValue(CONFIG.enrollmentFields.longestStreakDays), 0),
    };
}

function evaluateGate(gateRule, stats) {
    if (!gateRule) {
        return {
            passes: true,
            enabled: false,
            reason: "No gate rule found for this level.",
        };
    }

    if (!gateRule.gateEnabled) {
        return {
            passes: true,
            enabled: false,
            reason: `${gateRule.name} is disabled.`,
        };
    }

    const failures = [];

    if (stats.totalSubmissions < gateRule.minimumSubmissions) {
        failures.push(`Submissions ${stats.totalSubmissions}/${gateRule.minimumSubmissions}`);
    }

    if (stats.totalHomeworkCompletions < gateRule.minimumHomework) {
        failures.push(`Homework ${stats.totalHomeworkCompletions}/${gateRule.minimumHomework}`);
    }

    if (stats.totalVideoSubmissions < gateRule.minimumVideos) {
        failures.push(`Videos ${stats.totalVideoSubmissions}/${gateRule.minimumVideos}`);
    }

    if (stats.totalZoomAttendances < gateRule.minimumZoomMeetings) {
        failures.push(`Zoom ${stats.totalZoomAttendances}/${gateRule.minimumZoomMeetings}`);
    }

    if (stats.longestStreakDays < gateRule.minimumStreakDays) {
        failures.push(`Streak ${stats.longestStreakDays}/${gateRule.minimumStreakDays}`);
    }

    if (failures.length > 0) {
        return {
            passes: false,
            enabled: true,
            reason: `${gateRule.name} blocked: ${failures.join("; ")}.`,
        };
    }

    return {
        passes: true,
        enabled: true,
        reason: `${gateRule.name} passed.`,
    };
}

function determineAllowedLevelWithGateBlocking(levels, gateRuleMap, lifetimeXp, stats) {
    let allowedLevel = levels[0];
    let blockedLevel = null;
    let blockedGateRule = null;
    let blockedGateResult = null;

    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];

        if (lifetimeXp < level.xpRequired) {
            break;
        }

        const gateRule = gateRuleMap.get(level.id) || null;
        const gateResult = evaluateGate(gateRule, stats);

        if (!gateResult.passes) {
            blockedLevel = level;
            blockedGateRule = gateRule;
            blockedGateResult = gateResult;
            break;
        }

        allowedLevel = level;
    }

    if (blockedLevel) {
        return {
            currentLevel: allowedLevel,
            nextLevel: blockedLevel,
            levelGateRule: blockedGateRule,
            status: CONFIG.statusValues.gateBlocked,
            gateBlocked: true,
            gateReason: blockedGateResult.reason,
        };
    }

    const allowedIndex = levels.findIndex((level) => level.id === allowedLevel.id);
    const nextLevel = levels[allowedIndex + 1] || null;
    const nextGateRule = nextLevel ? (gateRuleMap.get(nextLevel.id) || null) : null;

    return {
        currentLevel: allowedLevel,
        nextLevel,
        levelGateRule: nextGateRule,
        status: CONFIG.statusValues.assigned,
        gateBlocked: false,
        gateReason: nextGateRule
            ? `Next gate rule assigned: ${nextGateRule.name}.`
            : "No next level gate rule.",
    };
}


/************************************************************************************************
 * 5. MAIN
 ************************************************************************************************/

async function main() {
    const inputConfig = input.config();
    const recordId = cleanString(inputConfig[CONFIG.input.recordId]);

    if (!recordId) {
        const message = "Missing required input variable: recordId.";

        setOutputs({
            status: "error",
            message,
        });

        throw new Error(message);
    }

    const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    const levelsTable = base.getTable(CONFIG.tables.levels);
    const gateRulesTable = base.getTable(CONFIG.tables.levelGateRules);

    validateSchema(enrollmentsTable, levelsTable, gateRulesTable);

    try {
        await enrollmentsTable.updateRecordAsync(recordId, {
            [CONFIG.enrollmentFields.levelStatus]: singleSelectValue(CONFIG.statusValues.processing),
        });

        const enrollment = await enrollmentsTable.selectRecordAsync(recordId, {
            fields: [
                CONFIG.enrollmentFields.lifetimeXpTotal,
                CONFIG.enrollmentFields.currentLevel,
                CONFIG.enrollmentFields.nextLevel,
                CONFIG.enrollmentFields.levelGateRule,
                CONFIG.enrollmentFields.levelStatus,
                CONFIG.enrollmentFields.levelRecalcNeeded,
                CONFIG.enrollmentFields.totalSubmissions,
                CONFIG.enrollmentFields.totalHomeworkCompletions,
                CONFIG.enrollmentFields.totalVideoSubmissions,
                CONFIG.enrollmentFields.totalZoomAttendances,
                CONFIG.enrollmentFields.longestStreakDays,
            ],
        });

        if (!enrollment) {
            const message = `Enrollment record not found: ${recordId}`;

            setOutputs({
                status: "error",
                message,
                enrollmentRecordId: recordId,
            });

            throw new Error(message);
        }

        const lifetimeXp = getNumber(
            enrollment.getCellValue(CONFIG.enrollmentFields.lifetimeXpTotal),
            0
        );

        const stats = getEnrollmentGateStats(enrollment);
        const zoomCombined = await computeEffectiveZoomAttendanceCount(recordId);
        stats.totalZoomAttendances = zoomCombined.effectiveZoomCount;
        stats.liveZoomAttendances = zoomCombined.liveZoomCount;
        stats.recordingZoomMeetingsCounted = zoomCombined.recordingMeetingsCounted;

        const levelFieldsToSelect = [
            CONFIG.levelFields.xpRequired,
        ];

        if (fieldExists(levelsTable, CONFIG.levelFields.active)) {
            levelFieldsToSelect.push(CONFIG.levelFields.active);
        }

        const gateFieldsToSelect = [
            CONFIG.gateFields.level,
            CONFIG.gateFields.gateEnabled,
            CONFIG.gateFields.minimumSubmissions,
            CONFIG.gateFields.minimumHomework,
            CONFIG.gateFields.minimumVideos,
            CONFIG.gateFields.minimumZoomMeetings,
            CONFIG.gateFields.minimumStreakDays,
        ];

        if (fieldExists(gateRulesTable, CONFIG.gateFields.versionActive)) {
            gateFieldsToSelect.push(CONFIG.gateFields.versionActive);
        }

        const levelsQuery = await levelsTable.selectRecordsAsync({
            fields: levelFieldsToSelect,
        });

        const gateRulesQuery = await gateRulesTable.selectRecordsAsync({
            fields: gateFieldsToSelect,
        });

        const levels = buildLevelList(levelsQuery.records, levelsTable);
        const gateRuleMap = buildGateRuleMap(gateRulesQuery.records, gateRulesTable);

        const result = determineAllowedLevelWithGateBlocking(
            levels,
            gateRuleMap,
            lifetimeXp,
            stats
        );

        const fieldsToUpdate = {
            [CONFIG.enrollmentFields.currentLevel]: linkedRecordValue(result.currentLevel.id),

            [CONFIG.enrollmentFields.nextLevel]: result.nextLevel
                ? linkedRecordValue(result.nextLevel.id)
                : emptyLinkedRecordValue(),

            [CONFIG.enrollmentFields.levelGateRule]: result.levelGateRule
                ? linkedRecordValue(result.levelGateRule.id)
                : emptyLinkedRecordValue(),

            [CONFIG.enrollmentFields.levelStatus]: singleSelectValue(result.status),

            [CONFIG.enrollmentFields.levelRecalcNeeded]: false,
        };

        await enrollmentsTable.updateRecordAsync(recordId, fieldsToUpdate);

        const message = result.gateBlocked
            ? `Level assignment blocked for Enrollment ${recordId}: ${result.gateReason}`
            : `Level assignment complete for Enrollment ${recordId}.`;

        console.log(
            JSON.stringify(
                {
                    ok: true,
                    automation: CONFIG.automation.name,
                    version: CONFIG.automation.version,
                    enrollmentRecordId: recordId,
                    lifetimeXp,
                    stats,
                    currentLevel: {
                        id: result.currentLevel.id,
                        name: result.currentLevel.name,
                        xpRequired: result.currentLevel.xpRequired,
                    },
                    nextLevel: result.nextLevel
                        ? {
                              id: result.nextLevel.id,
                              name: result.nextLevel.name,
                              xpRequired: result.nextLevel.xpRequired,
                          }
                        : null,
                    levelGateRule: result.levelGateRule
                        ? {
                              id: result.levelGateRule.id,
                              name: result.levelGateRule.name,
                          }
                        : null,
                    levelStatus: result.status,
                    gateBlocked: result.gateBlocked,
                    gateReason: result.gateReason,
                    levelRecalcNeededCleared: true,
                },
                null,
                2
            )
        );

        setOutputs({
            status: result.gateBlocked ? "gate_blocked" : "success",
            message,
            enrollmentRecordId: recordId,
            lifetimeXp,
            currentLevel: result.currentLevel.name,
            nextLevel: result.nextLevel ? result.nextLevel.name : "",
            levelGateRule: result.levelGateRule ? result.levelGateRule.name : "",
            gateBlocked: result.gateBlocked,
            gateReason: result.gateReason,
            effectiveZoomCount: stats.totalZoomAttendances,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await markEnrollmentError(enrollmentsTable, recordId, message);

        throw new Error(message);
    }
}


/************************************************************************************************
 * 6. RUN
 ************************************************************************************************/

await main();
