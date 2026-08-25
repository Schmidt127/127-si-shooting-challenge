import type {
  PublicAthleteProfile,
  PublicHomeworkAssignment,
  PublicWeeklySummary,
} from "@/types/public-athlete-profile";

export type ProfileGlanceSummary = {
  levelLabel: string | null;
  lifetimeXp: number;
  recentActivityLabel: string | null;
  homeworkOpenCount: number;
  perfectWeekLabel: string | null;
  perfectWeekStatus: PublicWeeklySummary["perfectWeekStatusLabel"] | null;
  achievementCount: number;
};

const HOMEWORK_OPEN_STATUSES: PublicHomeworkAssignment["completionStatus"][] = [
  "not_started",
  "submitted",
  "under_review",
  "needs_revision",
];

export function countOpenHomework(assignments: PublicHomeworkAssignment[]): number {
  return assignments.filter((item) => HOMEWORK_OPEN_STATUSES.includes(item.completionStatus)).length;
}

export function pickPerfectWeekGlance(weeks: PublicWeeklySummary[]): {
  label: string | null;
  status: PublicWeeklySummary["perfectWeekStatusLabel"] | null;
} {
  if (weeks.length === 0) return { label: null, status: null };

  const inProgress = weeks.find((week) => week.perfectWeekStatusLabel === "In Progress");
  if (inProgress) {
    return { label: inProgress.weekLabel, status: inProgress.perfectWeekStatusLabel };
  }

  const first = weeks[0];
  return { label: first.weekLabel, status: first.perfectWeekStatusLabel };
}

export function buildProfileGlanceSummary(
  data: Pick<
    PublicAthleteProfile,
    "identity" | "performance" | "recentActivity" | "homeworkAssignments" | "weekly" | "achievements"
  >,
): ProfileGlanceSummary {
  const recent = data.recentActivity[0];
  const perfectWeek = pickPerfectWeekGlance(data.weekly);

  return {
    levelLabel: data.identity.level ?? data.performance.currentLevel,
    lifetimeXp: data.performance.lifetimeXp,
    recentActivityLabel: recent
      ? [recent.title, recent.date].filter(Boolean).join(" · ")
      : null,
    homeworkOpenCount: countOpenHomework(data.homeworkAssignments),
    perfectWeekLabel: perfectWeek.label,
    perfectWeekStatus: perfectWeek.status,
    achievementCount: data.achievements.length,
  };
}
