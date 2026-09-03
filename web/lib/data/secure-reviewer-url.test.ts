import { describe, expect, it } from "vitest";

import { resolveSecureReviewerUrl } from "@/lib/data/secure-reviewer-url";

describe("resolveSecureReviewerUrl", () => {
  it("accepts parent-facing Lambda reviewer URLs only", () => {
    const url =
      "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/recReiXXBRtaW3lns?token=abc123";
    expect(resolveSecureReviewerUrl(url)).toBe(url);
  });

  it("rejects raw S3 URLs", () => {
    expect(
      resolveSecureReviewerUrl("https://127-si-assets.s3.amazonaws.com/private/video.mp4"),
    ).toBeNull();
  });
});
