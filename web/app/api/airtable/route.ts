import { NextResponse } from "next/server";

import { getAirtableConfigStatus } from "@/lib/airtable/client";

/** Always read env at request time (not from a stale static build). */
export const dynamic = "force-dynamic";

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
    /** Key names only — helps catch typos like AIRTABLE_TOKEN vs AIRTABLE_API_TOKEN. */
    airtableEnvKeysFound: Object.keys(process.env).filter((key) =>
      key.toUpperCase().includes("AIRTABLE"),
    ),
    message:
      config.configured
        ? "Airtable configuration is present."
        : "Add AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID in Vercel env vars, then redeploy.",
  });
}
