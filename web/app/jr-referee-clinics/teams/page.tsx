import type { Metadata } from "next";

import { JrRefSectionPlaceholder } from "@/components/jr-ref/section-placeholder";

export const metadata: Metadata = {
  title: "Teams",
  description: "Teams playing in JR Referee Clinic games.",
};

export default function JrRefTeamsPage() {
  return (
    <JrRefSectionPlaceholder
      title="Teams"
      description="Team registrations from Fillout in the 127SI - JR REF Airtable base."
      tableHint="Teams"
    />
  );
}
