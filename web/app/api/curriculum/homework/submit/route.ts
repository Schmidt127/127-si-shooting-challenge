import { NextResponse } from "next/server";

import {
  bearerTokenFromAuthorization,
  curriculumIngressSecretValid,
} from "@/lib/curriculum/ingress-auth";
import { processCurriculumHomeworkSubmit } from "@/lib/curriculum/submit-service";
import {
  parseCurriculumSubmitPayload,
  parseIdempotencyKey,
} from "@/lib/curriculum/submit-validation";

export const dynamic = "force-dynamic";

/**
 * Curriculum Hub → Shooting Challenge homework submit ingress.
 * Auth: Bearer CURRICULUM_INGRESS_SECRET (separate from handoff).
 * Live path (basePath /shoot): POST /shoot/api/curriculum/homework/submit
 */
export async function POST(request: Request) {
  const bearer = bearerTokenFromAuthorization(request.headers.get("authorization"));
  if (!curriculumIngressSecretValid(bearer)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idempotency = parseIdempotencyKey(request.headers.get("idempotency-key"));
  if (!idempotency.ok) {
    return NextResponse.json({ error: idempotency.error }, { status: idempotency.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseCurriculumSubmitPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = await processCurriculumHomeworkSubmit({
    payload: parsed.value,
    idempotencyKey: idempotency.value,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.receipt, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
