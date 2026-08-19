import { describe, expect, it } from "vitest";

import {
  getProviderPosterUrl,
  getVideoEmbedUrl,
  getYouTubeVideoId,
  isDirectVideoUrl,
  isInPageVideoUrl,
  isValidHttpUrl,
} from "@/lib/formatters/video";

describe("getVideoEmbedUrl", () => {
  it("embeds youtube watch links via youtube-nocookie", () => {
    expect(getVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("embeds youtu.be links", () => {
    expect(getVideoEmbedUrl("https://youtu.be/abc123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123",
    );
  });

  it("embeds vimeo links", () => {
    expect(getVideoEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });
});

describe("video posters", () => {
  it("derives youtube poster URLs", () => {
    expect(getYouTubeVideoId("https://youtu.be/abc123")).toBe("abc123");
    expect(getProviderPosterUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    );
  });

  it("returns null poster for unknown providers", () => {
    expect(getProviderPosterUrl("https://example.com/clip.mp4")).toBeNull();
  });
});

describe("direct catalog video URLs", () => {
  it("treats signed S3 paths with encoded spaces as direct files", () => {
    const signed =
      "https://media.example.com/shoot/form%20shooting.mp4?X-Amz-Signature=abc+def&X-Amz-Expires=3600";
    expect(isDirectVideoUrl(signed)).toBe(true);
    expect(isInPageVideoUrl(signed)).toBe(true);
    expect(getVideoEmbedUrl(signed)).toBeNull();
  });

  it("does not treat blank or non-http values as playable", () => {
    expect(isValidHttpUrl("")).toBe(false);
    expect(isInPageVideoUrl("")).toBe(false);
    expect(isInPageVideoUrl("Video coming soon")).toBe(false);
  });
});
