/*
Automation: 070c - Email, Notifications, and External Handoffs - Verify Async Video Asset Upload
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (not yet deployed — repurpose an existing automation slot)
Last GitHub Update: 2026-07-11

Purpose:
Verifies Lambda async writeback after 070b receives Make plain-text Accepted; clears Send to Make Trigger only when all writeback fields pass.

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
 * v1.0 - Async writeback verification after Make Accepted handoff
 *
 * CREATED:
 * 2026-07-11
 *
 * LAST UPDATED:
 * 2026-07-11
 *
 * CHANGE HISTORY:
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
 * - Send to Make Trigger is checked
 * - Upload Status = Uploaded
 * - Writeback Complete? is checked
 * - Canonical File URL is not empty
 * - Storage Key is not empty
 * - File Content Hash is not empty
 * - File Hash Algorithm = SHA-256
 * - Uploaded At is not empty
 * - Upload Error is empty
 *
 * REQUIRED INPUT VARIABLES:
 * - recordId — Submission Assets record ID from trigger
 *
 * OUTPUTS:
 * - statusOut = success | error
 * - actionOut = async_writeback_verified | async_writeback_verification_failed | error
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
        version: "v1.0",
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
            verified: "async_writeback_verified",
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

    function evaluate070cAsyncWritebackVerification(fields) {
        const uploadStatus = normalizeText(fields["Upload Status"]);
        const uploadError = normalizeText(fields["Upload Error"]);
        const writebackComplete = fields["Writeback Complete?"];
        const writebackCompleteOk =
            writebackComplete === 1 || writebackComplete === true || writebackComplete === "1";
        const sendToMakeTriggerChecked = fields["Send to Make Trigger"] === true;

        const checks = {
            sendToMakeTriggerChecked,
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
                ? "Async upload writeback verified; Send to Make Trigger cleared."
                : sendToMakeTriggerChecked
                  ? "Submission Asset async writeback incomplete."
                  : "Send to Make Trigger is not checked; verification skipped.",
        };
    }

    function setStandardOutputs(result) {
        setOutputSafe("statusOut", result.statusOut || "");
        setOutputSafe("actionOut", result.actionOut || "");
        setOutputSafe("errorOut", result.errorOut || "");
        setOutputSafe("submissionAssetRecordId", result.submissionAssetRecordId || "");
        setOutputSafe("writebackChecks", result.writebackChecks || "");
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
    const evaluation = evaluate070cAsyncWritebackVerification(fieldMap);
    const checksJson = JSON.stringify(evaluation.checks);

    if (!evaluation.verified) {
        setDebug("4 - Verification failed (trigger retained)");

        const failedChecks = Object.entries(evaluation.checks)
            .filter(([, pass]) => !pass)
            .map(([name]) => name)
            .join(", ");

        const message = `${evaluation.message} Failed checks: ${failedChecks || "unknown"}.`;

        const result = {
            statusOut: "error",
            actionOut: CONFIG.actions.verificationFailed,
            errorOut: message,
            submissionAssetRecordId: recordId,
            writebackChecks: checksJson,
            message,
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

    /************************************************************
     * SECTION 5: CLEAR TRIGGER
     ************************************************************/

    setDebug("5 - Clear Send to Make Trigger");

    const updateFields = {};
    setWritable(updateFields, assetsTable, CONFIG.fields.sendToMakeTrigger, false);
    await updateAsset(assetsTable, recordId, updateFields);

    setDebug("6 - Done");

    const result = {
        statusOut: "success",
        actionOut: CONFIG.actions.verified,
        errorOut: "",
        submissionAssetRecordId: recordId,
        writebackChecks: checksJson,
        message: evaluation.message,
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
