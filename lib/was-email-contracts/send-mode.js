/**
 * Weekly email sendMode resolution — mirrors automation 074 v2.1.
 *
 * Resolution order (verified PROD 2026-07-24):
 *   input → WAS.sendMode → payloadJson.sendMode → default "test"
 *
 * Make routing (scenario: Weekly Athlete Summary - Bulk Email - May 18):
 *   test → Test branch (test recipient; no Sent? writeback)
 *   live → Live branch (parent recipients; Sent?/status/timestamp writeback)
 *
 * Evidence: docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md
 */
"use strict";

function firstNonBlank(...values) {
  for (const value of values) {
    const text = String(value == null ? "" : value).trim();
    if (text) return text;
  }
  return "";
}

function normalizeSendMode(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["live", "l", "real", "send", "parent"].includes(raw)) return "live";
  if (["test", "t", "preview", "practice", "draft"].includes(raw)) return "test";
  return "";
}

/**
 * @param {{ input?: string, wasSendMode?: string, payloadSendMode?: string, defaultMode?: string }} args
 * @returns {"live"|"test"}
 */
function resolveWeeklyEmailSendMode({
  input = "",
  wasSendMode = "",
  payloadSendMode = "",
  defaultMode = "test",
} = {}) {
  const resolved = firstNonBlank(
    normalizeSendMode(input),
    normalizeSendMode(wasSendMode),
    normalizeSendMode(payloadSendMode),
    normalizeSendMode(defaultMode),
    "test"
  );
  return resolved === "live" ? "live" : "test";
}

/**
 * Pure contract for Make branch expectations after 074 posts.
 * 074 never writes Sent?; Make Live owns writeback.
 */
function describeMakeRouteExpectations(sendMode) {
  const mode = resolveWeeklyEmailSendMode({ input: sendMode });
  if (mode === "live") {
    return {
      sendMode: "live",
      makeBranch: "live",
      recipientSource: "csvemail",
      writesSentStatus: true,
      writesMakeSendStatus: true,
      writesSentTimestamp: true,
      falselyClaimsLiveWriteback: false,
    };
  }
  return {
    sendMode: "test",
    makeBranch: "test",
    recipientSource: "testRecipientEmail",
    writesSentStatus: false,
    writesMakeSendStatus: false,
    writesSentTimestamp: false,
    falselyClaimsLiveWriteback: false,
  };
}

/**
 * 074 payload recipient selection (toEmail field).
 */
function select074ToEmail({ sendMode, testRecipientEmail = "", recipientsCsv = "" }) {
  const mode = resolveWeeklyEmailSendMode({ input: sendMode });
  return mode === "test" ? String(testRecipientEmail || "").trim() : String(recipientsCsv || "").trim();
}

/**
 * Whether 074 script is allowed to mark Weekly Email Sent?.
 * Contract answer: never — Make Live writeback owns it.
 */
function script074MayWriteSentStatus() {
  return false;
}

module.exports = {
  firstNonBlank,
  normalizeSendMode,
  resolveWeeklyEmailSendMode,
  describeMakeRouteExpectations,
  select074ToEmail,
  script074MayWriteSentStatus,
};
