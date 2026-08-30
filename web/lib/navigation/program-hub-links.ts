import type { ComponentType } from "react";

import {
  IconBook,
  IconHelp,
  IconLevel,
  IconMedal,
  IconMegaphone,
  IconNews,
  IconPlay,
  IconScroll,
  IconTrophy,
  IconVideoCall,
} from "@/components/icons/shoot-icons";

export type ProgramHubLink = {
  href: string;
  label: string;
  title: string;
  description: string;
  eyebrow: string;
  /** Descriptive link text for hub cards (FUT-023). */
  linkLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  featured?: boolean;
};

/**
 * Overview hub cards — mirrors ProductShell public nav (see site-hierarchy.md).
 * Dashboard (demo) and Public Display (gym/kiosk) are omitted from family-facing hubs.
 */
export const PROGRAM_HUB_LINKS: ProgramHubLink[] = [
  {
    href: "/leaderboard",
    label: "Primary",
    title: "Leaderboard",
    description: "Live season rankings — level, XP, and total shots decide who leads.",
    eyebrow: "Compete",
    linkLabel: "View season leaderboard",
    icon: IconTrophy,
    featured: true,
  },
  {
    href: "/faq",
    label: "Answers",
    title: "Program FAQ",
    description: "Grades served, registration, daily submissions, homework, and privacy.",
    eyebrow: "Help",
    linkLabel: "Read program FAQ",
    icon: IconHelp,
    featured: true,
  },
  {
    href: "/homework",
    label: "Curriculum",
    title: "Homework",
    description: "Weekly assignments from the challenge curriculum.",
    eyebrow: "Study",
    linkLabel: "Browse weekly homework",
    icon: IconBook,
  },
  {
    href: "/tutorials",
    label: "Film room",
    title: "Skills and Technique Tutorials",
    description: "Technique videos and shooting breakdowns.",
    eyebrow: "Watch",
    linkLabel: "Watch shooting tutorials",
    icon: IconPlay,
  },
  {
    href: "/shoutouts",
    label: "Spotlight",
    title: "Shoutouts",
    description: "Celebrate athletes with features and highlights.",
    eyebrow: "Celebrate",
    linkLabel: "Read athlete shoutouts",
    icon: IconMegaphone,
  },
  {
    href: "/articles",
    label: "Read",
    title: "Articles",
    description: "FBC book chapters and shooting concepts to study off the court.",
    eyebrow: "Learn",
    linkLabel: "Read FBC articles",
    icon: IconNews,
  },
  {
    href: "/zoom-meetings",
    label: "Live",
    title: "Zoom Meetings",
    description: "Clinic calls, recordings, makeup-credit info, and weekly check-ins.",
    eyebrow: "Connect",
    linkLabel: "View Zoom meetings",
    icon: IconVideoCall,
  },
  {
    href: "/levels",
    label: "Progression",
    title: "Levels",
    description: "Climb from Beginner to G.O.A.T. — XP thresholds for every tier.",
    eyebrow: "Level up",
    linkLabel: "Explore XP levels",
    icon: IconLevel,
  },
  {
    href: "/achievements",
    label: "Badges",
    title: "Achievements",
    description: "Milestones, streaks, and secret unlocks you can earn this season.",
    eyebrow: "Earn",
    linkLabel: "View achievements",
    icon: IconMedal,
  },
  {
    href: "/game-manual",
    label: "Rules",
    title: "Game Manual",
    description: "Official scoring, XP rules, and program reference.",
    eyebrow: "Reference",
    linkLabel: "Open game manual",
    icon: IconScroll,
  },
];
