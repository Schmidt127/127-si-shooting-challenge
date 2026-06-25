import type { Metadata } from "next";
import Link from "next/link";

import { getProductById } from "@/lib/products";

const product = getProductById("shooting-challenge");

export const metadata: Metadata = {
  title: product?.name ?? "Shooting Challenge",
  description: product?.description,
};

export default function ShootingChallengeHomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-sm leading-relaxed text-muted">{product?.description}</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/shooting-challenge/leaderboard"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-soft">
            Primary
          </p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Leaderboard</h2>
          <p className="mt-2 text-sm text-muted">Live season rankings, XP, and shot totals.</p>
          <span className="mt-4 inline-block text-sm font-medium text-accent-soft transition group-hover:translate-x-0.5">
            Open →
          </span>
        </Link>

        <Link
          href="/homework"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-soft">
            Curriculum
          </p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Homework</h2>
          <p className="mt-2 text-sm text-muted">Published assignments by week — film, faith, and skills.</p>
          <span className="mt-4 inline-block text-sm font-medium text-accent-soft transition group-hover:translate-x-0.5">
            Open →
          </span>
        </Link>

        <Link
          href="/tutorials"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-accent/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-soft">
            Film room
          </p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Tutorials</h2>
          <p className="mt-2 text-sm text-muted">Technique videos, breakdowns, and athlete features.</p>
          <span className="mt-4 inline-block text-sm font-medium text-accent-soft transition group-hover:translate-x-0.5">
            Open →
          </span>
        </Link>

        <Link
          href="/shoutouts"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-pink-400/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pink-300/80">
            Spotlight
          </p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Shout-outs</h2>
          <p className="mt-2 text-sm text-muted">Athlete features, highlights, and encouragement.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">
            Open →
          </span>
        </Link>

        <Link
          href="/articles"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-emerald-400/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
            Reading
          </p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Articles</h2>
          <p className="mt-2 text-sm text-muted">FBC article book faith and character readings.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">
            Open →
          </span>
        </Link>

        <Link
          href="/zoom-meetings"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-cyan-400/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Live
          </p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Zoom Meetings</h2>
          <p className="mt-2 text-sm text-muted">Schedules, agendas, join links, and recordings.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">
            Open →
          </span>
        </Link>

        <Link
          href="/levels"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-violet-400/30 hover:bg-card/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Progression
          </p>
          <h2 className="mt-2 text-lg font-bold text-foreground">Levels</h2>
          <p className="mt-2 text-sm text-muted">XP ladder from Beginner to G.O.A.T.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">
            Open →
          </span>
        </Link>

        <Link
          href="/public-display"
          className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-card/80"
        >
          <h2 className="mt-2 text-lg font-bold text-foreground">Public Display</h2>
          <p className="mt-2 text-sm text-muted">Gym and event screen mode.</p>
          <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">
            Open →
          </span>
        </Link>
      </div>
    </div>
  );
}
