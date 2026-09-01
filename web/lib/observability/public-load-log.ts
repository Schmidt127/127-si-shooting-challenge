import { randomUUID } from "node:crypto";

export type PublicLoadLogLevel = "info" | "warn" | "error";

export type PublicLoadLogEntry = {
  correlationId: string;
  operation: string;
  level: PublicLoadLogLevel;
  category?: string;
  durationMs?: number;
  airtableStatus?: number;
  safeDetail?: Record<string, string | number | boolean | null>;
};

export function createCorrelationId(): string {
  return randomUUID();
}

/** Structured server-side log for public data loads — never log tokens or PII. */
export function logPublicLoad(entry: PublicLoadLogEntry): void {
  const payload = {
    ts: new Date().toISOString(),
    ...entry,
  };

  if (entry.level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  if (entry.level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }
  console.info(JSON.stringify(payload));
}
