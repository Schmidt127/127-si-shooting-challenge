import type { ComponentType } from "react";

import {
  IconBook,
  IconBolt,
  IconHelp,
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
  /** Descriptive link text for hub cards (FUT-023). */
  linkLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  featured?: boolean;
};

/** Overview hub cards — mirrors ProductShell nav (see site-hierarchy.md). */
export const PROGRAM_HUB_LINKS: ProgramHubLink[] = [
  {
    href: "/dashboard",
    label: "Home",
    title: "Athlete Dashboard",
    description: "Level, XP, weekly shots, streak, Perfect Week, homework, and your next action.",
    eyebrow: "Program home",
    linkLabel: "Open athlete dashboard",
    icon: IconBolt,
    featured: true,
  },
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
    description: "Clinic calls, recordings, recording-credit makeup info, and weekly check-ins.",
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
  {
    href: "/faq",
    label: "Answers",
    title: "Program FAQ",
    description: "Grades served, registration, daily submissions, and Fairfield Montana context.",
    eyebrow: "Help",
    linkLabel: "Read program FAQ",
    icon: IconHelp,
  },
  {
    href: "/public-display",
    label: "Gym mode",
    title: "Public Display",
    description: "Full-screen leaderboard for gyms, lobbies, and event screens.",
    eyebrow: "Display",
    linkLabel: "Open gym display mode",
    icon: IconMonitor,
  },
];
