import { NextResponse } from "next/server";

import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import { loadAuthorizedEnrollmentForSession } from "@/lib/auth/enrollment-access";
import {
  getCurriculumHubUrl,
  mintCurriculumHandoff,
} from "@/lib/curriculum/handoff";

export async function POST(request: Request) {
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

  try {
    const token = await mintCurriculumHandoff({
      enrollmentId: authorized.active.enrollmentId,
      grade: authorized.active.grade,
      displayName: authorized.active.displayName,
    });
    const target = new URL("/auth/handoff", hubOrigin);
    target.searchParams.set("token", token);
    return NextResponse.redirect(target, 303);
  } catch {
    return NextResponse.json({ error: "Curriculum Hub is temporarily unavailable." }, { status: 503 });
  }
}
