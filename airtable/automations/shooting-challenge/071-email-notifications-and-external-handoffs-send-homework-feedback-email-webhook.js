/*
Automation: 071 - Email, Notifications, and External Handoffs - Send Homework Feedback Email Webhook
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-22
Last GitHub Update: 2026-06-22

Purpose:
Sends homework parent feedback email payload to Make when homework is awarded and ready; skips gracefully if already sent.

Trigger:
Homework Completions when parent feedback is ready and not yet sent.

Important Tables:
Homework Completions, Enrollments, FBC Curriculum - SYNC, Submission Assets

Important Fields:
Parent Feedback Ready?, Parent Feedback Sent?, Coach Feedback, XP Events, Award Status

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * 071 - Email, Notifications, and External Handoffs
 * Send Homework Feedback Email Webhook
 *
 * Version: v3.4
 * Date Written: 2026-06-06
 * Last Updated: 2026-06-30
 *
 * PURPOSE
 * - Reads one Homework Completions record.
 * - Confirms homework feedback is ready.
 * - Confirms homework XP has already been fully awarded.
 * - Requires:
 *      Parent Feedback Ready? = checked
 *      Parent Feedback Sent? = unchecked
 *      Satisfactory? = checked
 *      Coach Feedback is not blank
 *      Base XP Awarded > 0
 *      Total Homework XP Awarded > 0
 *      Award Status = Awarded
 *      XP Events is not empty
 * - Reads the linked Enrollment record.
 * - Reads the linked Homework curriculum record.
 * - Reads all linked Submission Assets.
 * - Builds a branded parent homework feedback email.
 * - Sends the email payload to Make.com.
 * - Writes Parent Feedback Subject and clears Parent Feedback Send Error after successful handoff.
 *
 * IMPORTANT SEND RULE
 * - This script only confirms that Airtable handed the email payload to Make.com.
 * - Make.com should update Parent Feedback Sent? and Parent Feedback Sent On only after Gmail succeeds.
 * - If Parent Feedback Sent? is already checked, skip gracefully (no webhook, no error).
 *   This prevents automation failures when unrelated field updates re-trigger the run
 *   (for example upload writeback backfills on already-emailed homework rows).
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Parent Feedback Ready? is checked
 * - Parent Feedback Sent? is unchecked
 * - Satisfactory? is checked
 * - Coach Feedback is not empty
 * - Award Status is Awarded
 * - XP Events is not empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId
 * - makeWebhookUrl
 * - sendMode
 * - testRecipientEmail
 *
 * OPTIONAL INPUT VARIABLES
 * - replyTo
 ************************************************************/


/* =========================================================
   SECTION 1: CONFIGURATION
   ========================================================= */

const CONFIG = {
    version: "v3.4",

    tables: {
        homeworkCompletions: "Homework Completions",
        enrollments: "Enrollments",
        homework: "FBC Curriculum - SYNC",
        submissionAssets: "Submission Assets",
        reflectionQuiz: "Final Reflection Quiz Submissions",
    },

    homeworkFields: {
        enrollment: "Enrollment",
        homework: "Homework",
        week: "Week",
        submissionDate: "Submission Date",
        sourceSystem: "Source System",

        satisfactory: "Satisfactory?",
        completionStatus: "Completion Status",
        awardStatus: "Award Status",

        baseXp: "Base XP Awarded",
        extraXp: "Extra Credit XP Awarded",
        totalXp: "Total Homework XP Awarded",
        xpEvents: "XP Events",

        coachFeedback: "Coach Feedback",

        submissionAssets: "Submission Assets",
        reflectionQuiz: "Final Reflection Quiz Submissions",

        parentReady: "Parent Feedback Ready?",
        parentSent: "Parent Feedback Sent?",
        parentSentOn: "Parent Feedback Sent On",
        parentError: "Parent Feedback Send Error",
        parentSubject: "Parent Feedback Subject",
    },

    enrollmentFields: {
        parentEmailClean: "Parent Email - Cleaned",
        parentEmail: "Parent Email",
        parentFirstName: "Parent First Name",
        athleteName: "Full Athlete Name",
    },

    curriculumFields: {
        title: "Assignment Title",
        number: "Assignment Number",
    },

    assetFields: {
        originalFileName: "Original File Name",
        googleFileUrl: "Google Drive File URL",
        googleDriveViewUrl: "Google Drive View URL",
        assetLabel: "Asset Label",
    },

    quizFields: {
        quizResultSummary: "Quiz Result Summary",
        score: "Score",
    },

    values: {
        awardedStatus: "Awarded",
        sendType: "homework_feedback",
        sendTag: "HOMEWORK_FEEDBACK_PARENT",
        filloutSource: "Fillout",
    },

    defaults: {
        replyTo: "coach@127sportsintensity.com",
        logoUrl: "https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/BlueOrangeCircleLogo.png",
    },

    brand: {
        orgName: "127 Sports Intensity",
        primaryBlue: "#0034B7",
        accentOrange: "#FF8B00",
        lightGray: "#F2F2F2",
        darkText: "#262626",
        containerWidth: "640px",
    },

    debug: {
        logToConsole: true,
    },
};


/* =========================================================
   SECTION 2: INPUTS
   ========================================================= */

const cfg = input.config();

const recordId = String(cfg.recordId || "").trim();
const makeWebhookUrl = String(cfg.makeWebhookUrl || "").trim();
const sendModeRaw = String(cfg.sendMode || "").trim();
const testRecipientEmail = String(cfg.testRecipientEmail || "").trim();
const replyTo = String(cfg.replyTo || CONFIG.defaults.replyTo).trim();

if (!recordId) {
    throw new Error("Missing required input: recordId");
}

if (!makeWebhookUrl) {
    throw new Error("Missing required input: makeWebhookUrl");
}

if (!sendModeRaw) {
    throw new Error("Missing required input: sendMode");
}

const sendMode = sendModeRaw.toLowerCase();

if (!["test", "live"].includes(sendMode)) {
    throw new Error(`Invalid sendMode input. Expected Test or Live, received: ${sendModeRaw}`);
}

if (sendMode === "test" && !testRecipientEmail) {
    throw new Error("Missing required input: testRecipientEmail for Test mode");
}


/* =========================================================
   SECTION 3: TABLES
   ========================================================= */

const homeworkCompletionsTable = base.getTable(CONFIG.tables.homeworkCompletions);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const homeworkTable = base.getTable(CONFIG.tables.homework);
const submissionAssetsTable = base.getTable(CONFIG.tables.submissionAssets);
const reflectionQuizTable = fieldExistsTable(CONFIG.tables.reflectionQuiz)
    ? base.getTable(CONFIG.tables.reflectionQuiz)
    : null;

function fieldExistsTable(tableName) {
    try {
        base.getTable(tableName);
        return true;
    } catch {
        return false;
    }
}


/* =========================================================
   SECTION 4: HELPERS
   ========================================================= */

function logDebug(label, value = null) {
    if (!CONFIG.debug.logToConsole) {
        return;
    }

    if (value === null || value === undefined) {
        console.log(label);
        return;
    }

    try {
        console.log(label, JSON.stringify(value, null, 2));
    } catch {
        console.log(label, value);
    }
}

function setOutputSafe(key, value) {
    try {
        output.set(key, value);
    } catch {
        // Ignore output errors.
    }
}

function setOutputs(values) {
    for (const [key, value] of Object.entries(values)) {
        setOutputSafe(key, value);
    }
}

function fieldExists(table, fieldName) {
    try {
        table.getField(fieldName);
        return true;
    } catch {
        return false;
    }
}

function requireField(table, fieldName) {
    if (!fieldExists(table, fieldName)) {
        throw new Error(`Missing required field: ${table.name} -> ${fieldName}`);
    }
}

function isWritableField(table, fieldName) {
    if (!fieldExists(table, fieldName)) {
        return false;
    }

    const field = table.getField(fieldName);

    const nonWritableTypes = new Set([
        "formula",
        "rollup",
        "count",
        "lookup",
        "multipleLookupValues",
        "createdTime",
        "lastModifiedTime",
        "createdBy",
        "lastModifiedBy",
        "autoNumber",
        "button",
        "aiText",
        "externalSyncSource",
    ]);

    return !nonWritableTypes.has(field.type);
}

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) {
        return null;
    }

    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) {
        return "";
    }

    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) {
        return "";
    }

    const raw = record.getCellValue(fieldName);
    return raw?.name ? String(raw.name).trim() : "";
}

function getCheckboxValue(record, table, fieldName) {
    return getRaw(record, table, fieldName) === true;
}

function getLinkedIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
    return getLinkedIds(record, table, fieldName)[0] || "";
}

function getNumber(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }

    const text = getText(record, table, fieldName).replace(/,/g, "").trim();
    const parsed = Number(text);

    return Number.isFinite(parsed) ? parsed : 0;
}

function firstNonBlank(...values) {
    for (const value of values) {
        const s = String(value ?? "").trim();

        if (s) {
            return s;
        }
    }

    return "";
}

function cleanCsvEmails(value) {
    const items = String(value || "")
        .split(/[,\n;]+/)
        .map(v => v.trim())
        .filter(Boolean);

    return [...new Set(items)].join(",");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function nlToBr(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
}

function formatDateTime(value) {
    if (!value) {
        return "";
    }

    const d = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(d.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(d);
}

function formatXpText(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
        return "";
    }

    if (Number.isInteger(numberValue)) {
        return `${numberValue}`;
    }

    return `${numberValue.toFixed(1)}`;
}

function summaryRow(label, value) {
    if (!String(value || "").trim()) {
        return "";
    }

    return `
        <tr>
            <td style="padding:4px 0; font-weight:700; color:${CONFIG.brand.darkText}; width:165px; vertical-align:top; line-height:1.2;">
                ${escapeHtml(label)}
            </td>
            <td style="padding:4px 0; color:${CONFIG.brand.darkText}; line-height:1.2;">
                ${escapeHtml(value)}
            </td>
        </tr>
    `;
}

function buildFileListHtml(assetFiles, quizResultSummary = "") {
    const filesWithUrls = assetFiles.filter(file => file.url);

    if (filesWithUrls.length) {
        const rows = filesWithUrls.map((file, index) => {
            const label = firstNonBlank(file.label, file.fileName, `Homework File ${index + 1}`);

            return `
            <tr>
                <td style="padding:6px 0; line-height:1.3;">
                    <a href="${escapeHtml(file.url)}"
                       style="color:${CONFIG.brand.primaryBlue}; font-weight:700; text-decoration:underline;">
                        ${escapeHtml(label)}
                    </a>
                </td>
            </tr>
        `;
        }).join("");

        return `
        <p style="margin:0 0 8px 0; line-height:1.4;">You can review the linked homework file(s) here:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
            ${rows}
        </table>
    `;
    }

    if (String(quizResultSummary || "").trim()) {
        return `
            <p style="margin:0 0 8px 0; line-height:1.4;">
                This homework was completed as the Final Reflection Quiz (no file upload).
            </p>
            <p style="margin:0; line-height:1.4;">
                ${escapeHtml(quizResultSummary)}
            </p>
        `;
    }

    return `
            <p style="margin:0; line-height:1.4;">
                The homework feedback has been posted, but no file link was included on this record.
            </p>
        `;
}

async function postJson(url, payload) {
    const request = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    };

    if (typeof fetch === "function") {
        return await fetch(url, request);
    }

    if (typeof remoteFetchAsync === "function") {
        return await remoteFetchAsync(url, request);
    }

    throw new Error("No supported HTTP method is available in this Airtable automation environment.");
}

async function readResponseBody(response) {
    const text = await response.text();

    if (!text) {
        return {
            rawText: "",
            json: null,
        };
    }

    try {
        return {
            rawText: text,
            json: JSON.parse(text),
        };
    } catch {
        return {
            rawText: text,
            json: null,
        };
    }
}

function validateMakeResponse(responseBody) {
    if (!responseBody.json) {
        return;
    }

    const json = responseBody.json;

    if (json.ok === false || json.success === false || json.sent === false) {
        throw new Error(`Make.com returned failure: ${responseBody.rawText}`);
    }
}

async function writeParentSendError(errorMessage) {
    if (
        fieldExists(homeworkCompletionsTable, CONFIG.homeworkFields.parentError) &&
        isWritableField(homeworkCompletionsTable, CONFIG.homeworkFields.parentError)
    ) {
        await homeworkCompletionsTable.updateRecordAsync(recordId, {
            [CONFIG.homeworkFields.parentError]: String(errorMessage || ""),
        });
    }
}


/* =========================================================
   SECTION 5: EMAIL HTML BUILDER
   ========================================================= */

function buildEmailHtml({
    parentFirstName,
    athleteName,
    homeworkTitle,
    assignmentNumberText,
    submissionDateText,
    weekText,
    coachFeedback,
    assetFiles,
    quizResultSummary,
    completionStatusText,
    satisfactoryText,
    baseXpText,
    extraXpText,
    totalXpText,
    sendMode,
}) {
    const greetingName = parentFirstName || "Parent";

    const modeBanner = sendMode === "test"
        ? `
            <div style="background:#fff4e8; border:1px solid #ffd3a1; color:#7a4a00; border-radius:12px; padding:12px 14px; margin:0 0 14px 0; font-size:13px; font-weight:700; line-height:1.35;">
                TEST MODE — This email was generated for review and was not sent to the real parent recipient.
            </div>
        `
        : "";

    const headerLogoHtml = CONFIG.defaults.logoUrl
        ? `
            <div style="width:68px; height:68px; border-radius:999px; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-left:auto;">
                <img src="${escapeHtml(CONFIG.defaults.logoUrl)}" alt="127 Sports Intensity Logo" style="display:block; max-width:52px; max-height:52px; width:auto; height:auto;">
            </div>
        `
        : "";

    const introHtml = `
        <p style="margin:0; line-height:1.4;">
            Hello ${escapeHtml(greetingName)},
        </p>
        <p style="margin:10px 0 0 0; line-height:1.4;">
            I have finished reviewing the homework submission from ${escapeHtml(athleteName || "your athlete")} and have included the feedback below.
        </p>
    `;

    const extraXpRow = Number(extraXpText) > 0
        ? summaryRow("Extra Credit XP", extraXpText)
        : "";

    const summaryHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
            ${summaryRow("Athlete", athleteName)}
            ${summaryRow("Homework", homeworkTitle)}
            ${summaryRow("Assignment #", assignmentNumberText)}
            ${summaryRow("Submitted At", submissionDateText)}
            ${summaryRow("Week", weekText)}
            ${summaryRow("Completion Status", completionStatusText)}
            ${summaryRow("Satisfactory?", satisfactoryText)}
            ${summaryRow("Base XP", baseXpText)}
            ${extraXpRow}
            ${summaryRow("Total XP Awarded", totalXpText)}
        </table>
    `;

    const feedbackHtml = coachFeedback
        ? `<div style="line-height:1.45;">${nlToBr(coachFeedback)}</div>`
        : `<div style="line-height:1.45;">No coach feedback text was included on this record.</div>`;

    const actionHtml = buildFileListHtml(assetFiles, quizResultSummary);

    const closingHtml = `
        <p style="margin:0 0 10px 0; line-height:1.4;">
            Please reply if you have any questions about this feedback or next steps.
        </p>
        <p style="margin:0; line-height:1.4;">
            Thank you,<br>
            Coach Mike
        </p>
    `;

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Homework Feedback</title>
</head>
<body style="margin:0; padding:0; background:${CONFIG.brand.lightGray}; font-family:Arial, Helvetica, sans-serif; color:${CONFIG.brand.darkText};">
    <div style="padding:20px 12px; background:${CONFIG.brand.lightGray};">
        <div style="max-width:${CONFIG.brand.containerWidth}; margin:0 auto;">
            ${modeBanner}

            <div style="background:${CONFIG.brand.primaryBlue}; color:#ffffff; border-radius:16px; padding:18px 20px; margin:0 0 14px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="vertical-align:middle; padding:0 14px 0 0;">
                            <div style="font-size:21px; font-weight:800; margin:0 0 6px 0; line-height:1.2;">Homework Feedback Posted</div>
                            <div style="font-size:12px; line-height:1.35; opacity:0.96;">
                                A new coach review is available for your athlete.
                            </div>
                        </td>
                        <td style="width:68px; vertical-align:middle; text-align:right;">
                            ${headerLogoHtml}
                        </td>
                    </tr>
                </table>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${CONFIG.brand.accentOrange}; margin:0 0 10px 0;">
                    Update
                </div>
                <div style="font-size:13px; line-height:1.45; color:${CONFIG.brand.darkText};">
                    ${introHtml}
                </div>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${CONFIG.brand.accentOrange}; margin:0 0 10px 0;">
                    Summary
                </div>
                <div style="font-size:13px; line-height:1.2; color:${CONFIG.brand.darkText};">
                    ${summaryHtml}
                </div>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${CONFIG.brand.accentOrange}; margin:0 0 10px 0;">
                    Coach Feedback — Please Read to Your Child
                </div>
                <div style="font-size:13px; line-height:1.45; color:${CONFIG.brand.darkText};">
                    ${feedbackHtml}
                </div>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${CONFIG.brand.accentOrange}; margin:0 0 10px 0;">
                    Review Link
                </div>
                <div style="font-size:13px; line-height:1.45; color:${CONFIG.brand.darkText};">
                    ${actionHtml}
                </div>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${CONFIG.brand.accentOrange}; margin:0 0 10px 0;">
                    Questions
                </div>
                <div style="font-size:13px; line-height:1.45; color:${CONFIG.brand.darkText};">
                    ${closingHtml}
                </div>
            </div>

            <div style="background:${CONFIG.brand.primaryBlue}; color:#ffffff; border-radius:16px; padding:16px 20px; font-size:12px; line-height:1.35;">
                127 Sports Intensity<br>
                Youth sports communication and development support
            </div>
        </div>
    </div>
</body>
</html>
    `;
}


/* =========================================================
   SECTION 6: FIELD VALIDATION
   ========================================================= */

function validateRequiredFields() {
    for (const fieldName of [
        CONFIG.homeworkFields.enrollment,
        CONFIG.homeworkFields.homework,
        CONFIG.homeworkFields.week,
        CONFIG.homeworkFields.submissionDate,

        CONFIG.homeworkFields.satisfactory,
        CONFIG.homeworkFields.completionStatus,
        CONFIG.homeworkFields.awardStatus,

        CONFIG.homeworkFields.baseXp,
        CONFIG.homeworkFields.extraXp,
        CONFIG.homeworkFields.totalXp,
        CONFIG.homeworkFields.xpEvents,

        CONFIG.homeworkFields.coachFeedback,
        CONFIG.homeworkFields.submissionAssets,

        CONFIG.homeworkFields.parentReady,
        CONFIG.homeworkFields.parentSent,
        CONFIG.homeworkFields.parentSentOn,
        CONFIG.homeworkFields.parentError,
        CONFIG.homeworkFields.parentSubject,
    ]) {
        requireField(homeworkCompletionsTable, fieldName);
    }

    for (const fieldName of [
        CONFIG.enrollmentFields.parentEmailClean,
        CONFIG.enrollmentFields.parentEmail,
        CONFIG.enrollmentFields.parentFirstName,
        CONFIG.enrollmentFields.athleteName,
    ]) {
        requireField(enrollmentsTable, fieldName);
    }

    for (const fieldName of [
        CONFIG.curriculumFields.title,
        CONFIG.curriculumFields.number,
    ]) {
        requireField(homeworkTable, fieldName);
    }

    for (const fieldName of [
        CONFIG.assetFields.originalFileName,
        CONFIG.assetFields.googleFileUrl,
        CONFIG.assetFields.assetLabel,
    ]) {
        requireField(submissionAssetsTable, fieldName);
    }
}


/* =========================================================
   SECTION 7: MAIN
   ========================================================= */

async function main() {
    let homeworkCompletionRecord = null;

    try {
        validateRequiredFields();

        homeworkCompletionRecord = await homeworkCompletionsTable.selectRecordAsync(recordId);

        if (!homeworkCompletionRecord) {
            throw new Error(`Homework Completion record not found: ${recordId}`);
        }

        const parentFeedbackReady = getCheckboxValue(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.parentReady
        );

        const parentFeedbackSent = getCheckboxValue(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.parentSent
        );

        const satisfactory = getCheckboxValue(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.satisfactory
        );

        const coachFeedback = getText(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.coachFeedback
        );

        const awardStatusText = getText(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.awardStatus
        );

        const baseXpNumber = getNumber(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.baseXp
        );

        const extraXpNumber = getNumber(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.extraXp
        );

        const totalXpNumber = getNumber(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.totalXp
        );

        const linkedXpEventIds = getLinkedIds(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.xpEvents
        );

        const enrollmentId = getFirstLinkedId(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.enrollment
        );

        const homeworkId = getFirstLinkedId(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.homework
        );

        const submissionAssetIds = getLinkedIds(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.submissionAssets
        );

        const sourceSystem = getSelectName(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.sourceSystem
        );

        const reflectionQuizIds = getLinkedIds(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.reflectionQuiz
        );

        const isReflectionQuizCompletion =
            sourceSystem === CONFIG.values.filloutSource && reflectionQuizIds.length > 0;

        logDebug("071 pre-send validation", {
            recordId,
            sendMode,
            parentFeedbackReady,
            parentFeedbackSent,
            satisfactory,
            coachFeedbackPresent: Boolean(coachFeedback),
            awardStatusText,
            baseXpNumber,
            extraXpNumber,
            totalXpNumber,
            linkedXpEventIds,
            enrollmentId,
            homeworkId,
            submissionAssetIds,
            sourceSystem,
            reflectionQuizIds,
            isReflectionQuizCompletion,
        });

        /************************************************************
         * HARD SEND GATES
         ************************************************************/

        if (!parentFeedbackReady) {
            throw new Error("Parent Feedback Ready? is not checked. Email not sent.");
        }

        if (parentFeedbackSent) {
            logDebug("071 skipped - parent feedback already sent", { recordId, sendMode });

            setOutputs({
                ok: true,
                skipped: true,
                recordId,
                sendMode,
                statusOut: "skipped",
                actionOut: "skipped_already_sent",
                errorOut: "",
            });

            return;
        }

        if (!satisfactory) {
            throw new Error("Satisfactory? is not checked. Email not sent.");
        }

        if (!coachFeedback) {
            throw new Error("Coach Feedback is blank. Email not sent.");
        }

        if (baseXpNumber <= 0) {
            throw new Error(`Base XP Awarded must be greater than 0 before email sends. Current value: ${baseXpNumber}`);
        }

        if (totalXpNumber <= 0) {
            throw new Error(`Total Homework XP Awarded must be greater than 0 before email sends. Current value: ${totalXpNumber}`);
        }

        if (awardStatusText !== CONFIG.values.awardedStatus) {
            throw new Error(`Award Status is "${awardStatusText || "blank"}", not "${CONFIG.values.awardedStatus}". Email not sent.`);
        }

        if (!linkedXpEventIds.length) {
            throw new Error("No linked XP Event found. Email not sent.");
        }

        if (!enrollmentId) {
            throw new Error("Homework Completion record is missing linked Enrollment.");
        }

        if (!homeworkId) {
            throw new Error("Homework Completion record is missing linked Homework.");
        }

        if (!submissionAssetIds.length && !isReflectionQuizCompletion) {
            throw new Error("Homework Completion record is missing linked Submission Assets.");
        }

        /************************************************************
         * LOAD LINKED RECORDS
         ************************************************************/

        const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);

        if (!enrollmentRecord) {
            throw new Error(`Linked Enrollment record not found: ${enrollmentId}`);
        }

        const homeworkRecord = await homeworkTable.selectRecordAsync(homeworkId);

        if (!homeworkRecord) {
            throw new Error(`Linked Homework record not found: ${homeworkId}`);
        }

        let quizResultSummary = "";

        if (isReflectionQuizCompletion && reflectionQuizTable) {
            const quizRecord = await reflectionQuizTable.selectRecordAsync(reflectionQuizIds[0]);

            if (quizRecord) {
                quizResultSummary = firstNonBlank(
                    getText(quizRecord, reflectionQuizTable, CONFIG.quizFields.quizResultSummary),
                    getText(quizRecord, reflectionQuizTable, CONFIG.quizFields.score)
                        ? `Quiz score: ${getText(quizRecord, reflectionQuizTable, CONFIG.quizFields.score)}/18`
                        : ""
                );
            }
        }

        const assetFiles = [];

        for (const assetId of submissionAssetIds) {
            const assetRecord = await submissionAssetsTable.selectRecordAsync(assetId);

            if (!assetRecord) {
                continue;
            }

            const assetFileName = getText(
                assetRecord,
                submissionAssetsTable,
                CONFIG.assetFields.originalFileName
            );

            const assetFileUrl = firstNonBlank(
                getText(assetRecord, submissionAssetsTable, CONFIG.assetFields.googleFileUrl),
                fieldExists(submissionAssetsTable, CONFIG.assetFields.googleDriveViewUrl)
                    ? getText(assetRecord, submissionAssetsTable, CONFIG.assetFields.googleDriveViewUrl)
                    : ""
            );

            const assetLabel = getText(
                assetRecord,
                submissionAssetsTable,
                CONFIG.assetFields.assetLabel
            );

            assetFiles.push({
                id: assetId,
                fileName: assetFileName,
                url: assetFileUrl,
                label: assetLabel,
            });
        }

        if (!isReflectionQuizCompletion) {
            if (!assetFiles.length) {
                throw new Error("No readable Submission Asset records were found.");
            }

            const assetFilesWithUrls = assetFiles.filter(file => file.url);

            if (!assetFilesWithUrls.length) {
                throw new Error("No Google Drive File URL or View URL was found on linked Submission Assets.");
            }
        }

        const assetFilesWithUrls = assetFiles.filter(file => file.url);

        /************************************************************
         * READ / NORMALIZE DATA
         ************************************************************/

        const athleteName = getText(
            enrollmentRecord,
            enrollmentsTable,
            CONFIG.enrollmentFields.athleteName
        );

        const parentFirstName = getText(
            enrollmentRecord,
            enrollmentsTable,
            CONFIG.enrollmentFields.parentFirstName
        );

        const parentEmailsCsv = cleanCsvEmails(
            firstNonBlank(
                getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollmentFields.parentEmailClean),
                getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollmentFields.parentEmail)
            )
        );

        if (!parentEmailsCsv) {
            throw new Error("No parent recipient email found on linked Enrollment.");
        }

        const homeworkTitle = firstNonBlank(
            getText(homeworkRecord, homeworkTable, CONFIG.curriculumFields.title),
            homeworkRecord.name
        );

        const assignmentNumberText = getText(
            homeworkRecord,
            homeworkTable,
            CONFIG.curriculumFields.number
        );

        const submissionDateText = formatDateTime(
            getRaw(homeworkCompletionRecord, homeworkCompletionsTable, CONFIG.homeworkFields.submissionDate)
        );

        const weekText = getText(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.week
        );

        const completionStatusText = getText(
            homeworkCompletionRecord,
            homeworkCompletionsTable,
            CONFIG.homeworkFields.completionStatus
        );

        const baseXpText = formatXpText(baseXpNumber);
        const extraXpText = formatXpText(extraXpNumber);
        const totalXpText = formatXpText(totalXpNumber);

        const satisfactoryText = satisfactory ? "Yes" : "No";

        /************************************************************
         * BUILD SUBJECT / HTML
         ************************************************************/

        const sourceTable = CONFIG.tables.homeworkCompletions;
        const sendType = CONFIG.values.sendType;
        const sendTag = CONFIG.values.sendTag;

        const subjectBase = `New Homework Feedback for ${athleteName || "Athlete"}`;
        const subjectOut = sendMode === "test"
            ? `[TEST] ${subjectBase}`
            : subjectBase;

        const htmlOut = buildEmailHtml({
            parentFirstName,
            athleteName,
            homeworkTitle,
            assignmentNumberText,
            submissionDateText,
            weekText,
            coachFeedback,
            assetFiles,
            quizResultSummary,
            completionStatusText: firstNonBlank(completionStatusText, awardStatusText),
            satisfactoryText,
            baseXpText,
            extraXpText,
            totalXpText,
            sendMode,
        });

        /************************************************************
         * WEBHOOK PAYLOAD
         ************************************************************/

        const payload = {
            recordId,
            sourceTable,
            sendType,
            sendMode,
            sendTag,

            athleteName,
            homeworkTitle,
            weekText,

            parentEmailsCsv,
            testRecipientEmail,

            toEmail: sendMode === "test" ? testRecipientEmail : parentEmailsCsv,
            liveRecipientEmail: parentEmailsCsv,
            testRecipientEmail,

            subjectOut,
            htmlOut,
            replyTo,

            baseXp: baseXpNumber,
            extraXp: extraXpNumber,
            totalXp: totalXpNumber,

            awardStatus: awardStatusText,
            xpEventIds: linkedXpEventIds,
            xpEventCount: linkedXpEventIds.length,

            assetFiles,
            assetFileCount: assetFiles.length,
            assetFileUrlCount: assetFilesWithUrls.length,
            isReflectionQuizCompletion,
            quizResultSummary,

            makeWriteback: {
                tableName: CONFIG.tables.homeworkCompletions,
                recordId,
                parentFeedbackSentField: CONFIG.homeworkFields.parentSent,
                parentFeedbackSentOnField: CONFIG.homeworkFields.parentSentOn,
                parentFeedbackSendErrorField: CONFIG.homeworkFields.parentError,
            },
        };

        /************************************************************
         * SEND TO MAKE
         ************************************************************/

        let response;
        let responseBody = {
            rawText: "",
            json: null,
        };

        try {
            response = await postJson(makeWebhookUrl, payload);
            responseBody = await readResponseBody(response);

            if (!response.ok) {
                throw new Error(`Webhook failed with status ${response.status}: ${responseBody.rawText}`);
            }

            validateMakeResponse(responseBody);
        } catch (error) {
            await writeParentSendError(error.message || error);

            setOutputs({
                ok: false,
                recordId,
                sendMode,
                errorOut: String(error.message || error),
            });

            throw error;
        }

        /************************************************************
         * SUCCESS WRITEBACK
         ************************************************************/

        const successUpdates = {};

        /*
        IMPORTANT:
        - This Airtable script only confirms that the payload was handed to Make.com.
        - Make.com should mark Parent Feedback Sent? only after the Gmail module succeeds.
        - This script does not set Parent Feedback Sent? or Parent Feedback Sent On.
        */

        if (
            fieldExists(homeworkCompletionsTable, CONFIG.homeworkFields.parentError) &&
            isWritableField(homeworkCompletionsTable, CONFIG.homeworkFields.parentError)
        ) {
            successUpdates[CONFIG.homeworkFields.parentError] = "";
        }

        if (
            fieldExists(homeworkCompletionsTable, CONFIG.homeworkFields.parentSubject) &&
            isWritableField(homeworkCompletionsTable, CONFIG.homeworkFields.parentSubject)
        ) {
            successUpdates[CONFIG.homeworkFields.parentSubject] = subjectOut;
        }

        if (Object.keys(successUpdates).length) {
            await homeworkCompletionsTable.updateRecordAsync(recordId, successUpdates);
        }

        /************************************************************
         * OUTPUTS
         ************************************************************/

        setOutputs({
            ok: true,
            recordId,
            sourceTable,
            sendType,
            sendMode,
            sendTag,
            athleteName,
            homeworkTitle,
            parentEmailsCsv,
            testRecipientEmail,
            toEmail: payload.toEmail,
            subjectOut,
            htmlOut,
            replyTo,
            baseXp: baseXpNumber,
            extraXp: extraXpNumber,
            totalXp: totalXpNumber,
            awardStatus: awardStatusText,
            xpEventCount: linkedXpEventIds.length,
            assetFileCount: assetFiles.length,
            assetFileUrlCount: assetFilesWithUrls.length,
            makeResponse: responseBody.rawText,
        });

        logDebug("071 completed successfully", {
            recordId,
            sendMode,
            toEmail: payload.toEmail,
            totalXp: totalXpNumber,
            awardStatus: awardStatusText,
            xpEventCount: linkedXpEventIds.length,
        });

    } catch (error) {
        await writeParentSendError(error.message || error);

        setOutputs({
            ok: false,
            recordId,
            sendMode,
            errorOut: String(error.message || error),
        });

        throw error;
    }
}


/* =========================================================
   SECTION 8: RUN
   ========================================================= */

await main();
