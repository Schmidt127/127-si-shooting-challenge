import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import {
  HomeworkCatalogView,
  HomeworkEmptyState,
  HomeworkErrorState,
} from "@/components/homework/homework-catalog-view";
import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";

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
    submissionRequirement: null,
    operatorNotes: null,
    book: "",
    bookAbbreviation: "",
    topics: [],
    coverImage: null,
    url: "",
    urlAdditional: "",
    gradeBandLabel: "",
    fullDescription: "Full multi-paragraph instructions that must not appear on catalog cards.",
    assignmentDescription: "",
    specificSteps: "",
    assignmentRationale: "",
    ageAppropriate: [],
    docs: [],
    ...overrides,
  };
}

function catalog(assignments: HomeworkAssignment[]): HomeworkCatalogData {
  return {
    weekGroups: [{
      weekId: "recWeek000000001",
      weekName: "Week 1",
      weekNumber: 1,
      weekStartDate: "2026-06-01",
      assignments,
    }],
    totalAssignments: assignments.length,
    updatedAt: "2026-08-25T12:00:00.000Z",
  };
}

describe("HomeworkCatalogView", () => {
  it("renders human-readable Due labels on catalog cards", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, { data: catalog([assignment()]) }),
    );
    expect(html).toContain("data-testid=\"homework-catalog-card\"");
    expect(html).toContain("Due");
    expect(html).toMatch(/Jun(?:e)? 29, 2027/);
  });

  it("shows fallback copy when assignment dueDate is blank", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([assignment({ dueDate: null })]),
      }),
    );
    expect(html).toContain("No due date provided");
  });

  it("renders dynamic assignment counts without a hardcoded cap", () => {
    for (const count of [4, 14, 18]) {
      const html = renderToStaticMarkup(
        createElement(HomeworkCatalogView, {
          data: catalog(
            Array.from({ length: count }, (_, index) =>
              assignment({
                id: `recHW${String(index).padStart(11, "0")}`,
                phaId: `recPHA${String(index).padStart(11, "0")}`,
                title: `Assignment ${index + 1}`,
                displayName: `Assignment ${index + 1}`,
              }),
            ),
          ),
        }),
      );
      expect(html.match(/data-testid="homework-catalog-card"/g)?.length ?? 0).toBe(count);
    }
  });

  it("renders assignment title and assigned week on each card", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([assignment({ title: "Form Shooting Log", weekName: "Week 10" })]),
      }),
    );
    expect(html).toContain("Form Shooting Log");
    expect(html).toContain("Week 10");
  });

  it("uses brief description preview and not full assignment instructions", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([
          assignment({
            briefDescription: "Film 50 form shots.",
            instructionsPreview: "Film 50 form shots.",
            fullDescription: "Full multi-paragraph instructions that must not appear on catalog cards.",
          }),
        ]),
      }),
    );
    expect(html).toContain("Film 50 form shots.");
    expect(html).not.toContain("Full multi-paragraph instructions");
  });

  it("shows safe fallback copy when brief description is blank", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([
          assignment({
            briefDescription: "",
            instructionsPreview: "Instructions coming soon.",
          }),
        ]),
      }),
    );
    expect(html).toContain("Instructions coming soon.");
  });

  it("renders resource links when URL or document attachments are present", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([
          assignment({
            url: "https://example.com/homework",
            urlAdditional: "https://example.com/extra",
            docs: [{ id: "att1", url: "https://example.com/doc.pdf", filename: "Worksheet.pdf" }],
          }),
        ]),
      }),
    );
    expect(html).toContain("data-testid=\"homework-catalog-resources\"");
    expect(html).toContain("https://example.com/homework");
    expect(html).toContain("https://example.com/extra");
    expect(html).toContain("Worksheet.pdf");
  });

  it("omits resource links when no URLs or documents are available", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([assignment({ url: "", urlAdditional: "", docs: [] })]),
      }),
    );
    expect(html).not.toContain("data-testid=\"homework-catalog-resources\"");
  });

  it("does not render private Airtable record IDs in card copy", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([
          assignment({
            phaId: "recPHAPrivate00001",
            operatorNotes: "Internal scheduling note",
          }),
        ]),
      }),
    );
    expect(html).not.toContain("recPHAPrivate00001");
    expect(html).not.toContain("Internal scheduling note");
  });

  it("links each card title and CTA to the homework detail route", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, { data: catalog([assignment()]) }),
    );
    expect(html).toContain('href="/homework/rechVLOeyEVIqmy2v"');
    expect(html).toContain("View details");
  });
});

describe("Homework catalog states", () => {
  it("renders empty state markup", () => {
    const html = renderToStaticMarkup(createElement(HomeworkEmptyState));
    expect(html).toContain("data-testid=\"homework-catalog-empty\"");
  });

  it("renders error state markup with retry affordance", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkErrorState, {
        message: "Homework temporarily unavailable.",
        retryable: true,
      }),
    );
    expect(html).toContain("data-testid=\"homework-catalog-error\"");
    expect(html).toContain("Homework temporarily unavailable.");
    expect(html).toContain("data-testid=\"homework-catalog-retry\"");
  });
});
