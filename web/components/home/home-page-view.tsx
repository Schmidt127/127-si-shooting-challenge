import Link from "next/link";
import {
  BookOpen,
  Flame,
  Layers,
  Medal,
  Sparkles,
  Target,
  Trophy,
  Video,
} from "lucide-react";

import { HeroProgressVisual } from "@/components/home/hero-progress-visual";
import { RegistrationGateway } from "@/components/home/registration-gateway";
import { AthleteProfileLink } from "@/components/athlete/athlete-profile-link";
import { IconChevronRight, IconTrophy } from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { LevelBadge } from "@/components/leaderboard/level-badge";
import {
  CtaLink,
  FeatureCard,
  PageHero,
  SiteSection,
} from "@/components/site";
import { Card, CardContent } from "@/components/ui/card";
import { SHOOTING_CHALLENGE } from "@/lib/app-config";
import { formatXp } from "@/lib/formatters";
import { PROGRAM_HUB_LINKS } from "@/lib/navigation/program-hub-links";
import type { LeaderboardEntry } from "@/types/leaderboard";

const HERO_CTAS = [
  { href: "/homework", label: "Start this week’s work", variant: "cta" as const, size: "lg" as const },
  { href: "/leaderboard", label: "View standings", variant: "contrast" as const, size: "default" as const },
  { href: "/tutorials", label: "Film room", variant: "contrast" as const, size: "default" as const },
  { href: "/levels", label: "Level path", variant: "contrast" as const, size: "default" as const },
];

const TRAINING_PILLARS = [
  {
    title: "XP for real work",
    description: "Earn points for homework, shot volume, and consistency.",
    eyebrow: "Progress",
    icon: Sparkles,
  },
  {
    title: "Clear level path",
    description: "Climb from Beginner to G.O.A.T. with defined XP thresholds.",
    eyebrow: "Levels",
    icon: Layers,
  },
  {
    title: "Training streaks",
    description: "Stay accountable with weekly streaks that reward showing up.",
    eyebrow: "Consistency",
    icon: Flame,
  },
  {
    title: "Perfect Week",
    description: "Hit the weekly standard and earn recognition families can celebrate.",
    eyebrow: "Weekly win",
    icon: Medal,
  },
  {
    title: "Shot milestones",
    description: "Track makes and attempts as you pass major volume marks.",
    eyebrow: "Milestones",
    icon: Target,
  },
  {
    title: "Weekly homework",
    description: "Focused assignments with clear expectations for athletes and parents.",
    eyebrow: "Curriculum",
    icon: BookOpen,
  },
  {
    title: "Video tutorials",
    description: "Study technique clips between sessions to tighten form.",
    eyebrow: "Film room",
    icon: Video,
  },
  {
    title: "Zoom coaching",
    description: "Join live check-ins and review recordings with coaches.",
    eyebrow: "Coaching",
    icon: Trophy,
  },
];

const TRAINING_LEAD = {
  title: "The work shows up on the board",
  description:
    "Every week connects training, submission, feedback, and progress so athletes can see what the next rep is building toward.",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Train and submit",
    description: "Complete weekly homework and log your shooting work.",
  },
  {
    step: "02",
    title: "Earn XP and levels",
    description: "Unlock levels, streaks, Perfect Weeks, and milestones.",
  },
  {
    step: "03",
    title: "Compete and improve",
    description: "Check the leaderboard, study tutorials, and join Zoom sessions.",
  },
];

function TopThreePreview({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-brand-blue/15 bg-gradient-to-br from-brand-blue/[0.06] via-card to-brand-orange/[0.08] px-5 py-6 shadow-site-sm sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-orange/15 text-brand-orange ring-1 ring-brand-orange/30">
              <IconTrophy size={26} aria-hidden />
            </span>
            <div>
              <p className="font-display text-xl text-foreground">Rankings are warming up</p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                The live season board will show top athletes here as soon as rankings are
                available. Browse the full leaderboard anytime.
              </p>
            </div>
          </div>
          <CtaLink
            href="/leaderboard"
            variant="cta"
            size="default"
            className="w-full justify-center sm:w-auto sm:shrink-0"
          >
            View full leaderboard
            <IconChevronRight size={16} />
          </CtaLink>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {entries.map((entry) => (
        <Card
          key={entry.rank}
          size="sm"
          className={`rounded-lg shadow-site-sm ${
            entry.rank === 1 ? "ring-brand-orange/45" : "ring-border"
          }`}
        >
          <CardContent className="flex items-center gap-3 pt-(--card-spacing)">
            <span
              className="font-mono text-lg font-bold text-brand-blue"
              aria-label={`Rank ${entry.rank}`}
            >
              #{entry.rank}
            </span>
            <AthleteAvatar
              name={entry.displayName}
              headshotUrl={entry.headshot?.url}
              size="md"
              rank={entry.rank === 1 ? 1 : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                <AthleteProfileLink
                  name={entry.displayName}
                  slug={entry.publicProfileSlug}
                />
              </p>
              <LevelBadge level={entry.level} size="sm" />
              <p className="mt-1 font-mono text-xs text-accent-soft">
                {formatXp(entry.xp)} XP
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type HomePageViewProps = {
  topEntries: LeaderboardEntry[];
};

export function HomePageView({ topEntries }: HomePageViewProps) {
  return (
    <div>
      <PageHero
        eyebrow={SHOOTING_CHALLENGE.name}
        title={
          <>
            Train with intent.{" "}
            <span className="text-brand-orange">Build a shooter’s edge.</span>
          </>
        }
        description={
          <p>
            A serious basketball-development program built around daily shooting work, clear
            coaching, and progress athletes can earn in public.
          </p>
        }
        actions={HERO_CTAS.map((cta) => (
          <CtaLink key={cta.href} href={cta.href} variant={cta.variant} size={cta.size}>
            {cta.label}
          </CtaLink>
        ))}
        aside={<HeroProgressVisual />}
      />

      <RegistrationGateway />

      <SiteSection
        eyebrow="The training system"
        title="Every rep has a reason"
        titleId="features-heading"
        description="A complete development loop that keeps athletes motivated and families informed."
        aria-labelledby="features-heading"
        className="bg-background"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
          <div className="relative overflow-hidden rounded-lg bg-court-navy p-6 text-brand-white shadow-site-lg ring-1 ring-white/15 sm:p-8">
            <div className="pointer-events-none absolute inset-0 court-lines opacity-25" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 shot-arc opacity-80" aria-hidden />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-orange">
                Built for the season
              </p>
              <h3 className="font-display mt-4 max-w-md text-3xl leading-[1.05] text-brand-white sm:text-4xl">
                {TRAINING_LEAD.title}
              </h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-contrast-muted sm:text-base">
                {TRAINING_LEAD.description}
              </p>
              <CtaLink href="/homework" variant="cta" className="mt-7">
                Open weekly homework
                <IconChevronRight size={16} />
              </CtaLink>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {TRAINING_PILLARS.map((feature) => (
              <FeatureCard
                key={feature.title}
                tone="benefit"
                title={feature.title}
                description={feature.description}
                eyebrow={feature.eyebrow}
                icon={feature.icon}
                className="[&_[data-slot=card-description]]:text-[0.8125rem] sm:[&_[data-slot=card-description]]:text-sm"
              />
            ))}
          </div>
        </div>
      </SiteSection>

      <SiteSection
        tone="muted"
        eyebrow="How it works"
        title="Three steps. Clear progress."
        titleId="how-heading"
        description="Simple enough for families. Structured enough for a full season."
        aria-labelledby="how-heading"
      >
        <ol className="relative grid gap-3 md:grid-cols-3 md:gap-5">
          <div
            className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-7 hidden h-px bg-brand-blue/25 md:block"
            aria-hidden
          />
          {HOW_IT_WORKS.map((item) => (
            <li key={item.step} className="relative">
              <Card className="h-full rounded-lg border-t-4 border-t-brand-orange shadow-site-sm">
              <CardContent className="pt-(--card-spacing)">
                <p className="font-mono text-sm font-bold text-brand-orange" aria-label={`Step ${item.step}`}>
                  {item.step}
                </p>
                <h3 className="font-display mt-2 text-xl text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </SiteSection>

      <SiteSection
        eyebrow="Live leaders"
        title="Top of the board"
        titleId="top-board-heading"
        description="Season rankings from the same Airtable-powered leaderboard used all season."
        aria-labelledby="top-board-heading"
      >
        <TopThreePreview entries={topEntries} />
      </SiteSection>

      <SiteSection
        tone="blue"
        eyebrow="Explore the challenge"
        title="Jump into any part of the program"
        titleId="explore-heading"
        description="A quick route to every public part of the challenge."
        aria-labelledby="explore-heading"
      >
        <div className="grid overflow-hidden rounded-lg border border-white/25 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAM_HUB_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex min-h-11 flex-row items-start gap-3 border-b border-r border-white/15 bg-white/[0.07] p-4 transition hover:bg-white/[0.13] sm:p-5"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-orange/20 text-brand-orange sm:size-9">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-contrast-muted">
                    {link.eyebrow}
                  </span>
                  <span className="mt-1 block text-sm font-bold leading-snug text-brand-white sm:text-base">
                    {link.title}
                  </span>
                  <span className="mt-1 hidden text-sm leading-snug text-contrast-muted sm:line-clamp-2">
                    {link.description}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-orange transition group-hover:gap-1.5 sm:text-sm">
                    Open <IconChevronRight size={14} aria-hidden />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </SiteSection>
    </div>
  );
}

export function HomePageFallback() {
  return <HomePageView topEntries={[]} />;
}

/** Used only when the server-side standings contract fails closed. */
export function HomePageStandingsError() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16" role="alert">
      <h1 className="text-2xl font-bold text-foreground">Live standings are temporarily unavailable</h1>
      <p className="mt-3 text-muted">
        The standings data is being verified. Please check the leaderboard again shortly.
      </p>
    </div>
  );
}
