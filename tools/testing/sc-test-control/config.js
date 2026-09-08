"use strict";

const BASE_ID = "appn84sqPw03zEbTT";

/** Historical SC-004 IDs — HISTORICAL / MUST REVERIFY — do not use for --execute */
const HISTORICAL_IDENTITY = Object.freeze({
  athleteId: "recgqVstObQRzgXJF",
  enrollmentId: "recgP9qZYjAhE7NXm",
  foundationWeekId: "recVDKiYATgzsfpmE",
  wasId: "recuxvGq2kY8WKcey",
  scenarioId: "recPdyfYRFgDtpzQ8",
  homeworkCompletionId: "recrBnHbLvDpFyIeO",
  homeworkXpId: "rec6xE4V1t0atiTIP",
});

/** Candidate disposable harness enrollments — verify live before trusting */
const CANDIDATE_ENROLLMENTS = Object.freeze([
  { id: "recZEwkkXTJanDlG6", label: "Athlete1 Schmidt (Sept 2026 audits)" },
  { id: "recNu6fcBpF1GG3u5", label: "Testing3 SC-ATHLETE-WF" },
  { id: "recCyFEPeATOVNlr9", label: "115 allowlist alternate" },
]);

/** Populated only after successful `identity verify` with live PAT */
const resolvedIdentity = {
  status: "IDENTITY_RECONTRACT_REQUIRED",
  athleteId: null,
  enrollmentId: null,
  programInstanceId: null,
  active: null,
  weekId: null,
  wasId: null,
  testRecipientEmails: [],
  verifiedAt: null,
};

const TEST_RECIPIENT_ALLOWLIST = Object.freeze([
  "schmidt@fairfieldbasketballclub.com",
  "mschmidt@fairfield.k12.mt.us",
]);

const PROGRAM_INSTANCE_HINT = "rec5mEM0YPqPqq0hZ";

module.exports = {
  BASE_ID,
  HISTORICAL_IDENTITY,
  CANDIDATE_ENROLLMENTS,
  resolvedIdentity,
  TEST_RECIPIENT_ALLOWLIST,
  PROGRAM_INSTANCE_HINT,
  EVIDENCE_DIR: "docs/testing/evidence/2026-09-08",
};
