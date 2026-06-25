import { describe, expect, it } from "vitest";

import {
  buildHomeworkCatalog,
  groupAssignmentsByWeek,
  mapCurriculumToAssignment,
  parseWeekNumber,
} from "@/lib/data/homework";

describe("parseWeekNumber", () => {
  it("extracts numeric week from week name", () => {
    expect(parseWeekNumber("Week 10")).toBe(10);
    expect(parseWeekNumber("Week 1")).toBe(1);
    expect(parseWeekNumber("Unknown")).toBe(0);
  });
});

describe("homework catalog grouping", () => {
  const weekIndex = new Map([
    ["recWEEK10", { name: "Week 10", startDate: "2026-06-01T00:00:00.000Z" }],
    ["recWEEK1", { name: "Week 1", startDate: "2026-03-01T00:00:00.000Z" }],
  ]);

  it("sorts week groups newest first and assignments within week", () => {
    const assignments = [
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
    ];

    const groups = groupAssignmentsByWeek(assignments);
    expect(groups).toHaveLength(2);
    expect(groups[0].weekName).toBe("Week 10");
    expect(groups[1].weekName).toBe("Week 1");
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
    expect(assignment.url).toBe("https://example.com/homework/week-10");
  });

  it("builds catalog metadata", () => {
    const catalog = buildHomeworkCatalog(
      [
        {
          id: "recHW10",
          fields: {
            "Assignment Full Name - Display": "Film Study",
            Week: ["recWEEK10"],
            "Published?": true,
          },
        },
      ],
      [
        { id: "recWEEK10", fields: { "Week Name": "Week 10", "Start Date": "2026-06-01" } },
      ],
    );

    expect(catalog.totalAssignments).toBe(1);
    expect(catalog.weekGroups[0].assignments[0].displayName).toBe("Film Study");
  });
});
