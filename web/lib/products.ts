/** Hub program definitions — single source for landing cards and product shells. */

export type ProductStatus = "live" | "coming-soon";

export type ProductDefinition = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  status: ProductStatus;
  /** Short feature bullets for landing cards */
  highlights: string[];
  /** Shown on coming-soon cards, e.g. "December 2026" */
  launchLabel?: string;
};

export const HUB_BRAND = {
  title: "Hoop Challenges",
  parentOrg: "127 Sports Intensity",
  tagline: "Train with purpose. Compete with clarity.",
  description:
    "Structured basketball training programs for athletes, schools, and clubs — built to track reps, reward consistency, and put real competition on the board.",
} as const;

export const HUB_PILLARS = [
  {
    label: "Train",
    title: "Structured reps",
    body: "Clear daily and weekly targets so every session has a purpose — not random gym time.",
  },
  {
    label: "Track",
    title: "Progress you can see",
    body: "XP, levels, and shot counts that reflect the work — visible to athletes and coaches.",
  },
  {
    label: "Compete",
    title: "Leaderboards that matter",
    body: "School and program-wide standings that keep intensity high all season long.",
  },
] as const;

export const PRODUCTS: ProductDefinition[] = [
  {
    id: "shooting-challenge",
    name: "Shooting Challenge",
    tagline: "Volume, XP, and season-long progression",
    description:
      "Track makes and attempts, climb levels, and compete on the live leaderboard — built for serious shooting reps.",
    href: "/shooting-challenge",
    status: "live",
    highlights: ["Live leaderboard", "XP & levels", "Shot tracking"],
  },
  {
    id: "dribbling-challenge",
    name: "Dribble Challenge",
    tagline: "Ball-handling intensity, same competitive format",
    description:
      "A parallel challenge structure for dribbling work — same progression model, new skill focus.",
    href: "/dribbling-challenge",
    status: "coming-soon",
    launchLabel: "December 2026",
    highlights: ["Skill tiers", "XP progression", "Program standings"],
  },
  {
    id: "referee-clinics",
    name: "Referee Clinics",
    tagline: "Youth officiating, structured for growth",
    description:
      "Resources and pathways for young referees — clinics, training, and program tools.",
    href: "/referee-clinics",
    status: "coming-soon",
    highlights: ["Youth pathways", "Training resources", "Clinic schedules"],
  },
];

export function getProductById(id: string): ProductDefinition | undefined {
  return PRODUCTS.find((product) => product.id === id);
}
