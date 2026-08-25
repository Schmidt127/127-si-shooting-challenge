import Link from "next/link";

import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { AthleteLevelDisplay } from "@/components/levels/level-graphic";
import { formatGrade } from "@/lib/formatters";
import type { PublicAthleteIdentity } from "@/types/public-athlete-profile";

type ProfileHeroProps = {
  identity: PublicAthleteIdentity;
};

export function ProfileHero({ identity }: ProfileHeroProps) {
  const status = identity.progressionStatus || "Shooting Challenge athlete";

  return (
    <header
      className="relative overflow-hidden border-b border-border bg-[linear-gradient(135deg,var(--court-navy)_0%,var(--brand-blue)_55%,#001433_100%)] text-contrast-fg"
      data-testid="athlete-profile-hero"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0 48%, rgba(255,255,255,0.08) 49%, transparent 51%), linear-gradient(0deg, transparent 0 62%, rgba(255,139,0,0.12) 63%, transparent 65%)",
          backgroundSize: "48px 48px, 100% 100%",
        }}
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
          <AthleteAvatar
            name={identity.displayName}
            headshotUrl={identity.headshotUrl}
            size="xl"
            ringClass="ring-brand-orange/50"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-orange">
              127 SI · Shooting Challenge
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {identity.displayName}
            </h1>
            <p className="mt-2 text-sm text-contrast-muted sm:text-base">
              {[identity.school || "School TBD", identity.grade ? formatGrade(identity.grade) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {identity.level ? (
                <AthleteLevelDisplay
                  level={identity.level}
                  coverImageUrl={identity.levelCoverImageUrl}
                  badgeSize="md"
                  graphicSize="lg"
                  badgeVariant="hero"
                />
              ) : null}
              {identity.rank != null ? (
                <span className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wide ring-1 ring-white/20">
                  Rank #{identity.rank}
                </span>
              ) : null}
              <span className="rounded-md bg-brand-orange/20 px-2.5 py-1 text-xs font-semibold text-brand-orange ring-1 ring-brand-orange/35">
                {status}
              </span>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-contrast-muted">
              {identity.seasonLabel}
              {identity.programLabel ? ` · ${identity.programLabel}` : ""}
            </p>
          </div>
        </div>

        <Link
          href="/leaderboard"
          className="inline-flex min-h-11 items-center justify-center self-start rounded-md bg-brand-orange px-4 text-sm font-bold text-brand-charcoal transition hover:bg-brand-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--court-navy)]"
        >
          Back to standings
        </Link>
      </div>
    </header>
  );
}
