/**
 * Fillout.com registration form URLs (public).
 * Add URLs when ready — used on overview / registration CTAs.
 */
export const JR_REF_FILLOUT_FORMS = {
  participants: process.env.NEXT_PUBLIC_JR_REF_FILLOUT_PARTICIPANTS_URL?.trim() || null,
  mentors: process.env.NEXT_PUBLIC_JR_REF_FILLOUT_MENTORS_URL?.trim() || null,
  teams: process.env.NEXT_PUBLIC_JR_REF_FILLOUT_TEAMS_URL?.trim() || null,
} as const;
