import { NextResponse } from "next/server";

import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import { loadAuthorizedEnrollmentForSession } from "@/lib/auth/enrollment-access";
import {
  getCurriculumHubUrl,
  mintCurriculumHandoff,
} from "@/lib/curriculum/handoff";
import { normalizeCurriculumAssignmentKey } from "@/lib/curriculum/homework-link";

export const dynamic = "force-dynamic";

async function startCurriculumHandoff(
  request: Request,
  assignmentKeyRaw: unknown,
): Promise<Response> {
  const session = await getAthleteSessionFromCookies();
  if (!session) {
    return NextResponse.redirect(new URL("/shoot/dashboard/sign-in", request.url), 303);
  }

  const authorized = await loadAuthorizedEnrollmentForSession(session);
  if (authorized.needsSelection) {
    return NextResponse.redirect(new URL("/shoot/dashboard/select", request.url), 303);
  }
  if (!authorized.active) {
    return NextResponse.redirect(new URL("/shoot/dashboard", request.url), 303);
  }

  const hubOrigin = getCurriculumHubUrl();
  if (!hubOrigin) {
    return NextResponse.json({ error: "Curriculum Hub is not configured." }, { status: 503 });
  }

  const assignmentKey = normalizeCurriculumAssignmentKey(assignmentKeyRaw);

  try {
    const token = await mintCurriculumHandoff({
      enrollmentId: authorized.active.enrollmentId,
      grade: authorized.active.grade,
      displayName: authorized.active.displayName,
      assignmentKey,
    });
    const target = new URL("/auth/handoff", hubOrigin);
    target.searchParams.set("token", token);
    return NextResponse.redirect(target, 303);
  } catch {
    return NextResponse.json({ error: "Curriculum Hub is temporarily unavailable." }, { status: 503 });
  }
}

/**
 * Authenticated entry to Curriculum Hub (no second login).
 * Optional assignmentKey opens the matching Curriculum AssignmentSlug detail route.
 * Live path: GET|POST /shoot/api/curriculum/start
 */
export async function GET(request: Request) {
  const assignmentKey = new URL(request.url).searchParams.get("assignmentKey");
  return startCurriculumHandoff(request, assignmentKey);
}

export async function POST(request: Request) {
  let assignmentKey: unknown = null;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { assignmentKey?: unknown };
      assignmentKey = body.assignmentKey;
    } else {
      const form = await request.formData();
      assignmentKey = form.get("assignmentKey");
    }
  } catch {
    assignmentKey = null;
  }
  return startCurriculumHandoff(request, assignmentKey);
}
