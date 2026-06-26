import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = {
  title: "Admin | 127 SI Shooting Challenge",
  robots: { index: false, follow: false },
};

/**
 * Admin area — future coach/staff tools (auth required).
 * Not exposed in navigation during the private dev phase.
 */
export default function AdminPage() {
  return (
    <PlaceholderPage
      title="Admin"
      description="Future staff tools for review queues and publishing controls."
    />
  );
}
