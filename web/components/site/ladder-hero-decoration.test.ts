import { describe, expect, it } from "vitest";

import { LadderHeroDecoration } from "@/components/site/ladder-hero-decoration";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("LadderHeroDecoration", () => {
  it("is decorative, hidden from assistive tech, and non-interactive", () => {
    const html = renderToStaticMarkup(createElement(LadderHeroDecoration));

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events-none");
    expect(html).toMatch(/bg-brand-blue\/1[04]/);
  });
});
