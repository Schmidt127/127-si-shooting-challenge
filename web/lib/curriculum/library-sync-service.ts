/**
 * Curriculum Hub → SC: sync authoritative Assignment Key onto Homework Library.
 * Hub owns lesson identity (assignmentKey); SC owns the Airtable library row used by PHA + dashboard.
 *
 * Writable Homework Library fields used here (live schema tblUuxwYlX4EQ9MKE):
 * - Assignment Key (singleLineText)
 * - Assignment Title (singleLineText) — create only
 * - Active? / Published? (checkbox) — create only
 *
 * Never write:
 * - Brief Description - Display (aiText / computed — Airtable 422)
 * - Notes (field does not exist on Homework Library)
 */

import {
  createAirtableRecord,
  listAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/client";
import { AirtableApiError } from "@/lib/airtable/errors";
import { PHA_AIRTABLE_FIELDS } from "@/lib/airtable/pha-field-map";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import type { LibrarySyncPayload } from "@/lib/curriculum/library-sync-validation";
import { asText, linkedRecordIds } from "@/lib/data/airtable-values";
import { escapeAirtableString } from "@/lib/data/public-athlete-profile";

const TABLES = PUBLIC_AIRTABLE_TABLES;

type LibraryFields = {
  "Assignment Key"?: unknown;
  "Assignment Title"?: unknown;
};

type PhaFields = {
  [K in (typeof PHA_AIRTABLE_FIELDS)[keyof typeof PHA_AIRTABLE_FIELDS]]?: unknown;
};

export type LibrarySyncResult =
  | {
      ok: true;
      homeworkLibraryRecordId: string;
      assignmentKey: string;
      action: "created" | "updated" | "unchanged";
    }
  | { ok: false; status: 404 | 409 | 422 | 503; error: string };

/** Fields safe to PATCH on an existing Homework Library row (identity only). */
export function buildExistingRowPatchFields(
  payload: Pick<LibrarySyncPayload, "assignmentKey">,
): Record<string, unknown> {
  return {
    "Assignment Key": payload.assignmentKey,
  };
}

/** Fields safe to POST when creating a new Homework Library row. */
export function buildCreateFields(
  payload: LibrarySyncPayload,
): Record<string, unknown> {
  return {
    "Assignment Key": payload.assignmentKey,
    "Assignment Title": payload.assignmentTitle ?? payload.assignmentKey,
    "Active?": true,
    "Published?": true,
  };
}

/**
 * Sanitize Airtable failures for operators/logs.
 * Includes status/type/message/table/record/field names — never tokens or secrets.
 */
export function sanitizeAirtableSyncError(input: {
  error: unknown;
  tableName: string;
  recordId?: string;
  fieldNames: string[];
}): string {
  const { error, tableName, recordId, fieldNames } = input;
  const fields = fieldNames.join(", ") || "(none)";
  const target = recordId
    ? `table=${tableName} recordId=${recordId} fields=[${fields}]`
    : `table=${tableName} fields=[${fields}]`;

  if (error instanceof AirtableApiError) {
    let airtableType = "unknown";
    let airtableMessage = "unavailable";
    try {
      const parsed = JSON.parse(error.body) as {
        error?: { type?: string; message?: string };
      };
      if (parsed.error?.type) airtableType = String(parsed.error.type).slice(0, 80);
      if (parsed.error?.message) {
        airtableMessage = String(parsed.error.message)
          .replace(/Bearer\s+\S+/gi, "[REDACTED]")
          .replace(/pat[a-zA-Z0-9._-]{10,}/gi, "[REDACTED]")
          .slice(0, 240);
      }
    } catch {
      airtableMessage = error.body
        .replace(/Bearer\s+\S+/gi, "[REDACTED]")
        .replace(/pat[a-zA-Z0-9._-]{10,}/gi, "[REDACTED]")
        .slice(0, 240);
    }
    return (
      `Homework Library sync failed (Airtable ${error.status} ${airtableType}: ${airtableMessage}; ${target})`
    );
  }

  const message =
    error instanceof Error
      ? error.message.replace(/Bearer\s+\S+/gi, "[REDACTED]").slice(0, 200)
      : "unknown error";
  return `Homework Library sync failed (${message}; ${target})`;
}

function isRecordId(value: string): boolean {
  return /^rec[a-zA-Z0-9]{14}$/.test(value);
}

function normalizeStoredKey(raw: unknown): string | null {
  const text = asText(raw, "").trim().toUpperCase();
  return text.length > 0 ? text : null;
}

async function findLibraryByAssignmentKey(
  assignmentKey: string,
): Promise<Array<{ id: string; fields: LibraryFields }>> {
  const response = await listAirtableRecords<LibraryFields>({
    tableName: TABLES.homeworkLibrary.name,
    filterByFormula: `{Assignment Key}='${escapeAirtableString(assignmentKey)}'`,
    fields: ["Assignment Key", "Assignment Title"],
    maxRecords: 3,
    revalidateSeconds: 0,
  });
  return response.records;
}

async function loadLibraryById(
  recordId: string,
): Promise<{ id: string; fields: LibraryFields } | null> {
  const response = await listAirtableRecords<LibraryFields>({
    tableName: TABLES.homeworkLibrary.name,
    filterByFormula: `RECORD_ID()='${escapeAirtableString(recordId)}'`,
    fields: ["Assignment Key", "Assignment Title"],
    maxRecords: 1,
    revalidateSeconds: 0,
  });
  return response.records[0] ?? null;
}

async function resolveLibraryIdFromPha(phaRecordId: string): Promise<string | null> {
  const response = await listAirtableRecords<PhaFields>({
    tableName: TABLES.programHomeworkAssignments.name,
    filterByFormula: `RECORD_ID()='${escapeAirtableString(phaRecordId)}'`,
    fields: [PHA_AIRTABLE_FIELDS.homeworkAssignment],
    maxRecords: 1,
    revalidateSeconds: 0,
  });
  const pha = response.records[0];
  if (!pha) return null;
  return linkedRecordIds(pha.fields[PHA_AIRTABLE_FIELDS.homeworkAssignment])[0] ?? null;
}

async function findLibraryByExactTitle(
  assignmentTitle: string,
): Promise<Array<{ id: string; fields: LibraryFields }>> {
  const response = await listAirtableRecords<LibraryFields>({
    tableName: TABLES.homeworkLibrary.name,
    filterByFormula: `{Assignment Title}='${escapeAirtableString(assignmentTitle)}'`,
    fields: ["Assignment Key", "Assignment Title"],
    maxRecords: 3,
    revalidateSeconds: 0,
  });
  return response.records;
}

/**
 * Idempotent sync: one assignmentKey maps to exactly one Homework Library row.
 * Never overwrites a different existing Assignment Key on a library row.
 * Existing-row updates patch Assignment Key only (no descriptive field overwrites).
 *
 * Homework Library is an externally synced Airtable table — CREATE is rejected by
 * Airtable (403). New Hub lessons must already exist in the synced catalog (matched
 * by Assignment Title) so this path can PATCH Assignment Key only.
 */
export async function syncHomeworkLibraryAssignmentKey(
  payload: LibrarySyncPayload,
): Promise<LibrarySyncResult> {
  const lastTable = TABLES.homeworkLibrary.name;
  let lastRecordId: string | undefined;
  let lastFields: string[] = [];

  try {
    const existingByKey = await findLibraryByAssignmentKey(payload.assignmentKey);

    let targetLibraryId =
      payload.homeworkLibraryRecordId ??
      (payload.phaRecordId ? await resolveLibraryIdFromPha(payload.phaRecordId) : undefined);

    if (payload.phaRecordId && !targetLibraryId) {
      return {
        ok: false,
        status: 404,
        error: "Program Homework Assignment not found or has no Homework link.",
      };
    }

    if (existingByKey.length > 1) {
      return {
        ok: false,
        status: 409,
        error: "Multiple Homework Library rows already use this Assignment Key.",
      };
    }

    const keyOwner = existingByKey[0] ?? null;

    if (keyOwner) {
      if (targetLibraryId && keyOwner.id !== targetLibraryId) {
        return {
          ok: false,
          status: 409,
          error:
            "Assignment Key is already assigned to a different Homework Library record.",
        };
      }
      targetLibraryId = keyOwner.id;
      const stored = normalizeStoredKey(keyOwner.fields["Assignment Key"]);
      if (stored === payload.assignmentKey) {
        return {
          ok: true,
          homeworkLibraryRecordId: keyOwner.id,
          assignmentKey: payload.assignmentKey,
          action: "unchanged",
        };
      }
    }

    // Synced catalog: resolve by exact Assignment Title before attempting CREATE.
    if (!targetLibraryId && payload.assignmentTitle) {
      const byTitle = await findLibraryByExactTitle(payload.assignmentTitle);
      if (byTitle.length > 1) {
        return {
          ok: false,
          status: 409,
          error: "Multiple Homework Library rows match this Assignment Title.",
        };
      }
      if (byTitle.length === 1) {
        const titleRow = byTitle[0]!;
        const stored = normalizeStoredKey(titleRow.fields["Assignment Key"]);
        if (stored && stored !== payload.assignmentKey) {
          return {
            ok: false,
            status: 409,
            error:
              "Homework Library title match already has a different Assignment Key; refusing to overwrite.",
          };
        }
        targetLibraryId = titleRow.id;
      }
    }

    if (targetLibraryId) {
      if (!isRecordId(targetLibraryId)) {
        return { ok: false, status: 422, error: "homeworkLibraryRecordId is invalid." };
      }

      const library = await loadLibraryById(targetLibraryId);
      if (!library) {
        return { ok: false, status: 404, error: "Homework Library record not found." };
      }

      const stored = normalizeStoredKey(library.fields["Assignment Key"]);
      if (stored && stored !== payload.assignmentKey) {
        return {
          ok: false,
          status: 409,
          error:
            "Homework Library row already has a different Assignment Key; refusing to overwrite.",
        };
      }

      if (stored === payload.assignmentKey) {
        return {
          ok: true,
          homeworkLibraryRecordId: library.id,
          assignmentKey: payload.assignmentKey,
          action: "unchanged",
        };
      }

      const patchFields = buildExistingRowPatchFields(payload);
      lastRecordId = library.id;
      lastFields = Object.keys(patchFields);

      const updated = await updateAirtableRecord({
        tableName: TABLES.homeworkLibrary.name,
        recordId: library.id,
        fields: patchFields,
        typecast: true,
      });

      return {
        ok: true,
        homeworkLibraryRecordId: updated.id,
        assignmentKey: payload.assignmentKey,
        action: "updated",
      };
    }

    if (!payload.assignmentTitle) {
      return {
        ok: false,
        status: 422,
        error: "assignmentTitle is required to locate or create a Homework Library row.",
      };
    }

    const createFields = buildCreateFields(payload);
    lastFields = Object.keys(createFields);

    try {
      const created = await createAirtableRecord({
        tableName: TABLES.homeworkLibrary.name,
        fields: createFields,
        typecast: true,
      });

      return {
        ok: true,
        homeworkLibraryRecordId: created.id,
        assignmentKey: payload.assignmentKey,
        action: "created",
      };
    } catch (createError) {
      // Synced tables reject CREATE (403 INVALID_PERMISSIONS). Surface a precise operator message.
      if (
        createError instanceof AirtableApiError &&
        createError.status === 403 &&
        /externally synced/i.test(createError.body)
      ) {
        return {
          ok: false,
          status: 422,
          error:
            "Homework Library is an externally synced table — rows cannot be created via API. Ensure the lesson already exists in the synced catalog (matching Assignment Title), then retry so Assignment Key can be patched.",
        };
      }
      throw createError;
    }
  } catch (error) {
    const sanitized = sanitizeAirtableSyncError({
      error,
      tableName: lastTable,
      recordId: lastRecordId,
      fieldNames: lastFields,
    });
    console.warn("[curriculum-library-sync]", sanitized);

    if (error instanceof AirtableApiError) {
      return {
        ok: false,
        status: error.status === 404 ? 404 : 503,
        error: sanitized,
      };
    }
    return {
      ok: false,
      status: 503,
      error: sanitized,
    };
  }
}
