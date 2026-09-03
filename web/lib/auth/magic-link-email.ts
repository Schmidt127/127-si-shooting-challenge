import {
  getAthleteAuthTestRecipient,
  getResendApiKey,
  getResendFromEmail,
  isAthleteAuthDevBypassEnabled,
  isAthleteAuthTestMode,
} from "@/lib/auth/config";

export type MagicLinkEmailPayload = {
  toEmail: string;
  magicLinkUrl: string;
};

export type MagicLinkEmailResult =
  | { ok: true; deliveredTo: string; transport: "resend" | "dev_bypass" | "test_stub" }
  | { ok: false; reason: "not_configured" | "send_failed" };

function resolveDeliveryRecipient(requestedEmail: string): string {
  if (isAthleteAuthTestMode()) {
    return getAthleteAuthTestRecipient();
  }
  return requestedEmail;
}

export async function sendMagicLinkEmail(
  payload: MagicLinkEmailPayload,
): Promise<MagicLinkEmailResult> {
  const deliveredTo = resolveDeliveryRecipient(payload.toEmail);

  if (isAthleteAuthDevBypassEnabled()) {
    console.info("[athlete-auth] DEV_BYPASS magic link", {
      requestedEmail: payload.toEmail,
      deliveredTo,
      magicLinkUrl: payload.magicLinkUrl,
    });
    return { ok: true, deliveredTo, transport: "dev_bypass" };
  }

  const apiKey = getResendApiKey();
  const fromEmail = getResendFromEmail();

  if (!apiKey || !fromEmail) {
    if (isAthleteAuthTestMode()) {
      console.info("[athlete-auth] TEST_MODE stub magic link", {
        requestedEmail: payload.toEmail,
        deliveredTo,
        magicLinkUrl: payload.magicLinkUrl,
      });
      return { ok: true, deliveredTo, transport: "test_stub" };
    }
    return { ok: false, reason: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [deliveredTo],
      subject: "Your Shooting Challenge dashboard sign-in link",
      html: buildMagicLinkHtml(payload.magicLinkUrl),
      text: buildMagicLinkText(payload.magicLinkUrl),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { ok: false, reason: "send_failed" };
  }

  return { ok: true, deliveredTo, transport: "resend" };
}

function buildMagicLinkText(url: string): string {
  return [
    "Use this secure link to open your family's Shooting Challenge dashboard:",
    url,
    "",
    "This link expires soon and works only once. If you did not request this email, you can ignore it.",
  ].join("\n");
}

function buildMagicLinkHtml(url: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#262626;line-height:1.5"><p>Use the button below to open your family's Shooting Challenge dashboard.</p><p><a href="${url}" style="display:inline-block;background:#FF8B00;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Open dashboard</a></p><p style="font-size:13px;color:#555">This link expires soon and works only once. If you did not request this email, you can ignore it.</p></body></html>`;
}
