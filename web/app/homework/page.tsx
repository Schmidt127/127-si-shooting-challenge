import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = {
  title: "Homework | 127 SI Shooting Challenge",
};

/** Homework progress — completion status and review state. */
export default function HomeworkPage() {
  return (
    <PlaceholderPage
      title="Homework Progress"
      description="Homework completion and review status will appear here."
    />
  );
}
