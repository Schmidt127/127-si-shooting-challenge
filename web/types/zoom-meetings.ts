import type { CatalogAttachment } from "@/types/levels";

export type ZoomMeeting = {
  id: string;
  name: string;
  weekId: string;
  weekName: string;
  weekNumber: number;
  startTime: string | null;
  endTime: string | null;
  briefDescription: string;
  fullDescription: string;
  zoomLink: string;
  hostName: string;
  meetingAgenda: string;
  agendaLink: string;
  recordingVideoUrl: string;
  recordingAudioUrl: string;
  meetingSummary: string;
  status: string;
  coverImage: CatalogAttachment | null;
};

export type ZoomMeetingWeekGroup = {
  weekId: string;
  weekName: string;
  weekNumber: number;
  meetings: ZoomMeeting[];
};

export type ZoomMeetingCatalogData = {
  weekGroups: ZoomMeetingWeekGroup[];
  totalMeetings: number;
  updatedAt: string;
};
