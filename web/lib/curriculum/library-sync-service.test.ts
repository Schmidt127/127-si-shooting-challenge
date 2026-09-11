import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: vi.fn(),
  updateAirtableRecord: vi.fn(),
  createAirtableRecord: vi.fn(),
}));

import {
  createAirtableRecord,
  listAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/client";
import { AirtableApiError } from "@/lib/airtable/errors";
import {
  buildCreateFields,
  buildExistingRowPatchFields,
  sanitizeAirtableSyncError,
  syncHomeworkLibraryAssignmentKey,
} from "@/lib/curriculum/library-sync-service";

const listMock = vi.mocked(listAirtableRecords);
const updateMock = vi.mocked(updateAirtableRecord);
const createMock = vi.mocked(createAirtableRecord);

describe("library sync field builders", () => {
  it("existing-row patch writes Assignment Key only", () => {
    expect(
      buildExistingRowPatchFields({
        assignmentKey: "AESOP_ANT_GRASSHOPPER",
      }),
    ).toEqual({ "Assignment Key": "AESOP_ANT_GRASSHOPPER" });
  });

  it("create fields omit aiText brief and non-existent Notes", () => {
    const fields = buildCreateFields({
      assignmentKey: "AESOP_INIT_TEST_DISPOSABLE_CROW",
      assignmentTitle: "INIT TEST Disposable Crow",
      briefDescription: "should be ignored — aiText field",
      curriculumVersion: 1,
    });
    expect(fields).toEqual({
      "Assignment Key": "AESOP_INIT_TEST_DISPOSABLE_CROW",
      "Assignment Title": "INIT TEST Disposable Crow",
      "Active?": true,
      "Published?": true,
    });
    expect(fields).not.toHaveProperty("Brief Description - Display");
    expect(fields).not.toHaveProperty("Notes");
  });
});

describe("sanitizeAirtableSyncError", () => {
  it("includes Airtable status/type/message without leaking secrets", () => {
    const error = new AirtableApiError(
      422,
      JSON.stringify({
        error: {
          type: "INVALID_VALUE_FOR_COLUMN",
          message: "Field \"Brief Description - Display\" cannot accept the provided value",
        },
      }),
    );
    const message = sanitizeAirtableSyncError({
      error,
      tableName: "Homework Library",
      recordId: "recht9OepEHTH22zD",
      fieldNames: ["Brief Description - Display"],
    });
    expect(message).toContain("422");
    expect(message).toContain("INVALID_VALUE_FOR_COLUMN");
    expect(message).toContain("Brief Description - Display");
    expect(message).toContain("recht9OepEHTH22zD");
    expect(message).not.toMatch(/Bearer/i);
    expect(message).not.toMatch(/pat[a-zA-Z0-9]/i);
  });
});

describe("syncHomeworkLibraryAssignmentKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matching key short-circuits as unchanged without Airtable write", async () => {
    listMock.mockResolvedValueOnce({
      records: [
        {
          id: "recLibCrow0000001",
          fields: { "Assignment Key": "AESOP_CROW_PITCHER" },
        },
      ],
    });

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_CROW_PITCHER",
      homeworkLibraryRecordId: "recLibCrow0000001",
    });

    expect(result).toEqual({
      ok: true,
      action: "unchanged",
      assignmentKey: "AESOP_CROW_PITCHER",
      homeworkLibraryRecordId: "recLibCrow0000001",
    });
    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("existing blank-key row updates Assignment Key only", async () => {
    listMock
      .mockResolvedValueOnce({ records: [] }) // find by key
      .mockResolvedValueOnce({
        records: [
          {
            id: "recht9OepEHTH22zD",
            fields: { "Assignment Title": "The Ant and the Grasshopper" },
          },
        ],
      }); // load by id

    updateMock.mockResolvedValueOnce({
      id: "recht9OepEHTH22zD",
      fields: { "Assignment Key": "AESOP_ANT_GRASSHOPPER" },
    });

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_ANT_GRASSHOPPER",
      homeworkLibraryRecordId: "recht9OepEHTH22zD",
      assignmentTitle: "should not be patched on existing row",
      briefDescription: "should not be patched",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("updated");
      expect(result.homeworkLibraryRecordId).toBe("recht9OepEHTH22zD");
    }
    expect(updateMock).toHaveBeenCalledWith({
      tableName: "Homework Library",
      recordId: "recht9OepEHTH22zD",
      fields: { "Assignment Key": "AESOP_ANT_GRASSHOPPER" },
      typecast: true,
    });
  });

  it("conflicting key returns 409", async () => {
    listMock
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({
        records: [
          {
            id: "recht9OepEHTH22zD",
            fields: { "Assignment Key": "OTHER_KEY_EXISTS" },
          },
        ],
      });

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_ANT_GRASSHOPPER",
      homeworkLibraryRecordId: "recht9OepEHTH22zD",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error:
        "Homework Library row already has a different Assignment Key; refusing to overwrite.",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("creates a new row without non-writable fields", async () => {
    listMock.mockResolvedValueOnce({ records: [] }); // by key
    listMock.mockResolvedValueOnce({ records: [] }); // by title
    createMock.mockResolvedValueOnce({
      id: "recNewLib00000001",
      fields: { "Assignment Key": "AESOP_INIT_TEST_DISPOSABLE_CROW" },
    });

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_INIT_TEST_DISPOSABLE_CROW",
      assignmentTitle: "INIT TEST Disposable Crow",
      briefDescription: "ignored",
      curriculumVersion: 1,
    });

    expect(result).toEqual({
      ok: true,
      action: "created",
      assignmentKey: "AESOP_INIT_TEST_DISPOSABLE_CROW",
      homeworkLibraryRecordId: "recNewLib00000001",
    });
    expect(createMock).toHaveBeenCalledWith({
      tableName: "Homework Library",
      fields: {
        "Assignment Key": "AESOP_INIT_TEST_DISPOSABLE_CROW",
        "Assignment Title": "INIT TEST Disposable Crow",
        "Active?": true,
        "Published?": true,
      },
      typecast: true,
    });
  });

  it("title-matches synced catalog row and patches Assignment Key only", async () => {
    listMock
      .mockResolvedValueOnce({ records: [] }) // by key
      .mockResolvedValueOnce({
        records: [
          {
            id: "recn1LKiRZpzWIg70",
            fields: { "Assignment Title": "INIT TEST Disposable Crow" },
          },
        ],
      }) // by title
      .mockResolvedValueOnce({
        records: [
          {
            id: "recn1LKiRZpzWIg70",
            fields: { "Assignment Title": "INIT TEST Disposable Crow" },
          },
        ],
      }); // load by id

    updateMock.mockResolvedValueOnce({
      id: "recn1LKiRZpzWIg70",
      fields: { "Assignment Key": "AESOP_INIT_TEST_DISPOSABLE_CROW" },
    });

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_INIT_TEST_DISPOSABLE_CROW",
      assignmentTitle: "INIT TEST Disposable Crow",
      curriculumVersion: 1,
    });

    expect(result).toEqual({
      ok: true,
      action: "updated",
      assignmentKey: "AESOP_INIT_TEST_DISPOSABLE_CROW",
      homeworkLibraryRecordId: "recn1LKiRZpzWIg70",
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({
      tableName: "Homework Library",
      recordId: "recn1LKiRZpzWIg70",
      fields: { "Assignment Key": "AESOP_INIT_TEST_DISPOSABLE_CROW" },
      typecast: true,
    });
  });

  it("returns clear 422 when synced table rejects CREATE", async () => {
    listMock.mockResolvedValueOnce({ records: [] }); // by key
    listMock.mockResolvedValueOnce({ records: [] }); // by title
    createMock.mockRejectedValueOnce(
      new AirtableApiError(
        403,
        JSON.stringify({
          error: {
            type: "INVALID_PERMISSIONS",
            message:
              "Your record could not be created because the underlying table is externally synced",
          },
        }),
      ),
    );

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_BRAND_NEW_LESSON",
      assignmentTitle: "Brand New Lesson Not In Catalog",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.error).toMatch(/externally synced/i);
    }
  });

  it("returns sanitized Airtable diagnostics on write failure", async () => {
    listMock
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({
        records: [{ id: "recht9OepEHTH22zD", fields: {} }],
      });
    updateMock.mockRejectedValueOnce(
      new AirtableApiError(
        422,
        JSON.stringify({
          error: {
            type: "INVALID_VALUE_FOR_COLUMN",
            message: "Field cannot accept the provided value",
          },
        }),
      ),
    );

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_ANT_GRASSHOPPER",
      homeworkLibraryRecordId: "recht9OepEHTH22zD",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toContain("422");
      expect(result.error).toContain("INVALID_VALUE_FOR_COLUMN");
      expect(result.error).toContain("Assignment Key");
      expect(result.error).not.toMatch(/Bearer/i);
    }
  });

  it("retry after create is idempotent via key match", async () => {
    listMock.mockResolvedValueOnce({
      records: [
        {
          id: "recNewLib00000001",
          fields: { "Assignment Key": "AESOP_INIT_TEST_DISPOSABLE_CROW" },
        },
      ],
    });

    const result = await syncHomeworkLibraryAssignmentKey({
      assignmentKey: "AESOP_INIT_TEST_DISPOSABLE_CROW",
      assignmentTitle: "INIT TEST Disposable Crow",
    });

    expect(result).toEqual({
      ok: true,
      action: "unchanged",
      assignmentKey: "AESOP_INIT_TEST_DISPOSABLE_CROW",
      homeworkLibraryRecordId: "recNewLib00000001",
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
