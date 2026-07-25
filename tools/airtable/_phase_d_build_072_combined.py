#!/usr/bin/env python3
"""Build Phase D combined 072 (build + optional Make send) from rollback pre-combine 072.

Repo-only generator. Does not touch Airtable.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SC = ROOT / "airtable/automations/shooting-challenge"
ROLLBACK = SC / "_rollback/phase-d-072-074-2026-07-14"
SRC = ROLLBACK / "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
DST = SC / "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"

NEW_HEADER = r'''/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: V2-014 / Phase D / S26
Folder: 07 - Email, Notifications, and External Handoffs
Survives: 072
Absorbs: 074 (library stub after authorize + retire)
Rollback: _rollback/phase-d-072-074-2026-07-14/
Status: READY_FOR_AUTHORIZATION (repo prep only — do not paste/enable yet)
*/

/************************************************************
 * 072 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Build (+ optional Send) Weekly Summary Email Package
 *
 * Version: v4.0.0
 * Date Written: 2026-05-19
 * Last Updated: 2026-07-14
 *
 * PURPOSE
 * - Phase D combine: former 072 BUILD + former 074 Make handoff in one slot.
 * - Runs from one Weekly Athlete Summary record.
 * - Ordered steps: BUILD package (when Build Weekly Email Now?) then SEND
 *   to Make (when Send to Make? is armed / autoSendAfterBuild), never send-before-build.
 * - Does NOT mark Weekly Email Sent? / Sent At — Make owns final Gmail writeback.
 *
 * IMPORTANT DESIGN RULES
 * - Surviving automation number: **072**. Former **074** becomes library-only.
 * - Blank / missing makeWebhookUrl = safe no-send (skip), never throw for DEV.
 * - sendEnabled input false (or unset with empty webhook) = no-send.
 * - Do not clear Send to Make? on webhook failure (retryable).
 * - Do not steal / arm send on build-only runs — leave Send to Make? unchecked
 *   unless autoSendAfterBuild or Send was already armed before build.
 * - Idempotent gate: Weekly Email Sent? checked → skip send (duplicate blocked).
 * - This is NOT Folder 07 other send scripts (071/073/076/077) and NOT 117.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 072 - Email, Notifications, and External Handoffs - Build and Send Weekly Summary Email Package
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * TRIGGER TYPE
 * - When record matches conditions (OR of build and send arms)
 *
 * REQUIRED TRIGGER CONDITIONS (UI — after authorization)
 * - Weekly Email Sent? is unchecked
 * - Enrollment is not empty
 * - Week is not empty
 * - AND either:
 *   - Build Weekly Email Now? is checked
 *   - OR (Send to Make? is checked AND Weekly Email Ready? is checked)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Weekly Athlete Summary record id (must start with rec)
 *
 * OPTIONAL INPUT VARIABLES
 * - makeWebhookUrl / webhookUrl = Make webhook (blank = safe no-send)
 * - sendEnabled = "true"/"false" hard gate (default true only when webhook present)
 * - autoSendAfterBuild = when true, SEND runs in same run after successful BUILD
 * - sendModeInput / sendMode = test | live
 * - testRecipientEmail = required for test mode send
 * - replyTo = reply-to (default mschmidt@fairfield.k12.mt.us)
 *
 * OUTPUTS
 * - statusOut: success | skipped | error
 * - errorOut, debugStep, actionOut (built | sent | skipped_* | error)
 * - buildActionOut, sendActionOut
 * - subjectOut, recipientsCsv, sendMode, sendKey
 *
 * ACTION OUT VALUES
 * - built, built_and_sent, sent, skipped_nothing_to_do, skipped_already_sent,
 *   skipped_send_disabled, skipped_no_webhook, skipped_missing_package,
 *   skipped_missing_recipient, error
 ************************************************************/

// @ts-nocheck
'''

SEND_HELPERS = r'''
/* =========================================================
   SECTION 4C: PHASE D SEND HELPERS (former 074)
   ========================================================= */

const SEND_TYPE = "weekly_summary";
const SEND_TAG = "WEEKLY_SUMMARY_PARENT";
const DEFAULT_REPLY_TO = "mschmidt@fairfield.k12.mt.us";

function cleanCsvEmails(value) {
    const items = String(value || "")
        .split(/[,\n;]+/)
        .map(v => v.trim())
        .filter(Boolean);
    return [...new Set(items)].join(",");
}

function safeJsonParse(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function boolishInput(value, fallback = false) {
    if (value === true || value === false) return value;
    const text = String(value ?? "").trim().toLowerCase();
    if (!text) return fallback;
    if (["1", "true", "yes", "y", "on"].includes(text)) return true;
    if (["0", "false", "no", "n", "off"].includes(text)) return false;
    return fallback;
}

function buildWeeklySendKey(enrollmentId, weekId, revision) {
    return `WEEKLY_SUMMARY|${enrollmentId || ""}|${weekId || ""}|${revision || ""}`;
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

/**
 * Decide build vs send phases from WAS flags + inputs.
 * Pure-decision contract mirrored in tools/airtable/tests/test_phase_d_072_074_combined.py
 */
function decidePhaseDActions(opts) {
    const buildRequested = opts.buildRequested === true;
    const sendArmed = opts.sendArmed === true;
    const emailReady = opts.emailReady === true;
    const emailSent = opts.emailSent === true;
    const autoSendAfterBuild = opts.autoSendAfterBuild === true;
    const webhookPresent = Boolean(String(opts.webhookUrl || "").trim());
    const sendEnabled = opts.sendEnabled !== false;
    const hasSubject = Boolean(String(opts.subject || "").trim());
    const hasHtml = Boolean(String(opts.html || "").trim());
    const hasRecipients = Boolean(String(opts.recipients || "").trim());

    if (emailSent && !buildRequested) {
        return {
            doBuild: false,
            doSend: false,
            actionOut: "skipped_already_sent",
            statusOut: "skipped",
            reason: "Weekly Email Sent? already checked",
        };
    }

    if (!buildRequested && !(sendArmed && emailReady)) {
        return {
            doBuild: false,
            doSend: false,
            actionOut: "skipped_nothing_to_do",
            statusOut: "skipped",
            reason: "Neither Build Now nor Send-to-Make ready",
        };
    }

    const wantSendAfterBuild = buildRequested && (sendArmed || autoSendAfterBuild);
    const wantSendOnly = !buildRequested && sendArmed && emailReady;
    let doSend = wantSendAfterBuild || wantSendOnly;

    if (doSend && emailSent) {
        return {
            doBuild: buildRequested,
            doSend: false,
            actionOut: buildRequested ? "built" : "skipped_already_sent",
            statusOut: buildRequested ? "success" : "skipped",
            reason: "Duplicate send blocked by Weekly Email Sent?",
        };
    }

    if (doSend && !sendEnabled) {
        return {
            doBuild: buildRequested,
            doSend: false,
            actionOut: buildRequested ? "built" : "skipped_send_disabled",
            statusOut: buildRequested ? "success" : "skipped",
            reason: "sendEnabled=false",
            sendSkip: "skipped_send_disabled",
        };
    }

    if (doSend && !webhookPresent) {
        return {
            doBuild: buildRequested,
            doSend: false,
            actionOut: buildRequested ? "built" : "skipped_no_webhook",
            statusOut: buildRequested ? "success" : "skipped",
            reason: "Blank webhook — safe no-send",
            sendSkip: "skipped_no_webhook",
        };
    }

    if (doSend && !wantSendAfterBuild) {
        if (!hasSubject || !hasHtml) {
            return {
                doBuild: false,
                doSend: false,
                actionOut: "skipped_missing_package",
                statusOut: "skipped",
                reason: "Missing subject or HTML package",
                sendSkip: "skipped_missing_package",
            };
        }
        if (!hasRecipients) {
            return {
                doBuild: false,
                doSend: false,
                actionOut: "skipped_missing_recipient",
                statusOut: "skipped",
                reason: "Missing recipients",
                sendSkip: "skipped_missing_recipient",
            };
        }
    }

    return {
        doBuild: buildRequested,
        doSend,
        actionOut: buildRequested && doSend ? "built_and_sent" : buildRequested ? "built" : "sent",
        statusOut: "success",
        reason: "",
        sendSkip: "",
    };
}

async function sendWeeklyPackageToMake(ctx) {
    const {
        weeklySummaryTable,
        recordId,
        makeWebhookUrl,
        sendMode,
        testRecipientEmail,
        replyTo,
        subjectOut,
        recipientsCsv,
        htmlOut,
        textOut,
        weekLabel,
        payloadJsonText,
        enrollmentId,
        weekId,
        revision,
    } = ctx;

    const sendKey = buildWeeklySendKey(enrollmentId, weekId, revision);
    const payloadJson = safeJsonParse(payloadJsonText);

    if (!["test", "live"].includes(sendMode)) {
        throw new Error(`Invalid send mode after normalization: ${sendMode}`);
    }
    if (sendMode === "test" && !testRecipientEmail) {
        throw new Error("Missing testRecipientEmail for test mode.");
    }

    const cleanRecipients = cleanCsvEmails(recipientsCsv);
    if (!String(subjectOut || "").trim()) {
        return { ok: false, actionOut: "skipped_missing_package", errorOut: "Weekly Email Subject is blank.", sendKey };
    }
    if (!String(htmlOut || "").trim()) {
        return { ok: false, actionOut: "skipped_missing_package", errorOut: "Weekly Email HTML is blank.", sendKey };
    }
    if (!cleanRecipients) {
        return { ok: false, actionOut: "skipped_missing_recipient", errorOut: "Weekly Email Recipients is blank.", sendKey };
    }

    const payload = {
        recordId,
        weeklySummaryRecordId: recordId,
        weeklyEmailRecordId: recordId,
        sourceTable: CONFIG.tables.summary,
        sendType: SEND_TYPE,
        sendTag: SEND_TAG,
        sendMode,
        sendKey,
        enrollmentId: enrollmentId || "",
        weekId: weekId || "",
        weekLabel: weekLabel || "",
        subjectOut,
        htmlOut,
        textOut: textOut || "",
        recipientsCsv: cleanRecipients,
        subject: subjectOut,
        html: htmlOut,
        text: textOut || "",
        csvemail: cleanRecipients,
        payloadJson: payloadJsonText || "",
        toEmail: sendMode === "test" ? testRecipientEmail : cleanRecipients,
        liveRecipientEmail: cleanRecipients,
        testRecipientEmail,
        replyTo,
        preparedPayload: payloadJson || {},
        parsedPayload: payloadJson || {},
        rawPreparedPayloadJson: payloadJsonText || "",
        revision: revision || payloadJson?.revision || "",
        handoffBuiltAt: new Date().toISOString(),
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
        const errorUpdates = {};
        if (fieldExists(weeklySummaryTable, CONFIG.summaryFields.emailError)) {
            errorUpdates[CONFIG.summaryFields.emailError] = String(error.message || error);
        }
        // Do not uncheck Send to Make? on webhook failure (retryable).
        if (Object.keys(errorUpdates).length) {
            await weeklySummaryTable.updateRecordAsync(recordId, errorUpdates);
        }
        return {
            ok: false,
            actionOut: "error",
            errorOut: String(error.message || error),
            sendKey,
            makeResponse: responseText,
            threw: true,
        };
    }

    const successUpdates = {};
    if (fieldExists(weeklySummaryTable, CONFIG.summaryFields.sendToMake)) {
        successUpdates[CONFIG.summaryFields.sendToMake] = false;
    }
    if (fieldExists(weeklySummaryTable, CONFIG.summaryFields.emailError)) {
        successUpdates[CONFIG.summaryFields.emailError] = "";
    }
    if (fieldExists(weeklySummaryTable, CONFIG.summaryFields.emailReady)) {
        successUpdates[CONFIG.summaryFields.emailReady] = true;
    }
    if (fieldExists(weeklySummaryTable, CONFIG.summaryFields.emailSent)) {
        successUpdates[CONFIG.summaryFields.emailSent] = false;
    }
    if (Object.keys(successUpdates).length) {
        await weeklySummaryTable.updateRecordAsync(recordId, successUpdates);
    }

    return {
        ok: true,
        actionOut: "sent",
        errorOut: "",
        sendKey,
        makeResponse: responseText,
        toEmail: payload.toEmail,
        threw: false,
    };
}

'''


def main() -> None:
    text = SRC.read_text(encoding="utf-8")

    # Drop original GitHub header + docblock through //@ts-nocheck
    marker = "// @ts-nocheck"
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit("Missing //@ts-nocheck in source 072")
    body = text[idx + len(marker) :].lstrip("\n")

    # Update CONFIG identity fields
    body = body.replace(
        'scriptName: "072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package",\n'
        '    version: "v3.7",\n'
        '    dateWritten: "2026-05-19",\n'
        '    lastUpdated: "2026-06-21",',
        'scriptName: "072 - Email, Notifications, and External Handoffs - Build and Send Weekly Summary Email Package",\n'
        '    version: "v4.0.0",\n'
        '    dateWritten: "2026-05-19",\n'
        '    lastUpdated: "2026-07-14",\n'
        '    phaseDAbsorbed: "074",',
    )

    # Inject send helpers after setOutputSafe block
    inject_at = body.find("function plainTextFromHtml(html)")
    if inject_at < 0:
        raise SystemExit("plainTextFromHtml not found")
    body = body[:inject_at] + SEND_HELPERS + "\n" + body[inject_at:]

    # Patch main() input section
    old_input = '''    const cfg = input.config();
    const recordId = String(cfg.recordId || "").trim();
    const sendModeInput = String(cfg.sendModeInput || "").trim();

    if (!recordId) {
        throw new Error("Missing required input: recordId");
    }'''

    new_input = '''    let debugStep = "1 - Input";
    setOutputSafe("debugStep", debugStep);

    const cfg = input.config();
    const recordId = String(cfg.recordId || "").trim();
    const sendModeInput = String(cfg.sendMode || cfg.sendModeInput || "").trim();
    const makeWebhookUrl = String(cfg.makeWebhookUrl || cfg.webhookUrl || "").trim();
    const testRecipientEmail = String(cfg.testRecipientEmail || "").trim();
    const replyTo = String(cfg.replyTo || DEFAULT_REPLY_TO).trim();
    const autoSendAfterBuild = boolishInput(cfg.autoSendAfterBuild, false);
    // sendEnabled: explicit false always blocks; otherwise allow when webhook present
    const sendEnabledExplicit = cfg.sendEnabled;
    const sendEnabled = sendEnabledExplicit === undefined || sendEnabledExplicit === null || String(sendEnabledExplicit).trim() === ""
        ? true
        : boolishInput(sendEnabledExplicit, true);

    if (!recordId || !recordId.startsWith("rec")) {
        throw new Error("Missing or invalid required input: recordId");
    }

    let buildActionOut = "skipped";
    let sendActionOut = "skipped";
    let actionOut = "skipped_nothing_to_do";
    let sendKeyOut = "";
    let phaseDSendResult = null;'''

    if old_input not in body:
        raise SystemExit("Input block not found for patch")
    body = body.replace(old_input, new_input, 1)

    # After tables section, inject early flag load + send-only short circuit
    tables_end = '''    const curriculumTable = base.getTable(CONFIG.tables.curriculum);

    /* =========================================================
       SECTION 6: DETERMINE EXISTING FIELDS
       ========================================================= */'''

    early_route = '''    const curriculumTable = base.getTable(CONFIG.tables.curriculum);

    /* =========================================================
       SECTION 5B: PHASE D ROUTING (build vs send-only)
       ========================================================= */

    debugStep = "2 - Route build/send";
    setOutputSafe("debugStep", debugStep);

    const routeFields = existingFields(summaryTable, [
        CONFIG.summaryFields.buildNow,
        CONFIG.summaryFields.sendToMake,
        CONFIG.summaryFields.emailReady,
        CONFIG.summaryFields.emailSent,
        CONFIG.summaryFields.emailSubject,
        CONFIG.summaryFields.emailRecipients,
        CONFIG.summaryFields.emailHtml,
        CONFIG.summaryFields.emailText,
        CONFIG.summaryFields.emailPayloadJson,
        CONFIG.summaryFields.emailWeekLabel,
        CONFIG.summaryFields.emailRevision,
        CONFIG.summaryFields.enrollment,
        CONFIG.summaryFields.week,
        CONFIG.summaryFields.sendMode,
    ]);

    const routeRecord = await summaryTable.selectRecordAsync(recordId, { fields: routeFields });
    if (!routeRecord) {
        throw new Error(`Weekly Athlete Summary not found: ${recordId}`);
    }

    const buildRequested = fieldExists(summaryTable, CONFIG.summaryFields.buildNow)
        ? getBooleanish(routeRecord, summaryTable, CONFIG.summaryFields.buildNow)
        : false;
    const sendArmed = fieldExists(summaryTable, CONFIG.summaryFields.sendToMake)
        ? getBooleanish(routeRecord, summaryTable, CONFIG.summaryFields.sendToMake)
        : false;
    const emailReady = fieldExists(summaryTable, CONFIG.summaryFields.emailReady)
        ? getBooleanish(routeRecord, summaryTable, CONFIG.summaryFields.emailReady)
        : false;
    const emailSent = fieldExists(summaryTable, CONFIG.summaryFields.emailSent)
        ? getBooleanish(routeRecord, summaryTable, CONFIG.summaryFields.emailSent)
        : false;

    const routeSubject = getText(routeRecord, summaryTable, CONFIG.summaryFields.emailSubject);
    const routeRecipients = getText(routeRecord, summaryTable, CONFIG.summaryFields.emailRecipients);
    const routeHtml = getText(routeRecord, summaryTable, CONFIG.summaryFields.emailHtml);

    const routeDecision = decidePhaseDActions({
        buildRequested,
        sendArmed,
        emailReady,
        emailSent,
        autoSendAfterBuild,
        webhookUrl: makeWebhookUrl,
        sendEnabled,
        subject: routeSubject,
        html: routeHtml,
        recipients: routeRecipients,
    });

    if (!routeDecision.doBuild && !routeDecision.doSend) {
        actionOut = routeDecision.actionOut;
        buildActionOut = "skipped";
        sendActionOut = routeDecision.sendSkip || routeDecision.actionOut;
        setOutputSafe("statusOut", routeDecision.statusOut);
        setOutputSafe("errorOut", "");
        setOutputSafe("actionOut", actionOut);
        setOutputSafe("buildActionOut", buildActionOut);
        setOutputSafe("sendActionOut", sendActionOut);
        setOutputSafe("debugStep", "done - skipped");
        setOutputSafe("sendKey", "");
        console.log(JSON.stringify({
            automation: CONFIG.scriptName,
            version: CONFIG.version,
            recordId,
            actionOut,
            reason: routeDecision.reason,
        }));
        return;
    }

    // Send-only path (package already built by a prior run)
    if (!routeDecision.doBuild && routeDecision.doSend) {
        debugStep = "3 - Send only (former 074)";
        setOutputSafe("debugStep", debugStep);

        const enrollmentIdSend = getFirstLinkedId(routeRecord, summaryTable, CONFIG.summaryFields.enrollment);
        const weekIdSend = getFirstLinkedId(routeRecord, summaryTable, CONFIG.summaryFields.week);
        const sendModeFromRecord = fieldExists(summaryTable, CONFIG.summaryFields.sendMode)
            ? getText(routeRecord, summaryTable, CONFIG.summaryFields.sendMode)
            : "";
        const payloadJsonText = getText(routeRecord, summaryTable, CONFIG.summaryFields.emailPayloadJson);
        const payloadJson = safeJsonParse(payloadJsonText);
        const sendMode = firstNonBlank(
            normalizeSendModeInline(sendModeInput),
            normalizeSendModeInline(sendModeFromRecord),
            normalizeSendModeInline(payloadJson?.sendMode),
            "test"
        );

        phaseDSendResult = await sendWeeklyPackageToMake({
            weeklySummaryTable: summaryTable,
            recordId,
            makeWebhookUrl,
            sendMode,
            testRecipientEmail,
            replyTo,
            subjectOut: routeSubject,
            recipientsCsv: routeRecipients,
            htmlOut: routeHtml,
            textOut: getText(routeRecord, summaryTable, CONFIG.summaryFields.emailText),
            weekLabel: getText(routeRecord, summaryTable, CONFIG.summaryFields.emailWeekLabel),
            payloadJsonText,
            enrollmentId: enrollmentIdSend,
            weekId: weekIdSend,
            revision: getText(routeRecord, summaryTable, CONFIG.summaryFields.emailRevision) || CONFIG.version,
        });

        sendActionOut = phaseDSendResult.actionOut;
        sendKeyOut = phaseDSendResult.sendKey || "";
        buildActionOut = "skipped";
        actionOut = phaseDSendResult.ok ? "sent" : phaseDSendResult.actionOut;
        setOutputSafe("statusOut", phaseDSendResult.ok ? "success" : (phaseDSendResult.threw ? "error" : "skipped"));
        setOutputSafe("errorOut", phaseDSendResult.errorOut || "");
        setOutputSafe("actionOut", actionOut);
        setOutputSafe("buildActionOut", buildActionOut);
        setOutputSafe("sendActionOut", sendActionOut);
        setOutputSafe("sendKey", sendKeyOut);
        setOutputSafe("sendMode", sendMode);
        setOutputSafe("subjectOut", routeSubject);
        setOutputSafe("recipientsCsv", routeRecipients);
        setOutputSafe("debugStep", "done - send only");
        console.log(JSON.stringify({
            automation: CONFIG.scriptName,
            version: CONFIG.version,
            recordId,
            actionOut,
            sendActionOut,
            sendKey: sendKeyOut,
        }));
        if (phaseDSendResult.threw) {
            throw new Error(phaseDSendResult.errorOut || "Make webhook failed");
        }
        return;
    }

    /* =========================================================
       SECTION 6: DETERMINE EXISTING FIELDS
       ========================================================= */'''

    if tables_end not in body:
        raise SystemExit("Tables end marker not found")
    body = body.replace(tables_end, early_route, 1)

    # Inject normalizeSendModeInline before first use — place near top of helpers via alias in SEND_HELPERS
    # Actual normalizeSendMode is nested inside main later — add outer alias function in SEND_HELPERS
    # We already call normalizeSendModeInline in send-only — define it:
    body = body.replace(
        "function buildWeeklySendKey(enrollmentId, weekId, revision) {",
        '''function normalizeSendModeInline(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (["live", "l", "real", "send", "parent"].includes(raw)) return "live";
    if (["test", "t", "preview", "practice", "draft"].includes(raw)) return "test";
    return "";
}

function buildWeeklySendKey(enrollmentId, weekId, revision) {''',
        1,
    )

    # Patch writeback: capture armed send; after update, optional send
    old_writeback_start = '''    /* =========================================================
       SECTION 22: WRITE BACK TO WEEKLY ATHLETE SUMMARY
       ========================================================= */

    const updateFields = {};

    if (fieldExists(summaryTable, CONFIG.summaryFields.buildNow)) {
        updateFields[CONFIG.summaryFields.buildNow] = false;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailReady)) {
        updateFields[CONFIG.summaryFields.emailReady] = true;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailSent)) {
        updateFields[CONFIG.summaryFields.emailSent] = false;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.sendToMake)) {
        updateFields[CONFIG.summaryFields.sendToMake] = false;
    }'''

    new_writeback_start = '''    /* =========================================================
       SECTION 22: WRITE BACK TO WEEKLY ATHLETE SUMMARY
       ========================================================= */

    debugStep = "22 - Write package";
    setOutputSafe("debugStep", debugStep);

    const sendArmedBeforeBuild = sendArmed;
    const willAttemptSendAfterBuild = Boolean(
        routeDecision.doSend || ((sendArmedBeforeBuild || autoSendAfterBuild) && sendEnabled && makeWebhookUrl)
    );

    const updateFields = {};

    if (fieldExists(summaryTable, CONFIG.summaryFields.buildNow)) {
        updateFields[CONFIG.summaryFields.buildNow] = false;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailReady)) {
        updateFields[CONFIG.summaryFields.emailReady] = true;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailSent)) {
        updateFields[CONFIG.summaryFields.emailSent] = false;
    }

    // Keep Send to Make? armed when we will hand off in this same run; otherwise clear for review gate.
    if (fieldExists(summaryTable, CONFIG.summaryFields.sendToMake)) {
        updateFields[CONFIG.summaryFields.sendToMake] = willAttemptSendAfterBuild
            ? true
            : false;
    }'''

    if old_writeback_start not in body:
        raise SystemExit("Writeback start not found")
    body = body.replace(old_writeback_start, new_writeback_start, 1)

    old_after_update = '''    await summaryTable.updateRecordAsync(recordId, updateFields);

    /* =========================================================
       SECTION 23: OUTPUTS
       ========================================================= */

    setOutputSafe("subjectOut", subjectOut);'''

    new_after_update = '''    await summaryTable.updateRecordAsync(recordId, updateFields);
    buildActionOut = "built";

    /* =========================================================
       SECTION 22B: OPTIONAL SEND (former 074) — ordered after BUILD
       ========================================================= */

    const postBuildDecision = decidePhaseDActions({
        buildRequested: false,
        sendArmed: willAttemptSendAfterBuild,
        emailReady: true,
        emailSent: false,
        autoSendAfterBuild: false,
        webhookUrl: makeWebhookUrl,
        sendEnabled,
        subject: subjectOut,
        html: htmlOut,
        recipients: recipientsCsv,
    });

    if (postBuildDecision.doSend) {
        debugStep = "22B - Send to Make";
        setOutputSafe("debugStep", debugStep);
        phaseDSendResult = await sendWeeklyPackageToMake({
            weeklySummaryTable: summaryTable,
            recordId,
            makeWebhookUrl,
            sendMode,
            testRecipientEmail,
            replyTo,
            subjectOut,
            recipientsCsv,
            htmlOut,
            textOut,
            weekLabel,
            payloadJsonText: JSON.stringify(payload, null, 2),
            enrollmentId,
            weekId,
            revision: CONFIG.version,
        });
        sendActionOut = phaseDSendResult.actionOut;
        sendKeyOut = phaseDSendResult.sendKey || "";
        if (phaseDSendResult.threw) {
            actionOut = "error";
            setOutputSafe("statusOut", "error");
            setOutputSafe("errorOut", phaseDSendResult.errorOut || "");
            setOutputSafe("actionOut", actionOut);
            setOutputSafe("buildActionOut", buildActionOut);
            setOutputSafe("sendActionOut", sendActionOut);
            setOutputSafe("sendKey", sendKeyOut);
            throw new Error(phaseDSendResult.errorOut || "Make webhook failed");
        }
        actionOut = phaseDSendResult.ok ? "built_and_sent" : (phaseDSendResult.actionOut || "built");
    } else {
        sendActionOut = postBuildDecision.sendSkip || "skipped";
        actionOut = "built";
        if (!makeWebhookUrl && (sendArmedBeforeBuild || autoSendAfterBuild)) {
            sendActionOut = "skipped_no_webhook";
        } else if (!sendEnabled && (sendArmedBeforeBuild || autoSendAfterBuild)) {
            sendActionOut = "skipped_send_disabled";
        }
    }

    /* =========================================================
       SECTION 23: OUTPUTS
       ========================================================= */

    setOutputSafe("actionOut", actionOut);
    setOutputSafe("buildActionOut", buildActionOut);
    setOutputSafe("sendActionOut", sendActionOut);
    setOutputSafe("sendKey", sendKeyOut);
    setOutputSafe("debugStep", "done");
    setOutputSafe("subjectOut", subjectOut);'''

    if old_after_update not in body:
        raise SystemExit("After-update block not found")
    body = body.replace(old_after_update, new_after_update, 1)

    # Replace trailing await main();
    if not body.rstrip().endswith("await main();"):
        # allow whitespace
        if "await main();" not in body[-80:]:
            raise SystemExit("await main() not found at end")
    body = body.rstrip()
    if body.endswith("await main();"):
        body = body[: -len("await main();")] + '''try {
    await main();
} catch (error) {
    setOutputSafe("statusOut", "error");
    setOutputSafe("errorOut", String(error && error.message ? error.message : error));
    setOutputSafe("debugStep", "error");
    throw error;
}
'''

    out = NEW_HEADER + "\n" + body
    DST.write_text(out, encoding="utf-8", newline="\n")
    print(f"Wrote {DST.relative_to(ROOT)} ({len(out)} chars)")


if __name__ == "__main__":
    main()
