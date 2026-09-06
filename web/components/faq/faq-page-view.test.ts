import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FaqPageView } from "@/components/faq/faq-page-view";
import { PROGRAM_FAQ_ITEMS } from "@/lib/seo/faq-content";

const DETAILS_SOURCE = readFileSync(
  join(process.cwd(), "components/faq/faq-details-item.tsx"),
  "utf8",
);

describe("FaqPageView accordion", () => {
  it("renders each FAQ as a closed details/summary accordion item", () => {
    const html = renderToStaticMarkup(
      createElement(FaqPageView, { items: PROGRAM_FAQ_ITEMS }),
    );

    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    // SSR / first paint: closed by default (hash open happens client-side).
    expect(html).not.toMatch(/<details[^>]*\sopen[\s>]/);

    for (const item of PROGRAM_FAQ_ITEMS) {
      expect(html).toContain(`id="${item.id}"`);
      // React escapes apostrophes in HTML text nodes (`'` → `&#x27;`).
      const escapedQuestion = item.question.replace(/'/g, "&#x27;");
      const escapedAnswer = item.answer.replace(/'/g, "&#x27;");
      expect(html).toContain(escapedQuestion);
      expect(html).toContain(escapedAnswer);
    }
  });

  it("keeps summaries keyboard-focusable without a new UI library", () => {
    const html = renderToStaticMarkup(
      createElement(FaqPageView, { items: PROGRAM_FAQ_ITEMS.slice(0, 1) }),
    );
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("list-none");
    expect(html).toContain("cursor-pointer");
  });

  it("respects reduced-motion friendly transition classes", () => {
    const html = renderToStaticMarkup(
      createElement(FaqPageView, { items: PROGRAM_FAQ_ITEMS.slice(0, 1) }),
    );
    expect(html).toContain("motion-safe:transition");
  });

  it("opens the matching details item from location.hash on the client", () => {
    expect(DETAILS_SOURCE).toContain("use client");
    expect(DETAILS_SOURCE).toContain('window.addEventListener("hashchange"');
    expect(DETAILS_SOURCE).toContain("resolveFaqDetailsOpen");
    expect(DETAILS_SOURCE).toContain("window.location.hash");
  });
});
