import Image from "next/image";
import Link from "next/link";

import {
  catalogCardClass,
  catalogHeroClass,
  catalogInsetClass,
  catalogPanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { IconVideoCall } from "@/components/icons/shoot-icons";
import { CtaLink, DetailPageShell, ProgramPage, SectionMarker } from "@/components/site";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { formatMeetingDateTime, formatRelativeUpdate } from "@/lib/formatters";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
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
              <IconVideoCall size={40} className="text-brand-blue/35" />
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
      <SectionMarker
        label={isLatestWeek ? "Current week" : "Week archive"}
        title={weekName}
        countLabel={`${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`}
      />

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
    <ProgramPage
      eyebrow="Live sessions"
      title={
        <>
          Zoom <span className="text-accent-soft">meetings</span>
        </>
      }
      description="Challenge check-ins, film sessions, and coach Q&A — schedules and recordings from the season."
      heroVariant="light"
      ambientVariant="zoom"
      meta={
        <>
          {data.totalMeetings} meetings · Updated {formatRelativeUpdate(data.updatedAt)}
        </>
      }
    >
      <div className="mx-auto max-w-4xl space-y-14">
        {data.weekGroups.map((group, groupIndex) => (
          <WeekSection
            key={group.weekId || group.weekName}
            weekName={group.weekName}
            meetings={group.meetings}
            isLatestWeek={groupIndex === 0}
          />
        ))}
      </div>
    </ProgramPage>
  );
}

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "default" })}
    >
      {label}
      <span aria-hidden>↗</span>
    </a>
  );
}

export function ZoomMeetingDetailView({ meeting }: { meeting: ZoomMeeting }) {
  return (
    <DetailPageShell
      backHref="/zoom-meetings"
      backLabel="All zoom meetings"
      ambientVariant="zoom"
    >
      <header className={cn(catalogHeroClass(), "relative")}>
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
    </DetailPageShell>
  );
}

export function ZoomMeetingsEmptyState() {
  return (
    <ProgramPage
      eyebrow="Live sessions"
      title={
        <>
          Zoom <span className="text-accent-soft">meetings</span>
        </>
      }
      description="Challenge check-ins, film sessions, and coach Q&A — schedules and recordings from the season."
      heroVariant="light"
      ambientVariant="zoom"
    >
      <EmptyState
        title={EMPTY_STATE_COPY.zoom.title}
        description={EMPTY_STATE_COPY.zoom.description}
        icon={<IconVideoCall size={40} />}
        action={
          <CtaLink href="/" variant="secondary">
            ← Shooting Challenge
          </CtaLink>
        }
      />
    </ProgramPage>
  );
}

export function ZoomMeetingsErrorState({ message }: { message: string }) {
  return (
    <ProgramPage
      eyebrow="Live sessions"
      title={
        <>
          Zoom <span className="text-accent-soft">meetings</span>
        </>
      }
      description="Challenge check-ins, film sessions, and coach Q&A — schedules and recordings from the season."
      heroVariant="light"
      ambientVariant="zoom"
    >
      <ErrorState
        title="Could not load zoom meetings"
        message={message}
        action={
          <CtaLink href="/" variant="secondary">
            ← Shooting Challenge
          </CtaLink>
        }
      />
    </ProgramPage>
  );
}

export function ZoomMeetingNotFoundState() {
  return (
    <DetailPageShell
      backHref="/zoom-meetings"
      backLabel="All zoom meetings"
      ambientVariant="zoom"
    >
      <EmptyState
        title="Meeting not found"
        description="This meeting may be cancelled or the link is incorrect."
        action={
          <CtaLink href="/zoom-meetings" variant="secondary">
            ← Back to zoom meetings
          </CtaLink>
        }
      />
    </DetailPageShell>
  );
}
