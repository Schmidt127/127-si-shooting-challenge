import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RANKING_STEPS = [
  {
    step: 1,
    title: "Level",
    detail: "Higher level ranks first — from Beginner toward G.O.A.T.",
  },
  {
    step: 2,
    title: "XP",
    detail: "When level is tied, higher lifetime XP ranks first.",
  },
  {
    step: 3,
    title: "Total Shots",
    detail: "When level and XP are tied, more verified shots ranks first.",
  },
] as const;

export function LeaderboardRankingExplanation() {
  return (
    <Card className="rounded-lg shadow-site-sm ring-brand-blue/15">
      <CardHeader className="gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-soft">
          How rankings work
        </p>
        <CardTitle className="font-display text-xl text-foreground sm:text-2xl">
          Your position is determined in three steps
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          First, players are compared by Level. If players are at the same Level, XP breaks the
          tie. If XP is also tied, Total Shots determines the order. Higher values rank first at
          each step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="grid gap-3 sm:grid-cols-3">
          {RANKING_STEPS.map((item) => (
            <li
              key={item.step}
              className="rounded-lg border border-border bg-brand-light-gray/80 p-4"
            >
              <p className="font-mono text-xs font-bold text-brand-orange">Step {item.step}</p>
              <p className="mt-1 font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ol>

        <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/[0.04] px-4 py-3 text-sm leading-relaxed text-foreground">
          <p className="font-semibold">Sample comparison</p>
          <p className="mt-1 text-muted-foreground">
            Two athletes both at Level 5: the one with 2,400 XP ranks above 2,400 XP only if their
            Total Shots is higher; otherwise the higher XP wins. An athlete at Level 6 always ranks
            above Level 5 regardless of XP or shots.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Level thresholds and XP requirements are published on the{" "}
          <Link href="/levels" className="sc-text-link font-semibold text-foreground">
            levels page
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
