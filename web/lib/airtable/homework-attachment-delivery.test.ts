import { beforeEach, describe, expect, it, vi } from "vitest";

const loadActivePhaScheduleMock = vi.hoisted(() => vi.fn());
const resolveProgramMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/pha-repository", () => ({
  loadActivePhaSchedule: loadActivePhaScheduleMock,
}));

vi.mock("@/lib/airtable/registering-program-instance", () => ({
  resolveRegisteringShootingChallengeProgramInstance: resolveProgramMock,
}));

import {
  resolveHomeworkAttachmentDelivery,
  resolveHomeworkLinkDelivery,
} from "@/lib/airtable/homework-attachment-delivery";

describe("homework attachment delivery", () => {
  const homeworkId = "rechVLOeyEVIqmy2v";
  const attachmentId = "attDoc000000001";

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.AIRTABLE_API_TOKEN = "pat_test_token";
    process.env.AIRTABLE_BASE_ID = "appTestBase00001";
    resolveProgramMock.mockResolvedValue({
      id: "recPI00000000001",
      name: "Test PI",
    });
    loadActivePhaScheduleMock.mockResolvedValue({
      parseResult: {
        rows: [
          {
            phaId: "recPHA0000000001",
            homeworkId,
            weekId: "recWeek000000001",
            programInstanceId: "recPI00000000001",
            homeworkSlot: "HW1",
            gradeBandIds: [],
            gradeBands: [],
            dueDate: null,
            operatorNotes: null,
          },
        ],
        skippedIncomplete: 0,
        duplicateSlotKeys: [],
        resolvedDuplicateSlotKeys: [],
      },
      records: [],
    });
  });

  it("returns a fresh attachment URL without requiring stored CDN values", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        fields: {
          Docs: [
            {
              id: attachmentId,
              url: "https://v5.airtableusercontent.com/v0/fresh-signed.pdf",
              filename: "Worksheet.pdf",
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveHomeworkAttachmentDelivery({
      homeworkId,
      attachmentId,
      field: "Docs",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.url).toContain("fresh-signed.pdf");
      expect(result.filename).toBe("Worksheet.pdf");
    }
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(homeworkId),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("returns unavailable when the attachment id is gone from the record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ fields: { Docs: [] } }),
      }),
    );

    const result = await resolveHomeworkAttachmentDelivery({
      homeworkId,
      attachmentId,
      field: "Docs",
    });
    expect(result.status).toBe("unavailable");
  });

  it("fails closed for ephemeral URL text fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            URL: "https://v5.airtableusercontent.com/v0/stale.pdf",
          },
        }),
      }),
    );

    const result = await resolveHomeworkLinkDelivery({
      homeworkId,
      field: "URL",
    });
    expect(result.status).toBe("unavailable");
  });

  it("returns durable URL text fields as-is", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            URL: "https://docs.google.com/document/d/abc",
          },
        }),
      }),
    );

    const result = await resolveHomeworkLinkDelivery({
      homeworkId,
      field: "URL",
    });
    expect(result).toEqual({
      status: "ok",
      url: "https://docs.google.com/document/d/abc",
      filename: null,
    });
  });

  it("returns not_found when homework is not on the public schedule", async () => {
    loadActivePhaScheduleMock.mockResolvedValue({
      parseResult: {
        rows: [],
        skippedIncomplete: 0,
        duplicateSlotKeys: [],
        resolvedDuplicateSlotKeys: [],
      },
      records: [],
    });

    const result = await resolveHomeworkAttachmentDelivery({
      homeworkId,
      attachmentId,
      field: "Docs",
    });
    expect(result.status).toBe("not_found");
  });
});
