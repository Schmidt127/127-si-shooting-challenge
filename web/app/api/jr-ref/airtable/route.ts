import { NextResponse } from "next/server";

import { getJrRefAirtableConfigStatus } from "@/lib/jr-ref/airtable";
import { JR_REF_AIRTABLE_BASE_NAME } from "@/lib/jr-ref/config";

/**
 * GET /api/jr-ref/airtable — JR Ref base config status (no live table fetch).
 */
export async function GET() {
  const config = getJrRefAirtableConfigStatus();

  return NextResponse.json({
    ok: config.configured,
    baseName: JR_REF_AIRTABLE_BASE_NAME,
    airtable: config,
    hint: config.configured
      ? "JR Ref Airtable base is configured."
      : "Add JR_REF_AIRTABLE_BASE_ID (127SI - JR REF) alongside AIRTABLE_API_TOKEN, then redeploy.",
  });
}
