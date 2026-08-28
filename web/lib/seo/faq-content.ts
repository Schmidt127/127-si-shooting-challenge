/**
 * FAQ content for /shoot/faq — factually supported program answers only.
 */

import {
  IN_PERSON_SCOPE,
  PROGRAM_GRADES_SERVED,
  PROGRAM_HOME_LOCATION,
  PROGRAM_IDENTITY,
  REGISTRATION_FACTS,
  REMOTE_PROGRAM_ELEMENTS,
} from "@/lib/seo/program-facts";
import { DAILY_SUBMISSIONS } from "@/lib/registration";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const PROGRAM_FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-shooting-challenge",
    question: "What is the 127 SI Shooting Challenge?",
    answer: `${PROGRAM_IDENTITY.programName} is the flagship ${PROGRAM_IDENTITY.philosophy} program from ${PROGRAM_IDENTITY.orgName}. Once per year, athletes build complete basketball habits through online shooting submissions, weekly homework, video coaching feedback, XP and level goals, and challenge activities — not just shot volume.`,
  },
  {
    id: "grades-served",
    question: "What grades does the program serve?",
    answer: `The Shooting Challenge is designed for boys and girls in ${PROGRAM_GRADES_SERVED}. Leaderboard grade bands may also display enrolled athletes in adjacent school levels when they are active in the program.`,
  },
  {
    id: "boys-and-girls",
    question: "Is the program open to boys and girls?",
    answer: "Yes. The Shooting Challenge welcomes boys and girls who want structured youth basketball shooting development with clear weekly expectations and progress tracking.",
  },
  {
    id: "educational-athletics",
    question: "What is Educational Athletics?",
    answer: `${PROGRAM_IDENTITY.philosophy} is the ${PROGRAM_IDENTITY.orgName} approach: ${PROGRAM_IDENTITY.philosophyTagline} Programs teach consistency, responsibility, communication, and growth mindset through basketball training systems families can follow at home.`,
  },
  {
    id: "daily-submissions",
    question: "How do daily shooting submissions work?",
    answer: `Registered athletes log completed shooting and training activity through the daily submission form (${DAILY_SUBMISSIONS.label}). Submissions feed XP, streaks, milestones, and leaderboard progress when coaches verify activity.`,
  },
  {
    id: "xp-progress",
    question: "How does XP and progress tracking work?",
    answer: "Athletes earn XP for verified homework, shot volume, consistency, Perfect Weeks, and other program milestones. XP unlocks levels from Beginner through G.O.A.T. Progress is visible on the public leaderboard and in the athlete dashboard.",
  },
  {
    id: "video-feedback",
    question: "Is video feedback available?",
    answer: "Yes. Coaches review athlete submissions and provide video feedback as part of the program workflow. Feedback supports skill development and accountability — it is not a substitute for in-person instruction outside your training location.",
  },
  {
    id: "zoom",
    question: "Are Zoom sessions part of the program?",
    answer: "Yes. The Shooting Challenge publishes Zoom meeting schedules, agendas, and recordings on this site. Live check-ins and film review are part of the remote coaching experience families can join from home.",
  },
  {
    id: "location",
    question: "Where is the program based?",
    answer: `${PROGRAM_IDENTITY.orgName} and ${PROGRAM_IDENTITY.clubIdentity} are based in ${PROGRAM_HOME_LOCATION}. ${IN_PERSON_SCOPE}`,
  },
  {
    id: "remote-access",
    question: "Can families participate from outside Fairfield, Montana?",
    answer: `Yes, for supported online program elements: ${REMOTE_PROGRAM_ELEMENTS.join("; ")}. We do not claim in-person coaching or facilities outside the Fairfield, Montana area.`,
  },
  {
    id: "registration",
    question: "How do I register?",
    answer: `Families enroll through the ${REGISTRATION_FACTS.label} form at ${REGISTRATION_FACTS.url}. After registration, use the daily submission form to log shooting and training activity.`,
  },
];
