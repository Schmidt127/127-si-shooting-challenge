import { NextResponse } from "next/server";

import {
  bearerTokenFromAuthorization,
  curriculumIngressSecretValid,
} from "@/lib/curriculum/ingress-auth";
import { processCurriculumStagingUpload } from "@/lib/curriculum/upload-staging-service";

export const dynamic = "force-dynamic";

/**
 * Curriculum Hub → SC homework file staging ingress.
 * Auth: Bearer CURRICULUM_INGRESS_SECRET (Hub proxies; athletes never see the secret).
 * Live path (basePath /shoot): POST /shoot/api/curriculum/homework/upload-staging
 *
 * Multipart fields: file, enrollmentId, assignmentKey, questionKey, optional draftToken.
 * Does not create Submission Assets — bind on final submit.
 */
export async function POST(request: Request) {
  const bearer = bearerTokenFromAuthorization(request.headers.get("authorization"));
  if (!curriculumIngressSecretValid(bearer)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 422 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await processCurriculumStagingUpload({
    enrollmentId: form.get("enrollmentId"),
    assignmentKey: form.get("assignmentKey"),
    questionKey: form.get("questionKey"),
    draftToken: form.get("draftToken") ?? undefined,
    fileName: file.name || "upload.bin",
    mimeType: file.type || form.get("mimeType"),
    bytes,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      stagingId: result.stagingId,
      fileName: result.fileName,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      expiresAt: result.expiresAt,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
