import { CtaLink, ProgramPage } from "@/components/site";
import { EmptyState, ErrorState } from "@/components/ui";
import { formatRelativeUpdate } from "@/lib/formatters";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { LeaderboardData } from "@/types/leaderboard";

import { IconTrophy } from "@/components/icons/shoot-icons";

import { LeaderboardBoard } from "./leaderboard-board";
import { LeaderboardRankingExplanation } from "./leaderboard-ranking-explanation";

type LeaderboardViewProps = {
  data: LeaderboardData;
};

export function LeaderboardView({ data }: LeaderboardViewProps) {
  return (
    <ProgramPage
      eyebrow="Season standings"
      title="Season Leaderboard"
      description="See who is leading the season by level, XP, and total shots — ranked for fair competition."
      heroVariant="contrast"
      ambientVariant="leaderboard"
      actions={
        <CtaLink href="/faq" variant="contrast">
          Program FAQ
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
        <LeaderboardRankingExplanation />
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
      <div className="space-y-8">
        <LeaderboardRankingExplanation />
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
      </div>
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
      <div className="space-y-8">
        <LeaderboardRankingExplanation />
        <ErrorState
          title="Could not load leaderboard"
          message={message}
          action={
            <>
              <CtaLink href="/leaderboard" variant="default">
                Try again
              </CtaLink>
              <CtaLink href="/" variant="secondary">
                ← Shooting Challenge
              </CtaLink>
            </>
          }
        />
      </div>
    </ProgramPage>
  );
}
