import type { ProductNavItem } from "@/components/layout/product-shell";
import {
  FAMILY_DASHBOARD_APP_HREF,
  FAMILY_DASHBOARD_LABEL,
} from "@/lib/navigation/family-dashboard-link";

/**
 * Shooting Challenge section nav — all catalog pages share ProductShell + this list.
 * See docs/site-hierarchy.md for the full site map.
 *
 * Intentionally excluded from this catalog list (routes remain reachable by URL):
 * - `/dashboard` — private family dashboard (auth required)
 * - `/public-display` — gym/kiosk standings; not a family destination
 *
 * Family Dashboard sign-in (`/dashboard/sign-in`) lives under More (and header,
 * mobile enrolled CTA, footer, parent CTAs). Use the app href only — Next.js
 * prepends `basePath`; never hardcode `/shoot/...` here.
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
  { label: FAMILY_DASHBOARD_LABEL, href: FAMILY_DASHBOARD_APP_HREF },
];
