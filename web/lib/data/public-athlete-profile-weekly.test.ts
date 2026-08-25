import { describe, expect, it } from "vitest";

import {
  buildPublicWeekMetaIndex,
  isWeekCurrentOrPast,
  mapWeeklySummaries,
  type PublicWasFields,
} from "@/lib/data/public-athlete-profile";

const TODAY = "2026-08-24";

function wasRecord(
  weekId: string,
  label: string,
  overrides: Partial<Record<keyof PublicWasFields, unknown>> = {},
): { fields: PublicWasFields } {
  return {
    fields: {
      Week: [weekId],
      "Weekly Email Week Label": label,
      "Total Shots This Week": 100,
      "Days Logged This Week": 5,
      "XP Earned This Week": 25,
      ...overrides,
    },
  };
}

describe("mapWeeklySummaries", () => {
  const weekMetaById = buildPublicWeekMetaIndex([
    { id: "recW1", fields: { "Week Name": "Week 1", "Start Date": "2026-06-01" } },
    { id: "recW2", fields: { "Week Name": "Week 2", "Start Date": "2026-06-08" } },
    { id: "recW3", fields: { "Week Name": "Week 3", "Start Date": "2026-06-15" } },
    { id: "recWF", fields: { "Week Name": "Week 9", "Start Date": "2026-09-01" } },
    {
      id: "recPrevYear",
      fields: { "Week Name": "Week 12", "Start Date": "2025-05-01", "End Date": "2025-05-07" },
    },
    {
      id: "recCurrYearLate",
      fields: { "Week Name": "Week 8", "Start Date": "2026-08-18", "End Date": "2026-08-24" },
    },
  ]);

  it("sorts displayed weeks newest first by Start Date", () => {
    const summaries = mapWeeklySummaries(
      [
        wasRecord("recW1", "Week 1"),
        wasRecord("recW3", "Week 3"),
        wasRecord("recW2", "Week 2"),
      ],
      weekMetaById,
      { todayKey: TODAY },
    );

    expect(summaries.map((row) => row.weekLabel)).toEqual(["Week 3", "Week 2", "Week 1"]);
  });

  it("excludes future weeks whose Start Date is after today", () => {
    const summaries = mapWeeklySummaries(
      [wasRecord("recW2", "Week 2"), wasRecord("recWF", "Week 9")],
      weekMetaById,
      { todayKey: TODAY },
    );

    expect(summaries.map((row) => row.weekLabel)).toEqual(["Week 2"]);
  });

  it("includes the current week when Start Date is on or before today", () => {
    const summaries = mapWeeklySummaries(
      [wasRecord("recCurrYearLate", "Week 8")],
      weekMetaById,
      { todayKey: TODAY },
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.weekLabel).toBe("Week 8");
  });

  it("orders weeks across challenge years by calendar Start Date", () => {
    const summaries = mapWeeklySummaries(
      [
        wasRecord("recPrevYear", "2025-2026 Week 12"),
        wasRecord("recCurrYearLate", "Week 8"),
        wasRecord("recW1", "Week 1"),
      ],
      weekMetaById,
      { todayKey: TODAY },
    );

    expect(summaries.map((row) => row.weekLabel)).toEqual([
      "Week 8",
      "Week 1",
      "2025-2026 Week 12",
    ]);
  });

  it("returns an empty list when every linked summary is for a future week", () => {
    const summaries = mapWeeklySummaries([wasRecord("recWF", "Week 9")], weekMetaById, {
      todayKey: TODAY,
    });

    expect(summaries).toEqual([]);
  });

  it("returns an empty list when no weekly summary records exist", () => {
    expect(mapWeeklySummaries([], weekMetaById, { todayKey: TODAY })).toEqual([]);
  });

  it("preserves XP, homework, and perfect-week fields on each row", () => {
    const summaries = mapWeeklySummaries(
      [
        wasRecord("recW2", "Week 2", {
          "XP Earned This Week": 42,
          "Homework Completed?": 1,
          "Perfect Week Eligible?": 1,
          "Goal Completion %": 0.75,
          "Momentum Status": "On Track",
        }),
      ],
      weekMetaById,
      { todayKey: TODAY },
    );

    expect(summaries[0]).toMatchObject({
      weekLabel: "Week 2",
      weeklyXp: 42,
      homeworkCompleted: true,
      perfectWeek: true,
      goalCompletionPercent: 75,
      momentumStatus: "On Track",
      totalShots: 100,
      daysLogged: 5,
      perfectWeekStatusLabel: "Perfect Week",
    });
  });

  it("respects the display limit after filtering and sorting", () => {
    const summaries = mapWeeklySummaries(
      [
        wasRecord("recW1", "Week 1"),
        wasRecord("recW2", "Week 2"),
        wasRecord("recW3", "Week 3"),
        wasRecord("recCurrYearLate", "Week 8"),
      ],
      weekMetaById,
      { todayKey: TODAY, limit: 2 },
    );

    expect(summaries.map((row) => row.weekLabel)).toEqual(["Week 8", "Week 3"]);
  });
});

describe("isWeekCurrentOrPast", () => {
  it("treats missing Start Date as visible", () => {
    expect(isWeekCurrentOrPast(undefined, TODAY)).toBe(true);
    expect(isWeekCurrentOrPast({ name: "Week X", startDate: null, endDate: null }, TODAY)).toBe(
      true,
    );
  });
});
