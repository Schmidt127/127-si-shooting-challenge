import { NextResponse } from "next/server";

import {
  bearerTokenFromAuthorization,
  curriculumIngressSecretValid,
} from "@/lib/curriculum/ingress-auth";
import { syncHomeworkLibraryAssignmentKey } from "@/lib/curriculum/library-sync-service";
import { parseLibrarySyncPayload } from "@/lib/curriculum/library-sync-validation";

export const dynamic = "force-dynamic";

/**
 * Curriculum Hub → SC: propagate authoritative Assignment Key to Homework Library.
 * Auth: Bearer CURRICULUM_INGRESS_SECRET (same as submit / assignments ingress).
 * Live path (basePath /shoot): POST /shoot/api/curriculum/library/sync
 *
 * Hub lesson creation should call this after minting assignmentKey so PHA-linked
 * library rows and dashboard href generation resolve to Curriculum Hub (not legacy /homework/rec…).
 */
export async function POST(request: Request) {
  const bearer = bearerTokenFromAuthorization(request.headers.get("authorization"));
  if (!curriculumIngressSecretValid(bearer)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseLibrarySyncPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = await syncHomeworkLibraryAssignmentKey(parsed.value);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      status: result.action,
      assignmentKey: result.assignmentKey,
      homeworkLibraryRecordId: result.homeworkLibraryRecordId,
    },
    {
      status: result.action === "created" ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
