#!/usr/bin/env node
/**
 * Local tests for 070b Option A Lambda response validation (no Make/Lambda).
 * Run: node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
 */

const assert = require("assert");
const {
    parseLambdaResponseBody,
    evaluateLambdaHandoffResult,
    evaluateMakeLambdaResponseText,
} = require("./upload-make-lambda-response");

function test(name, fn) {
    try {
        fn();
        console.log(`ok - ${name}`);
    } catch (error) {
        console.error(`FAIL - ${name}`);
        throw error;
    }
}

const uploadedOk = {
    ok: true,
    statusOut: "success",
    actionOut: "uploaded",
    writebackVerification: { allPass: true },
};

const skippedOk = {
    ok: true,
    statusOut: "skipped",
    actionOut: "skipped_already_uploaded",
};

test("1 HTTP 200 + valid uploaded body", () => {
    const { evaluation } = evaluateMakeLambdaResponseText(JSON.stringify(uploadedOk));
    assert.strictEqual(evaluation.verified, true);
    assert.strictEqual(evaluation.lambdaActionOut, "uploaded");
});

test("2 HTTP 200 + skipped_already_uploaded", () => {
    const { evaluation } = evaluateMakeLambdaResponseText(JSON.stringify(skippedOk));
    assert.strictEqual(evaluation.verified, true);
    assert.strictEqual(evaluation.lambdaActionOut, "skipped_already_uploaded");
});

test("3 HTTP 200 + blank body", () => {
    const parsed = parseLambdaResponseBody("");
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(parsed.reason, "blank_body");
});

test("4 HTTP 200 + malformed JSON", () => {
    const parsed = parseLambdaResponseBody("{not json");
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(parsed.reason, "malformed_json");
});

test("5 HTTP 200 + Make-only acknowledgement", () => {
    const result = evaluateMakeLambdaResponseText("Accepted");
    assert.strictEqual(result.parse.ok, false);
    assert.strictEqual(result.parse.reason, "malformed_json");
});

test("6 HTTP 200 + allPass false", () => {
    const body = { ...uploadedOk, writebackVerification: { allPass: false } };
    const evaluation = evaluateLambdaHandoffResult(body);
    assert.strictEqual(evaluation.verified, false);
    assert.strictEqual(evaluation.actionOut, "error_lambda_writeback_incomplete");
});

test("7 Lambda error response", () => {
    const evaluation = evaluateLambdaHandoffResult({
        ok: false,
        statusOut: "error",
        actionOut: "error_internal",
        errorOut: "boom",
    });
    assert.strictEqual(evaluation.verified, false);
    assert.strictEqual(evaluation.actionOut, "error_lambda_upload_failed");
});

test("8 skipped_concurrent_upload", () => {
    const evaluation = evaluateLambdaHandoffResult({
        statusOut: "skipped",
        actionOut: "skipped_concurrent_upload",
    });
    assert.strictEqual(evaluation.verified, false);
    assert.strictEqual(evaluation.actionOut, "error_lambda_skipped_concurrent_upload");
});

test("9 stale_claim", () => {
    const evaluation = evaluateLambdaHandoffResult({
        statusOut: "skipped",
        actionOut: "stale_claim",
    });
    assert.strictEqual(evaluation.verified, false);
    assert.strictEqual(evaluation.actionOut, "error_lambda_stale_claim");
});

test("10 wrapped Lambda proxy body", () => {
    const wrapped = {
        statusCode: 200,
        body: JSON.stringify(uploadedOk),
    };
    const { evaluation } = evaluateMakeLambdaResponseText(JSON.stringify(wrapped));
    assert.strictEqual(evaluation.verified, true);
});

console.log(`\nAll ${10} upload-make-lambda-response tests passed.`);
