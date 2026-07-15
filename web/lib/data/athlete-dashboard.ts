import type { StatusBadgeTone } from "@/components/ui/status-badge";

/** Presentational athlete dashboard model — mockable without Airtable auth. */

export type DashboardHomeworkStatus = "not_started" | "submitted" | "needs_correction" | "approved";

export type AthleteDashboardModel = {
  source: "mock" | "airtable";
  seasonLabel: string;
  athlete: {
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
  feedback: {
    title: string;
    preview: string;
    href: string;
  } | null;
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
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
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((shots / goal) * 100));
}

/** Demo athlete for UI development — replace with Airtable adapter later. */
export function getMockAthleteDashboard(): AthleteDashboardModel {
  return {
    source: "mock",
    seasonLabel: "2025–2026 Season",
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
      href: "/tutorials",
    },
    nextAction: {
      label: "Log this week’s shots",
      description: "You’re 88 shots from the weekly goal. Finish strong for Perfect Week.",
      href: "/homework",
    },
  };
}

/**
 * Safe adapter entry point. Live Airtable athlete dashboard requires auth — returns mock until then.
 */
export async function loadAthleteDashboard(options?: {
  slug?: string;
}): Promise<AthleteDashboardModel> {
  const mock = getMockAthleteDashboard();
  if (!options?.slug) return mock;
  return {
    ...mock,
    athlete: {
      ...mock.athlete,
      slug: options.slug,
    },
  };
}
