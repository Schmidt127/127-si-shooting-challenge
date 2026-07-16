import Image from "next/image";
import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import {
  catalogCardClass,
  catalogHeroClass,
  catalogInsetClass,
  catalogPanelClass,
  catalogStatePanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, DisplayHeading, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { StatusBadge } from "@/components/ui";
import { formatMeetingDateTime, formatRelativeUpdate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ZoomMeeting, ZoomMeetingCatalogData } from "@/types/zoom-meetings";

function MeetingStatusBadge({ status }: { status: string }) {
  if (!status) return null;

  const tone =
    status === "Scheduled" ? "blue" : status === "Completed" ? "success" : "neutral";

  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

function MeetingCard({ meeting }: { meeting: ZoomMeeting }) {
  return (
    <Link href={`/zoom-meetings/${meeting.id}`} className="group block">
      <article
        className={catalogCardClass(
          meeting.status === "Scheduled" ? { featured: "accent" } : undefined,
        )}
      >
        <div className="flex flex-col sm:flex-row">
          {meeting.coverImage ? (
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-brand-light-gray sm:aspect-auto sm:w-44 md:w-52">
              <Image
                src={meeting.coverImage.url}
                alt={meeting.name ? `${meeting.name} cover` : "Zoom meeting cover"}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, 208px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/90 sm:bg-gradient-to-t sm:to-card/90" />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center border-b border-border-subtle bg-brand-blue/15 py-10 sm:w-44 sm:border-b-0 sm:border-r md:w-52">
              <span className="font-mono text-4xl font-black text-brand-blue/25">Z</span>
            </div>
          )}

          <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <MeetingStatusBadge status={meeting.status} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                {meeting.weekName}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-bold leading-snug text-foreground transition group-hover:text-accent-soft sm:text-xl">
              {meeting.name}
            </h3>

            <p className="mt-2 text-sm text-muted">{formatMeetingDateTime(meeting.startTime)}</p>

            {meeting.briefDescription ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted">{meeting.briefDescription}</p>
            ) : null}

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
              {meeting.zoomLink ? "View meeting details" : "View details"}
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function WeekSection({
  weekName,
  meetings,
  isLatestWeek,
}: {
  weekName: string;
  meetings: ZoomMeeting[];
  isLatestWeek: boolean;
}) {
  return (
    <section className="relative">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
            {isLatestWeek ? "Current week" : "Week archive"}
          </p>
          <h2 className="font-display mt-1 text-2xl text-foreground sm:text-3xl">{weekName}</h2>
        </div>
        <span className="rounded-md border border-border bg-brand-light-gray px-3 py-1 font-mono text-xs text-muted">
          {meetings.length} meeting{meetings.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-4">
        {meetings.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </section>
  );
}

export function ZoomMeetingsCatalogView({ data }: { data: ZoomMeetingCatalogData }) {
  return (
    <AmbientPage variant="zoom">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <DisplayHeading
          eyebrow="Live sessions"
          title="Zoom"
          titleAccent="meetings"
          subtitle="Challenge check-ins, film sessions, and coach Q&A — schedules and recordings from the season."
        >
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
            {data.totalMeetings} meetings · Updated {formatRelativeUpdate(data.updatedAt)}
          </p>
        </DisplayHeading>

        <div className="mt-14 space-y-14">
          {data.weekGroups.map((group, groupIndex) => (
            <WeekSection
              key={group.weekId || group.weekName}
              weekName={group.weekName}
              meetings={group.meetings}
              isLatestWeek={groupIndex === 0}
            />
          ))}
        </div>
      </div>
    </AmbientPage>
  );
}

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-primary">
      {label}
      <span aria-hidden>↗</span>
    </a>
  );
}

export function ZoomMeetingDetailView({ meeting }: { meeting: ZoomMeeting }) {
  return (
    <AmbientPage variant="zoom">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <Link
          href="/zoom-meetings"
          className="inline-flex min-h-[2.75rem] items-center gap-2 text-sm font-medium text-muted transition hover:text-accent-soft"
        >
          <span aria-hidden>←</span> All zoom meetings
        </Link>

        <header className={cn(catalogHeroClass(), "relative mt-8")}>
          {meeting.coverImage ? (
            <div className="flex w-full items-center justify-center bg-brand-light-gray px-4 py-6 sm:px-8 sm:py-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meeting.coverImage.url}
                alt={meeting.name ? `${meeting.name} cover` : "Zoom meeting cover"}
                className="max-h-64 w-auto max-w-full object-contain sm:max-h-80"
              />
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <MeetingStatusBadge status={meeting.status} />
              <span className="rounded-md border border-border bg-brand-light-gray px-3 py-1 text-xs font-medium text-muted">
                {meeting.weekName}
              </span>
            </div>

            <DetailTitle
              className="mt-5"
              overline="Challenge meeting"
              title={meeting.name}
              accent={formatMeetingDateTime(meeting.startTime)}
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {meeting.hostName ? (
                <div className={cn(catalogInsetClass(), "rounded-xl px-4 py-3")}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    Host
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{meeting.hostName}</p>
                </div>
              ) : null}
              <div className={cn(catalogInsetClass(), "rounded-xl px-4 py-3")}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Starts
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatMeetingDateTime(meeting.startTime)}
                </p>
              </div>
              <div className={cn(catalogInsetClass(), "rounded-xl px-4 py-3")}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Ends
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatMeetingDateTime(meeting.endTime)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {meeting.zoomLink ? (
                <ResourceLink href={meeting.zoomLink} label="Join Zoom meeting" />
              ) : null}
              {meeting.agendaLink ? (
                <ResourceLink href={meeting.agendaLink} label="Open agenda" />
              ) : null}
              {meeting.recordingVideoUrl ? (
                <ResourceLink href={meeting.recordingVideoUrl} label="Watch recording" />
              ) : null}
              {meeting.recordingAudioUrl ? (
                <ResourceLink href={meeting.recordingAudioUrl} label="Audio recording" />
              ) : null}
            </div>
          </div>
        </header>

        {meeting.recordingVideoUrl || meeting.recordingAudioUrl ? (
          <section className={cn(catalogPanelClass({ tint: "accent" }), "mt-8")}>
            <SectionHeading
              label="Recording credit"
              title="Makeup XP from the recording quiz"
              description="Missed the live call? Watching alone does not award XP — complete the Zoom Recording Quiz after the recording is available."
            />
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
              <li>
                Recording credit uses the{" "}
                <span className="font-semibold text-foreground">Zoom Recording</span> XP source and
                is a configured percent of live attendance XP.
              </li>
              <li>
                Live attendance and recording credit cannot both apply for the same meeting.
              </li>
              <li>
                Coach approval may be required before recording XP and Zoom level-gate credit post.
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              {meeting.recordingVideoUrl ? (
                <ResourceLink href={meeting.recordingVideoUrl} label="Watch recording" />
              ) : null}
              {meeting.recordingAudioUrl ? (
                <ResourceLink href={meeting.recordingAudioUrl} label="Audio recording" />
              ) : null}
              <Link href="/homework" className="btn-secondary">
                Open homework catalog
              </Link>
            </div>
          </section>
        ) : meeting.status === "Completed" ? (
          <section className={cn(catalogPanelClass({ tint: "neutral" }), "mt-8")} role="status">
            <SectionHeading
              label="Recording credit"
              title="Recording not published yet"
              description="When video or audio recording links are added, makeup credit instructions and watch links appear here."
            />
          </section>
        ) : null}

        {meeting.briefDescription ? (
          <section className={cn(catalogPanelClass(), "mt-8")}>
            <SectionHeading label="Overview" title="What this session covers" />
            <RichContent text={meeting.briefDescription} className="text-foreground/90" />
          </section>
        ) : null}

        {meeting.fullDescription ? (
          <section className={cn(catalogPanelClass(), "mt-8")}>
            <SectionHeading label="Details" title="Full meeting brief" />
            <RichContent text={meeting.fullDescription} className="text-foreground/90" />
          </section>
        ) : null}

        {meeting.meetingAgenda ? (
          <section className={cn(catalogPanelClass({ tint: "accent" }), "mt-8")}>
            <SectionHeading label="Agenda" title="Session plan" />
            <RichContent text={meeting.meetingAgenda} className="text-foreground/90" />
          </section>
        ) : null}

        {meeting.meetingSummary ? (
          <section className={cn(catalogPanelClass({ tint: "blue" }), "mt-8")}>
            <SectionHeading label="Recap" title="Meeting summary" />
            <RichContent text={meeting.meetingSummary} className="text-foreground/90" />
          </section>
        ) : null}
      </div>
    </AmbientPage>
  );
}

export function ZoomMeetingsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass()}>
        <h1 className="font-display text-2xl text-foreground">No zoom meetings yet</h1>
        <p className="mt-3 text-muted">
          Scheduled challenge meetings will appear here once added in Airtable.
        </p>
        <Link href="/" className="btn-secondary mt-6">
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}

export function ZoomMeetingsErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass(true)}>
        <h1 className="font-display text-2xl text-foreground">Could not load zoom meetings</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

export function ZoomMeetingNotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass()}>
        <h1 className="font-display text-2xl text-foreground">Meeting not found</h1>
        <p className="mt-3 text-muted">This meeting may be cancelled or the link is incorrect.</p>
        <Link href="/zoom-meetings" className="btn-secondary mt-6">
          ← Back to zoom meetings
        </Link>
      </div>
    </div>
  );
}
