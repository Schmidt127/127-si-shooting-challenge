import { describe, expect, it } from "vitest";

import {
  faqItemMatchesHash,
  normalizeFaqHash,
  resolveFaqDetailsOpen,
} from "@/components/faq/faq-hash";

describe("faq hash helpers", () => {
  it("normalizes fragments with or without a leading #", () => {
    expect(normalizeFaqHash("#video-feedback")).toBe("video-feedback");
    expect(normalizeFaqHash("video-feedback")).toBe("video-feedback");
    expect(normalizeFaqHash("  #awards  ")).toBe("awards");
    expect(normalizeFaqHash("")).toBe("");
    expect(normalizeFaqHash("#")).toBe("");
  });

  it("matches only the targeted FAQ id", () => {
    expect(faqItemMatchesHash("video-feedback", "#video-feedback")).toBe(true);
    expect(faqItemMatchesHash("video-feedback", "video-feedback")).toBe(true);
    expect(faqItemMatchesHash("video-feedback", "#awards")).toBe(false);
    expect(faqItemMatchesHash("video-feedback", "")).toBe(false);
    expect(faqItemMatchesHash("video-feedback", "#")).toBe(false);
  });

  it("opens on hash match and stays open even when userOpen is false", () => {
    expect(resolveFaqDetailsOpen("video-feedback", "#video-feedback", null)).toBe(true);
    expect(resolveFaqDetailsOpen("video-feedback", "#video-feedback", false)).toBe(true);
    expect(resolveFaqDetailsOpen("video-feedback", "#video-feedback", true)).toBe(true);
  });

  it("stays closed by default without a matching hash", () => {
    expect(resolveFaqDetailsOpen("video-feedback", "", null)).toBe(false);
    expect(resolveFaqDetailsOpen("video-feedback", "#awards", null)).toBe(false);
    expect(resolveFaqDetailsOpen("video-feedback", "", false)).toBe(false);
  });

  it("honors user toggle when the hash does not match", () => {
    expect(resolveFaqDetailsOpen("video-feedback", "", true)).toBe(true);
    expect(resolveFaqDetailsOpen("video-feedback", "#awards", true)).toBe(true);
    expect(resolveFaqDetailsOpen("video-feedback", "#awards", false)).toBe(false);
  });
});
