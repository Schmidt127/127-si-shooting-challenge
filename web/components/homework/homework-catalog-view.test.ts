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
    urlAvailability: "absent",
    urlAdditional: "",
    urlAdditionalAvailability: "absent",
    gradeBandLabel: "",
    fullDescription: "Full multi-paragraph instructions that must not appear on catalog cards.",
    assignmentDescription: "",
    specificSteps: "",
    assignmentRationale: "",
    ageAppropriate: [],
    docs: [],
    categoryLabel: "HW1",
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

describe("HomeworkCatalogView compact list", () => {
  it("renders compact rows with title, week, due date, category, and View assignment", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([
          assignment({
            title: "Form Shooting Log",
            weekName: "Week 10",
            categoryLabel: "HW2",
            dueDate: "2027-06-29",
          }),
        ]),
      }),
    );
    expect(html).toContain("data-testid=\"homework-catalog-card\"");
    expect(html).toContain("Form Shooting Log");
    expect(html).toContain("Week 10");
    expect(html).toContain("HW2");
    expect(html).toMatch(/Due[\s\S]*Jun(?:e)? 29, 2027/);
    expect(html).toContain("View assignment");
    expect(html).toContain('data-testid="homework-catalog-view-assignment"');
    expect(html).toContain('href="/homework/rechVLOeyEVIqmy2v"');
  });

  it("does not render full instructions, resource links, or cover imagery on the list", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCatalogView, {
        data: catalog([
          assignment({
            briefDescription: "Film 50 form shots.",
            instructionsPreview: "Film 50 form shots.",
            fullDescription: "Full multi-paragraph instructions that must not appear on catalog cards.",
            url: "https://example.com/homework",
            urlAvailability: "available",
            docs: [
              {
                id: "att1",
                url: "/api/homework/rechVLOeyEVIqmy2v/attachment/att1?field=Docs",
                filename: "Worksheet.pdf",
                availability: "available",
              },
            ],
          }),
        ]),
      }),
    );
    expect(html).not.toContain("Full multi-paragraph instructions");
    expect(html).not.toContain("Film 50 form shots.");
    expect(html).not.toContain("data-testid=\"homework-catalog-resources\"");
    expect(html).not.toContain("https://example.com/homework");
    expect(html).not.toContain("Worksheet.pdf");
    expect(html).not.toContain("airtableusercontent.com");
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

  it("does not render private Airtable record IDs or operator notes in card copy", () => {
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
