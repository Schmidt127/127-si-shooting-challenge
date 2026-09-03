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
] as const;

export type AuthorizedEnrollment = {
  enrollmentId: string;
  displayName: string;
  slug: string;
  school: string;
  grade: string;
  level: string;
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
        xpTotal: Number(asText(fields["Lifetime XP Total"], "0")) || 0,
        xpIntoLevel: Number(asText(fields["XP Progress in Current Level"], "0")) || 0,
        xpForNextLevel: Number(asText(fields["XP Needed for Next Level"], "0")) || 0,
        nextLevelLabel: asText(fields["Next Level"], "Next level"),
      };
    });
}

export function pickPrimaryEnrollment(
  enrollments: AuthorizedEnrollment[],
  preferredId?: string,
): AuthorizedEnrollment | null {
  if (enrollments.length === 0) return null;
  if (preferredId) {
    const match = enrollments.find((item) => item.enrollmentId === preferredId);
    if (match) return match;
  }
  return enrollments[0] ?? null;
}

export function resolveSessionEnrollment(
  session: AthleteSessionPayload,
  urlEnrollmentId?: string,
): { enrollment: AuthorizedEnrollment | null; rejectedUrlEnrollmentId: boolean } {
  const allowed = session.enrollmentIds.filter(isRecordId);
  if (allowed.length === 0) {
    return { enrollment: null, rejectedUrlEnrollmentId: Boolean(urlEnrollmentId) };
  }

  const trimmed = urlEnrollmentId?.trim();
  if (trimmed) {
    if (!allowed.includes(trimmed)) {
      return { enrollment: null, rejectedUrlEnrollmentId: true };
    }
  }

  const primaryId = trimmed && allowed.includes(trimmed) ? trimmed : allowed[0];
  return {
    enrollment: {
      enrollmentId: primaryId,
      displayName: "",
      slug: "",
      school: "",
      grade: "",
      level: "",
      xpTotal: 0,
      xpIntoLevel: 0,
      xpForNextLevel: 0,
      nextLevelLabel: "",
    },
    rejectedUrlEnrollmentId: false,
  };
}

export async function loadAuthorizedEnrollmentForSession(
  session: AthleteSessionPayload,
  urlEnrollmentId?: string,
): Promise<{
  enrollments: AuthorizedEnrollment[];
  active: AuthorizedEnrollment | null;
  rejectedUrlEnrollmentId: boolean;
}> {
  const enrollments = (await findActiveEnrollmentsByParentEmail(session.parentEmail)).filter(
    (item) => session.enrollmentIds.includes(item.enrollmentId),
  );

  const trimmed = urlEnrollmentId?.trim();
  if (trimmed && !session.enrollmentIds.includes(trimmed)) {
    return { enrollments, active: null, rejectedUrlEnrollmentId: true };
  }

  const active = pickPrimaryEnrollment(enrollments, trimmed);
  return { enrollments, active, rejectedUrlEnrollmentId: false };
}
