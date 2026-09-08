import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { hasUpstashRedisConfig } from "@/lib/auth/config";

/** Structured Curriculum five-band set (Shot Tracker, etc.). Legacy Crow still maps via Hub fallbacks. */
export type CurriculumGradeBand = "1-2" | "3-4" | "5-6" | "7-8" | "9-12" | "K-3" | "4-6";

export type CurriculumHandoffRecord = {
  enrollmentId: string;
  gradeBand: CurriculumGradeBand;
  /** Numeric grade or K — Hub uses this to map five-band → legacy Crow bands without ambiguity. */
  sourceGrade?: string;
  displayName: string;
  /** When set, Hub opens `/{Curriculum Assignment Slug}` for this key. */
  assignmentKey?: string;
  createdAt: number;
  expiresAt: number;
};

const HANDOFF_TTL_MS = 2 * 60 * 1000;
const PREFIX = "curriculum-handoff:";
const memoryStore = new Map<string, CurriculumHandoffRecord>();

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cleanDisplayName(value: string): string {
  const first = value.trim().split(/\s+/)[0] ?? "Athlete";
  return first.replace(/[^\p{L}\p{N}'’-]/gu, "").slice(0, 40) || "Athlete";
}

/** Normalize raw enrollment grade to a compact source token for Hub legacy mapping. */
export function curriculumSourceGradeFromGrade(rawGrade: string): string | null {
  const grade = rawGrade.trim().toLowerCase();
  if (!grade) return null;
  if (grade === "k" || grade.includes("kindergarten")) return "K";
  const match = grade.match(/(?:^|\D)(1[0-2]|[1-9])(?:\D|$)/);
  if (!match) return null;
  return match[1];
}

/**
 * Structured Curriculum standard bands: 1-2 / 3-4 / 5-6 / 7-8 / 9-12.
 * Hub maps these onto legacy Crow K-3 / 4-6 question sets when needed.
 */
export function curriculumGradeBandFromGrade(rawGrade: string): CurriculumGradeBand | null {
  const source = curriculumSourceGradeFromGrade(rawGrade);
  if (!source) return null;
  if (source === "K") return "1-2";
  const numeric = Number(source);
  if (numeric >= 1 && numeric <= 2) return "1-2";
  if (numeric >= 3 && numeric <= 4) return "3-4";
  if (numeric >= 5 && numeric <= 6) return "5-6";
  if (numeric >= 7 && numeric <= 8) return "7-8";
  if (numeric >= 9 && numeric <= 12) return "9-12";
  return null;
}

async function upstashCommand(args: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!.trim().replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const response = await fetch(`${url}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Curriculum handoff store failed (${response.status})`);
  return response.json();
}

export async function mintCurriculumHandoff(input: {
  enrollmentId: string;
  grade: string;
  displayName: string;
  assignmentKey?: string | null;
  now?: number;
}): Promise<string> {
  const gradeBand = curriculumGradeBandFromGrade(input.grade);
  if (!gradeBand) throw new Error("Curriculum grade band unavailable");
  const sourceGrade = curriculumSourceGradeFromGrade(input.grade) ?? undefined;

  const now = input.now ?? Date.now();
  const rawToken = randomBytes(32).toString("base64url");
  const hash = tokenHash(rawToken);
  const assignmentKey =
    typeof input.assignmentKey === "string" &&
    /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(input.assignmentKey)
      ? input.assignmentKey
      : undefined;
  const record: CurriculumHandoffRecord = {
    enrollmentId: input.enrollmentId,
    gradeBand,
    ...(sourceGrade ? { sourceGrade } : {}),
    displayName: cleanDisplayName(input.displayName),
    ...(assignmentKey ? { assignmentKey } : {}),
    createdAt: now,
    expiresAt: now + HANDOFF_TTL_MS,
  };

  if (hasUpstashRedisConfig()) {
    await upstashCommand([
      "set",
      `${PREFIX}${hash}`,
      JSON.stringify(record),
      "PX",
      String(HANDOFF_TTL_MS),
    ]);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Curriculum handoff requires Upstash Redis in production");
  } else {
    memoryStore.set(hash, record);
  }

  return rawToken;
}

export async function consumeCurriculumHandoff(
  rawToken: string,
  now = Date.now(),
): Promise<CurriculumHandoffRecord | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(rawToken)) return null;
  const hash = tokenHash(rawToken);
  let record: CurriculumHandoffRecord | null = null;

  if (hasUpstashRedisConfig()) {
    const payload = await upstashCommand(["getdel", `${PREFIX}${hash}`]);
    const raw =
      typeof payload === "object" && payload !== null && "result" in payload
        ? (payload as { result: string | null }).result
        : null;
    if (!raw) return null;
    try {
      record = JSON.parse(raw) as CurriculumHandoffRecord;
    } catch {
      return null;
    }
  } else if (process.env.NODE_ENV !== "production") {
    record = memoryStore.get(hash) ?? null;
    memoryStore.delete(hash);
  }

  if (!record || record.expiresAt <= now) return null;
  return record;
}

export function curriculumHandoffSecretValid(candidate: string | null): boolean {
  const expected = process.env.CURRICULUM_HANDOFF_SECRET?.trim() ?? "";
  if (expected.length < 32 || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getCurriculumHubUrl(): string | null {
  const raw = process.env.CURRICULUM_HUB_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
    return url.origin;
  } catch {
    return null;
  }
}
