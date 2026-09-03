"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "dashboard-overview", label: "Overview" },
  { id: "dashboard-enrollment", label: "Enrollment" },
  { id: "dashboard-homework", label: "Homework" },
  { id: "dashboard-video", label: "Video" },
  { id: "dashboard-xp", label: "XP" },
  { id: "dashboard-weekly", label: "Weekly" },
  { id: "dashboard-awards", label: "Awards" },
] as const;

export function DashboardSectionNav() {
  return (
    <nav
      aria-label="Dashboard sections"
      className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border/80 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 py-2 backdrop-blur-sm motion-reduce:backdrop-blur-none lg:-mx-0 lg:rounded-[var(--sc-card-radius)] lg:border lg:px-3"
      data-testid="dashboard-section-nav"
    >
      <ul className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <Link
              href={`#${section.id}`}
              className={cn(
                "inline-flex min-h-10 items-center rounded-full px-3 text-xs font-semibold text-muted transition-colors hover:bg-brand-blue/10 hover:text-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
              )}
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
