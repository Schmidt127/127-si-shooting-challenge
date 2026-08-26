import { describe, expect, it } from "vitest";

import {
  buildHomeworkCatalog,
  groupAssignmentsByWeek,
  homeworkSlotOrder,
  mapCurriculumToAssignment,
  parseActivePhaScheduleRows,
  parseWeekNumber,
  resolveAssignmentDueDateKey,
  resolveInstructionsPreview,
  resolveSubmissionRequirement,
  type ScheduledPhaRow,
} from "@/lib/data/homework";

describe("parseWeekNumber", () => {
  it("extracts numeric week from week name", () => {
    expect(parseWeekNumber("Week 10")).toBe(10);
    expect(parseWeekNumber("Week 1")).toBe(1);
    expect(parseWeekNumber("Unknown")).toBe(0);
  });
});

describe("PHA schedule parsing", () => {
  const CURRENT_PI = "rec5mEM0YPqPqq0hZ";
  const HOMEWORK_ID = "rechVLOeyEVIqmy2v";
  const WEEK_ID = "recWeVrSabnsYaHc2";

  it("skips incomplete active PHA rows instead of failing the whole catalog", () => {
    const { rows, skippedIncomplete } = parseActivePhaScheduleRows(
      [{
        id: "recPHA0000000001",
        fields: {
          "Homework Assignment": [{ id: HOMEWORK_ID }],
          "Program Instance": [{ id: CURRENT_PI }],
          Week: [],
          "Homework Slot": { name: "HW1" },
          "Active?": true,
        },
      }],
      CURRENT_PI,
    );
    expect(rows).toHaveLength(0);
    expect(skippedIncomplete).toBe(1);
  });

  it("detects duplicate active PI+Week+slot collisions", () => {
    const pha = (id: string, gradeBandId: string) => ({
      id,
      fields: {
        "Homework Assignment": [{ id: HOMEWORK_ID }],
        "Program Instance": [{ id: CURRENT_PI }],
        Week: [{ id: WEEK_ID }],
        "Grade Band": [{ id: gradeBandId, name: gradeBandId }],
        "Homework Slot": { name: "HW1" },
        "Active?": true,
      },
    });

    const { duplicateSlotKeys } = parseActivePhaScheduleRows(
      [pha("recPHA0000000002", "recGB1"), pha("recPHA0000000003", "recGB2")],
      CURRENT_PI,
    );
    expect(duplicateSlotKeys).toHaveLength(1);
    expect(duplicateSlotKeys[0]).toBe(`${CURRENT_PI}|${WEEK_ID}|HW1`);
  });

  it("parses PHA Due Date from active rows", () => {
    const { rows } = parseActivePhaScheduleRows(
      [{
        id: "recPHA0000000004",
        fields: {
          "Homework Assignment": [{ id: HOMEWORK_ID }],
          "Program Instance": [{ id: CURRENT_PI }],
          Week: [{ id: WEEK_ID }],
          "Homework Slot": { name: "HW1" },
          "Active?": true,
          "Due Date": "2027-06-29",
        },
      }],
      CURRENT_PI,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].dueDate).toBe("2027-06-29");
  });

  it("leaves PHA dueDate null when Due Date is absent", () => {
    const { rows } = parseActivePhaScheduleRows(
      [{
        id: "recPHA0000000005",
        fields: {
          "Homework Assignment": [{ id: HOMEWORK_ID }],
          "Program Instance": [{ id: CURRENT_PI }],
          Week: [{ id: WEEK_ID }],
          "Homework Slot": { name: "HW1" },
          "Active?": true,
        },
      }],
      CURRENT_PI,
    );
    expect(rows[0].dueDate).toBeNull();
  });
});

describe("resolveAssignmentDueDateKey", () => {
  const weekMeta = {
    name: "Week 1",
    startDate: "2026-06-01",
    endDate: "2026-06-07",
    weekNumber: 1,
  };

  it("prefers PHA Due Date when present", () => {
    expect(resolveAssignmentDueDateKey("2027-06-29", weekMeta)).toBe("2027-06-29");
  });

  it("falls back to Week End Date when PHA Due Date is blank", () => {
    expect(resolveAssignmentDueDateKey(null, weekMeta)).toBe("2026-06-07");
    expect(resolveAssignmentDueDateKey("", weekMeta)).toBe("2026-06-07");
  });

  it("returns null when both PHA Due Date and week end are missing", () => {
    expect(resolveAssignmentDueDateKey(null, undefined)).toBeNull();
  });

  it("does not throw on invalid Due Date strings", () => {
    expect(resolveAssignmentDueDateKey("not-a-valid-date", weekMeta)).toBe("not-a-valid-date");
  });
});

describe("homework presentation helpers", () => {
  it("uses fallback instructions when brief description is blank", () => {
    expect(resolveInstructionsPreview("")).toBe("Instructions coming soon.");
    expect(resolveSubmissionRequirement("HW2", "")).toContain("Homework 2");
    expect(homeworkSlotOrder("HW2")).toBeGreaterThan(homeworkSlotOrder("HW1"));
  });
});

describe("homework catalog grouping", () => {
  const weekIndex = new Map([
    ["recWEEK10", { name: "Week 10", startDate: "2026-06-01T00:00:00.000Z", endDate: "2026-06-07", weekNumber: 10 }],
    ["recWEEK1", { name: "Week 1", startDate: "2026-03-01T00:00:00.000Z", endDate: "2026-03-07", weekNumber: 1 }],
  ]);

  it("sorts week groups newest first and assignments within week by descending Order", () => {
    const assignments = [
      mapCurriculumToAssignment(
        {
          id: "recHWLow",
          fields: {
            "Assignment Full Name - Display": "Lower order",
            Week: ["recWEEK10"],
            Order: 2,
            "Assignment Number": 2,
          },
        },
        weekIndex,
        {
          phaId: "recPHA1",
          homeworkId: "recHWLow",
          weekId: "recWEEK10",
          programInstanceId: "recPI",
          homeworkSlot: "HW1",
          gradeBandIds: [],
          gradeBands: [],
          dueDate: null,
          operatorNotes: null,
        },
      ),
      mapCurriculumToAssignment(
        {
          id: "recHWHIGH",
          fields: {
            "Assignment Full Name - Display": "Higher order",
            Week: ["recWEEK10"],
            Order: 16,
            "Assignment Number": 1,
          },
        },
        weekIndex,
        {
          phaId: "recPHA2",
          homeworkId: "recHWHIGH",
          weekId: "recWEEK10",
          programInstanceId: "recPI",
          homeworkSlot: "HW2",
          gradeBandIds: [],
          gradeBands: ["7-8"],
          dueDate: null,
          operatorNotes: null,
        },
      ),
      mapCurriculumToAssignment(
        {
          id: "recHW10",
          fields: {
            "Assignment Full Name - Display": "Week 10 HW",
            Week: ["recWEEK10"],
            Order: 1,
            "Assignment Number": 1,
          },
        },
        weekIndex,
      ),
      mapCurriculumToAssignment(
        {
          id: "recHW1",
          fields: {
            "Assignment Full Name - Display": "Week 1 HW",
            Week: ["recWEEK1"],
            Order: 1,
            "Assignment Number": 1,
          },
        },
        weekIndex,
      ),
    ];

    const groups = groupAssignmentsByWeek(assignments);
    expect(groups).toHaveLength(2);
    expect(groups[0].weekName).toBe("Week 10");
    expect(groups[0].assignments[0].displayName).toBe("Higher order");
    expect(groups[0].assignments[1].displayName).toBe("Lower order");
    expect(groups[1].weekName).toBe("Week 1");
  });

  it("does not use Full Assignment Description for instructionsPreview", () => {
    const assignment = mapCurriculumToAssignment(
      {
        id: "recHW10",
        fields: {
          "Assignment Full Name - Display": "Film Study",
          "Brief Description - Display": "",
          "Full Assignment Description": "Long instructions body.",
          Week: ["recWEEK10"],
        },
      },
      weekIndex,
    );

    expect(assignment.instructionsPreview).toBe("Instructions coming soon.");
    expect(assignment.fullDescription).toBe("Long instructions body.");
  });

  it("maps aiText brief descriptions and assignment URLs", () => {
    const assignment = mapCurriculumToAssignment(
      {
        id: "recHW10",
        fields: {
          "Assignment Full Name - Display": "Film Study",
          "Brief Description - Display": {
            state: "generated",
            value: "Watch the game film and take notes.",
            isStale: false,
          },
          URL: "https://example.com/homework/week-10",
          Week: ["recWEEK10"],
        },
      },
      weekIndex,
    );

    expect(assignment.briefDescription).toBe("Watch the game film and take notes.");
    expect(assignment.instructionsPreview).toBe("Watch the game film and take notes.");
    expect(assignment.url).toBe("https://example.com/homework/week-10");
  });

  it("builds PHA-backed catalog without hardcoded assignment limits", () => {
    const phaRows: ScheduledPhaRow[] = Array.from({ length: 12 }, (_, index) => ({
      phaId: `recPHA${String(index).padStart(11, "0")}`,
      homeworkId: `recHW${String(index).padStart(11, "0")}`,
      weekId: "recWEEK10",
      programInstanceId: "recPI",
      homeworkSlot: index % 2 === 0 ? "HW1" : "HW2",
      gradeBandIds: ["recGB1"],
      gradeBands: ["K-2"],
      dueDate: null,
      operatorNotes: null,
    }));

    const curriculumRecords = phaRows.map((row, index) => ({
      id: row.homeworkId,
      fields: {
        "Assignment Full Name - Display": `Assignment ${index + 1}`,
        Order: index + 1,
      },
    }));

    const catalog = buildHomeworkCatalog(
      curriculumRecords,
      [{ id: "recWEEK10", fields: { "Week Name": "Week 10", "Start Date": "2026-06-01" } }],
      phaRows,
    );

    expect(catalog.totalAssignments).toBe(12);
    expect(catalog.weekGroups[0].assignments).toHaveLength(12);
  });
});
