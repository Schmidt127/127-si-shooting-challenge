import { describe, expect, it } from "vitest";

import {
  buildTutorialCatalog,
  hasTutorialContentKind,
  isPublishedTutorialMedia,
} from "@/lib/data/tutorials";
import { buildZoomMeetingCatalog, mapZoomMeetingRecord } from "@/lib/data/zoom-meetings";

describe("tutorial content kinds", () => {
  const baseFields = {
    "OK to Publish on Softr": true,
    "Associated Program": ["Shooting Challenge"],
    Name: "Sample",
    "Sort Order": 1,
  };

  it("separates tutorials, shout-outs, and articles", () => {
    const records = [
      { id: "recT1", fields: { ...baseFields, "Tutorial Type": ["Tutorial"] } },
      { id: "recS1", fields: { ...baseFields, "Tutorial Type": ["Shout - Out"] } },
      { id: "recA1", fields: { ...baseFields, "Tutorial Type": ["FBC Article Book"] } },
    ];

    expect(buildTutorialCatalog(records, "tutorial").totalTutorials).toBe(1);
    expect(buildTutorialCatalog(records, "shoutout").totalTutorials).toBe(1);
    expect(buildTutorialCatalog(records, "article").totalTutorials).toBe(1);
  });

  it("requires shooting challenge program for published media", () => {
    expect(
      isPublishedTutorialMedia(
        {
          "Tutorial Type": ["Shout - Out"],
          "Associated Program": ["Dribbling Challenge"],
        },
        "shoutout",
      ),
    ).toBe(false);
    expect(
      hasTutorialContentKind({ "Tutorial Type": ["Shout Out"] }, "shoutout"),
    ).toBe(true);
  });
});

describe("zoom meeting catalog", () => {
  it("groups meetings by week newest first", () => {
    const catalog = buildZoomMeetingCatalog(
      [
        {
          id: "recZ1",
          fields: {
            "Meeting Name": "Week 1 Check-in",
            Week: ["recW1"],
            "Start Time": "2026-03-10T18:00:00.000Z",
            "Meeting Status": "Completed",
          },
        },
        {
          id: "recZ10",
          fields: {
            "Meeting Name": "Week 10 Film Room",
            Week: ["recW10"],
            "Start Time": "2026-06-10T18:00:00.000Z",
            "Meeting Status": "Scheduled",
          },
        },
      ],
      [
        { id: "recW1", fields: { "Week Name": "Week 1" } },
        { id: "recW10", fields: { "Week Name": "Week 10" } },
      ],
    );

    expect(catalog.totalMeetings).toBe(2);
    expect(catalog.weekGroups[0].weekName).toBe("Week 10");
  });

  it("maps zoom links", () => {
    const meeting = mapZoomMeetingRecord(
      {
        id: "recZ1",
        fields: {
          "Meeting Name": "Coach Q&A",
          "Zoom Link": "https://zoom.us/j/123",
        },
      },
      new Map(),
    );

    expect(meeting.zoomLink).toBe("https://zoom.us/j/123");
  });
});
