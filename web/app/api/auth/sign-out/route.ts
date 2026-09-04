import { NextResponse } from "next/server";

import { clearAthleteSessionCookie } from "@/lib/auth/magic-link-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  await clearAthleteSessionCookie();

  // App-relative for next/router (basePath is applied by the client, not here).
  return NextResponse.json({
    ok: true,
    redirectTo: "/dashboard/sign-in",
  });
}
