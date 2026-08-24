import { describe, expect, it } from "vitest";

import {
  BASKETBALL_GRAPHIC,
  BASKETBALL_GRAPHIC_ALT,
  BASKETBALL_GRAPHIC_DIMENSIONS,
} from "@/lib/brand/basketball-assets";

describe("basketball branding assets", () => {
  it("uses clear filenames under public branding", () => {
    expect(BASKETBALL_GRAPHIC.master).toBe("/images/branding/basketball-3d-master.png");
    expect(BASKETBALL_GRAPHIC.default).toBe("/images/branding/basketball-3d.webp");
    expect(BASKETBALL_GRAPHIC.small).toBe("/images/branding/basketball-3d-small.webp");
  });

  it("documents square derivative dimensions", () => {
    expect(BASKETBALL_GRAPHIC_DIMENSIONS.default).toEqual({ width: 512, height: 512 });
    expect(BASKETBALL_GRAPHIC_DIMENSIONS.small).toEqual({ width: 256, height: 256 });
  });

  it("uses descriptive alt text", () => {
    expect(BASKETBALL_GRAPHIC_ALT).toBe("Photorealistic 3D basketball");
  });
});
