/**
 * Server-only helpers for durable homework resource delivery.
 * Re-fetches Homework Library attachments/links with cache: "no-store".
 * Never logs signed URLs or persists refreshed temporary URLs.
 */

import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import { resolveRegisteringShootingChallengeProgramInstance } from "@/lib/airtable/registering-program-instance";
import { loadActivePhaSchedule } from "@/lib/airtable/pha-repository";
import {
  HOMEWORK_ATTACHMENT_FIELDS,
  HOMEWORK_LINK_FIELDS,
  isDurableHttpUrl,
  isEphemeralAirtableAttachmentUrl,
  type HomeworkAttachmentField,
  type HomeworkLinkField,
} from "@/lib/data/homework-resources";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";
const HOMEWORK_LIBRARY = PUBLIC_AIRTABLE_TABLES.homeworkLibrary.name;

export type HomeworkDeliveryResult =
  | { status: "ok"; url: string; filename: string | null }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string }
  | { status: "error"; reason: string };

function requireAirtableConfig(): { token: string; baseId: string } | null {
  const token = process.env.AIRTABLE_API_TOKEN?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  if (!token || !baseId) return null;
  return { token, baseId };
}

function isHomeworkRecordId(id: string): boolean {
  return /^rec[a-zA-Z0-9]{14}$/.test(id);
}

function isAttachmentId(id: string): boolean {
  return /^att[a-zA-Z0-9]+$/.test(id);
}

export function parseHomeworkAttachmentField(
  value: string | null,
): HomeworkAttachmentField | null {
  if (!value) return null;
  return (HOMEWORK_ATTACHMENT_FIELDS as readonly string[]).includes(value)
    ? (value as HomeworkAttachmentField)
    : null;
}

export function parseHomeworkLinkField(value: string | null): HomeworkLinkField | null {
  if (!value) return null;
  return (HOMEWORK_LINK_FIELDS as readonly string[]).includes(value)
    ? (value as HomeworkLinkField)
    : null;
}

async function assertHomeworkIsPubliclyScheduled(homeworkId: string): Promise<boolean> {
  const programInstance = await resolveRegisteringShootingChallengeProgramInstance(60);
  const { parseResult } = await loadActivePhaSchedule({
    programInstance,
    revalidateSeconds: 60,
    operation: "homework.attachmentDelivery.authorize",
  });
  return parseResult.rows.some((row) => row.homeworkId === homeworkId);
}

async function fetchHomeworkLibraryFields(
  homeworkId: string,
  fields: string[],
): Promise<Record<string, unknown> | null> {
  const config = requireAirtableConfig();
  if (!config) return null;

  const params = new URLSearchParams();
  for (const field of fields) {
    params.append("fields[]", field);
  }

  const url = `${AIRTABLE_API_BASE}/${config.baseId}/${encodeURIComponent(HOMEWORK_LIBRARY)}/${encodeURIComponent(homeworkId)}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Airtable homework fetch failed (${response.status})`);
  }

  const body = (await response.json()) as { fields?: Record<string, unknown> };
  return body.fields ?? {};
}

type RawAttachment = {
  id?: string;
  url?: string;
  filename?: string;
};

function findAttachment(
  value: unknown,
  attachmentId: string,
): { url: string; filename: string | null } | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as RawAttachment;
    if (raw.id !== attachmentId) continue;
    if (typeof raw.url !== "string" || !raw.url.trim()) return null;
    return {
      url: raw.url.trim(),
      filename: typeof raw.filename === "string" ? raw.filename : null,
    };
  }
  return null;
}

/**
 * Resolve a fresh attachment URL for a publicly scheduled homework library record.
 * Caller must redirect/stream without logging the URL.
 */
export async function resolveHomeworkAttachmentDelivery(input: {
  homeworkId: string;
  attachmentId: string;
  field: HomeworkAttachmentField;
}): Promise<HomeworkDeliveryResult> {
  if (!isHomeworkRecordId(input.homeworkId) || !isAttachmentId(input.attachmentId)) {
    return { status: "not_found" };
  }

  try {
    const authorized = await assertHomeworkIsPubliclyScheduled(input.homeworkId);
    if (!authorized) return { status: "not_found" };

    const fields = await fetchHomeworkLibraryFields(input.homeworkId, [input.field]);
    if (!fields) return { status: "not_found" };

    const match = findAttachment(fields[input.field], input.attachmentId);
    if (!match) {
      return {
        status: "unavailable",
        reason: "This file is no longer attached to the assignment.",
      };
    }

    // Fresh URL from Airtable API — use immediately; do not store.
    return { status: "ok", url: match.url, filename: match.filename };
  } catch {
    return { status: "error", reason: "Could not load this homework resource right now." };
  }
}

/**
 * Resolve a homework text-link field. Durable https is returned as-is.
 * Ephemeral Airtable CDN values fail closed (text fields cannot be refreshed).
 */
export async function resolveHomeworkLinkDelivery(input: {
  homeworkId: string;
  field: HomeworkLinkField;
}): Promise<HomeworkDeliveryResult> {
  if (!isHomeworkRecordId(input.homeworkId)) {
    return { status: "not_found" };
  }

  try {
    const authorized = await assertHomeworkIsPubliclyScheduled(input.homeworkId);
    if (!authorized) return { status: "not_found" };

    const fields = await fetchHomeworkLibraryFields(input.homeworkId, [input.field]);
    if (!fields) return { status: "not_found" };

    const raw = fields[input.field];
    const text =
      typeof raw === "string"
        ? raw.trim()
        : typeof raw === "object" &&
            raw !== null &&
            "value" in raw &&
            typeof (raw as { value?: unknown }).value === "string"
          ? String((raw as { value: string }).value).trim()
          : "";

    if (!text) {
      return {
        status: "unavailable",
        reason: "This assignment link is no longer available.",
      };
    }

    if (isDurableHttpUrl(text)) {
      return { status: "ok", url: text, filename: null };
    }

    if (isEphemeralAirtableAttachmentUrl(text)) {
      return {
        status: "unavailable",
        reason:
          "This assignment link has expired. Prefer a durable public URL or a Docs attachment.",
      };
    }

    return {
      status: "unavailable",
      reason: "This assignment link is not a supported public resource.",
    };
  } catch {
    return { status: "error", reason: "Could not load this homework resource right now." };
  }
}
