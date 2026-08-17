/**
 * Pure PHA operational matching helpers for offline contract tests.
 * Identity: Program Instance + Week + Homework Assignment + Homework Slot (+ Active).
 * Grade Band is descriptive metadata and must not participate in matching.
 */

"use strict";

function normalizeSlot(value) {
  const s = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (["HW1", "HOMEWORK1"].includes(s)) return "HW1";
  if (["HW2", "HOMEWORK2"].includes(s)) return "HW2";
  return "";
}

function sameId(left, right) {
  return String(left || "") === String(right || "");
}

/**
 * @param {object} pha
 * @param {{ programInstanceId: string, weekId: string, homeworkId: string, slot: string }} identity
 */
function phaMatchesIdentity(pha, identity) {
  if (!pha || pha.active === false) return false;
  if (!sameId(pha.programInstanceId, identity.programInstanceId)) return false;
  if (!sameId(pha.weekId, identity.weekId)) return false;
  if (!sameId(pha.homeworkId, identity.homeworkId)) return false;
  if (normalizeSlot(pha.slot) !== normalizeSlot(identity.slot)) return false;
  return true;
}

/**
 * Resolve active PHAs for an operational identity.
 * Grade Band on the PHA is ignored.
 * @returns {{ status: 'exact'|'missing'|'duplicate', matches: object[] }}
 */
function resolvePhaByIdentity(phas, identity) {
  const matches = (phas || []).filter((pha) => phaMatchesIdentity(pha, identity));
  if (matches.length === 1) return { status: "exact", matches };
  if (matches.length === 0) return { status: "missing", matches };
  return { status: "duplicate", matches };
}

/**
 * 071-style linked-PHA ownership check. Never compares Grade Band.
 */
function validateLinkedPhaOwnership(pha, identity) {
  if (!pha || pha.active === false) {
    return { ok: false, error: "Linked Program Homework Assignment is missing/inactive. Handoff blocked." };
  }
  if (!sameId(pha.programInstanceId, identity.programInstanceId)) {
    return { ok: false, error: "PHA Program Instance mismatch." };
  }
  if (!sameId(pha.weekId, identity.weekId)) {
    return { ok: false, error: "PHA Week mismatch." };
  }
  if (!sameId(pha.homeworkId, identity.homeworkId)) {
    return { ok: false, error: "PHA Homework mismatch." };
  }
  if (normalizeSlot(pha.slot) !== normalizeSlot(identity.slot)) {
    return { ok: false, error: "PHA Homework Slot mismatch." };
  }
  return { ok: true, error: "" };
}

module.exports = {
  normalizeSlot,
  phaMatchesIdentity,
  resolvePhaByIdentity,
  validateLinkedPhaOwnership,
};
