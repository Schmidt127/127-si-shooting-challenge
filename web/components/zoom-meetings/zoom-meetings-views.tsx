import Link from "next/link";
import type { ReactNode } from "react";

import {
  catalogCardClass,
  catalogHeroClass,
  catalogInsetClass,
  catalogPanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { IconVideoCall } from "@/components/icons/shoot-icons";
import { SafeExternalImage } from "@/components/media/safe-external-image";
import {
  AccentRail,
  CtaLink,
  DetailPageShell,
  ProgramPage,
  SectionMarker,
} from "@/components/site";
import { ProgramFeatureBanner } from "@/components/site/program-feature-image";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { formatMeetingDateTime, formatRelativeUpdate } from "@/lib/formatters";
import { plainTextFromRichText } from "@/lib/formatters/rich-text";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import { FEATURE_BANNER_ARIA } from "@/lib/seo/program-facts";
import { cn } from "@/lib/utils";
import type { ZoomMeeting, ZoomMeetingCatalogData } from "@/types/zoom-meetings";

import {
  ZOOM_ORIENTATION_STEPS,
  ZOOM_TERMINOLOGY,
} from "./zoom-meetings-orientation";

type MeetingAccess = {
  kind: "live" | "recording" | "recording-pending" | "scheduled" | "neutral";
  label: string;
  detailLabel: string;
};

function hasRecording(meeting: ZoomMeeting): boolean {
  return Boolean(meeting.recordingVideoUrl || meeting.recordingAudioUrl);
}

function getMeetingAccess(meeting: ZoomMeeting): MeetingAccess {
  if (meeting.status === "Scheduled" && meeting.zoomLink) {
    return {
      kind: "live",
      label: "Live session",
      detailLabel: "Join link active for scheduled call",
    };
  }
  if (hasRecording(meeting)) {
    return {
      kind: "recording",
      label: "Recording available",
      detailLabel: "Video or audio replay published",
    };
  }
  if (meeting.status === "Completed") {
    return {
      kind: "recording-pending",
      label: "Recording pending",
      detailLabel: "Replay links appear when published",
    };
  }
  if (meeting.status === "Scheduled") {
    return {
      kind: "scheduled",
      label: "Scheduled",
      detailLabel: "Join link may appear closer to start time",
    };
  }
  return {
    kind: "neutral",
    label: meeting.status || "Session",
    detailLabel: "Open for schedule and recap details",
  };
}

function accessBadgeTone(kind: MeetingAccess["kind"]): "blue" | "success" | "neutral" {
  if (kind === "live") return "blue";
  if (kind === "recording") return "success";
  return "neutral";
}

function meetingCoverMark(meeting: ZoomMeeting): string {
  const weekMatch = meeting.weekName.match(/Week\s+(\d+)/i);
  if (weekMatch) return `W${weekMatch[1]}`;
  const initials = meeting.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "ZM";
}

function MeetingCoverFallback({
  meeting,
  size = "card",
}: {
  meeting: ZoomMeeting;
  size?: "card" | "detail";
}) {
  const mark = meetingCoverMark(meeting);
  const isDetail = size === "detail";

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center bg-brand-blue/15 text-center",
        isDetail
          ? "min-h-[12rem] px-6 py-10 sm:min-h-[14rem]"
          : "min-h-[8.5rem] border-b border-border-subtle py-10 sm:border-b-0 sm:border-r sm:py-0",
      )}
      data-testid="zoom-meeting-cover-fallback"
    >
      <IconVideoCall
        size={isDetail ? 48 : 40}
        className="text-brand-blue/35"
        aria-hidden
      />
      <span
        className={cn(
          "mt-3 font-mono font-black text-brand-blue/30",
          isDetail ? "text-5xl sm:text-6xl" : "text-4xl",
        )}
      >
        {mark}
      </span>
      <p className="mt-2 max-w-[12rem] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {hasRecording(meeting) ? "Recording session" : "Live session"}
      </p>
    </div>
  );
}

function MeetingStatusBadge({ status }: { status: string }) {
  if (!status) return null;

  const tone =
    status === "Scheduled" ? "blue" : status === "Completed" ? "success" : "neutral";

  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

function MeetingAccessBadge({ meeting }: { meeting: ZoomMeeting }) {
  const access = getMeetingAccess(meeting);
  return (
    <span data-testid="zoom-meeting-access-badge">
      <StatusBadge tone={accessBadgeTone(access.kind)}>{access.label}</StatusBadge>
    </span>
  );
}

function MeetingResourceLinks({ meeting }: { meeting: ZoomMeeting }) {
  const links: Array<{ href: string; label: string }> = [];

  if (meeting.zoomLink.trim()) {
    links.push({ href: meeting.zoomLink.trim(), label: "Join Zoom meeting" });
  }
  if (meeting.recordingVideoUrl.trim()) {
    links.push({ href: meeting.recordingVideoUrl.trim(), label: "Watch recording" });
  }
  if (meeting.recordingAudioUrl.trim()) {
    links.push({ href: meeting.recordingAudioUrl.trim(), label: "Audio recording" });
  }
  if (meeting.agendaLink.trim()) {
    links.push({ href: meeting.agendaLink.trim(), label: "Open agenda" });
  }

  if (links.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2" data-testid="zoom-meeting-catalog-resources">
      {links.map((link) => (
        <a
          key={`${link.href}-${link.label}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-soft transition hover:border-brand-orange/35 hover:bg-brand-light-gray/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
        >
          {link.label}
          <span aria-hidden>↗</span>
        </a>
      ))}
    </div>
  );
}

function MeetingCard({
  meeting,
  index,
  isLatestWeek,
}: {
  meeting: ZoomMeeting;
  index: number;
  isLatestWeek: boolean;
}) {
  const access = getMeetingAccess(meeting);
  const featured =
    access.kind === "live" || (isLatestWeek && index === 0 && access.kind === "recording");

  return (
    <article
      data-testid="zoom-meeting-catalog-card"
      className={catalogCardClass(featured ? { featured: "accent" } : undefined)}
    >
      <div className="flex min-w-0 flex-col sm:flex-row">
        {meeting.coverImage ? (
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-brand-light-gray sm:aspect-auto sm:h-auto sm:w-44 md:w-52">
            <SafeExternalImage
              src={meeting.coverImage.url}
              alt={meeting.name ? `${meeting.name} cover` : "Zoom meeting cover"}
              className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
              fallback={<MeetingCoverFallback meeting={meeting} />}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-card/90 sm:bg-gradient-to-t sm:to-card/90" />
          </div>
        ) : (
          <div className="w-full shrink-0 sm:w-44 md:w-52">
            <MeetingCoverFallback meeting={meeting} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <MeetingAccessBadge meeting={meeting} />
            <MeetingStatusBadge status={meeting.status} />
            <span className="rounded-md bg-brand-orange/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
              {meeting.weekName}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold leading-snug text-foreground sm:text-xl">
            <Link
              href={`/zoom-meetings/${meeting.id}`}
              className="transition hover:text-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            >
              {meeting.name}
            </Link>
          </h3>

          <p className="mt-2 text-sm text-foreground" data-testid="zoom-meeting-datetime">
            {formatMeetingDateTime(meeting.startTime)}
          </p>

          {meeting.briefDescription ? (
            <p
              className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground"
              data-testid="zoom-meeting-brief"
            >
              {plainTextFromRichText(meeting.briefDescription)}
            </p>
          ) : null}

          <dl className="mt-4 grid min-w-0 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Access
              </dt>
              <dd className="mt-0.5 break-words text-sm text-foreground">{access.detailLabel}</dd>
            </div>
            {meeting.hostName ? (
              <div className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Host
                </dt>
                <dd className="mt-0.5 break-words text-sm text-foreground">{meeting.hostName}</dd>
              </div>
            ) : null}
          </dl>

          <MeetingResourceLinks meeting={meeting} />

          <Link
            href={`/zoom-meetings/${meeting.id}`}
            className="mt-4 inline-flex min-h-[2.25rem] items-center gap-1 text-sm font-semibold text-accent-soft transition hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
          >
            {access.kind === "live"
              ? "Meeting details & join info"
              : access.kind === "recording"
                ? "Recording details & makeup XP"
                : "View meeting details"}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
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

      <AccentRail tone="orange">
        {meetings.map((meeting, index) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            index={index}
            isLatestWeek={isLatestWeek}
          />
        ))}
      </AccentRail>
    </section>
  );
}

function ZoomTerminology() {
  return (
    <section aria-labelledby="zoom-terminology-heading" data-testid="zoom-terminology">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
          Key terms
        </p>
        <h2 id="zoom-terminology-heading" className="font-display mt-1 text-2xl text-foreground">
          Live calls vs recordings
        </h2>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {ZOOM_TERMINOLOGY.map((item) => (
          <div
            key={item.term}
            className="rounded-lg border border-border bg-card p-4 shadow-site-sm"
          >
            <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-foreground">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ZoomOrientation() {
  return (
    <section aria-labelledby="zoom-orientation-heading" data-testid="zoom-orientation">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
          How to use this catalog
        </p>
        <h2 id="zoom-orientation-heading" className="font-display mt-1 text-2xl text-foreground">
          Join live or catch up later
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground">
          Each card shows whether a session is live, scheduled, or has a published recording.
          External links open Zoom or replay media in a new tab.
        </p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ZOOM_ORIENTATION_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-lg border border-border bg-card p-4 shadow-site-sm"
          >
            <p className="font-mono text-xs font-semibold text-brand-blue">0{index + 1}</p>
            <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function zoomCatalogShell(children: ReactNode) {
  return (
    <ProgramPage
      eyebrow="Live sessions"
      title={
        <>
          Zoom <span className="text-accent-soft">meetings</span>
        </>
      }
      description="Online challenge check-ins, film sessions, and coach Q&A — grouped by week with live join links and published recordings."
      heroVariant="light"
      ambientVariant="zoom"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Zoom Meetings"
          caption="Find this week's live call, open join links, and watch recordings when they are published."
          mark="ZM"
          ariaLabel={FEATURE_BANNER_ARIA.zoom}
        />
        {children}
      </div>
    </ProgramPage>
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
      description="Online challenge check-ins, film sessions, and coach Q&A — grouped by week with live join links and published recordings."
      heroVariant="light"
      ambientVariant="zoom"
      meta={
        <>
          {data.totalMeetings} meetings · Updated {formatRelativeUpdate(data.updatedAt)}
        </>
      }
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Zoom Meetings"
          caption="Find this week's live call, open join links, and watch recordings when they are published."
          mark="ZM"
          ariaLabel={FEATURE_BANNER_ARIA.zoom}
        />
        <ZoomTerminology />
        <ZoomOrientation />
        <div className="mx-auto max-w-4xl min-w-0 space-y-14" data-testid="zoom-meeting-catalog-list">
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
  const access = getMeetingAccess(meeting);

  return (
    <DetailPageShell
      backHref="/zoom-meetings"
      backLabel="All zoom meetings"
      ambientVariant="zoom"
    >
      <header className={cn(catalogHeroClass(), "relative")}>
        {meeting.coverImage ? (
          <div className="flex w-full items-center justify-center bg-brand-light-gray px-4 py-6 sm:px-8 sm:py-8">
            <SafeExternalImage
              src={meeting.coverImage.url}
              alt={meeting.name ? `${meeting.name} cover` : "Zoom meeting cover"}
              className="max-h-64 w-auto max-w-full object-contain sm:max-h-80"
              fallback={<MeetingCoverFallback meeting={meeting} size="detail" />}
            />
          </div>
        ) : (
          <MeetingCoverFallback meeting={meeting} size="detail" />
        )}

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <MeetingAccessBadge meeting={meeting} />
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

          <p className="mt-3 text-sm text-muted-foreground">{access.detailLabel}</p>

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
            title="Earn makeup XP with the recording quiz"
            description="Missed the live call? Watching alone does not award XP — complete the Zoom Recording Quiz after the recording is available."
          />
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              Completing the recording quiz can earn makeup XP. The amount is a portion of the XP
              awarded for live attendance.
            </li>
            <li>
              You cannot earn both live attendance XP and recording makeup XP for the same meeting.
            </li>
            <li>
              A coach may need to approve the quiz before makeup XP and related level progress are
              posted.
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            {meeting.recordingVideoUrl ? (
              <ResourceLink href={meeting.recordingVideoUrl} label="Watch recording" />
            ) : null}
            {meeting.recordingAudioUrl ? (
              <ResourceLink href={meeting.recordingAudioUrl} label="Audio recording" />
            ) : null}
            <Link href="/homework" className={cn(buttonVariants({ variant: "secondary" }))}>
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
          <RichContent text={meeting.briefDescription} className="text-foreground" />
        </section>
      ) : null}

      {meeting.fullDescription ? (
        <section className={cn(catalogPanelClass(), "mt-8")}>
          <SectionHeading label="Details" title="Full meeting brief" />
          <RichContent text={meeting.fullDescription} className="text-foreground" />
        </section>
      ) : null}

      {meeting.meetingAgenda ? (
        <section className={cn(catalogPanelClass({ tint: "accent" }), "mt-8")}>
          <SectionHeading label="Agenda" title="Session plan" />
          <RichContent text={meeting.meetingAgenda} className="text-foreground" />
        </section>
      ) : null}

      {meeting.meetingSummary ? (
        <section className={cn(catalogPanelClass({ tint: "blue" }), "mt-8")}>
          <SectionHeading label="Recap" title="Meeting summary" />
          <RichContent text={meeting.meetingSummary} className="text-foreground" />
        </section>
      ) : null}
    </DetailPageShell>
  );
}

export function ZoomMeetingsEmptyState() {
  return zoomCatalogShell(
    <div data-testid="zoom-meeting-catalog-empty">
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
    </div>,
  );
}

export function ZoomMeetingsErrorState({ message }: { message: string }) {
  return zoomCatalogShell(
    <div data-testid="zoom-meeting-catalog-error">
      <ErrorState
        title="Could not load zoom meetings"
        message={message}
        action={
          <CtaLink href="/" variant="secondary">
            ← Shooting Challenge
          </CtaLink>
        }
      />
    </div>,
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
        titleAs="h1"
        action={
          <CtaLink href="/zoom-meetings" variant="secondary">
            ← Back to zoom meetings
          </CtaLink>
        }
      />
    </DetailPageShell>
  );
}
