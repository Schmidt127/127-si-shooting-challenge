/**
 * Canonical external registration / daily-submission form links for the
 * public Shooting Challenge homepage gateway.
 *
 * These open branded Fillout forms (not in-app routes). Keep URLs here so
 * homepage CTAs, tests, and future call sites stay aligned.
 */

export type RegistrationLink = {
  id: "player-registration" | "daily-submissions";
  /** Short link label used in docs and accessible naming. */
  label: string;
  /** Button / CTA copy shown on the homepage gateway. */
  cta: string;
  /** Absolute Fillout form URL. */
  url: string;
};

export const PLAYER_REGISTRATION: RegistrationLink = {
  id: "player-registration",
  label: "Player Registration",
  cta: "Register for the Challenge",
  url: "https://forms.fairfieldbasketballclub.com/shoot/playerregistration",
};

export const DAILY_SUBMISSIONS: RegistrationLink = {
  id: "daily-submissions",
  label: "Already Registered?",
  cta: "Submit Today's Activity",
  url: "https://forms.fairfieldbasketballclub.com/shoot/dailysubmissions",
};

/** Ordered homepage gateway links (registration first, daily log second). */
export const REGISTRATION_LINKS = [PLAYER_REGISTRATION, DAILY_SUBMISSIONS] as const;

export function isRegistrationUrl(url: string): boolean {
  return REGISTRATION_LINKS.some((link) => link.url === url);
}
