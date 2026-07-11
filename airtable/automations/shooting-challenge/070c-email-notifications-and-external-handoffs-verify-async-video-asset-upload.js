/*
Automation: 070c - Email, Notifications, and External Handoffs - Verify Async Video Asset Upload
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (not yet deployed — repurpose an existing automation slot)
Last GitHub Update: 2026-07-11

Purpose:
Verifies Lambda upload writeback after 070b handoff; idempotently clears Send to Make Trigger when still checked.

Trigger:
Submission Assets when Send to Make Trigger checked and async writeback fields are complete (see docblock).

Important Tables:
Submission Assets

Important Fields:
Send to Make Trigger, Upload Status, Writeback Complete?, Canonical File URL, Storage Key, File Content Hash, File Hash Algorithm, Uploaded At, Upload Error

Notes:
Companion to 070b v4.4 — 070b cannot poll in Airtable scripts (no setTimeout). Deploy by repurposing an unused automation slot if base is at limit.
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/********************************************************************
 * AUTOMATION:
 * 070c - Verify Async Video Asset Upload
 *
 * SYSTEM:
 * 127 Sports Intensity - Shooting Challenge App
 *
 * TABLE:
 * Submission Assets
 *
 * VERSION:
 * v1.1 - Idempotent writeback verification (trigger state does not fail verification)
 *
 * CREATED:
 * 2026-07-11
 *
 * LAST UPDATED:
 * 2026-07-11
 *
 * CHANGE HISTORY:
 * 2026-07-11 - v1.1 (070c / C-013 idempotent verify)
 * - Writeback checks independent of Send to Make Trigger state.
 * - Full writeback + trigger checked → clear trigger (async_upload_verified_trigger_cleared).
 * - Full writeback + trigger already unchecked → idempotent success (async_upload_already_verified).
 * - Failure only when upload writeback fields fail; trigger retained if still checked.
 *
 * 2026-07-11 - v1.0 (070c / C-013 Make async Accepted companion)
 * - Rereads Submission Asset after Lambda direct writeback.
 * - Clears Send to Make Trigger only when all required fields verify.
 * - Leaves trigger checked on verification failure for retry / operator review.
 *
 * PURPOSE:
 * Completes the async upload handoff started by 070b when Make returns plain-text Accepted.
 * 070b returns pending and retains Send to Make Trigger; Lambda writes back directly;
 * this automation verifies writeback and clears the trigger.
 *
 * THIS IS NOT:
 * - The Make webhook sender (070b).
 * - Upload processing or S3 upload (Make / Lambda).
 *
 * FOLDER:
 * 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME:
 * 070c - Email, Notifications, and External Handoffs - Verify Async Video Asset Upload
 *
 * RECOMMENDED TRIGGER CONDITIONS (all must match):
 * - Upload Status = Uploaded
 * - Writeback Complete? is checked
 * - Canonical File URL is not empty
 * - Storage Key is not empty
 * - File Content Hash is not empty
 * - File Hash Algorithm = SHA-256
 * - Uploaded At is not empty
 * - Upload Error is empty
 * - Send to Make Trigger is checked (optional — omit for idempotent re-fire after 070b cleared trigger)
 *
 * REQUIRED INPUT VARIABLES:
 * - recordId — Submission Assets record ID from trigger
 *
 * OUTPUTS:
 * - statusOut = success | error
 * - actionOut = async_upload_verified_trigger_cleared | async_upload_already_verified | async_writeback_verification_failed | error
 * - errorOut
 * - debugStep
 * - submissionAssetRecordId
 * - writebackChecks (JSON string of per-field booleans)
 ********************************************************************/

// @ts-nocheck

async function main() {
    /************************************************************
     * SECTION 1: SCRIPT METADATA + CONFIG
     ************************************************************/

    const SCRIPT = {
        scriptName: "070c - Verify Async Video Asset Upload",
        version: "v1.1",
        versionDate: "2026-07-11",
        originalWrittenDate: "2026-07-11",
        lastUpdated: "2026-07-11",
        folder: "07 - Email, Notifications, and External Handoffs",
        automationName:
            "070c - Email, Notifications, and External Handoffs - Verify Async Video Asset Upload",
    };

    const CONFIG = {
        tables: {
            submissionAssets: "Submission Assets",
        },

        fields: {
            sendToMakeTrigger: "Send to Make Trigger",
            uploadStatus: "Upload Status",
            uploadError: "Upload Error",
            canonicalFileUrl: "Canonical File URL",
            storageKey: "Storage Key",
            fileContentHash: "File Content Hash",
            fileHashAlgorithm: "File Hash Algorithm",
            uploadedAt: "Uploaded At",
            writebackComplete: "Writeback Complete?",
        },

        values: {
            statusUploaded: "Uploaded",
            hashAlgorithmSha256: "SHA-256",
        },

        actions: {
            verifiedTriggerCleared: "async_upload_verified_trigger_cleared",
            alreadyVerified: "async_upload_already_verified",
            verificationFailed: "async_writeback_verification_failed",
            error: "error",
        },
    };

    /************************************************************
     * SECTION 2: HELPERS
     ************************************************************/

    function setOutputSafe(key, value) {
        try {
            output.set(key, value);
        } catch (error) {
            console.log(`output.set failed for ${key}: ${error?.message || error}`);
        }
    }

    function setDebug(step) {
        setOutputSafe("debugStep", step);
    }

    function normalizeText(value) {
        return String(value ?? "").trim();
    }

    function fieldExists(table, fieldName) {
        if (!table || !fieldName) return false;
        try {
            table.getField(fieldName);
            return true;
        } catch {
            return false;
        }
    }

    function getField(table, fieldName) {
        return fieldExists(table, fieldName) ? table.getField(fieldName) : null;
    }

    function getSafeFields(table, fieldNames) {
        return [...new Set(fieldNames)].filter((name) => fieldExists(table, name));
    }

    function getRaw(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) return null;
        return record.getCellValue(fieldName);
    }

    function getText(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) return "";
        return normalizeText(record.getCellValueAsString(fieldName));
    }

    function getSingleSelectName(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);
        if (raw && typeof raw === "object" && "name" in raw) {
            return normalizeText(raw.name);
        }
        return getText(record, table, fieldName);
    }

    function isWritableField(table, fieldName) {
        const field = getField(table, fieldName);
        if (!field) return false;

        const nonWritable = new Set([
            "formula",
            "rollup",
            "multipleLookupValues",
            "lookup",
            "createdTime",
            "lastModifiedTime",
            "autoNumber",
            "count",
            "createdBy",
            "lastModifiedBy",
            "button",
            "externalSyncSource",
            "aiText",
        ]);

        return !nonWritable.has(field.type);
    }

    function setWritable(fields, table, fieldName, value) {
        if (!isWritableField(table, fieldName)) return;
        fields[fieldName] = value;
    }

    async function updateAsset(table, recordId, fields) {
        if (!fields || !Object.keys(fields).length) return;
        await table.updateRecordAsync(recordId, fields);
    }

    function readWritebackFieldMap(record, table) {
        return {
            "Send to Make Trigger": getRaw(record, table, CONFIG.fields.sendToMakeTrigger),
            "Upload Status": getSingleSelectName(record, table, CONFIG.fields.uploadStatus),
            "Canonical File URL": getText(record, table, CONFIG.fields.canonicalFileUrl),
            "Storage Key": getText(record, table, CONFIG.fields.storageKey),
            "File Content Hash": getText(record, table, CONFIG.fields.fileContentHash),
            "File Hash Algorithm": getSingleSelectName(record, table, CONFIG.fields.fileHashAlgorithm),
            "Uploaded At": getRaw(record, table, CONFIG.fields.uploadedAt),
            "Upload Error": getText(record, table, CONFIG.fields.uploadError),
            "Writeback Complete?": getRaw(record, table, CONFIG.fields.writebackComplete),
        };
    }

    function evaluateSubmissionAssetWriteback(fields) {
        const uploadStatus = normalizeText(fields["Upload Status"]);
        const uploadError = normalizeText(fields["Upload Error"]);
        const writebackComplete = fields["Writeback Complete?"];
        const writebackCompleteOk =
            writebackComplete === 1 || writebackComplete === true || writebackComplete === "1";

        const checks = {
            uploadStatusUploaded: uploadStatus === CONFIG.values.statusUploaded,
            canonicalUrlPopulated: Boolean(normalizeText(fields["Canonical File URL"])),
            storageKeyPopulated: Boolean(normalizeText(fields["Storage Key"])),
            fileContentHashPopulated: Boolean(normalizeText(fields["File Content Hash"])),
            fileHashAlgorithmSha256:
                normalizeText(fields["File Hash Algorithm"]) === CONFIG.values.hashAlgorithmSha256,
            uploadedAtPopulated: fields["Uploaded At"] != null && fields["Uploaded At"] !== "",
            uploadErrorBlank: !uploadError,
            writebackCompleteFormula: writebackCompleteOk,
        };

        const verified = Object.values(checks).every(Boolean);
        return {
            verified,
            checks,
            message: verified
                ? "Submission Asset upload writeback verified."
                : "Submission Asset upload writeback incomplete.",
        };
    }

    function decide070cAction(fields) {
        const writeback = evaluateSubmissionAssetWriteback(fields);
        const sendToMakeTriggerChecked = fields["Send to Make Trigger"] === true;
        const failedWritebackChecks = Object.entries(writeback.checks)
            .filter(([, pass]) => !pass)
            .map(([name]) => name);

        if (!writeback.verified) {
            return {
                writebackVerified: false,
                writebackChecks: writeback.checks,
                sendToMakeTriggerChecked,
                shouldClearTrigger: false,
                statusOut: "error",
                actionOut: CONFIG.actions.verificationFailed,
                message: `${writeback.message} Failed checks: ${failedWritebackChecks.join(", ") || "unknown"}.`,
            };
        }

        if (sendToMakeTriggerChecked) {
            return {
                writebackVerified: true,
                writebackChecks: writeback.checks,
                sendToMakeTriggerChecked: true,
                shouldClearTrigger: true,
                statusOut: "success",
                actionOut: CONFIG.actions.verifiedTriggerCleared,
                message: "Upload writeback verified; Send to Make Trigger cleared.",
            };
        }

        return {
            writebackVerified: true,
            writebackChecks: writeback.checks,
            sendToMakeTriggerChecked: false,
            shouldClearTrigger: false,
            statusOut: "success",
            actionOut: CONFIG.actions.alreadyVerified,
            message: "Upload writeback verified; Send to Make Trigger was already cleared.",
        };
    }

    function setStandardOutputs(result) {
        setOutputSafe("statusOut", result.statusOut || "");
        setOutputSafe("actionOut", result.actionOut || "");
        setOutputSafe("errorOut", result.errorOut || "");
        setOutputSafe("submissionAssetRecordId", result.submissionAssetRecordId || "");
        setOutputSafe("writebackChecks", result.writebackChecks || "");
        setOutputSafe("sendToMakeTriggerChecked", result.sendToMakeTriggerChecked ?? "");
    }

    /************************************************************
     * SECTION 3: INPUT VALIDATION
     ************************************************************/

    setDebug("1 - Start");

    const inputConfig = input.config();
    const recordId = normalizeText(inputConfig.recordId);

    if (!recordId || !recordId.startsWith("rec")) {
        setOutputSafe("statusOut", "error");
        setOutputSafe("actionOut", CONFIG.actions.error);
        setOutputSafe("errorOut", "Missing or invalid recordId input.");
        throw new Error("Missing or invalid recordId input.");
    }

    const assetsTable = base.getTable(CONFIG.tables.submissionAssets);

    /************************************************************
     * SECTION 4: REREAD + VERIFY WRITEBACK
     ************************************************************/

    setDebug("2 - Reread Submission Asset");

    const fieldNames = Object.values(CONFIG.fields);
    const fieldsToLoad = getSafeFields(assetsTable, fieldNames);
    const assetRecord = await assetsTable.selectRecordAsync(recordId, {
        fields: fieldsToLoad.length ? fieldsToLoad : undefined,
    });

    if (!assetRecord) {
        setOutputSafe("statusOut", "error");
        setOutputSafe("actionOut", CONFIG.actions.error);
        setOutputSafe("errorOut", `Submission Assets record not found: ${recordId}`);
        throw new Error(`Submission Assets record not found: ${recordId}`);
    }

    setDebug("3 - Evaluate writeback");

    const fieldMap = readWritebackFieldMap(assetRecord, assetsTable);
    const decision = decide070cAction(fieldMap);
    const checksJson = JSON.stringify({
        ...decision.writebackChecks,
        sendToMakeTriggerChecked: decision.sendToMakeTriggerChecked,
    });

    if (decision.statusOut === "error") {
        setDebug("4 - Verification failed (trigger retained if checked)");

        const result = {
            statusOut: decision.statusOut,
            actionOut: decision.actionOut,
            errorOut: decision.message,
            submissionAssetRecordId: recordId,
            writebackChecks: checksJson,
            sendToMakeTriggerChecked: decision.sendToMakeTriggerChecked,
            message: decision.message,
        };

        setStandardOutputs(result);

        console.log(
            JSON.stringify({
                automation: SCRIPT.automationName,
                version: SCRIPT.version,
                ...result,
            }),
        );
        return;
    }

    if (decision.shouldClearTrigger) {
        setDebug("5 - Clear Send to Make Trigger");

        const updateFields = {};
        setWritable(updateFields, assetsTable, CONFIG.fields.sendToMakeTrigger, false);
        await updateAsset(assetsTable, recordId, updateFields);
    } else {
        setDebug("5 - Idempotent success (no trigger change)");
    }

    setDebug("6 - Done");

    const result = {
        statusOut: decision.statusOut,
        actionOut: decision.actionOut,
        errorOut: "",
        submissionAssetRecordId: recordId,
        writebackChecks: checksJson,
        sendToMakeTriggerChecked: decision.sendToMakeTriggerChecked,
        message: decision.message,
    };

    setStandardOutputs(result);

    console.log(
        JSON.stringify({
            automation: SCRIPT.automationName,
            version: SCRIPT.version,
            ...result,
        }),
    );
}

try {
    await main();
} catch (err) {
    const message = err?.message || String(err);
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", "error");
    setOutputSafe("errorOut", message);
    console.error(JSON.stringify({ automation: "070c", error: message }));
    throw err;
}
