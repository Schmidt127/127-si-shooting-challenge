import {
  IconBasketball,
  IconBolt,
  IconRank,
  IconTarget,
  IconTrophy,
} from "@/components/icons/shoot-icons";
import { CtaLink, ProgramPage } from "@/components/site";
import { EmptyState, ErrorState, StatTile } from "@/components/ui";
import { formatRelativeUpdate, formatXp } from "@/lib/formatters";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { LeaderboardData } from "@/types/leaderboard";

import { LeaderboardBoard } from "./leaderboard-board";
import { LeaderboardTiebreakerLegend } from "./leaderboard-tiebreaker-legend";

type LeaderboardViewProps = {
  data: LeaderboardData;
};

function LeaderboardStats({ data }: LeaderboardViewProps) {
  const totalXp = data.entries.reduce((sum, entry) => sum + entry.xp, 0);
  const totalShots = data.entries.reduce((sum, entry) => sum + entry.totalShots, 0);
  const topXp = data.entries[0]?.xp ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label="Athletes"
        value={String(data.entries.length)}
        icon={IconBasketball}
        tint="blue"
      />
      <StatTile label="Combined XP" value={formatXp(totalXp)} icon={IconBolt} tint="amber" />
      <StatTile label="Shots Logged" value={formatXp(totalShots)} icon={IconTarget} tint="blue" />
      <StatTile label="Leader XP" value={formatXp(topXp)} icon={IconTrophy} tint="orange" />
    </div>
  );
}

export function LeaderboardView({ data }: LeaderboardViewProps) {
  return (
    <ProgramPage
      eyebrow="Season standings"
      title="Season Leaderboard"
      description="See who is leading the season by level, XP, and total shots — ranked for fair competition."
      heroVariant="contrast"
      ambientVariant="leaderboard"
      actions={
        <CtaLink href="/public-display" variant="cta" iconStart={<IconRank size={16} />}>
          Display mode
        </CtaLink>
      }
      meta={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Updated {formatRelativeUpdate(data.updatedAt)}</span>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span>{data.seasonLabel}</span>
        </div>
      }
    >
      <div className="space-y-6">
        <LeaderboardStats data={data} />
        <LeaderboardTiebreakerLegend />
        <LeaderboardBoard entries={data.entries} />
      </div>
    </ProgramPage>
  );
}

export function LeaderboardEmptyState() {
  return (
    <ProgramPage
      eyebrow="Season standings"
      title="Season Leaderboard"
      description="See who is leading the season by level, XP, and total shots — ranked for fair competition."
      heroVariant="contrast"
      ambientVariant="leaderboard"
    >
      <EmptyState
        title={EMPTY_STATE_COPY.leaderboard.title}
        description={EMPTY_STATE_COPY.leaderboard.description}
        icon={<IconTrophy size={40} />}
        action={
          <CtaLink href="/" variant="secondary">
            ← Shooting Challenge
          </CtaLink>
        }
      />
    </ProgramPage>
  );
}

export function LeaderboardErrorState({ message }: { message: string }) {
  return (
    <ProgramPage
      eyebrow="Season standings"
      title="Season Leaderboard"
      description="See who is leading the season by level, XP, and total shots — ranked for fair competition."
      heroVariant="contrast"
      ambientVariant="leaderboard"
    >
      <ErrorState
        title="Could not load leaderboard"
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
