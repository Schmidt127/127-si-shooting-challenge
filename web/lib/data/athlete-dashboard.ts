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
import type { XpEventSummary } from "@/types/xp";

/** Presentational athlete dashboard model — mockable without Airtable auth. */

export type DashboardHomeworkStatus = "not_started" | "submitted" | "needs_correction" | "approved";

export type AthleteDashboardModel = {
  source: "mock" | "airtable";
  seasonLabel: string;
  athlete: {
    /** Presentation-only identifier — never an Airtable record id in authenticated views. */
    id: string;
    slug: string;
    displayName: string;
    school: string;
    grade: string;
    level: string;
    avatarUrl?: string;
  };
  xp: {
    total: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
    nextLevelLabel: string;
  };
  /** Weekly Athlete Summary–style shot progress (presentation). */
  weekly: {
    shots: number;
    goal: number;
    weekLabel: string;
  };
  streakDays: number;
  perfectWeek: {
    earnedThisWeek: boolean;
    seasonCount: number;
  };
  seasonShots: number;
  achievements: Array<{
    id: string;
    name: string;
    unlocked: boolean;
  }>;
  homework: {
    title: string;
    status: DashboardHomeworkStatus;
    href: string;
  };
  /** Coach Video Feedback preview — href optional until a public feedback surface exists. */
  feedback: {
    title: string;
    preview: string;
    href?: string;
  } | null;
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
  /** Recent XP Events for source-label presentation (mock until XP Events adapter). */
  recentXp: XpEventSummary[];
  recentXpTotal?: number;
  xpWarning?: string;
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

/** Demo athlete for UI development — replace with Airtable adapter later. */
export function getMockAthleteDashboard(): AthleteDashboardModel {
  return {
    source: "mock",
    seasonLabel: "Demo Season",
    athlete: {
      id: "recMOCKDASH",
      slug: "demo-athlete",
      displayName: "Jordan Reyes",
      school: "Summit Middle School",
      grade: "7",
      level: "Dangerous Shooter",
      avatarUrl: undefined,
    },
    xp: {
      total: 4280,
      xpIntoLevel: 780,
      xpForNextLevel: 1200,
      nextLevelLabel: "Hot Hand",
    },
    weekly: {
      shots: 312,
      goal: 400,
      weekLabel: "Week 12",
    },
    streakDays: 9,
    perfectWeek: {
      earnedThisWeek: false,
      seasonCount: 4,
    },
    seasonShots: 3120,
    achievements: [
      { id: "a1", name: "First 1,000 Shots", unlocked: true },
      { id: "a2", name: "3-Week Streak", unlocked: true },
      { id: "a3", name: "Perfect Week Hunter", unlocked: false },
    ],
    homework: {
      title: "Form Check — Catch & Shoot",
      status: "submitted",
      href: "/homework",
    },
    feedback: {
      title: "Coach note on set point",
      preview: "Elbow stayed tight on the mid-range reps — keep that on game shots.",
      // No public Video Feedback detail route yet — avoid linking to tutorials.
    },
    nextAction: {
      label: "Open this week’s homework",
      description:
        "Daily shot logging uses the external submission form. Review this week’s curriculum assignment here.",
      href: "/homework",
    },
    recentXp: [
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
      {
        id: "xp4",
        points: 20,
        sourceLabel: "Zoom Recording",
        reasonPublic: "Recording quiz credit (partial XP vs live).",
        activityDate: "2026-07-09",
      },
      {
        id: "xp5",
        points: 100,
        sourceLabel: "Video Submission",
        reasonPublic: "Coach-approved video feedback XP.",
        activityDate: "2026-07-07",
      },
    ],
  };
}

/**
 * Authenticated dashboard adapter — session determines enrollment; URL enrollmentId is not trusted.
 */
export async function loadAuthenticatedAthleteDashboard(options: {
  session: AthleteSessionPayload;
  urlEnrollmentId?: string;
}): Promise<
  | { status: "ready"; data: AthleteDashboardModel; familyCount: number }
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
    return access.enrollments.length === 0 ? { status: "empty" } : { status: "empty" };
  }

  const enrollment = access.active;
  const data = await buildDashboardFromEnrollment(enrollment);
  return { status: "ready", data, familyCount: access.enrollments.length };
}

async function buildDashboardFromEnrollment(
  enrollment: AuthorizedEnrollment,
): Promise<AthleteDashboardModel> {
  const mock = getMockAthleteDashboard();

  try {
    const xpResult = await loadXpActivityForEnrollment(enrollment.enrollmentId, { maxRows: 25 });
    const warningParts: string[] = [];
    if (xpResult.warning) warningParts.push(xpResult.warning);
    if (xpResult.missingXpSubmissionIds.length > 0) {
      warningParts.push(
        `${xpResult.missingXpSubmissionIds.length} counted submission(s) have no XP Event.`,
      );
    }

    return {
      ...mock,
      source: "airtable",
      seasonLabel: "Current season",
      athlete: {
        id: enrollment.slug || enrollment.displayName,
        slug: enrollment.slug || "athlete",
        displayName: enrollment.displayName,
        school: enrollment.school,
        grade: enrollment.grade,
        level: enrollment.level,
      },
      xp: {
        total: enrollment.xpTotal,
        xpIntoLevel: enrollment.xpIntoLevel,
        xpForNextLevel: enrollment.xpForNextLevel,
        nextLevelLabel: enrollment.nextLevelLabel,
      },
      recentXp: xpResult.rows,
      recentXpTotal: xpResult.totalAvailableRows,
      xpWarning: warningParts.length > 0 ? warningParts.join(" ") : undefined,
    };
  } catch (error) {
    if (error instanceof XpActivityLoadError) {
      throw error;
    }
    throw new XpActivityLoadError("Failed to load athlete dashboard XP activity.", {
      cause: error,
    });
  }
}

/**
 * Legacy/dev adapter entry point. Prefer loadAuthenticatedAthleteDashboard when auth is enabled.
 */
export async function loadAthleteDashboard(options?: {
  slug?: string;
  enrollmentId?: string;
}): Promise<AthleteDashboardModel> {
  const mock = getMockAthleteDashboard();
  const slug = options?.slug ?? mock.athlete.slug;
  const enrollmentId = options?.enrollmentId?.trim();

  if (!enrollmentId) {
    if (!options?.slug) return mock;
    return {
      ...mock,
      athlete: {
        ...mock.athlete,
        slug,
      },
    };
  }

  try {
    const xpResult = await loadXpActivityForEnrollment(enrollmentId, { maxRows: 25 });
    const warningParts: string[] = [];
    if (xpResult.warning) warningParts.push(xpResult.warning);
    if (xpResult.missingXpSubmissionIds.length > 0) {
      warningParts.push(
        `${xpResult.missingXpSubmissionIds.length} counted submission(s) have no XP Event.`,
      );
    }
    return {
      ...mock,
      source: "airtable",
      athlete: {
        ...mock.athlete,
        id: enrollmentId,
        slug,
      },
      recentXp: xpResult.rows,
      recentXpTotal: xpResult.totalAvailableRows,
      xpWarning: warningParts.length > 0 ? warningParts.join(" ") : undefined,
    };
  } catch (error) {
    if (error instanceof XpActivityLoadError) {
      throw error;
    }
    throw new XpActivityLoadError("Failed to load athlete dashboard XP activity.", {
      cause: error,
    });
  }
}
