/*
Automation: 041 - Levels and Progression - Mark Enrollment for Level Recalculation
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
 * 041 - Levels and Progression - Mark Enrollment for Level Recalculation
 * Version: 3.0
 * Date Revised: 2026-05-28
 *
 * Purpose:
 * Marks the linked Enrollment record as needing level recalculation after an official XP Event
 * is created or updated with XP points.
 *
 * Correct Trigger Setup:
 * Table: XP Events
 * Trigger: When record matches conditions
 *
 * Trigger Conditions:
 * Enrollment is not empty
 * XP Points is greater than 0
 *
 * Required Input Variable:
 * recordId = Airtable record ID from the triggering XP Events record
 *
 * Writes:
 * Enrollments.Level Recalc Needed? = checked
 *
 * Notes:
 * - This automation does not assign Current Level.
 * - This automation does not assign Next Level.
 * - This automation does not assign Level Gate Rule.
 * - Its only job is to flag the Enrollment so Automation 042 can process it.
 ************************************************************************************************/


/************************************************************************************************
 * 1. CONFIG
 ************************************************************************************************/

const CONFIG = {
    automation: {
        name: "041 - Levels and Progression - Mark Enrollment for Level Recalculation",
        version: "3.0",
    },

    tables: {
        xpEvents: "XP Events",
        enrollments: "Enrollments",
    },

    fields: {
        xpEventEnrollment: "Enrollment",
        xpPoints: "XP Points",
        levelRecalcNeeded: "Level Recalc Needed?",
    },

    outputs: {
        status: "statusOut",
        message: "messageOut",
        xpEventRecordId: "xpEventRecordIdOut",
        enrollmentRecordId: "enrollmentRecordIdOut",
    },
};


/************************************************************************************************
 * 2. HELPERS
 ************************************************************************************************/

function cleanString(value) {
    return String(value || "").trim();
}

function getFirstLinkedRecordId(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return "";
    }

    return cleanString(value[0]?.id);
}

function getNumber(value) {
    if (typeof value === "number") {
        return value;
    }

    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
        return parsed;
    }

    return 0;
}

function setOutputs(status, message, xpEventRecordId = "", enrollmentRecordId = "") {
    output.set(CONFIG.outputs.status, status);
    output.set(CONFIG.outputs.message, message);
    output.set(CONFIG.outputs.xpEventRecordId, xpEventRecordId);
    output.set(CONFIG.outputs.enrollmentRecordId, enrollmentRecordId);
}


/************************************************************************************************
 * 3. MAIN
 ************************************************************************************************/

async function main() {
    const inputConfig = input.config();
    const xpEventRecordId = cleanString(inputConfig.recordId);

    if (!xpEventRecordId) {
        const message = "Missing required input variable: recordId.";
        setOutputs("error", message);
        throw new Error(message);
    }

    const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
    const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

    const xpEventRecord = await xpEventsTable.selectRecordAsync(xpEventRecordId, {
        fields: [
            CONFIG.fields.xpEventEnrollment,
            CONFIG.fields.xpPoints,
        ],
    });

    if (!xpEventRecord) {
        const message = `XP Event record not found: ${xpEventRecordId}`;
        setOutputs("error", message, xpEventRecordId);
        throw new Error(message);
    }

    const enrollmentRecordId = getFirstLinkedRecordId(
        xpEventRecord.getCellValue(CONFIG.fields.xpEventEnrollment)
    );

    if (!enrollmentRecordId) {
        const message = `XP Event has no linked Enrollment: ${xpEventRecordId}`;
        setOutputs("skipped", message, xpEventRecordId);
        return;
    }

    const xpPoints = getNumber(xpEventRecord.getCellValue(CONFIG.fields.xpPoints));

    if (xpPoints <= 0) {
        const message = `XP Event has no positive XP Points: ${xpEventRecordId}`;
        setOutputs("skipped", message, xpEventRecordId, enrollmentRecordId);
        return;
    }

    const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentRecordId, {
        fields: [
            CONFIG.fields.levelRecalcNeeded,
        ],
    });

    if (!enrollmentRecord) {
        const message = `Linked Enrollment record not found: ${enrollmentRecordId}`;
        setOutputs("error", message, xpEventRecordId, enrollmentRecordId);
        throw new Error(message);
    }

    const alreadyMarked = enrollmentRecord.getCellValue(CONFIG.fields.levelRecalcNeeded) === true;

    if (alreadyMarked) {
        const message = `Enrollment already marked for level recalculation: ${enrollmentRecordId}`;
        console.log(message);
        setOutputs("skipped", message, xpEventRecordId, enrollmentRecordId);
        return;
    }

    await enrollmentsTable.updateRecordAsync(enrollmentRecordId, {
        [CONFIG.fields.levelRecalcNeeded]: true,
    });

    const message = `Enrollment marked for level recalculation: ${enrollmentRecordId}`;
    console.log(message);
    setOutputs("success", message, xpEventRecordId, enrollmentRecordId);
}


/************************************************************************************************
 * 4. RUN
 ************************************************************************************************/

await main();
