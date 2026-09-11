import type { CurriculumSubmitGradeBand } from "@/lib/curriculum/submit-validation";
import { gradeBandNameToSlug } from "@/lib/data/grade-bands";

/**
 * Map an Enrollment Grade Band Name (Airtable) to allowed Curriculum submit snapshots.
 *
 * Includes:
 * - SC program band labels (1-2, 3-4, 5-6, …)
 * - Curriculum question sets derived from actual athlete grade (K-3, 4-6, 7-8, 9-12)
 *
 * Returns null when the enrollment band is missing or unrecognized.
 */
export function allowedCurriculumSubmitBandsForEnrollmentName(
  gradeBandName: string | null | undefined,
): CurriculumSubmitGradeBand[] | null {
  const slug = gradeBandNameToSlug(String(gradeBandName ?? "").trim());
  if (!slug) return null;
  return allowedCurriculumSubmitBandsForProgramBand(slug);
}

/**
 * Allowed submit snapshots for an authorized SC program band (handoff token).
 * Hub may submit the Curriculum question set (e.g. 4-6) while the token still
 * carries the program band (e.g. 5-6).
 */
export function allowedCurriculumSubmitBandsForProgramBand(
  programBand: string | null | undefined,
): CurriculumSubmitGradeBand[] | null {
  const slug = String(programBand ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (!slug) return null;

  switch (slug) {
    case "k-2":
    case "1-2":
      return ["1-2", "K-3"];
    case "3-4":
      // Grade 3 → K-3, grade 4 → 4-6 within the same SC program band.
      return ["3-4", "K-3", "4-6"];
    case "5-6":
    case "4-6":
      return ["5-6", "4-6"];
    case "7-8":
      return ["7-8"];
    case "9-12":
      return ["9-12"];
    case "k-3":
      return ["K-3", "1-2"];
    default:
      return null;
  }
}

export type GradeBandSnapshotValidation =
  | { ok: true }
  | { ok: false; status: 422; error: string };

/**
 * Ensure the client-provided grade band snapshot matches the authorized enrollment.
 * Accepts either the SC program band or the Curriculum question set for that enrollment.
 */
export function validateSubmittedGradeBandSnapshot(input: {
  enrollmentGradeBandName: string | null | undefined;
  authorizedGradeBand: string | null | undefined;
  submittedGradeBand: CurriculumSubmitGradeBand;
}): GradeBandSnapshotValidation {
  const allowed = allowedCurriculumSubmitBandsForEnrollmentName(
    input.enrollmentGradeBandName,
  );
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

  if (input.authorizedGradeBand) {
    const authAllowed = allowedCurriculumSubmitBandsForProgramBand(
      input.authorizedGradeBand,
    );
    if (
      !authAllowed ||
      !authAllowed.includes(input.submittedGradeBand)
    ) {
      return {
        ok: false,
        status: 422,
        error: "Submitted grade band does not match authorized session.",
      };
    }
  }

  return { ok: true };
}
