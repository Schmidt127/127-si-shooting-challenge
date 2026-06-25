import type { ProductNavItem } from "@/components/layout/product-shell";

/** Shared top nav for Shooting Challenge public pages (Softr-style). */
export const SHOOTING_CHALLENGE_NAV: ProductNavItem[] = [
  { label: "Overview", href: "/shooting-challenge" },
  { label: "Leaderboard", href: "/shooting-challenge/leaderboard" },
  { label: "Homework", href: "/homework" },
  { label: "Levels", href: "/levels" },
  { label: "Achievements", href: "/achievements" },
  { label: "Display", href: "/public-display" },
];
