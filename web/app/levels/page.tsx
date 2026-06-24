import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = {
  title: "Levels | 127 SI Shooting Challenge",
};

/** Levels — progression ladder and current level definitions. */
export default function LevelsPage() {
  return (
    <PlaceholderPage
      title="Levels"
      description="Level thresholds, badges, and progression visuals will appear here."
    />
  );
}
