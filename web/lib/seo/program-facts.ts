/**
 * Canonical program facts for public SEO copy, metadata, and FAQ content.
 * Keep claims aligned with documented program scope — no invented locations or services.
 */

import { BRAND_ORG_NAME } from "@/lib/brand";
import { PLAYER_REGISTRATION } from "@/lib/registration";

/** Primary youth audience served by the Shooting Challenge (per program direction). */
export const PROGRAM_GRADES_SERVED = "grades 1–8";

/** Fairfield, Montana — nonprofit home base; not a claim of nationwide in-person coaching. */
export const PROGRAM_HOME_LOCATION = "Fairfield, Montana";

export const PROGRAM_IDENTITY = {
  orgName: BRAND_ORG_NAME,
  programName: "Shooting Challenge",
  clubIdentity: "Fairfield Basketball Club",
  philosophy: "Educational Athletics",
  philosophyTagline: "Basketball is the vehicle. Education is the destination.",
} as const;

/** National-first site description — used in layout defaults and JSON-LD. */
export const SITE_DESCRIPTION =
  "Youth basketball training and shooting challenge for boys and girls in grades 1–8. Daily shooting practice, XP progress tracking, homework, video feedback, and Zoom coaching through Educational Athletics. Based in Fairfield, Montana — train and submit from anywhere.";

/** Homepage absolute document title. */
export const HOME_PAGE_TITLE =
  "Youth Basketball Shooting Challenge | Fairfield Basketball Club";

export const HOME_HERO = {
  eyebrow: "Educational Athletics · 127 Sports Intensity",
  titleLead: "Youth basketball training with daily shooting practice.",
  titleAccent: "Track progress. Compete with purpose.",
  description:
    "The Shooting Challenge helps boys and girls in grades 1–8 build real shooting skill through daily submissions, weekly homework, XP and level goals, coach video feedback, and live Zoom check-ins. Based in Fairfield, Montana — families can train and participate from anywhere they can submit.",
} as const;

/** Feature banner accessible names for catalog pages (FUT-023). */
export const FEATURE_BANNER_ARIA = {
  leaderboard:
    "Shooting Challenge leaderboard showing athlete rankings, XP, levels, and shots",
  levels: "Shooting Challenge levels progression showing XP tiers and advancement",
  homework:
    "Shooting Challenge homework page showing published assignments and curriculum",
  achievements:
    "Shooting Challenge achievements showing milestones, streaks, and earned progress",
} as const;

export const REGISTRATION_FACTS = {
  label: PLAYER_REGISTRATION.label,
  url: PLAYER_REGISTRATION.url,
  cta: PLAYER_REGISTRATION.cta,
} as const;

/** Remote/nationally accessible elements — only where supported by the product. */
export const REMOTE_PROGRAM_ELEMENTS = [
  "Daily shooting and training submissions through the public form",
  "Weekly homework assignments and skills tutorials on this site",
  "Live and recorded Zoom coaching sessions",
  "XP, levels, achievements, and public leaderboard progress tracking",
] as const;

/** In-person scope — do not expand beyond documented Fairfield-area operations. */
export const IN_PERSON_SCOPE =
  "In-person Fairfield Basketball Club activities, when offered, are based in Fairfield, Montana and nearby communities. The Shooting Challenge web program and submission forms are accessible online.";
