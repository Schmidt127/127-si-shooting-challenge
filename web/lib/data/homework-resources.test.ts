import { describe, expect, it } from "vitest";

import {
  buildHomeworkAttachmentDeliveryPath,
  buildHomeworkLinkDeliveryPath,
  isDurableHttpUrl,
  isEphemeralAirtableAttachmentUrl,
  mapPublicHomeworkAttachments,
  resolveHomeworkCategoryLabel,
  resolveHomeworkDueStatus,
  resolvePublicHomeworkLink,
} from "@/lib/data/homework-resources";

describe("ephemeral Airtable attachment detection", () => {
  it("flags Airtable CDN hosts as ephemeral", () => {
    expect(
      isEphemeralAirtableAttachmentUrl(
        "https://v5.airtableusercontent.com/v0/b/appX/attY/file.pdf",
      ),
    ).toBe(true);
    expect(isEphemeralAirtableAttachmentUrl("https://dl.airtable.com/.attachments/abc")).toBe(
      true,
    );
  });

  it("treats durable external https as non-ephemeral", () => {
    expect(isDurableHttpUrl("https://docs.google.com/document/d/abc")).toBe(true);
    expect(isEphemeralAirtableAttachmentUrl("https://docs.google.com/document/d/abc")).toBe(
      false,
    );
  });
});

describe("public homework link resolution", () => {
  const homeworkId = "rechVLOeyEVIqmy2v";

  it("keeps durable URLs as-is", () => {
    const resolved = resolvePublicHomeworkLink(
      homeworkId,
      "URL",
      "https://example.com/assignment",
    );
    expect(resolved).toEqual({
      href: "https://example.com/assignment",
      availability: "available",
    });
  });

  it("routes ephemeral URL-field values through the link delivery path", () => {
    const resolved = resolvePublicHomeworkLink(
      homeworkId,
      "URL",
      "https://v5.airtableusercontent.com/v0/expired.pdf",
    );
    expect(resolved.availability).toBe("available");
    expect(resolved.href).toBe(buildHomeworkLinkDeliveryPath(homeworkId, "URL"));
    expect(resolved.href).not.toContain("airtableusercontent.com");
  });

  it("marks blank links absent", () => {
    expect(resolvePublicHomeworkLink(homeworkId, "URL Additional", "")).toEqual({
      href: "",
      availability: "absent",
    });
  });
});

describe("public homework attachments", () => {
  const homeworkId = "rechVLOeyEVIqmy2v";

  it("maps Docs to delivery paths keyed by attachment id", () => {
    const docs = mapPublicHomeworkAttachments(homeworkId, "Docs", [
      {
        id: "attDoc000000001",
        url: "https://v5.airtableusercontent.com/v0/fresh-now.pdf",
        filename: "Worksheet.pdf",
      },
    ]);
    expect(docs).toHaveLength(1);
    expect(docs[0].url).toBe(
      buildHomeworkAttachmentDeliveryPath(homeworkId, "attDoc000000001", "Docs"),
    );
    expect(docs[0].url).not.toContain("airtableusercontent.com");
    expect(docs[0].availability).toBe("available");
  });

  it("marks attachment rows without id and with ephemeral url unavailable", () => {
    const docs = mapPublicHomeworkAttachments(homeworkId, "Docs", [
      {
        url: "https://v5.airtableusercontent.com/v0/orphan.pdf",
        filename: "Orphan.pdf",
      },
    ]);
    expect(docs[0].availability).toBe("unavailable");
    expect(docs[0].url).toBe("");
  });
});

describe("catalog presentation helpers", () => {
  it("prefers homework slot for category label", () => {
    expect(
      resolveHomeworkCategoryLabel({
        homeworkSlot: "HW2",
        homeworkNumber: "HW1",
        topics: ["Faith"],
        bookAbbreviation: "SA",
      }),
    ).toBe("HW2");
  });

  it("classifies due status by calendar day", () => {
    const now = new Date("2026-09-05T12:00:00.000Z");
    expect(resolveHomeworkDueStatus("2026-09-01", now)).toBe("past_due");
    expect(resolveHomeworkDueStatus("2026-09-06", now)).toBe("due_soon");
    expect(resolveHomeworkDueStatus("2026-10-01", now)).toBe("upcoming");
    expect(resolveHomeworkDueStatus(null, now)).toBe("no_due");
  });
});
