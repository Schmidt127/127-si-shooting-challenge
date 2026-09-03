/**
 * Public Award Recipients — publication gate.
 *
 * Exact Award Recipients checkbox (Mike-authorized): **Public On Web**
 * - true → eligible for public display
 * - false, blank, missing, or unavailable → private (fail closed)
 *
 * Do NOT use Award Status as a public-visibility substitute.
 * Do NOT reuse Awards catalog email-section flags.
 *
 * Private dashboard may still show authorized private award details.
 * Public surfaces never include amount, reason/coach notes, parent email,
 * Tremendous ids, internal status, or Airtable record ids.
 *
 * Airtable rename required if Production still shows `Public on Web`
 * (lowercase "on") — API field names are case-sensitive.
 */

import { createHash } from "node:crypto";

import { asBoolean, asText, selectName } from "@/lib/data/airtable-values";

/** Exact Award Recipients publication checkbox — only this field gates public display. */
export const AWARD_RECIPIENT_PUBLICATION_FIELD = "Public On Web" as const;

/** Server-side Airtable formula: Public On Web checked. */
export const PUBLIC_ON_WEB_FILTER_FORMULA = "{Public On Web}=TRUE()";

/** Fields safe to request for public award mapping (no amount / email / Tremendous). */
export const PUBLIC_AWARD_RECIPIENT_FIELDS = [
  AWARD_RECIPIENT_PUBLICATION_FIELD,
  "Award - Display",
  "Award Recipient Display",
  "Award Description - Display",
  "Award Scope",
  "Date Awarded",
  "Tremendous Test Record?",
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

function opaquePublicAwardKey(recordId: string): string {
  const digest = createHash("sha256").update(`pub-award:${recordId}`).digest("hex").slice(0, 20);
  return `pub-award-${digest}`;
}

/**
 * True only when Public On Web is explicitly boolean true (or truthy checkbox).
 * Missing / blank / false / unavailable → false.
 */
export function evaluatePublicationFlag(
  fields: AwardRecipientPublicationFields,
  fieldName: string | null,
): boolean {
  if (!fieldName) return false;

  if (!(fieldName in fields)) return false;

  const raw = fields[fieldName];
  if (raw === undefined || raw === null || raw === "") return false;
  if (typeof raw === "boolean") return raw === true;
  if (raw === 1 || raw === "1") return true;
  if (asBoolean(raw)) return true;

  return false;
}

/**
 * True only when Public On Web is explicitly true on the record.
 * Never consults Award Status.
 */
export function isAwardRecipientPubliclyPublished(
  fields: AwardRecipientPublicationFields,
): boolean {
  return evaluatePublicationFlag(fields, AWARD_RECIPIENT_PUBLICATION_FIELD);
}

/**
 * Map Award Recipient records to public-safe award items.
 * Returns [] when Public On Web is not explicitly true.
 */
export function mapPublishedPublicAwards(
  records: Array<{ id: string; fields: AwardRecipientPublicationFields }>,
): PublicAwardItem[] {
  return records
    .filter((record) => isAwardRecipientPubliclyPublished(record.fields))
    .filter((record) => !asBoolean(record.fields["Tremendous Test Record?"]))
    .map((record) => {
      const fields = record.fields;
      const awardName =
        asText(fields["Award - Display"], "").trim() ||
        asText(fields["Award Recipient Display"], "").trim() ||
        "Season award";
      const description =
        asText(fields["Award Description - Display"], "").trim() || null;
      const scopeLabel = selectName(fields["Award Scope"], "") || null;
      const awardDateRaw = asText(fields["Date Awarded"], "").trim();

      return {
        key: opaquePublicAwardKey(record.id),
        awardName,
        awardDate: awardDateRaw ? awardDateRaw.slice(0, 10) : null,
        scopeLabel: scopeLabel || null,
        description,
      };
    });
}

/** Public profile / leaderboard surfaces must call this. */
export function listPublicAwardsForEnrollment(
  records: Array<{ id: string; fields: AwardRecipientPublicationFields }>,
): PublicAwardItem[] {
  return mapPublishedPublicAwards(records);
}

/**
 * Assert a public HTML / JSON payload never contains private award material.
 * Used by tests — returns the first offending needle or null.
 */
export function findLeakedPrivateAwardMaterial(serialized: string): string | null {
  if (/\brec[A-Za-z0-9]{14}\b/.test(serialized)) return "airtable-record-id";
  for (const needle of [
    "Award Amount",
    "Parent Email",
    "Tremendous",
    "Award Status",
    "Coach Feedback",
  ]) {
    if (serialized.includes(needle)) return needle;
  }
  return null;
}
