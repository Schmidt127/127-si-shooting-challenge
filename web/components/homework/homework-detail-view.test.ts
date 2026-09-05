import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeworkDetailView } from "@/components/homework/homework-detail-view";
import type { HomeworkAssignment } from "@/types/homework";

function assignment(overrides: Partial<HomeworkAssignment> = {}): HomeworkAssignment {
  return {
    id: "rechVLOeyEVIqmy2v",
    phaId: "recPHA0000000001",
    title: "Shot Tracker Usage",
    displayName: "Shot Tracker Usage",
    briefDescription: "Log every make.",
    instructionsPreview: "Log every make.",
    weekId: "recWeek000000001",
    weekName: "Week 1",
    weekNumber: 1,
    weekStartDate: "2026-06-01",
    weekEndDate: "2026-06-07",
    homeworkNumber: "HW1",
    assignmentNumber: 1,
    order: 1,
    homeworkSlot: "HW1",
    dueDate: "2027-06-29",
    gradeBands: ["3-4"],
    submissionRequirement: "Submit through the daily form Homework 1 field.",
    operatorNotes: null,
    book: "Skill Book",
    bookAbbreviation: "SB",
    topics: ["Form"],
    coverImage: null,
    url: "https://example.com/homework",
    urlAvailability: "available",
    urlAdditional: "",
    urlAdditionalAvailability: "absent",
    gradeBandLabel: "",
    fullDescription: "Full multi-paragraph instructions for the detail page.",
    assignmentDescription: "",
    specificSteps: "1. Film. 2. Submit.",
    assignmentRationale: "Builds consistency.",
    ageAppropriate: [],
    docs: [],
    categoryLabel: "HW1",
    ...overrides,
  };
}

describe("HomeworkDetailView durable resources", () => {
  it("preserves instructions, steps, rationale, and submission requirements", () => {
    const html = renderToStaticMarkup(createElement(HomeworkDetailView, { assignment: assignment() }));
    expect(html).toContain("Full multi-paragraph instructions");
    expect(html).toContain("1. Film. 2. Submit.");
    expect(html).toContain("Builds consistency.");
    expect(html).toContain("Submit through the daily form Homework 1 field.");
    expect(html).toContain("https://example.com/homework");
  });

  it("uses app delivery paths for Docs and never emits Airtable CDN hosts", () => {
    const delivery =
      "/api/homework/rechVLOeyEVIqmy2v/attachment/attDoc000000001?field=Docs";
    const html = renderToStaticMarkup(
      createElement(HomeworkDetailView, {
        assignment: assignment({
          docs: [
            {
              id: "attDoc000000001",
              url: delivery,
              filename: "Worksheet.pdf",
              availability: "available",
            },
          ],
          url: "/api/homework/rechVLOeyEVIqmy2v/link?field=URL",
          urlAvailability: "available",
        }),
      }),
    );
    expect(html).toContain("Worksheet.pdf");
    expect(html).toContain("homework/rechVLOeyEVIqmy2v/attachment/attDoc000000001");
    expect(html).not.toContain("airtableusercontent.com");
    expect(html).not.toContain("dl.airtable.com");
  });

  it("renders a safe unavailable state when a resource cannot be delivered", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkDetailView, {
        assignment: assignment({
          url: "",
          urlAvailability: "unavailable",
          docs: [
            {
              id: "attMissing",
              url: "",
              filename: "Missing.pdf",
              availability: "unavailable",
            },
          ],
        }),
      }),
    );
    expect(html).toContain("data-testid=\"homework-detail-resource-unavailable\"");
    expect(html).toContain("temporarily unavailable");
    expect(html).not.toContain("airtableusercontent.com");
  });

  it("strips ephemeral CDN URLs if they somehow reach the view", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkDetailView, {
        assignment: assignment({
          url: "https://v5.airtableusercontent.com/v0/expired.pdf",
          urlAvailability: "available",
          docs: [
            {
              id: "attBad",
              url: "https://v5.airtableusercontent.com/v0/doc.pdf",
              filename: "Bad.pdf",
              availability: "available",
            },
          ],
        }),
      }),
    );
    expect(html).not.toContain("airtableusercontent.com");
    expect(html).toContain("data-testid=\"homework-detail-resource-unavailable\"");
  });
});
