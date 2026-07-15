#!/usr/bin/env node
/**
 * Local tests for 070b/070c Make Lambda response validation (no Make/Lambda/Airtable).
 * Run: node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
    parseLambdaResponseBody,
    evaluateLambdaHandoffResult,
    evaluateMakeLambdaResponseText,
    evaluateSubmissionAssetWriteback,
    evaluate070cAsyncWritebackVerification,
    buildAcceptedAsyncHandoffResult,
    decide070cAction,
    decide070cTriggerClear,
    isMakeAcceptedAsyncResponse,
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
        "Send to Make Trigger": true,
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
    test("5 HTTP 200 + Make Accepted returns pending without polling", () => {
        assert.strictEqual(isMakeAcceptedAsyncResponse("Accepted"), true);
        assert.strictEqual(isMakeAcceptedAsyncResponse("  ACCEPTED  "), true);

        const resolved = resolveMakeHttpResponse("Accepted");
        assert.strictEqual(resolved.mode, "accepted_async");
        assert.strictEqual(resolved.handoff.statusOut, "pending");
        assert.strictEqual(resolved.handoff.actionOut, "lambda_upload_accepted_async");
        assert.strictEqual(resolved.handoff.makeResponseMode, "accepted_async");
        assert.strictEqual(resolved.handoff.pending, true);

        const handoff = buildAcceptedAsyncHandoffResult();
        assert.strictEqual(handoff.statusOut, "pending");
        assert.strictEqual(handoff.actionOut, "lambda_upload_accepted_async");
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
    test("11 070b source has no setTimeout or pollForLambdaWriteback", () => {
        const scriptPath = path.join(
            __dirname,
            "..",
            "070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js",
        );
        const source = fs.readFileSync(scriptPath, "utf8");
        assert.ok(!/\bsetTimeout\s*\(/.test(source), "070b must not call setTimeout");
        assert.ok(
            !/\bpollForLambdaWritebackAsync\b/.test(source),
            "070b must not define pollForLambdaWritebackAsync",
        );
        assert.ok(source.includes('version: "v4.4"'), "070b version must be v4.4");
    }),
);

tests.push(
    test("11b 070a v4.4 parity with 070b async Accepted (no setTimeout)", () => {
        const scriptPath = path.join(
            __dirname,
            "..",
            "070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js",
        );
        const source = fs.readFileSync(scriptPath, "utf8");
        assert.ok(!/\bsetTimeout\s*\(/.test(source), "070a must not call setTimeout");
        assert.ok(
            !/\bpollForLambdaWritebackAsync\b/.test(source),
            "070a must not define pollForLambdaWritebackAsync",
        );
        assert.ok(source.includes('version: "v4.4"'), "070a version must be v4.4");
        assert.ok(source.includes("homework_completion"), "070a must route homework_completion");
        assert.ok(
            source.includes("lambda_upload_accepted_async"),
            "070a must handle Make Accepted async handoff",
        );
        assert.ok(
            source.includes("070c verifies writeback"),
            "070a Accepted path must defer writeback verify to 070c",
        );
    }),
);

tests.push(
    test("12 070c full writeback + trigger checked clears trigger", () => {
        const decision = decide070cAction(passingWritebackFields({ "Send to Make Trigger": true }));
        assert.strictEqual(decision.statusOut, "success");
        assert.strictEqual(decision.actionOut, "async_upload_verified_trigger_cleared");
        assert.strictEqual(decision.shouldClearTrigger, true);
        assert.strictEqual(decision.writebackVerified, true);

        const wrapped = decide070cTriggerClear(passingWritebackFields({ "Send to Make Trigger": true }));
        assert.strictEqual(wrapped.shouldClearTrigger, true);
    }),
);

tests.push(
    test("13 070c full writeback + trigger already unchecked is idempotent success", () => {
        const decision = decide070cAction(passingWritebackFields({ "Send to Make Trigger": false }));
        assert.strictEqual(decision.statusOut, "success");
        assert.strictEqual(decision.actionOut, "async_upload_already_verified");
        assert.strictEqual(decision.shouldClearTrigger, false);
        assert.strictEqual(decision.writebackVerified, true);
        assert.ok(decision.message.includes("already cleared"));

        const wrapped = decide070cTriggerClear(passingWritebackFields({ "Send to Make Trigger": false }));
        assert.strictEqual(wrapped.shouldClearTrigger, false);
        assert.strictEqual(wrapped.decision.actionOut, "async_upload_already_verified");
    }),
);

tests.push(
    test("14 070c incomplete writeback + trigger checked fails and retains trigger", () => {
        const decision = decide070cAction(
            passingWritebackFields({ "Storage Key": "", "Send to Make Trigger": true }),
        );
        assert.strictEqual(decision.statusOut, "error");
        assert.strictEqual(decision.actionOut, "async_writeback_verification_failed");
        assert.strictEqual(decision.shouldClearTrigger, false);
        assert.ok(decision.failedWritebackChecks.includes("storageKeyPopulated"));
        assert.ok(!decision.failedWritebackChecks.includes("sendToMakeTriggerChecked"));
    }),
);

tests.push(
    test("15 070c incomplete writeback + trigger unchecked fails on writeback only", () => {
        const decision = decide070cAction(
            passingWritebackFields({ "File Hash Algorithm": "", "Send to Make Trigger": false }),
        );
        assert.strictEqual(decision.statusOut, "error");
        assert.strictEqual(decision.actionOut, "async_writeback_verification_failed");
        assert.strictEqual(decision.shouldClearTrigger, false);
        assert.ok(decision.failedWritebackChecks.includes("fileHashAlgorithmSha256"));
        assert.strictEqual(decision.sendToMakeTriggerChecked, false);
    }),
);

tests.push(
    test("16 070c writeback-only helper excludes trigger from verification", () => {
        const evaluation = evaluate070cAsyncWritebackVerification(
            passingWritebackFields({ "Send to Make Trigger": false }),
        );
        assert.strictEqual(evaluation.verified, true);
        assert.strictEqual(evaluation.checks.sendToMakeTriggerChecked, undefined);
    }),
);

tests.push(
    test("17 writeback evaluation requires all fields", () => {
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
    console.log(`\nAll ${17} upload-make-lambda-response tests passed.`);
});
