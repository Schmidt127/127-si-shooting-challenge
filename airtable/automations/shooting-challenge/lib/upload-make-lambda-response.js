/**
 * Pure helpers for 070b Option A — validate Make-returned Lambda JSON.
 * Keep in sync with the copy embedded in 070b automation script.
 * Tests: lib/upload-make-lambda-response.test.js
 */

/** @typedef {{ verified: boolean, actionOut: string, lambdaActionOut?: string, statusOut?: string, message: string, allPass?: boolean }} HandoffEvaluation */

const VERIFIED_SUCCESS_ACTIONS = new Set(["uploaded", "skipped_already_uploaded"]);

const EXPLICIT_FAILURE_ACTIONS = new Set([
    "error_claim_conflict",
    "skipped_concurrent_upload",
    "stale_claim",
]);

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

    // Lambda Function URL / API Gateway proxy envelope
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
 * @param {string} responseText
 * @returns {{ parse: ReturnType<typeof parseLambdaResponseBody>, evaluation?: HandoffEvaluation }}
 */
function evaluateMakeLambdaResponseText(responseText) {
    const parse = parseLambdaResponseBody(responseText);
    if (!parse.ok) {
        return { parse };
    }
    return {
        parse,
        evaluation: evaluateLambdaHandoffResult(parse.body),
    };
}

module.exports = {
    parseLambdaResponseBody,
    evaluateLambdaHandoffResult,
    evaluateMakeLambdaResponseText,
    VERIFIED_SUCCESS_ACTIONS,
    EXPLICIT_FAILURE_ACTIONS,
};
