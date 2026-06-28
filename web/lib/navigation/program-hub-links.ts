import type { ComponentType } from "react";

import {
  IconBook,
  IconLevel,
  IconMedal,
  IconMegaphone,
  IconMonitor,
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
  icon: ComponentType<{ size?: number; className?: string }>;
  featured?: boolean;
};

/** Overview hub cards — mirrors ProductShell nav (see site-hierarchy.md). */
export const PROGRAM_HUB_LINKS: ProgramHubLink[] = [
  {
    href: "/leaderboard",
    label: "Primary",
    title: "Leaderboard",
    description: "Live season rankings — level, XP, and total shots decide who leads.",
    eyebrow: "Compete",
    icon: IconTrophy,
    featured: true,
  },
  {
    href: "/homework",
    label: "Curriculum",
    title: "Homework",
    description: "Weekly assignments from the challenge curriculum.",
    eyebrow: "Study",
    icon: IconBook,
  },
  {
    href: "/tutorials",
    label: "Film room",
    title: "Tutorials",
    description: "Technique videos and shooting breakdowns.",
    eyebrow: "Watch",
    icon: IconPlay,
  },
  {
    href: "/shoutouts",
    label: "Spotlight",
    title: "Shoutouts",
    description: "Celebrate athletes with features and highlights.",
    eyebrow: "Celebrate",
    icon: IconMegaphone,
  },
  {
    href: "/articles",
    label: "Read",
    title: "Articles",
    description: "FBC book chapters and shooting concepts to study off the court.",
    eyebrow: "Learn",
    icon: IconNews,
  },
  {
    href: "/zoom-meetings",
    label: "Live",
    title: "Zoom Meetings",
    description: "Clinic calls, recordings, and weekly check-ins with coaches.",
    eyebrow: "Connect",
    icon: IconVideoCall,
  },
  {
    href: "/levels",
    label: "Progression",
    title: "Levels",
    description: "Climb from Beginner to G.O.A.T. — XP thresholds for every tier.",
    eyebrow: "Level up",
    icon: IconLevel,
  },
  {
    href: "/achievements",
    label: "Badges",
    title: "Achievements",
    description: "Milestones, streaks, and secret unlocks you can earn this season.",
    eyebrow: "Earn",
    icon: IconMedal,
  },
  {
    href: "/game-manual",
    label: "Rules",
    title: "Game Manual",
    description: "Official scoring, XP rules, and program reference.",
    eyebrow: "Reference",
    icon: IconScroll,
  },
  {
    href: "/public-display",
    label: "Gym mode",
    title: "Public Display",
    description: "Full-screen leaderboard for gyms, lobbies, and event screens.",
    eyebrow: "Display",
    icon: IconMonitor,
  },
];
