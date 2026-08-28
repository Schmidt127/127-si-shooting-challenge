/**
 * Canonical program facts for public SEO copy, metadata, and FAQ content.
 * Keep claims aligned with documented program scope — no invented locations or services.
 */

import { BRAND_ORG_NAME } from "@/lib/brand";
import { PLAYER_REGISTRATION } from "@/lib/registration";

/** Primary youth audience served by the Shooting Challenge (per program direction). */
export const PROGRAM_GRADES_SERVED = "grades 1–12";

/** Fairfield, Montana — nonprofit home base; not a claim of nationwide in-person coaching. */
export const PROGRAM_HOME_LOCATION = "Fairfield, Montana";

/** Current published challenge season label. */
export const CHALLENGE_SEASON_LABEL = "2026–2027 Shooting Challenge";

/** Annual challenge window (Mountain Time program calendar). */
export const CHALLENGE_DATES = "May 1–June 30";

export const PROGRAM_IDENTITY = {
  orgName: BRAND_ORG_NAME,
  programName: "Shooting Challenge",
  clubIdentity: "Fairfield Basketball Club",
  philosophy: "Educational Athletics",
  philosophyTagline: "Basketball is the vehicle. Education is the destination.",
} as const;

/** Twelve public-facing achievement levels, Beginner through G.O.A.T. */
export const PROGRAM_LEVEL_LADDER = [
  "Beginner",
  "Rookie Shooter",
  "Developing Shooter",
  "Consistent Shooter",
  "Dangerous Shooter",
  "Hot Hand",
  "Deadeye",
  "Sharpshooter",
  "Pro",
  "All-Star",
  "Legend",
  "G.O.A.T.",
] as const;

/** National-first site description — used in layout defaults and JSON-LD. */
export const SITE_DESCRIPTION =
  "Annual online Educational Athletics shooting challenge for boys and girls in grades 1–12. May 1–June 30. Earn XP, climb 12 levels from Beginner to G.O.A.T., complete homework, submit videos for coaching feedback, and train from anywhere in the world.";

/** Homepage absolute document title. */
export const HOME_PAGE_TITLE =
  "Shooting Challenge | Online Youth Basketball — Earn XP, Climb 12 Levels";

export const HOME_HERO = {
  eyebrow: "127 Sports Intensity · Educational Athletics · 100% Online",
  titleLead: "Earn XP. Climb 12 Levels.",
  titleAccent: "Become a better basketball player.",
  description:
    "The 127 Sports Intensity Shooting Challenge is an annual, two-month online program for boys and girls in grades 1–12. Athletes train at home, submit activity, complete assignments, receive coaching feedback, and progress from Beginner to G.O.A.T. — from anywhere in the world.",
  factChips: [
    "Grades 1–12",
    "Boys & girls",
    CHALLENGE_DATES,
    "100% online",
    "Worldwide",
  ],
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
  "Annual online challenge participation from anywhere with a basketball, a place to shoot, and internet access",
  "Shooting activity submissions and progress tracking through the public forms",
  "Weekly homework assignments, tutorials, and educational-athletics activities on this site",
  "Video submissions with coaching feedback",
  "Live and recorded Zoom sessions when scheduled",
  "XP, levels, achievements, and public leaderboard progress",
] as const;

/** In-person scope — do not expand beyond documented Fairfield-area operations. */
export const IN_PERSON_SCOPE =
  "In-person Fairfield Basketball Club activities, when offered, are based in Fairfield, Montana and nearby communities. The Shooting Challenge itself runs 100% online and does not require athletes to live near Fairfield.";
