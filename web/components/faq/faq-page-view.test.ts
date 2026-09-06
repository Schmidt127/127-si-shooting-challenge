import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FaqPageView } from "@/components/faq/faq-page-view";
import { PROGRAM_FAQ_ITEMS } from "@/lib/seo/faq-content";

describe("FaqPageView accordion", () => {
  it("renders each FAQ as a closed details/summary accordion item", () => {
    const html = renderToStaticMarkup(
      createElement(FaqPageView, { items: PROGRAM_FAQ_ITEMS }),
    );

    expect(html).toContain("<details");
    expect(html).toContain("<summary");
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
});
