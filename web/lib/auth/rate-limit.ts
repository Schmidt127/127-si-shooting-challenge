import {
  getMagicLinkRateLimitPerEmail,
  getMagicLinkRateLimitPerIp,
} from "@/lib/auth/config";

type Bucket = {
  count: number;
  resetAt: number;
};

const emailBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;

function consumeBucket(
  store: Map<string, Bucket>,
  key: string,
  limit: number,
  now: number,
): boolean {
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  store.set(key, existing);
  return true;
}

export function checkMagicLinkRateLimit(options: {
  email: string;
  ip: string | null;
  now?: number;
}): { allowed: true } | { allowed: false; reason: "email" | "ip" } {
  const now = options.now ?? Date.now();
  const emailLimit = getMagicLinkRateLimitPerEmail();
  const ipLimit = getMagicLinkRateLimitPerIp();

  if (!consumeBucket(emailBuckets, options.email, emailLimit, now)) {
    return { allowed: false, reason: "email" };
  }

  const ip = options.ip?.trim();
  if (ip && !consumeBucket(ipBuckets, ip, ipLimit, now)) {
    return { allowed: false, reason: "ip" };
  }

  return { allowed: true };
}

/** Test helper */
export function resetMagicLinkRateLimitsForTests(): void {
  emailBuckets.clear();
  ipBuckets.clear();
}
