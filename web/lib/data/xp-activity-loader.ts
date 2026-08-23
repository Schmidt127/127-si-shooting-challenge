/**
 * Enrollment-scoped XP Events loader for athlete dashboards.
 *
 * Authoritative filter: XP Events → Enrollment Record ID (lookup of Enrollments.Record Id).
 * Do NOT use FIND(recordId, ARRAYJOIN({Enrollment})) — ARRAYJOIN on link fields returns
 * display names, not Airtable record IDs (see docs/testing/evidence/.../ENROLLMENT-XP-LINK-INVENTORY.json).
 */

import { listAirtableRecords } from "@/lib/airtable/client";
import { AirtableApiError } from "@/lib/airtable/errors";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import {
  asBoolean,
  asOptionalDateKey,
  asOptionalNumber,
  asText,
  linkedRecordIds,
} from "@/lib/data/airtable-values";
import { escapeAirtableString } from "@/lib/data/public-athlete-profile";
import type { XpEventSummary } from "@/types/xp";

export const XP_EVENTS_ENROLLMENT_RECORD_ID_FIELD = "Enrollment Record ID";
export const XP_EVENTS_TABLE = PUBLIC_AIRTABLE_TABLES.xpEvents.name;

const XP_EVENT_FIELDS = [
  "Active?",
  "Active XP Points",
  "XP Points",
  "XP Reason Public",
  "XP Source",
  "XP Activity Date",
  "Created",
  "Source Key",
  XP_EVENTS_ENROLLMENT_RECORD_ID_FIELD,
] as const;

const ENROLLMENT_LINK_FIELDS = ["XP Events"] as const;

const LINKED_ID_CHUNK_SIZE = 15;
const DEFAULT_MAX_ROWS = 100;
const REVALIDATE_SECONDS = 60;
const LINKED_IDS_CACHE_TTL_MS = 60_000;
const LINKED_IDS_CACHE_MAX = 50;

export type XpEventRecordFields = {
  "Active?"?: unknown;
  "Active XP Points"?: unknown;
  "XP Points"?: unknown;
  "XP Reason Public"?: unknown;
  "XP Source"?: unknown;
  "XP Activity Date"?: unknown;
  Created?: unknown;
  "Source Key"?: unknown;
  "Enrollment Record ID"?: unknown;
};

export type XpActivityLoadStrategy = "enrollment_record_id" | "linked_ids_fallback";

export type XpActivityLoadResult = {
  rows: XpEventSummary[];
  strategy: XpActivityLoadStrategy;
  warning?: string;
};

export class XpActivityLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "XpActivityLoadError";
  }
}

type LinkedXpIdsCacheEntry = {
  ids: string[];
  fetchedAt: number;
};

const linkedXpIdsCache = new Map<string, LinkedXpIdsCacheEntry>();

/** @deprecated Broken — ARRAYJOIN({Enrollment}) returns athlete display names, not record IDs. */
export function buildBrokenEnrollmentJoinFilter(enrollmentId: string): string {
  return `FIND("${escapeAirtableString(enrollmentId)}", ARRAYJOIN({Enrollment}))`;
}

/** Preferred enrollment-scoped XP Events filter (Enrollment Record ID lookup). */
export function buildEnrollmentRecordIdFilter(enrollmentId: string): string {
  return `{${XP_EVENTS_ENROLLMENT_RECORD_ID_FIELD}}="${escapeAirtableString(enrollmentId)}"`;
}

export function isValidEnrollmentRecordId(value: string): boolean {
  return typeof value === "string" && value.startsWith("rec") && value.trim().length >= 14;
}

export function buildRecordIdOrFilter(ids: string[]): string | null {
  const unique = [...new Set(ids.filter((id) => id.startsWith("rec")))];
  if (unique.length === 0) return null;
  if (unique.length === 1) return `RECORD_ID()="${unique[0]}"`;
  return `OR(${unique.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
}

export function chunkRecordIds(ids: string[], chunkSize = LINKED_ID_CHUNK_SIZE): string[][] {
  const unique = [...new Set(ids.filter((id) => id.startsWith("rec")))];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }
  return chunks;
}

export function mapXpEventRecordToSummary(
  record: { id: string; fields: XpEventRecordFields },
): XpEventSummary {
  const fields = record.fields;
  const active = asBoolean(fields["Active?"]);
  const activePoints = asOptionalNumber(fields["Active XP Points"]);
  const rawPoints = asOptionalNumber(fields["XP Points"]);
  const points = active ? (activePoints ?? rawPoints ?? 0) : (rawPoints ?? 0);

  return {
    id: record.id,
    points,
    sourceLabel: asText(fields["XP Source"], "") || undefined,
    reasonPublic: asText(fields["XP Reason Public"], "") || undefined,
    activityDate:
      asOptionalDateKey(fields["XP Activity Date"]) ??
      asOptionalDateKey(fields.Created) ??
      undefined,
  };
}

export function sortXpEventsNewestFirst(events: XpEventSummary[]): XpEventSummary[] {
  return [...events].sort((a, b) => {
    const dateA = a.activityDate ?? "";
    const dateB = b.activityDate ?? "";
    const dateCmp = dateB.localeCompare(dateA);
    if (dateCmp !== 0) return dateCmp;
    return b.id.localeCompare(a.id);
  });
}

/**
 * When duplicate Source Keys exist, keep the active row; otherwise prefer the newest Created date.
 */
export function dedupeXpEventRecords(
  records: Array<{ id: string; fields: XpEventRecordFields }>,
): Array<{ id: string; fields: XpEventRecordFields }> {
  const byKey = new Map<string, { id: string; fields: XpEventRecordFields }>();

  for (const record of records) {
    const sourceKey = asText(record.fields["Source Key"], "").trim();
    const key = sourceKey && sourceKey !== "—" ? sourceKey : record.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }

    const existingActive = asBoolean(existing.fields["Active?"]);
    const recordActive = asBoolean(record.fields["Active?"]);
    if (recordActive && !existingActive) {
      byKey.set(key, record);
      continue;
    }
    if (recordActive !== existingActive) continue;

    const existingCreated = asOptionalDateKey(existing.fields.Created) ?? "";
    const recordCreated = asOptionalDateKey(record.fields.Created) ?? "";
    if (recordCreated > existingCreated) {
      byKey.set(key, record);
    }
  }

  return [...byKey.values()];
}

function readCachedLinkedXpIds(enrollmentId: string): string[] | null {
  const entry = linkedXpIdsCache.get(enrollmentId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > LINKED_IDS_CACHE_TTL_MS) {
    linkedXpIdsCache.delete(enrollmentId);
    return null;
  }
  return entry.ids;
}

function writeCachedLinkedXpIds(enrollmentId: string, ids: string[]): void {
  if (linkedXpIdsCache.size >= LINKED_IDS_CACHE_MAX) {
    const oldestKey = linkedXpIdsCache.keys().next().value;
    if (oldestKey) linkedXpIdsCache.delete(oldestKey);
  }
  linkedXpIdsCache.set(enrollmentId, { ids, fetchedAt: Date.now() });
}

export function clearLinkedXpIdsCache(): void {
  linkedXpIdsCache.clear();
}

export async function fetchLinkedXpEventIds(enrollmentId: string): Promise<string[]> {
  const cached = readCachedLinkedXpIds(enrollmentId);
  if (cached) return cached;

  const response = await listAirtableRecords<{ "XP Events"?: unknown }>({
    tableName: PUBLIC_AIRTABLE_TABLES.enrollments.name,
    maxRecords: 1,
    fields: [...ENROLLMENT_LINK_FIELDS],
    filterByFormula: `RECORD_ID()="${escapeAirtableString(enrollmentId)}"`,
    revalidateSeconds: REVALIDATE_SECONDS,
  });

  const enrollment = response.records[0];
  const ids = enrollment ? linkedRecordIds(enrollment.fields["XP Events"]) : [];
  writeCachedLinkedXpIds(enrollmentId, ids);
  return ids;
}

async function fetchXpEventsByRecordIds(
  ids: string[],
  maxRecords: number,
): Promise<Array<{ id: string; fields: XpEventRecordFields }>> {
  const chunks = chunkRecordIds(ids);
  if (chunks.length === 0) return [];

  const collected = new Map<string, { id: string; fields: XpEventRecordFields }>();

  for (const chunk of chunks) {
    const filter = buildRecordIdOrFilter(chunk);
    if (!filter) continue;

    const response = await listAirtableRecords<XpEventRecordFields>({
      tableName: XP_EVENTS_TABLE,
      fields: [...XP_EVENT_FIELDS],
      filterByFormula: filter,
      maxRecords: Math.min(maxRecords, 100),
      revalidateSeconds: REVALIDATE_SECONDS,
    });

    for (const record of response.records) {
      collected.set(record.id, record);
    }
  }

  return [...collected.values()];
}

function isEnrollmentRecordIdFieldError(error: unknown): boolean {
  return (
    error instanceof AirtableApiError &&
    /UNKNOWN_FIELD_NAME|Unknown field names|Invalid formula/i.test(error.body)
  );
}

/**
 * Load XP activity rows for one enrollment.
 * Returns an empty array when the athlete truly has no XP Events.
 * Throws when the enrollment id is invalid or linked XP Events cannot be resolved.
 */
export async function loadXpActivityForEnrollment(
  enrollmentId: string,
  options?: {
    maxRows?: number;
    includeInactive?: boolean;
    revalidateSeconds?: number;
  },
): Promise<XpActivityLoadResult> {
  if (!isValidEnrollmentRecordId(enrollmentId)) {
    throw new XpActivityLoadError(`Invalid enrollment record id: "${enrollmentId}"`);
  }

  const maxRows = options?.maxRows ?? DEFAULT_MAX_ROWS;
  const includeInactive = options?.includeInactive ?? false;
  const revalidateSeconds = options?.revalidateSeconds ?? REVALIDATE_SECONDS;
  const fetchLimit = Math.min(maxRows * 3, 300);

  let strategy: XpActivityLoadStrategy = "enrollment_record_id";
  let warning: string | undefined;
  let records: Array<{ id: string; fields: XpEventRecordFields }> = [];

  try {
    const response = await listAirtableRecords<XpEventRecordFields>({
      tableName: XP_EVENTS_TABLE,
      fields: [...XP_EVENT_FIELDS],
      filterByFormula: buildEnrollmentRecordIdFilter(enrollmentId),
      sort: [
        { field: "XP Activity Date", direction: "desc" },
        { field: "Created", direction: "desc" },
      ],
      maxRecords: fetchLimit,
      revalidateSeconds,
    });
    records = response.records;
  } catch (error) {
    if (!isEnrollmentRecordIdFieldError(error)) {
      throw new XpActivityLoadError(
        `Failed to query XP Events for enrollment ${enrollmentId}`,
        { cause: error },
      );
    }
    strategy = "linked_ids_fallback";
    warning =
      "XP Events → Enrollment Record ID is unavailable in this base; using Enrollment-linked XP Event IDs.";
  }

  const linkedIds = await fetchLinkedXpEventIds(enrollmentId);

  if (records.length === 0 && linkedIds.length > 0) {
    strategy = "linked_ids_fallback";
    if (!warning) {
      warning =
        "Enrollment-scoped filter returned no XP rows while Enrollment has linked XP Events; loaded via linked-record fallback.";
    }
    records = await fetchXpEventsByRecordIds(linkedIds, fetchLimit);
  }

  if (records.length === 0 && linkedIds.length > 0) {
    throw new XpActivityLoadError(
      `Enrollment ${enrollmentId} has ${linkedIds.length} linked XP Events but none could be loaded.`,
    );
  }

  let working = dedupeXpEventRecords(records);
  if (!includeInactive) {
    working = working.filter((record) => asBoolean(record.fields["Active?"]));
  }

  const rows = sortXpEventsNewestFirst(working.map(mapXpEventRecordToSummary)).slice(0, maxRows);

  return { rows, strategy, warning };
}
