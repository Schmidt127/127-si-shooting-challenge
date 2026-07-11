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
    evaluateSubmissionAssetWriteback,
    isMakeAcceptedAsyncResponse,
    pollForLambdaWriteback,
    resolveMakeHttpResponse,
} = require("./upload-make-lambda-response");

function test(name, fn) {
    try {
        const result = fn();
        if (result && typeof result.then === "function") {
            return result
                .then(() => console.log(`ok - ${name}`))
                .catch((error) => {
                    console.error(`FAIL - ${name}`);
                    throw error;
                });
        }
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

function passingWritebackFields(overrides = {}) {
    return {
        "Upload Status": "Uploaded",
        "Canonical File URL": "https://example.com/x.png",
        "Storage Key": "shooting-challenge/x.png",
        "File Content Hash": "a".repeat(64),
        "File Hash Algorithm": "SHA-256",
        "Uploaded At": "2026-07-11T18:00:00.000Z",
        "Upload Error": "",
        "Writeback Complete?": 1,
        ...overrides,
    };
}

const tests = [];

tests.push(
    test("1 HTTP 200 + valid uploaded body", () => {
        const { evaluation } = evaluateMakeLambdaResponseText(JSON.stringify(uploadedOk));
        assert.strictEqual(evaluation.verified, true);
        assert.strictEqual(evaluation.lambdaActionOut, "uploaded");
    }),
);

tests.push(
    test("2 HTTP 200 + skipped_already_uploaded", () => {
        const { evaluation } = evaluateMakeLambdaResponseText(JSON.stringify(skippedOk));
        assert.strictEqual(evaluation.verified, true);
        assert.strictEqual(evaluation.lambdaActionOut, "skipped_already_uploaded");
    }),
);

tests.push(
    test("3 HTTP 200 + blank body", () => {
        const parsed = parseLambdaResponseBody("");
        assert.strictEqual(parsed.ok, false);
        assert.strictEqual(parsed.reason, "blank_body");
    }),
);

tests.push(
    test("4 HTTP 200 + malformed JSON", () => {
        const parsed = parseLambdaResponseBody("{not json");
        assert.strictEqual(parsed.ok, false);
        assert.strictEqual(parsed.reason, "malformed_json");
    }),
);

tests.push(
    test("5 HTTP 200 + Make Accepted async acknowledgement", () => {
        assert.strictEqual(isMakeAcceptedAsyncResponse("Accepted"), true);
        assert.strictEqual(isMakeAcceptedAsyncResponse("  ACCEPTED  "), true);
        const resolved = resolveMakeHttpResponse("Accepted");
        assert.strictEqual(resolved.mode, "accepted_async");
    }),
);

tests.push(
    test("5b invalid non-JSON other than Accepted still fails", () => {
        const resolved = resolveMakeHttpResponse("OK");
        assert.strictEqual(resolved.mode, "invalid");
        assert.strictEqual(resolved.parse.reason, "malformed_json");
    }),
);

tests.push(
    test("6 HTTP 200 + allPass false", () => {
        const body = { ...uploadedOk, writebackVerification: { allPass: false } };
        const evaluation = evaluateLambdaHandoffResult(body);
        assert.strictEqual(evaluation.verified, false);
        assert.strictEqual(evaluation.actionOut, "error_lambda_writeback_incomplete");
    }),
);

tests.push(
    test("7 Lambda error response", () => {
        const evaluation = evaluateLambdaHandoffResult({
            ok: false,
            statusOut: "error",
            actionOut: "error_internal",
            errorOut: "boom",
        });
        assert.strictEqual(evaluation.verified, false);
        assert.strictEqual(evaluation.actionOut, "error_lambda_upload_failed");
    }),
);

tests.push(
    test("8 skipped_concurrent_upload", () => {
        const evaluation = evaluateLambdaHandoffResult({
            statusOut: "skipped",
            actionOut: "skipped_concurrent_upload",
        });
        assert.strictEqual(evaluation.verified, false);
        assert.strictEqual(evaluation.actionOut, "error_lambda_skipped_concurrent_upload");
    }),
);

tests.push(
    test("9 stale_claim", () => {
        const evaluation = evaluateLambdaHandoffResult({
            statusOut: "skipped",
            actionOut: "stale_claim",
        });
        assert.strictEqual(evaluation.verified, false);
        assert.strictEqual(evaluation.actionOut, "error_lambda_stale_claim");
    }),
);

tests.push(
    test("10 wrapped Lambda proxy body", () => {
        const wrapped = {
            statusCode: 200,
            body: JSON.stringify(uploadedOk),
        };
        const { evaluation } = evaluateMakeLambdaResponseText(JSON.stringify(wrapped));
        assert.strictEqual(evaluation.verified, true);
    }),
);

tests.push(
    test("11 Accepted followed by successful Airtable writeback", async () => {
        let calls = 0;
        const result = await pollForLambdaWriteback({
            loadFields: async () => {
                calls += 1;
                if (calls === 1) {
                    return { "Upload Status": "Processing" };
                }
                return passingWritebackFields();
            },
            sleep: async () => {},
            sleepMs: 1,
            timeoutMs: 5000,
        });
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.evaluation.verified, true);
        assert.ok(result.attempts >= 2);
    }),
);

tests.push(
    test("12 Accepted followed by Upload Status = Error", async () => {
        const result = await pollForLambdaWriteback({
            loadFields: async () =>
                passingWritebackFields({
                    "Upload Status": "Error",
                    "Upload Error": "Lambda upload failed in async path.",
                }),
            sleep: async () => {},
            sleepMs: 1,
            timeoutMs: 5000,
        });
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.error, true);
        assert.strictEqual(result.uploadError, "Lambda upload failed in async path.");
    }),
);

tests.push(
    test("13 Accepted timeout", async () => {
        const result = await pollForLambdaWriteback({
            loadFields: async () => ({ "Upload Status": "Processing" }),
            sleep: async () => {},
            sleepMs: 10,
            timeoutMs: 25,
            now: (() => {
                let t = 0;
                return () => {
                    t += 10;
                    return t;
                };
            })(),
        });
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.timedOut, true);
    }),
);

tests.push(
    test("14 writeback evaluation requires all fields", () => {
        const incomplete = evaluateSubmissionAssetWriteback(
            passingWritebackFields({ "File Hash Algorithm": "" }),
        );
        assert.strictEqual(incomplete.verified, false);
        assert.strictEqual(incomplete.checks.fileHashAlgorithmSha256, false);

        const complete = evaluateSubmissionAssetWriteback(passingWritebackFields());
        assert.strictEqual(complete.verified, true);
    }),
);

Promise.all(tests).then(() => {
    console.log(`\nAll ${14} upload-make-lambda-response tests passed.`);
});
