import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  formatHomeworkDueDate,
  formatHomeworkXp,
  HomeworkAssignments,
} from "@/components/athlete/homework-assignments";
import type { PublicHomeworkAssignment } from "@/types/public-athlete-profile";

function assignment(
  overrides: Partial<PublicHomeworkAssignment> = {},
): PublicHomeworkAssignment {
  return {
    key: "hw-1",
    assignmentName: "Form Shooting Basics",
    description: "Film 50 form shots.",
    weekLabel: "Week 1",
    dueDate: "2026-06-07",
    completionStatus: "not_started",
    completionStatusLabel: "Not submitted",
    submissionDate: null,
    xpAwarded: null,
    coachFeedback: null,
    creditEligible: null,
    pastDue: false,
    lateSubmission: false,
    homeworkDetailHref: "/homework/rechVLOeyEVIqmy2v",
    viewSubmittedHomeworkHref: null,
    ...overrides,
  };
}

function render(assignments: PublicHomeworkAssignment[]) {
  return renderToStaticMarkup(
    createElement(HomeworkAssignments, { assignments }),
  );
}

describe("HomeworkAssignments UI", () => {
  it("renders dynamic assignment counts without a hardcoded cap", () => {
    for (const count of [4, 14, 18]) {
      const html = render(
        Array.from({ length: count }, (_, index) =>
          assignment({
            key: `hw-${index + 1}`,
            assignmentName: `Assignment ${index + 1}`,
          }),
        ),
      );
      expect(html.match(/data-testid="homework-assignment-row"/g)?.length ?? 0).toBe(count);
    }
  });

  it("shows assignment name, due date, status, description, and feedback", () => {
    const html = render([
      assignment({
        assignmentName: "Shot Tracker Usage",
        description: "Log every make in the tracker.",
        dueDate: "2026-06-14",
        completionStatus: "approved",
        completionStatusLabel: "Satisfactory",
        xpAwarded: 10,
        creditEligible: true,
        coachFeedback: "Nice work.",
      }),
    ]);

    expect(html).toContain("Shot Tracker Usage");
    expect(html).toContain("Log every make in the tracker.");
    expect(html).toContain("Nice work.");
    expect(html).toContain("Satisfactory");
    expect(html).toContain("Credit earned");
    expect(html).not.toContain("HW99");
  });

  it("renders a clear empty state when no active assignments exist", () => {
    const html = render([]);
    expect(html).toContain('data-testid="homework-assignments-empty"');
    expect(html).toContain("No homework assignments are scheduled yet for this athlete");
    expect(html).not.toContain('data-testid="homework-assignment-row"');
  });

  it("renders an unavailable state when homework could not be loaded", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkAssignments, { assignments: [], loadUnavailable: true }),
    );
    expect(html).toContain('data-testid="homework-assignments-unavailable"');
    expect(html).toContain("temporarily unavailable");
    expect(html).not.toContain('data-testid="homework-assignments-empty"');
  });

  it("handles missing due dates and pending XP safely", () => {
    const html = render([
      assignment({
        dueDate: null,
        xpAwarded: null,
        completionStatus: "not_started",
        completionStatusLabel: "Not submitted",
      }),
    ]);
    expect(html).toContain("No due date");
    expect(html).toContain("Pending");
    expect(html).toContain("Not submitted");
  });

  it("uses responsive stacked-to-grid classes for mobile-safe rendering", () => {
    const html = render([assignment()]);
    expect(html).toContain("grid gap-3");
    expect(html).toContain("sm:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]");
  });

  it("shows View Submitted Homework CTA without a redundant Submitted Work card", () => {
    const reviewerUrl =
      "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/recReiXXBRtaW3lns?token=abc123";
    const html = render([
      assignment({
        completionStatus: "submitted",
        completionStatusLabel: "Submitted",
        viewSubmittedHomeworkHref: reviewerUrl,
      }),
    ]);

    expect(html).toContain('data-testid="view-submitted-homework-cta"');
    expect(html).toContain("View Submitted Homework");
    expect(html).toContain(reviewerUrl);
    expect(html).not.toContain('data-testid="submitted-work-card"');
    expect(html).not.toMatch(/Submitted Work/i);
  });

  it("omits View Submitted Homework when no reviewer URL is available", () => {
    const html = render([
      assignment({
        completionStatus: "submitted",
        completionStatusLabel: "Submitted",
        viewSubmittedHomeworkHref: null,
      }),
    ]);

    expect(html).not.toContain('data-testid="view-submitted-homework-cta"');
    expect(html).not.toContain("View Submitted Homework");
  });
});

describe("homework display helpers", () => {
  it("formats due dates and pending XP", () => {
    expect(formatHomeworkDueDate(null)).toBe("No due date");
    expect(formatHomeworkDueDate("2026-06-07")).toMatch(/Jun/);
    expect(
      formatHomeworkXp(assignment({ xpAwarded: null, completionStatus: "not_started" })),
    ).toBe("Pending");
    expect(formatHomeworkXp(assignment({ xpAwarded: 12 }))).toMatch(/12/);
  });
});
