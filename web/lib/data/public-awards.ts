/**
 * Public Award Recipients display gate.
 *
 * Aug 2026 Production schema snapshot for Award Recipients has **no**
 * `Published?` (or equivalent publication) field. Until Mike adds an explicit
 * publication control, public surfaces must fail closed (show nothing).
 *
 * Private/authenticated dashboard awards remain available behind athlete auth
 * and do not use this module for publication gating.
 */

export const AWARD_RECIPIENTS_PUBLICATION_FIELD_CANDIDATES = [
  "Published?",
  "OK to Publish on Softr",
  "Public?",
  "Show on Public Profile?",
] as const;

/**
 * Known Award Recipients field names from
 * `airtable/schema/snapshots/prod-20260831-fut002-batch1` (40 fields).
 * Intentionally does **not** invent a publication field.
 */
export const AWARD_RECIPIENTS_SCHEMA_FIELDS_AUG_2026 = [
  "Award Recipient Display",
  "Week",
  "Enrollment",
  "Athlete Name - Display",
  "Enrollment Name Lookup",
  "Award",
  "Award Amount",
  "Program Instance",
  "Award Scope",
  "Gift Card Needed?",
  "Date Awarded",
  "Delivery Method",
  "Award Status",
  "Award Recipient Unique Key",
  "Award Category Lookup",
  "Prize Type Lookup",
  "Award Status Sort",
  "Athlete First Name Lookup",
  "Award Description - Lkp",
  "Award Description - Display",
  "RecordId",
  "Tremendous Environment",
  "Tremendous External ID",
  "Tremendous Reward ID",
  "Tremendous Order ID",
  "Tremendous Delivery Status",
  "Tremendous Sent At",
  "Tremendous Error Message",
  "Tremendous Delivered At",
  "Tremendous Response",
  "Tremendous Test Record?",
  "Send to Tremendous?",
  "Ready to Send?",
  "Last Modified",
  "Coach Feedback - Awards",
  "Award - Display",
  "Award Amount - Send",
  "Parent Email - Send",
  "Athlete Name - Send",
  "Parent Email",
] as const;

export type PublicAwardsGateResult =
  | {
      status: "blocked_missing_publication_field";
      awards: [];
      reason: string;
      schemaSnapshot: string;
    }
  | {
      status: "ok";
      awards: unknown[];
      publicationField: string;
    };

/**
 * Resolve whether public award display is allowed.
 * Fail-closed when no publication field exists on Award Recipients.
 */
export function resolvePublicAwardsGate(input?: {
  /** Live or snapshot field names for Award Recipients. */
  awardRecipientFieldNames?: readonly string[];
  schemaSnapshot?: string;
}): PublicAwardsGateResult {
  const fields = input?.awardRecipientFieldNames ?? AWARD_RECIPIENTS_SCHEMA_FIELDS_AUG_2026;
  const fieldSet = new Set(fields.map((name) => name.trim()));
  const publicationField = AWARD_RECIPIENTS_PUBLICATION_FIELD_CANDIDATES.find((candidate) =>
    fieldSet.has(candidate),
  );

  if (!publicationField) {
    return {
      status: "blocked_missing_publication_field",
      awards: [],
      reason:
        "Award Recipients has no publication field (e.g. Published?). Public award display is blocked until Mike adds an explicit publish control.",
      schemaSnapshot:
        input?.schemaSnapshot ??
        "airtable/schema/snapshots/prod-20260831-fut002-batch1/schema_doc_appn84sqPw03zEbTT_20260831_070120.md",
    };
  }

  // Field exists — caller must still filter published rows. This module does not
  // invent values or map unpublished recipients.
  return {
    status: "ok",
    awards: [],
    publicationField,
  };
}

/** Public athlete profiles must never list awards while the gate is blocked. */
export function listPublicAwardsForProfile(): [] {
  const gate = resolvePublicAwardsGate();
  if (gate.status !== "ok") return [];
  // Even when a publication field exists, do not invent a public list here —
  // a dedicated loader must filter `Published? = true` (or equivalent).
  return [];
}
