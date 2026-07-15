import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { AmbientPage } from "@/components/catalog/ambient-page";
import { IconBasketball, IconChevronRight } from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { LevelBadge } from "@/components/leaderboard/level-badge";
import { SHOOTING_CHALLENGE } from "@/lib/app-config";
import { formatXp } from "@/lib/formatters";
import { PROGRAM_HUB_LINKS, type ProgramHubLink } from "@/lib/navigation/program-hub-links";
import type { LeaderboardEntry } from "@/types/leaderboard";

function TopThreePreview({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section
      className="mt-12 rounded-xl border border-court-gold/25 bg-gradient-to-br from-court-gold/[0.08] via-card/80 to-brand-blue/[0.1] p-6 sm:p-8"
      aria-labelledby="top-board-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-court-gold">
            Live leaders
          </p>
          <h2 id="top-board-heading" className="font-display mt-1 text-2xl text-foreground">
            Top of the board
          </h2>
        </div>
        <Link
          href="/leaderboard"
          className="inline-flex min-h-[2.75rem] items-center gap-1 text-sm font-semibold text-accent-soft transition hover:gap-2"
        >
          Full leaderboard <IconChevronRight size={16} />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 p-4 ${
              entry.rank === 1 ? "ring-1 ring-court-gold/40" : ""
            }`}
          >
            <span className="font-mono text-lg font-bold text-muted" aria-label={`Rank ${entry.rank}`}>
              #{entry.rank}
            </span>
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

function HubCard({ link }: { link: ProgramHubLink }) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className={`group relative overflow-hidden rounded-xl border p-5 transition duration-200 hover:-translate-y-0.5 ${
        link.featured
          ? "border-accent/35 bg-gradient-to-br from-accent/[0.1] via-card/80 to-brand-blue/[0.08] hover:border-accent/50"
          : "border-white/10 bg-card/60 hover:border-white/20 hover:bg-card/90"
      }`}
    >
      <div
        className={`mb-3 inline-flex rounded-lg p-2.5 ${
          link.featured ? "bg-accent/15 text-accent-soft" : "bg-brand-blue/15 text-brand-white"
        }`}
      >
        <Icon size={22} aria-hidden />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        {link.eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-bold text-foreground">{link.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{link.description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft transition group-hover:gap-2">
        Open <IconChevronRight size={16} aria-hidden />
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
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="pointer-events-none absolute inset-x-4 top-8 h-48 shot-arc sm:inset-x-6" aria-hidden />
        <header className="relative max-w-3xl">
          <BrandLogo
            variant="horizontal"
            className="h-12 w-auto object-contain sm:h-14"
            priority
          />
          <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-accent-soft">
            <IconBasketball size={16} aria-hidden />
            {SHOOTING_CHALLENGE.name}
          </p>
          <h1 className="font-display mt-4 text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Train with purpose.{" "}
            <span className="text-brand-orange">Compete with clarity.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {SHOOTING_CHALLENGE.description}
          </p>
        </header>

        <TopThreePreview entries={topEntries} />

        <div className="mt-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent-soft">
            Explore the challenge
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PROGRAM_HUB_LINKS.map((link) => (
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
