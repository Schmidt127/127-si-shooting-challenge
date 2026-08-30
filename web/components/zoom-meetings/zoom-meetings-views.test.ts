import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ZoomMeetingDetailView,
  ZoomMeetingsCatalogView,
  ZoomMeetingsEmptyState,
  ZoomMeetingsErrorState,
} from "@/components/zoom-meetings/zoom-meetings-views";
import type { ZoomMeeting, ZoomMeetingCatalogData } from "@/types/zoom-meetings";

function meeting(overrides: Partial<ZoomMeeting> = {}): ZoomMeeting {
  return {
    id: "recZoomMeeting001",
    name: "Week 10 Film Room",
    weekId: "recWeek000000010",
    weekName: "Week 10",
    weekNumber: 10,
    startTime: "2026-06-10T18:00:00.000Z",
    endTime: "2026-06-10T19:00:00.000Z",
    briefDescription: "Break down closeout footwork.",
    fullDescription: "Full meeting brief that must not appear on catalog cards.",
    zoomLink: "",
    hostName: "Coach Mike",
    meetingAgenda: "",
    agendaLink: "",
    recordingVideoUrl: "",
    recordingAudioUrl: "",
    meetingSummary: "",
    status: "Completed",
    coverImage: null,
    ...overrides,
  };
}

function catalog(meetings: ZoomMeeting[]): ZoomMeetingCatalogData {
  return {
    weekGroups: [
      {
        weekId: "recWeek000000010",
        weekName: "Week 10",
        weekNumber: 10,
        meetings,
      },
    ],
    totalMeetings: meetings.length,
    updatedAt: "2026-08-25T12:00:00.000Z",
  };
}

describe("ZoomMeetingsCatalogView", () => {
  it("renders portfolio sections and catalog cards", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingsCatalogView, { data: catalog([meeting()]) }),
    );
    expect(html).toContain("data-testid=\"zoom-meeting-catalog-list\"");
    expect(html).toContain("data-testid=\"zoom-meeting-catalog-card\"");
    expect(html).toContain("data-testid=\"zoom-terminology\"");
    expect(html).toContain("data-testid=\"zoom-orientation\"");
  });

  it("shows live session access badge when join link is active", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingsCatalogView, {
        data: catalog([
          meeting({
            status: "Scheduled",
            zoomLink: "https://zoom.us/j/123",
          }),
        ]),
      }),
    );
    expect(html).toContain("Live session");
    expect(html).toContain("Join Zoom meeting");
    expect(html).toContain("https://zoom.us/j/123");
  });

  it("shows recording access badge and watch links when replay is published", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingsCatalogView, {
        data: catalog([
          meeting({
            recordingVideoUrl: "https://example.com/recording.mp4",
          }),
        ]),
      }),
    );
    expect(html).toContain("Recording available");
    expect(html).toContain("Watch recording");
    expect(html).toContain("https://example.com/recording.mp4");
  });

  it("renders graceful cover fallback when cover media is missing", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingsCatalogView, { data: catalog([meeting()]) }),
    );
    expect(html).toContain("data-testid=\"zoom-meeting-cover-fallback\"");
    expect(html).toContain("W10");
  });

  it("uses brief description preview and not full meeting brief on cards", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingsCatalogView, { data: catalog([meeting()]) }),
    );
    expect(html).toContain("Break down closeout footwork.");
    expect(html).not.toContain("Full meeting brief that must not appear on catalog cards.");
  });

  it("links each card title to the zoom detail route", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingsCatalogView, { data: catalog([meeting()]) }),
    );
    expect(html).toContain('href="/zoom-meetings/recZoomMeeting001"');
  });
});

describe("ZoomMeetingDetailView", () => {
  it("renders detail cover fallback when cover media is missing", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingDetailView, { meeting: meeting() }),
    );
    expect(html).toContain("data-testid=\"zoom-meeting-cover-fallback\"");
  });
});

describe("Zoom catalog states", () => {
  it("renders empty state markup", () => {
    const html = renderToStaticMarkup(createElement(ZoomMeetingsEmptyState));
    expect(html).toContain("data-testid=\"zoom-meeting-catalog-empty\"");
  });

  it("renders error state markup", () => {
    const html = renderToStaticMarkup(
      createElement(ZoomMeetingsErrorState, { message: "Zoom temporarily unavailable." }),
    );
    expect(html).toContain("data-testid=\"zoom-meeting-catalog-error\"");
    expect(html).toContain("Zoom temporarily unavailable.");
  });
});
