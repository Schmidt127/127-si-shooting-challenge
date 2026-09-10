import { NextResponse } from "next/server";

import { NO_STORE_HEADERS } from "@/lib/ops/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public uptime probe for Shooting Challenge.
 * Intentionally returns only `{ "status": "ok" }` — no env, service, or config details.
 *
 * Public URL (with basePath): GET /shoot/api/health
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok" },
    {
      status: 200,
      headers: NO_STORE_HEADERS,
    },
  );
}
