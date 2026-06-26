/** Shooting Challenge app metadata — this repo is Shooting Challenge only. */

export const SHOOTING_CHALLENGE = {
  id: "shoot",
  name: "Shooting Challenge",
  description:
    "Track makes and attempts, climb levels, and compete on the live leaderboard — built for serious shooting reps.",
  publicPath: "/shoot",
} as const;

export const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL?.trim() || "https://www.hoopchallenges.com";
