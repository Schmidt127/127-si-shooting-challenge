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
  xpTotal: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  nextLevelLabel: string;
  programLabel: string;
  seasonLabel: string;
};

export type EnrollmentAccessResult = {
  /** Live authorized enrollments (session ∩ Active? ∩ parent email). */
  enrollments: AuthorizedEnrollment[];
  /** Selected enrollment when ready to load private data. */
  active: AuthorizedEnrollment | null;
  /** True when multiple authorized children and no valid session selection. */
  needsSelection: boolean;
  /** Refreshed enrollment id list for rewriting the session cookie. */
  liveEnrollmentIds: string[];
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
        programLabel:
          asText(fields["Program Instance Name Only"], "") || "Shooting Challenge",
        seasonLabel: asText(fields["School Year"], "") || "Current season",
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
 * Resolve the authorized enrollment for a private dashboard load.
 * Ignores URL/query enrollment IDs — selection comes only from the signed session.
 * Re-intersects session grant with live Active? + parent email on every call.
 */
export async function loadAuthorizedEnrollmentForSession(
  session: AthleteSessionPayload,
): Promise<EnrollmentAccessResult> {
  const live = await findActiveEnrollmentsByParentEmail(session.parentEmail);
  const enrollments = live.filter((item) => session.enrollmentIds.includes(item.enrollmentId));
  const liveEnrollmentIds = enrollments.map((item) => item.enrollmentId);

  if (enrollments.length === 0) {
    return {
      enrollments,
      active: null,
      needsSelection: false,
      liveEnrollmentIds,
    };
  }

  if (enrollments.length === 1) {
    return {
      enrollments,
      active: enrollments[0] ?? null,
      needsSelection: false,
      liveEnrollmentIds,
    };
  }

  const selectedId = session.selectedEnrollmentId?.trim() || null;
  if (selectedId) {
    const active = enrollments.find((item) => item.enrollmentId === selectedId) ?? null;
    if (active) {
      return {
        enrollments,
        active,
        needsSelection: false,
        liveEnrollmentIds,
      };
    }
  }

  return {
    enrollments,
    active: null,
    needsSelection: true,
    liveEnrollmentIds,
  };
}

/**
 * @deprecated URL enrollment IDs are never authoritative (SC-112 multi-child).
 * Kept as a no-op reject helper for migration-era tests.
 */
export function resolveSessionEnrollment(
  session: AthleteSessionPayload,
  urlEnrollmentId?: string,
): { enrollment: AuthorizedEnrollment | null; rejectedUrlEnrollmentId: boolean } {
  const trimmed = urlEnrollmentId?.trim();
  if (trimmed) {
    return { enrollment: null, rejectedUrlEnrollmentId: true };
  }
  const allowed = session.enrollmentIds.filter(isRecordId);
  if (allowed.length === 0) {
    return { enrollment: null, rejectedUrlEnrollmentId: false };
  }
  if (allowed.length > 1 && !session.selectedEnrollmentId) {
    return { enrollment: null, rejectedUrlEnrollmentId: false };
  }
  const primaryId =
    session.selectedEnrollmentId && allowed.includes(session.selectedEnrollmentId)
      ? session.selectedEnrollmentId
      : allowed.length === 1
        ? allowed[0]
        : null;
  if (!primaryId) {
    return { enrollment: null, rejectedUrlEnrollmentId: false };
  }
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
      programLabel: "",
      seasonLabel: "",
    },
    rejectedUrlEnrollmentId: false,
  };
}
