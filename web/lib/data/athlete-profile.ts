import type { AthleteDashboardModel } from "@/lib/data/athlete-dashboard";
import { getMockAthleteDashboard } from "@/lib/data/athlete-dashboard";

/** Public athlete profile — privacy-safe presentation model (mockable). */

export type AthleteProfileModel = {
  source: "mock" | "airtable";
  /** ISO timestamp when the adapter last resolved data (demo = build-time mock). */
  fetchedAt: string;
  /** True when live Airtable data may be older than the cache window. */
  mayBeStale: boolean;
  seasonLabel: string;
  athlete: AthleteDashboardModel["athlete"];
  enrollment: {
    id: string | null;
    active: boolean | null;
    schoolYear: string | null;
  };
  shotsCounted: number | null;
  daysLogged: number | null;
  xp: AthleteDashboardModel["xp"];
  gateStatus: {
    blocked: boolean | null;
    publicSummary: string | null;
  };
  streakDays: number;
  perfectWeek: AthleteDashboardModel["perfectWeek"];
  milestones: Array<{ id: string; label: string; value: string }>;
  achievements: AthleteDashboardModel["achievements"];
  homework: {
    title: string | null;
    statusLabel: string | null;
    href: string | null;
  };
  video: {
    title: string | null;
    statusLabel: string | null;
    href: string | null;
  };
  zoom: {
    seasonCredits: number | null;
    latestLabel: string | null;
  };
  weeklySummary: {
    weekLabel: string | null;
    shots: number | null;
    goal: number | null;
  };
  recentActivity: Array<{ id: string; title: string; detail: string; href?: string }>;
  /** Never include parent email / phone / address on public profile. */
  privacyNote: string;
};

/** Discriminated load result — never pretends live auth succeeded. */
export type AthleteProfileLoadResult =
  | { status: "ok"; data: AthleteProfileModel }
  | { status: "demo"; data: AthleteProfileModel }
  | { status: "partial"; data: AthleteProfileModel; missing: string[] }
  | { status: "not_found"; slug: string }
  | { status: "missing_link"; slug: string; reason: string }
  | { status: "error"; slug: string; message: string };

/** Slugs that intentionally serve labelled demo data (no live Airtable claim). */
export const DEMO_PROFILE_SLUGS = new Set([
  "demo-athlete",
  "demo",
  "schmidt",
  "jordan-reyes",
]);

export function normalizeProfileSlug(slug: string): string {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getMockAthleteProfile(slug = "demo-athlete"): AthleteProfileModel {
  const dash = getMockAthleteDashboard();
  const cleaned = normalizeProfileSlug(slug) || "demo-athlete";
  const displayName =
    cleaned === "schmidt" ? "Schmidt (test)" : dash.athlete.displayName;

  return {
    source: "mock",
    fetchedAt: new Date(0).toISOString(),
    mayBeStale: false,
    seasonLabel: dash.seasonLabel,
    athlete: { ...dash.athlete, slug: cleaned, displayName },
    enrollment: {
      id: cleaned === "schmidt" ? "recgP9qZYjAhE7NXm" : null,
      active: true,
      schoolYear: dash.seasonLabel,
    },
    shotsCounted: dash.weekly.shots,
    daysLogged: dash.streakDays,
    xp: dash.xp,
    gateStatus: {
      blocked: false,
      publicSummary: "Demo gate clear — live gate status requires authenticated enrollment.",
    },
    streakDays: dash.streakDays,
    perfectWeek: dash.perfectWeek,
    milestones: [
      { id: "m1", label: "Season shots", value: `${dash.weekly.shots} (demo week)` },
      { id: "m2", label: "Current streak", value: `${dash.streakDays} days` },
      { id: "m3", label: "Perfect Weeks", value: String(dash.perfectWeek.seasonCount) },
    ],
    achievements: dash.achievements,
    homework: {
      title: dash.homework.title,
      statusLabel: dash.homework.status,
      href: dash.homework.href,
    },
    video: {
      title: dash.feedback?.title ?? null,
      statusLabel: dash.feedback ? "Demo feedback" : null,
      href: dash.feedback?.href ?? null,
    },
    zoom: {
      seasonCredits: null,
      latestLabel: "Zoom credits appear after live enrollment data is wired",
    },
    weeklySummary: {
      weekLabel: dash.weekly.weekLabel,
      shots: dash.weekly.shots,
      goal: dash.weekly.goal,
    },
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
        href: dash.feedback?.href,
      },
      {
        id: "r3",
        title: "Weekly progress",
        detail: `${dash.weekly.shots} / ${dash.weekly.goal} shots · ${dash.weekly.weekLabel}`,
        href: "/dashboard",
      },
    ],
    privacyNote:
      "Public profile shows first name, school, grade band, XP, and achievements only. Parent contact fields are never loaded.",
  };
}

/**
 * Safe adapter for athlete profiles.
 *
 * - Demo slugs → labelled mock (SC-111/SC-112 pending).
 * - Other slugs → not_found (does not invent live athlete rows).
 * - Never claims authenticated Airtable access.
 */
export async function loadAthleteProfileResult(
  slug: string,
): Promise<AthleteProfileLoadResult> {
  const cleaned = normalizeProfileSlug(slug);
  if (!cleaned) {
    return { status: "not_found", slug: String(slug || "").trim() || "(empty)" };
  }

  try {
    if (DEMO_PROFILE_SLUGS.has(cleaned)) {
      const data = getMockAthleteProfile(cleaned);
      // Partial demo: Zoom season credits intentionally unset to exercise partial UI.
      if (data.zoom.seasonCredits == null) {
        return {
          status: "partial",
          data,
          missing: ["zoom.seasonCredits", "live enrollment link"],
        };
      }
      return { status: "demo", data };
    }

    // Live public profiles need published Enrollment slug + SC-112 auth decision.
    // Until then, unknown slugs are missing — not fabricated athletes.
    return {
      status: "missing_link",
      slug: cleaned,
      reason:
        "Live athlete profiles are not wired yet. Only demo slugs render sample data until Mike chooses an auth approach (SC-112).",
    };
  } catch (error) {
    return {
      status: "error",
      slug: cleaned,
      message:
        error instanceof Error
          ? "Something went wrong loading this profile."
          : "Something went wrong loading this profile.",
    };
  }
}

/**
 * Back-compat helper: returns model for demo/partial/ok, otherwise null.
 */
export async function loadAthleteProfile(slug: string): Promise<AthleteProfileModel | null> {
  const result = await loadAthleteProfileResult(slug);
  if (result.status === "ok" || result.status === "demo" || result.status === "partial") {
    return result.data;
  }
  return null;
}
