import { describe, expect, it } from "vitest";

import {
  mapRecentXpEvents,
  mapXpSummariesToPublicActivity,
} from "@/lib/data/public-athlete-profile";

describe("public athlete activity mapping", () => {
  it("maps XP summaries preserving activity dates and bucket labels", () => {
    const items = mapXpSummariesToPublicActivity([
      {
        id: "recXp1",
        points: 20,
        sourceLabel: "Submission Base",
        reasonPublic: "Shooting submission completed.",
        activityDate: "2026-08-22",
      },
      {
        id: "recXp2",
        points: 30,
        sourceLabel: "Shot Milestone",
        reasonPublic: "Shot milestone reached: 100% milestone.",
        activityDate: "2026-08-21",
      },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].date).toBe("2026-08-22");
    expect(items[0].xp).toBe(20);
    expect(items[1].title).toContain("Shot milestone");
    expect(items.every((item) => item.kind === "xp")).toBe(true);
  });

  it("uses XP Activity Date for recent XP events, not Created alone", () => {
    const items = mapRecentXpEvents([
      {
        fields: {
          "Active?": true,
          "Active XP Points": 15,
          "XP Reason Public": "5-Day Streak completed.",
          "XP Source": "5-Day Streak",
          "XP Activity Date": "2026-08-20T17:00:00.000Z",
          Created: "2026-08-21T12:00:00.000Z",
        },
      },
    ]);

    expect(items[0].date).toBe("2026-08-20");
    expect(items[0].xp).toBe(15);
  });

  it("falls back to Created only when XP Activity Date is absent", () => {
    const items = mapRecentXpEvents([
      {
        fields: {
          "Active?": true,
          "Active XP Points": 35,
          "XP Reason Public": "Homework completed.",
          "XP Source": "Homework Completion",
          Created: "2026-08-21T12:00:00.000Z",
        },
      },
    ]);

    expect(items[0].date).toBe("2026-08-21");
  });
});
