import { NextResponse } from "next/server";

import {
  consumeCurriculumHandoff,
  curriculumHandoffSecretValid,
} from "@/lib/curriculum/handoff";

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

  return NextResponse.json(
    {
      enrollmentId: record.enrollmentId,
      gradeBand: record.gradeBand,
      displayName: record.displayName,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
