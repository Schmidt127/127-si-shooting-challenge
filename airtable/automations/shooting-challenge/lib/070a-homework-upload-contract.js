/**
 * Pure 070a homework upload contract helpers (test harness / Worker-C).
 *
 * Mirrors proven 070b v4.4 + 070c v1.1 upload-response and writeback patterns for
 * routeKey=homework_completion. Intentionally independent of Airtable runtime so
 * unit/regression tests can run without Worker A/B deliveries.
 *
 * Expected alignment (stubs until worker-results appear):
 * - Worker A: overnight 070a automation script → same payload + Accepted async handoff
 * - Worker B: DEV Make/Lambda homework route → same Lambda actionOut / writeback fields
 *
 * Reuses shared validators from ./upload-make-lambda-response.js
 */

const {
    evaluateLambdaHandoffResult,
    evaluateMakeLambdaResponseText,
    evaluateSubmissionAssetWriteback,
    decide070cAction,
    resolveMakeHttpResponse,
    buildAcceptedAsyncHandoffResult,
    selectName,
} = require("./upload-make-lambda-response");

/** Canonical 070a homework route contract (stub until Worker A publishes). */
const HOMEWORK_ROUTE = Object.freeze({
    automationNumber: "070a",
    uploadDestination: "Homework Completions",
    routeKey: "homework_completion",
    targetTable: "Homework Completions",
    targetLinkField: "Homework Completions",
    sourceName: "Airtable Upload Engine",
    sourceTable: "Submission Assets",
});

/** Expected Worker A script version once aligned with 070b async pattern. */
const EXPECTED_070A_ASYNC_VERSION = "v4.4";

/**
 * @param {string} uploadDestination
 * @returns {typeof HOMEWORK_ROUTE | null}
 */
function resolveHomeworkRoute(uploadDestination) {
    const normalized = selectName(uploadDestination).toLowerCase().replace(/\s+/g, " ");
    if (normalized === HOMEWORK_ROUTE.uploadDestination.toLowerCase()) {
        return { ...HOMEWORK_ROUTE };
    }
    return null;
}

/**
 * Build minimal Make webhook payload for 070a (same shape as 070b video path).
 * @param {{
 *   submissionAssetRecordId: string,
 *   targetRecordId: string,
 *   sentAtIso?: string,
 *   automationNumber?: string,
 * }} input
 */
function build070aWebhookPayload(input) {
    const submissionAssetRecordId = String(input.submissionAssetRecordId || "").trim();
    const targetRecordId = String(input.targetRecordId || "").trim();
    const automationNumber = String(input.automationNumber || HOMEWORK_ROUTE.automationNumber).trim();
    const sentAtIso = input.sentAtIso || new Date().toISOString();

    if (!submissionAssetRecordId.startsWith("rec")) {
        throw new Error(`Invalid submissionAssetRecordId: ${submissionAssetRecordId}`);
    }
    if (targetRecordId && !targetRecordId.startsWith("rec")) {
        throw new Error(`Invalid targetRecordId: ${targetRecordId}`);
    }
    if (automationNumber !== "070a") {
        throw new Error(`070a payload requires automationNumber=070a, got ${automationNumber}`);
    }

    return {
        sourceName: HOMEWORK_ROUTE.sourceName,
        automationNumber: "070a",
        sentAtIso,
        routeKey: HOMEWORK_ROUTE.routeKey,
        uploadDestination: HOMEWORK_ROUTE.uploadDestination,
        sourceTable: HOMEWORK_ROUTE.sourceTable,
        submissionAssetRecordId,
        targetTable: HOMEWORK_ROUTE.targetTable,
        targetRecordId,
    };
}

/**
 * Prep-gate checks for a homework Submission Asset (DEV smoke / unit fixtures).
 * Mirrors c013_dev_070b_prep_check.js semantics for Homework Completions.
 * @param {Record<string, unknown>} fields
 */
function evaluate070aPrepChecks(fields) {
    const uploadStatus = selectName(fields["Upload Status"]);
    const uploadDest = selectName(fields["Upload Destination"]);
    const ready = selectName(fields["Ready to Send to Make?"]);
    const sendTrigger = fields["Send to Make Trigger"] === true;
    const attachment = fields["Airtable Attachment"] || [];
    const hw = fields["Homework Completions"] || [];
    const enrollment = fields["Enrollment - Linked"] || [];
    const submission = fields["Submission - Linked"] || [];
    const canonical = selectName(fields["Canonical File URL"]);
    const driveUrl = selectName(fields["Google Drive File URL"]);
    const driveId = selectName(fields["Google Drive File ID"]);
    const storageKey = selectName(fields["Storage Key"]);

    const checks = {
        uploadStatusPendingLink: uploadStatus === "Pending Link",
        uploadDestinationHomework: uploadDest === HOMEWORK_ROUTE.uploadDestination,
        readyToSendMake: ready === "READY_TO_SEND" || ready === "",
        sendToMakeTriggerChecked: sendTrigger,
        attachmentPresent: Array.isArray(attachment) && attachment.length > 0,
        homeworkCompletionLinked: Array.isArray(hw) && hw.length > 0,
        enrollmentLinked: Array.isArray(enrollment) && enrollment.length > 0,
        submissionLinked: Array.isArray(submission) && submission.length > 0,
        canonicalUrlBlank: !canonical,
        driveUrlBlank: !driveUrl,
        driveIdBlank: !driveId,
        storageKeyBlank: !storageKey,
    };

    return {
        checks,
        allPass: Object.values(checks).every(Boolean),
        route: HOMEWORK_ROUTE,
    };
}

/**
 * Safety-gate decisions before webhook POST (pure mirror of 070a/070b script gates).
 * @param {Record<string, unknown>} fields
 * @param {string} [automationNumber]
 */
function evaluate070aSafetyGates(fields, automationNumber = "070a") {
    if (automationNumber !== "070a") {
        return {
            statusOut: "error",
            actionOut: "error_invalid_automation_number",
            message: `Expected automationNumber 070a, got ${automationNumber}`,
        };
    }

    const route = resolveHomeworkRoute(fields["Upload Destination"]);
    if (!route) {
        return {
            statusOut: "error",
            actionOut: "error_unsupported_destination",
            message: "Unsupported Upload Destination for 070a.",
        };
    }

    const driveUrl = selectName(fields["Google Drive File URL"]);
    const driveId = selectName(fields["Google Drive File ID"]);
    if (driveUrl || driveId) {
        return {
            statusOut: "skipped",
            actionOut: "skipped_already_uploaded",
            message: "Duplicate upload blocked — Drive file already present.",
            route,
        };
    }

    const submission = fields["Submission - Linked"] || [];
    if (!Array.isArray(submission) || submission.length === 0) {
        return {
            statusOut: "error",
            actionOut: "error_missing_submission",
            message: "Missing Submission - Linked.",
            route,
        };
    }

    const enrollment = fields["Enrollment - Linked"] || [];
    if (!Array.isArray(enrollment) || enrollment.length === 0) {
        return {
            statusOut: "error",
            actionOut: "error_missing_enrollment",
            message: "Missing Enrollment - Linked.",
            route,
        };
    }

    const hw = fields["Homework Completions"] || [];
    const targetRecordId = Array.isArray(hw) && hw[0] ? String(hw[0]) : "";
    if (!targetRecordId) {
        return {
            statusOut: "skipped",
            actionOut: "skipped_pending_link",
            message: "Missing target Homework Completions link.",
            route,
            targetRecordId: "",
        };
    }

    const attachments = fields["Airtable Attachment"] || [];
    if (!Array.isArray(attachments) || attachments.length === 0) {
        return {
            statusOut: "error",
            actionOut: "error_missing_attachment",
            message: "Missing Airtable Attachment.",
            route,
            targetRecordId,
        };
    }

    return {
        statusOut: "ready",
        actionOut: "ready_to_send",
        message: "070a safety gates passed.",
        route,
        targetRecordId,
    };
}

/**
 * Evaluate Make/Lambda handoff for homework path (same validators as 070b).
 * @param {string} responseText
 */
function evaluate070aMakeHandoff(responseText) {
    const resolved = resolveMakeHttpResponse(responseText);
    if (resolved.mode === "accepted_async") {
        return {
            mode: "accepted_async",
            verified: false,
            pending: true,
            statusOut: "pending",
            actionOut: "lambda_upload_accepted_async",
            handoff: resolved.handoff,
            message: "Make Accepted async — 070c (or homework companion) verifies writeback.",
        };
    }
    if (resolved.mode === "invalid") {
        return {
            mode: "invalid",
            verified: false,
            pending: false,
            statusOut: "error",
            actionOut: "error_lambda_response_unverified",
            parse: resolved.parse,
            message: resolved.parse.message,
        };
    }
    const evaluation = resolved.evaluation;
    return {
        mode: "lambda_json",
        verified: evaluation.verified === true,
        pending: false,
        statusOut: evaluation.verified ? "success" : "error",
        actionOut: evaluation.actionOut,
        lambdaActionOut: evaluation.lambdaActionOut,
        evaluation,
        message: evaluation.message,
    };
}

/**
 * Homework writeback verification — identical field contract to video path.
 * @param {Record<string, unknown>} fields
 */
function evaluate070aWriteback(fields) {
    return evaluateSubmissionAssetWriteback(fields);
}

/**
 * Async companion decision (070c pattern) for homework writeback + trigger clear.
 * @param {Record<string, unknown>} fields
 */
function decide070aAsyncCompanionAction(fields) {
    return decide070cAction(fields);
}

/**
 * Stub contract published until Worker A/B result files exist.
 * Tests assert against this; overnight lead replaces stubs when contracts land.
 */
function get070aContractStub() {
    return {
        source: "worker-c-stub",
        workerAResultFile: "docs/overnight-runs/worker-results/worker-a-t1-070a-airtable.md",
        workerBResultFile: "docs/overnight-runs/worker-results/worker-b-t2-070a-backend.md",
        expectedScriptVersion: EXPECTED_070A_ASYNC_VERSION,
        route: HOMEWORK_ROUTE,
        payloadKeys: [
            "sourceName",
            "automationNumber",
            "sentAtIso",
            "routeKey",
            "uploadDestination",
            "sourceTable",
            "submissionAssetRecordId",
            "targetTable",
            "targetRecordId",
        ],
        verifiedSuccessActions: ["uploaded", "skipped_already_uploaded"],
        asyncAcceptedBody: "Accepted",
        writebackRequiredFields: [
            "Upload Status",
            "Canonical File URL",
            "Storage Key",
            "File Content Hash",
            "File Hash Algorithm",
            "Uploaded At",
        ],
        notes:
            "Scaffolded with mocks. Update when Worker A (script) and Worker B (Make/Lambda) publish result files.",
    };
}

module.exports = {
    HOMEWORK_ROUTE,
    EXPECTED_070A_ASYNC_VERSION,
    resolveHomeworkRoute,
    build070aWebhookPayload,
    evaluate070aPrepChecks,
    evaluate070aSafetyGates,
    evaluate070aMakeHandoff,
    evaluate070aWriteback,
    decide070aAsyncCompanionAction,
    get070aContractStub,
    // re-exports for smoke/test convenience
    evaluateLambdaHandoffResult,
    evaluateMakeLambdaResponseText,
    buildAcceptedAsyncHandoffResult,
};
