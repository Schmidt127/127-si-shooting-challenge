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
  { href: "/leaderboard", label: "View leaderboard", variant: "cta" as const, size: "lg" as const },
  { href: "/homework", label: "Homework", variant: "contrast" as const, size: "default" as const },
  { href: "/levels", label: "Levels", variant: "contrast" as const, size: "default" as const },
  { href: "/tutorials", label: "Tutorials", variant: "contrast" as const, size: "default" as const },
  { href: "/zoom-meetings", label: "Zoom meetings", variant: "contrast" as const, size: "default" as const },
  { href: "/game-manual", label: "Game manual", variant: "contrast" as const, size: "default" as const },
];

const FEATURES = [
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
          key={entry.id}
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
                {entry.displayName}
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
            Build real shooting skill.{" "}
            <span className="text-brand-orange">Compete with purpose.</span>
          </>
        }
        description={
          <p>
            Earn XP, climb levels, keep streaks, hit shot milestones, and compete on a live
            public leaderboard — with homework, tutorials, and Zoom coaching.
          </p>
        }
        actions={HERO_CTAS.map((cta) => (
          <CtaLink key={cta.href} href={cta.href} variant={cta.variant} size={cta.size}>
            {cta.label}
          </CtaLink>
        ))}
        aside={<HeroProgressVisual />}
      />

      <SiteSection
        eyebrow="Why it works"
        title="Built for serious shooting progress"
        titleId="features-heading"
        description="Competitive systems that stay clear for athletes and parents."
        aria-labelledby="features-heading"
        className="bg-background"
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {FEATURES.map((feature) => (
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
      </SiteSection>

      <SiteSection
        tone="muted"
        eyebrow="How it works"
        title="Three steps. Clear progress."
        titleId="how-heading"
        description="Simple enough for families. Structured enough for a full season."
        aria-labelledby="how-heading"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <Card key={item.step} className="rounded-lg shadow-site-sm">
              <CardContent className="pt-(--card-spacing)">
                <p className="font-mono text-sm font-bold text-brand-orange">
                  {item.step}
                </p>
                <p className="font-display mt-2 text-xl text-foreground">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
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
        description="Open any public section — rankings, homework, levels, tutorials, and more."
        aria-labelledby="explore-heading"
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {PROGRAM_HUB_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex min-h-11 flex-col rounded-md bg-white/10 p-3 ring-1 ring-white/20 transition hover:bg-white/15 hover:ring-brand-orange/55 sm:p-4"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-orange/20 text-brand-orange sm:size-9">
                  <Icon size={18} aria-hidden />
                </span>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-contrast-muted sm:mt-3">
                  {link.eyebrow}
                </p>
                <p className="mt-1 text-sm font-bold leading-snug text-brand-white sm:text-base">
                  {link.title}
                </p>
                <p className="mt-1 hidden text-sm leading-snug text-contrast-muted sm:block sm:line-clamp-2">
                  {link.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-orange transition group-hover:gap-1.5 sm:mt-3 sm:text-sm">
                  Open <IconChevronRight size={14} aria-hidden />
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
