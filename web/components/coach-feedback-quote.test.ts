import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CoachFeedbackQuote } from "@/components/coach-feedback-quote";

describe("CoachFeedbackQuote", () => {
  it("renders quotation styling when feedback is present", () => {
    const html = renderToStaticMarkup(
      createElement(CoachFeedbackQuote, { feedback: "Nice work." }),
    );

    expect(html).toContain('data-testid="coach-feedback-quote"');
    expect(html).toContain("<blockquote");
    expect(html).toContain("border-brand-orange");
    expect(html).toContain("italic");
    expect(html).toContain("Nice work.");
    expect(html).toContain("Coach feedback");
    expect(html).toContain("#F4F6FB");
  });

  it("hides the quotation block when feedback is empty", () => {
    for (const feedback of [null, undefined, "", "   "]) {
      const html = renderToStaticMarkup(
        createElement(CoachFeedbackQuote, { feedback }),
      );
      expect(html).toBe("");
    }
  });
});
