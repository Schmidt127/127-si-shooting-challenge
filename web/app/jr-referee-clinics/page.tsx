import type { Metadata } from "next";
import Link from "next/link";

import { getProductById } from "@/lib/products";

const product = getProductById("jr-referee-clinics");

export const metadata: Metadata = {
  title: product?.name ?? "JR Referee Clinics",
  description: product?.description,
};

const sections = [
  {
    href: "/jr-referee-clinics/participants",
    eyebrow: "Roster",
    title: "JR Ref Participants",
    description: "Youth officials registered through Fillout — synced to Airtable.",
  },
  {
    href: "/jr-referee-clinics/mentors",
    eyebrow: "Mentorship",
    title: "Mentor Montana Officials",
    description: "Experienced mentors paired with clinic participants.",
  },
  {
    href: "/jr-referee-clinics/teams",
    eyebrow: "Games",
    title: "Teams",
    description: "Teams registered to play in JR Ref clinic games.",
  },
] as const;

export default function JrRefereeClinicsHomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-sm leading-relaxed text-muted">{product?.description}</p>
        <p className="mt-4 text-sm text-muted-subtle">
          Registrations run through Fillout.com into the{" "}
          <span className="text-foreground/80">127SI - JR REF</span> Airtable base — the same
          source of truth that runs the program.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition hover:border-brand-blue/30 hover:bg-card/80"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-blue">
              {section.eyebrow}
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">{section.title}</h2>
            <p className="mt-2 text-sm text-muted">{section.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-muted transition group-hover:text-foreground">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
