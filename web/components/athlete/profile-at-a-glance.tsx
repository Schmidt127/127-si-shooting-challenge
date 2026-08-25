import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildProfileGlanceSummary,
  type ProfileGlanceSummary,
} from "@/lib/data/profile-glance-summary";
import { formatXp } from "@/lib/formatters";
import type { PublicAthleteProfile } from "@/types/public-athlete-profile";

type ProfileAtAGlanceProps = {
  data: Pick<
    PublicAthleteProfile,
    "identity" | "performance" | "recentActivity" | "homeworkAssignments" | "weekly" | "achievements"
  >;
};

function perfectWeekTone(
  status: ProfileGlanceSummary["perfectWeekStatus"],
): "success" | "warn" | "neutral" {
  if (status === "Perfect Week") return "success";
  if (status === "In Progress") return "warn";
  return "neutral";
}

function GlanceCell({
  label,
  value,
  hint,
  testId,
}: {
  label: string;
  value: ReactNode;
  hint?: string | null;
  testId?: string;
}) {
  return (
    <div className="min-w-0 border-t border-border pt-4 first:border-t-0 first:pt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
      <div className="mt-1.5 text-sm font-semibold text-foreground sm:text-base" data-testid={testId}>
        {value}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ProfileAtAGlance({ data }: ProfileAtAGlanceProps) {
  const glance = buildProfileGlanceSummary(data);

  return (
    <section
      aria-labelledby="profile-glance-heading"
      data-testid="profile-at-a-glance"
      className="-mt-2 border border-border bg-card shadow-site-sm sm:-mt-4"
    >
      <div className="border-b border-border bg-brand-light-gray/50 px-4 py-3 sm:px-5">
        <h2 id="profile-glance-heading" className="text-sm font-bold text-foreground sm:text-base">
          At a glance
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Quick answers for parents and athletes — level, XP, homework, and weekly progress.
        </p>
      </div>
      <div className="grid gap-0 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-6">
        <GlanceCell
          label="Level"
          testId="glance-level"
          value={glance.levelLabel ?? "Not assigned yet"}
        />
        <GlanceCell
          label="Total XP"
          testId="glance-xp"
          value={
            <span className="font-mono font-black text-brand-blue">{formatXp(glance.lifetimeXp)}</span>
          }
        />
        <GlanceCell
          label="Latest activity"
          testId="glance-recent"
          value={glance.recentActivityLabel ?? "No public activity yet"}
          hint={
            glance.recentActivityLabel ? "Most recent counted submission or XP award" : "Game log below"
          }
        />
        <GlanceCell
          label="Homework"
          testId="glance-homework"
          value={
            glance.homeworkOpenCount === 0
              ? "All caught up"
              : `${glance.homeworkOpenCount} open assignment${glance.homeworkOpenCount === 1 ? "" : "s"}`
          }
          hint="Not started, in review, or needs revision"
        />
        <GlanceCell
          label="Perfect week"
          testId="glance-perfect-week"
          value={
            glance.perfectWeekLabel && glance.perfectWeekStatus ? (
              <span className="flex flex-wrap items-center gap-2">
                <span>{glance.perfectWeekLabel}</span>
                <StatusBadge tone={perfectWeekTone(glance.perfectWeekStatus)}>
                  {glance.perfectWeekStatus}
                </StatusBadge>
              </span>
            ) : (
              "Tracking starts with week 1"
            )
          }
        />
        <GlanceCell
          label="Achievements"
          testId="glance-achievements"
          value={
            glance.achievementCount === 0
              ? "None unlocked yet"
              : `${glance.achievementCount} unlocked`
          }
          hint={glance.achievementCount > 0 ? "Full list below" : "Earned badges appear at the bottom"}
        />
      </div>
    </section>
  );
}
