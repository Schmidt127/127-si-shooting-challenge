import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Flame,
  Globe,
  GraduationCap,
  Medal,
  Sparkles,
  Target,
  Users,
  Video,
} from "lucide-react";

import { HeroProgressVisual } from "@/components/home/hero-progress-visual";
import { LevelJourneySection } from "@/components/home/level-journey-section";
import { ProgramPricingSection } from "@/components/home/program-pricing-section";
import { RegistrationGateway } from "@/components/home/registration-gateway";
import { AthleteProfileLink } from "@/components/athlete/athlete-profile-link";
import { IconChevronRight, IconTrophy } from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { LevelBadge } from "@/components/leaderboard/level-badge";
import {
  CtaLink,
  FeatureCard,
  PageHero,
  SiteSection,
} from "@/components/site";
import { Card, CardContent } from "@/components/ui/card";
import type { ProgramPricing } from "@/lib/data/program-pricing";
import { formatXp } from "@/lib/formatters";
import { PROGRAM_HUB_LINKS } from "@/lib/navigation/program-hub-links";
import { PLAYER_REGISTRATION } from "@/lib/registration";
import {
  CHALLENGE_DATES,
  CHALLENGE_SEASON_LABEL,
  HOME_HERO,
  PROGRAM_GRADES_SERVED,
  PROGRAM_IDENTITY,
} from "@/lib/seo/program-facts";
import type { LeaderboardEntry } from "@/types/leaderboard";

const HERO_CTAS = [
  {
    href: PLAYER_REGISTRATION.url,
    label: "Register for the Challenge",
    variant: "cta" as const,
    size: "lg" as const,
    external: true,
  },
  { href: "/levels", label: "Explore the 12 levels", variant: "contrast" as const, size: "default" as const },
  { href: "/faq", label: "Read program FAQ", variant: "contrast" as const, size: "default" as const },
];

const XP_CATEGORIES = [
  {
    title: "Shooting & activity submissions",
    description: "Log basketball shooting work and verified training activity throughout the challenge.",
    eyebrow: "Activity",
    icon: Target,
  },
  {
    title: "Homework completion",
    description: "Finish weekly assignments that reinforce skill, knowledge, and accountability.",
    eyebrow: "Learning",
    icon: BookOpen,
  },
  {
    title: "Video feedback participation",
    description: "Submit videos regularly and engage with coaching feedback on your shooting.",
    eyebrow: "Coaching",
    icon: Video,
  },
  {
    title: "Consistency & streaks",
    description: "Stay on track with daily participation and build momentum over the two-month window.",
    eyebrow: "Habits",
    icon: Flame,
  },
  {
    title: "Weekly accomplishments",
    description: "Meet weekly standards and earn recognition for steady, complete participation.",
    eyebrow: "Weekly",
    icon: Medal,
  },
  {
    title: "Perfect-week achievements",
    description: "Hit the full weekly bar when every required element is completed.",
    eyebrow: "Excellence",
    icon: CheckCircle2,
  },
  {
    title: "Zoom & educational sessions",
    description: "Join live or recorded sessions when offered as part of the challenge calendar.",
    eyebrow: "Sessions",
    icon: GraduationCap,
  },
  {
    title: "Milestones & special achievements",
    description: "Unlock bonuses for shooting milestones and other program accomplishments.",
    eyebrow: "Bonuses",
    icon: Sparkles,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Register for the annual challenge",
    description: `Enroll in the ${CHALLENGE_SEASON_LABEL} through the official player registration form.`,
  },
  {
    step: "02",
    title: "Shoot and submit activity",
    description: "Log basketball shooting work and training through the daily submission form.",
  },
  {
    step: "03",
    title: "Complete assignments & activities",
    description: "Work through homework and other Educational Athletics activities built into the challenge.",
  },
  {
    step: "04",
    title: "Submit videos for feedback",
    description: "Share shooting videos and receive coaching feedback to improve form and habits.",
  },
  {
    step: "05",
    title: "Earn XP",
    description: "Qualifying participation across shooting, learning, consistency, and milestones adds XP.",
  },
  {
    step: "06",
    title: "Unlock levels & achievements",
    description: "Progress from Beginner toward G.O.A.T. and celebrate milestones along the way.",
  },
];

const EDUCATIONAL_ATHLETICS_TRAITS = [
  {
    trait: "Skill",
    detail: "Improve shooting technique through practice, homework, and coach feedback.",
  },
  {
    trait: "Consistency",
    detail: "Build daily habits with submissions, streaks, and weekly standards.",
  },
  {
    trait: "Accountability",
    detail: "Track progress publicly and follow through on assignments and submissions.",
  },
  {
    trait: "Knowledge",
    detail: "Learn basketball concepts through homework, tutorials, and educational sessions.",
  },
  {
    trait: "Coachability",
    detail: "Apply video feedback and show up ready to improve.",
  },
  {
    trait: "Goal-setting",
    detail: "Work toward individual shooting goals and level advancement throughout the challenge.",
  },
  {
    trait: "Self-discipline",
    detail: "Stay committed across the full May–June challenge window — at home, on your schedule.",
  },
];

const PARENT_GUIDANCE = [
  {
    title: "Clear weekly expectations",
    description:
      "Homework assignments, due dates, and tutorial links live on this site so families know what to complete between practices.",
  },
  {
    title: "Transparent progress",
    description:
      "XP, levels, streaks, and leaderboard standings update from verified submissions — not guesswork.",
  },
  {
    title: "Remote-friendly participation",
    description:
      "Train from home, submit daily activity online, and join Zoom check-ins when schedules allow. Based in Fairfield, Montana with nationwide online access.",
  },
];

const PARTICIPATION_FACTS = [
  {
    icon: Users,
    label: "Who",
    value: "Boys and girls",
  },
  {
    icon: GraduationCap,
    label: "Grades",
    value: PROGRAM_GRADES_SERVED,
  },
  {
    icon: Globe,
    label: "Where",
    value: "Anywhere in the world",
  },
  {
    icon: Video,
    label: "Format",
    value: "100% online",
  },
  {
    icon: Target,
    label: "You need",
    value: "Basketball, a place to shoot, and internet access",
  },
];

function HeroFactChips() {
  return (
    <ul className="motion-rise motion-delay-1 mt-5 flex flex-wrap gap-2" aria-label="Program facts">
      {HOME_HERO.factChips.map((chip) => (
        <li
          key={chip}
          className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-brand-white ring-1 ring-white/20 sm:text-sm"
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

function TopThreePreview({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-brand-blue/15 bg-gradient-to-br from-brand-blue/[0.06] via-card to-brand-orange/[0.08] px-5 py-6 shadow-site-sm sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-orange/15 text-brand-orange ring-1 ring-brand-orange/30">
              <IconTrophy size={26} aria-hidden />
            </span>
            <div>
              <p className="font-display text-xl text-foreground">Challenge standings</p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Top athletes appear here once the challenge season is underway. Browse the full
                leaderboard anytime.
              </p>
            </div>
          </div>
          <CtaLink
            href="/leaderboard"
            variant="cta"
            size="default"
            className="w-full justify-center sm:w-auto sm:shrink-0"
          >
            View full leaderboard
            <IconChevronRight size={16} />
          </CtaLink>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {entries.map((entry) => (
        <Card
          key={entry.rank}
          size="sm"
          className={`rounded-lg shadow-site-sm ${
            entry.rank === 1 ? "ring-brand-orange/45" : "ring-border"
          }`}
        >
          <CardContent className="flex items-center gap-3 pt-(--card-spacing)">
            <span
              className="font-mono text-lg font-bold text-brand-blue"
              aria-label={`Rank ${entry.rank}`}
            >
              #{entry.rank}
            </span>
            <AthleteAvatar
              name={entry.displayName}
              headshotUrl={entry.headshot?.url}
              size="md"
              rank={entry.rank === 1 ? 1 : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                <AthleteProfileLink
                  name={entry.displayName}
                  slug={entry.publicProfileSlug}
                />
              </p>
              <LevelBadge level={entry.level} size="sm" />
              <p className="mt-1 font-mono text-xs text-accent-soft">
                {formatXp(entry.xp)} XP
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type HomePageViewProps = {
  topEntries: LeaderboardEntry[];
  pricing?: ProgramPricing | null;
};

export function HomePageView({ topEntries, pricing = null }: HomePageViewProps) {
  return (
    <div>
      <PageHero
        eyebrow={HOME_HERO.eyebrow}
        title={
          <>
            {HOME_HERO.titleLead}{" "}
            <span className="text-brand-orange">{HOME_HERO.titleAccent}</span>
          </>
        }
        description={
          <>
            <p>{HOME_HERO.description}</p>
            <HeroFactChips />
          </>
        }
        actions={HERO_CTAS.map((cta) =>
          cta.external ? (
            <a
              key={cta.href}
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${cta.label} (opens in a new tab)`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-orange px-5 text-sm font-bold text-brand-charcoal shadow-site-sm transition hover:bg-brand-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 sm:w-auto sm:px-6 sm:text-base"
            >
              {cta.label}
              <span aria-hidden className="ml-0.5 text-xs font-bold opacity-80">
                ↗
              </span>
            </a>
          ) : (
            <CtaLink key={cta.href} href={cta.href} variant={cta.variant} size={cta.size}>
              {cta.label}
            </CtaLink>
          ),
        )}
        aside={<HeroProgressVisual />}
      />

      <SiteSection
        eyebrow="What is the Shooting Challenge?"
        title="A two-month online Educational Athletics challenge"
        titleId="what-is-heading"
        description="More than a shooting contest — a structured program that combines basketball training, accountability, learning, and coaching feedback."
        aria-labelledby="what-is-heading"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="rounded-lg shadow-site-sm">
            <CardContent className="space-y-4 pt-(--card-spacing) text-sm leading-relaxed text-foreground sm:text-base">
              <p>
                The <strong>127 Sports Intensity Shooting Challenge</strong> runs once per year as a
                focused, two-month program. Athletes log shooting activity, work toward individual
                goals, complete homework, submit videos for coaching feedback, and participate in
                other Educational Athletics activities — all online.
              </p>
              <p>
                Success is not about racking up the most shots. It requires well-rounded
                participation: consistent training, completed assignments, coachable video work, and
                steady XP growth across the full challenge.
              </p>
              <p className="text-muted-foreground">
                {PROGRAM_IDENTITY.philosophy}: {PROGRAM_IDENTITY.philosophyTagline}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-gradient-to-br from-brand-blue/[0.06] via-card to-brand-orange/[0.08] shadow-site-sm ring-brand-blue/20">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-soft">
                Annual program · One session scheduled
              </p>
              <p className="font-display text-2xl text-foreground">{CHALLENGE_SEASON_LABEL}</p>
              <div className="flex items-center gap-2 text-foreground">
                <Calendar size={18} className="shrink-0 text-brand-orange" aria-hidden />
                <p className="text-base font-semibold">{CHALLENGE_DATES}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Only one upcoming challenge is currently scheduled. Athletes participate from home —
                no travel to Fairfield, Montana required.
              </p>
            </CardContent>
          </Card>
        </div>
      </SiteSection>

      <SiteSection
        tone="muted"
        eyebrow="How it works"
        title="Six steps from registration to level-up"
        titleId="how-heading"
        description="Simple enough for families. Structured enough for real development across the full challenge."
        aria-labelledby="how-heading"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <Card key={item.step} className="rounded-lg shadow-site-sm">
              <CardContent className="pt-(--card-spacing)">
                <p className="font-mono text-sm font-bold text-brand-orange">{item.step}</p>
                <h3 className="font-display mt-2 text-lg text-foreground sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Earn XP"
        title="Ways athletes earn XP during the challenge"
        titleId="xp-heading"
        description="XP rewards complete participation — not just shot volume. Exact scoring stays in the program; these are the major categories families should know."
        aria-labelledby="xp-heading"
        actions={
          <CtaLink href="/achievements" variant="default" size="default">
            View achievements
          </CtaLink>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {XP_CATEGORIES.map((category) => (
            <FeatureCard
              key={category.title}
              tone="benefit"
              title={category.title}
              description={category.description}
              eyebrow={category.eyebrow}
              icon={category.icon}
              className="[&_[data-slot=card-description]]:text-[0.8125rem] sm:[&_[data-slot=card-description]]:text-sm"
            />
          ))}
        </div>
      </SiteSection>

      <LevelJourneySection />

      <SiteSection
        eyebrow="More than shooting"
        title="Educational Athletics builds complete athletes"
        titleId="philosophy-heading"
        description="The challenge develops habits and skills that carry beyond the court — tied directly to what athletes do each week."
        aria-labelledby="philosophy-heading"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {EDUCATIONAL_ATHLETICS_TRAITS.map((item) => (
            <Card key={item.trait} className="rounded-lg shadow-site-sm">
              <CardContent className="pt-(--card-spacing)">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-orange">
                  {item.trait}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        tone="muted"
        eyebrow="Who can participate?"
        title="Open to athletes worldwide"
        titleId="participation-heading"
        description="No local residency requirement. If you can shoot, submit activity, and connect online, you can join the challenge."
        aria-labelledby="participation-heading"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PARTICIPATION_FACTS.map((fact) => {
            const Icon = fact.icon;
            return (
              <Card key={fact.label} className="rounded-lg shadow-site-sm">
                <CardContent className="flex items-start gap-3 pt-(--card-spacing)">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                    <Icon size={18} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-foreground sm:text-base">
                      {fact.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="For parents and families"
        title="What you can expect each week"
        titleId="parents-heading"
        description="The Shooting Challenge is built for busy families who want structure without confusion."
        aria-labelledby="parents-heading"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {PARENT_GUIDANCE.map((item) => (
            <Card key={item.title} className="rounded-lg shadow-site-sm">
              <CardContent className="pt-(--card-spacing)">
                <h3 className="font-display text-xl text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaLink href="/faq" variant="default" size="default">
            Read parent FAQ
          </CtaLink>
          <CtaLink href="/homework" variant="contrast" size="default">
            See current homework
          </CtaLink>
        </div>
      </SiteSection>

      <SiteSection
        id="challenge-dates"
        eyebrow="Challenge dates"
        title={CHALLENGE_SEASON_LABEL}
        titleId="dates-heading"
        description="The Shooting Challenge occurs once per year. The next session runs May 1 through June 30."
        aria-labelledby="dates-heading"
      >
        <Card className="max-w-2xl rounded-lg shadow-site-sm ring-brand-orange/30">
          <CardContent className="flex flex-col gap-4 pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl text-foreground sm:text-3xl">{CHALLENGE_DATES}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Two months of structured online participation. Registration opens through the
                official player registration form when enrollment is available.
              </p>
            </div>
            <CtaLink href="#registration-gateway" variant="cta" size="default" className="shrink-0">
              Register now
            </CtaLink>
          </CardContent>
        </Card>
      </SiteSection>

      <ProgramPricingSection pricing={pricing} />

      <SiteSection
        eyebrow="Live leaders"
        title="Challenge leaderboard"
        titleId="top-board-heading"
        description="See who is leading the current challenge season by XP and level."
        aria-labelledby="top-board-heading"
        actions={
          <CtaLink href="/leaderboard" variant="default" size="default">
            View full leaderboard
          </CtaLink>
        }
      >
        <TopThreePreview entries={topEntries} />
      </SiteSection>

      <SiteSection
        tone="blue"
        eyebrow="Explore the challenge"
        title="Jump into any part of the program"
        titleId="explore-heading"
        description="Rankings, homework, levels, tutorials, achievements, and more — all public on this site."
        aria-labelledby="explore-heading"
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {PROGRAM_HUB_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex min-h-11 flex-col rounded-md bg-white/10 p-3 ring-1 ring-white/20 transition hover:bg-white/15 hover:ring-brand-orange/55 sm:p-4"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-orange/20 text-brand-orange sm:size-9">
                  <Icon size={18} aria-hidden />
                </span>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-contrast-muted sm:mt-3">
                  {link.eyebrow}
                </p>
                <p className="mt-1 text-sm font-bold leading-snug text-brand-white sm:text-base">
                  {link.title}
                </p>
                <p className="mt-1 hidden text-sm leading-snug text-contrast-muted sm:block sm:line-clamp-2">
                  {link.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-orange transition group-hover:gap-1.5 sm:mt-3 sm:text-sm">
                  {link.linkLabel} <IconChevronRight size={14} aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </SiteSection>

      <RegistrationGateway />
    </div>
  );
}

export function HomePageFallback() {
  return <HomePageView topEntries={[]} />;
}

/** Used only when the server-side standings contract fails closed. */
export function HomePageStandingsError() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16" role="alert">
      <h1 className="text-2xl font-bold text-foreground">Live standings are temporarily unavailable</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        The standings data is being verified. Please check the leaderboard again shortly.
      </p>
    </div>
  );
}
