import { describe, expect, it } from "vitest";

import {
  getProviderPosterUrl,
  getVideoEmbedUrl,
  getYouTubeVideoId,
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
