import type { ProductNavItem } from "@/components/layout/product-shell";

/**
 * Shooting Challenge section nav — all catalog pages share ProductShell + this list.
 * See docs/site-hierarchy.md for the full site map.
 *
 * Intentionally excluded from public chrome (routes remain reachable by URL):
 * - `/dashboard` — demo until SC-112 athlete auth
 * - `/public-display` — gym/kiosk standings; not a family destination
 */
export const SHOOTING_CHALLENGE_NAV: ProductNavItem[] = [
  { label: "Overview", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "Homework", href: "/homework" },
  { label: "Shoutouts", href: "/shoutouts" },
  { label: "Articles", href: "/articles" },
  { label: "Zoom Meetings", href: "/zoom-meetings" },
  { label: "Game Manual", href: "/game-manual" },
  { label: "Levels", href: "/levels" },
  { label: "Achievements", href: "/achievements" },
  { label: "FAQ", href: "/faq" },
];
