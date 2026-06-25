import type { Metadata } from "next";

import {
  ZoomMeetingsCatalogView,
  ZoomMeetingsEmptyState,
  ZoomMeetingsErrorState,
} from "@/components/zoom-meetings/zoom-meetings-views";
import { fetchZoomMeetingCatalog } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Zoom Meetings",
  description: "Shooting Challenge zoom sessions — schedules, agendas, and recordings.",
};

export const revalidate = 300;

export default async function ZoomMeetingsPage() {
  try {
    const data = await fetchZoomMeetingCatalog();

    if (data.totalMeetings === 0) {
      return <ZoomMeetingsEmptyState />;
    }

    return <ZoomMeetingsCatalogView data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <ZoomMeetingsErrorState message={message} />;
  }
}
