/**
 * Curriculum Hub → SC: sync authoritative Assignment Key onto Homework Library.
 * Hub owns lesson identity (assignmentKey); SC owns the Airtable library row used by PHA + dashboard.
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
  "Brief Description - Display"?: unknown;
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

async function loadLibraryById(recordId: string): Promise<{ id: string; fields: LibraryFields } | null> {
  const response = await listAirtableRecords<LibraryFields>({
    tableName: TABLES.homeworkLibrary.name,
    filterByFormula: `RECORD_ID()='${escapeAirtableString(recordId)}'`,
    fields: ["Assignment Key", "Assignment Title", "Brief Description - Display"],
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

function buildCreateFields(payload: LibrarySyncPayload): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    "Assignment Key": payload.assignmentKey,
    "Assignment Title": payload.assignmentTitle ?? payload.assignmentKey,
    "Active?": true,
    "Published?": true,
  };
  if (payload.briefDescription) {
    fields["Brief Description - Display"] = payload.briefDescription;
  }
  if (payload.curriculumVersion != null) {
    fields.Notes = `Structured Curriculum sync (Hub) · curriculumVersion ${payload.curriculumVersion}`;
  }
  return fields;
}

function buildPatchFields(payload: LibrarySyncPayload): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    "Assignment Key": payload.assignmentKey,
  };
  const existingTitle = payload.assignmentTitle?.trim();
  if (existingTitle) {
    fields["Assignment Title"] = existingTitle;
  }
  if (payload.briefDescription) {
    fields["Brief Description - Display"] = payload.briefDescription;
  }
  return fields;
}

/**
 * Idempotent sync: one assignmentKey maps to exactly one Homework Library row.
 * Never overwrites a different existing Assignment Key on a library row.
 */
export async function syncHomeworkLibraryAssignmentKey(
  payload: LibrarySyncPayload,
): Promise<LibrarySyncResult> {
  try {
    const existingByKey = await findLibraryByAssignmentKey(payload.assignmentKey);

    let targetLibraryId =
      payload.homeworkLibraryRecordId ??
      (payload.phaRecordId ? await resolveLibraryIdFromPha(payload.phaRecordId) : undefined);

    if (payload.phaRecordId && !targetLibraryId) {
      return { ok: false, status: 404, error: "Program Homework Assignment not found or has no Homework link." };
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

    if (targetLibraryId) {
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

      const updated = await updateAirtableRecord({
        tableName: TABLES.homeworkLibrary.name,
        recordId: library.id,
        fields: buildPatchFields(payload),
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
        error: "assignmentTitle is required to create a new Homework Library row.",
      };
    }

    const created = await createAirtableRecord({
      tableName: TABLES.homeworkLibrary.name,
      fields: buildCreateFields(payload),
      typecast: true,
    });

    return {
      ok: true,
      homeworkLibraryRecordId: created.id,
      assignmentKey: payload.assignmentKey,
      action: "created",
    };
  } catch (error) {
    if (error instanceof AirtableApiError) {
      return {
        ok: false,
        status: error.status === 404 ? 404 : 503,
        error: "Homework Library sync temporarily unavailable.",
      };
    }
    return {
      ok: false,
      status: 503,
      error: "Homework Library sync temporarily unavailable.",
    };
  }
}
