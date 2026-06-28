import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAirtableConfigStatus, validateAirtableToken } from "@/lib/airtable/client";
import { isSiteAccessAuthorized } from "@/lib/security";

/** Always read env at request time (not from a stale static build). */
export const dynamic = "force-dynamic";

/**
 * Health route for the Airtable pipeline.
 * GET /api/airtable — config status only (no live table fetch).
 */
export async function GET(request: NextRequest) {
  if (!isSiteAccessAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const config = getAirtableConfigStatus();
  const tokenCheck = config.hasToken ? await validateAirtableToken() : null;
  const tokenValid = tokenCheck?.valid ?? false;

  return NextResponse.json({
    ok: config.configured && tokenValid,
    service: "127-si-shooting-challenge-web",
    phase: "leaderboard-live",
    airtable: {
      ...config,
      tokenValid,
      tokenError: tokenCheck?.error ?? null,
    },
    message: !config.configured
      ? "Add AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID in environment variables, then redeploy."
      : !tokenValid
        ? "Airtable token is present but rejected. Create a new PAT at airtable.com/create/tokens with data.records:read for this base, update Vercel, and redeploy."
        : "Airtable configuration is valid.",
  });
}
