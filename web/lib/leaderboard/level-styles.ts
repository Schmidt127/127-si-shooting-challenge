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
 */
const LEVEL_STYLES: Record<string, LevelStyle> = {
  Beginner: {
    label: "Beginner",
    gradient: "from-white/[0.08] to-white/[0.02]",
    glow: "shadow-black/20",
    text: "text-muted",
    ring: "ring-white/15",
  },
  "Rookie Shooter": {
    label: "Rookie",
    gradient: "from-brand-blue/25 to-brand-blue/5",
    glow: "shadow-brand-blue/15",
    text: "text-brand-white",
    ring: "ring-brand-blue/30",
  },
  "Developing Shooter": {
    label: "Developing",
    gradient: "from-brand-blue/35 to-brand-blue/10",
    glow: "shadow-brand-blue/20",
    text: "text-brand-white",
    ring: "ring-brand-blue/35",
  },
  "Consistent Shooter": {
    label: "Consistent",
    gradient: "from-brand-blue/50 to-court-navy/20",
    glow: "shadow-brand-blue/25",
    text: "text-brand-white",
    ring: "ring-brand-blue/45",
  },
  "Dangerous Shooter": {
    label: "Dangerous",
    gradient: "from-brand-blue/45 to-brand-orange/20",
    glow: "shadow-brand-blue/20",
    text: "text-brand-white",
    ring: "ring-brand-blue/40",
  },
  "Hot Hand": {
    label: "Hot Hand",
    gradient: "from-brand-orange/30 to-brand-orange/10",
    glow: "shadow-brand-orange/20",
    text: "text-orange-100",
    ring: "ring-brand-orange/35",
  },
  Deadeye: {
    label: "Deadeye",
    gradient: "from-brand-orange/40 to-orange-700/15",
    glow: "shadow-brand-orange/25",
    text: "text-orange-100",
    ring: "ring-brand-orange/40",
  },
  Sharpshooter: {
    label: "Sharpshooter",
    gradient: "from-brand-orange/50 to-orange-800/20",
    glow: "shadow-brand-orange/30",
    text: "text-orange-50",
    ring: "ring-brand-orange/45",
  },
  Pro: {
    label: "Pro",
    gradient: "from-brand-orange/55 to-court-tan/25",
    glow: "shadow-brand-orange/30",
    text: "text-orange-50",
    ring: "ring-brand-orange/50",
  },
  "All-Star": {
    label: "All-Star",
    gradient: "from-court-gold/35 to-brand-orange/20",
    glow: "shadow-court-gold/30",
    text: "text-amber-100",
    ring: "ring-court-gold/40",
  },
  Legend: {
    label: "Legend",
    gradient: "from-court-gold/50 to-brand-orange/20",
    glow: "shadow-court-gold/35",
    text: "text-amber-50",
    ring: "ring-court-gold/50",
  },
  "G.O.A.T.": {
    label: "G.O.A.T.",
    gradient: "from-court-gold/65 to-brand-orange/25",
    glow: "shadow-court-gold/40",
    text: "text-amber-50",
    ring: "ring-court-gold/60",
  },
};

const DEFAULT_STYLE: LevelStyle = {
  label: "Unranked",
  gradient: "from-white/[0.06] to-white/[0.01]",
  glow: "shadow-black/15",
  text: "text-muted",
  ring: "ring-white/12",
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
      bar: "from-brand-medium-gray to-white/40",
      halo: "ring-1 ring-white/25",
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
