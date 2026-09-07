/**
 * Curriculum Hub structured homework routing from Shooting Challenge.
 * Assignment Key → Hub handoff → Curriculum Assignment Slug detail route.
 * Never use SC Homework Library record IDs for Curriculum Hub lessons.
 */

const ASSIGNMENT_KEY_RE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

export function normalizeCurriculumAssignmentKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toUpperCase();
  if (!ASSIGNMENT_KEY_RE.test(key)) return null;
  if (/^REC[A-Z0-9]{14}$/.test(key)) return null;
  return key;
}

/**
 * Authenticated SC entry that mints a Hub handoff and lands on the Curriculum lesson.
 * Relative to Next.js basePath (/shoot). Use prefetch={false} on Links.
 */
export function curriculumHomeworkStartHref(assignmentKey: string): string {
  const key = normalizeCurriculumAssignmentKey(assignmentKey);
  if (!key) {
    throw new Error("Invalid Curriculum Assignment Key");
  }
  return `/api/curriculum/start?assignmentKey=${encodeURIComponent(key)}`;
}

/**
 * Private dashboard / next-action href for a PHA-backed library row.
 * Curriculum-keyed rows open Hub via handoff; legacy rows keep SC library detail.
 */
export function resolveAthleteHomeworkDetailHref(input: {
  assignmentKey?: unknown;
  homeworkLibraryRecordId?: string | null;
}): string | null {
  const key = normalizeCurriculumAssignmentKey(input.assignmentKey);
  if (key) return curriculumHomeworkStartHref(key);
  const libraryId = input.homeworkLibraryRecordId?.trim() ?? "";
  if (/^rec[a-zA-Z0-9]{14}$/.test(libraryId)) {
    return `/homework/${libraryId}`;
  }
  return null;
}
