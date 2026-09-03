/**
 * Public Award Recipients — publication gate.
 *
 * Award Recipients (tblTyQXl8aEP93ubK) currently has NO Public / Published field
 * (inventory + live MCP schema 2026-09-03). Until Mike adds/confirms an explicit
 * publication checkbox/select, public surfaces must keep award recipients hidden.
 *
 * Do NOT reuse Awards catalog flags such as "Include in Overall Awards Section?" —
 * those drive weekly/overall email summary sections, not public website publication.
 *
 * Private dashboard continues to load Award Recipients for authorized enrollments.
 */

import { asBoolean, asText, selectName } from "@/lib/data/airtable-values";

/**
 * Confirmed publication field on Award Recipients.
 * `null` = schema gap — no public publication control exists yet.
 */
export const AWARD_RECIPIENT_PUBLICATION_FIELD: string | null = null;

/** Candidate names reviewed against inventory + live schema — none present. */
export const AWARD_RECIPIENT_PUBLICATION_FIELD_CANDIDATES_CHECKED = [
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
 * True only when an explicit, configured publication field is present and truthy.
 * With AWARD_RECIPIENT_PUBLICATION_FIELD === null, always returns false.
 */
export function isAwardRecipientPubliclyPublished(
  fields: AwardRecipientPublicationFields,
): boolean {
  return evaluatePublicationFlag(fields, AWARD_RECIPIENT_PUBLICATION_FIELD);
}

/**
 * Map Award Recipient records to public-safe award items.
 * Returns [] when publication field is missing/unset or record is not published.
 * Never includes parent email, Tremendous ids, coach-only notes, or record ids.
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

/** Public profile / leaderboard surfaces must call this — empty until field exists. */
export function listPublicAwardsForEnrollment(
  records: Array<{ id: string; fields: AwardRecipientPublicationFields }>,
): PublicAwardItem[] {
  return mapPublishedPublicAwards(records);
}
