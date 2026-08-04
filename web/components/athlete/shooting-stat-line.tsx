import type { PublicShootingSplit, PublicShootingStats } from "@/types/public-athlete-profile";
import { formatShots } from "@/lib/formatters";

type ShootingStatLineProps = {
  shooting: PublicShootingStats;
};

function formatPercent(split: PublicShootingSplit): string {
  if (!split.available || split.percent == null) return "—";
  return `${Math.round(split.percent * 100)}%`;
}

function StatCell({
  label,
  attempts,
  makes,
  percent,
  available,
}: {
  label: string;
  attempts: number | null;
  makes: number | null;
  percent: string;
  available: boolean;
}) {
  return (
    <div className="min-w-0 border-t border-border/80 pt-3 first:border-t-0 first:pt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
      {available ? (
        <>
          <p className="mt-1 font-mono text-2xl font-black text-foreground">{percent}</p>
          <p className="mt-1 text-xs text-muted">
            {makes == null ? "—" : formatShots(makes)} /{" "}
            {attempts == null ? "—" : formatShots(attempts)}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 font-mono text-2xl font-black text-muted">—</p>
          <p className="mt-1 text-xs text-muted">Not yet recorded</p>
        </>
      )}
    </div>
  );
}

export function ShootingStatLine({ shooting }: ShootingStatLineProps) {
  return (
    <section aria-labelledby="shooting-heading" data-testid="shooting-stat-line">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">
            Scoreboard
          </p>
          <h2 id="shooting-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
            Shooting performance
          </h2>
        </div>
        <p className="text-right text-xs text-muted">
          {formatShots(shooting.totalShots)} shots
          {shooting.totalMakes != null ? ` · ${formatShots(shooting.totalMakes)} makes` : ""}
        </p>
      </div>

      {!shooting.hasDetailedSplits ? (
        <div className="border border-dashed border-border bg-brand-light-gray/60 px-4 py-5 text-sm text-muted">
          Detailed shooting splits have not been recorded yet. Totals still count toward the
          challenge when submissions are approved.
        </div>
      ) : (
        <div className="grid gap-4 border border-border bg-[linear-gradient(180deg,#fff_0%,#f7f8fb_100%)] p-4 sm:grid-cols-4 sm:gap-0 sm:p-5">
          <StatCell
            label="FG"
            attempts={shooting.overallFg.attempts}
            makes={shooting.overallFg.makes}
            percent={formatPercent(shooting.overallFg)}
            available={shooting.overallFg.available}
          />
          <StatCell
            label="2PT"
            attempts={shooting.twoPoint.attempts}
            makes={shooting.twoPoint.makes}
            percent={formatPercent(shooting.twoPoint)}
            available={shooting.twoPoint.available}
          />
          <StatCell
            label="3PT"
            attempts={shooting.threePoint.attempts}
            makes={shooting.threePoint.makes}
            percent={formatPercent(shooting.threePoint)}
            available={shooting.threePoint.available}
          />
          <StatCell
            label="FT"
            attempts={shooting.freeThrow.attempts}
            makes={shooting.freeThrow.makes}
            percent={formatPercent(shooting.freeThrow)}
            available={shooting.freeThrow.available}
          />
        </div>
      )}
    </section>
  );
}
