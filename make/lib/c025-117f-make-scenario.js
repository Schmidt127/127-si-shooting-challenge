/**
 * C-025 / 117f — DEV Make scenario offline helpers.
 * Pure functions for payload validation, recipient resolution, branded HTML,
 * Data Store records, and webhook HTTP outcomes. No network I/O.
 */

const BRAND = Object.freeze({
  orgName: "127 Sports Intensity",
  primaryBlue: "#0034B7",
  accentOrange: "#FF8B00",
  lightGray: "#F2F2F2",
  darkText: "#262626",
  containerWidth: "640px",
  replyTo: "coach@127sportsintensity.com",
  logoUrl:
    "https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/BlueOrangeCircleLogo.png",
});

const REQUIRED_AUTOMATION = "117f";
const REQUIRED_TEMPLATE = "ZOOM_RECORDING_APPROVED";
const SEND_KEY_PREFIX = "ZOOM_REC_EMAIL|";

/** Redacted placeholder only — never substitute a parent address in tests. */
const REDACTED_MIKE_TEST_INBOX_PLACEHOLDER = "REPLACE_WITH_MIKE_CONTROLLED_TEST_INBOX";

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isRecId(value) {
  return typeof value === "string" && /^rec[a-zA-Z0-9]{14,}$/.test(value.trim());
}

function normalizeText(value) {
  return value == null ? "" : String(value).trim();
}

function isTruthySatisfactory(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (Array.isArray(value) && value.length === 1) return isTruthySatisfactory(value[0]);
  const s = normalizeText(value).toLowerCase();
  return s === "yes" || s === "true" || s === "checked";
}

function isConflictOne(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (Array.isArray(value) && value.length === 1) return isConflictOne(value[0]);
  const n = Number(value);
  return Number.isFinite(n) && n === 1;
}

function linkedIdsContain(linkValue, expectedId) {
  if (!expectedId) return false;
  if (!linkValue) return false;
  if (typeof linkValue === "string") return linkValue === expectedId;
  if (Array.isArray(linkValue)) {
    return linkValue.some((x) => {
      if (!x) return false;
      if (typeof x === "string") return x === expectedId;
      return x.id === expectedId;
    });
  }
  if (typeof linkValue === "object" && linkValue.id) return linkValue.id === expectedId;
  return false;
}

/**
 * Validate inbound 117f webhook payload (Make module 1–4 gates).
 */
function validateInboundPayload(payload = {}) {
  const errors = [];
  const automationNumber = normalizeText(payload.automationNumber);
  const templateKey = normalizeText(payload.templateKey);
  const sendKey = normalizeText(payload.sendKey);
  const enrollmentRid = normalizeText(payload.enrollmentRid);
  const zoomMeetingRid = normalizeText(payload.zoomMeetingRid);
  const zoomAttendanceId = normalizeText(payload.zoomAttendanceId);
  const timing = normalizeText(payload.timing) || "On Satisfactory";

  if (automationNumber !== REQUIRED_AUTOMATION) {
    errors.push(`automationNumber must be "${REQUIRED_AUTOMATION}"`);
  }
  if (templateKey !== REQUIRED_TEMPLATE) {
    errors.push(`templateKey must be "${REQUIRED_TEMPLATE}"`);
  }
  if (!sendKey) {
    errors.push("sendKey is required");
  } else if (!sendKey.startsWith(SEND_KEY_PREFIX)) {
    errors.push(`sendKey must begin with ${SEND_KEY_PREFIX}`);
  }
  if (!isRecId(enrollmentRid)) errors.push("enrollmentRid must be a valid rec id");
  if (!isRecId(zoomMeetingRid)) errors.push("zoomMeetingRid must be a valid rec id");
  if (!isRecId(zoomAttendanceId)) errors.push("zoomAttendanceId must be a valid rec id");

  if (sendKey && enrollmentRid && zoomMeetingRid && zoomAttendanceId) {
    const expected = `${SEND_KEY_PREFIX}${enrollmentRid}|${zoomMeetingRid}|${zoomAttendanceId}`;
    if (sendKey !== expected) {
      errors.push(
        "sendKey must equal ZOOM_REC_EMAIL|{enrollmentRid}|{zoomMeetingRid}|{zoomAttendanceId}"
      );
    }
  }

  if (errors.length) {
    return {
      ok: false,
      httpStatus: 400,
      body: { status: "error", error: errors.join("; ") },
      errors,
    };
  }

  return {
    ok: true,
    normalized: {
      automationNumber,
      templateKey,
      sendKey,
      enrollmentRid,
      zoomMeetingRid,
      zoomAttendanceId,
      timing,
    },
  };
}

/**
 * Data Store: prior successful send for sendKey → skip Gmail, still HTTP 200.
 */
function evaluateDataStoreLookup({ sendKey, existingRecord = null } = {}) {
  if (existingRecord && existingRecord.sendKey === sendKey && existingRecord.status === "sent") {
    return {
      duplicate: true,
      skipGmail: true,
      httpStatus: 200,
      body: {
        status: "already_sent",
        sendKey,
        automationNumber: REQUIRED_AUTOMATION,
      },
    };
  }
  return { duplicate: false, skipGmail: false };
}

/**
 * Revalidate Airtable Get results (Make modules 6–9).
 */
function revalidateAirtableRecords({
  payload,
  zoomAttendance = null,
  enrollment = null,
  zoomMeeting = null,
} = {}) {
  const errors = [];
  if (!zoomAttendance) errors.push("Zoom Attendance record not found");
  if (!enrollment) errors.push("Enrollment record not found");
  if (!zoomMeeting) errors.push("Zoom Meeting record not found");
  if (errors.length) {
    return {
      ok: false,
      httpStatus: 404,
      body: { status: "error", error: errors.join("; ") },
      errors,
    };
  }

  const method = normalizeText(zoomAttendance.attendanceMethod);
  if (method !== "Recording Quiz") {
    errors.push("Attendance Method must be Recording Quiz");
  }
  if (!isTruthySatisfactory(zoomAttendance.satisfactory)) {
    errors.push("Recording Quiz Satisfactory? must be true");
  }
  if (isConflictOne(zoomAttendance.conflict)) {
    errors.push("Zoom Credit Conflict? must not be 1");
  }
  if (!linkedIdsContain(zoomAttendance.enrollmentLink, payload.enrollmentRid)) {
    errors.push("Zoom Attendance Enrollment link does not match enrollmentRid");
  }
  if (!linkedIdsContain(zoomAttendance.zoomMeetingLink, payload.zoomMeetingRid)) {
    errors.push("Zoom Attendance Zoom Meeting link does not match zoomMeetingRid");
  }

  if (errors.length) {
    return {
      ok: false,
      httpStatus: 422,
      body: { status: "error", error: errors.join("; ") },
      errors,
      conflict: isConflictOne(zoomAttendance.conflict),
    };
  }

  return { ok: true };
}

/**
 * Recipient resolution. Test mode NEVER uses parent addresses.
 */
function resolveRecipient({
  sendMode = "test",
  testRecipientEmail = "",
  parentEmailCleaned = "",
  parentEmail = "",
} = {}) {
  const mode = normalizeText(sendMode).toLowerCase() || "test";
  if (mode === "test") {
    const testTo = normalizeText(testRecipientEmail);
    if (!testTo || testTo === REDACTED_MIKE_TEST_INBOX_PLACEHOLDER) {
      return {
        ok: false,
        httpStatus: 400,
        body: {
          status: "error",
          error: "test mode requires Mike-controlled testRecipientEmail (not placeholder)",
        },
        toEmail: "",
        intendedLiveRecipient: "",
      };
    }
    const intended = normalizeText(parentEmailCleaned) || normalizeText(parentEmail);
    return {
      ok: true,
      sendMode: "test",
      toEmail: testTo,
      intendedLiveRecipient: intended || "(none on enrollment)",
      usedParentAddress: false,
    };
  }

  if (mode === "live") {
    const cleaned = normalizeText(parentEmailCleaned);
    const fallback = normalizeText(parentEmail);
    const toEmail = cleaned || fallback;
    if (!toEmail) {
      return {
        ok: false,
        httpStatus: 422,
        body: { status: "error", error: "missing parent recipient email" },
        toEmail: "",
        intendedLiveRecipient: "",
      };
    }
    return {
      ok: true,
      sendMode: "live",
      toEmail,
      intendedLiveRecipient: toEmail,
      usedParentAddress: true,
    };
  }

  return {
    ok: false,
    httpStatus: 400,
    body: { status: "error", error: `unsupported sendMode: ${mode}` },
    toEmail: "",
    intendedLiveRecipient: "",
  };
}

function buildSubject(athleteName) {
  const name = normalizeText(athleteName) || "Athlete";
  return `Zoom Recording Quiz Approved for ${name}`;
}

function summaryRow(label, value) {
  return `
            <tr>
              <td style="padding:4px 0; font-weight:700; color:${BRAND.darkText}; width:165px; vertical-align:top; line-height:1.2;">
                ${escapeHtml(label)}
              </td>
              <td style="padding:4px 0; color:${BRAND.darkText}; line-height:1.2;">
                ${escapeHtml(value == null || value === "" ? "—" : value)}
              </td>
            </tr>`;
}

/**
 * Branded HTML matching 071/073 shell (Make Compose HTML module source).
 */
function buildApprovalEmailHtml({
  parentFirstName = "",
  athleteName = "",
  meetingName = "",
  meetingStartText = "",
  timing = "On Satisfactory",
  xpAmountText = "",
  sendMode = "test",
  intendedLiveRecipient = "",
} = {}) {
  const greetingName = normalizeText(parentFirstName) || "Parent";
  const athlete = normalizeText(athleteName) || "your athlete";

  const modeBanner =
    sendMode === "test"
      ? `
            <div style="background:#fff4e8; border:1px solid #ffd3a1; color:#7a4a00; border-radius:12px; padding:12px 14px; margin:0 0 14px 0; font-size:13px; font-weight:700; line-height:1.35;">
                TEST MODE — This email was generated for review and was not sent to the live parent recipient${
                  intendedLiveRecipient
                    ? ` (intended: ${escapeHtml(intendedLiveRecipient)})`
                    : ""
                }.
            </div>
        `
      : "";

  const headerLogoHtml = `
            <div style="width:68px; height:68px; border-radius:999px; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-left:auto;">
                <img src="${escapeHtml(BRAND.logoUrl)}" alt="127 Sports Intensity Logo" style="display:block; max-width:52px; max-height:52px; width:auto; height:auto;">
            </div>
        `;

  const introHtml = `
        <p style="margin:0; line-height:1.4;">
            Hello ${escapeHtml(greetingName)},
        </p>
        <p style="margin:10px 0 0 0; line-height:1.4;">
            The Zoom recording quiz for ${escapeHtml(athlete)} has been marked <strong>Satisfactory</strong>.
            Recording attendance credit is applied in Airtable according to program rules
            (partial credit and live-vs-recording conflict exclusivity).
        </p>
    `;

  const summaryHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
            ${summaryRow("Athlete", athleteName)}
            ${summaryRow("Meeting", meetingName)}
            ${summaryRow("Meeting Start", meetingStartText)}
            ${summaryRow("Timing", timing)}
            ${xpAmountText ? summaryRow("Recording XP", xpAmountText) : ""}
        </table>
    `;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zoom Recording Quiz Approved</title>
</head>
<body style="margin:0; padding:0; background:${BRAND.lightGray}; font-family:Arial, Helvetica, sans-serif; color:${BRAND.darkText};">
    <div style="padding:20px 12px; background:${BRAND.lightGray};">
        <div style="max-width:${BRAND.containerWidth}; margin:0 auto;">
            ${modeBanner}

            <div style="background:${BRAND.primaryBlue}; color:#ffffff; border-radius:16px; padding:18px 20px; margin:0 0 14px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="vertical-align:middle; padding:0 14px 0 0;">
                            <div style="font-size:21px; font-weight:800; margin:0 0 6px 0; line-height:1.2;">Zoom Recording Quiz Approved</div>
                            <div style="font-size:12px; line-height:1.35; opacity:0.96;">
                                A recording quiz review is complete for your athlete.
                            </div>
                        </td>
                        <td style="width:68px; vertical-align:middle; text-align:right;">
                            ${headerLogoHtml}
                        </td>
                    </tr>
                </table>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${BRAND.accentOrange}; margin:0 0 10px 0;">
                    Update
                </div>
                <div style="font-size:13px; line-height:1.45; color:${BRAND.darkText};">
                    ${introHtml}
                </div>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${BRAND.accentOrange}; margin:0 0 10px 0;">
                    Summary
                </div>
                <div style="font-size:13px; line-height:1.2; color:${BRAND.darkText};">
                    ${summaryHtml}
                </div>
            </div>

            <div style="background:#ffffff; border-radius:14px; padding:18px 20px; margin:0 0 14px 0;">
                <div style="font-size:16px; font-weight:700; color:${BRAND.accentOrange}; margin:0 0 10px 0;">
                    Questions
                </div>
                <div style="font-size:13px; line-height:1.45; color:${BRAND.darkText};">
                    <p style="margin:0 0 10px 0; line-height:1.4;">
                        Please reply if you have any questions about this update or next steps.
                    </p>
                    <p style="margin:0; line-height:1.4;">
                        Thank you,<br>
                        Coach Mike
                    </p>
                </div>
            </div>

            <div style="background:${BRAND.primaryBlue}; color:#ffffff; border-radius:16px; padding:16px 20px; font-size:12px; line-height:1.35;">
                127 Sports Intensity<br>
                Youth sports communication and development support
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Data Store success record — write only after Gmail succeeds.
 */
function buildDataStoreSuccessRecord({
  sendKey,
  zoomAttendanceId,
  gmailMessageId = "",
  sentAtIso = null,
} = {}) {
  return {
    key: sendKey,
    sendKey,
    status: "sent",
    zoomAttendanceId,
    gmailMessageId: gmailMessageId || "",
    sentAt: sentAtIso || new Date().toISOString(),
    automationNumber: REQUIRED_AUTOMATION,
    templateKey: REQUIRED_TEMPLATE,
  };
}

function buildWebhookSuccessResponse({ sendKey, duplicate = false } = {}) {
  return {
    httpStatus: 200,
    body: {
      status: duplicate ? "already_sent" : "sent",
      sendKey,
      automationNumber: REQUIRED_AUTOMATION,
    },
  };
}

function buildWebhookErrorResponse({ httpStatus = 400, error = "error" } = {}) {
  return {
    httpStatus,
    body: { status: "error", error: String(error) },
  };
}

/**
 * Full offline scenario simulation (no network).
 */
function simulateMakeScenario({
  payload,
  dataStoreRecord = null,
  zoomAttendance = null,
  enrollment = null,
  zoomMeeting = null,
  sendMode = "test",
  testRecipientEmail = "",
  gmailSucceeds = true,
} = {}) {
  const steps = [];
  const inbound = validateInboundPayload(payload);
  steps.push({ module: "validate_payload", ok: inbound.ok });
  if (!inbound.ok) {
    return { ...inbound, steps, gmailAttempted: false, dataStoreWrite: null };
  }

  const ds = evaluateDataStoreLookup({
    sendKey: inbound.normalized.sendKey,
    existingRecord: dataStoreRecord,
  });
  steps.push({ module: "data_store_lookup", duplicate: ds.duplicate });
  if (ds.duplicate) {
    return {
      ok: true,
      httpStatus: 200,
      body: ds.body,
      steps,
      gmailAttempted: false,
      dataStoreWrite: null,
      duplicate: true,
    };
  }

  const reval = revalidateAirtableRecords({
    payload: inbound.normalized,
    zoomAttendance,
    enrollment,
    zoomMeeting,
  });
  steps.push({ module: "revalidate_airtable", ok: reval.ok });
  if (!reval.ok) {
    return { ...reval, steps, gmailAttempted: false, dataStoreWrite: null };
  }

  const recipient = resolveRecipient({
    sendMode,
    testRecipientEmail,
    parentEmailCleaned: enrollment.parentEmailCleaned,
    parentEmail: enrollment.parentEmail,
  });
  steps.push({ module: "resolve_recipient", ok: recipient.ok, sendMode: recipient.sendMode });
  if (!recipient.ok) {
    return { ...recipient, steps, gmailAttempted: false, dataStoreWrite: null };
  }

  const subject = buildSubject(enrollment.athleteName);
  const html = buildApprovalEmailHtml({
    parentFirstName: enrollment.parentFirstName,
    athleteName: enrollment.athleteName,
    meetingName: zoomMeeting.meetingName,
    meetingStartText: zoomMeeting.startTimeText,
    timing: inbound.normalized.timing,
    xpAmountText: zoomAttendance.xpAmountText || "",
    sendMode: recipient.sendMode,
    intendedLiveRecipient: recipient.intendedLiveRecipient,
  });
  steps.push({ module: "compose_html", subject });

  if (!gmailSucceeds) {
    steps.push({ module: "gmail", ok: false });
    return {
      ok: false,
      httpStatus: 502,
      body: { status: "error", error: "Gmail send failed" },
      steps,
      gmailAttempted: true,
      dataStoreWrite: null,
      subject,
      html,
      toEmail: recipient.toEmail,
    };
  }

  steps.push({ module: "gmail", ok: true, toEmail: recipient.toEmail });
  const dataStoreWrite = buildDataStoreSuccessRecord({
    sendKey: inbound.normalized.sendKey,
    zoomAttendanceId: inbound.normalized.zoomAttendanceId,
    gmailMessageId: "sim-msg-1",
  });
  steps.push({ module: "data_store_write", ok: true });
  const success = buildWebhookSuccessResponse({ sendKey: inbound.normalized.sendKey });
  steps.push({ module: "webhook_response", httpStatus: 200 });

  return {
    ok: true,
    httpStatus: success.httpStatus,
    body: success.body,
    steps,
    gmailAttempted: true,
    dataStoreWrite,
    subject,
    html,
    toEmail: recipient.toEmail,
    usedParentAddress: recipient.usedParentAddress,
    duplicate: false,
  };
}

module.exports = {
  BRAND,
  REQUIRED_AUTOMATION,
  REQUIRED_TEMPLATE,
  SEND_KEY_PREFIX,
  REDACTED_MIKE_TEST_INBOX_PLACEHOLDER,
  escapeHtml,
  validateInboundPayload,
  evaluateDataStoreLookup,
  revalidateAirtableRecords,
  resolveRecipient,
  buildSubject,
  buildApprovalEmailHtml,
  buildDataStoreSuccessRecord,
  buildWebhookSuccessResponse,
  buildWebhookErrorResponse,
  simulateMakeScenario,
};
