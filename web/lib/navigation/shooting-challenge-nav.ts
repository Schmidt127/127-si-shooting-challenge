import type { ProductNavItem } from "@/components/layout/product-shell";

/**
 * Shooting Challenge section nav — all catalog pages share ProductShell + this list.
 * See docs/site-hierarchy.md for the full site map.
 */
export const SHOOTING_CHALLENGE_NAV: ProductNavItem[] = [
  { label: "Overview", href: "/shooting-challenge" },
  { label: "Leaderboard", href: "/shooting-challenge/leaderboard" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "Homework", href: "/homework" },
  { label: "Shoutouts", href: "/shoutouts" },
  { label: "Articles", href: "/articles" },
  { label: "Zoom Meetings", href: "/zoom-meetings" },
  { label: "Game Manual", href: "/game-manual" },
  { label: "Levels", href: "/levels" },
  { label: "Achievements", href: "/achievements" },
  { label: "Display", href: "/public-display" },
];
