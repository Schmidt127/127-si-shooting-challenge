/**
 * FUT-007 — AWS media filename helpers (pure functions).
 * Authority: docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md
 */

export type MediaCategory = "HW" | "VIDEO" | "HEADSHOT";

export interface BuildBasenameInput {
  activityDate: string | Date;
  category: MediaCategory;
  lastName?: string | null;
  firstName?: string | null;
  customName?: string | null;
  extension?: string | null;
  collisionIndex?: number;
}

export interface ResolveCustomNameInput {
  category: MediaCategory;
  customVideoFileName?: string | null;
  videoFeedbackFocus?: string | null;
  homeworkAssignmentName?: string | null;
  assetSequence?: number | null;
  headshotLabel?: string | null;
}

const NAME_PART_MAX = 40;
const BASENAME_MAX = 180;

/** NFKD → ASCII, keep alphanumerics only (PascalCase-style concatenation). */
export function sanitizeNamePart(value: unknown, fallback: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return truncatePart(fallback);

  const normalized = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const ascii = normalized.replace(/[^\x20-\x7E]/g, "");
  const collapsed = ascii.replace(/[^A-Za-z0-9]+/g, "");
  const cleaned = collapsed.replace(/\.\./g, "");
  if (!cleaned) return truncatePart(fallback);
  return truncatePart(cleaned);
}

function truncatePart(value: string): string {
  return value.length <= NAME_PART_MAX ? value : value.slice(0, NAME_PART_MAX);
}

/** Lowercase extension with leading dot; default `.bin`. */
export function sanitizeExtension(ext: unknown): string {
  const raw = String(ext ?? "").trim().toLowerCase();
  const match = raw.match(/(\.[a-z0-9]{1,11})$/);
  if (match) return match[1];
  if (raw && !raw.startsWith(".")) {
    const bare = raw.replace(/[^a-z0-9]/g, "").slice(0, 11);
    if (bare) return `.${bare}`;
  }
  return ".bin";
}

/** Extract extension from a filename string. */
export function extensionFromFilename(filename: unknown): string {
  const raw = String(filename ?? "").replace(/\\/g, "/");
  const base = raw.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return sanitizeExtension("");
  return sanitizeExtension(base.slice(dot));
}

/** YYYYMMDD in America/Denver from ISO date or YYYY-MM-DD string. */
export function formatActivityDateStamp(activityDate: string | Date): string {
  if (activityDate instanceof Date) {
    return formatDenverDate(activityDate);
  }
  const text = String(activityDate).trim();
  if (/^\d{8}$/.test(text)) return text;
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDenverDate(parsed);
  }
  throw new Error(`Invalid activity date: ${text}`);
}

function formatDenverDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}${m}${d}`;
}

/** Map upload signals to FUT-007 category token. */
export function resolveMediaCategory(input: {
  uploadDestination?: string | null;
  assetPurpose?: string | null;
}): MediaCategory | null {
  const dest = String(input.uploadDestination ?? "").trim();
  if (dest === "Homework Completions") return "HW";
  if (dest === "Video Feedback") return "VIDEO";

  const purpose = String(input.assetPurpose ?? "").trim();
  if (purpose === "Registration Headshot") return "HEADSHOT";

  return null;
}

/** Resolve custom name segment per spec §7. */
export function resolveCustomNameSegment(input: ResolveCustomNameInput): string {
  const { category } = input;

  if (category === "VIDEO") {
    const custom = stripTrailingExtension(String(input.customVideoFileName ?? "").trim());
    if (custom) return sanitizeNamePart(custom, "VideoUpload");
    const focus = String(input.videoFeedbackFocus ?? "").trim();
    if (focus) {
      const focusPart = sanitizeNamePart(focus, "Video");
      const seq = input.assetSequence;
      if (seq != null && seq > 0) return `${focusPart}${seq}`;
      return focusPart;
    }
    const seq = input.assetSequence;
    if (seq != null && seq > 0) return sanitizeNamePart(`Video${seq}`, "VideoUpload");
    return "VideoUpload";
  }

  if (category === "HW") {
    const assignment = String(input.homeworkAssignmentName ?? "").trim();
    if (assignment) return sanitizeNamePart(assignment, "HomeworkUpload");
    const seq = input.assetSequence;
    if (seq != null && seq > 0) return sanitizeNamePart(`Hw${seq}`, "HomeworkUpload");
    return "HomeworkUpload";
  }

  if (category === "HEADSHOT") {
    const label = String(input.headshotLabel ?? "").trim();
    if (label) return sanitizeNamePart(label, "Profile");
    return "Profile";
  }

  return "Upload";
}

function stripTrailingExtension(value: string): string {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return value;
  const ext = value.slice(dot);
  if (/^\.[A-Za-z0-9]{1,11}$/.test(ext)) return value.slice(0, dot);
  return value;
}

/** Build FUT-007 basename including extension; optional collision suffix. */
export function buildMediaBasename(input: BuildBasenameInput): string {
  const date = formatActivityDateStamp(input.activityDate);
  const category = input.category;
  const last = sanitizeNamePart(input.lastName, "UnknownAthlete");
  const first = sanitizeNamePart(input.firstName, "UnknownAthlete");
  const custom = sanitizeNamePart(input.customName, resolveCustomNameSegment({ category }));
  const ext = sanitizeExtension(input.extension);

  let stem = `${date}_${category}_${last}_${first}_${custom}`;
  if (input.collisionIndex != null && input.collisionIndex > 1) {
    stem = `${stem}_${input.collisionIndex}`;
  }

  stem = enforceBasenameMax(stem);
  return `${stem}${ext}`;
}

function enforceBasenameMax(stem: string): string {
  if (stem.length <= BASENAME_MAX) return stem;
  return stem.slice(0, BASENAME_MAX);
}

/**
 * Given a basename already in use, return the next collision index (2, 3, …).
 * `existingBasenames` should be full basenames with extension.
 */
export function nextCollisionIndex(
  candidateBasename: string,
  existingBasenames: readonly string[],
): number {
  const set = new Set(existingBasenames.map((b) => b.toLowerCase()));
  if (!set.has(candidateBasename.toLowerCase())) return 1;

  const extMatch = candidateBasename.match(/(\.[a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1] : "";
  const stem = ext ? candidateBasename.slice(0, -ext.length) : candidateBasename;

  for (let i = 2; i < 1000; i += 1) {
    const alt = `${stem}_${i}${ext}`;
    if (!set.has(alt.toLowerCase())) return i;
  }
  return 1000;
}

/** Apply collision suffix when index > 1. */
export function applyCollisionSuffix(basename: string, collisionIndex: number): string {
  if (collisionIndex <= 1) return basename;
  const extMatch = basename.match(/(\.[a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1] : "";
  const stem = ext ? basename.slice(0, -ext.length) : basename;
  return `${stem}_${collisionIndex}${ext}`;
}

/** Full Storage Key folder prefix + FUT-007 basename (unchanged folder rules from C-013). */
export function buildStorageKeyWithFut007Basename(input: {
  athleteFolder: string;
  programInstanceFolder: string;
  activityDateFolder: string;
  basename: string;
}): string {
  const person = sanitizeFolderSegment(input.athleteFolder, "Unknown_Athlete");
  const program = sanitizeFolderSegment(input.programInstanceFolder, "Unknown_Program_Instance");
  const dateFolder = String(input.activityDateFolder).trim();
  const base = String(input.basename).replace(/\\/g, "/").split("/").pop() ?? "upload.bin";
  return `${person}/${program}/${dateFolder}/${base}`;
}

function sanitizeFolderSegment(value: string, fallback: string): string {
  const token = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[\\|/]+/g, " ")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[\._]+|[\._]+$/g, "");
  if (!token || token === ".." || token === ".") return fallback;
  return token;
}
