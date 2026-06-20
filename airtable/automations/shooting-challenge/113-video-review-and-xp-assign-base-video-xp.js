/*
Automation: 113 - Video Review and XP - Assign Base Video XP
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
 * 113 - VIDEO REVIEW AND XP
 * Assign Base Video XP
 *
 * Version: v6.2
 * Date Updated: 2026-06-20
 *
 * PURPOSE
 * - Runs from one Video Feedback record.
 * - Confirms video feedback has been posted.
 * - Confirms the record should receive XP.
 * - Reads the active shared video XP rule from XP Reward Rules.
 * - Uses Rule Key = VIDEO_SUBMISSION.
 * - Does NOT use Grade Band.
 * - Writes XP Reward Rules -> XP Amount into Video Feedback -> Base XP Awarded.
 * - Sets Award Status to Pending.
 * - Checks Ready for XP Automation? so Automation 114 can create/update the XP Event.
 * - Writes Reviewed By and Reviewed At when the review is completed.
 * - Does NOT create the XP Event.
 *
 * REQUIRED INPUT VARIABLE
 * - recordId = Airtable record ID from the triggering Video Feedback record
 ************************************************************/

// @ts-nocheck

async function main() {
    const CONFIG = {
        automation: "113 - Video Review and XP - Assign Base Video XP",
        version: "v6.2",

        tables: {
            videoFeedback: "Video Feedback",
            xpRewardRules: "XP Reward Rules",
        },

        videoFields: {
            feedbackPosted: "Feedback Posted?",
            doNotAwardXp: "Do Not Award XP?",
            active: "Active?",
            coachFeedback: "Coach Feedback",

            enrollment: "Enrollment",
            submission: "Submission",
            xpEvents: "XP Events",

            baseXpAwarded: "Base XP Awarded",
            awardStatus: "Award Status",
            readyForXpAutomation: "Ready for XP Automation?",
            workflowStatus: "Video Feedback Workflow Status",

            reviewedBy: "Reviewed By",
            reviewedAt: "Reviewed At",
        },

        ruleFields: {
            active: "Active?",
            ruleKey: "Rule Key",
            rewardRule: "Reward Rule",
            xpAmount: "XP Amount",
        },

        values: {
            ruleKeyVideoSubmission: "VIDEO_SUBMISSION",
            awardStatusPending: "Pending",
            awardStatusAwarded: "Awarded",
            awardStatusDoNotAward: "Do Not Award",
            workflowReadyForXp: "Ready for XP",
            reviewedByName: "Mike Schmidt",
        },
    };

    const inputConfig = input.config();
    const recordId = String(inputConfig.recordId || "").trim();

    if (!recordId) {
        throw new Error("Missing required input variable: recordId");
    }

    const videoTable = base.getTable(CONFIG.tables.videoFeedback);
    const rulesTable = base.getTable(CONFIG.tables.xpRewardRules);

    function log(label, data = null) {
        if (data === null || data === undefined) {
            console.log(label);
        } else {
            console.log(label, JSON.stringify(data, null, 2));
        }
    }

    function setOut(name, value) {
        try {
            output.set(name, value);
        } catch {
            // Ignore output errors.
        }
    }

    function finish(status, action, details = {}) {
        setOut("statusOut", status);
        setOut("actionOut", action);
        setOut("recordIdOut", recordId);
        setOut("matchedRuleOut", details.matchedRule || "");
        setOut("ruleKeyOut", details.ruleKey || CONFIG.values.ruleKeyVideoSubmission);
        setOut("baseXpOut", details.baseXp || 0);
        setOut("awardStatusWritten", details.awardStatusWritten || "");
        setOut("readyForXpAutomationWritten", details.readyForXpAutomationWritten ?? "");
        setOut("reviewedByOut", details.reviewedBy || "");
        setOut("reviewedAtOut", details.reviewedAt || "");
        setOut("reviewedAtWritten", details.reviewedAtWritten ?? false);
        setOut("reviewedByWritten", details.reviewedByWritten ?? false);
        setOut("updateFieldsWritten", details.updateFieldsWritten || []);
        setOut("errorOut", details.error || "");

        log(`113 ${status}`, {
            automation: CONFIG.automation,
            version: CONFIG.version,
            statusOut: status,
            actionOut: action,
            recordIdOut: recordId,
            matchedRuleOut: details.matchedRule || "",
            ruleKeyOut: details.ruleKey || CONFIG.values.ruleKeyVideoSubmission,
            baseXpOut: details.baseXp || 0,
            awardStatusWritten: details.awardStatusWritten || "",
            readyForXpAutomationWritten: details.readyForXpAutomationWritten ?? "",
            reviewedByOut: details.reviewedBy || "",
            reviewedAtOut: details.reviewedAt || "",
            reviewedAtWritten: details.reviewedAtWritten ?? false,
            reviewedByWritten: details.reviewedByWritten ?? false,
            updateFieldsWritten: details.updateFieldsWritten || [],
            errorOut: details.error || "",
        });
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
        if (!fieldExists(table, fieldName)) return false;

        const field = table.getField(fieldName);

        if (field.isComputed === true) return false;

        const nonWritableTypes = new Set([
            "formula",
            "rollup",
            "lookup",
            "multipleLookupValues",
            "count",
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

    function requireWritableField(table, fieldName) {
        requireField(table, fieldName);

        if (!isWritableField(table, fieldName)) {
            throw new Error(`Field exists but is not writable: ${table.name} -> ${fieldName}`);
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

    function getNumber(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);

        if (typeof raw === "number" && Number.isFinite(raw)) {
            return raw;
        }

        const asText = String(raw ?? "")
            .replace(/[$,%]/g, "")
            .replace(/,/g, "")
            .trim();

        if (!asText) return null;

        const parsed = Number(asText);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getCheckbox(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);

        if (raw === true) return true;
        if (raw === false) return false;
        if (raw === 1) return true;
        if (raw === 0) return false;

        const asText = String(raw ?? "").trim().toLowerCase();

        return ["true", "yes", "checked", "1", "active"].includes(asText);
    }

    function getLinkedIds(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);
        if (!Array.isArray(raw)) return [];

        return raw
            .map(item => item && item.id)
            .filter(Boolean);
    }

    function getSingleSelectName(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);

        if (raw && typeof raw === "object" && raw.name) {
            return String(raw.name || "").trim();
        }

        return getText(record, table, fieldName);
    }

    function normalize(value) {
        return String(value ?? "")
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function buildSingleSelectValue(table, fieldName, optionName) {
        const field = table.getField(fieldName);

        if (field.type !== "singleSelect") {
            return optionName;
        }

        const match = field.options?.choices?.find(choice =>
            normalize(choice.name) === normalize(optionName)
        );

        if (!match) {
            const choices = field.options?.choices?.map(choice => choice.name).join(", ") || "";
            throw new Error(`Missing option "${optionName}" in ${table.name} -> ${fieldName}. Choices: ${choices}`);
        }

        return { id: match.id };
    }

    function addIfWritable(fields, table, fieldName, value) {
        if (!fieldExists(table, fieldName)) return;
        if (!isWritableField(table, fieldName)) return;
        if (value === undefined) return;

        fields[fieldName] = value;
    }

    function ruleKeyMatches(ruleRecord) {
        const ruleKeyText = getText(ruleRecord, rulesTable, CONFIG.ruleFields.ruleKey);
        const rewardRuleText = getText(ruleRecord, rulesTable, CONFIG.ruleFields.rewardRule);

        return (
            normalize(ruleKeyText) === normalize(CONFIG.values.ruleKeyVideoSubmission) ||
            normalize(rewardRuleText) === normalize("Video Submission")
        );
    }

    function getRuleDisplayName(ruleRecord) {
        const rewardRule = getText(ruleRecord, rulesTable, CONFIG.ruleFields.rewardRule);
        const ruleKey = getText(ruleRecord, rulesTable, CONFIG.ruleFields.ruleKey);

        return rewardRule || ruleKey || ruleRecord.name || ruleRecord.id;
    }

    /* =========================================================
       Required fields
    ========================================================= */

    [
        CONFIG.videoFields.feedbackPosted,
        CONFIG.videoFields.doNotAwardXp,
        CONFIG.videoFields.coachFeedback,
        CONFIG.videoFields.enrollment,
        CONFIG.videoFields.submission,
        CONFIG.videoFields.baseXpAwarded,
        CONFIG.videoFields.awardStatus,
        CONFIG.videoFields.readyForXpAutomation,
    ].forEach(fieldName => requireField(videoTable, fieldName));

    [
        CONFIG.videoFields.baseXpAwarded,
        CONFIG.videoFields.awardStatus,
        CONFIG.videoFields.readyForXpAutomation,
    ].forEach(fieldName => requireWritableField(videoTable, fieldName));

    [
        CONFIG.ruleFields.active,
        CONFIG.ruleFields.ruleKey,
        CONFIG.ruleFields.xpAmount,
    ].forEach(fieldName => requireField(rulesTable, fieldName));

    /* =========================================================
       Load Video Feedback record
    ========================================================= */

    const videoRecord = await videoTable.selectRecordAsync(recordId);

    if (!videoRecord) {
        throw new Error(`Video Feedback record not found: ${recordId}`);
    }

    const feedbackPosted = getCheckbox(videoRecord, videoTable, CONFIG.videoFields.feedbackPosted);
    const doNotAwardXp = getCheckbox(videoRecord, videoTable, CONFIG.videoFields.doNotAwardXp);
    const videoActive = fieldExists(videoTable, CONFIG.videoFields.active)
        ? getCheckbox(videoRecord, videoTable, CONFIG.videoFields.active)
        : true;

    const coachFeedbackPresent = getText(videoRecord, videoTable, CONFIG.videoFields.coachFeedback) !== "";

    const currentBaseXp = getNumber(videoRecord, videoTable, CONFIG.videoFields.baseXpAwarded);
    const hasValidExistingBaseXp = typeof currentBaseXp === "number" && currentBaseXp > 0;

    const currentAwardStatus = getSingleSelectName(videoRecord, videoTable, CONFIG.videoFields.awardStatus);

    const enrollmentIds = getLinkedIds(videoRecord, videoTable, CONFIG.videoFields.enrollment);
    const submissionIds = getLinkedIds(videoRecord, videoTable, CONFIG.videoFields.submission);
    const existingXpEventIds = fieldExists(videoTable, CONFIG.videoFields.xpEvents)
        ? getLinkedIds(videoRecord, videoTable, CONFIG.videoFields.xpEvents)
        : [];

    const reviewedByCurrent = getText(videoRecord, videoTable, CONFIG.videoFields.reviewedBy);
    const reviewedAtCurrent = getRaw(videoRecord, videoTable, CONFIG.videoFields.reviewedAt);

    log("113 input", {
        recordId,
        feedbackPosted,
        doNotAwardXp,
        currentBaseXp,
        hasValidExistingBaseXp,
        currentAwardStatus,
        existingXpEventIds,
        videoActive,
        coachFeedbackPresent,
        enrollmentIds,
        submissionIds,
        reviewedByCurrent,
        reviewedAtCurrent,
    });

    /* =========================================================
       Eligibility checks
    ========================================================= */

    if (!videoActive) {
        finish("skipped", "video_not_active", { error: "Video Feedback Active? is unchecked." });
        return;
    }

    if (!feedbackPosted) {
        finish("skipped", "feedback_not_posted", { error: "Feedback Posted? is not checked." });
        return;
    }

    if (doNotAwardXp) {
        const fields = {};

        addIfWritable(
            fields,
            videoTable,
            CONFIG.videoFields.awardStatus,
            buildSingleSelectValue(videoTable, CONFIG.videoFields.awardStatus, CONFIG.values.awardStatusDoNotAward)
        );

        addIfWritable(
            fields,
            videoTable,
            CONFIG.videoFields.readyForXpAutomation,
            false
        );

        if (Object.keys(fields).length) {
            await videoTable.updateRecordAsync(recordId, fields);
        }

        finish("skipped", "do_not_award_xp", {
            awardStatusWritten: CONFIG.values.awardStatusDoNotAward,
            readyForXpAutomationWritten: false,
            updateFieldsWritten: Object.keys(fields),
            error: "Do Not Award XP? is checked.",
        });

        return;
    }

    if (!coachFeedbackPresent) {
        finish("skipped", "coach_feedback_missing", { error: "Coach Feedback is empty." });
        return;
    }

    if (!enrollmentIds.length) {
        finish("skipped", "missing_enrollment", { error: "Enrollment is empty." });
        return;
    }

    if (!submissionIds.length) {
        finish("skipped", "missing_submission", { error: "Submission is empty." });
        return;
    }

    if (normalize(currentAwardStatus) === normalize(CONFIG.values.awardStatusAwarded)) {
        finish("skipped", "already_awarded", {
            error: "Award Status is already Awarded.",
            baseXp: currentBaseXp || 0,
        });
        return;
    }

    if (existingXpEventIds.length > 0) {
        finish("skipped", "xp_event_already_exists", {
            error: "XP Events already linked. 113 will not re-arm 114.",
            baseXp: currentBaseXp || 0,
        });
        return;
    }

    /* =========================================================
       Load matching XP Reward Rule
    ========================================================= */

    const rulesQuery = await rulesTable.selectRecordsAsync({
        fields: [
            CONFIG.ruleFields.active,
            CONFIG.ruleFields.ruleKey,
            CONFIG.ruleFields.rewardRule,
            CONFIG.ruleFields.xpAmount,
        ].filter(fieldName => fieldExists(rulesTable, fieldName)),
    });

    const matchingRules = rulesQuery.records.filter(ruleRecord => {
        const active = getCheckbox(ruleRecord, rulesTable, CONFIG.ruleFields.active);
        const xpAmount = getNumber(ruleRecord, rulesTable, CONFIG.ruleFields.xpAmount);

        return active && ruleKeyMatches(ruleRecord) && typeof xpAmount === "number" && xpAmount > 0;
    });

    if (!matchingRules.length) {
        throw new Error(`No active XP Reward Rule found for Rule Key = ${CONFIG.values.ruleKeyVideoSubmission}`);
    }

    if (matchingRules.length > 1) {
        log("113 warning - multiple matching rules found. Using first.", {
            matchingRuleIds: matchingRules.map(record => record.id),
            matchingRuleNames: matchingRules.map(record => getRuleDisplayName(record)),
        });
    }

    const matchedRule = matchingRules[0];
    const matchedRuleName = getRuleDisplayName(matchedRule);
    const baseXp = getNumber(matchedRule, rulesTable, CONFIG.ruleFields.xpAmount);

    if (!(typeof baseXp === "number" && baseXp > 0)) {
        throw new Error(`Matched rule has invalid XP Amount: ${matchedRuleName}`);
    }

    /* =========================================================
       Write Video Feedback updates
    ========================================================= */

    const updateFields = {};
    const nowIso = new Date().toISOString();

    addIfWritable(
        updateFields,
        videoTable,
        CONFIG.videoFields.baseXpAwarded,
        baseXp
    );

    addIfWritable(
        updateFields,
        videoTable,
        CONFIG.videoFields.awardStatus,
        buildSingleSelectValue(videoTable, CONFIG.videoFields.awardStatus, CONFIG.values.awardStatusPending)
    );

    addIfWritable(
        updateFields,
        videoTable,
        CONFIG.videoFields.readyForXpAutomation,
        true
    );

    if (fieldExists(videoTable, CONFIG.videoFields.workflowStatus)) {
        addIfWritable(
            updateFields,
            videoTable,
            CONFIG.videoFields.workflowStatus,
            buildSingleSelectValue(videoTable, CONFIG.videoFields.workflowStatus, CONFIG.values.workflowReadyForXp)
        );
    }

    let reviewedAtWritten = false;
    let reviewedByWritten = false;

    if (fieldExists(videoTable, CONFIG.videoFields.reviewedAt) && !reviewedAtCurrent) {
        addIfWritable(
            updateFields,
            videoTable,
            CONFIG.videoFields.reviewedAt,
            nowIso
        );
        reviewedAtWritten = true;
    }

    if (fieldExists(videoTable, CONFIG.videoFields.reviewedBy) && !reviewedByCurrent) {
        addIfWritable(
            updateFields,
            videoTable,
            CONFIG.videoFields.reviewedBy,
            CONFIG.values.reviewedByName
        );
        reviewedByWritten = true;
    }

    if (!Object.keys(updateFields).length) {
        finish("skipped", "no_writable_fields_to_update", {
            matchedRule: matchedRuleName,
            ruleKey: CONFIG.values.ruleKeyVideoSubmission,
            baseXp,
            error: "No writable fields were available to update.",
        });
        return;
    }

    await videoTable.updateRecordAsync(recordId, updateFields);

    finish("success", "assigned_base_xp_and_armed_114", {
        matchedRule: matchedRuleName,
        ruleKey: CONFIG.values.ruleKeyVideoSubmission,
        baseXp,
        awardStatusWritten: CONFIG.values.awardStatusPending,
        readyForXpAutomationWritten: true,
        reviewedBy: reviewedByWritten ? CONFIG.values.reviewedByName : reviewedByCurrent,
        reviewedAt: reviewedAtWritten ? nowIso : String(reviewedAtCurrent || ""),
        reviewedAtWritten,
        reviewedByWritten,
        updateFieldsWritten: Object.keys(updateFields),
    });
}

try {
    await main();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
        output.set("statusOut", "error");
        output.set("actionOut", "error");
        output.set("errorOut", message);
    } catch {
        // Ignore output errors.
    }

    console.log("113 failed", JSON.stringify({
        automation: "113 - Video Review and XP - Assign Base Video XP",
        version: "v6.2",
        statusOut: "error",
        actionOut: "error",
        errorOut: message,
    }, null, 2));

    throw error;
}
