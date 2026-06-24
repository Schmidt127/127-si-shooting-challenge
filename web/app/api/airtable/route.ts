import { NextResponse } from "next/server";

import { getAirtableConfigStatus } from "@/lib/airtable/client";

/**
 * Health / connectivity route for the Airtable pipeline.
 * GET /api/airtable — returns config status only (no live fetch yet).
 *
 * Future: add scoped read endpoints or server actions that call lib/airtable/queries.ts.
 */
export async function GET() {
  const config = getAirtableConfigStatus();

  return NextResponse.json({
    ok: true,
    service: "127-si-shooting-challenge-web",
    phase: "scaffold",
    airtable: config,
    message:
      "Airtable client is scaffolded. Add AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID in Vercel env vars before live reads.",
  });
}
