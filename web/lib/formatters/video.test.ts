import { describe, expect, it } from "vitest";

import { getVideoEmbedUrl } from "@/lib/formatters/video";

describe("getVideoEmbedUrl", () => {
  it("embeds youtube watch links", () => {
    expect(getVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("embeds youtu.be links", () => {
    expect(getVideoEmbedUrl("https://youtu.be/abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
  });
});
