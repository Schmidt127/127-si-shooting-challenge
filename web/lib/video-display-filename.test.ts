import { describe, expect, it } from "vitest";

import {
  VIDEO_SUBMISSION_FALLBACK,
  resolveVideoDisplayFileName,
  resolveVideoDisplayFileNameWithFallback,
} from "@/lib/video-display-filename";

describe("resolveVideoDisplayFileName", () => {
  it("prefers Custom Video File Name over original upload name", () => {
    expect(resolveVideoDisplayFileName("OffTheDribble", "upload.mov")).toBe("OffTheDribble");
  });

  it("trims whitespace on custom name before blank test", () => {
    expect(resolveVideoDisplayFileName("  FreeThrows  ", "upload.mov")).toBe("FreeThrows");
    expect(resolveVideoDisplayFileName("   ", "upload.mov")).toBe("upload.mov");
  });

  it("treats em dash custom name as blank", () => {
    expect(resolveVideoDisplayFileName("—", "upload.mov")).toBe("upload.mov");
    expect(resolveVideoDisplayFileName(" — ", "upload.mov")).toBe("upload.mov");
  });

  it("falls back to original upload name", () => {
    expect(resolveVideoDisplayFileName("", "athlete-week4.mp4")).toBe("athlete-week4.mp4");
    expect(resolveVideoDisplayFileName(null, "  clip.mov  ")).toBe("clip.mov");
  });

  it("returns null when both sources are unusable", () => {
    expect(resolveVideoDisplayFileName("", "")).toBeNull();
    expect(resolveVideoDisplayFileName("—", "—")).toBeNull();
  });
});

describe("resolveVideoDisplayFileNameWithFallback", () => {
  it("returns Video submission as final fallback", () => {
    expect(resolveVideoDisplayFileNameWithFallback("", "")).toBe(VIDEO_SUBMISSION_FALLBACK);
    expect(resolveVideoDisplayFileNameWithFallback("Custom", "orig.mov")).toBe("Custom");
  });
});
