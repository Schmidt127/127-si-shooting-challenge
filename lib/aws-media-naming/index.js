/**
 * FUT-007 — AWS media filename helpers (pure functions, CommonJS mirror).
 * Authority: docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md
 * TypeScript source: index.ts — keep in sync.
 */

"use strict";

const FUT009_LAYOUT_PREFIX = "shooting-challenge";
const NAME_PART_MAX = 40;
const BASENAME_MAX = 180;

function truncatePart(value) {
  return value.length <= NAME_PART_MAX ? value : value.slice(0, NAME_PART_MAX);
}

function sanitizeNamePart(value, fallback) {
  const raw = String(value ?? "").trim();
  if (!raw) return truncatePart(fallback);

  const normalized = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const ascii = normalized.replace(/[^\x20-\x7E]/g, "");
  const collapsed = ascii.replace(/[^A-Za-z0-9]+/g, "");
  const cleaned = collapsed.replace(/\.\./g, "");
  if (!cleaned) return truncatePart(fallback);
  return truncatePart(cleaned);
}

function sanitizeExtension(ext) {
  const raw = String(ext ?? "").trim().toLowerCase();
  const match = raw.match(/(\.[a-z0-9]{1,11})$/);
  if (match) return match[1];
  if (raw && !raw.startsWith(".")) {
    const bare = raw.replace(/[^a-z0-9]/g, "").slice(0, 11);
    if (bare) return `.${bare}`;
  }
  return ".bin";
}

function extensionFromFilename(filename) {
  const raw = String(filename ?? "").replace(/\\/g, "/");
  const base = raw.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return sanitizeExtension("");
  return sanitizeExtension(base.slice(dot));
}

function formatDenverDate(date) {
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

function formatActivityDateStamp(activityDate) {
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

function formatActivityDateFolder(activityDate) {
  const stamp = formatActivityDateStamp(activityDate);
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

function resolveMediaCategory(input) {
  const dest = String(input.uploadDestination ?? "").trim();
  if (dest === "Homework Completions") return "HW";
  if (dest === "Video Feedback") return "VIDEO";

  const purpose = String(input.assetPurpose ?? "").trim();
  if (purpose === "Registration Headshot") return "HEADSHOT";
  return null;
}

function stripTrailingExtension(value) {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return value;
  const ext = value.slice(dot);
  if (/^\.[A-Za-z0-9]{1,11}$/.test(ext)) return value.slice(0, dot);
  return value;
}

function resolveCustomNameSegment(input) {
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

function enforceBasenameMax(stem) {
  if (stem.length <= BASENAME_MAX) return stem;
  return stem.slice(0, BASENAME_MAX);
}

function buildMediaBasename(input) {
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

function nextCollisionIndex(candidateBasename, existingBasenames) {
  const set = new Set((existingBasenames || []).map((b) => b.toLowerCase()));
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

function applyCollisionSuffix(basename, collisionIndex) {
  if (collisionIndex <= 1) return basename;
  const extMatch = basename.match(/(\.[a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1] : "";
  const stem = ext ? basename.slice(0, -ext.length) : basename;
  return `${stem}_${collisionIndex}${ext}`;
}

function sanitizeFolderSegment(value, fallback) {
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

function buildStorageKeyWithFut007Basename(input) {
  const person = sanitizeFolderSegment(input.athleteFolder, "Unknown_Athlete");
  const program = sanitizeFolderSegment(input.programInstanceFolder, "Unknown_Program_Instance");
  const dateFolder = String(input.activityDateFolder).trim();
  const base = String(input.basename).replace(/\\/g, "/").split("/").pop() ?? "upload.bin";
  return `${person}/${program}/${dateFolder}/${base}`;
}

function prependFut009LayoutPrefix(relativeKey) {
  const trimmed = String(relativeKey ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!trimmed) return `${FUT009_LAYOUT_PREFIX}/upload.bin`;
  if (trimmed.startsWith(`${FUT009_LAYOUT_PREFIX}/`)) return trimmed;
  return `${FUT009_LAYOUT_PREFIX}/${trimmed}`;
}

function buildFut009DestinationKey(input) {
  const customSegment = resolveCustomNameSegment({
    category: "VIDEO",
    customVideoFileName: input.customVideoFileName,
  });
  const candidate = buildMediaBasename({
    activityDate: input.activityDate,
    category: "VIDEO",
    lastName: input.lastName,
    firstName: input.firstName,
    customName: customSegment,
    extension: input.extension,
  });
  const collisionIndex = nextCollisionIndex(candidate, input.existingBasenames || []);
  const basename = applyCollisionSuffix(candidate, collisionIndex);
  const activityDateFolder = formatActivityDateFolder(input.activityDate);
  const relative = buildStorageKeyWithFut007Basename({
    athleteFolder: input.athleteFolder,
    programInstanceFolder: input.programInstanceFolder,
    activityDateFolder,
    basename,
  });
  return prependFut009LayoutPrefix(relative);
}

module.exports = {
  FUT009_LAYOUT_PREFIX,
  applyCollisionSuffix,
  buildFut009DestinationKey,
  buildMediaBasename,
  buildStorageKeyWithFut007Basename,
  extensionFromFilename,
  formatActivityDateFolder,
  formatActivityDateStamp,
  nextCollisionIndex,
  prependFut009LayoutPrefix,
  resolveCustomNameSegment,
  resolveMediaCategory,
  sanitizeExtension,
  sanitizeNamePart,
};
