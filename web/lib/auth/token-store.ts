import {
  getMagicLinkTokenTtlMs,
  hasUpstashRedisConfig,
  isMagicLinkTokenStoreAvailable,
} from "@/lib/auth/config";

export type StoredMagicLinkToken = {
  parentEmail: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
};

export interface MagicLinkTokenStore {
  save(hash: string, record: StoredMagicLinkToken): Promise<void>;
  consume(hash: string, now?: number): Promise<
    | { status: "ok"; record: StoredMagicLinkToken }
    | { status: "missing" }
    | { status: "expired" }
    | { status: "used" }
  >;
  clear(): Promise<void>;
}

const memoryStore = new Map<string, StoredMagicLinkToken>();

export class InMemoryMagicLinkTokenStore implements MagicLinkTokenStore {
  async save(hash: string, record: StoredMagicLinkToken): Promise<void> {
    memoryStore.set(hash, { ...record });
  }

  async consume(
    hash: string,
    now = Date.now(),
  ): Promise<
    | { status: "ok"; record: StoredMagicLinkToken }
    | { status: "missing" }
    | { status: "expired" }
    | { status: "used" }
  > {
    const record = memoryStore.get(hash);
    if (!record) return { status: "missing" };
    if (record.usedAt) return { status: "used" };
    if (record.expiresAt <= now) return { status: "expired" };
    record.usedAt = now;
    memoryStore.set(hash, record);
    return { status: "ok", record: { ...record } };
  }

  async clear(): Promise<void> {
    memoryStore.clear();
  }
}

class UpstashMagicLinkTokenStore implements MagicLinkTokenStore {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  private async command(args: string[]): Promise<unknown> {
    const response = await fetch(`${this.url}/${args.map(encodeURIComponent).join("/")}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Upstash command failed (${response.status})`);
    }
    return response.json();
  }

  async save(hash: string, record: StoredMagicLinkToken): Promise<void> {
    const ttlMs = Math.max(1, record.expiresAt - Date.now());
    await this.command([
      "set",
      `athlete-magic:${hash}`,
      JSON.stringify(record),
      "PX",
      String(Math.ceil(ttlMs)),
    ]);
  }

  async consume(
    hash: string,
    now = Date.now(),
  ): Promise<
    | { status: "ok"; record: StoredMagicLinkToken }
    | { status: "missing" }
    | { status: "expired" }
    | { status: "used" }
  > {
    const key = `athlete-magic:${hash}`;
    // GETDEL is atomic — prevents concurrent verify requests from both succeeding.
    const payload = await this.command(["getdel", key]);
    if (typeof payload !== "object" || payload === null || !("result" in payload)) {
      return { status: "missing" };
    }
    const raw = (payload as { result: string | null }).result;
    if (!raw) return { status: "missing" };

    let record: StoredMagicLinkToken;
    try {
      record = JSON.parse(raw) as StoredMagicLinkToken;
    } catch {
      return { status: "missing" };
    }

    if (record.usedAt) return { status: "used" };
    if (record.expiresAt <= now) return { status: "expired" };

    return { status: "ok", record: { ...record, usedAt: now } };
  }

  async clear(): Promise<void> {
    // Test helper — Upstash keys expire naturally; no scan in production.
  }
}

/**
 * Production without Upstash cannot share tokens across serverless instances.
 * save() rejects so magic-link email is never sent with an unusable token.
 */
class UnavailableMagicLinkTokenStore implements MagicLinkTokenStore {
  async save(): Promise<void> {
    throw new Error("Magic link token store unavailable in production without Upstash Redis");
  }

  async consume(): Promise<{ status: "missing" }> {
    return { status: "missing" };
  }

  async clear(): Promise<void> {
    // no-op
  }
}

let singletonStore: MagicLinkTokenStore | null = null;

export function getMagicLinkTokenStore(): MagicLinkTokenStore {
  if (singletonStore) return singletonStore;

  if (hasUpstashRedisConfig()) {
    singletonStore = new UpstashMagicLinkTokenStore(
      process.env.UPSTASH_REDIS_REST_URL!.trim(),
      process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    );
  } else if (process.env.NODE_ENV === "production") {
    singletonStore = new UnavailableMagicLinkTokenStore();
  } else {
    singletonStore = new InMemoryMagicLinkTokenStore();
  }

  return singletonStore;
}

/** Test-only reset for in-memory singleton. */
export function resetMagicLinkTokenStoreForTests(): void {
  singletonStore = new InMemoryMagicLinkTokenStore();
}

export function buildMagicLinkTokenRecord(parentEmail: string, now = Date.now()): StoredMagicLinkToken {
  return {
    parentEmail,
    createdAt: now,
    expiresAt: now + getMagicLinkTokenTtlMs(),
  };
}
