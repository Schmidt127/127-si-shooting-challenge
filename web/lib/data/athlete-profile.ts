import type { AthleteDashboardModel } from "@/lib/data/athlete-dashboard";
import { getMockAthleteDashboard } from "@/lib/data/athlete-dashboard";
import { formatShots, formatXp } from "@/lib/formatters";
import type { XpEventSummary } from "@/types/xp";

/** Public athlete profile — privacy-safe presentation model (mockable). */

export type AthleteProfileModel = {
  source: "mock" | "airtable";
  seasonLabel: string;
  athlete: AthleteDashboardModel["athlete"];
  xp: AthleteDashboardModel["xp"];
  streakDays: number;
  perfectWeek: AthleteDashboardModel["perfectWeek"];
  milestones: Array<{ id: string; label: string; value: string }>;
  achievements: AthleteDashboardModel["achievements"];
  recentActivity: Array<{ id: string; title: string; detail: string; href?: string }>;
  recentXp: XpEventSummary[];
  /** Never include parent email / phone / address on public profile. */
  privacyNote: string;
};

export function getMockAthleteProfile(slug = "demo-athlete"): AthleteProfileModel {
  const dash = getMockAthleteDashboard();
  return {
    source: "mock",
    seasonLabel: dash.seasonLabel,
    athlete: { ...dash.athlete, slug },
    xp: dash.xp,
    streakDays: dash.streakDays,
    perfectWeek: dash.perfectWeek,
    milestones: [
      {
        id: "m1",
        label: "Season shots",
        value: `${formatShots(dash.seasonShots)} counted`,
      },
      {
        id: "m2",
        label: "Lifetime XP",
        value: formatXp(dash.xp.total),
      },
      {
        id: "m3",
        label: "Current streak",
        value: `${dash.streakDays} days`,
      },
      {
        id: "m4",
        label: "Perfect Weeks",
        value: String(dash.perfectWeek.seasonCount),
      },
    ],
    achievements: dash.achievements,
    recentActivity: [
      {
        id: "r1",
        title: "Homework submitted",
        detail: dash.homework.title,
        href: dash.homework.href,
      },
      {
        id: "r2",
        title: "Coach feedback",
        detail: dash.feedback?.preview ?? "No recent feedback",
        // Omit href until a public Video Feedback surface exists.
      },
      {
        id: "r3",
        title: "Weekly summary",
        detail: `${formatShots(dash.weekly.shots)} / ${formatShots(dash.weekly.goal)} shots · ${dash.weekly.weekLabel}`,
        href: "/dashboard",
      },
    ],
    recentXp: dash.recentXp,
    privacyNote: "Public profile shows first name, school, grade band, XP, and achievements only.",
  };
}

/**
 * Safe adapter: live public profiles need published enrollment + slug rules.
 * Returns mock data until Airtable public views are wired.
 */
export async function loadAthleteProfile(slug: string): Promise<AthleteProfileModel | null> {
  const cleaned = String(slug || "").trim().toLowerCase();
  if (!cleaned) return null;
  return getMockAthleteProfile(cleaned);
}
