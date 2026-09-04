import type { ProductNavItem } from "@/components/layout/product-shell";
import { DAILY_SUBMISSIONS, PLAYER_REGISTRATION } from "@/lib/registration";

/** Primary in-app destinations surfaced in the shared program footer. */
export const FOOTER_QUICK_LINKS: ProductNavItem[] = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Homework", href: "/homework" },
  { label: "Levels", href: "/levels" },
  { label: "Achievements", href: "/achievements" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "Shoutouts", href: "/shoutouts" },
  { label: "Articles", href: "/articles" },
  { label: "Zoom Meetings", href: "/zoom-meetings" },
  { label: "FAQ", href: "/faq" },
  { label: "Family Dashboard", href: "/dashboard/sign-in" },
  { label: "Game Manual", href: "/game-manual" },
];

export const FOOTER_REGISTRATION_LINKS = [
  {
    label: PLAYER_REGISTRATION.cta,
    href: PLAYER_REGISTRATION.url,
    description: "Enroll an athlete in the Shooting Challenge.",
  },
  {
    label: DAILY_SUBMISSIONS.cta,
    href: DAILY_SUBMISSIONS.url,
    description: "Log today's shooting and training activity.",
  },
] as const;

/** Public consent copy — aligns with web/docs/public-data-rules.md. */
export const FOOTER_CONSENT_COPY =
  "Public standings and athlete profiles show approved game-related progress only. Registration covers name, image, and likeness for program promotion. Parent contact details, payment data, and private submission metadata are never published on this site.";

export const FOOTER_FAQ_HINT =
  "Questions about registration, daily submissions, weekly homework, grades served, or Fairfield program context? See the program FAQ.";
