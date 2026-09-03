/**
 * Public Award Recipients — publication gate.
 *
 * Award Recipients (tblTyQXl8aEP93ubK) uses the checkbox field exactly named
 * **Public On Web** (`fldqX3U52KrfOKhua`) as the sole public-website publication
 * control. The field exists in Production; do not create or rename it.
 *
 * Fail closed: unchecked, blank, missing value, or missing field key → not public.
 * Award Status (Approved / Sent / Delivered / etc.) must NEVER gate public visibility.
 *
 * Do NOT reuse Awards catalog flags such as "Include in Overall Awards Section?" —
 * those drive weekly/overall email summary sections, not public website publication.
 *
 * Private dashboard continues to load Award Recipients for authorized enrollments
 * regardless of Public On Web (session-gated). Dashboard `publiclyVisible` is a
 * status badge tone only — not this publication gate.
 */

import { asBoolean, asText, selectName } from "@/lib/data/airtable-values";

/**
 * Confirmed publication field on Award Recipients (checkbox).
 * Fail closed when false, blank, or absent on the record.
 */
export const AWARD_RECIPIENT_PUBLICATION_FIELD: string | null = "Public On Web";

/** Candidate names reviewed against inventory + live schema. */
export const AWARD_RECIPIENT_PUBLICATION_FIELD_CANDIDATES_CHECKED = [
  "Public On Web",
  "Published?",
  "Public?",
  "Public",
  "OK to Publish",
  "OK to Publish on Softr",
  "Show on Public Profile?",
  "Include on Public Profile?",
] as const;

export type PublicAwardItem = {
  /** Opaque client key — never an Airtable record id. */
  key: string;
  awardName: string;
  awardDate: string | null;
  scopeLabel: string | null;
  description: string | null;
};

export type AwardRecipientPublicationFields = Record<string, unknown>;

/**
 * True only when an explicit publication field name is provided and truthy on the record.
 * Used by the public gate; tests may pass a candidate field name without inventing schema.
 */
export function evaluatePublicationFlag(
  fields: AwardRecipientPublicationFields,
  fieldName: string | null,
): boolean {
  if (!fieldName) return false;

  const raw = fields[fieldName];
  if (raw === undefined || raw === null || raw === "") return false;
  if (typeof raw === "boolean") return raw === true;
  if (asBoolean(raw)) return true;

  const named = selectName(raw, "").toLowerCase();
  if (named === "published" || named === "public" || named === "yes") return true;

  const text = asText(raw, "").trim().toLowerCase();
  return text === "true" || text === "yes" || text === "published" || text === "public";
}

/**
 * True only when Public On Web (or configured field) is present and truthy.
 * Fail closed for false / blank / missing.
 * Does not consult Award Status.
 */
export function isAwardRecipientPubliclyPublished(
  fields: AwardRecipientPublicationFields,
): boolean {
  return evaluatePublicationFlag(fields, AWARD_RECIPIENT_PUBLICATION_FIELD);
}

/**
 * Map Award Recipient records to public-safe award items.
 * Returns [] when publication field is unset/false or record is not published.
 * Never includes parent email, Tremendous ids, amounts, coach-only notes, or record ids.
 */
export function mapPublishedPublicAwards(
  records: Array<{ id: string; fields: AwardRecipientPublicationFields }>,
): PublicAwardItem[] {
  if (!AWARD_RECIPIENT_PUBLICATION_FIELD) return [];

  return records
    .filter((record) => isAwardRecipientPubliclyPublished(record.fields))
    .filter((record) => !asBoolean(record.fields["Tremendous Test Record?"]))
    .map((record, index) => {
      const fields = record.fields;
      const awardName =
        asText(fields["Award - Display"], "").trim() ||
        asText(fields["Award Recipient Display"], "").trim() ||
        "Season award";
      const description =
        asText(fields["Award Description - Display"], "").trim() || null;
      const scopeLabel = selectName(fields["Award Scope"], "") || null;
      const awardDate = asText(fields["Date Awarded"], "").trim() || null;

      return {
        key: `pub-award-${index}-${awardName}`.replace(/\s+/g, "-").toLowerCase().slice(0, 80),
        awardName,
        awardDate: awardDate ? awardDate.slice(0, 10) : null,
        scopeLabel: scopeLabel || null,
        description,
      };
    });
}

/**
 * Public profile / leaderboard surfaces must call this.
 * Empty when no records have Public On Web checked.
 * Public athlete profile does not yet surface awards in its typed payload —
 * call this only from surfaces that are already structured for PublicAwardItem[].
 */
export function listPublicAwardsForEnrollment(
  records: Array<{ id: string; fields: AwardRecipientPublicationFields }>,
): PublicAwardItem[] {
  return mapPublishedPublicAwards(records);
}
