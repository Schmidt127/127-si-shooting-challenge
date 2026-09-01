/**
 * FAQ content for /shoot/faq — factually supported program answers only.
 */

import {
  CHALLENGE_DATES,
  CHALLENGE_SEASON_LABEL,
  IN_PERSON_SCOPE,
  PROGRAM_GRADES_SERVED,
  PROGRAM_HOME_LOCATION,
  PROGRAM_IDENTITY,
  REGISTRATION_FACTS,
} from "@/lib/seo/program-facts";
import { DAILY_SUBMISSIONS } from "@/lib/registration";
import { GIFT_CARD_AWARD_COMMITMENT } from "@/lib/seo/public-program-content";

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
    answer: `The Shooting Challenge is designed for boys and girls in ${PROGRAM_GRADES_SERVED}. Eligibility is based on grade level — not where you live. Leaderboard grade bands group athletes for standings display only; they may include enrolled athletes in adjacent school levels when those athletes are active in the program. Adjacent levels on the leaderboard do not expand who may register.`,
  },
  {
    id: "boys-and-girls",
    question: "Is the program open to boys and girls?",
    answer:
      "Yes. The Shooting Challenge welcomes boys and girls who want structured youth basketball shooting development with clear weekly expectations and progress tracking.",
  },
  {
    id: "educational-athletics",
    question: "What is Educational Athletics?",
    answer: `${PROGRAM_IDENTITY.philosophy} is the ${PROGRAM_IDENTITY.orgName} approach: ${PROGRAM_IDENTITY.philosophyTagline} Programs teach consistency, responsibility, communication, and growth mindset through basketball training systems families can follow at home.`,
  },
  {
    id: "challenge-timing",
    question: "When does the challenge run, and what is Early Bird?",
    answer: `The official ${CHALLENGE_SEASON_LABEL} runs ${CHALLENGE_DATES}. Registration may open earlier with published Early Bird pricing when Early Bird rates and deadlines appear on this site. Early Bird is a registration pricing window — the official challenge season itself remains ${CHALLENGE_DATES}.`,
  },
  {
    id: "daily-submissions",
    question: "How do daily shooting submissions work?",
    answer: `Registered athletes log completed shooting and training activity through the daily submission form (${DAILY_SUBMISSIONS.label}). Submissions feed XP, streaks, milestones, and leaderboard progress when coaches verify activity.`,
  },
  {
    id: "xp-progress",
    question: "How does XP and progress tracking work?",
    answer:
      "Athletes earn XP for verified homework, shot volume, consistency, Perfect Weeks, and other program milestones. XP unlocks levels from Beginner through G.O.A.T. Families can follow progress on the public leaderboard and on public athlete profiles when a family chooses to share one.",
  },
  {
    id: "weekly-homework",
    question: "What is weekly homework?",
    answer:
      "Each challenge week includes homework assignments that reinforce skill, knowledge, and accountability. Families find published assignments on the Homework page. Completing homework on time earns XP and supports Perfect Week progress.",
  },
  {
    id: "video-feedback",
    question: "Is video feedback available?",
    answer:
      "Yes. Athletes submit shooting videos during the challenge, and coaches review them on a challenge schedule — not as instant replies. Feedback is part of the program — not an on-demand private lesson service — and it is not a substitute for in-person coaching outside your own training location.",
  },
  {
    id: "zoom",
    question: "Are Zoom sessions part of the program?",
    answer:
      "Yes. The Shooting Challenge publishes Zoom meeting schedules, agendas, and recordings on this site when sessions are scheduled. Families can join live check-ins or use recordings for makeup credit when offered.",
  },
  {
    id: "privacy",
    question: "What information is shown publicly?",
    answer:
      "Public standings and athlete profiles show approved game-related progress only — such as name, level, XP, and shots when a family shares a public profile. Parent contact details, payment information, and private submission metadata are never published on this site. Registration consent covers name, image, and likeness for program promotion.",
  },
  {
    id: "location",
    question: "Where is the program based?",
    answer: `${PROGRAM_IDENTITY.orgName} and ${PROGRAM_IDENTITY.clubIdentity} are based in ${PROGRAM_HOME_LOCATION}. ${IN_PERSON_SCOPE}`,
  },
  {
    id: "remote-access",
    question: "Can families participate from outside Fairfield, Montana?",
    answer: `Yes. The Shooting Challenge runs 100% online, so families can participate from anywhere with a basketball, a place to shoot, and internet access. That includes daily submissions, weekly homework, tutorials, video feedback, Zoom sessions when scheduled, and XP, levels, achievements, and leaderboard progress. We do not claim in-person coaching or facilities outside the Fairfield, Montana area.`,
  },
  {
    id: "registration",
    question: "How do I register?",
    answer: `Families enroll through the ${REGISTRATION_FACTS.label} form at ${REGISTRATION_FACTS.url}. After registration, use the daily submission form to log shooting and training activity.`,
  },
  {
    id: "gift-card-commitment",
    question: "What is the program's gift card award commitment?",
    answer: GIFT_CARD_AWARD_COMMITMENT.paragraphs.join(" "),
  },
];
