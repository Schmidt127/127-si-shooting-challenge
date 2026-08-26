import type { Metadata } from "next";

import {
  ZoomMeetingsCatalogView,
  ZoomMeetingsEmptyState,
  ZoomMeetingsErrorState,
} from "@/components/zoom-meetings/zoom-meetings-views";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchZoomMeetingCatalog } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Zoom Meetings — Remote Coaching Sessions",
  description:
    "Shooting Challenge Zoom schedules, agendas, and recordings for live and remote youth basketball coaching check-ins.",
  path: "/zoom-meetings",
});

export const revalidate = 300;

export default async function ZoomMeetingsPage() {
  try {
    const data = await fetchZoomMeetingCatalog();

    if (data.totalMeetings === 0) {
      return <ZoomMeetingsEmptyState />;
    }

    return <ZoomMeetingsCatalogView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <ZoomMeetingsErrorState message={message} />;
  }
}
