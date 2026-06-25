import Image from "next/image";
import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { formatXp } from "@/lib/formatters";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import type { LevelDefinition } from "@/types/levels";

import { LevelBadge } from "../leaderboard/level-badge";

type LevelDetailViewProps = {
  level: LevelDefinition;
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function LevelDetailView({ level }: LevelDetailViewProps) {
  const style = getLevelStyle(level.displayName);

  return (
    <AmbientPage variant="levels">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <Link
          href="/levels"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-accent-soft"
        >
          <span aria-hidden>←</span> Level ladder
        </Link>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-white/10">
          {level.coverImage ? (
            <div className="relative aspect-[21/9] w-full">
              <Image src={level.coverImage.url} alt="" fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>
          ) : (
            <div className={`h-32 bg-gradient-to-br ${style.gradient}`} />
          )}

          <div className="relative p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                <div
                  className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br font-mono text-2xl font-black ${style.gradient} ${style.text} ring-1 ${style.ring} ${style.glow}`}
                >
                  {level.sortOrder || level.rank || "★"}
                </div>
                <DetailTitle
                  overline={level.rank > 0 ? `Tier ${level.rank}` : "Challenge level"}
                  title={level.name}
                  accent={level.displayName !== level.name ? level.displayName : undefined}
                />
              </div>
              <LevelBadge level={level.displayName} size="lg" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatPill label="Lifetime XP" value={formatXp(level.xpRequired)} />
              <StatPill
                label="XP to unlock"
                value={level.xpFromPrevious > 0 ? formatXp(level.xpFromPrevious) : "Starting tier"}
              />
              <StatPill label="Ladder step" value={String(level.sortOrder || "—")} />
            </div>
          </div>
        </div>

        {level.unlockMessage ? (
          <section className="mt-10 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-6 sm:p-8">
            <SectionHeading label="Unlock moment" title="What athletes earn here" />
            <RichContent text={level.unlockMessage} className="text-foreground/90" />
          </section>
        ) : null}

        {level.gateCriteria ? (
          <section className="mt-8 rounded-2xl border border-brand-blue/25 bg-brand-blue/5 p-6 sm:p-8">
            <SectionHeading
              label="Gate checklist"
              title="What it takes to advance"
              description="Requirements pulled live from your level gate rules."
            />
            <RichContent text={level.gateCriteria} className="text-foreground/90" />
          </section>
        ) : null}

        <nav className="mt-10 flex flex-wrap gap-3">
          {level.previousLevelId ? (
            <Link
              href={`/levels/${level.previousLevelId}`}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-accent/30 hover:text-accent-soft"
            >
              ← Previous tier
            </Link>
          ) : null}
          {level.nextLevelId ? (
            <Link
              href={`/levels/${level.nextLevelId}`}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-accent/30 hover:text-accent-soft"
            >
              Next tier →
            </Link>
          ) : null}
        </nav>
      </div>
    </AmbientPage>
  );
}

export function LevelNotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground">Level not found</h1>
        <p className="mt-3 text-muted">This tier may be inactive or the link is incorrect.</p>
        <Link href="/levels" className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent">
          ← Back to levels
        </Link>
      </div>
    </div>
  );
}
