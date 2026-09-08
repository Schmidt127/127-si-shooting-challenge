"use strict";

const { resolvedIdentity, TEST_RECIPIENT_ALLOWLIST } = require("./config");

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

  if (resolvedIdentity.status !== "IDENTITY_VERIFIED") {
    errors.push(
      `identity status is ${resolvedIdentity.status}; --execute requires IDENTITY_VERIFIED`
    );
  }

  if (!acknowledgeProd) {
    errors.push("--execute requires --acknowledge-prod");
  }

  if (scenario?.requiresIdentity !== false && !resolvedIdentity.enrollmentId) {
    errors.push("no resolved enrollmentId; run identity verify after operator restore");
  }

  if (scenario?.blockedBy486) {
    errors.push("scenario blocked by SC-STRUCTURED-HOMEWORK-FILES-001 / PR #486");
  }

  if (scenario?.requiresEmail) {
    const recipients = scenario.testRecipients || resolvedIdentity.testRecipientEmails || [];
    if (!recipients.length) {
      errors.push("email scenario requires test recipients");
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
