"use strict";

const BASE_ID = "appn84sqPw03zEbTT";

/** Canonical controlled identity — IDENTITY_VERIFIED_NON_EMAIL (2026-09-08) */
const CANONICAL_IDENTITY = Object.freeze({
  athleteId: "recshWT5DQPUZXDvr",
  athleteLabel: "Testing Schmidt",
  enrollmentId: "recn54wbxTjygydqa",
  programInstanceId: "rec5mEM0YPqPqq0hZ",
  gradeBand: "9-12",
  schoolYear: "2026-2027",
  grade: "12",
});

/** Historical SC-004 IDs — PURGED — do not use for --execute */
const HISTORICAL_IDENTITY = Object.freeze({
  athleteId: "recgqVstObQRzgXJF",
  enrollmentId: "recgP9qZYjAhE7NXm",
  foundationWeekId: "recVDKiYATgzsfpmE",
  wasId: "recuxvGq2kY8WKcey",
  scenarioId: "recPdyfYRFgDtpzQ8",
  homeworkCompletionId: "recrBnHbLvDpFyIeO",
  homeworkXpId: "rec6xE4V1t0atiTIP",
});

/** Populated by `identity verify` with live PAT */
const resolvedIdentity = {
  status: "IDENTITY_VERIFIED_NON_EMAIL",
  athleteId: CANONICAL_IDENTITY.athleteId,
  enrollmentId: CANONICAL_IDENTITY.enrollmentId,
  programInstanceId: CANONICAL_IDENTITY.programInstanceId,
  gradeBand: CANONICAL_IDENTITY.gradeBand,
  active: true,
  weekId: null,
  wasId: null,
  testRecipientEmails: [],
  athleteLabel: CANONICAL_IDENTITY.athleteLabel,
  verifiedAt: null,
};

const TEST_RECIPIENT_ALLOWLIST = Object.freeze([
  "schmidt@fairfieldbasketballclub.com",
  "mschmidt@fairfield.k12.mt.us",
]);

const IDENTITY_STATES = Object.freeze({
  VERIFIED_NON_EMAIL: "IDENTITY_VERIFIED_NON_EMAIL",
  VERIFIED_EMAIL: "IDENTITY_VERIFIED_EMAIL",
  RECONTRACT: "IDENTITY_RECONTRACT_REQUIRED",
  BLOCKED: "IDENTITY_BLOCKED",
});

function executeIdentityAllowed(status) {
  return (
    status === IDENTITY_STATES.VERIFIED_NON_EMAIL ||
    status === IDENTITY_STATES.VERIFIED_EMAIL
  );
}

function emailExecuteAllowed(status) {
  return status === IDENTITY_STATES.VERIFIED_EMAIL;
}

module.exports = {
  BASE_ID,
  CANONICAL_IDENTITY,
  HISTORICAL_IDENTITY,
  resolvedIdentity,
  TEST_RECIPIENT_ALLOWLIST,
  IDENTITY_STATES,
  executeIdentityAllowed,
  emailExecuteAllowed,
  EVIDENCE_DIR: "docs/testing/evidence/2026-09-08",
};
