/**
 * Empty-week weekly email policy (SC-035).
 * Pure helpers for 072 package build + Node tests.
 *
 * Product default (2026-07-24): send_short
 * - send_short  → concise no-activity reminder (empty weeks only)
 * - send_normal → full weekly summary even when empty
 * - suppress    → no send-ready package for empty weeks
 * Non-empty weeks always build the full summary.
 */

"use strict";

const ALLOWED = new Set(["send_normal", "send_short", "suppress"]);

/** @param {unknown} raw */
function normalizeEmptyWeekPolicy(raw) {
  const p = String(raw == null ? "" : raw)
    .trim()
    .toLowerCase();
  if (ALLOWED.has(p)) return p;
  // Approved product default when blank/unknown.
  return "send_short";
}

/**
 * Zero-activity week detection for package branching.
 * Placeholder / "Not submitted" video rows do not count as activity.
 */
function isEmptyWeekActivity({
  countedSubmissionCount = 0,
  totalShots = 0,
  daysLogged = 0,
  homeworkSatisfactoryCount = 0,
  zoomAttendedCount = 0,
  videoFeedbackCount = 0,
  weeklyXp = 0,
} = {}) {
  return (
    Number(countedSubmissionCount || 0) === 0 &&
    Number(totalShots || 0) === 0 &&
    Number(daysLogged || 0) === 0 &&
    Number(homeworkSatisfactoryCount || 0) === 0 &&
    Number(zoomAttendedCount || 0) === 0 &&
    Number(videoFeedbackCount || 0) === 0 &&
    Number(weeklyXp || 0) === 0
  );
}

/**
 * @param {{ policy?: string, isEmpty: boolean }} args
 */
function resolveEmptyWeekBuildPlan({ policy, isEmpty }) {
  const p = normalizeEmptyWeekPolicy(policy);
  if (!isEmpty) {
    return {
      policy: p,
      isEmpty: false,
      buildMode: "full",
      actionOut: "built_full",
      sendReady: true,
      enforced: true,
    };
  }
  if (p === "suppress") {
    return {
      policy: p,
      isEmpty: true,
      buildMode: "suppress",
      actionOut: "skipped_empty_week_suppress",
      sendReady: false,
      enforced: true,
    };
  }
  if (p === "send_short") {
    return {
      policy: p,
      isEmpty: true,
      buildMode: "short",
      actionOut: "built_short_empty_week",
      sendReady: true,
      enforced: true,
    };
  }
  return {
    policy: "send_normal",
    isEmpty: true,
    buildMode: "full",
    actionOut: "built_full_empty_week",
    sendReady: true,
    enforced: true,
  };
}

/**
 * Concise no-activity reminder package (HTML/text/subject).
 * Caller supplies escapeHtml + brand colors matching 072.
 */
function buildShortNoActivityEmail({
  brandName = "127 Sports Intensity",
  brand = {},
  athleteName = "Athlete",
  weekLabel = "This week",
  weeklyGoalTarget = 0,
  escapeHtml = (v) => String(v == null ? "" : v),
} = {}) {
  const blue = brand.blue || "#0034B7";
  const orange = brand.orange || "#FF8B00";
  const bg = brand.bg || "#F2F2F2";
  const textColor = brand.text || "#262626";
  const card = brand.card || "#FFFFFF";
  const border = brand.border || "#D9DDE8";
  const width = brand.width || "720px";

  const safeAthlete = escapeHtml(athleteName);
  const safeWeek = escapeHtml(weekLabel);
  const safeBrand = escapeHtml(brandName);
  const goalLine =
    Number(weeklyGoalTarget || 0) > 0
      ? `This week's shot target is <strong>${escapeHtml(String(Math.round(Number(weeklyGoalTarget))))}</strong> shots when you log activity.`
      : `Log even one shooting day this week to get back on the weekly summary scoreboard.`;

  const subject = `${brandName} Weekly Check-In | ${athleteName} | ${weekLabel}`;

  const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin:0;padding:0;background:${bg};font-family:Arial,Helvetica,sans-serif;color:${textColor};">
      <div style="background:${bg};padding:16px 10px;">
        <div style="max-width:${width};margin:0 auto;">
          <div style="background:${blue};border-radius:16px;padding:18px 20px;margin:0 0 12px 0;color:#FFFFFF;">
            <div style="font-size:9px;letter-spacing:.45px;text-transform:uppercase;opacity:.95;margin:0 0 4px 0;">Weekly Check-In</div>
            <div style="font-size:21px;line-height:1.15;font-weight:800;margin:0 0 5px 0;">${safeAthlete}</div>
            <div style="font-size:11px;line-height:1.35;opacity:.95;">${safeWeek}</div>
          </div>

          <div style="background:${card};border:1px solid ${border};border-radius:14px;padding:13px 15px;margin:0 0 12px 0;">
            <div style="font-size:14px;line-height:1.25;font-weight:800;color:${orange};margin:0 0 8px 0;">
              No activity logged this week
            </div>
            <div style="font-size:11px;line-height:1.45;color:${textColor};">
              <p style="margin:0 0 8px 0;">Hello,</p>
              <p style="margin:0 0 8px 0;">
                We did not record shooting, homework, Zoom, or video activity for
                <strong>${safeAthlete}</strong> during <strong>${safeWeek}</strong>.
              </p>
              <p style="margin:0 0 8px 0;">
                This is a short reminder to get back on track — not a full weekly score report.
              </p>
              <p style="margin:0 0 8px 0;">${goalLine}</p>
              <p style="margin:0;">Questions are always welcome.</p>
            </div>
          </div>

          <div style="background:${blue};border-radius:14px;padding:12px 14px;color:#FFFFFF;">
            <div style="font-size:10px;font-weight:700;margin:0 0 3px 0;">${safeBrand}</div>
            <div style="font-size:9px;line-height:1.35;opacity:.95;">Empty-week reminder (send_short)</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  const textBody = [
    "Weekly Check-In",
    athleteName,
    weekLabel,
    "",
    "No activity logged this week.",
    "This is a short reminder to get back on track — not a full weekly score report.",
    Number(weeklyGoalTarget || 0) > 0
      ? `Weekly shot target when active: ${Math.round(Number(weeklyGoalTarget))} shots.`
      : "Log even one shooting day this week to return to the full weekly summary.",
    "",
    "Questions are always welcome.",
    brandName,
  ].join("\n");

  return {
    subject,
    html,
    text: textBody,
    packageKind: "short_no_activity",
  };
}

/**
 * Operator-facing policy resolver (enforced).
 * @param {unknown} policy
 */
function resolveEmptyWeekEmailPolicy(policy) {
  const p = normalizeEmptyWeekPolicy(policy);
  return {
    policy: p,
    enforced: true,
    reason:
      p === "send_short"
        ? "Empty weeks build a short no-activity reminder in 072."
        : p === "suppress"
          ? "Empty weeks do not produce a send-ready package in 072."
          : "Empty weeks still receive the full weekly summary package.",
  };
}

module.exports = {
  ALLOWED_EMPTY_WEEK_POLICIES: ["send_normal", "send_short", "suppress"],
  normalizeEmptyWeekPolicy,
  isEmptyWeekActivity,
  resolveEmptyWeekBuildPlan,
  buildShortNoActivityEmail,
  resolveEmptyWeekEmailPolicy,
};
