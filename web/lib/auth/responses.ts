import { NextResponse } from "next/server";

import { MAGIC_LINK_CONFIRMATION_MESSAGE } from "@/lib/auth/config";

export function magicLinkRequestSuccessResponse(): NextResponse {
  return NextResponse.json({
    ok: true,
    message: MAGIC_LINK_CONFIRMATION_MESSAGE,
  });
}

export function magicLinkRateLimitedResponse(): NextResponse {
  return NextResponse.json({
    ok: true,
    message: MAGIC_LINK_CONFIRMATION_MESSAGE,
  });
}

export function magicLinkMisconfiguredResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      message: "Family sign-in is temporarily unavailable. Please try again later.",
    },
    { status: 503 },
  );
}

export function magicLinkInvalidEmailResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      message: "Enter the parent email address used when you registered for the Shooting Challenge.",
    },
    { status: 400 },
  );
}

export function sanitizeUserFacingError(error: unknown): string {
  if (error instanceof Error && error.message.toLowerCase().includes("rate")) {
    return "Too many requests. Please wait a few minutes and try again.";
  }
  return "Something went wrong. Please try again later.";
}

/** Strip Airtable record ids and stack traces from user-visible strings. */
export function stripInternalDetails(message: string): string {
  return message
    .replace(/\brec[a-zA-Z0-9]{14}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
