import type { CurriculumSubmitGradeBand } from "@/lib/curriculum/submit-validation";
import { gradeBandNameToSlug } from "@/lib/data/grade-bands";

/**
 * Map an Enrollment Grade Band Name (Airtable) to allowed Curriculum submit snapshots.
 * Returns null when the enrollment band is missing or unrecognized.
 */
export function allowedCurriculumSubmitBandsForEnrollmentName(
  gradeBandName: string | null | undefined,
): CurriculumSubmitGradeBand[] | null {
  const slug = gradeBandNameToSlug(String(gradeBandName ?? "").trim());
  if (!slug) return null;

  switch (slug) {
    case "k-2":
      // Structured five-band + legacy Hub K-3 umbrella for Crow content.
      return ["1-2", "K-3"];
    case "3-4":
      return ["3-4"];
    case "5-6":
      return ["5-6", "4-6"];
    case "7-8":
      return ["7-8"];
    case "9-12":
      return ["9-12"];
    default:
      return null;
  }
}

export type GradeBandSnapshotValidation =
  | { ok: true }
  | { ok: false; status: 422; error: string };

/**
 * Ensure the client-provided grade band snapshot matches the authorized enrollment.
 * Does not trust accepted string lists alone — cross-checks enrollment Grade Band Name.
 */
export function validateSubmittedGradeBandSnapshot(input: {
  enrollmentGradeBandName: string | null | undefined;
  authorizedGradeBand: string | null | undefined;
  submittedGradeBand: CurriculumSubmitGradeBand;
}): GradeBandSnapshotValidation {
  const allowed = allowedCurriculumSubmitBandsForEnrollmentName(input.enrollmentGradeBandName);
  if (!allowed) {
    return {
      ok: false,
      status: 422,
      error: "Enrollment grade band is unavailable; structured homework submit rejected.",
    };
  }

  if (!allowed.includes(input.submittedGradeBand)) {
    return {
      ok: false,
      status: 422,
      error: "Submitted grade band does not match enrollment grade band.",
    };
  }

  if (
    input.authorizedGradeBand &&
    input.authorizedGradeBand !== input.submittedGradeBand
  ) {
    return {
      ok: false,
      status: 422,
      error: "Submitted grade band does not match authorized session.",
    };
  }

  return { ok: true };
}
