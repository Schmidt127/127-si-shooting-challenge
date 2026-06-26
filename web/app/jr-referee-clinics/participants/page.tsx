import type { Metadata } from "next";

import { JrRefSectionPlaceholder } from "@/components/jr-ref/section-placeholder";

export const metadata: Metadata = {
  title: "JR Ref Participants",
  description: "Registered youth officials for JR Referee Clinics.",
};

export default function JrRefParticipantsPage() {
  return (
    <JrRefSectionPlaceholder
      title="JR Ref Participants"
      description="Participant roster from Fillout registrations in the 127SI - JR REF Airtable base."
      tableHint="JR Ref Participants"
    />
  );
}
