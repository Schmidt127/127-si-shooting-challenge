#!/usr/bin/env node
/**
 * Unit + regression tests for 070a homework upload path (Worker-C / T7).
 *
 * Covers:
 * - Pure homework route/payload/safety contracts
 * - Mirrored 070b Make/Lambda response + writeback evaluation
 * - Async Accepted handoff (070c companion pattern)
 *
 * Run:
 *   node airtable/automations/shooting-challenge/lib/070a-homework-upload.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
    HOMEWORK_ROUTE,
    EXPECTED_070A_ASYNC_VERSION,
    resolveHomeworkRoute,
    build070aWebhookPayload,
    evaluate070aPrepChecks,
    evaluate070aSafetyGates,
    evaluate070aMakeHandoff,
    evaluate070aWriteback,
    decide070aAsyncCompanionAction,
    get070aContractManifest,
    get070aContractStub,
} = require("./070a-homework-upload-contract");

function test(name, fn) {
    try {
        fn();
        console.log(`ok - ${name}`);
        return true;
    } catch (error) {
        console.error(`FAIL - ${name}`);
        console.error(error);
        return false;
    }
}

function passingWritebackFields(overrides = {}) {
    return {
        "Send to Make Trigger": true,
        "Upload Status": "Uploaded",
        "Canonical File URL": "https://example.com/hw.png",
        "Storage Key": "shooting-challenge/2026-2027/homework/hw.png",
        "File Content Hash": "b".repeat(64),
        "File Hash Algorithm": "SHA-256",
        "Uploaded At": "2026-07-11T18:00:00.000Z",
        "Upload Error": "",
        "Writeback Complete?": 1,
        ...overrides,
    };
}

function readyHomeworkFields(overrides = {}) {
    return {
        "Upload Status": "Pending Link",
        "Upload Destination": "Homework Completions",
        "Ready to Send to Make?": "READY_TO_SEND",
        "Send to Make Trigger": true,
        "Airtable Attachment": [{ url: "https://example.com/hw.png", filename: "hw.png" }],
        "Homework Completions": ["recHcFixture01"],
        "Enrollment - Linked": ["recEnrollFixture01"],
        "Submission - Linked": ["recSubFixture01"],
        "Canonical File URL": "",
        "Google Drive File URL": "",
        "Google Drive File ID": "",
        "Storage Key": "",
        ...overrides,
    };
}

const results = [];

results.push(
    test("1 resolveHomeworkRoute accepts Homework Completions", () => {
        const route = resolveHomeworkRoute("Homework Completions");
        assert.ok(route);
        assert.strictEqual(route.routeKey, "homework_completion");
        assert.strictEqual(route.automationNumber, "070a");
        assert.strictEqual(resolveHomeworkRoute("Video Feedback"), null);
    }),
);

results.push(
    test("2 build070aWebhookPayload minimal canonical shape", () => {
        const payload = build070aWebhookPayload({
            submissionAssetRecordId: "recAssetHw01",
            targetRecordId: "recHc01",
            sentAtIso: "2026-07-11T22:00:00.000Z",
        });
        assert.deepStrictEqual(Object.keys(payload).sort(), [
            "automationNumber",
            "routeKey",
            "sentAtIso",
            "sourceName",
            "sourceTable",
            "submissionAssetRecordId",
            "targetRecordId",
            "targetTable",
            "uploadDestination",
        ].sort());
        assert.strictEqual(payload.automationNumber, "070a");
        assert.strictEqual(payload.routeKey, "homework_completion");
        assert.strictEqual(payload.uploadDestination, "Homework Completions");
        assert.strictEqual(payload.targetTable, "Homework Completions");
        assert.strictEqual(payload.sourceTable, "Submission Assets");
    }),
);

results.push(
    test("3 build070aWebhookPayload rejects non-070a automationNumber", () => {
        assert.throws(
            () =>
                build070aWebhookPayload({
                    submissionAssetRecordId: "recAssetHw01",
                    targetRecordId: "recHc01",
                    automationNumber: "070b",
                }),
            /automationNumber=070a/,
        );
    }),
);

results.push(
    test("4 evaluate070aPrepChecks allPass on ready fixture", () => {
        const prep = evaluate070aPrepChecks(readyHomeworkFields());
        assert.strictEqual(prep.allPass, true);
        assert.strictEqual(prep.checks.homeworkCompletionLinked, true);
        assert.strictEqual(prep.checks.uploadDestinationHomework, true);
    }),
);

results.push(
    test("5 evaluate070aPrepChecks fails without homework link", () => {
        const prep = evaluate070aPrepChecks(readyHomeworkFields({ "Homework Completions": [] }));
        assert.strictEqual(prep.allPass, false);
        assert.strictEqual(prep.checks.homeworkCompletionLinked, false);
    }),
);

results.push(
    test("6 evaluate070aSafetyGates ready_to_send", () => {
        const gate = evaluate070aSafetyGates(readyHomeworkFields());
        assert.strictEqual(gate.statusOut, "ready");
        assert.strictEqual(gate.actionOut, "ready_to_send");
        assert.strictEqual(gate.targetRecordId, "recHcFixture01");
    }),
);

results.push(
    test("7 evaluate070aSafetyGates skipped_pending_link", () => {
        const gate = evaluate070aSafetyGates(readyHomeworkFields({ "Homework Completions": [] }));
        assert.strictEqual(gate.statusOut, "skipped");
        assert.strictEqual(gate.actionOut, "skipped_pending_link");
    }),
);

results.push(
    test("8 evaluate070aSafetyGates skipped_already_uploaded on Drive URL", () => {
        const gate = evaluate070aSafetyGates(
            readyHomeworkFields({ "Google Drive File URL": "https://drive.google.com/x" }),
        );
        assert.strictEqual(gate.statusOut, "skipped");
        assert.strictEqual(gate.actionOut, "skipped_already_uploaded");
    }),
);

results.push(
    test("9 evaluate070aSafetyGates error_missing_attachment", () => {
        const gate = evaluate070aSafetyGates(readyHomeworkFields({ "Airtable Attachment": [] }));
        assert.strictEqual(gate.statusOut, "error");
        assert.strictEqual(gate.actionOut, "error_missing_attachment");
    }),
);

results.push(
    test("10 Make handoff uploaded + allPass mirrors 070b", () => {
        const body = {
            ok: true,
            statusOut: "success",
            actionOut: "uploaded",
            routeKey: "homework_completion",
            automationNumber: "070a",
            writebackVerification: { allPass: true },
        };
        const handoff = evaluate070aMakeHandoff(JSON.stringify(body));
        assert.strictEqual(handoff.mode, "lambda_json");
        assert.strictEqual(handoff.verified, true);
        assert.strictEqual(handoff.actionOut, "lambda_upload_verified");
        assert.strictEqual(handoff.lambdaActionOut, "uploaded");
    }),
);

results.push(
    test("11 Make handoff skipped_already_uploaded verified", () => {
        const handoff = evaluate070aMakeHandoff(
            JSON.stringify({
                ok: true,
                statusOut: "skipped",
                actionOut: "skipped_already_uploaded",
            }),
        );
        assert.strictEqual(handoff.verified, true);
        assert.strictEqual(handoff.lambdaActionOut, "skipped_already_uploaded");
    }),
);

results.push(
    test("12 Make Accepted async pending (070c companion pattern)", () => {
        const handoff = evaluate070aMakeHandoff("Accepted");
        assert.strictEqual(handoff.mode, "accepted_async");
        assert.strictEqual(handoff.pending, true);
        assert.strictEqual(handoff.actionOut, "lambda_upload_accepted_async");
        assert.strictEqual(handoff.statusOut, "pending");
    }),
);

results.push(
    test("13 Make handoff writeback incomplete fails", () => {
        const handoff = evaluate070aMakeHandoff(
            JSON.stringify({
                actionOut: "uploaded",
                statusOut: "success",
                writebackVerification: { allPass: false },
            }),
        );
        assert.strictEqual(handoff.verified, false);
        assert.strictEqual(handoff.actionOut, "error_lambda_writeback_incomplete");
    }),
);

results.push(
    test("14 Make handoff concurrent skip maps to error", () => {
        const handoff = evaluate070aMakeHandoff(
            JSON.stringify({
                statusOut: "skipped",
                actionOut: "skipped_concurrent_upload",
            }),
        );
        assert.strictEqual(handoff.verified, false);
        assert.strictEqual(handoff.actionOut, "error_lambda_skipped_concurrent_upload");
    }),
);

results.push(
    test("15 evaluate070aWriteback requires SHA-256 + storage fields", () => {
        const incomplete = evaluate070aWriteback(
            passingWritebackFields({ "File Hash Algorithm": "" }),
        );
        assert.strictEqual(incomplete.verified, false);
        assert.strictEqual(incomplete.checks.fileHashAlgorithmSha256, false);

        const complete = evaluate070aWriteback(passingWritebackFields());
        assert.strictEqual(complete.verified, true);
    }),
);

results.push(
    test("16 async companion clears trigger when writeback complete", () => {
        const decision = decide070aAsyncCompanionAction(
            passingWritebackFields({ "Send to Make Trigger": true }),
        );
        assert.strictEqual(decision.statusOut, "success");
        assert.strictEqual(decision.actionOut, "async_upload_verified_trigger_cleared");
        assert.strictEqual(decision.shouldClearTrigger, true);
    }),
);

results.push(
    test("17 async companion idempotent when trigger already cleared", () => {
        const decision = decide070aAsyncCompanionAction(
            passingWritebackFields({ "Send to Make Trigger": false }),
        );
        assert.strictEqual(decision.statusOut, "success");
        assert.strictEqual(decision.actionOut, "async_upload_already_verified");
        assert.strictEqual(decision.shouldClearTrigger, false);
    }),
);

results.push(
    test("18 contract manifest documents Worker A/B v4.4 alignment", () => {
        const manifest = get070aContractManifest();
        assert.strictEqual(manifest.expectedScriptVersion, EXPECTED_070A_ASYNC_VERSION);
        assert.strictEqual(manifest.expectedScriptVersion, "v4.4");
        assert.strictEqual(manifest.route.routeKey, HOMEWORK_ROUTE.routeKey);
        assert.ok(manifest.workerAResultFile.includes("worker-a-t1-070a-airtable"));
        assert.ok(manifest.workerBResultFile.includes("worker-b-t2-070a-backend"));
        assert.ok(manifest.payloadKeys.includes("routeKey"));
        assert.strictEqual(manifest.asyncHandoff.actionOut, "lambda_upload_accepted_async");
        assert.strictEqual(manifest.asyncHandoff.statusOut, "pending");
        assert.strictEqual(manifest.asyncHandoff.retainSendToMakeTrigger, true);
        assert.ok(manifest.syncSuccessActions.includes("uploaded"));
        assert.ok(manifest.syncFailureActions.includes("error_lambda_upload_failed"));
        assert.strictEqual(get070aContractStub().source, manifest.source);
    }),
);

results.push(
    test("19 regression: wrapped Lambda proxy body still verifies", () => {
        const wrapped = {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                statusOut: "success",
                actionOut: "uploaded",
                writebackVerification: { allPass: true },
            }),
        };
        const handoff = evaluate070aMakeHandoff(JSON.stringify(wrapped));
        assert.strictEqual(handoff.verified, true);
        assert.strictEqual(handoff.lambdaActionOut, "uploaded");
    }),
);

results.push(
    test("20 regression: 070a v4.4 script declares homework_completion + async handoff", () => {
        const scriptPath = path.join(
            __dirname,
            "..",
            "070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js",
        );
        const source = fs.readFileSync(scriptPath, "utf8");
        assert.ok(source.includes('routeKey: "homework_completion"'));
        assert.ok(source.includes('uploadDestination: "Homework Completions"'));
        assert.ok(source.includes("homework_completion"));
        assert.ok(!/\bsetTimeout\s*\(/.test(source), "070a must not call setTimeout");
        assert.ok(
            !/\bpollForLambdaWritebackAsync\b/.test(source),
            "070a must not define pollForLambdaWritebackAsync",
        );
        assert.ok(source.includes('version: "v4.4"'), "070a version must be v4.4");
        assert.ok(
            source.includes("lambda_upload_accepted_async"),
            "070a must handle Make Accepted async handoff",
        );
    }),
);

results.push(
    test("21 Make handoff Lambda upload failure retains error actionOut", () => {
        const handoff = evaluate070aMakeHandoff(
            JSON.stringify({
                ok: false,
                statusOut: "error",
                actionOut: "error_internal",
                errorOut: "boom",
            }),
        );
        assert.strictEqual(handoff.mode, "lambda_json");
        assert.strictEqual(handoff.verified, false);
        assert.strictEqual(handoff.actionOut, "error_lambda_upload_failed");
        assert.strictEqual(handoff.statusOut, "error");
    }),
);

results.push(
    test("22 Make handoff invalid non-JSON body fails verification", () => {
        const handoff = evaluate070aMakeHandoff("OK");
        assert.strictEqual(handoff.mode, "invalid");
        assert.strictEqual(handoff.verified, false);
        assert.strictEqual(handoff.actionOut, "error_lambda_response_unverified");
    }),
);

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\n070a homework upload tests: ${passed} passed, ${failed} failed (of ${results.length}).`);
if (failed > 0) {
    process.exit(1);
}
