/** Hub program definitions — single source for landing cards and product shells. */

export type ProductStatus = "live" | "coming-soon";

export type ProductDefinition = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  status: ProductStatus;
  accent: string;
};

export const HUB_BRAND = {
  title: "Hoop Challenges",
  parentOrg: "127 Sports Intensity",
  tagline: "Train with purpose. Compete with clarity.",
} as const;

export const PRODUCTS: ProductDefinition[] = [
  {
    id: "shooting-challenge",
    name: "Shooting Challenge",
    tagline: "Volume, XP, and season-long progression",
    description:
      "Track makes and attempts, climb levels, and compete on the live leaderboard — built for serious reps.",
    href: "/shooting-challenge",
    status: "live",
    accent: "from-orange-500/20 via-accent/10 to-transparent",
  },
  {
    id: "dribbling-challenge",
    name: "Dribbling Challenge",
    tagline: "Ball-handling intensity, same competitive format",
    description:
      "A parallel challenge structure for dribbling work — launching when the season opens.",
    href: "/dribbling-challenge",
    status: "coming-soon",
    accent: "from-sky-500/15 via-cyan-500/5 to-transparent",
  },
  {
    id: "kids-ref-now",
    name: "Kids Ref Now",
    tagline: "Youth officiating, structured for growth",
    description:
      "Resources and pathways for young referees — integrated here as the program expands.",
    href: "/kids-ref-now",
    status: "coming-soon",
    accent: "from-violet-500/15 via-purple-500/5 to-transparent",
  },
];

export function getProductById(id: string): ProductDefinition | undefined {
  return PRODUCTS.find((product) => product.id === id);
}
