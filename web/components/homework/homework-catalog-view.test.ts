import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeworkCatalogView } from "@/components/homework/homework-catalog-view";
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
    fullDescription: "",
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
                displayName: `Assignment ${index + 1}`,
              }),
            ),
          ),
        }),
      );
      expect(html.match(/data-testid="homework-catalog-card"/g)?.length ?? 0).toBe(count);
    }
  });
});
