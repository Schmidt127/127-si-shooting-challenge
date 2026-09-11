import { NextResponse } from "next/server";

import { listCurriculumAssignmentsForEnrollment } from "@/lib/curriculum/assignments-service";
import {
  bearerTokenFromAuthorization,
  curriculumIngressSecretValid,
} from "@/lib/curriculum/ingress-auth";

export const dynamic = "force-dynamic";

/**
 * Curriculum Hub → Shooting Challenge: PHA assignments for one enrollment.
 * Auth: Bearer CURRICULUM_INGRESS_SECRET (same shared secret as submit ingress).
 * Live path (basePath /shoot): GET /shoot/api/curriculum/assignments?enrollmentId=rec…
 */
export async function GET(request: Request) {
  const bearer = bearerTokenFromAuthorization(request.headers.get("authorization"));
  if (!curriculumIngressSecretValid(bearer)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enrollmentId = new URL(request.url).searchParams.get("enrollmentId")?.trim() ?? "";
  if (!enrollmentId) {
    return NextResponse.json({ error: "enrollmentId is required." }, { status: 400 });
  }

  const result = await listCurriculumAssignmentsForEnrollment(enrollmentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      enrollmentId: result.enrollmentId,
      assignments: result.assignments,
      ...(result.emptyReason ? { emptyReason: result.emptyReason } : {}),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
