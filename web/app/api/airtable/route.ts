import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAirtableConfigStatus } from "@/lib/airtable/client";
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

  return NextResponse.json({
    ok: true,
    service: "127-si-shooting-challenge-web",
    phase: "leaderboard-live",
    airtable: config,
    message: config.configured
      ? "Airtable configuration is present."
      : "Add AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID in environment variables, then redeploy.",
  });
}
