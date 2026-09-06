import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LeaderboardHeroDecoration } from "@/components/site/leaderboard-hero-decoration";

describe("LeaderboardHeroDecoration", () => {
  it("is decorative, hidden from assistive tech, and non-interactive", () => {
    const html = renderToStaticMarkup(createElement(LeaderboardHeroDecoration));

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("object-cover");
    expect(html).toContain("shooting-challenge-leaderboard.webp");
    expect(html).toContain("motion-reduce:opacity");
  });
});
