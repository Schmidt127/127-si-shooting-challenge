import type {
  ZoomMeeting,
  ZoomMeetingCatalogData,
  ZoomMeetingWeekGroup,
} from "@/types/zoom-meetings";

import { asText, asUrl } from "./airtable-values";
import { getFirstLinkedId, mapAttachments, parseWeekNumber } from "./homework";

export type ZoomMeetingFields = {
  "Meeting Name"?: unknown;
  "Cover Media"?: unknown;
  Week?: unknown;
  "Start Time"?: unknown;
  "End Time"?: unknown;
  "Brief Description"?: unknown;
  "Full Description"?: unknown;
  "Zoom Link"?: unknown;
  "Host Name"?: unknown;
  "Meeting Agenda"?: unknown;
  "Meeting Agenda Link"?: unknown;
  "Recording Link - Video"?: unknown;
  "Recording Link - Audio Only"?: unknown;
  "Meeting Summary"?: unknown;
  "Meeting Status"?: unknown;
};

export type WeekFields = {
  "Week Name"?: unknown;
  "Start Date"?: unknown;
};

function asIsoDateTime(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

export function mapZoomMeetingRecord(
  record: { id: string; fields: ZoomMeetingFields },
  weekIndex: Map<string, { name: string; startDate: string | null }>,
): ZoomMeeting {
  const fields = record.fields;
  const weekId = getFirstLinkedId(fields.Week);
  const weekMeta = weekIndex.get(weekId);
  const weekName = weekMeta?.name ?? "Unassigned Week";
  const coverImages = mapAttachments(fields["Cover Media"]);

  return {
    id: record.id,
    name: asText(fields["Meeting Name"], "Zoom Meeting"),
    weekId,
    weekName,
    weekNumber: parseWeekNumber(weekName),
    startTime: asIsoDateTime(fields["Start Time"]),
    endTime: asIsoDateTime(fields["End Time"]),
    briefDescription: asText(fields["Brief Description"], ""),
    fullDescription: asText(fields["Full Description"], ""),
    zoomLink: asUrl(fields["Zoom Link"]),
    hostName: asText(fields["Host Name"], ""),
    meetingAgenda: asText(fields["Meeting Agenda"], ""),
    agendaLink: asUrl(fields["Meeting Agenda Link"]),
    recordingVideoUrl: asUrl(fields["Recording Link - Video"]),
    recordingAudioUrl: asUrl(fields["Recording Link - Audio Only"]),
    meetingSummary: asText(fields["Meeting Summary"], ""),
    status: asText(fields["Meeting Status"], ""),
    coverImage: coverImages[0] ?? null,
  };
}

function compareMeetings(a: ZoomMeeting, b: ZoomMeeting): number {
  const aTime = a.startTime ? Date.parse(a.startTime) : 0;
  const bTime = b.startTime ? Date.parse(b.startTime) : 0;
  if (aTime !== bTime) return bTime - aTime;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function compareWeekGroups(a: ZoomMeetingWeekGroup, b: ZoomMeetingWeekGroup): number {
  if (a.weekNumber !== b.weekNumber) return b.weekNumber - a.weekNumber;
  return b.weekName.localeCompare(a.weekName, undefined, { sensitivity: "base" });
}

export function groupMeetingsByWeek(meetings: ZoomMeeting[]): ZoomMeetingWeekGroup[] {
  const byWeek = new Map<string, ZoomMeetingWeekGroup>();

  for (const meeting of meetings) {
    const key = meeting.weekId || `unassigned-${meeting.weekName}`;
    const existing = byWeek.get(key);

    if (existing) {
      existing.meetings.push(meeting);
      continue;
    }

    byWeek.set(key, {
      weekId: meeting.weekId,
      weekName: meeting.weekName,
      weekNumber: meeting.weekNumber,
      meetings: [meeting],
    });
  }

  const groups = [...byWeek.values()];
  for (const group of groups) {
    group.meetings.sort(compareMeetings);
  }
  groups.sort(compareWeekGroups);

  return groups;
}

export function buildZoomMeetingCatalog(
  records: Array<{ id: string; fields: ZoomMeetingFields }>,
  weekRecords: Array<{ id: string; fields: WeekFields }>,
): ZoomMeetingCatalogData {
  const weekIndex = new Map<string, { name: string; startDate: string | null }>();

  for (const week of weekRecords) {
    weekIndex.set(week.id, {
      name: asText(week.fields["Week Name"], "Week"),
      startDate:
        typeof week.fields["Start Date"] === "string" ? week.fields["Start Date"] : null,
    });
  }

  const meetings = records.map((record) => mapZoomMeetingRecord(record, weekIndex));

  return {
    weekGroups: groupMeetingsByWeek(meetings),
    totalMeetings: meetings.length,
    updatedAt: new Date().toISOString(),
  };
}
