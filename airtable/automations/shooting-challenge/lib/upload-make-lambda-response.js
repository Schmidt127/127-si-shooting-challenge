/**
 * Pure helpers for 070b/070c — validate Make-returned Lambda JSON and async Accepted handoff.
 * Keep in sync with copies embedded in 070b and 070c automation scripts.
 * Tests: lib/upload-make-lambda-response.test.js
 */

/** @typedef {{ verified: boolean, actionOut: string, lambdaActionOut?: string, statusOut?: string, message: string, allPass?: boolean }} HandoffEvaluation */

/** @typedef {{ verified: boolean, checks: Record<string, boolean>, message: string }} WritebackEvaluation */

const VERIFIED_SUCCESS_ACTIONS = new Set(["uploaded", "skipped_already_uploaded"]);

const EXPLICIT_FAILURE_ACTIONS = new Set([
    "error_claim_conflict",
    "skipped_concurrent_upload",
    "stale_claim",
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
function selectName(value) {
    if (value == null || value === "") return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "object" && value !== null && "name" in value) {
        return String(/** @type {{ name: unknown }} */ (value).name).trim();
    }
    return String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function nonemptyText(value) {
    return Boolean(selectName(value));
}

/**
 * @param {string} responseText
 * @returns {boolean}
 */
function isMakeAcceptedAsyncResponse(responseText) {
    return selectName(responseText).toLowerCase() === "accepted";
}

/**
 * @param {string} responseText
 * @returns {{ ok: true, body: Record<string, unknown> } | { ok: false, reason: string, message: string }}
 */
function parseLambdaResponseBody(responseText) {
    const raw = String(responseText ?? "").trim();
    if (!raw) {
        return {
            ok: false,
            reason: "blank_body",
            message: "Make response body is empty.",
        };
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        return {
            ok: false,
            reason: "malformed_json",
            message: `Make response is not valid JSON: ${error?.message || error}`,
        };
    }

    if (!parsed || typeof parsed !== "object") {
        return {
            ok: false,
            reason: "invalid_shape",
            message: "Make response JSON is not an object.",
        };
    }

    if ("body" in parsed) {
        const inner = parsed.body;
        if (typeof inner === "string") {
            const trimmed = inner.trim();
            if (!trimmed) {
                return {
                    ok: false,
                    reason: "blank_inner_body",
                    message: "Lambda response wrapper has an empty body.",
                };
            }
            try {
                parsed = JSON.parse(trimmed);
            } catch (error) {
                return {
                    ok: false,
                    reason: "malformed_inner_json",
                    message: `Lambda response inner body is not valid JSON: ${error?.message || error}`,
                };
            }
        } else if (inner && typeof inner === "object") {
            parsed = inner;
        }
    }

    if (!parsed || typeof parsed !== "object") {
        return {
            ok: false,
            reason: "invalid_inner_shape",
            message: "Lambda response body is not an object.",
        };
    }

    return { ok: true, body: parsed };
}

/**
 * @param {Record<string, unknown>} body
 * @returns {HandoffEvaluation}
 */
function evaluateLambdaHandoffResult(body) {
    const actionOut = String(body.actionOut ?? "").trim();
    const statusOut = String(body.statusOut ?? "").trim();
    const errorOut = String(body.errorOut ?? "").trim();
    const allPass = body.writebackVerification?.allPass === true;

    if (!actionOut) {
        return {
            verified: false,
            actionOut: "error_lambda_response_unverified",
            message:
                "Make returned HTTP 2xx but no Lambda actionOut was present (generic acknowledgement or incomplete path).",
        };
    }

    if (actionOut === "uploaded") {
        if (allPass) {
            return {
                verified: true,
                actionOut: "lambda_upload_verified",
                lambdaActionOut: actionOut,
                statusOut,
                allPass: true,
                message: "Lambda upload verified (uploaded, allPass=true).",
            };
        }
        return {
            verified: false,
            actionOut: "error_lambda_writeback_incomplete",
            lambdaActionOut: actionOut,
            statusOut,
            allPass: false,
            message: "Lambda returned uploaded but writebackVerification.allPass is not true.",
        };
    }

    if (actionOut === "skipped_already_uploaded") {
        return {
            verified: true,
            actionOut: "lambda_upload_verified",
            lambdaActionOut: actionOut,
            statusOut,
            message: "Lambda idempotent skip verified (skipped_already_uploaded).",
        };
    }

    if (EXPLICIT_FAILURE_ACTIONS.has(actionOut)) {
        return {
            verified: false,
            actionOut: `error_lambda_${actionOut}`,
            lambdaActionOut: actionOut,
            statusOut,
            message: errorOut || `Lambda returned non-success actionOut=${actionOut}.`,
        };
    }

    if (statusOut === "error" || actionOut.startsWith("error_")) {
        return {
            verified: false,
            actionOut: "error_lambda_upload_failed",
            lambdaActionOut: actionOut,
            statusOut,
            message: errorOut || `Lambda upload failed (${actionOut}).`,
        };
    }

    if (!VERIFIED_SUCCESS_ACTIONS.has(actionOut)) {
        return {
            verified: false,
            actionOut: "error_lambda_response_unrecognized",
            lambdaActionOut: actionOut,
            statusOut,
            message: `Unrecognized Lambda actionOut=${actionOut}.`,
        };
    }

    return {
        verified: false,
        actionOut: "error_lambda_response_unrecognized",
        lambdaActionOut: actionOut,
        statusOut,
        message: `Lambda actionOut=${actionOut} is not an approved handoff success.`,
    };
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {WritebackEvaluation}
 */
function evaluateSubmissionAssetWriteback(fields) {
    const uploadStatus = selectName(fields["Upload Status"]);
    const uploadError = selectName(fields["Upload Error"]);
    const writebackComplete = fields["Writeback Complete?"];
    const writebackCompleteOk =
        writebackComplete === 1 || writebackComplete === true || writebackComplete === "1";

    const checks = {
        uploadStatusUploaded: uploadStatus === "Uploaded",
        canonicalUrlPopulated: nonemptyText(fields["Canonical File URL"]),
        storageKeyPopulated: nonemptyText(fields["Storage Key"]),
        fileContentHashPopulated: nonemptyText(fields["File Content Hash"]),
        fileHashAlgorithmSha256: selectName(fields["File Hash Algorithm"]) === "SHA-256",
        uploadedAtPopulated: fields["Uploaded At"] != null && fields["Uploaded At"] !== "",
        uploadErrorBlank: !uploadError,
        writebackCompleteFormula: writebackCompleteOk,
    };

    const verified = Object.values(checks).every(Boolean);
    return {
        verified,
        checks,
        message: verified
            ? "Submission Asset async writeback verified."
            : "Submission Asset async writeback incomplete.",
    };
}

/**
 * 070c verification — requires Send to Make Trigger still checked before clearing.
 * @param {Record<string, unknown>} fields
 * @returns {WritebackEvaluation & { checks: Record<string, boolean> }}
 */
function evaluate070cAsyncWritebackVerification(fields) {
    const writeback = evaluateSubmissionAssetWriteback(fields);
    const sendToMakeTriggerChecked = fields["Send to Make Trigger"] === true;
    const checks = {
        ...writeback.checks,
        sendToMakeTriggerChecked,
    };
    const verified = writeback.verified && sendToMakeTriggerChecked;
    return {
        verified,
        checks,
        message: verified
            ? "Async upload writeback verified; Send to Make Trigger may be cleared."
            : sendToMakeTriggerChecked
              ? writeback.message
              : "Send to Make Trigger is not checked; async verification skipped.",
    };
}

/**
 * @param {Record<string, unknown>} [extra]
 * @returns {Record<string, unknown>}
 */
function buildAcceptedAsyncHandoffResult(extra = {}) {
    return {
        pending: true,
        ok: true,
        skipped: false,
        statusOut: "pending",
        actionOut: "lambda_upload_accepted_async",
        makeResponseMode: "accepted_async",
        errorOut: "",
        message:
            "Make returned Accepted; Lambda continues asynchronously. Automation 070c verifies writeback and clears Send to Make Trigger.",
        ...extra,
    };
}

/**
 * @param {string} responseText
 * @returns {{ mode: "accepted_async", handoff: ReturnType<typeof buildAcceptedAsyncHandoffResult> } | { mode: "invalid", parse: ReturnType<typeof parseLambdaResponseBody> } | { mode: "lambda_json", parse: { ok: true, body: Record<string, unknown> }, evaluation: HandoffEvaluation }}
 */
function resolveMakeHttpResponse(responseText) {
    if (isMakeAcceptedAsyncResponse(responseText)) {
        return { mode: "accepted_async", handoff: buildAcceptedAsyncHandoffResult() };
    }

    const parse = parseLambdaResponseBody(responseText);
    if (!parse.ok) {
        return { mode: "invalid", parse };
    }

    return {
        mode: "lambda_json",
        parse,
        evaluation: evaluateLambdaHandoffResult(parse.body),
    };
}

/**
 * Pure 070c decision — whether to clear Send to Make Trigger.
 * @param {Record<string, unknown>} fields
 * @returns {{ shouldClearTrigger: boolean, result: ReturnType<typeof evaluate070cAsyncWritebackVerification> }}
 */
function decide070cTriggerClear(fields) {
    const result = evaluate070cAsyncWritebackVerification(fields);
    return {
        shouldClearTrigger: result.verified,
        result,
    };
}

/**
 * @param {string} responseText
 * @returns {{ parse: ReturnType<typeof parseLambdaResponseBody>, evaluation?: HandoffEvaluation }}
 */
function evaluateMakeLambdaResponseText(responseText) {
    const resolved = resolveMakeHttpResponse(responseText);
    if (resolved.mode === "accepted_async") {
        return {
            parse: { ok: false, reason: "accepted_async", message: "Make returned Accepted async acknowledgement." },
        };
    }
    if (resolved.mode === "invalid") {
        return { parse: resolved.parse };
    }
    return {
        parse: resolved.parse,
        evaluation: resolved.evaluation,
    };
}

module.exports = {
    parseLambdaResponseBody,
    evaluateLambdaHandoffResult,
    evaluateMakeLambdaResponseText,
    evaluateSubmissionAssetWriteback,
    evaluate070cAsyncWritebackVerification,
    buildAcceptedAsyncHandoffResult,
    decide070cTriggerClear,
    isMakeAcceptedAsyncResponse,
    resolveMakeHttpResponse,
    selectName,
    VERIFIED_SUCCESS_ACTIONS,
    EXPLICIT_FAILURE_ACTIONS,
};
