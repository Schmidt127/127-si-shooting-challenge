/**
 * Season Launch Control System — state machine contract.
 *
 * Repository-side only. Proposed production fields documented but not created.
 * Softr is Obsolete / Not Used — front-end validation targets Next.js `/shoot`.
 */

"use strict";

const LAUNCH_STATES = Object.freeze([
  "Draft",
  "Dates Pending",
  "Weeks Generated",
  "Weeks Imported",
  "Config Validated",
  "Forms Updated",
  "Automations Validated",
  "Make Validated",
  "Web Validated",
  "Test Ready",
  "Test Passed",
  "Approved for Live",
  "Live",
  "Paused",
  "Closed",
  "Rolled Back",
  "Blocking Error",
]);

/** Allowed forward/side transitions (rollback is always available except Draft). */
const TRANSITIONS = Object.freeze({
  Draft: ["Dates Pending", "Blocking Error"],
  "Dates Pending": ["Weeks Generated", "Draft", "Blocking Error"],
  "Weeks Generated": ["Weeks Imported", "Dates Pending", "Blocking Error"],
  "Weeks Imported": ["Config Validated", "Weeks Generated", "Blocking Error"],
  "Config Validated": ["Forms Updated", "Weeks Imported", "Blocking Error"],
  "Forms Updated": ["Automations Validated", "Config Validated", "Blocking Error"],
  "Automations Validated": ["Make Validated", "Forms Updated", "Blocking Error"],
  "Make Validated": ["Web Validated", "Automations Validated", "Blocking Error"],
  "Web Validated": ["Test Ready", "Make Validated", "Blocking Error"],
  "Test Ready": ["Test Passed", "Web Validated", "Blocking Error"],
  "Test Passed": ["Approved for Live", "Test Ready", "Blocking Error"],
  "Approved for Live": ["Live", "Test Passed", "Blocking Error", "Rolled Back"],
  Live: ["Paused", "Closed", "Rolled Back", "Blocking Error"],
  Paused: ["Live", "Rolled Back", "Closed", "Blocking Error"],
  Closed: ["Rolled Back"],
  "Rolled Back": ["Draft", "Dates Pending"],
  "Blocking Error": ["Draft", "Dates Pending", "Weeks Generated", "Rolled Back"],
});

const REQUIRED_CHECKS = Object.freeze({
  "Dates Pending": ["new_config_dates_present", "week_zero_sunday", "regular_week_count"],
  "Weeks Generated": ["week_plan_validation_pass", "canonical_week_codes"],
  "Weeks Imported": ["weeks_present_in_export", "no_week_gaps_overlaps"],
  "Config Validated": ["exactly_one_target_config", "no_multiple_active_configs"],
  "Forms Updated": ["fillout_checklist_complete"],
  "Automations Validated": ["automation_hardcode_audit_pass", "season_sensitive_automations_reviewed"],
  "Make Validated": ["make_checklist_complete", "weekly_email_scenario_preserved"],
  "Web Validated": ["web_checklist_complete"],
  "Test Ready": ["schmidt_test_plan_ready", "test_mode_gates_documented"],
  "Test Passed": ["schmidt_controlled_tests_pass"],
  "Approved for Live": ["preflight_pass", "mike_operational_approval"],
  Live: ["activation_evidence_recorded", "single_current_config"],
});

const PROPOSED_LAUNCH_FIELDS = Object.freeze({
  table: "Config",
  fields: [
    {
      name: "Launch Status",
      type: "singleSelect",
      options: LAUNCH_STATES,
      note: "Season Launch Control System state (Softr Validated removed — Obsolete)",
    },
    {
      name: "Launch Status Updated At",
      type: "dateTime",
      timezone: "America/Denver",
    },
    {
      name: "Launch Evidence URL",
      type: "url",
      note: "Link to preflight/manifest artifact folder or doc",
    },
    {
      name: "Launch Blocking Error",
      type: "multilineText",
    },
    {
      name: "Launch Operator",
      type: "singleLineText",
      note: "Mike / ops initials",
    },
  ],
  authorization: "Mike must authorize schema create — do not auto-create",
});

/** Map obsolete state labels still present in old notes/fixtures. */
const OBSOLETE_STATE_ALIASES = Object.freeze({
  "Softr Validated": "Web Validated",
});

function normalizeLaunchState(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return { ok: false, code: "blank_launch_state", message: "Launch state is blank." };
  }
  const aliased = OBSOLETE_STATE_ALIASES[text] || text;
  const match = LAUNCH_STATES.find((s) => s.toLowerCase() === aliased.toLowerCase());
  if (!match) {
    return {
      ok: false,
      code: "unknown_launch_state",
      message: `Unknown launch state "${text}".`,
    };
  }
  return { ok: true, state: match };
}

function canTransition(fromState, toState) {
  const from = normalizeLaunchState(fromState);
  const to = normalizeLaunchState(toState);
  if (!from.ok) return { ok: false, ...from };
  if (!to.ok) return { ok: false, ...to };
  const allowed = TRANSITIONS[from.state] || [];
  if (!allowed.includes(to.state)) {
    return {
      ok: false,
      code: "transition_not_allowed",
      message: `Cannot transition ${from.state} → ${to.state}.`,
      allowed,
    };
  }
  return {
    ok: true,
    from: from.state,
    to: to.state,
    requiredChecks: REQUIRED_CHECKS[to.state] || [],
  };
}

/**
 * Evaluate whether a transition is blocked by missing evidence/checks.
 * @param {object} input
 */
function evaluateTransition(input = {}) {
  const gate = canTransition(input.fromState, input.toState);
  if (!gate.ok) {
    return {
      ok: false,
      status: "FAIL",
      ...gate,
      blockingConditions: [gate.message],
      evidence: input.evidence || {},
    };
  }

  const evidence = input.evidence || {};
  const completedChecks = new Set(input.completedChecks || evidence.completedChecks || []);
  // Accept obsolete Softr checklist evidence as web checklist for old manifests.
  if (completedChecks.has("softr_checklist_complete")) {
    completedChecks.add("web_checklist_complete");
  }
  const missing = (gate.requiredChecks || []).filter((c) => !completedChecks.has(c));
  const testOnly = Boolean(input.testMode || evidence.testMode);
  const restrictions = [];

  if (gate.to === "Live" && testOnly) {
    restrictions.push("Test Mode Config cannot transition to Live.");
  }
  if (gate.to === "Live" && evidence.multipleActiveConfigs) {
    missing.push("single_current_config");
  }

  const blockingConditions = [
    ...missing.map((c) => `Missing required check/evidence: ${c}`),
    ...restrictions,
  ];

  return {
    ok: blockingConditions.length === 0,
    status: blockingConditions.length ? "FAIL" : "PASS",
    from: gate.from,
    to: gate.to,
    requiredChecks: gate.requiredChecks,
    missingChecks: missing,
    blockingConditions,
    responsibleSystem: "Season Launch Control System (repository) + Mike ops",
    responsibleOperator: input.operator || "Mike",
    timestamp: input.now || new Date().toISOString(),
    testVersusLiveRestriction: testOnly
      ? "Test Mode may reach Test Passed; Live requires non-test Config"
      : null,
    rollbackTransition: {
      from: gate.to,
      to: gate.to === "Live" || gate.to === "Approved for Live" ? "Rolled Back" : "Blocking Error",
    },
  };
}

function createLaunchRecord(input = {}) {
  const state = normalizeLaunchState(input.state || "Draft");
  return {
    configRecordId: input.configRecordId || null,
    challengeYear: input.challengeYear || null,
    state: state.ok ? state.state : "Draft",
    updatedAt: input.now || new Date().toISOString(),
    operator: input.operator || null,
    evidenceUrl: input.evidenceUrl || null,
    blockingError: input.blockingError || null,
    testMode: Boolean(input.testMode),
    completedChecks: input.completedChecks || [],
    proposedFields: PROPOSED_LAUNCH_FIELDS,
  };
}

module.exports = {
  LAUNCH_STATES,
  TRANSITIONS,
  REQUIRED_CHECKS,
  PROPOSED_LAUNCH_FIELDS,
  OBSOLETE_STATE_ALIASES,
  normalizeLaunchState,
  canTransition,
  evaluateTransition,
  createLaunchRecord,
};
