import type { StatusBadgeTone } from "@/components/ui/status-badge";
import type { AthleteSessionPayload } from "@/lib/auth/session";
import {
  loadAuthorizedEnrollmentForSession,
  type AuthorizedEnrollment,
} from "@/lib/auth/enrollment-access";
import {
  loadXpActivityForEnrollment,
  XpActivityLoadError,
} from "@/lib/data/xp-activity-loader";
import { loadPrivateAthleteDashboardPayload } from "@/lib/data/private-dashboard-loader";
import type { XpEventSummary } from "@/types/xp";
import type {
  DashboardHomeworkBadgeStatus,
  PrivateAthleteDashboardPayload,
} from "@/types/private-athlete-dashboard";

/** @deprecated Use DashboardHomeworkBadgeStatus — kept for legacy mock helpers. */
export type DashboardHomeworkStatus = "not_started" | "submitted" | "needs_correction" | "approved";

export type AthleteDashboardModel = PrivateAthleteDashboardPayload & {
  source: "mock" | "airtable";
  /** Legacy single-homework preview — first homework row or placeholder. */
  homeworkPreview: {
    title: string;
    status: DashboardHomeworkStatus;
    href: string;
  };
  /** Legacy video feedback preview — latest row when available. */
  feedback: {
    title: string;
    preview: string;
    href?: string;
  } | null;
};

export function homeworkStatusTone(status: DashboardHomeworkStatus): StatusBadgeTone {
  switch (status) {
    case "approved":
      return "success";
    case "submitted":
      return "blue";
    case "needs_correction":
      return "warn";
    default:
      return "neutral";
  }
}

export function homeworkBadgeTone(status: DashboardHomeworkBadgeStatus): StatusBadgeTone {
  switch (status) {
    case "awarded":
    case "complete":
      return "success";
    case "submitted":
      return "blue";
    case "needs_revision":
      return "warn";
    default:
      return "neutral";
  }
}

export function homeworkBadgeLabel(status: DashboardHomeworkBadgeStatus): string {
  switch (status) {
    case "awarded":
      return "Awarded";
    case "complete":
      return "Complete";
    case "submitted":
      return "Submitted";
    case "needs_revision":
      return "Needs revision";
    default:
      return "Pending";
  }
}

export function homeworkStatusLabel(status: DashboardHomeworkStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "submitted":
      return "Submitted";
    case "needs_correction":
      return "Needs correction";
    default:
      return "Not started";
  }
}

export function weeklyShotPercent(shots: number, goal: number): number {
  if (!Number.isFinite(shots) || !Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(100, Math.round((shots / goal) * 100));
}

function legacyHomeworkPreview(
  payload: PrivateAthleteDashboardPayload,
): AthleteDashboardModel["homeworkPreview"] {
  const first = payload.homework[0];
  if (!first) {
    return { title: "Homework assignments", status: "not_started", href: "/homework" };
  }
  const status: DashboardHomeworkStatus =
    first.badgeStatus === "awarded" || first.badgeStatus === "complete"
      ? "approved"
      : first.badgeStatus === "needs_revision"
        ? "needs_correction"
        : first.badgeStatus === "submitted"
          ? "submitted"
          : "not_started";
  return {
    title: first.assignmentName,
    status,
    href: first.homeworkDetailHref ?? "/homework",
  };
}

function legacyFeedbackPreview(
  payload: PrivateAthleteDashboardPayload,
): AthleteDashboardModel["feedback"] {
  const latest = payload.videoFeedback[0];
  if (!latest?.coachFeedback) return null;
  return {
    title: latest.title,
    preview: latest.coachFeedback.slice(0, 160),
    href: latest.secureVideoUrl ?? undefined,
  };
}

function attachLegacyFields(payload: PrivateAthleteDashboardPayload): AthleteDashboardModel {
  return {
    ...payload,
    source: "airtable",
    homeworkPreview: legacyHomeworkPreview(payload),
    feedback: legacyFeedbackPreview(payload),
  };
}

/** Demo athlete for UI development — replace with Airtable adapter in tests only. */
export function getMockAthleteDashboard(): AthleteDashboardModel {
  const recentXp: XpEventSummary[] = [
    {
      id: "xp1",
      points: 25,
      sourceLabel: "Submission Base",
      reasonPublic: "Shooting submission completed.",
      activityDate: "2026-07-14",
    },
    {
      id: "xp2",
      points: 50,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework marked satisfactory.",
      activityDate: "2026-07-12",
    },
    {
      id: "xp3",
      points: 40,
      sourceLabel: "Zoom Attendance: Base",
      reasonPublic: "Zoom meeting attendance credit.",
      activityDate: "2026-07-10",
    },
  ];

  const basePayload: PrivateAthleteDashboardPayload = {
    seasonLabel: "Demo Season",
    programLabel: "Shooting Challenge",
    athlete: {
      id: "demo-athlete",
      slug: "demo-athlete",
      displayName: "Jordan Reyes",
      school: "Summit Middle School",
      grade: "7",
      level: "Dangerous Shooter",
    },
    xp: {
      total: 4280,
      xpIntoLevel: 780,
      xpForNextLevel: 1200,
      nextLevelLabel: "Hot Hand",
    },
    seasonOverview: {
      totalShots: 3120,
      totalXp: 4280,
      currentLevel: "Dangerous Shooter",
      currentStreak: 9,
      longestStreak: 14,
      goalProgressPercent: 78,
      goalTargetShots: 4000,
      goalMet: false,
      recentActivitySummary: "312 shots logged · Perfect Week in progress",
    },
    weekly: {
      shots: 312,
      goal: 400,
      weekLabel: "Week 12",
      daysLogged: 5,
      goalCompletionPercent: 78,
    },
    perfectWeek: { earnedThisWeek: false, seasonCount: 4 },
    seasonShots: 3120,
    enrollment: {
      displayName: "Jordan Reyes",
      school: "Summit Middle School",
      grade: "7",
      gradeBand: "Middle School",
      seasonLabel: "Demo Season",
      programLabel: "Shooting Challenge",
      registrationSource: "Fillout",
      enrollmentStatus: "Active",
      athleteMatchStatus: "Matched",
      gradeBandStatus: "Assigned",
      levelStatus: "Active",
      progressionStatus: "On track",
    },
    homework: [
      {
        key: "hw-demo-1",
        assignmentName: "Form Check — Catch & Shoot",
        description: "Film three sets from the free-throw line extended.",
        weekLabel: "Week 12",
        homeworkSlot: "HW1",
        assignedDate: "2026-07-07",
        dueDate: "2026-07-13",
        submissionDate: "2026-07-11",
        completionStatus: "submitted",
        completionStatusLabel: "Submitted",
        satisfactory: null,
        badgeStatus: "submitted",
        xpAwarded: null,
        coachFeedback: null,
        parentFeedbackReady: false,
        parentFeedbackSent: false,
        homeworkDetailHref: "/homework",
        viewSubmittedHomeworkHref: null,
      },
    ],
    videoFeedback: [
      {
        key: "vf-demo-1",
        activityDate: "2026-07-09",
        weekLabel: "Week 12",
        title: "Mid-range form video",
        status: "feedback_available",
        coachFeedback: "Elbow stayed tight on the mid-range reps — keep that on game shots.",
        feedbackDate: "2026-07-10",
        xpAwarded: 100,
        secureVideoUrl: null,
        parentFeedbackReady: true,
        parentFeedbackSent: true,
      },
    ],
    weeklyProgress: [],
    awards: [],
    achievements: [
      { id: "a1", name: "First 1,000 Shots", unlocked: true },
      { id: "a2", name: "3-Week Streak", unlocked: true },
    ],
    recentXp,
    nextAction: {
      label: "Open this week's homework",
      description:
        "Daily shot logging uses the external submission form. Review this week's curriculum assignment here.",
      href: "/homework",
    },
  };

  return {
    ...attachLegacyFields(basePayload),
    source: "mock",
  };
}

export async function loadAuthenticatedAthleteDashboard(options: {
  session: AthleteSessionPayload;
  urlEnrollmentId?: string;
}): Promise<
  | { status: "ready"; data: AthleteDashboardModel; familyCount: number; familyEnrollments: AuthorizedEnrollment[] }
  | { status: "empty" }
  | { status: "forbidden" }
> {
  const access = await loadAuthorizedEnrollmentForSession(
    options.session,
    options.urlEnrollmentId,
  );

  if (access.rejectedUrlEnrollmentId) {
    return { status: "forbidden" };
  }

  if (!access.active) {
    return { status: "empty" };
  }

  const enrollment = access.active;
  const payload = await buildDashboardFromEnrollment(enrollment);
  return {
    status: "ready",
    data: payload,
    familyCount: access.enrollments.length,
    familyEnrollments: access.enrollments,
  };
}

async function buildDashboardFromEnrollment(
  enrollment: AuthorizedEnrollment,
): Promise<AthleteDashboardModel> {
  try {
    const payload = await loadPrivateAthleteDashboardPayload(enrollment);
    return attachLegacyFields(payload);
  } catch (error) {
    if (error instanceof XpActivityLoadError) throw error;
    throw new XpActivityLoadError("Failed to load athlete dashboard.", { cause: error });
  }
}

export function loadAthleteDashboard(options?: {
  slug?: string;
  enrollmentId?: string;
}): AthleteDashboardModel {
  if (options?.enrollmentId?.trim()) {
    throw new Error(
      "Live athlete dashboard data requires athlete sign-in (SC-112). enrollmentId URL params are not supported.",
    );
  }

  const mock = getMockAthleteDashboard();
  const slug = options?.slug ?? mock.athlete.slug;
  if (!options?.slug) return mock;

  return {
    ...mock,
    athlete: { ...mock.athlete, slug },
  };
}

/** @internal test helper */
export async function loadAuthenticatedDashboardXpOnly(
  enrollment: AuthorizedEnrollment,
): Promise<XpEventSummary[]> {
  const result = await loadXpActivityForEnrollment(enrollment.enrollmentId, { maxRows: 25 });
  return result.rows;
}
