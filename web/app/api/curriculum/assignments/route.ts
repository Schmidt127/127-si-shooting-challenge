import { NextResponse } from "next/server";

import { AirtableApiError } from "@/lib/airtable/errors";
import { listCurriculumAssignmentsForEnrollment } from "@/lib/curriculum/assignments-service";
import {
  bearerTokenFromAuthorization,
  curriculumIngressSecretValid,
} from "@/lib/curriculum/ingress-auth";

export const dynamic = "force-dynamic";

const MAX_AIRTABLE_ATTEMPTS = 4;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function listAssignmentsWithRateLimitRetry(enrollmentId: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_AIRTABLE_ATTEMPTS; attempt += 1) {
    try {
      return await listCurriculumAssignmentsForEnrollment(enrollmentId);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof AirtableApiError && error.status === 429;
      if (!retryable || attempt === MAX_AIRTABLE_ATTEMPTS - 1) {
        throw error;
      }

      const backoffMs = Math.min(2000, 250 * 2 ** attempt) + Math.floor(Math.random() * 150);
      await sleep(backoffMs);
    }
  }

  throw lastError;
}

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

  const result = await listAssignmentsWithRateLimitRetry(enrollmentId);
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
