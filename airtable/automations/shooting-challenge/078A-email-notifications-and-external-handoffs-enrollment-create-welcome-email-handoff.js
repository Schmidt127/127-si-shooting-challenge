/*
Automation: 078A - Enrollment -> Create WELCOME Email Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-11
Last GitHub Update: 2026-08-11

Purpose:
Creates one Ready WELCOME handoff row for an eligible Enrollment.

Trigger:
Enrollments when Athlete, Parent Email - Cleaned, and Program Instance are populated
after Automation 001 has linked the Athlete.

Important Tables:
Enrollments, Athletes, Email Handoff Queue

Important Fields:
Athlete, Parent Email - Cleaned, Program Instance, Handoff Key, Status,
Event Type, Source Table, Source Record ID, Enrollment Record ID,
Program Instance Record ID, Recipients JSON, Template Key, Payload JSON,
Test Mode?, Attempt Count

Notes:
GitHub is the source-of-truth copy. Mike must paste into Airtable.
This script creates a queue row only. It does not call the Communications Hub,
send email, render subject/HTML, modify Automation 079, or restore 075.
*/

/************************************************************
 * 078A - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Enrollment -> Create WELCOME Email Handoff
 *
 * Version: v1.4
 * Date Written: 2026-08-11
 * Last Updated: 2026-08-22
 *
 * VERSION HISTORY
 * - v1.4 (2026-08-22): Enrich WELCOME Payload JSON with enrollment and Program
 *   Instance fields required by the redesigned Hub welcome template.
 * - v1.3 (2026-08-11): Use the verified Hub recipient contract with explicit
 *   PARENT and ATHLETE roles; preserve the Enrollment Program Instance link.
 * - v1.2 (2026-08-11): Initial repository implementation.
 *
 * PURPOSE
 * - Runs from one Enrollment after Automation 001 links an Athlete.
 * - Creates exactly one Ready WELCOME row in Email Handoff Queue.
 * - Uses WELCOME|ENROLLMENTS|{Enrollment Record ID} as the idempotency key.
 *
 * WORKFLOW / CONTRACT NOTES
 * - Automation 078A creates the queue row; Automation 079 dispatches it.
 * - Communications Hub owns subject, HTML, plain-text rendering, and delivery.
 * - Recipients JSON must contain both role-qualified recipients:
 *   { role: "PARENT", email } and { role: "ATHLETE", email }.
 * - The same email may appear twice; Communications Hub deduplicates delivery.
 * - This script never calls the Hub and never writes retired Automation 075 fields.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 078A - Enrollment -> Create WELCOME Email Handoff
 *
 * TRIGGER TABLE
 * - Enrollments
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Athlete is not empty.
 * - Parent Email - Cleaned is not empty.
 * - Program Instance is not empty.
 * - Run after Automation 001 has completed its link/writeback.
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Enrollments record ID.
 *
 * REQUIRED OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut = created-ready | duplicate-skipped | error
 * - errorOut = empty on success/skip; message on error
 * - debugStep = last numbered step reached
 * - enrollmentRecordId, athleteRecordId, handoffKey, queueRecordId,
 *   recipient, recipientsJson, templateKey
 *
 * PRIMARY TABLES USED
 * - Enrollments
 * - Athletes
 * - Email Handoff Queue
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Email Handoff Queue.Handoff Key = WELCOME|ENROLLMENTS|{Enrollment Record ID}
 * - Status = { name: "Ready" }
 * - Event Type = { name: "WELCOME" }
 * - Source Table = Enrollments
 * - Source Record ID = Enrollment record ID
 * - Enrollment Record ID = Enrollment record ID
 * - Program Instance Record ID = linked Program Instance record ID
 * - Recipients JSON = role-qualified PARENT and ATHLETE objects
 * - Template Key = WELCOME
 * - Payload JSON = athleteName, programName, message
 * - Test Mode? = true
 * - Attempt Count = 0
 *
 * INSTALLATION / TESTING
 * - Add a single Airtable input variable named recordId mapped to the trigger record ID.
 * - Paste the production docblock through the end into the Airtable script action.
 * - Test first with an approved DEV/allowlisted Enrollment; do not activate participant-wide sends.
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
    scriptName: "078A - Enrollment -> Create WELCOME Email Handoff",
    version: "v1.4",
    versionDate: "2026-08-22",
    originalWrittenDate: "2026-08-11",
    lastUpdated: "2026-08-22",
    folder: "07 - Email, Notifications, and External Handoffs",
    automationName: "078A - Enrollment -> Create WELCOME Email Handoff",
};

const CANONICAL_URLS = {
    landing: "https://www.fairfieldbasketballclub.com",
    shoot: "https://www.fairfieldbasketballclub.com/shoot",
    homework: "https://www.fairfieldbasketballclub.com/shoot/homework",
    dailyForm: "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
};

const CONFIG = {
    tables: {
        enrollments: "Enrollments",
        athletes: "Athletes",
        programInstances: "Program Instance - Sync",
        queue: "Email Handoff Queue",
    },
    enrollmentFields: {
        athlete: "Athlete",
        parentEmailCleaned: "Parent Email - Cleaned",
        parentFirstName: "Parent First Name",
        programInstance: "Program Instance",
        fullAthleteName: "Full Athlete Name",
        grade: "Grade",
        gradeBand: "Grade Band",
        schoolYear: "School Year",
        schoolNameLookup: "School Name Lookup",
    },
    programInstanceFields: {
        name: "Name - Program Instance",
        schoolYearLinked: "School Year - Linked",
        dailySubmissionUrl: "Daily Submission URL",
        welcomeWebsiteUrl: "Welcome - Website URL",
        welcomeIntro: "Welcome - Intro Note",
        whyThisMatters: "Why This Matters",
        description: "Description",
    },
    athleteFields: {
        fullName: "Full Name",
        firstName: "First Name",
        lastName: "Last Name",
    },
    queueFields: {
        handoffKey: "Handoff Key",
        status: "Status",
        eventType: "Event Type",
        sourceTable: "Source Table",
        sourceRecordId: "Source Record ID",
        enrollmentRecordId: "Enrollment Record ID",
        programInstanceRecordId: "Program Instance Record ID",
        recipientsJson: "Recipients JSON",
        templateKey: "Template Key",
        payloadJson: "Payload JSON",
        testMode: "Test Mode?",
        attemptCount: "Attempt Count",
    },
    values: {
        sourceTable: "Enrollments",
        handoffPrefix: "WELCOME|ENROLLMENTS|",
        statusReady: "Ready",
        eventTypeWelcome: "WELCOME",
        templateKeyWelcome: "WELCOME",
        recipientRoleParent: "PARENT",
        recipientRoleAthlete: "ATHLETE",
        testMode: true,
        attemptCountInitial: 0,
    },
};

const fieldCache = new Map();

function setOutputSafe(name, value) {
    try {
        output.set(name, value);
    } catch {
        // Output mappings are optional in Airtable test harnesses.
    }
}

function log(message, data) {
    if (data === undefined) {
        console.log(message);
        return;
    }
    console.log(message, JSON.stringify(data));
}

function getFieldSafe(table, fieldName) {
    const key = `${table?.name || "unknown"}:${fieldName}`;
    if (fieldCache.has(key)) return fieldCache.get(key);
    try {
        const field = table.getField(fieldName);
        fieldCache.set(key, field);
        return field;
    } catch {
        fieldCache.set(key, null);
        return null;
    }
}

function requireField(table, fieldName, expectedTypes) {
    const field = getFieldSafe(table, fieldName);
    if (!field) throw new Error(`Missing required field: ${table.name}.${fieldName}`);
    if (expectedTypes && !expectedTypes.includes(field.type)) {
        throw new Error(
            `Invalid field type: ${table.name}.${fieldName} is ${field.type}; expected ${expectedTypes.join(", ")}`
        );
    }
    return field;
}

function requireWritableField(table, fieldName, expectedTypes) {
    const field = requireField(table, fieldName, expectedTypes);
    const nonWritableTypes = new Set([
        "formula", "rollup", "count", "lookup", "multipleLookupValues",
        "createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy",
        "autoNumber", "button", "aiText", "externalSyncSource",
    ]);
    if (field.isComputed === true || nonWritableTypes.has(field.type)) {
        throw new Error(`Required queue field is not writable: ${table.name}.${fieldName}`);
    }
    return field;
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function requireSingleSelectValue(table, fieldName, value) {
    const field = requireWritableField(table, fieldName, ["singleSelect"]);
    const choice = (field.options?.choices || []).find(
        (item) => normalizeText(item.name) === normalizeText(value)
    );
    if (!choice) {
        throw new Error(`Missing option "${value}" in ${table.name}.${fieldName}`);
    }
    return { name: choice.name };
}

function getRaw(record, fieldName) {
    return record?.getCellValue(fieldName);
}

function getText(record, fieldName) {
    return String(record?.getCellValueAsString(fieldName) || "").trim();
}

function getLinkedIds(record, fieldName) {
    const raw = getRaw(record, fieldName);
    return Array.isArray(raw) ? raw.map((item) => item?.id).filter(Boolean) : [];
}

function normalizeEmail(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/^["']+|["']+$/g, "")
        .replace(/\s+/g, "");
}

function requireRecordId(value, label) {
    const recordId = String(value || "").trim();
    if (!recordId || !recordId.startsWith("rec")) {
        throw new Error(`Invalid ${label} record ID: ${recordId || "blank"}`);
    }
    return recordId;
}

function requireEmail(value, label) {
    const email = normalizeEmail(value);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error(`Invalid ${label} email`);
    }
    return email;
}

function buildAthleteName(enrollment, athlete) {
    const name = getText(athlete, CONFIG.athleteFields.fullName)
        || getText(enrollment, CONFIG.enrollmentFields.fullAthleteName)
        || [
            getText(athlete, CONFIG.athleteFields.firstName),
            getText(athlete, CONFIG.athleteFields.lastName),
        ].filter(Boolean).join(" ");
    if (!name) throw new Error("Missing validated athlete name");
    return name;
}

function buildRecipientsJson(recipient) {
    return JSON.stringify([
        { role: CONFIG.values.recipientRoleParent, email: recipient },
        { role: CONFIG.values.recipientRoleAthlete, email: recipient },
    ]);
}

function firstNonBlank(...values) {
    for (const value of values) {
        const text = String(value || "").trim();
        if (text) return text;
    }
    return "";
}

function buildPayloadJson(payload) {
    const athleteName = String(payload.athleteName || "").trim();
    const programName = String(payload.programName || "").trim();
    return JSON.stringify({
        athleteName,
        programName,
        programInstanceName: programName,
        parentName: payload.parentFirstName || undefined,
        parentFirstName: payload.parentFirstName || undefined,
        grade: payload.grade || undefined,
        gradeBand: payload.gradeBand || undefined,
        schoolYear: payload.schoolYear || undefined,
        school: payload.school || undefined,
        welcomeIntro: payload.welcomeIntro || undefined,
        programDescription: payload.programDescription || undefined,
        whyThisMatters: payload.whyThisMatters || undefined,
        dailySubmissionFormUrl: payload.dailySubmissionFormUrl || CANONICAL_URLS.dailyForm,
        landingPageUrl: CANONICAL_URLS.landing,
        shootPageUrl: CANONICAL_URLS.shoot,
        homeworkPageUrl: CANONICAL_URLS.homework,
        programInstanceUrl: payload.programInstanceUrl || undefined,
        message: payload.welcomeIntro || `Welcome to ${programName}, ${athleteName}.`,
    });
}

function parseObjectArrayJson(value, fieldName) {
    let parsed;
    try {
        parsed = JSON.parse(value);
    } catch (error) {
        throw new Error(`${fieldName} is not valid JSON: ${error.message}`);
    }
    if (!Array.isArray(parsed) || parsed.length !== 2) {
        throw new Error(`${fieldName} must contain exactly two recipient objects`);
    }
    for (const recipient of parsed) {
        if (!recipient || typeof recipient !== "object" || Array.isArray(recipient)) {
            throw new Error(`${fieldName} contains a non-object recipient`);
        }
        if (!["PARENT", "ATHLETE"].includes(recipient.role)) {
            throw new Error(`${fieldName} contains an invalid recipient role`);
        }
        requireEmail(recipient.email, `${fieldName} recipient`);
    }
    return parsed;
}

function parsePayloadJson(value) {
    let parsed;
    try {
        parsed = JSON.parse(value);
    } catch (error) {
        throw new Error(`${CONFIG.queueFields.payloadJson} is not valid JSON: ${error.message}`);
    }
    for (const key of ["athleteName", "programName", "message"]) {
        if (!String(parsed?.[key] || "").trim()) {
            throw new Error(`${CONFIG.queueFields.payloadJson} is missing ${key}`);
        }
    }
    return parsed;
}

async function findExistingQueueRecord(queueTable, handoffKey) {
    const query = await queueTable.selectRecordsAsync({
        fields: [CONFIG.queueFields.handoffKey],
    });
    try {
        return query.records.find(
            (record) => getText(record, CONFIG.queueFields.handoffKey) === handoffKey
        ) || null;
    } finally {
        if (typeof query.unloadData === "function") query.unloadData();
    }
}

function setDomainOutputs(context, result, statusOut, actionOut, errorOut) {
    setOutputSafe("statusOut", statusOut);
    setOutputSafe("actionOut", actionOut);
    setOutputSafe("errorOut", errorOut || "");
    setOutputSafe("result", result);
    for (const [key, value] of Object.entries(context)) setOutputSafe(key, value);
}

async function main() {
    let debugStep = "Start";
    const context = {
        enrollmentRecordId: "",
        athleteRecordId: "",
        handoffKey: "",
        queueRecordId: "",
        recipient: "",
        recipientsJson: "",
        templateKey: CONFIG.values.templateKeyWelcome,
    };

    try {
        debugStep = "1 - Validate input";
        setOutputSafe("debugStep", debugStep);
        const cfg = input.config();
        context.enrollmentRecordId = requireRecordId(cfg.recordId, "Enrollment");

        debugStep = "2 - Load tables and validate schema";
        setOutputSafe("debugStep", debugStep);
        const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
        const athletesTable = base.getTable(CONFIG.tables.athletes);
        const queueTable = base.getTable(CONFIG.tables.queue);

        requireField(enrollmentsTable, CONFIG.enrollmentFields.athlete, ["multipleRecordLinks"]);
        requireField(enrollmentsTable, CONFIG.enrollmentFields.parentEmailCleaned, [
            "singleLineText", "email", "multilineText", "formula",
        ]);
        requireField(enrollmentsTable, CONFIG.enrollmentFields.programInstance, ["multipleRecordLinks"]);
        requireField(athletesTable, CONFIG.athleteFields.fullName, [
            "singleLineText", "multilineText", "formula",
        ]);
        requireWritableField(queueTable, CONFIG.queueFields.handoffKey, ["singleLineText", "multilineText", "richText"]);
        requireWritableField(queueTable, CONFIG.queueFields.status, ["singleSelect"]);
        requireWritableField(queueTable, CONFIG.queueFields.eventType, ["singleSelect"]);
        for (const fieldName of [
            CONFIG.queueFields.sourceTable, CONFIG.queueFields.sourceRecordId,
            CONFIG.queueFields.enrollmentRecordId, CONFIG.queueFields.programInstanceRecordId,
            CONFIG.queueFields.recipientsJson, CONFIG.queueFields.templateKey,
            CONFIG.queueFields.payloadJson,
        ]) requireWritableField(queueTable, fieldName, ["singleLineText", "multilineText", "richText"]);
        requireWritableField(queueTable, CONFIG.queueFields.testMode, ["checkbox"]);
        requireWritableField(queueTable, CONFIG.queueFields.attemptCount, ["number"]);
        const readyValue = requireSingleSelectValue(queueTable, CONFIG.queueFields.status, CONFIG.values.statusReady);
        const welcomeValue = requireSingleSelectValue(queueTable, CONFIG.queueFields.eventType, CONFIG.values.eventTypeWelcome);

        debugStep = "3 - Load Enrollment, Athlete, and Program Instance";
        setOutputSafe("debugStep", debugStep);
        const enrollment = await enrollmentsTable.selectRecordAsync(context.enrollmentRecordId);
        if (!enrollment) throw new Error(`Enrollment record not found: ${context.enrollmentRecordId}`);
        context.athleteRecordId = requireRecordId(
            getLinkedIds(enrollment, CONFIG.enrollmentFields.athlete)[0],
            "Athlete"
        );
        const programLinks = getRaw(enrollment, CONFIG.enrollmentFields.programInstance);
        if (!Array.isArray(programLinks) || programLinks.length !== 1) {
            throw new Error("Enrollment must have exactly one linked Program Instance");
        }
        const programInstanceRecordId = requireRecordId(programLinks[0]?.id, "Program Instance");
        const programInstancesTable = base.getTable(CONFIG.tables.programInstances);
        requireField(programInstancesTable, CONFIG.programInstanceFields.name, [
            "singleLineText", "multilineText", "formula",
        ]);
        const programInstance = await programInstancesTable.selectRecordAsync(programInstanceRecordId);
        if (!programInstance) throw new Error(`Program Instance record not found: ${programInstanceRecordId}`);
        const programName = firstNonBlank(
            getText(programInstance, CONFIG.programInstanceFields.name),
            String(programLinks[0]?.name || "").trim()
        );
        if (!programName) throw new Error("Program Instance displayed name is blank");
        const recipient = requireEmail(
            getText(enrollment, CONFIG.enrollmentFields.parentEmailCleaned),
            CONFIG.enrollmentFields.parentEmailCleaned
        );
        context.recipient = recipient;
        const athlete = await athletesTable.selectRecordAsync(context.athleteRecordId);
        if (!athlete) throw new Error(`Athlete record not found: ${context.athleteRecordId}`);
        const athleteName = buildAthleteName(enrollment, athlete);
        const gradeBandLinks = getRaw(enrollment, CONFIG.enrollmentFields.gradeBand);
        const gradeBandName = Array.isArray(gradeBandLinks) && gradeBandLinks[0]?.name
            ? String(gradeBandLinks[0].name).trim()
            : "";

        debugStep = "4 - Build and validate WELCOME JSON";
        setOutputSafe("debugStep", debugStep);
        context.handoffKey = `${CONFIG.values.handoffPrefix}${context.enrollmentRecordId}`;
        context.recipientsJson = buildRecipientsJson(recipient);
        const payloadJson = buildPayloadJson({
            athleteName,
            programName,
            parentFirstName: getText(enrollment, CONFIG.enrollmentFields.parentFirstName),
            grade: getText(enrollment, CONFIG.enrollmentFields.grade),
            gradeBand: gradeBandName,
            schoolYear: firstNonBlank(
                getText(enrollment, CONFIG.enrollmentFields.schoolYear),
                getText(programInstance, CONFIG.programInstanceFields.schoolYearLinked)
            ),
            school: getText(enrollment, CONFIG.enrollmentFields.schoolNameLookup),
            welcomeIntro: getText(programInstance, CONFIG.programInstanceFields.welcomeIntro),
            programDescription: getText(programInstance, CONFIG.programInstanceFields.description),
            whyThisMatters: getText(programInstance, CONFIG.programInstanceFields.whyThisMatters),
            dailySubmissionFormUrl: firstNonBlank(
                getText(programInstance, CONFIG.programInstanceFields.dailySubmissionUrl),
                CANONICAL_URLS.dailyForm
            ),
            programInstanceUrl: getText(programInstance, CONFIG.programInstanceFields.welcomeWebsiteUrl),
        });
        parseObjectArrayJson(context.recipientsJson, CONFIG.queueFields.recipientsJson);
        parsePayloadJson(payloadJson);

        debugStep = "5 - Check duplicate handoff";
        setOutputSafe("debugStep", debugStep);
        const existing = await findExistingQueueRecord(queueTable, context.handoffKey);
        if (existing) {
            context.queueRecordId = existing.id;
            setDomainOutputs(context, "duplicate-skipped", "skipped", "duplicate-skipped", "");
            log("078A result", { ...context, result: "duplicate-skipped" });
            return;
        }

        debugStep = "6 - Recheck and create queue row";
        setOutputSafe("debugStep", debugStep);
        const existingBeforeCreate = await findExistingQueueRecord(queueTable, context.handoffKey);
        if (existingBeforeCreate) {
            context.queueRecordId = existingBeforeCreate.id;
            setDomainOutputs(context, "duplicate-skipped", "skipped", "duplicate-skipped", "");
            log("078A result", { ...context, result: "duplicate-skipped" });
            return;
        }
        context.queueRecordId = await queueTable.createRecordAsync({
            [CONFIG.queueFields.handoffKey]: context.handoffKey,
            [CONFIG.queueFields.status]: readyValue,
            [CONFIG.queueFields.eventType]: welcomeValue,
            [CONFIG.queueFields.sourceTable]: CONFIG.values.sourceTable,
            [CONFIG.queueFields.sourceRecordId]: context.enrollmentRecordId,
            [CONFIG.queueFields.enrollmentRecordId]: context.enrollmentRecordId,
            [CONFIG.queueFields.programInstanceRecordId]: programInstanceRecordId,
            [CONFIG.queueFields.recipientsJson]: context.recipientsJson,
            [CONFIG.queueFields.templateKey]: CONFIG.values.templateKeyWelcome,
            [CONFIG.queueFields.payloadJson]: payloadJson,
            [CONFIG.queueFields.testMode]: CONFIG.values.testMode,
            [CONFIG.queueFields.attemptCount]: CONFIG.values.attemptCountInitial,
        });
        setDomainOutputs(context, "created-ready", "success", "created-ready", "");
        log("078A result", { ...context, result: "created-ready" });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setOutputSafe("statusOut", "error");
        setOutputSafe("actionOut", "error");
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
        setDomainOutputs(context, "error", "error", "error", message);
        log("078A result", {
            enrollmentRecordId: context.enrollmentRecordId,
            handoffKey: context.handoffKey,
            result: "error",
            error: message,
        });
        throw error;
    }
}

try {
    await main();
} catch (error) {
    throw error;
}
