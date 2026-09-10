import { createHash, randomBytes } from "node:crypto";

import { hasUpstashRedisConfig } from "@/lib/auth/config";
import type { CurriculumGradeBand } from "@/lib/curriculum/handoff";

/** Server-side submit session minted when Hub redeems a one-time handoff. */
export type CurriculumSubmitAuthorization = {
  enrollmentId: string;
  gradeBand: CurriculumGradeBand;
  /** When set at handoff, submit assignmentKey must match. */
  assignmentKey?: string;
  createdAt: number;
  expiresAt: number;
};

const SUBMIT_AUTH_TTL_MS = 4 * 60 * 60 * 1000;
const PREFIX = "curriculum-submit-auth:";
const memoryStore = new Map<string, CurriculumSubmitAuthorization>();

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function upstashCommand(args: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!.trim().replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const response = await fetch(`${url}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Curriculum submit auth store failed (${response.status})`);
  return response.json();
}

/**
 * Mint a longer-lived submit authorization after a handoff is redeemed.
 * Hub must return this token on every homework submit for the session.
 */
export async function mintCurriculumSubmitAuthorization(input: {
  enrollmentId: string;
  gradeBand: CurriculumGradeBand;
  assignmentKey?: string | null;
  now?: number;
}): Promise<string> {
  const now = input.now ?? Date.now();
  const rawToken = randomBytes(32).toString("base64url");
  const hash = tokenHash(rawToken);
  const assignmentKey =
    typeof input.assignmentKey === "string" &&
    /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(input.assignmentKey)
      ? input.assignmentKey
      : undefined;

  const record: CurriculumSubmitAuthorization = {
    enrollmentId: input.enrollmentId,
    gradeBand: input.gradeBand,
    ...(assignmentKey ? { assignmentKey } : {}),
    createdAt: now,
    expiresAt: now + SUBMIT_AUTH_TTL_MS,
  };

  if (hasUpstashRedisConfig()) {
    await upstashCommand([
      "set",
      `${PREFIX}${hash}`,
      JSON.stringify(record),
      "PX",
      String(SUBMIT_AUTH_TTL_MS),
    ]);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Curriculum submit authorization requires Upstash Redis in production");
  } else {
    memoryStore.set(hash, record);
  }

  return rawToken;
}

export async function loadCurriculumSubmitAuthorization(
  rawToken: string,
  now = Date.now(),
): Promise<CurriculumSubmitAuthorization | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(rawToken)) return null;
  const hash = tokenHash(rawToken);
  let record: CurriculumSubmitAuthorization | null = null;

  if (hasUpstashRedisConfig()) {
    const payload = await upstashCommand(["get", `${PREFIX}${hash}`]);
    const raw =
      typeof payload === "object" && payload !== null && "result" in payload
        ? (payload as { result: string | null }).result
        : null;
    if (!raw) return null;
    try {
      record = JSON.parse(raw) as CurriculumSubmitAuthorization;
    } catch {
      return null;
    }
  } else if (process.env.NODE_ENV !== "production") {
    record = memoryStore.get(hash) ?? null;
  }

  if (!record || record.expiresAt <= now) return null;
  return record;
}

export type SubmitAuthorizationValidation =
  | { ok: true; authorization: CurriculumSubmitAuthorization }
  | { ok: false; status: 401 | 403 | 422; error: string };

/**
 * Bind a submit payload to the authorized handoff session.
 * Does not consume the token — idempotent retries and Needs Revision resubmits reuse it.
 */
export function validateCurriculumSubmitAuthorization(input: {
  authorization: CurriculumSubmitAuthorization | null;
  enrollmentId: string;
  assignmentKey: string;
  gradeBand: string;
}): SubmitAuthorizationValidation {
  if (!input.authorization) {
    return {
      ok: false,
      status: 401,
      error: "Submit authorization is missing or expired.",
    };
  }

  if (input.authorization.enrollmentId !== input.enrollmentId) {
    return {
      ok: false,
      status: 403,
      error: "Submit enrollment does not match authorized session.",
    };
  }

  if (
    input.authorization.assignmentKey &&
    input.authorization.assignmentKey !== input.assignmentKey
  ) {
    return {
      ok: false,
      status: 403,
      error: "Submit assignment does not match authorized handoff.",
    };
  }

  if (input.authorization.gradeBand !== input.gradeBand) {
    return {
      ok: false,
      status: 422,
      error: "Submit grade band does not match authorized session.",
    };
  }

  return { ok: true, authorization: input.authorization };
}

/** Parse submit authorization from header or JSON body field. */
export function parseSubmitAuthorizationToken(input: {
  header: string | null;
  bodyField: unknown;
}): string | null {
  const fromHeader = input.header?.trim() ?? "";
  if (fromHeader.length > 0) return fromHeader;
  if (typeof input.bodyField === "string" && input.bodyField.trim().length > 0) {
    return input.bodyField.trim();
  }
  return null;
}

/** Test-only reset for in-memory store. */
export function __resetCurriculumSubmitAuthMemoryForTests(): void {
  memoryStore.clear();
}
