/**
 * Conflicting status combination detectors (workflow-agnostic helpers).
 */

"use strict";

const { getBooleanish, getSelectText, normalizeBlank, normalizeSendMode } = require("./normalize");

/**
 * Generic: list of predicates that return conflict descriptors.
 * @param {object} record
 * @param {Array<(r: object) => ({ code: string, message: string }|null)>} rules
 */
function findConflicts(record, rules = []) {
  const conflicts = [];
  for (const rule of rules) {
    const hit = rule(record);
    if (hit) conflicts.push(hit);
  }
  return conflicts;
}

/**
 * Weekly email field conflict rules (WAS table).
 * Preserves ownership: 118→072→119→074→Make→Gmail→writeback.
 *
 * @param {object} fields — flat field map
 * @returns {{ code: string, message: string, severity: string }[]}
 */
function detectWeeklyEmailConflicts(fields = {}) {
  const ready = getBooleanish(fields["Weekly Email Ready?"]);
  const sent = getBooleanish(fields["Weekly Email Sent?"]);
  const sendToMake = getBooleanish(fields["Send to Make?"]);
  const buildNow = getBooleanish(fields["Build Weekly Email Now?"]);
  const subject = String(normalizeBlank(fields["Weekly Email Subject"]) || "");
  const recipients = String(normalizeBlank(fields["Weekly Email Recipients"]) || "");
  const html = String(normalizeBlank(fields["Weekly Email HTML"]) || "");
  const makeStatus = getSelectText(fields["Make Send Status"]);
  // PROD has both timestamps historically; Make Live writeback may populate
  // Weekly Summary Sent At and/or Weekly Email Sent At — treat either as present.
  const sentAt =
    normalizeBlank(fields["Weekly Summary Sent At"]) ||
    normalizeBlank(fields["Weekly Email Sent At"]);
  const sendMode = normalizeSendMode(fields.sendMode || fields["sendMode"]);
  const errorMsg = String(normalizeBlank(fields["Weekly Email Error"]) || "");

  /** @type {{ code: string, message: string, severity: string }[]} */
  const out = [];

  if (ready && !subject) {
    out.push({
      code: "ready_subject_blank",
      message: "Weekly Email Ready? checked but subject blank",
      severity: "P0",
    });
  }
  if (ready && !recipients) {
    out.push({
      code: "ready_recipients_blank",
      message: "Weekly Email Ready? checked but recipients blank",
      severity: "P0",
    });
  }
  if (ready && !html) {
    out.push({
      code: "ready_html_blank",
      message: "Weekly Email Ready? checked but HTML blank",
      severity: "P0",
    });
  }
  if (sendToMake && !ready) {
    out.push({
      code: "send_armed_not_ready",
      message: "Send to Make? checked while Weekly Email Ready? is unchecked",
      severity: "P0",
    });
  }
  if (sent && makeStatus && makeStatus.toLowerCase() !== "sent") {
    out.push({
      code: "sent_checkbox_make_status_mismatch",
      message: `Weekly Email Sent? checked but Make Send Status is "${makeStatus}" (expected Sent)`,
      severity: "P0",
    });
  }
  if (makeStatus && makeStatus.toLowerCase() === "sent" && !sent) {
    out.push({
      code: "make_sent_checkbox_blank",
      message: "Make Send Status=Sent but Weekly Email Sent? unchecked (writeback incomplete)",
      severity: "P0",
    });
  }
  if (sent && !sentAt) {
    out.push({
      code: "sent_timestamp_blank",
      message:
        "Weekly Email Sent? checked but both Weekly Summary Sent At and Weekly Email Sent At are blank",
      severity: "P1",
    });
  }
  if (sent && sendToMake) {
    out.push({
      code: "sent_still_armed",
      message: "Already-sent record still has Send to Make? checked",
      severity: "P0",
    });
  }
  if (sent && buildNow) {
    out.push({
      code: "sent_build_armed",
      message: "Already-sent record still has Build Weekly Email Now? checked",
      severity: "P1",
    });
  }
  if (sendMode === "test" && ready && !sent && sendToMake) {
    out.push({
      code: "live_forced_test_handoff",
      message:
        "Package armed for Make with sendMode=Test — Live writeback will not run (PROD must use Live)",
      severity: "P0",
    });
  }
  if (sendMode === "live" && String(fields._fixtureTag || "").toLowerCase() === "test_only") {
    out.push({
      code: "test_record_treated_live",
      message: "Test-tagged record treated as Live sendMode",
      severity: "P1",
    });
  }
  if (sent && ready && !errorMsg && sendToMake === false && makeStatus.toLowerCase() === "sent") {
    // healthy path — no conflict
  }
  if (
    makeStatus &&
    ["handed_off", "handoff", "queued", "processing"].includes(makeStatus.toLowerCase()) &&
    !sent
  ) {
    out.push({
      code: "handoff_writeback_missing",
      message: "Make handoff status set but final Sent? writeback missing",
      severity: "P1",
    });
  }

  return out;
}

/**
 * Level field conflicts on Enrollment.
 * @param {object} fields
 */
function detectLevelConflicts(fields = {}) {
  const out = [];
  const current = normalizeBlank(fields["Current Level"]);
  const next = normalizeBlank(fields["Next Level"]);
  const gateBlocked = getBooleanish(fields["Level Gate Blocked?"] || fields["Gate Blocked?"]);
  const recalc = getBooleanish(
    fields["Recalculate Level?"] || fields["Needs Level Recalculation?"]
  );
  const lifetimeXp = Number(fields["Lifetime XP Total"] || fields["Lifetime XP"] || 0);
  const levelMinXp = Number(fields["Current Level Min XP"] || fields._currentLevelMinXp || 0);

  if (current && next && String(current) === String(next)) {
    out.push({
      code: "current_equals_next",
      message: "Current Level and Next Level point to the same level",
      severity: "P1",
    });
  }
  if (gateBlocked && fields._gateShouldRollback && !fields._rolledBack) {
    out.push({
      code: "gate_blocked_not_rolled_back",
      message: "Gate blocked but level not rolled back correctly",
      severity: "P0",
    });
  }
  if (levelMinXp > 0 && lifetimeXp < levelMinXp) {
    out.push({
      code: "level_exceeds_xp",
      message: "Current Level minimum XP exceeds earned Lifetime XP",
      severity: "P0",
    });
  }
  if (recalc && fields._missingLevelRule) {
    out.push({
      code: "missing_level_rule",
      message: "Level recalculation requested but level rule missing",
      severity: "P1",
    });
  }
  if (recalc && fields._missingGateRule) {
    out.push({
      code: "missing_gate_rule",
      message: "Level recalculation requested but gate rule missing",
      severity: "P1",
    });
  }
  return out;
}

module.exports = {
  findConflicts,
  detectWeeklyEmailConflicts,
  detectLevelConflicts,
};
