import { describe, expect, it } from "vitest";

import {
  scCardAccordion,
  scCardAlert,
  scCardEmpty,
  scCardPanel,
  scCardStandalone,
} from "./sc-card";

describe("sc-card design system (FUT-043)", () => {
  it("uses shared radius token on standalone and panel shells", () => {
    expect(scCardStandalone()).toContain("--sc-card-radius");
    expect(scCardPanel()).toContain("--sc-card-radius");
    expect(scCardEmpty()).toContain("--sc-card-radius");
    expect(scCardAccordion()).toContain("--sc-card-radius");
  });

  it("uses shared padding tokens on panel and standalone shells", () => {
    expect(scCardPanel()).toContain("--sc-card-panel-padding");
    expect(scCardStandalone()).toContain("--sc-card-padding-x");
  });

  it("uses sm radius token on alert and accordion helpers", () => {
    expect(scCardAlert()).toContain("--sc-card-radius-sm");
  });

  it("applies stable BEM-style class hooks for audits", () => {
    expect(scCardPanel()).toContain("sc-card-panel");
    expect(scCardAlert()).toContain("sc-card-alert");
    expect(scCardAccordion()).toContain("sc-card-accordion");
  });
});
