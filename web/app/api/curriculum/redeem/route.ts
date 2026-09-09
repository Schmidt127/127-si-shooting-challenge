import { NextResponse } from "next/server";

import {
  consumeCurriculumHandoff,
  curriculumHandoffSecretValid,
} from "@/lib/curriculum/handoff";
import { mintCurriculumSubmitAuthorization } from "@/lib/curriculum/submit-auth";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  if (!curriculumHandoffSecretValid(bearer)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const record = await consumeCurriculumHandoff(token);
  if (!record) {
    return NextResponse.json({ error: "Invalid or expired handoff" }, { status: 410 });
  }

  let submitAuthorizationToken: string;
  try {
    submitAuthorizationToken = await mintCurriculumSubmitAuthorization({
      enrollmentId: record.enrollmentId,
      gradeBand: record.gradeBand,
      assignmentKey: record.assignmentKey,
    });
  } catch {
    return NextResponse.json({ error: "Curriculum submit authorization unavailable." }, { status: 503 });
  }

  return NextResponse.json(
    {
      enrollmentId: record.enrollmentId,
      gradeBand: record.gradeBand,
      submitAuthorizationToken,
      ...(record.sourceGrade ? { sourceGrade: record.sourceGrade } : {}),
      displayName: record.displayName,
      ...(record.assignmentKey ? { assignmentKey: record.assignmentKey } : {}),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
