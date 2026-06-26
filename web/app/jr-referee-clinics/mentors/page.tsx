import type { Metadata } from "next";

import { JrRefSectionPlaceholder } from "@/components/jr-ref/section-placeholder";

export const metadata: Metadata = {
  title: "Mentor Montana Officials",
  description: "Mentor officials for JR Referee Clinics.",
};

export default function JrRefMentorsPage() {
  return (
    <JrRefSectionPlaceholder
      title="Mentor Montana Officials"
      description="Mentor roster from Fillout registrations in the 127SI - JR REF Airtable base."
      tableHint="Mentor Montana Officials"
    />
  );
}
