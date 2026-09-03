import { listAirtableRecords } from "@/lib/airtable/client";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import { asText } from "@/lib/data/airtable-values";
import { escapeAirtableString } from "@/lib/data/public-athlete-profile";
import { normalizeParentEmail } from "@/lib/auth/parent-email";
import type { AthleteSessionPayload } from "@/lib/auth/session";

const PARENT_EMAIL_FIELD = "Parent Email - Cleaned";

const ENROLLMENT_AUTH_FIELDS = [
  "Full Athlete Name",
  "Public Profile Slug",
  "School Name Lookup",
  "Grade",
  "Active?",
  PARENT_EMAIL_FIELD,
  "Lifetime XP Total",
  "XP Progress in Current Level",
  "XP Needed for Next Level",
  "Next Level",
  "Current Level - Public Facing Display",
  "Program Instance Name Only",
  "School Year",
] as const;

export type AuthorizedEnrollment = {
  enrollmentId: string;
  displayName: string;
  slug: string;
  school: string;
  grade: string;
  level: string;
  programLabel: string;
  seasonLabel: string;
  xpTotal: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  nextLevelLabel: string;
};

function isRecordId(value: string): boolean {
  return /^rec[a-zA-Z0-9]{14}$/.test(value);
}

export async function findActiveEnrollmentsByParentEmail(
  parentEmail: string,
): Promise<AuthorizedEnrollment[]> {
  const normalized = normalizeParentEmail(parentEmail);
  if (!normalized) return [];

  const filterByFormula = `AND({Active?},LOWER({${PARENT_EMAIL_FIELD}})=LOWER("${escapeAirtableString(normalized)}"))`;

  const response = await listAirtableRecords<Record<string, unknown>>({
    tableName: PUBLIC_AIRTABLE_TABLES.enrollments.name,
    fields: [...ENROLLMENT_AUTH_FIELDS],
    filterByFormula,
    revalidateSeconds: 0,
    maxRecords: 25,
  });

  return response.records
    .filter((record) => isRecordId(record.id))
    .map((record) => {
      const fields = record.fields;
      return {
        enrollmentId: record.id,
        displayName: asText(fields["Full Athlete Name"], "Athlete"),
        slug: asText(fields["Public Profile Slug"], "athlete"),
        school: asText(fields["School Name Lookup"], ""),
        grade: asText(fields["Grade"], ""),
        level: asText(fields["Current Level - Public Facing Display"], "Participant"),
        programLabel:
          asText(fields["Program Instance Name Only"], "") || "Shooting Challenge",
        seasonLabel: asText(fields["School Year"], "") || "Current season",
        xpTotal: Number(asText(fields["Lifetime XP Total"], "0")) || 0,
        xpIntoLevel: Number(asText(fields["XP Progress in Current Level"], "0")) || 0,
        xpForNextLevel: Number(asText(fields["XP Needed for Next Level"], "0")) || 0,
        nextLevelLabel: asText(fields["Next Level"], "Next level"),
      };
    });
}

export function pickPrimaryEnrollment(
  enrollments: AuthorizedEnrollment[],
  preferredId?: string | null,
): AuthorizedEnrollment | null {
  if (enrollments.length === 0) return null;
  if (preferredId) {
    const match = enrollments.find((item) => item.enrollmentId === preferredId);
    if (match) return match;
  }
  return enrollments[0] ?? null;
}

/**
 * Resolve which enrollment the session should show.
 * URL enrollment IDs are never authoritative — selection lives in the signed session only.
 */
export function resolveSessionEnrollment(
  session: AthleteSessionPayload,
): {
  enrollment: AuthorizedEnrollment | null;
  needsSelection: boolean;
  rejectedUrlEnrollmentId: boolean;
} {
  const allowed = session.enrollmentIds.filter(isRecordId);
  if (allowed.length === 0) {
    return {
      enrollment: null,
      needsSelection: false,
      rejectedUrlEnrollmentId: false,
    };
  }

  const selected = session.selectedEnrollmentId?.trim();
  if (selected && allowed.includes(selected)) {
    return {
      enrollment: {
        enrollmentId: selected,
        displayName: "",
        slug: "",
        school: "",
        grade: "",
        level: "",
        programLabel: "",
        seasonLabel: "",
        xpTotal: 0,
        xpIntoLevel: 0,
        xpForNextLevel: 0,
        nextLevelLabel: "",
      },
      needsSelection: false,
      rejectedUrlEnrollmentId: false,
    };
  }

  if (allowed.length === 1) {
    return {
      enrollment: {
        enrollmentId: allowed[0],
        displayName: "",
        slug: "",
        school: "",
        grade: "",
        level: "",
        programLabel: "",
        seasonLabel: "",
        xpTotal: 0,
        xpIntoLevel: 0,
        xpForNextLevel: 0,
        nextLevelLabel: "",
      },
      needsSelection: false,
      rejectedUrlEnrollmentId: false,
    };
  }

  return {
    enrollment: null,
    needsSelection: true,
    rejectedUrlEnrollmentId: false,
  };
}

/**
 * Re-fetch live active enrollments for the parent email, intersect with the session grant,
 * and resolve the selected child from session state only (URL enrollmentId ignored).
 */
export async function loadAuthorizedEnrollmentForSession(
  session: AthleteSessionPayload,
): Promise<{
  enrollments: AuthorizedEnrollment[];
  active: AuthorizedEnrollment | null;
  needsSelection: boolean;
  /** Always false — URL IDs are ignored, not used for authorization. */
  rejectedUrlEnrollmentId: boolean;
}> {
  const live = await findActiveEnrollmentsByParentEmail(session.parentEmail);
  const enrollments = live.filter((item) =>
    session.enrollmentIds.includes(item.enrollmentId),
  );

  if (enrollments.length === 0) {
    return {
      enrollments,
      active: null,
      needsSelection: false,
      rejectedUrlEnrollmentId: false,
    };
  }

  if (enrollments.length === 1) {
    return {
      enrollments,
      active: enrollments[0],
      needsSelection: false,
      rejectedUrlEnrollmentId: false,
    };
  }

  const selected = session.selectedEnrollmentId?.trim();
  if (selected) {
    const match = enrollments.find((item) => item.enrollmentId === selected);
    if (match) {
      return {
        enrollments,
        active: match,
        needsSelection: false,
        rejectedUrlEnrollmentId: false,
      };
    }
  }

  return {
    enrollments,
    active: null,
    needsSelection: true,
    rejectedUrlEnrollmentId: false,
  };
}
