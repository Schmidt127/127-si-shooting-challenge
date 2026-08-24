/*
Extension Script: Repair Missing Reviewer Access Tokens on Uploaded Submission Assets
System: 127 SI Shooting Challenge
Purpose:
  Finds Uploaded Submission Assets with a private object (Storage Key / Canonical File URL)
  but missing Reviewer Access Token (and therefore blank Reviewer File URL formula).
  Writes a new Reviewer Access Token using the same secure mechanism as upload Lambda.
  Reviewer File URL is a formula — it populates automatically after the token is set.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply updates
  - BATCH_LIMIT caps writes per run (default 25)
  - Skips assets that already have Reviewer Access Token
  - Never modifies Canonical File URL, Storage Key, or S3 permissions
  - Never logs or prints raw tokens (before/after reports redact token presence only)
  - Idempotent: safe to replay; existing tokens are preserved

After repair:
  - Re-run Automation 022 on affected assets to refresh Video Feedback parent URLs
  - Or use backfill-video-pipeline-links.js for VF sync
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;

const CONFIG = {
  tables: {
    assets: "Submission Assets",
  },
  fields: {
    uploadStatus: "Upload Status",
    reviewerToken: "Reviewer Access Token",
    reviewerFileUrl: "Reviewer File URL",
    canonicalFileUrl: "Canonical File URL",
    storageKey: "Storage Key",
    originalFileName: "Original File Name",
    uploadDestination: "Upload Destination",
  },
  values: {
    uploaded: "Uploaded",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function hasUploadedObject(record, table) {
  return Boolean(getText(record, table, CONFIG.fields.storageKey)) ||
    Boolean(getText(record, table, CONFIG.fields.canonicalFileUrl));
}

function generateReviewerToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function summarizeRecord(record, table, action) {
  return {
    recordId: record.id,
    action,
    uploadStatus: getSelectName(record, table, CONFIG.fields.uploadStatus),
    uploadDestination: getText(record, table, CONFIG.fields.uploadDestination),
    originalFileName: getText(record, table, CONFIG.fields.originalFileName),
    hasStorageKey: Boolean(getText(record, table, CONFIG.fields.storageKey)),
    hasCanonicalUrl: Boolean(getText(record, table, CONFIG.fields.canonicalFileUrl)),
    hadReviewerToken: Boolean(getText(record, table, CONFIG.fields.reviewerToken)),
    hadReviewerFileUrl: Boolean(getText(record, table, CONFIG.fields.reviewerFileUrl)),
  };
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const query = await assetsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.fields).filter((name) => fieldExists(assetsTable, name)),
  });

  const candidates = [];
  for (const record of query.records) {
    if (getSelectName(record, assetsTable, CONFIG.fields.uploadStatus) !== CONFIG.values.uploaded) {
      continue;
    }
    if (getText(record, assetsTable, CONFIG.fields.reviewerToken)) continue;
    if (getText(record, assetsTable, CONFIG.fields.reviewerFileUrl)) continue;
    if (!hasUploadedObject(record, assetsTable)) continue;
    candidates.push(record);
  }

  const toProcess = candidates.slice(0, BATCH_LIMIT);
  const report = {
    dryRun: DRY_RUN || !CONFIRM_WRITE,
    confirmWrite: CONFIRM_WRITE,
    candidateCount: candidates.length,
    batchLimit: BATCH_LIMIT,
    processingCount: toProcess.length,
    remainingAfterBatch: Math.max(0, candidates.length - toProcess.length),
    rows: [],
  };

  for (const record of toProcess) {
    const before = summarizeRecord(record, assetsTable, "inspect");
    if (DRY_RUN || !CONFIRM_WRITE) {
      report.rows.push({ ...before, action: "would_write_token", tokenGenerated: true });
      continue;
    }

    await assetsTable.updateRecordAsync(record.id, {
      [CONFIG.fields.reviewerToken]: generateReviewerToken(),
    });

    const refreshed = await assetsTable.selectRecordAsync(record.id, {
      fields: [CONFIG.fields.reviewerFileUrl, CONFIG.fields.reviewerToken],
    });
    const after = summarizeRecord(refreshed || record, assetsTable, "repaired");
    after.reviewerFileUrlPresent = Boolean(
      getText(refreshed || record, assetsTable, CONFIG.fields.reviewerFileUrl)
    );
    after.reviewerTokenPresent = Boolean(
      getText(refreshed || record, assetsTable, CONFIG.fields.reviewerToken)
    );
    report.rows.push(after);
  }

  output.set("reportJson", JSON.stringify(report));
  console.log(JSON.stringify(report));
}

await main();
