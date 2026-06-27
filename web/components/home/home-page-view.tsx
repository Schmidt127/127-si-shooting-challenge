import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { AmbientPage } from "@/components/catalog/ambient-page";
import {
  IconBasketball,
  IconBook,
  IconChevronRight,
  IconLevel,
  IconMegaphone,
  IconPlay,
  IconTrophy,
} from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { LevelBadge } from "@/components/leaderboard/level-badge";
import { SHOOTING_CHALLENGE } from "@/lib/app-config";
import { formatXp } from "@/lib/formatters";
import type { LeaderboardEntry } from "@/types/leaderboard";

type HubLink = {
  href: string;
  label: string;
  title: string;
  description: string;
  eyebrow: string;
  icon: typeof IconTrophy;
  featured?: boolean;
};

const HUB_LINKS: HubLink[] = [
  {
    href: "/leaderboard",
    label: "Primary",
    title: "Leaderboard",
    description: "Live season rankings — level, XP, and total shots decide who leads.",
    eyebrow: "Compete",
    icon: IconTrophy,
    featured: true,
  },
  {
    href: "/homework",
    label: "Curriculum",
    title: "Homework",
    description: "Weekly assignments from the challenge curriculum.",
    eyebrow: "Study",
    icon: IconBook,
  },
  {
    href: "/tutorials",
    label: "Film room",
    title: "Tutorials",
    description: "Technique videos and shooting breakdowns.",
    eyebrow: "Watch",
    icon: IconPlay,
  },
  {
    href: "/shoutouts",
    label: "Spotlight",
    title: "Shoutouts",
    description: "Celebrate athletes with features and highlights.",
    eyebrow: "Celebrate",
    icon: IconMegaphone,
  },
  {
    href: "/levels",
    label: "Progression",
    title: "Levels",
    description: "Climb from Beginner to G.O.A.T. — XP thresholds for every tier.",
    eyebrow: "Level up",
    icon: IconLevel,
  },
];

function TopThreePreview({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-12 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-card/60 to-brand-blue/10 p-6 backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300">
            Live leaders
          </p>
          <h2 className="mt-1 text-2xl font-black text-foreground">Top of the board</h2>
        </div>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent-soft transition hover:gap-2"
        >
          Full leaderboard <IconChevronRight size={16} />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4 ${
              entry.rank === 1 ? "ring-1 ring-amber-400/30" : ""
            }`}
          >
            <span className="font-mono text-lg font-black text-muted">#{entry.rank}</span>
            <AthleteAvatar
              name={entry.displayName}
              headshotUrl={entry.headshot?.url}
              size="md"
              rank={entry.rank === 1 ? 1 : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{entry.displayName}</p>
              <LevelBadge level={entry.level} size="sm" />
              <p className="mt-1 font-mono text-xs text-accent-soft">{formatXp(entry.xp)} XP</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HubCard({ link }: { link: HubLink }) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className={`group relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 ${
        link.featured
          ? "border-accent/30 bg-gradient-to-br from-accent/10 via-card/60 to-brand-blue/10 hover:border-accent/50 hover:shadow-[0_0_40px_-12px_rgba(255,139,0,0.35)]"
          : "border-white/10 bg-card/50 hover:border-white/20 hover:bg-card/80"
      }`}
    >
      <div
        className={`mb-4 inline-flex rounded-xl p-2.5 ${
          link.featured
            ? "bg-accent/15 text-accent-soft"
            : "bg-white/5 text-brand-blue"
        }`}
      >
        <Icon size={24} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        {link.eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-bold text-foreground">{link.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{link.description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft transition group-hover:gap-2">
        Open <IconChevronRight size={16} />
      </span>
    </Link>
  );
}

type HomePageViewProps = {
  topEntries: LeaderboardEntry[];
};

export function HomePageView({ topEntries }: HomePageViewProps) {
  return (
    <AmbientPage variant="default">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-3xl">
          <BrandLogo variant="horizontal" className="h-12 w-auto sm:h-14" priority />
          <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-accent-soft">
            <IconBasketball size={16} />
            {SHOOTING_CHALLENGE.name}
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Train with purpose.{" "}
            <span className="bg-gradient-to-r from-accent via-amber-300 to-brand-blue bg-clip-text text-transparent">
              Compete with clarity.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {SHOOTING_CHALLENGE.description}
          </p>
        </header>

        <TopThreePreview entries={topEntries} />

        <div className="mt-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-blue">
            Explore the challenge
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HUB_LINKS.map((link) => (
              <HubCard key={link.href} link={link} />
            ))}
          </div>
        </div>
      </div>
    </AmbientPage>
  );
}

export function HomePageFallback() {
  return <HomePageView topEntries={[]} />;
}
