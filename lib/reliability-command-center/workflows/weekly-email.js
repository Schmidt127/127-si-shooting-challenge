/**
 * Weekly email health checks.
 * Preserves verified ownership: 118 → 072 → 119 → 074 → Make → Gmail → writeback
 * Make scenario: Weekly Athlete Summary - Bulk Email - May 18
 */

"use strict";

const { HEALTH_STATUS, PRIORITY } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const { detectWeeklyEmailConflicts } = require("../conflicts");
const {
  getBooleanish,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
  normalizeSendMode,
} = require("../normalize");
const {
  WORKFLOWS,
  OWNING_AUTOMATIONS,
  WAS_EMAIL_FIELDS,
} = require("../field-maps");

/**
 * @param {{
 *   weeklyAthleteSummaries?: object[],
 *   weeks?: object[],
 *   expectedWeekId?: string,
 * }} data
 */
function checkWeeklyEmail(data = {}) {
  const rows = data.weeklyAthleteSummaries || [];
  const weeksById = indexById(data.weeks || []);
  const expectedWeekId = String(data.expectedWeekId || "").trim();
  const issues = [];

  for (const row of rows) {
    const id = getRecordId(row);
    const f = row.fields || row;
    const enrollmentId = firstLinkedId(f[WAS_EMAIL_FIELDS.enrollment] || f.Enrollment);
    const weekId = firstLinkedId(f[WAS_EMAIL_FIELDS.week] || f.Week);
    const sent = getBooleanish(f[WAS_EMAIL_FIELDS.sent]);
    const ready = getBooleanish(f[WAS_EMAIL_FIELDS.ready]);
    const sendToMake = getBooleanish(f[WAS_EMAIL_FIELDS.sendToMake]);
    const sendMode = normalizeSendMode(f[WAS_EMAIL_FIELDS.sendMode]);
    const makeStatus = getSelectText(f[WAS_EMAIL_FIELDS.makeSendStatus]);

    const conflicts = detectWeeklyEmailConflicts(f);
    for (const c of conflicts) {
      const mapped = mapConflictToWorkflow(c.code);
      issues.push(
        fin({
          workflow: mapped.workflow,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          weekRecordId: weekId,
          currentStatus: summarizeEmailStatus(f),
          healthStatus: mapped.health,
          priority: c.severity || PRIORITY.P0,
          code: c.code,
          errorMessage: c.message,
          recommendedAction: mapped.action,
          owningAutomation: mapped.owner,
          downstreamDependency: mapped.downstream,
          evidence: [
            `Ready=${ready}`,
            `Sent=${sent}`,
            `SendToMake=${sendToMake}`,
            `MakeStatus=${makeStatus || ""}`,
            `sendMode=${sendMode || ""}`,
          ],
          meta: {
            alreadyCompleted: sent && c.code === "sent_still_armed" ? true : sent && mapped.neverRetry,
            duplicateRisk: c.code.includes("resend") || c.code === "sent_still_armed",
            testOnly: c.code === "live_forced_test_handoff" || sendMode === "test",
            dataFixRequired: mapped.dataFixRequired,
          },
        })
      );
    }

    // Already-sent eligible to resend (Ready + !error but operator might re-arm)
    if (sent && ready && !sendToMake && getBooleanish(f._resendEligibleFlag)) {
      issues.push(
        fin({
          workflow: WORKFLOWS.MAKE_HANDOFF,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          weekRecordId: weekId,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "already_sent_eligible_to_resend",
          recommendedAction:
            "Do not resend — Weekly Email Sent? is checked. Clear any accidental resend eligibility.",
          owningAutomation: OWNING_AUTOMATIONS.weeklyEmailHandoff,
          meta: { alreadyCompleted: true, duplicateRisk: true },
        })
      );
    }

    // Package built for wrong week
    if (expectedWeekId && weekId && weekId !== expectedWeekId && (ready || sendToMake || sent)) {
      issues.push(
        fin({
          workflow: WORKFLOWS.WEEKLY_EMAIL_BUILD,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          weekRecordId: weekId,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "email_package_wrong_week",
          recommendedAction: "Stop send; rebuild package for the intended Week record.",
          owningAutomation: OWNING_AUTOMATIONS.weeklyEmailBuild,
          evidence: [`wasWeek=${weekId}`, `expectedWeek=${expectedWeekId}`],
          meta: { dataFixRequired: true },
        })
      );
    }

    // Scheduling ownership signals (118/119) — informational when flags stuck without 072/074 owners
    if (getBooleanish(f["Build Weekly Email Now?"]) && !ready && !normalizeBlank(f[WAS_EMAIL_FIELDS.error])) {
      // waiting on 072 — not necessarily an error unless stale (handled in WAS checker)
    }

    // Test vs Live mismatch for production parents
    if (sendMode === "test" && getBooleanish(f._productionParent) && (ready || sendToMake)) {
      issues.push(
        fin({
          workflow: WORKFLOWS.MAKE_HANDOFF,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          healthStatus: HEALTH_STATUS.TEST_ONLY,
          priority: PRIORITY.P0,
          code: "production_parent_test_send_mode",
          recommendedAction:
            "PROD parents must use sendMode=Live (074 input Live or WAS Live). Test mode skips Sent? writeback.",
          owningAutomation: OWNING_AUTOMATIONS.weeklyEmailHandoff,
          downstreamDependency: OWNING_AUTOMATIONS.makeWriteback,
          meta: { testOnly: true },
        })
      );
    }

    if (weeksById[weekId] && getBooleanish(f._packageWeekLabelMismatch)) {
      issues.push(
        fin({
          workflow: WORKFLOWS.WEEKLY_EMAIL_BUILD,
          sourceTable: "Weekly Athlete Summary",
          sourceRecordId: id,
          weekRecordId: weekId,
          healthStatus: HEALTH_STATUS.NEEDS_MANUAL_REVIEW,
          code: "email_week_label_mismatch",
          recommendedAction: "Rebuild 072 package so Week Label matches linked Week.",
          owningAutomation: OWNING_AUTOMATIONS.weeklyEmailBuild,
        })
      );
    }
  }

  return issues;
}

function mapConflictToWorkflow(code) {
  const base = {
    workflow: WORKFLOWS.WEEKLY_EMAIL_BUILD,
    health: HEALTH_STATUS.BLOCKING_ERROR,
    owner: OWNING_AUTOMATIONS.weeklyEmailBuild,
    downstream: "119 → 074 → Make Bulk Email May 18",
    action: "Fix package fields via 072; do not arm Send until Ready package is valid.",
    dataFixRequired: true,
    neverRetry: false,
  };

  switch (code) {
    case "send_armed_not_ready":
      return {
        ...base,
        workflow: WORKFLOWS.WEEKLY_EMAIL_SCHEDULE,
        owner: OWNING_AUTOMATIONS.weeklyEmailScheduleSend,
        action: "Uncheck Send to Make? until Weekly Email Ready? is set by 072.",
      };
    case "sent_checkbox_make_status_mismatch":
    case "make_sent_checkbox_blank":
    case "sent_timestamp_blank":
    case "handoff_writeback_missing":
      return {
        ...base,
        workflow: WORKFLOWS.MAKE_WRITEBACK,
        health: HEALTH_STATUS.BLOCKING_ERROR,
        owner: OWNING_AUTOMATIONS.makeWriteback,
        downstream: "Make Live branch writeback",
        action:
          "Verify Make scenario is Live (not Test). Confirm writeback of Sent?/status/timestamp. Do not clear Sent? from 074.",
        dataFixRequired: false,
        neverRetry: true,
      };
    case "sent_still_armed":
    case "sent_build_armed":
      return {
        ...base,
        workflow: WORKFLOWS.MAKE_HANDOFF,
        health: HEALTH_STATUS.DUPLICATE_RISK,
        owner: OWNING_AUTOMATIONS.weeklyEmailHandoff,
        action: "Clear Send/Build arms on already-sent WAS; never resend without verification.",
        neverRetry: true,
      };
    case "live_forced_test_handoff":
      return {
        ...base,
        workflow: WORKFLOWS.MAKE_HANDOFF,
        health: HEALTH_STATUS.TEST_ONLY,
        owner: OWNING_AUTOMATIONS.weeklyEmailHandoff,
        action:
          "Set 074 sendMode=Live (or blank + WAS Live). Fixed Test blocks Live writeback.",
        dataFixRequired: false,
      };
    case "test_record_treated_live":
      return {
        ...base,
        workflow: WORKFLOWS.MAKE_GMAIL,
        health: HEALTH_STATUS.TEST_ONLY,
        owner: OWNING_AUTOMATIONS.weeklyEmailHandoff,
        action: "Keep Schmidt/test records on Test sendMode; do not treat as Live parents.",
      };
    default:
      return base;
  }
}

function summarizeEmailStatus(f) {
  const parts = [];
  if (getBooleanish(f[WAS_EMAIL_FIELDS.buildNow])) parts.push("BuildArmed");
  if (getBooleanish(f[WAS_EMAIL_FIELDS.ready])) parts.push("Ready");
  if (getBooleanish(f[WAS_EMAIL_FIELDS.sendToMake])) parts.push("SendArmed");
  if (getBooleanish(f[WAS_EMAIL_FIELDS.sent])) parts.push("Sent");
  const ms = getSelectText(f[WAS_EMAIL_FIELDS.makeSendStatus]);
  if (ms) parts.push(`Make:${ms}`);
  const sm = normalizeSendMode(f[WAS_EMAIL_FIELDS.sendMode]);
  if (sm) parts.push(`mode:${sm}`);
  return parts.join("|") || "unknown";
}

function indexById(rows) {
  const map = {};
  for (const r of rows) {
    const id = getRecordId(r);
    if (id) map[id] = r;
  }
  return map;
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = {
  checkWeeklyEmail,
  mapConflictToWorkflow,
  WAS_EMAIL_FIELDS,
};
