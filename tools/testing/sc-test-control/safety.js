"use strict";

const {
  resolvedIdentity,
  CANONICAL_IDENTITY,
  TEST_RECIPIENT_ALLOWLIST,
  executeIdentityAllowed,
  emailExecuteAllowed,
  IDENTITY_STATES,
} = require("./config");

function assertExecuteAllowed(options = {}) {
  const errors = [];
  const {
    execute = false,
    acknowledgeProd = false,
    scenario = null,
    confirmDestructive = false,
  } = options;

  if (!execute) {
    return { allowed: true, mode: "dry-run", errors: [] };
  }

  if (!executeIdentityAllowed(resolvedIdentity.status)) {
    errors.push(
      `identity status is ${resolvedIdentity.status}; --execute requires ${IDENTITY_STATES.VERIFIED_NON_EMAIL} or ${IDENTITY_STATES.VERIFIED_EMAIL}`
    );
  }

  if (!acknowledgeProd) {
    errors.push("--execute requires --acknowledge-prod");
  }

  if (scenario?.requiresIdentity !== false) {
    if (!resolvedIdentity.enrollmentId) {
      errors.push("no resolved enrollmentId; run identity verify first");
    } else if (resolvedIdentity.enrollmentId !== CANONICAL_IDENTITY.enrollmentId) {
      errors.push(
        `wrong enrollmentId ${resolvedIdentity.enrollmentId}; expected ${CANONICAL_IDENTITY.enrollmentId}`
      );
    }
    if (resolvedIdentity.athleteId && resolvedIdentity.athleteId !== CANONICAL_IDENTITY.athleteId) {
      errors.push(
        `wrong athleteId ${resolvedIdentity.athleteId}; expected ${CANONICAL_IDENTITY.athleteId}`
      );
    }
  }

  if (scenario?.blockedBy486) {
    errors.push("scenario blocked by SC-STRUCTURED-HOMEWORK-FILES-001 / PR #486");
  }

  if (scenario?.requiresEmail || scenario?.blockedByEmailInstall) {
    if (!emailExecuteAllowed(resolvedIdentity.status)) {
      errors.push("EMAIL_TEST_IDENTITY_NOT_CONFIGURED — email execute requires IDENTITY_VERIFIED_EMAIL");
    }
    const recipients = scenario?.testRecipients || resolvedIdentity.testRecipientEmails || [];
    if (!recipients.length) {
      errors.push("email scenario requires allowlisted test recipients on enrollment");
    }
    for (const email of recipients) {
      const normalized = String(email).trim().toLowerCase();
      if (!TEST_RECIPIENT_ALLOWLIST.some((a) => a.toLowerCase() === normalized)) {
        errors.push(`recipient not on allowlist: ${email}`);
      }
    }
  }

  if (scenario?.destructive && !confirmDestructive) {
    errors.push("destructive scenario requires --confirm-destructive");
  }

  return { allowed: errors.length === 0, mode: "execute", errors };
}

module.exports = { assertExecuteAllowed };
