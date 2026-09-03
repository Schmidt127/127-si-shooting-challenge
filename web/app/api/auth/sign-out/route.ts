import { NextResponse } from "next/server";

import { withBasePath } from "@/lib/app-config";
import { clearAthleteSessionCookie } from "@/lib/auth/magic-link-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  await clearAthleteSessionCookie();

  return NextResponse.json({
    ok: true,
    redirectTo: withBasePath("/dashboard/sign-in"),
  });
}
