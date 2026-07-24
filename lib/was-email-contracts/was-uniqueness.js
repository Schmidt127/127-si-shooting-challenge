/**
 * WAS uniqueness + safe link/create helpers (plain Node).
 * Agent 12 — docs/next-wave/was-email/
 *
 * Identity: Enrollment + Week
 * Summary Key (formula, never write): enrollmentKey|weekKey
 */

"use strict";

function isRecId(value) {
  return typeof value === "string" && /^rec[a-zA-Z0-9]{14}$/.test(value);
}

/**
 * Normalize Summary Key parts into the formula-shaped string.
 * @param {{ enrollmentKey?: string, weekKey?: string }} parts
 */
function normalizeSummaryKey({ enrollmentKey = "", weekKey = "" } = {}) {
  const e = String(enrollmentKey || "").trim();
  const w = String(weekKey || "").trim();
  if (!e || !w) return "";
  return `${e}|${w}`;
}

/**
 * Enrollment+Week identity tuple.
 * @param {{ enrollmentId: string, weekId: string }} parts
 */
function buildWasIdentity({ enrollmentId = "", weekId = "" } = {}) {
  const e = String(enrollmentId || "").trim();
  const w = String(weekId || "").trim();
  if (!isRecId(e)) throw new Error("buildWasIdentity: invalid enrollmentId");
  if (!isRecId(w)) throw new Error("buildWasIdentity: invalid weekId");
  return { enrollmentId: e, weekId: w, identityKey: `WAS|${e}|${w}` };
}

/**
 * @typedef {{ id: string, enrollmentId?: string, weekId?: string, summaryKey?: string }} WasRow
 */

/**
 * Select existing WAS for identity. Prefers Summary Key match, else Enrollment+Week.
 * Deterministic winner among duplicates: lexicographically lowest record id.
 *
 * @param {{
 *   rows?: WasRow[],
 *   enrollmentId: string,
 *   weekId: string,
 *   expectedSummaryKey?: string
 * }} input
 */
function selectExistingWas({
  rows = [],
  enrollmentId,
  weekId,
  expectedSummaryKey = "",
} = {}) {
  const e = String(enrollmentId || "").trim();
  const w = String(weekId || "").trim();
  const key = String(expectedSummaryKey || "").trim();

  if (!e || !w) {
    return {
      action: "error",
      reason: "blank_enrollment_or_week",
      matches: [],
      winnerId: null,
    };
  }

  const byKey = key
    ? rows.filter((r) => {
        if (String(r.summaryKey || "").trim() !== key) return false;
        // When link fields are present on the row, they must agree with identity.
        if (r.enrollmentId && r.enrollmentId !== e) return false;
        if (r.weekId && r.weekId !== w) return false;
        return true;
      })
    : [];
  const byLinks = rows.filter(
    (r) => r.enrollmentId === e && r.weekId === w
  );

  const matches = [...new Map([...byKey, ...byLinks].map((r) => [r.id, r])).values()];
  matches.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  if (matches.length === 0) {
    return { action: "none", reason: "no_existing_was", matches: [], winnerId: null };
  }
  if (matches.length === 1) {
    return {
      action: "use_existing",
      reason: "exact_match",
      matches,
      winnerId: matches[0].id,
      duplicate: false,
    };
  }
  return {
    action: "use_existing",
    reason: "duplicate_was_pick_lowest_id",
    matches,
    winnerId: matches[0].id,
    duplicate: true,
  };
}

/**
 * Detect duplicates for Enrollment+Week (and optional Summary Key).
 */
function detectWasDuplicates(rows = [], { enrollmentId, weekId, expectedSummaryKey = "" } = {}) {
  const selected = selectExistingWas({ rows, enrollmentId, weekId, expectedSummaryKey });
  return {
    isDuplicate: Boolean(selected.duplicate),
    count: selected.matches.length,
    winnerId: selected.winnerId,
    matchIds: selected.matches.map((r) => r.id),
  };
}

/**
 * Decide create vs link-only given selection + caller mode.
 * @param {{ mode: "ensure"|"link_only", selection: ReturnType<selectExistingWas> }} input
 */
function decideWasCreateOrLink({ mode = "ensure", selection } = {}) {
  if (!selection || selection.action === "error") {
    return { action: "error", reason: selection?.reason || "missing_selection" };
  }
  if (selection.action === "use_existing") {
    return {
      action: "link_existing",
      wasId: selection.winnerId,
      reason: selection.reason,
      duplicate: Boolean(selection.duplicate),
    };
  }
  if (mode === "link_only") {
    return { action: "skip_missing", reason: "link_only_no_existing_was" };
  }
  return { action: "create", reason: "ensure_no_existing_was" };
}

/**
 * Simulate concurrent creators: both see none → both would create.
 * Helper returns create for ensure mode; callers must recheck before write.
 */
function simulateConcurrentEnsure(inputs = []) {
  const decisions = inputs.map((input) =>
    decideWasCreateOrLink({
      mode: "ensure",
      selection: selectExistingWas(input),
    })
  );
  const creates = decisions.filter((d) => d.action === "create").length;
  return {
    decisions,
    raceRisk: creates > 1,
    recommended: "recheck_before_create_then_pick_lowest_id_on_read",
  };
}

/**
 * America/Denver calendar date key from a Date or ISO string (Week End DateTime safe).
 */
function denverDateKey(value, timeZone = "America/Denver") {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const y = get("year");
  const mo = get("month");
  const day = get("day");
  if (!y || !mo || !day) return "";
  return `${y}-${mo}-${day}`;
}

/**
 * Empty-week email policy hook (product decision).
 * @param {"send_normal"|"send_short"|"suppress"|string} policy
 */
function resolveEmptyWeekEmailPolicy(policy = "send_normal") {
  const p = String(policy || "send_normal").trim().toLowerCase();
  const allowed = new Set(["send_normal", "send_short", "suppress"]);
  if (!allowed.has(p)) {
    return { policy: "send_normal", enforced: false, reason: "unknown_policy_defaulted" };
  }
  return {
    policy: p,
    enforced: false,
    reason:
      "Policy recorded for operators; 118/119 do not suppress/short-circuit until Mike decides.",
  };
}

module.exports = {
  isRecId,
  normalizeSummaryKey,
  buildWasIdentity,
  selectExistingWas,
  detectWasDuplicates,
  decideWasCreateOrLink,
  simulateConcurrentEnsure,
  denverDateKey,
  resolveEmptyWeekEmailPolicy,
};
