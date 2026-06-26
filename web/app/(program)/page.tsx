import type { Metadata } from "next";
import Link from "next/link";

import { SHOOTING_CHALLENGE } from "@/lib/app-config";

export const metadata: Metadata = {
  title: SHOOTING_CHALLENGE.name,
  description: SHOOTING_CHALLENGE.description,
};

export default function ShootingChallengeHomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-sm leading-relaxed text-muted">{SHOOTING_CHALLENGE.description}</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/leaderboard"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-soft">Primary</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Leaderboard</h2>
          <p className="mt-2 text-sm text-muted">Live season rankings, XP, and shot totals.</p>
          <span className="mt-4 inline-block text-sm font-medium text-accent-soft transition group-hover:translate-x-0.5">
            Open →
          </span>
        </Link>

        <Link href="/homework" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-soft">Curriculum</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Homework</h2>
          <p className="mt-2 text-sm text-muted">Published assignments by week.</p>
          <span className="mt-4 inline-block text-sm font-medium text-accent-soft transition group-hover:translate-x-0.5">Open →</span>
        </Link>

        <Link href="/tutorials" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-soft">Film room</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Tutorials</h2>
          <p className="mt-2 text-sm text-muted">Technique videos and breakdowns.</p>
          <span className="mt-4 inline-block text-sm font-medium text-accent-soft transition group-hover:translate-x-0.5">Open →</span>
        </Link>

        <Link href="/shoutouts" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <h2 className="mt-2 text-lg font-bold text-foreground">Shoutouts</h2>
          <p className="mt-2 text-sm text-muted">Athlete features and highlights.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">Open →</span>
        </Link>

        <Link href="/articles" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <h2 className="mt-2 text-lg font-bold text-foreground">Articles</h2>
          <p className="mt-2 text-sm text-muted">FBC article book readings.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">Open →</span>
        </Link>

        <Link href="/zoom-meetings" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <h2 className="mt-2 text-lg font-bold text-foreground">Zoom Meetings</h2>
          <p className="mt-2 text-sm text-muted">Schedules, agendas, and recordings.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">Open →</span>
        </Link>

        <Link href="/game-manual" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <h2 className="mt-2 text-lg font-bold text-foreground">Game Manual</h2>
          <p className="mt-2 text-sm text-muted">Rules, scoring, XP, and how the challenge works.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">Open →</span>
        </Link>

        <Link href="/levels" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <h2 className="mt-2 text-lg font-bold text-foreground">Levels</h2>
          <p className="mt-2 text-sm text-muted">XP ladder from Beginner to G.O.A.T.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">Open →</span>
        </Link>

        <Link href="/public-display" className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80">
          <h2 className="mt-2 text-lg font-bold text-foreground">Public Display</h2>
          <p className="mt-2 text-sm text-muted">Gym and event screen mode.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">Open →</span>
        </Link>
      </div>
    </div>
  );
}
