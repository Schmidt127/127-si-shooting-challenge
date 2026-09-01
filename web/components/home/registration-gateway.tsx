import { ClipboardList, UserPlus } from "lucide-react";

import { SiteSection } from "@/components/site";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DAILY_SUBMISSIONS,
  PLAYER_REGISTRATION,
} from "@/lib/registration";
import { cn } from "@/lib/utils";

type GatewayCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: typeof UserPlus;
  variant?: "blue" | "orange";
};

function ExternalCta({
  href,
  cta,
  featured = false,
}: {
  href: string;
  cta: string;
  featured?: boolean;
}) {
  const ariaLabel = `${cta} (opens in a new tab)`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={cn(
        buttonVariants({
          variant: featured ? "cta" : "default",
          size: "default",
        }),
        "min-h-11 w-full justify-center sm:w-auto",
      )}
    >
      {cta}
      <span aria-hidden className="ml-0.5 text-xs font-bold opacity-80">
        ↗
      </span>
    </a>
  );
}

function GatewayCard({
  eyebrow,
  title,
  description,
  cta,
  href,
  icon: Icon,
  variant = "blue",
}: GatewayCardProps) {
  const isOrange = variant === "orange";

  return (
    <Card
      className={cn(
        "h-full rounded-lg shadow-site-sm transition hover:shadow-site-md focus-within:ring-2 focus-within:ring-brand-blue/40",
        isOrange
          ? "bg-gradient-to-br from-brand-orange/[0.18] via-card to-brand-orange/[0.06] ring-brand-orange/45"
          : "bg-gradient-to-br from-brand-blue/[0.22] via-brand-white to-brand-blue/[0.10] ring-brand-blue/40",
      )}
    >
      <CardHeader className="gap-2">
        <span
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-md",
            isOrange
              ? "bg-brand-orange/15 text-brand-orange ring-1 ring-brand-orange/30"
              : "bg-brand-blue/15 text-brand-blue ring-1 ring-brand-blue/30",
          )}
        >
          <Icon size={18} aria-hidden />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-soft sm:text-[11px] sm:tracking-[0.18em]">
          {eyebrow}
        </p>
        <CardTitle className="font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ExternalCta href={href} cta={cta} featured={isOrange} />
      </CardContent>
    </Card>
  );
}

/**
 * Homepage registration gateway — enroll via Player Registration or log
 * daily activity via the branded Fillout daily submissions form.
 */
export function RegistrationGateway() {
  return (
    <SiteSection
      id="registration-gateway"
      data-testid="registration-gateway"
      tone="orange"
      title="Ready to join the 2026–2027 Shooting Challenge?"
      titleId="registration-heading"
      description="Register for the annual challenge or log today's shooting and training activity if you are already enrolled."
      aria-labelledby="registration-heading"
    >
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <GatewayCard
          eyebrow="JOIN THE CHALLENGE"
          title={PLAYER_REGISTRATION.label}
          description="Enroll an athlete for the May 1–June 30 online challenge. Open to boys and girls in grades 1–12 worldwide."
          cta={PLAYER_REGISTRATION.cta}
          href={PLAYER_REGISTRATION.url}
          icon={UserPlus}
          variant="blue"
        />
        <GatewayCard
          eyebrow="ALREADY REGISTERED?"
          title="Log Today's Shooting Activity"
          description="Use the daily submission form to record shots, homework, and completed training activity."
          cta={DAILY_SUBMISSIONS.cta}
          href={DAILY_SUBMISSIONS.url}
          icon={ClipboardList}
          variant="orange"
        />
      </div>
    </SiteSection>
  );
}
