/**
 * SC-167 — Submission Base XP (SUBMISSION_XP|{submissionId}) deterministic dedupe.
 *
 * Pure helpers used by offline concurrency/retry tests and mirrored inline in
 * Automation 010 (Airtable scripts cannot require local modules).
 *
 * Rules:
 * - Canonical Source Key ownership is exclusive per submission id.
 * - When multiple rows share the same canonical key and all prove matching
 *   ownership, keep one Active? award (earliest createdTime, then lowest id)
 *   and deactivate the rest. Never delete.
 * - Conflicting ownership / mismatched submission links → fail closed
 *   (ambiguous; do not deactivate).
 */
"use strict";

const SOURCE_KEY_PREFIX = "SUBMISSION_XP|";

function buildSubmissionXpSourceKey(submissionId) {
  return `${SOURCE_KEY_PREFIX}${String(submissionId || "").trim()}`;
}

function parseSubmissionIdFromSourceKey(sourceKey) {
  const key = String(sourceKey || "").trim();
  if (!key.startsWith(SOURCE_KEY_PREFIX)) return "";
  const id = key.slice(SOURCE_KEY_PREFIX.length).trim();
  return /^rec[a-zA-Z0-9]{14}$/.test(id) ? id : "";
}

/**
 * @param {{ id: string, createdTime?: string|null }} a
 * @param {{ id: string, createdTime?: string|null }} b
 * @returns {number} negative if a should win (come first)
 */
function compareSubmissionXpOwnerOrder(a, b) {
  const aTime = Date.parse(String(a?.createdTime || "")) || Number.POSITIVE_INFINITY;
  const bTime = Date.parse(String(b?.createdTime || "")) || Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

/**
 * Classify duplicate canonical SUBMISSION_XP rows.
 *
 * @param {object} args
 * @param {string} args.submissionId
 * @param {Array<{
 *   id: string,
 *   sourceKey: string,
 *   submissionId: string,
 *   enrollmentId?: string,
 *   weekId?: string,
 *   weeklySummaryId?: string,
 *   active?: boolean,
 *   createdTime?: string|null,
 *   ownershipExact?: boolean,
 * }>} args.rows
 * @param {boolean} [args.requireExactOwnership=true]
 * @returns {{
 *   ambiguous: boolean,
 *   reason: string,
 *   ownerId: string,
 *   deactivateIds: string[],
 *   activeOwnerIds: string[],
 * }}
 */
function planSubmissionXpCanonicalDedupe({
  submissionId,
  rows = [],
  requireExactOwnership = true,
}) {
  const sid = String(submissionId || "").trim();
  const expectedKey = buildSubmissionXpSourceKey(sid);
  const matches = (rows || []).filter(
    (row) => String(row?.sourceKey || "").trim() === expectedKey
  );

  if (matches.length === 0) {
    return {
      ambiguous: false,
      reason: "none",
      ownerId: "",
      deactivateIds: [],
      activeOwnerIds: [],
    };
  }

  for (const row of matches) {
    const linkedSub = String(row?.submissionId || "").trim();
    if (linkedSub && linkedSub !== sid) {
      return {
        ambiguous: true,
        reason: "canonical_key_linked_to_other_submission",
        ownerId: "",
        deactivateIds: [],
        activeOwnerIds: matches.filter((r) => r.active).map((r) => r.id),
      };
    }
    if (!linkedSub) {
      return {
        ambiguous: true,
        reason: "canonical_key_missing_submission_link",
        ownerId: "",
        deactivateIds: [],
        activeOwnerIds: matches.filter((r) => r.active).map((r) => r.id),
      };
    }
    if (requireExactOwnership && row.ownershipExact === false) {
      return {
        ambiguous: true,
        reason: "canonical_key_ownership_mismatch",
        ownerId: "",
        deactivateIds: [],
        activeOwnerIds: matches.filter((r) => r.active).map((r) => r.id),
      };
    }
  }

  if (matches.length === 1) {
    return {
      ambiguous: false,
      reason: "single",
      ownerId: matches[0].id,
      deactivateIds: [],
      activeOwnerIds: matches[0].active ? [matches[0].id] : [],
    };
  }

  const ordered = [...matches].sort(compareSubmissionXpOwnerOrder);
  const owner = ordered[0];
  const deactivateIds = ordered.slice(1).map((row) => row.id);
  return {
    ambiguous: false,
    reason: "duplicate_canonical_consolidated",
    ownerId: owner.id,
    deactivateIds,
    activeOwnerIds: matches.filter((r) => r.active).map((r) => r.id),
  };
}

/**
 * Identify duplicate Source Keys in a list of XP rows (reconciliation report).
 * Does not delete; returns groups for operator / harness review.
 *
 * @param {Array<{ id: string, sourceKey: string, active?: boolean }>} rows
 * @param {string} [prefix=SOURCE_KEY_PREFIX]
 */
function findDuplicateSourceKeyGroups(rows = [], prefix = SOURCE_KEY_PREFIX) {
  const byKey = new Map();
  for (const row of rows || []) {
    const key = String(row?.sourceKey || "").trim();
    if (!key.startsWith(prefix)) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  const duplicates = [];
  for (const [sourceKey, group] of byKey.entries()) {
    if (group.length < 2) continue;
    const activeIds = group.filter((r) => r.active === true).map((r) => r.id);
    duplicates.push({
      sourceKey,
      count: group.length,
      ids: group.map((r) => r.id),
      activeIds,
      multipleActive: activeIds.length > 1,
      awardBearingDuplicate: activeIds.length > 1,
    });
  }
  duplicates.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  return {
    totalRows: [...byKey.values()].reduce((n, g) => n + g.length, 0),
    uniqueKeys: byKey.size,
    duplicateGroups: duplicates,
  };
}

module.exports = {
  SOURCE_KEY_PREFIX,
  buildSubmissionXpSourceKey,
  parseSubmissionIdFromSourceKey,
  compareSubmissionXpOwnerOrder,
  planSubmissionXpCanonicalDedupe,
  findDuplicateSourceKeyGroups,
};
