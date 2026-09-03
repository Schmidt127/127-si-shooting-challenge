import type { PublicHomeworkCompletionStatus, PublicWeeklySummary } from "@/types/public-athlete-profile";
import type { XpEventSummary } from "@/types/xp";

export type DashboardHomeworkBadgeStatus =
  | "pending"
  | "submitted"
  | "needs_revision"
  | "awarded"
  | "complete";

export type DashboardVideoFeedbackStatus = "pending" | "submitted" | "reviewed" | "feedback_available";

export type DashboardHomeworkItem = {
  key: string;
  assignmentName: string;
  description: string | null;
  weekLabel: string;
  homeworkSlot: string | null;
  assignedDate: string | null;
  dueDate: string | null;
  submissionDate: string | null;
  lateSubmission: boolean;
  completionStatus: PublicHomeworkCompletionStatus;
  completionStatusLabel: string;
  satisfactory: boolean | null;
  badgeStatus: DashboardHomeworkBadgeStatus;
  xpAwarded: number | null;
  coachFeedback: string | null;
  parentFeedbackReady: boolean | null;
  parentFeedbackSent: boolean | null;
  homeworkDetailHref: string | null;
  viewSubmittedHomeworkHref: string | null;
};

export type DashboardVideoFeedbackItem = {
  key: string;
  activityDate: string | null;
  weekLabel: string;
  title: string;
  status: DashboardVideoFeedbackStatus;
  coachFeedback: string | null;
  feedbackDate: string | null;
  xpAwarded: number | null;
  secureVideoUrl: string | null;
  parentFeedbackReady: boolean | null;
  parentFeedbackSent: boolean | null;
};

export type DashboardAwardItem = {
  key: string;
  awardName: string;
  awardDate: string | null;
  amount: number | null;
  reason: string | null;
  recipientStatus: string;
  deliveryStatus: string | null;
  scope: string | null;
  weekLabel: string | null;
  publiclyVisible: boolean;
};

export type DashboardEnrollmentDetails = {
  displayName: string;
  school: string;
  grade: string;
  gradeBand: string | null;
  seasonLabel: string;
  programLabel: string;
  registrationSource: string | null;
  enrollmentStatus: string;
  athleteMatchStatus: string | null;
  gradeBandStatus: string | null;
  levelStatus: string | null;
  progressionStatus: string | null;
};

export type PrivateAthleteDashboardPayload = {
  seasonLabel: string;
  programLabel: string;
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
  seasonOverview: {
    totalShots: number;
    totalXp: number;
    currentLevel: string;
    currentStreak: number;
    longestStreak: number;
    goalProgressPercent: number | null;
    goalTargetShots: number | null;
    goalMet: boolean;
    recentActivitySummary: string | null;
  };
  weekly: {
    shots: number;
    goal: number;
    weekLabel: string;
    daysLogged: number | null;
    goalCompletionPercent: number | null;
  };
  perfectWeek: {
    earnedThisWeek: boolean;
    seasonCount: number;
  };
  seasonShots: number;
  enrollment: DashboardEnrollmentDetails;
  homework: DashboardHomeworkItem[];
  videoFeedback: DashboardVideoFeedbackItem[];
  weeklyProgress: PublicWeeklySummary[];
  awards: DashboardAwardItem[];
  achievements: Array<{ id: string; name: string; unlocked: boolean }>;
  recentXp: XpEventSummary[];
  recentXpTotal?: number;
  xpWarning?: string;
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
};
