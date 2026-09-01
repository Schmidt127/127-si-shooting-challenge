import React from "react";

import { cn } from "@/lib/utils";

/** Light blue-gray — matches Hub email `BRAND.cream` (#F4F6FB). */
const COACH_FEEDBACK_QUOTE_BG = "#F4F6FB";

type CoachFeedbackQuoteProps = {
  feedback: string | null | undefined;
  className?: string;
  /** When true, renders a small "Coach feedback" label above the quote block. */
  showLabel?: boolean;
};

export function CoachFeedbackQuote({
  feedback,
  className,
  showLabel = true,
}: CoachFeedbackQuoteProps) {
  const trimmed = typeof feedback === "string" ? feedback.trim() : "";
  if (!trimmed) return null;

  return (
    <div className={cn("mt-2", className)} data-testid="coach-feedback-quote">
      {showLabel ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-subtle">
          Coach feedback
        </p>
      ) : null}
      <blockquote
        className="border-l-4 border-brand-orange px-3 py-2.5 text-sm italic leading-relaxed text-foreground/90"
        style={{ backgroundColor: COACH_FEEDBACK_QUOTE_BG }}
      >
        {trimmed}
      </blockquote>
    </div>
  );
}
