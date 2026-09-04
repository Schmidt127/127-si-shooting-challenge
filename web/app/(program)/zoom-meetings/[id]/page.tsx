import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ZoomMeetingDetailView,
  ZoomMeetingNotFoundState,
  ZoomMeetingsErrorState,
} from "@/components/zoom-meetings/zoom-meetings-views";
import { DetailStructuredData } from "@/components/seo/detail-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchZoomMeeting } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

type ZoomMeetingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: ZoomMeetingDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const meeting = await fetchZoomMeeting(id);
    if (!meeting) return { title: "Meeting not found" };

    return buildPageMetadata({
      title: meeting.name,
      description: meeting.briefDescription || "Shooting Challenge zoom meeting.",
      path: `/zoom-meetings/${id}`,
    });
  } catch {
    return { title: "Zoom Meeting" };
  }
}

export default async function ZoomMeetingDetailPage({ params }: ZoomMeetingDetailPageProps) {
  const { id } = await params;

  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) {
    notFound();
  }

  try {
    const meeting = await fetchZoomMeeting(id);
    if (!meeting) return <ZoomMeetingNotFoundState />;
    return (
      <>
        <DetailStructuredData
          section="zoomMeetings"
          itemName={meeting.name}
          itemDescription={meeting.briefDescription || "Shooting Challenge zoom meeting."}
          itemPath={`/zoom-meetings/${id}`}
        />
        <ZoomMeetingDetailView meeting={meeting} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return <ZoomMeetingsErrorState message={message} />;
  }
}
