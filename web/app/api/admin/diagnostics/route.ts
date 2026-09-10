import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  authorizeAdminDiagnostics,
  buildAdminDiagnosticsPayload,
  NO_STORE_HEADERS,
} from "@/lib/ops/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff-only configuration diagnostics (no athlete data, no secret values).
 *
 * Public URL (with basePath): GET /shoot/api/admin/diagnostics
 */
export async function GET(request: NextRequest) {
  const auth = authorizeAdminDiagnostics(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.status, headers: NO_STORE_HEADERS },
    );
  }

  const payload = buildAdminDiagnosticsPayload();
  return NextResponse.json(payload, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}
