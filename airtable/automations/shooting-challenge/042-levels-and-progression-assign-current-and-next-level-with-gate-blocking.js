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
 * Version: 4.0
 * Date Written: 2026-06-02
 * Last Updated: 2026-08-13
 *
 * Purpose:
 * Recalculates an Enrollment's Current Level and Next Level based on Lifetime XP Total,
 * but blocks advancement into a gated level unless the athlete meets that level's active
 * gate requirements.
 *
 * Version 3.3 (2026-08-08):
 * - Selects active Level Gate Rules by the Enrollment School Year / Rule Set.
 * - Allows only explicit shared/default rules as fallback; never uses a prior-year
 *   rule silently and fails closed on duplicate applicable rules.
 * - Reads explicit primary-field values for Level and Level Gate Rule labels.
 *   This avoids generic Airtable record labels in logs and gate explanations.
 *
 * Version 3.4 (2026-08-12):
 * Version 4.0 (PKG-036, 2026-08-13):
 * - Reads until Lifetime XP and gate-stat formulas are stable before assignment.
 * - Validates the active level ladder, including one nonnegative 0-XP initial
 *   level, unique thresholds, names, and a deterministic maximum.
 * - Requires exactly one applicable active gate rule for every active level.
 * - Verifies the complete post-write state before acknowledging the queue.
 * - Preserves Level Recalc Needed? on every error so the same Enrollment is
 *   automatically retryable.
 * - Writes Progression Last Reconciled Signature only after verified success.
 *
 * Version 3.2 (2026-08-05):
 * - Airtable runtime compatibility: guard optional QueryResult.unloadData() cleanup
 *   so unsupported cleanup cannot fail an otherwise successful automation run.
 * - Read explicit primary-field values for Level and Level Gate Rule labels. This
 *   avoids the Airtable automation runtime's occasional generic record.name label
 *   ("Unnamed record") in logs, outputs, and gate explanations.
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
 * Level Recalc Needed? is checked AND Active? is checked
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
 * Enrollments.School Year
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
 * Level Gate Rules.School Year / Rule Set
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
        version: "4.0",
    },

    tables: {
        enrollments: "Enrollments",
        levels: "Levels",
        levelGateRules: "Level Gate Rules",
        zoomMeetings: "Zoom Meetings",
        zoomAttendance: "Zoom Attendance",
    },

    enrollmentFields: {
        lifetimeXpManualAdjustments: "Lifetime XP Manual Adjustments",
        lifetimeXpTotal: "Lifetime XP Total",
        currentLevel: "Current Level",
        nextLevel: "Next Level",
        levelGateRule: "Level Gate Rule",
        levelStatus: "Level Status",
        levelRecalcNeeded: "Level Recalc Needed?",
        lastReconciledSignature: "Progression Last Reconciled Signature",
        active: "Active?",

        totalSubmissions: "Total Submissions",
        totalHomeworkCompletions: "Total Homework Completions",
        totalVideoSubmissions: "Total Video Submissions",
        totalZoomAttendances: "Total Zoom Attendances",
        longestStreakDays: "Longest Streak Days",
        schoolYear: "School Year",
        programInstance: "Program Instance",
    },

    levelFields: {
        name: "Level Name",
        xpRequired: "XP Required (Cumulative)",
        active: "Active?",
        sortOrder: "Sort Order",
    },

    gateFields: {
        name: "Level Gate Rule Name",
        level: "Level",
        versionActive: "Version Active?",
        schoolYear: "School Year / Rule Set",
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
        skippedInactive: "skipped_inactive",
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

function assertRecordId(recordId) {
    if (!recordId || !recordId.startsWith("rec")) {
        throw new Error(
            `Invalid recordId: expected a non-empty Airtable record ID starting with "rec".`
        );
    }
    return recordId;
}

function getNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }

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

function getRequiredNonnegativeNumber(record, fieldName, label) {
    const raw = record.getCellValue(fieldName);
    if (raw === null || raw === undefined || raw === "") {
        throw new Error(`Missing numeric configuration "${label}".`);
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid numeric configuration "${label}": ${raw}.`);
    }
    return value;
}

function fieldExists(table, fieldName) {
    return table.fields.some((field) => field.name === fieldName);
}

function getLinkedIds(record, fieldName) {
    const value = record.getCellValue(fieldName);
    if (!value) return [];
    if (Array.isArray(value)) {
        return value
            .map((x) => (x && x.id) || x)
            .filter(Boolean)
            .sort();
    }
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

/**
 * Do not use record.name for human-facing labels. In automation runs Airtable
 * can return its generic fallback even when the actual primary field is set.
 */
function getRecordLabel(record, primaryFieldName, fallbackLabel) {
    const explicitName = getText(record, primaryFieldName);
    if (explicitName) return explicitName;

    const recordName = cleanString(record?.name);
    if (recordName && recordName !== "Unnamed record") return recordName;

    return fallbackLabel;
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
 * Airtable Scripting sometimes exposes unloadData on QueryResult; some automation
 * runtimes do not. Never let cleanup throw after successful business work.
 */
function unloadQuerySafe(queryResult) {
    if (typeof queryResult?.unloadData === "function") {
        try {
            queryResult.unloadData();
        } catch (error) {
            console.log(
                "Query unloadData skipped/failed (non-fatal)",
                JSON.stringify({
                    error: error instanceof Error ? error.message : String(error),
                })
            );
        }
    }
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
    try {
        for (const meeting of zmQuery.records) {
            const attendees = getLinkedIds(meeting, CONFIG.zoomMeetingFields.attendees);
            if (attendees.includes(enrollmentId)) {
                liveMeetingIds.push(meeting.id);
            }
        }
    } finally {
        unloadQuerySafe(zmQuery);
    }

    const meetingSet = new Set(liveMeetingIds);
    const recordingZaToMark = [];

    const zaFields = Object.values(CONFIG.zoomAttendanceFields).filter((n) =>
        fieldExists(zoomAttendanceTable, n)
    );
    const zaQuery = await zoomAttendanceTable.selectRecordsAsync({ fields: zaFields });
    try {
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
    } finally {
        unloadQuerySafe(zaQuery);
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
    return value === true || value === 1 || value === "1";
}

function normalizeSchoolYear(value) {
    const normalized = cleanString(value).replace(/[–—−]/g, "-");
    if (!normalized) return "";

    const match = normalized.match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
        throw new Error(`Malformed school year / rule set: "${value}".`);
    }

    return `${match[1]}-${match[2]}`;
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

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getEnrollmentReadFields() {
    return [
        CONFIG.enrollmentFields.lifetimeXpTotal,
        CONFIG.enrollmentFields.lifetimeXpManualAdjustments,
        CONFIG.enrollmentFields.currentLevel,
        CONFIG.enrollmentFields.nextLevel,
        CONFIG.enrollmentFields.levelGateRule,
        CONFIG.enrollmentFields.levelStatus,
        CONFIG.enrollmentFields.levelRecalcNeeded,
        CONFIG.enrollmentFields.lastReconciledSignature,
        CONFIG.enrollmentFields.active,
        CONFIG.enrollmentFields.totalSubmissions,
        CONFIG.enrollmentFields.totalHomeworkCompletions,
        CONFIG.enrollmentFields.totalVideoSubmissions,
        CONFIG.enrollmentFields.totalZoomAttendances,
        CONFIG.enrollmentFields.longestStreakDays,
        CONFIG.enrollmentFields.schoolYear,
        CONFIG.enrollmentFields.programInstance,
    ];
}

function buildSettlementFingerprint(enrollment) {
    return JSON.stringify({
        lifetimeXp: enrollment.getCellValue(CONFIG.enrollmentFields.lifetimeXpTotal),
        totalSubmissions: enrollment.getCellValue(CONFIG.enrollmentFields.totalSubmissions),
        totalHomeworkCompletions: enrollment.getCellValue(CONFIG.enrollmentFields.totalHomeworkCompletions),
        totalVideoSubmissions: enrollment.getCellValue(CONFIG.enrollmentFields.totalVideoSubmissions),
        totalZoomAttendances: enrollment.getCellValue(CONFIG.enrollmentFields.totalZoomAttendances),
        longestStreakDays: enrollment.getCellValue(CONFIG.enrollmentFields.longestStreakDays),
        schoolYear: getText(enrollment, CONFIG.enrollmentFields.schoolYear),
        programInstance: getLinkedIds(enrollment, CONFIG.enrollmentFields.programInstance),
        active: isTruthyFlag(enrollment, CONFIG.enrollmentFields.active),
    });
}

async function readSettledEnrollment(table, recordId, fields) {
    let previousFingerprint = "";
    let stableReads = 0;

    for (let attempt = 1; attempt <= 4; attempt += 1) {
        const enrollment = await table.selectRecordAsync(recordId, { fields });
        if (!enrollment) {
            throw new Error(`Enrollment record not found: ${recordId}`);
        }

        const fingerprint = buildSettlementFingerprint(enrollment);
        if (fingerprint === previousFingerprint) {
            stableReads += 1;
        } else {
            stableReads = 1;
            previousFingerprint = fingerprint;
        }

        if (stableReads >= 2) {
            return enrollment;
        }

        if (attempt < 4) {
            await sleep(750);
        }
    }

    throw new Error(
        `Formula/rollup values did not settle within the bounded read window for Enrollment ${recordId}.`
    );
}

function buildConfigurationFingerprint(levels, gateRules) {
    return JSON.stringify({
        levels: levels
            .map((level) => ({
                id: level.id,
                name: getRecordLabel(level, CONFIG.levelFields.name, ""),
                xpRequired: level.getCellValue(CONFIG.levelFields.xpRequired),
                active: booleanValue(level.getCellValue(CONFIG.levelFields.active)),
                sortOrder: level.getCellValue(CONFIG.levelFields.sortOrder),
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        gateRules: gateRules
            .map((rule) => ({
                id: rule.id,
                level: getLinkedIds(rule, CONFIG.gateFields.level),
                schoolYear: getText(rule, CONFIG.gateFields.schoolYear),
                versionActive: booleanValue(rule.getCellValue(CONFIG.gateFields.versionActive)),
                gateEnabled: booleanValue(rule.getCellValue(CONFIG.gateFields.gateEnabled)),
                minimumSubmissions: rule.getCellValue(CONFIG.gateFields.minimumSubmissions),
                minimumHomework: rule.getCellValue(CONFIG.gateFields.minimumHomework),
                minimumVideos: rule.getCellValue(CONFIG.gateFields.minimumVideos),
                minimumZoomMeetings: rule.getCellValue(CONFIG.gateFields.minimumZoomMeetings),
                minimumStreakDays: rule.getCellValue(CONFIG.gateFields.minimumStreakDays),
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
    });
}

function buildReconciledSignature(enrollment, levels, gateRules) {
    const levelValues = levels
        .map((level) => ({
            id: level.id,
            name: getRecordLabel(level, CONFIG.levelFields.name, ""),
            xpRequired: getNumber(level.getCellValue(CONFIG.levelFields.xpRequired), null),
            active: booleanValue(level.getCellValue(CONFIG.levelFields.active)),
            sortOrder: getNumber(level.getCellValue(CONFIG.levelFields.sortOrder), 0),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    const gateRuleValues = gateRules
        .map((rule) => ({
            id: rule.id,
            level: getLinkedIds(rule, CONFIG.gateFields.level),
            schoolYearRuleSet: getText(rule, CONFIG.gateFields.schoolYear),
            versionActive: booleanValue(rule.getCellValue(CONFIG.gateFields.versionActive)),
            gateEnabled: booleanValue(rule.getCellValue(CONFIG.gateFields.gateEnabled)),
            minimumSubmissions: getNumber(rule.getCellValue(CONFIG.gateFields.minimumSubmissions), 0),
            minimumHomework: getNumber(rule.getCellValue(CONFIG.gateFields.minimumHomework), 0),
            minimumVideos: getNumber(rule.getCellValue(CONFIG.gateFields.minimumVideos), 0),
            minimumZoomMeetings: getNumber(rule.getCellValue(CONFIG.gateFields.minimumZoomMeetings), 0),
            minimumStreakDays: getNumber(rule.getCellValue(CONFIG.gateFields.minimumStreakDays), 0),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    return JSON.stringify({
        version: 2,
        enrollmentId: enrollment.id,
        enrollment: {
            "Lifetime XP Total": getNumber(
                enrollment.getCellValue(CONFIG.enrollmentFields.lifetimeXpTotal),
                0
            ),
            "Lifetime XP Manual Adjustments": getNumber(
                enrollment.getCellValue(CONFIG.enrollmentFields.lifetimeXpManualAdjustments),
                0
            ),
            "Total Submissions": getNumber(
                enrollment.getCellValue(CONFIG.enrollmentFields.totalSubmissions),
                0
            ),
            "Total Homework Completions": getNumber(
                enrollment.getCellValue(CONFIG.enrollmentFields.totalHomeworkCompletions),
                0
            ),
            "Total Video Submissions": getNumber(
                enrollment.getCellValue(CONFIG.enrollmentFields.totalVideoSubmissions),
                0
            ),
            "Total Zoom Attendances": getNumber(
                enrollment.getCellValue(CONFIG.enrollmentFields.totalZoomAttendances),
                0
            ),
            "Longest Streak Days": getNumber(
                enrollment.getCellValue(CONFIG.enrollmentFields.longestStreakDays),
                0
            ),
            "School Year": getText(enrollment, CONFIG.enrollmentFields.schoolYear),
            "Active?": isTruthyFlag(enrollment, CONFIG.enrollmentFields.active),
        },
        outputs: {
            currentLevel: getLinkedIds(enrollment, CONFIG.enrollmentFields.currentLevel),
            nextLevel: getLinkedIds(enrollment, CONFIG.enrollmentFields.nextLevel),
            levelGateRule: getLinkedIds(enrollment, CONFIG.enrollmentFields.levelGateRule),
            levelStatus: getText(enrollment, CONFIG.enrollmentFields.levelStatus),
        },
        programInstance: getLinkedIds(enrollment, CONFIG.enrollmentFields.programInstance),
        levels: levelValues,
        gateRules: gateRuleValues,
    });
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
        [CONFIG.enrollmentFields.levelRecalcNeeded]: true,
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
        CONFIG.enrollmentFields.lifetimeXpManualAdjustments,
        CONFIG.enrollmentFields.lifetimeXpTotal,
        CONFIG.enrollmentFields.currentLevel,
        CONFIG.enrollmentFields.nextLevel,
        CONFIG.enrollmentFields.levelGateRule,
        CONFIG.enrollmentFields.levelStatus,
        CONFIG.enrollmentFields.levelRecalcNeeded,
        CONFIG.enrollmentFields.lastReconciledSignature,
        CONFIG.enrollmentFields.active,

        CONFIG.enrollmentFields.totalSubmissions,
        CONFIG.enrollmentFields.totalHomeworkCompletions,
        CONFIG.enrollmentFields.totalVideoSubmissions,
        CONFIG.enrollmentFields.totalZoomAttendances,
        CONFIG.enrollmentFields.longestStreakDays,
        CONFIG.enrollmentFields.schoolYear,
        CONFIG.enrollmentFields.programInstance,
    ];

    const levelRequiredFields = [
        CONFIG.levelFields.name,
        CONFIG.levelFields.xpRequired,
        CONFIG.levelFields.active,
        CONFIG.levelFields.sortOrder,
    ];

    const gateRequiredFields = [
        CONFIG.gateFields.name,
        CONFIG.gateFields.level,
        CONFIG.gateFields.versionActive,
        CONFIG.gateFields.gateEnabled,
        CONFIG.gateFields.minimumSubmissions,
        CONFIG.gateFields.minimumHomework,
        CONFIG.gateFields.minimumVideos,
        CONFIG.gateFields.minimumZoomMeetings,
        CONFIG.gateFields.minimumStreakDays,
        CONFIG.gateFields.schoolYear,
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
    const levels = levelRecords
        .map((levelRecord) => {
            const xpRequired = getNumber(
                levelRecord.getCellValue(CONFIG.levelFields.xpRequired),
                null
            );

            const activeValue = levelRecord.getCellValue(CONFIG.levelFields.active);
            const name = getRecordLabel(
                levelRecord,
                CONFIG.levelFields.name,
                ""
            );

            return {
                id: levelRecord.id,
                name,
                xpRequired,
                active: booleanValue(activeValue),
            };
        })
        .filter((level) => level.active)
        .sort((a, b) => a.xpRequired - b.xpRequired);

    if (levels.length === 0) {
        throw new Error("No active Levels found with valid XP Required (Cumulative) values.");
    }

    const seenThresholds = new Map();

    for (const level of levels) {
        if (!level.name) {
            throw new Error(`Active Level ${level.id} is missing Level Name.`);
        }

        if (
            !Number.isFinite(level.xpRequired) ||
            level.xpRequired < 0
        ) {
            throw new Error(
                `Invalid active level threshold for "${level.name}": expected a finite nonnegative XP value.`
            );
        }

        if (seenThresholds.has(level.xpRequired)) {
            const existingLevelName = seenThresholds.get(level.xpRequired);

            throw new Error(
                `Duplicate active level threshold found: ${level.xpRequired} XP is used by "${existingLevelName}" and "${level.name}".`
            );
        }

        seenThresholds.set(level.xpRequired, level.name);
    }

    const initialLevels = levels.filter((level) => level.xpRequired === 0);
    if (initialLevels.length !== 1) {
        throw new Error(
            `Expected exactly one active initial Level at 0 XP; found ${initialLevels.length}.`
        );
    }

    return levels;
}

function buildGateRuleMap(gateRecords, gateRulesTable, enrollmentSchoolYear, activeLevels) {
    const versionActiveFieldExists = fieldExists(gateRulesTable, CONFIG.gateFields.versionActive);
    const targetSchoolYear = normalizeSchoolYear(enrollmentSchoolYear);
    if (!targetSchoolYear) {
        throw new Error("Enrollment School Year is required for gate-rule selection.");
    }

    const candidatesByLevel = new Map();

    for (const gateRecord of gateRecords) {
        const versionActive = versionActiveFieldExists
            ? booleanValue(gateRecord.getCellValue(CONFIG.gateFields.versionActive))
            : true;

        if (!versionActive) {
            continue;
        }

        const linkedLevelIds = getLinkedIds(gateRecord, CONFIG.gateFields.level);
        if (linkedLevelIds.length !== 1) {
            throw new Error(
                `Gate rule "${getRecordLabel(gateRecord, CONFIG.gateFields.name, gateRecord.id)}" must link exactly one Level.`
            );
        }
        const linkedLevelId = linkedLevelIds[0];

        if (!linkedLevelId) {
            continue;
        }

        const schoolYear = getText(gateRecord, CONFIG.gateFields.schoolYear);
        if (schoolYear && !isSharedSchoolYear(schoolYear)) {
            normalizeSchoolYear(schoolYear);
        }

        const rule = {
            id: gateRecord.id,
            name: getRecordLabel(
                gateRecord,
                CONFIG.gateFields.name,
                `Gate rule ${gateRecord.id}`
            ),
            levelId: linkedLevelId,
            schoolYear,
            gateEnabled: booleanValue(gateRecord.getCellValue(CONFIG.gateFields.gateEnabled)),
            minimumSubmissions: getRequiredNonnegativeNumber(
                gateRecord,
                CONFIG.gateFields.minimumSubmissions,
                `${getRecordLabel(gateRecord, CONFIG.gateFields.name, gateRecord.id)}.Minimum Submissions`
            ),
            minimumHomework: getRequiredNonnegativeNumber(
                gateRecord,
                CONFIG.gateFields.minimumHomework,
                `${getRecordLabel(gateRecord, CONFIG.gateFields.name, gateRecord.id)}.Minimum Homework`
            ),
            minimumVideos: getRequiredNonnegativeNumber(
                gateRecord,
                CONFIG.gateFields.minimumVideos,
                `${getRecordLabel(gateRecord, CONFIG.gateFields.name, gateRecord.id)}.Minimum Videos`
            ),
            minimumZoomMeetings: getRequiredNonnegativeNumber(
                gateRecord,
                CONFIG.gateFields.minimumZoomMeetings,
                `${getRecordLabel(gateRecord, CONFIG.gateFields.name, gateRecord.id)}.Minimum Zoom Meetings`
            ),
            minimumStreakDays: getRequiredNonnegativeNumber(
                gateRecord,
                CONFIG.gateFields.minimumStreakDays,
                `${getRecordLabel(gateRecord, CONFIG.gateFields.name, gateRecord.id)}.Minimum Streak Days`
            ),
        };

        if (!candidatesByLevel.has(linkedLevelId)) {
            candidatesByLevel.set(linkedLevelId, []);
        }
        candidatesByLevel.get(linkedLevelId).push(rule);
    }

    const activeLevelIds = new Set(activeLevels.map((level) => level.id));
    for (const [levelId] of candidatesByLevel) {
        if (!activeLevelIds.has(levelId)) {
            throw new Error(`Active gate rule points to inactive or unknown Level "${levelId}".`);
        }
    }

    const gateRuleMap = new Map();
    for (const level of activeLevels) {
        const levelId = level.id;
        const candidates = candidatesByLevel.get(levelId) || [];
        const exact = candidates.filter(
            (candidate) =>
                !isSharedSchoolYear(candidate.schoolYear) &&
                normalizeSchoolYear(candidate.schoolYear) === targetSchoolYear
        );
        const shared = candidates.filter((candidate) =>
            isSharedSchoolYear(candidate.schoolYear)
        );
        const applicable = exact.length > 0 ? exact : shared;

        if (applicable.length > 1) {
            throw new Error(
                `Multiple active gate rules found for level "${levelId}" and school year "${targetSchoolYear}": ` +
                    applicable.map((candidate) => `"${candidate.name}"`).join(", ") +
                    "."
            );
        }

        if (applicable.length === 0) {
            throw new Error(
                `No active gate rule found for level "${levelId}" and school year "${targetSchoolYear}". ` +
                    "A prior-year rule cannot be used."
            );
        }

        gateRuleMap.set(levelId, applicable[0]);
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
    const recordId = assertRecordId(
        cleanString(inputConfig[CONFIG.input.recordId])
    );

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
    requireWritableField(
        enrollmentsTable,
        CONFIG.enrollmentFields.lastReconciledSignature,
        "Enrollments -> Progression Last Reconciled Signature"
    );

    try {
        const enrollment = await readSettledEnrollment(
            enrollmentsTable,
            recordId,
            getEnrollmentReadFields()
        );

        const programInstanceIds = getLinkedIds(
            enrollment,
            CONFIG.enrollmentFields.programInstance
        );
        if (programInstanceIds.length !== 1) {
            throw new Error(
                `Enrollment ${recordId} must link exactly one Program Instance; found ${programInstanceIds.length}.`
            );
        }

        const enrollmentIsActive = isTruthyFlag(
            enrollment,
            CONFIG.enrollmentFields.active
        );

        if (!enrollmentIsActive) {
            const message =
                `Enrollment ${recordId} is inactive; progression fields preserved and stale ` +
                "recalculation request cleared.";

            await enrollmentsTable.updateRecordAsync(recordId, {
                [CONFIG.enrollmentFields.levelRecalcNeeded]: false,
            });

            console.log(
                JSON.stringify({
                    ok: true,
                    automation: CONFIG.automation.name,
                    version: CONFIG.automation.version,
                    enrollmentRecordId: recordId,
                    status: CONFIG.statusValues.skippedInactive,
                    action: "skipped_inactive",
                    levelRecalcNeededCleared: true,
                    progressionFieldsPreserved: true,
                })
            );

            setOutputs({
                status: CONFIG.statusValues.skippedInactive,
                message,
                enrollmentRecordId: recordId,
                lifetimeXp: getNumber(
                    enrollment.getCellValue(CONFIG.enrollmentFields.lifetimeXpTotal),
                    0
                ),
                currentLevel: getText(
                    enrollment,
                    CONFIG.enrollmentFields.currentLevel
                ),
                nextLevel: getText(
                    enrollment,
                    CONFIG.enrollmentFields.nextLevel
                ),
                levelGateRule: getText(
                    enrollment,
                    CONFIG.enrollmentFields.levelGateRule
                ),
            });
            return;
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
            CONFIG.levelFields.name,
            CONFIG.levelFields.xpRequired,
            CONFIG.levelFields.active,
            CONFIG.levelFields.sortOrder,
        ];

        const gateFieldsToSelect = [
            CONFIG.gateFields.name,
            CONFIG.gateFields.level,
            CONFIG.gateFields.versionActive,
            CONFIG.gateFields.gateEnabled,
            CONFIG.gateFields.minimumSubmissions,
            CONFIG.gateFields.minimumHomework,
            CONFIG.gateFields.minimumVideos,
            CONFIG.gateFields.minimumZoomMeetings,
            CONFIG.gateFields.minimumStreakDays,
            CONFIG.gateFields.schoolYear,
        ];

        const levelsQuery = await levelsTable.selectRecordsAsync({
            fields: levelFieldsToSelect,
        });

        const gateRulesQuery = await gateRulesTable.selectRecordsAsync({
            fields: gateFieldsToSelect,
        });

        const levels = buildLevelList(levelsQuery.records, levelsTable);
        const enrollmentSchoolYear = getText(
            enrollment,
            CONFIG.enrollmentFields.schoolYear
        );
        const gateRuleMap = buildGateRuleMap(
            gateRulesQuery.records,
            gateRulesTable,
            enrollmentSchoolYear,
            levels
        );

        const result = determineAllowedLevelWithGateBlocking(
            levels,
            gateRuleMap,
            lifetimeXp,
            stats
        );

        const configurationFingerprint = buildConfigurationFingerprint(
            levelsQuery.records,
            gateRulesQuery.records
        );
        const freshLevelsQuery = await levelsTable.selectRecordsAsync({
            fields: levelFieldsToSelect,
        });
        const freshGateRulesQuery = await gateRulesTable.selectRecordsAsync({
            fields: gateFieldsToSelect,
        });
        const freshLevels = buildLevelList(freshLevelsQuery.records, levelsTable);
        buildGateRuleMap(
            freshGateRulesQuery.records,
            gateRulesTable,
            enrollmentSchoolYear,
            freshLevels
        );
        if (
            buildConfigurationFingerprint(
                freshLevelsQuery.records,
                freshGateRulesQuery.records
            ) !== configurationFingerprint
        ) {
            throw new Error(
                `Level or gate configuration changed during calculation; preserving the queue for retry.`
            );
        }

        const fieldsToUpdate = {
            [CONFIG.enrollmentFields.levelStatus]: singleSelectValue(CONFIG.statusValues.processing),
        };

        await enrollmentsTable.updateRecordAsync(recordId, fieldsToUpdate);

        const assignmentFields = {
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

        await enrollmentsTable.updateRecordAsync(recordId, assignmentFields);

        const finalEnrollment = await enrollmentsTable.selectRecordAsync(recordId, {
            fields: getEnrollmentReadFields(),
        });
        if (!finalEnrollment) {
            throw new Error(`Enrollment disappeared during assignment: ${recordId}`);
        }
        if (buildSettlementFingerprint(finalEnrollment) !== buildSettlementFingerprint(enrollment)) {
            throw new Error(
                `Canonical Enrollment inputs changed during assignment; preserving the queue for retry.`
            );
        }

        const finalCurrentLevelId = getFirstLinkedId(
            finalEnrollment,
            CONFIG.enrollmentFields.currentLevel
        );
        const finalNextLevelId = getFirstLinkedId(
            finalEnrollment,
            CONFIG.enrollmentFields.nextLevel
        );
        const finalGateRuleId = getFirstLinkedId(
            finalEnrollment,
            CONFIG.enrollmentFields.levelGateRule
        );
        if (
            finalCurrentLevelId !== result.currentLevel.id ||
            finalNextLevelId !== (result.nextLevel ? result.nextLevel.id : "") ||
            finalGateRuleId !== (result.levelGateRule ? result.levelGateRule.id : "") ||
            getText(finalEnrollment, CONFIG.enrollmentFields.levelStatus) !== result.status ||
            isTruthyFlag(finalEnrollment, CONFIG.enrollmentFields.levelRecalcNeeded)
        ) {
            throw new Error(
                `Post-write progression verification failed for Enrollment ${recordId}; preserving the queue for retry.`
            );
        }

        const finalLevelsQuery = await levelsTable.selectRecordsAsync({
            fields: levelFieldsToSelect,
        });
        const finalGateRulesQuery = await gateRulesTable.selectRecordsAsync({
            fields: gateFieldsToSelect,
        });
        if (
            buildConfigurationFingerprint(
                finalLevelsQuery.records,
                finalGateRulesQuery.records
            ) !== configurationFingerprint
        ) {
            throw new Error(
                `Level or gate configuration changed during write verification; preserving the queue for retry.`
            );
        }

        const reconciledSignature = buildReconciledSignature(
            finalEnrollment,
            finalLevelsQuery.records,
            finalGateRulesQuery.records
        );
        await enrollmentsTable.updateRecordAsync(recordId, {
            [CONFIG.enrollmentFields.lastReconciledSignature]: reconciledSignature,
        });

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
