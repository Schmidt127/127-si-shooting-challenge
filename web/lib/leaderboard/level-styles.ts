export type LevelStyle = {
  label: string;
  gradient: string;
  glow: string;
  text: string;
  ring: string;
};

/**
 * Level badge palette — a single controlled brand ramp (blue → orange → gold),
 * not a rainbow per-tier scheme. Early tiers stay neutral/blue, mid tiers move
 * into brand orange, and only the top two tiers use court-gold as an accent.
 * Tuned for light UI: readable text on light fills; white text only on strong fills.
 */
const LEVEL_STYLES: Record<string, LevelStyle> = {
  Beginner: {
    label: "Beginner",
    gradient: "from-brand-light-gray to-brand-medium-gray/40",
    glow: "shadow-black/10",
    text: "text-muted",
    ring: "ring-border",
  },
  "Rookie Shooter": {
    label: "Rookie",
    gradient: "from-brand-blue/20 to-brand-blue/5",
    glow: "shadow-brand-blue/15",
    text: "text-brand-blue",
    ring: "ring-brand-blue/30",
  },
  "Developing Shooter": {
    label: "Developing",
    gradient: "from-brand-blue/30 to-brand-blue/10",
    glow: "shadow-brand-blue/15",
    text: "text-brand-blue",
    ring: "ring-brand-blue/35",
  },
  "Consistent Shooter": {
    label: "Consistent",
    gradient: "from-brand-blue to-court-navy",
    glow: "shadow-brand-blue/25",
    text: "text-brand-white",
    ring: "ring-brand-blue/45",
  },
  "Dangerous Shooter": {
    label: "Dangerous",
    gradient: "from-brand-blue to-brand-orange/80",
    glow: "shadow-brand-blue/20",
    text: "text-brand-white",
    ring: "ring-brand-blue/40",
  },
  "Hot Hand": {
    label: "Hot Hand",
    gradient: "from-brand-orange/25 to-brand-orange/10",
    glow: "shadow-brand-orange/15",
    text: "text-accent-soft",
    ring: "ring-brand-orange/35",
  },
  Deadeye: {
    label: "Deadeye",
    gradient: "from-brand-orange/35 to-brand-orange/15",
    glow: "shadow-brand-orange/20",
    text: "text-accent-soft",
    ring: "ring-brand-orange/40",
  },
  Sharpshooter: {
    label: "Sharpshooter",
    gradient: "from-brand-orange to-orange-700",
    glow: "shadow-brand-orange/25",
    text: "text-brand-charcoal",
    ring: "ring-brand-orange/45",
  },
  Pro: {
    label: "Pro",
    gradient: "from-brand-orange to-court-tan",
    glow: "shadow-brand-orange/25",
    text: "text-brand-charcoal",
    ring: "ring-brand-orange/50",
  },
  "All-Star": {
    label: "All-Star",
    gradient: "from-court-gold/40 to-brand-orange/25",
    glow: "shadow-court-gold/25",
    text: "text-amber-950",
    ring: "ring-court-gold/40",
  },
  Legend: {
    label: "Legend",
    gradient: "from-court-gold to-brand-orange",
    glow: "shadow-court-gold/30",
    text: "text-brand-charcoal",
    ring: "ring-court-gold/50",
  },
  "G.O.A.T.": {
    label: "G.O.A.T.",
    gradient: "from-court-gold to-brand-orange",
    glow: "shadow-court-gold/35",
    text: "text-brand-charcoal",
    ring: "ring-court-gold/60",
  },
};

const DEFAULT_STYLE: LevelStyle = {
  label: "Unranked",
  gradient: "from-brand-light-gray to-brand-medium-gray/30",
  glow: "shadow-black/10",
  text: "text-muted",
  ring: "ring-border",
};

export function getLevelStyle(levelName: string): LevelStyle {
  const exact = LEVEL_STYLES[levelName.trim()];
  if (exact) return exact;

  const fuzzy = Object.entries(LEVEL_STYLES).find(([key]) =>
    levelName.toLowerCase().includes(key.toLowerCase()),
  );
  if (fuzzy) return fuzzy[1];

  return { ...DEFAULT_STYLE, label: levelName || DEFAULT_STYLE.label };
}

export function getPodiumAccent(rank: number): {
  medal: string;
  bar: string;
  halo: string;
  label: string;
} {
  if (rank === 1) {
    return {
      medal: "I",
      bar: "from-court-gold to-brand-orange",
      halo: "ring-1 ring-court-gold/40",
      label: "1st",
    };
  }
  if (rank === 2) {
    return {
      medal: "II",
      bar: "from-brand-medium-gray to-brand-light-gray",
      halo: "ring-1 ring-border",
      label: "2nd",
    };
  }
  return {
    medal: "III",
    bar: "from-brand-orange to-court-tan",
    halo: "ring-1 ring-brand-orange/35",
    label: "3rd",
  };
}
