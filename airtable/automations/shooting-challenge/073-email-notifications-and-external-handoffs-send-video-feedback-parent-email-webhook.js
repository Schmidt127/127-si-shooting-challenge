/*
Automation: 073 - Email, Notifications, and External Handoffs - Send Video Feedback Parent Email Webhook
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

/************************************************************
 * 073 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Send Video Feedback Parent Email Webhook
 *
 * Version: v3.2
 * Date Written: 2026-06-17
 *
 * PURPOSE
 * - Runs from one Video Feedback record.
 * - Reads the linked Enrollment record.
 * - Reads the linked Submission record.
 * - Reads the linked Submission Asset record when available.
 * - Builds a branded parent video-feedback email.
 * - Sends the email payload to a Make.com webhook.
 * - Writes only handoff-level status back to the Video Feedback record.
 *
 * IMPORTANT WRITEBACK RULE
 * - This script does NOT check Parent Feedback Sent?.
 * - This script does NOT write Parent Feedback Sent On.
 * - Make.com owns final Gmail-success writeback after the Gmail module succeeds.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 073 - Email, Notifications, and External Handoffs - Send Video Feedback Parent Email Webhook
 *
 * TRIGGER TABLE
 * - Video Feedback
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Parent Feedback Ready? is checked
 * - Parent Feedback Sent? is unchecked
 * - Feedback Posted? is checked
 * - Coach Feedback is not empty
 * - Enrollment is not empty
 * - Submission is not empty
 * - Total Video XP Awarded > 0
 * - Base XP Awarded > 0
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Video Feedback record
 * - makeWebhookUrl = Make.com webhook URL
 * - sendMode = Test or Live
 * - testRecipientEmail = test recipient email address
 *
 * OPTIONAL INPUT VARIABLES
 * - replyTo = reply-to email address
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: CONSTANTS
   ========================================================= */

const VIDEO_FEEDBACK_TABLE = "Video Feedback";
const ENROLLMENTS_TABLE = "Enrollments";
const SUBMISSIONS_TABLE = "Submissions";
const SUBMISSION_ASSETS_TABLE = "Submission Assets";

/* ---------- Video Feedback fields ---------- */

const FIELD_VF_ENROLLMENT = "Enrollment";
const FIELD_VF_SUBMISSION = "Submission";
const FIELD_VF_SUBMISSION_ASSET = "Submission Asset";
const FIELD_VF_NAME = "Video Feedback Name";
const FIELD_VF_COACH_FEEDBACK = "Coach Feedback";
const FIELD_VF_FEEDBACK_POSTED = "Feedback Posted?";
const FIELD_VF_REVIEWED_AT = "Reviewed At";
const FIELD_VF_VIDEO_URL = "Video URL or Drive Link";
const FIELD_VF_WEEK = "Week";
const FIELD_VF_TOTAL_XP = "Total Video XP Awarded";
const FIELD_VF_BASE_XP = "Base XP Awarded";

/* ---------- Parent feedback tracking fields on Video Feedback ---------- */

const FIELD_VF_PARENT_READY = "Parent Feedback Ready?";
const FIELD_VF_PARENT_SENT = "Parent Feedback Sent?";
const FIELD_VF_PARENT_SENT_ON = "Parent Feedback Sent On";
const FIELD_VF_PARENT_ERROR = "Parent Feedback Send Error";
const FIELD_VF_PARENT_SUBJECT = "Parent Feedback Subject";

/* ---------- Enrollment fields ---------- */

const FIELD_ENR_PARENT_EMAIL_CLEAN = "Parent Email - Cleaned";
const FIELD_ENR_PARENT_EMAIL = "Parent Email";
const FIELD_ENR_PARENT_FIRST_NAME = "Parent First Name";
const FIELD_ENR_ATHLETE_NAME = "Full Athlete Name";

/* ---------- Submission Asset fields ---------- */

const FIELD_ASSET_ORIGINAL_FILE_NAME = "Original File Name";
const FIELD_ASSET_GOOGLE_FILE_URL = "Google Drive File URL";

/* ---------- Submission fields ---------- */

const FIELD_SUB_VIDEO_SUBMISSION_NOTE = "Video Submission Note";

/* ---------- Defaults ---------- */

const DEFAULT_REPLY_TO = "mschmidt@fairfield.k12.mt.us";

const AWS_LOGO_URL = "https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/BlueOrangeCircleLogo.png";

const BRAND = {
    orgName: "127 Sports Intensity",
    primaryBlue: "#0034B7",
    darkBlue: "#00257F",
    accentOrange: "#FF8B00",
    softOrange: "#FFF4E8",
    orangeBorder: "#FFB457",
    lightGray: "#F2F2F2",
    cardBorder: "#E7E7E7",
    darkText: "#262626",
    mutedText: "#5F6470",
    containerWidth: "640px",
};

/* =========================================================
   SECTION 2: HELPERS
   ========================================================= */

function fieldExists(table, fieldName) {
    if (!table || !fieldName) return false;

    try {
        table.getField(fieldName);
        return true;
    } catch {
        return false;
    }
}

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName, fallback = 0) {
    const raw = getRaw(record, table, fieldName);

    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }

    const text = String(raw ?? "").replace(/,/g, "").trim();
    if (!text) return fallback;

    const n = Number(text);
    return Number.isFinite(n) ? n : fallback;
}

function getLinkedIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    if (!Array.isArray(raw)) return [];
    return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
    const ids = getLinkedIds(record, table, fieldName);
    return ids[0] || "";
}

function getCheckboxValue(record, table, fieldName) {
    return getRaw(record, table, fieldName) === true;
}

function firstNonBlank(...values) {
    for (const value of values) {
        const s = String(value ?? "").trim();
        if (s) return s;
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
    if (!value) return "";

    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(d);
}

function summaryRow(label, value) {
    if (!String(value || "").trim()) return "";

    return `
        <tr>
            <td style="padding:4px 0; font-size:12px; font-weight:700; color:${BRAND.darkText}; width:165px; vertical-align:top; line-height:1.2;">
                ${escapeHtml(label)}
            </td>
            <td style="padding:4px 0; font-size:12px; color:${BRAND.darkText}; line-height:1.2;">
                ${escapeHtml(value)}
            </td>
        </tr>
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

function normalizeSendMode(value) {
    const raw = String(value || "").trim().toLowerCase();

    if (["live", "l", "real", "send", "parent"].includes(raw)) {
        return "live";
    }

    if (["test", "t", "preview", "practice", "draft"].includes(raw)) {
        return "test";
    }

    return "";
}

/* =========================================================
   SECTION 3: EMAIL HTML BUILDER
   ========================================================= */

function buildEmailHtml({
    parentFirstName,
    athleteName,
    reviewedAtText,
    weekText,
    coachFeedback,
    videoUrl,
    totalXpText,
    sendMode,
    originalFileName,
    videoSubmissionNote,
}) {
    const greetingName = parentFirstName || "Parent";

    const modeBanner = sendMode === "test"
        ? `
            <div style="background:${BRAND.softOrange}; border:1px solid ${BRAND.orangeBorder}; color:#7a4a00; border-radius:14px; padding:12px 14px; margin:0 0 14px 0; font-size:12px; font-weight:700; line-height:1.35;">
                TEST MODE — This email was generated for review and was not sent to the real parent recipient.
            </div>
        `
        : "";

    const headerLogoHtml = AWS_LOGO_URL
        ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="border-collapse:collapse;">
                <tr>
                    <td align="center" valign="middle" width="76" height="76"
                        style="width:76px; height:76px; background:#ffffff; border-radius:999px; text-align:center; vertical-align:middle; overflow:hidden;">
                        <img src="${escapeHtml(AWS_LOGO_URL)}"
                             alt="127 Sports Intensity Logo"
                             width="56"
                             height="56"
                             style="display:block; width:56px; height:56px; max-width:56px; max-height:56px; margin:10px auto; border:0; outline:none; text-decoration:none;">
                    </td>
                </tr>
            </table>
        `
        : "";

    const introHtml = `
        <p style="margin:0; font-size:12px; line-height:1.45;">
            Hello ${escapeHtml(greetingName)},
        </p>
        <p style="margin:10px 0 0 0; font-size:12px; line-height:1.45;">
            I have finished reviewing the video submission from ${escapeHtml(athleteName || "your athlete")} and have included the feedback below.
        </p>
    `;

    const summaryHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
            ${summaryRow("Athlete", athleteName)}
            ${summaryRow("Reviewed At", reviewedAtText)}
            ${summaryRow("Week", weekText)}
            ${summaryRow("File Name", originalFileName)}
            ${summaryRow("Video Submission Note", videoSubmissionNote)}
            ${summaryRow("XP Awarded", totalXpText)}
        </table>
    `;

    const feedbackHtml = coachFeedback
        ? `<div style="font-size:12px; line-height:1.5;">${nlToBr(coachFeedback)}</div>`
        : `<div style="font-size:12px; line-height:1.5;">No coach feedback text was included on this record.</div>`;

    const actionHtml = videoUrl
        ? `
            <p style="margin:0 0 12px 0; font-size:12px; line-height:1.45;">You can review the linked video here:</p>
            <p style="margin:0;">
                <a href="${escapeHtml(videoUrl)}"
                   style="display:inline-block; background:${BRAND.primaryBlue}; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:700; font-size:12px;">
                    Open Video
                </a>
            </p>
        `
        : `
            <p style="margin:0; font-size:12px; line-height:1.45;">
                The feedback has been posted, but no video link was included on this record.
            </p>
        `;

    const closingHtml = `
        <p style="margin:0 0 10px 0; font-size:12px; line-height:1.45;">
            Please reply if you have any questions about this feedback or next steps.
        </p>
        <p style="margin:0; font-size:12px; line-height:1.45;">
            Thank you,<br>
            Coach Mike
        </p>
    `;

    function brandedCard(title, bodyHtml) {
        return `
            <div style="background:#ffffff; border:1px solid ${BRAND.cardBorder}; border-left:6px solid ${BRAND.accentOrange}; border-radius:16px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:15px; font-weight:800; color:${BRAND.primaryBlue}; margin:0 0 10px 0; line-height:1.25;">
                    <span style="color:${BRAND.accentOrange};">●</span>
                    ${escapeHtml(title)}
                </div>
                <div style="font-size:12px; line-height:1.45; color:${BRAND.darkText};">
                    ${bodyHtml}
                </div>
            </div>
        `;
    }

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Video Feedback</title>
</head>
<body style="margin:0; padding:0; background:${BRAND.lightGray}; font-family:Arial, Helvetica, sans-serif; color:${BRAND.darkText};">
    <div style="padding:20px 12px; background:${BRAND.lightGray};">
        <div style="max-width:${BRAND.containerWidth}; margin:0 auto;">
            ${modeBanner}

            <div style="background:${BRAND.primaryBlue}; color:#ffffff; border-radius:18px; padding:0; margin:0 0 14px 0; overflow:hidden;">
                <div style="height:6px; background:${BRAND.accentOrange}; line-height:6px; font-size:6px;">&nbsp;</div>
                <div style="padding:18px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
                        <tr>
                            <td style="vertical-align:middle; padding:0 16px 0 0;">
                                <div style="font-size:21px; font-weight:900; margin:0 0 6px 0; line-height:1.2; color:#ffffff;">
                                    Video Feedback Posted
                                </div>
                                <div style="font-size:12px; line-height:1.35; color:#ffffff; opacity:0.96;">
                                    A new coach review is available for your athlete.
                                </div>
                            </td>
                            <td style="width:76px; vertical-align:middle; text-align:right;">
                                ${headerLogoHtml}
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            ${brandedCard("Update", introHtml)}

            ${brandedCard("Summary", summaryHtml)}

            ${brandedCard("Coach Feedback - Please Read to Your Child", feedbackHtml)}

            <div style="display:none; mso-hide:all;">
                ${brandedCard("Review Link", actionHtml)}
            </div>

            ${brandedCard("Questions", closingHtml)}

            <div style="background:${BRAND.darkBlue}; color:#ffffff; border-radius:18px; padding:14px 18px; font-size:11px; line-height:1.4; border-top:5px solid ${BRAND.accentOrange}; text-align:center;">
                <div style="font-size:11px; font-weight:700; margin:0 0 7px 0; color:#ffffff; text-align:center;">
                    127 Sports Intensity | Youth sports communication and development support
                </div>
                <div style="font-size:11px; margin:0; color:#ffffff; text-align:center;">
                    &#128279;
                    <a href="https://form.fillout.com/t/iwzyzj5zeMus" style="color:#ffffff; text-decoration:underline; font-weight:700;">
                        Daily Submissions
                    </a>
                    <span style="color:${BRAND.orangeBorder};">&nbsp;|&nbsp;</span>
                    &#128279;
                    <a href="https://fairfieldbasketballclub.com/leaderboard" style="color:#ffffff; text-decoration:underline; font-weight:700;">
                        Shooting Challenge Website
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/* =========================================================
   SECTION 4: MAIN
   ========================================================= */

async function main() {
    const cfg = input.config();

    const recordId = String(cfg.recordId || "").trim();
    const makeWebhookUrl = String(cfg.makeWebhookUrl || "").trim();
    const sendModeRaw = String(cfg.sendMode || "").trim();
    const testRecipientEmail = String(cfg.testRecipientEmail || "").trim();
    const replyTo = String(cfg.replyTo || DEFAULT_REPLY_TO).trim();

    if (!recordId) {
        throw new Error("Missing required input: recordId");
    }

    if (!makeWebhookUrl) {
        throw new Error("Missing required input: makeWebhookUrl");
    }

    if (!sendModeRaw) {
        throw new Error("Missing required input: sendMode");
    }

    const sendMode = normalizeSendMode(sendModeRaw);

    if (!["test", "live"].includes(sendMode)) {
        throw new Error(`Invalid sendMode input. Expected Test or Live, received: ${sendModeRaw}`);
    }

    if (sendMode === "test" && !testRecipientEmail) {
        throw new Error("Missing required input: testRecipientEmail for Test mode");
    }

    const videoFeedbackTable = base.getTable(VIDEO_FEEDBACK_TABLE);
    const enrollmentsTable = base.getTable(ENROLLMENTS_TABLE);
    const submissionsTable = base.getTable(SUBMISSIONS_TABLE);
    const submissionAssetsTable = base.getTable(SUBMISSION_ASSETS_TABLE);

    const videoFeedbackRecord = await videoFeedbackTable.selectRecordAsync(recordId);

    if (!videoFeedbackRecord) {
        throw new Error(`Video Feedback record not found: ${recordId}`);
    }

    const enrollmentId = getFirstLinkedId(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_ENROLLMENT
    );

    if (!enrollmentId) {
        throw new Error("Video Feedback record is missing linked Enrollment.");
    }

    const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);

    if (!enrollmentRecord) {
        throw new Error(`Linked Enrollment record not found: ${enrollmentId}`);
    }

    const submissionId = getFirstLinkedId(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_SUBMISSION
    );

    if (!submissionId) {
        throw new Error("Video Feedback record is missing linked Submission.");
    }

    const submissionRecord = await submissionsTable.selectRecordAsync(submissionId);

    if (!submissionRecord) {
        throw new Error(`Linked Submission record not found: ${submissionId}`);
    }

    const submissionAssetId = getFirstLinkedId(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_SUBMISSION_ASSET
    );

    const submissionAssetRecord = submissionAssetId
        ? await submissionAssetsTable.selectRecordAsync(submissionAssetId)
        : null;

    const parentFeedbackReady = fieldExists(videoFeedbackTable, FIELD_VF_PARENT_READY)
        ? getCheckboxValue(videoFeedbackRecord, videoFeedbackTable, FIELD_VF_PARENT_READY)
        : true;

    const parentFeedbackSent = fieldExists(videoFeedbackTable, FIELD_VF_PARENT_SENT)
        ? getCheckboxValue(videoFeedbackRecord, videoFeedbackTable, FIELD_VF_PARENT_SENT)
        : false;

    const feedbackPosted = getCheckboxValue(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_FEEDBACK_POSTED
    );

    const totalVideoXpAwarded = getNumber(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_TOTAL_XP,
        0
    );

    const baseXpAwarded = getNumber(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_BASE_XP,
        0
    );

    const athleteName = firstNonBlank(
        getText(enrollmentRecord, enrollmentsTable, FIELD_ENR_ATHLETE_NAME),
        getText(videoFeedbackRecord, videoFeedbackTable, FIELD_VF_NAME)
    );

    const parentFirstName = getText(
        enrollmentRecord,
        enrollmentsTable,
        FIELD_ENR_PARENT_FIRST_NAME
    );

    const parentEmailsCsv = cleanCsvEmails(
        firstNonBlank(
            getText(enrollmentRecord, enrollmentsTable, FIELD_ENR_PARENT_EMAIL_CLEAN),
            getText(enrollmentRecord, enrollmentsTable, FIELD_ENR_PARENT_EMAIL)
        )
    );

    const coachFeedback = getText(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_COACH_FEEDBACK
    );

    const reviewedAtText = formatDateTime(
        getRaw(videoFeedbackRecord, videoFeedbackTable, FIELD_VF_REVIEWED_AT)
    );

    const weekText = getText(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_WEEK
    );

    const totalXpText = getText(
        videoFeedbackRecord,
        videoFeedbackTable,
        FIELD_VF_TOTAL_XP
    );

    const videoUrl = firstNonBlank(
        getText(videoFeedbackRecord, videoFeedbackTable, FIELD_VF_VIDEO_URL),
        submissionAssetRecord
            ? getText(submissionAssetRecord, submissionAssetsTable, FIELD_ASSET_GOOGLE_FILE_URL)
            : ""
    );

    const originalFileName = submissionAssetRecord
        ? getText(submissionAssetRecord, submissionAssetsTable, FIELD_ASSET_ORIGINAL_FILE_NAME)
        : "";

    const videoSubmissionNote = submissionRecord
        ? getText(submissionRecord, submissionsTable, FIELD_SUB_VIDEO_SUBMISSION_NOTE)
        : "";

    if (!feedbackPosted) {
        throw new Error("Feedback Posted? is not checked. Email not sent.");
    }

    if (!parentFeedbackReady) {
        throw new Error("Parent Feedback Ready? is not checked. Email not sent.");
    }

    if (parentFeedbackSent) {
        throw new Error("Parent Feedback Sent? is already checked. Duplicate send blocked.");
    }

    if (!coachFeedback) {
        throw new Error("Coach Feedback is blank. Email not sent.");
    }

    if (!parentEmailsCsv) {
        throw new Error("No parent recipient email found on linked Enrollment.");
    }

    if (totalVideoXpAwarded <= 0) {
        throw new Error("Total Video XP Awarded must be greater than 0. Email not sent.");
    }

    if (baseXpAwarded <= 0) {
        throw new Error("Base XP Awarded must be greater than 0. Email not sent.");
    }

    const sourceTable = VIDEO_FEEDBACK_TABLE;
    const sendType = "video_feedback";
    const sendTag = "VIDEO_FEEDBACK_PARENT";

    const subjectBase = `New Video Feedback for ${athleteName || "Athlete"}`;
    const subjectOut = sendMode === "test"
        ? `[TEST] ${subjectBase}`
        : subjectBase;

    const htmlOut = buildEmailHtml({
        parentFirstName,
        athleteName,
        reviewedAtText,
        weekText,
        coachFeedback,
        videoUrl,
        totalXpText,
        sendMode,
        originalFileName,
        videoSubmissionNote,
    });

    const payload = {
        recordId,
        sourceTable,
        sendType,
        sendMode,
        sendTag,

        athleteName,
        parentEmailsCsv,
        testRecipientEmail,

        toEmail: sendMode === "test" ? testRecipientEmail : parentEmailsCsv,
        liveRecipientEmail: parentEmailsCsv,
        testRecipientEmail,

        subjectOut,
        htmlOut,
        replyTo,

        videoUrl,
        originalFileName,
        videoSubmissionNote,
        totalVideoXpAwarded,
        baseXpAwarded,
    };

    let response;
    let responseText = "";

    try {
        response = await postJson(makeWebhookUrl, payload);
        responseText = await response.text();

        if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}: ${responseText}`);
        }
    } catch (error) {
        const updates = {};

        if (fieldExists(videoFeedbackTable, FIELD_VF_PARENT_ERROR)) {
            updates[FIELD_VF_PARENT_ERROR] = String(error.message || error);
        }

        if (Object.keys(updates).length) {
            await videoFeedbackTable.updateRecordAsync(recordId, updates);
        }

        output.set("ok", false);
        output.set("recordId", recordId);
        output.set("sourceTable", sourceTable);
        output.set("sendType", sendType);
        output.set("sendMode", sendMode);
        output.set("sendTag", sendTag);
        output.set("athleteName", athleteName);
        output.set("parentEmailsCsv", parentEmailsCsv);
        output.set("testRecipientEmail", testRecipientEmail);
        output.set("subjectOut", subjectOut);
        output.set("htmlOut", htmlOut);
        output.set("replyTo", replyTo);
        output.set("errorOut", String(error.message || error));

        throw error;
    }

    const successUpdates = {};

    if (fieldExists(videoFeedbackTable, FIELD_VF_PARENT_ERROR)) {
        successUpdates[FIELD_VF_PARENT_ERROR] = "";
    }

    if (fieldExists(videoFeedbackTable, FIELD_VF_PARENT_SUBJECT)) {
        successUpdates[FIELD_VF_PARENT_SUBJECT] = subjectOut;
    }

    if (Object.keys(successUpdates).length) {
        await videoFeedbackTable.updateRecordAsync(recordId, successUpdates);
    }

    output.set("ok", true);
    output.set("recordId", recordId);
    output.set("sourceTable", sourceTable);
    output.set("sendType", sendType);
    output.set("sendMode", sendMode);
    output.set("sendTag", sendTag);
    output.set("athleteName", athleteName);
    output.set("parentEmailsCsv", parentEmailsCsv);
    output.set("testRecipientEmail", testRecipientEmail);
    output.set("toEmail", payload.toEmail);
    output.set("subjectOut", subjectOut);
    output.set("htmlOut", htmlOut);
    output.set("replyTo", replyTo);
    output.set("videoUrl", videoUrl);
    output.set("originalFileName", originalFileName);
    output.set("totalVideoXpAwarded", totalVideoXpAwarded);
    output.set("baseXpAwarded", baseXpAwarded);
    output.set("makeResponse", responseText);
    output.set("errorOut", "");
}

await main();
