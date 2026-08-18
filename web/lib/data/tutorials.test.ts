import { describe, expect, it } from "vitest";

import {
  buildTutorialCatalog,
  extractVideoUrl,
  hasTutorialContentKind,
  isPublishedTutorialMedia,
  mapTutorialRecord,
} from "@/lib/data/tutorials";
import { buildZoomMeetingCatalog, mapZoomMeetingRecord } from "@/lib/data/zoom-meetings";

describe("tutorial content kinds", () => {
  const baseFields = {
    "OK to Publish on Softr": "checked",
    "Associated Program": ["Shooting Challenge"],
    Name: "Sample",
    "Sort Order": 1,
  };

  it("separates tutorials, shout-outs, and articles", () => {
    const records = [
      { id: "recT1", fields: { ...baseFields, "Type of Asset": "Tutorial" } },
      { id: "recS1", fields: { ...baseFields, "Type of Asset": "Shout Out" } },
      { id: "recA1", fields: { ...baseFields, "Type of Asset": "FBC Article Book" } },
    ];

    expect(buildTutorialCatalog(records, "tutorial").totalTutorials).toBe(1);
    expect(buildTutorialCatalog(records, "shoutout").totalTutorials).toBe(1);
    expect(buildTutorialCatalog(records, "article").totalTutorials).toBe(1);
  });

  it("requires shooting challenge program for published media", () => {
    expect(
      isPublishedTutorialMedia(
        {
          "Type of Asset": "Shout Out",
          "Associated Program": ["Dribbling Challenge"],
        },
        "shoutout",
      ),
    ).toBe(false);
    expect(hasTutorialContentKind({ "Type of Asset": "Shout Out" }, "shoutout")).toBe(true);
  });

  it("maps Tutorials & Assets field names with defensive fallbacks", () => {
    const tutorial = mapTutorialRecord({
      id: "recT1",
      fields: {
        Name: "Form shooting",
        "Link to Video": "Watch this\nhttps://youtu.be/abc123 extra",
        "Type of Asset": "Tutorial",
        "Brief Descriptions": "Short tip",
        "Detailed Description": "Long tip",
        "Assignment Rationale": "Builds form",
        "Display Image": [{ id: "att1", url: "https://example.com/display.jpg", filename: "d.jpg" }],
      },
    });

    expect(tutorial.videoUrl).toBe("https://youtu.be/abc123");
    expect(tutorial.briefDescription).toBe("Short tip");
    expect(tutorial.assignmentRationale).toBe("Builds form");
    expect(tutorial.thumbnail?.url).toBe("https://example.com/display.jpg");
    expect(tutorial.categories).toEqual([]);
  });

  it("reads BOM-prefixed primary Name from Tutorials & Assets", () => {
    const tutorial = mapTutorialRecord({
      id: "recT2",
      fields: {
        "\uFEFFName": "BOM title",
        "Type of Asset": "Tutorial",
      },
    });
    expect(tutorial.name).toBe("BOM title");
  });

  it("uses the exact Link to Video URL and never invents a fallback", () => {
    const signed =
      "https://cdn.example.com/videos/form%20shooting.mp4?X-Amz-Signature=abc+def&X-Amz-Expires=3600";
    expect(extractVideoUrl(signed)).toBe(signed);
    expect(extractVideoUrl(`  ${signed}  `)).toBe(signed);
    expect(extractVideoUrl("")).toBe("");
    expect(extractVideoUrl("   ")).toBe("");
    expect(extractVideoUrl("Video coming soon")).toBe("");
    expect(extractVideoUrl("javascript:alert(1)")).toBe("");
    expect(extractVideoUrl("https://vimeo.com/123")).toBe("https://vimeo.com/123");
    expect(extractVideoUrl("notes\nhttps://youtu.be/xyz\nmore")).toBe("https://youtu.be/xyz");
    expect(
      extractVideoUrl({
        id: "att1",
        url: "https://v5.airtableusercontent.com/v0/clip.mp4",
        filename: "clip.mp4",
      }),
    ).toBe("");
    expect(
      extractVideoUrl([
        { id: "att1", url: "https://v5.airtableusercontent.com/v0/clip.mp4", filename: "clip.mp4" },
      ]),
    ).toBe("");
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
