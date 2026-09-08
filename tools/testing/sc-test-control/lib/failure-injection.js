"use strict";

/**
 * Generic failure-injection helpers for SC-008 (offline/mock only).
 * Does not alter Production configuration.
 */

function httpError(status, body = "") {
  return { ok: false, status, bodyText: body, headers: {} };
}

function httpSuccess(body, status = 200) {
  return { ok: true, status, bodyText: typeof body === "string" ? body : JSON.stringify(body), headers: {} };
}

const FAILURE_PRESETS = Object.freeze({
  HTTP_400: () => httpError(400, "Bad Request"),
  HTTP_401: () => httpError(401, "Unauthorized"),
  HTTP_403: () => httpError(403, "Forbidden"),
  HTTP_404: () => httpError(404, "Not Found"),
  HTTP_429: () => httpError(429, "Too Many Requests"),
  HTTP_500: () => httpError(500, "Internal Server Error"),
  MALFORMED_JSON: () => httpSuccess("{not-json"),
  SEMANTIC_200_FAILURE: () =>
    httpSuccess({ accepted: true, sent: false, error: "provider rejected silently" }),
  TIMEOUT: () => ({ ok: false, status: null, bodyText: "", timedOut: true }),
  MISSING_ATTACHMENT: () => ({ error: "missing_attachment", fields: {} }),
  MISSING_SOURCE_RECORD: () => ({ error: "missing_enrollment", recordId: null }),
  WRONG_OWNERSHIP: () => ({ error: "wrong_ownership", expectedEnrollment: "recX", actualEnrollment: "recY" }),
  MISSING_WEEK: () => ({ error: "missing_week", weekId: null }),
  UNSUPPORTED_ROUTE: () => ({ error: "unsupported_route", routeKey: "invalid/route" }),
});

function simulateFailure(presetName) {
  const fn = FAILURE_PRESETS[presetName];
  if (!fn) throw new Error(`Unknown failure preset: ${presetName}`);
  return fn();
}

function listPresets() {
  return Object.keys(FAILURE_PRESETS);
}

module.exports = {
  FAILURE_PRESETS,
  simulateFailure,
  listPresets,
  httpError,
  httpSuccess,
};
