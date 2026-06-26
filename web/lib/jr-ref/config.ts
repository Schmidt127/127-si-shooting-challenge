/**
 * JR Referee Clinics — Airtable base: 127SI - JR REF
 * Fillout.com registrations write participants, mentors, and teams here.
 */

export const JR_REF_AIRTABLE_BASE_ENV = "JR_REF_AIRTABLE_BASE_ID";

export const JR_REF_AIRTABLE_BASE_NAME = "127SI - JR REF";

/** Table names — confirm against base schema before wiring catalog pages. */
export const JR_REF_TABLES = {
  participants: "JR Ref Participants",
  mentors: "Mentor Montana Officials",
  teams: "Teams",
} as const;

export function getJrRefAirtableBaseId(): string | null {
  const baseId = process.env.JR_REF_AIRTABLE_BASE_ID?.trim();
  return baseId || null;
}

export function requireJrRefAirtableBaseId(): string {
  const baseId = getJrRefAirtableBaseId();
  if (!baseId) {
    throw new Error(
      "Missing JR Ref Airtable configuration. Set JR_REF_AIRTABLE_BASE_ID in environment variables.",
    );
  }
  return baseId;
}
