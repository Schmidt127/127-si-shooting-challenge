/**
 * Offline-testable create-batch helpers mirroring Automation 066 SECTION 7.
 * Airtable Scripting cannot import this module — keep script inline copy in sync.
 *
 * Contract:
 * - Accepts raw field maps OR Airtable-shaped `{ fields: {...} }` objects
 * - Always sends `createRecordsAsync([{ fields: {...} }, ...])`
 * - Batches at `batchSize` (default 50)
 */

"use strict";

/**
 * Normalize one create payload to `{ fields: plainObject }`.
 * @param {unknown} payload
 * @param {number} index
 * @returns {{ fields: Record<string, unknown> }}
 */
function normalizeCreateRecordPayload(payload, index = 0) {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(
      `createRecordsInBatches: payloads[${index}] must be a non-null object ` +
        `(got ${payload == null ? String(payload) : Array.isArray(payload) ? "array" : typeof payload})`,
    );
  }

  const keys = Object.keys(payload);
  const hasFieldsProp = Object.prototype.hasOwnProperty.call(payload, "fields");
  const fieldsValue = hasFieldsProp ? payload.fields : undefined;
  const fieldsIsPlainObject =
    fieldsValue != null && typeof fieldsValue === "object" && !Array.isArray(fieldsValue);

  // Already Airtable-shaped: { fields: {...} } with no sibling field maps.
  // Allow optional `id` only (unused on create, but harmless if present).
  if (hasFieldsProp && fieldsIsPlainObject) {
    const siblingKeys = keys.filter((k) => k !== "fields" && k !== "id");
    if (siblingKeys.length === 0) {
      if (Object.keys(fieldsValue).length === 0) {
        throw new Error(`createRecordsInBatches: payloads[${index}].fields is empty`);
      }
      return { fields: { ...fieldsValue } };
    }
  }

  // Raw field map (caller pushed unlockPayload directly).
  if (keys.length === 0) {
    throw new Error(`createRecordsInBatches: payloads[${index}] has no fields`);
  }

  return { fields: { ...payload } };
}

/**
 * Normalize an array of mixed payloads.
 * @param {unknown[]} payloads
 * @returns {{ fields: Record<string, unknown> }[]}
 */
function normalizeCreateRecordPayloads(payloads) {
  if (!Array.isArray(payloads)) {
    throw new Error("createRecordsInBatches: payloads must be an array");
  }
  return payloads.map((payload, index) => normalizeCreateRecordPayload(payload, index));
}

/**
 * Simulate Airtable's createRecordsAsync contract for offline regression.
 * Throws the same shape of message when records lack a `fields` property.
 * @param {unknown[]} records
 * @returns {string[]} created fake record ids
 */
function assertAirtableCreateRecordsShape(records) {
  if (!Array.isArray(records)) {
    throw new Error("Invalid arguments passed to table.createRecordsAsync(records): records should be an array");
  }
  for (let i = 0; i < records.length; i += 1) {
    const rec = records[i];
    if (rec == null || typeof rec !== "object" || Array.isArray(rec) || !Object.prototype.hasOwnProperty.call(rec, "fields")) {
      throw new Error(
        `Invalid arguments passed to table.createRecordsAsync(records): records[${i}] should have a 'fields' property`,
      );
    }
    if (rec.fields == null || typeof rec.fields !== "object" || Array.isArray(rec.fields)) {
      throw new Error(
        `Invalid arguments passed to table.createRecordsAsync(records): records[${i}].fields should be an object`,
      );
    }
  }
  return records.map((_, i) => `recFakeCreate${String(i).padStart(4, "0")}`);
}

/**
 * Defensive batch create — accepts raw or wrapped payloads; always calls createRecordsAsync
 * with `{ fields }` objects. Mirrors production helper behavior for offline tests.
 *
 * @param {{ createRecordsAsync: (records: { fields: Record<string, unknown> }[]) => Promise<string[]> }} table
 * @param {unknown[]} payloads
 * @param {{ batchSize?: number, onBatch?: (info: object) => void }} [options]
 */
async function createRecordsInBatches(table, payloads, options = {}) {
  const batchSize = Number(options.batchSize) > 0 ? Number(options.batchSize) : 50;
  if (!payloads || !payloads.length) {
    return { createdIds: [], batches: 0, normalizedCount: 0 };
  }

  const normalized = normalizeCreateRecordPayloads(payloads);
  const createdIds = [];
  let batches = 0;

  for (let i = 0; i < normalized.length; i += batchSize) {
    const batch = normalized.slice(i, i + batchSize);
    batches += 1;
    if (typeof options.onBatch === "function") {
      options.onBatch({
        batchIndex: batches,
        offset: i,
        size: batch.length,
        fieldKeySample: Object.keys(batch[0].fields).slice(0, 8),
        shape: "fields-wrapped",
      });
    }
    const ids = await table.createRecordsAsync(batch);
    if (Array.isArray(ids)) createdIds.push(...ids);
  }

  return { createdIds, batches, normalizedCount: normalized.length };
}

/**
 * Build one unlock create payload matching 066 field contract (offline).
 */
function buildUnlockCreatePayload({
  enrollmentId,
  achievementId,
  shotMilestoneId,
  sourceKey,
  activityDate,
  weekId,
  notes,
}) {
  const fields = {
    Enrollment: [{ id: enrollmentId }],
    Achievement: [{ id: achievementId }],
    "Shot Milestone": [{ id: shotMilestoneId }],
    "Milestone Source Key": sourceKey,
    "Milestone Activity Date": activityDate,
    "XP Award Status": { name: "Pending" },
  };
  if (weekId) fields.Week = [{ id: weekId }];
  if (notes) fields.Notes = notes;
  return fields;
}

/**
 * Plan unlock creates vs link-existing for eligible milestones (offline).
 * Mirrors 066 main loop create/skip/update decision without Airtable.
 */
function planUnlockWrites({
  enrollmentId,
  achievementId,
  eligibleMilestones,
  existingUnlockBySourceKey = {},
  crossingsByMilestoneId = {},
}) {
  const creates = [];
  const linkExisting = [];
  const skipped = [];

  for (const milestone of eligibleMilestones) {
    const crossing = crossingsByMilestoneId[milestone.id];
    if (!crossing || !crossing.activityDate) {
      skipped.push({ milestoneId: milestone.id, reason: "missing_crossing_date" });
      continue;
    }
    const sourceKey = `SHOT_MILESTONE|${enrollmentId}|${milestone.id}`;
    const existing = existingUnlockBySourceKey[sourceKey];
    if (existing) {
      linkExisting.push({
        unlockId: existing.id,
        sourceKey,
        milestoneId: milestone.id,
        action: "link_existing",
      });
      continue;
    }
    creates.push(
      buildUnlockCreatePayload({
        enrollmentId,
        achievementId,
        shotMilestoneId: milestone.id,
        sourceKey,
        activityDate: crossing.activityDate,
        weekId: crossing.weekId || "",
        notes: `Created by 066 offline plan for ${milestone.id}`,
      }),
    );
  }

  return { creates, linkExisting, skipped };
}

module.exports = {
  normalizeCreateRecordPayload,
  normalizeCreateRecordPayloads,
  assertAirtableCreateRecordsShape,
  createRecordsInBatches,
  buildUnlockCreatePayload,
  planUnlockWrites,
};
