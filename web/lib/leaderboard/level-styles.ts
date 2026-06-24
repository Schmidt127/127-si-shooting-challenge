export type LevelStyle = {
  label: string;
  gradient: string;
  glow: string;
  text: string;
  ring: string;
};

const LEVEL_STYLES: Record<string, LevelStyle> = {
  Beginner: {
    label: "Beginner",
    gradient: "from-slate-500/30 to-slate-600/10",
    glow: "shadow-slate-500/20",
    text: "text-slate-200",
    ring: "ring-slate-400/30",
  },
  "Rookie Shooter": {
    label: "Rookie",
    gradient: "from-sky-500/35 to-blue-600/10",
    glow: "shadow-sky-500/25",
    text: "text-sky-200",
    ring: "ring-sky-400/35",
  },
  "Developing Shooter": {
    label: "Developing",
    gradient: "from-cyan-500/35 to-teal-600/10",
    glow: "shadow-cyan-500/25",
    text: "text-cyan-200",
    ring: "ring-cyan-400/35",
  },
  "Consistent Shooter": {
    label: "Consistent",
    gradient: "from-emerald-500/35 to-green-600/10",
    glow: "shadow-emerald-500/25",
    text: "text-emerald-200",
    ring: "ring-emerald-400/35",
  },
  "Dangerous Shooter": {
    label: "Dangerous",
    gradient: "from-lime-500/35 to-green-700/10",
    glow: "shadow-lime-500/25",
    text: "text-lime-200",
    ring: "ring-lime-400/35",
  },
  "Hot Hand": {
    label: "Hot Hand",
    gradient: "from-orange-500/40 to-red-500/15",
    glow: "shadow-orange-500/30",
    text: "text-orange-200",
    ring: "ring-orange-400/40",
  },
  Deadeye: {
    label: "Deadeye",
    gradient: "from-red-500/40 to-rose-600/15",
    glow: "shadow-red-500/30",
    text: "text-red-200",
    ring: "ring-red-400/40",
  },
  Sharpshooter: {
    label: "Sharpshooter",
    gradient: "from-rose-500/40 to-red-700/15",
    glow: "shadow-rose-500/35",
    text: "text-rose-200",
    ring: "ring-rose-400/40",
  },
  Pro: {
    label: "Pro",
    gradient: "from-violet-500/40 to-purple-700/15",
    glow: "shadow-violet-500/35",
    text: "text-violet-200",
    ring: "ring-violet-400/40",
  },
  "All-Star": {
    label: "All-Star",
    gradient: "from-fuchsia-500/40 to-purple-600/15",
    glow: "shadow-fuchsia-500/35",
    text: "text-fuchsia-200",
    ring: "ring-fuchsia-400/40",
  },
  Legend: {
    label: "Legend",
    gradient: "from-amber-400/45 to-orange-500/20",
    glow: "shadow-amber-400/40",
    text: "text-amber-200",
    ring: "ring-amber-300/45",
  },
  "G.O.A.T.": {
    label: "G.O.A.T.",
    gradient: "from-yellow-300/50 to-amber-500/25",
    glow: "shadow-yellow-400/45",
    text: "text-yellow-100",
    ring: "ring-yellow-300/50",
  },
};

const DEFAULT_STYLE: LevelStyle = {
  label: "Unranked",
  gradient: "from-zinc-500/25 to-zinc-700/10",
  glow: "shadow-zinc-500/20",
  text: "text-zinc-300",
  ring: "ring-zinc-400/25",
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
      bar: "from-amber-300 via-yellow-400 to-amber-600",
      halo: "shadow-[0_0_60px_rgba(251,191,36,0.35)]",
      label: "1st",
    };
  }
  if (rank === 2) {
    return {
      medal: "II",
      bar: "from-slate-300 via-slate-200 to-slate-400",
      halo: "shadow-[0_0_50px_rgba(148,163,184,0.28)]",
      label: "2nd",
    };
  }
  return {
    medal: "III",
    bar: "from-orange-400 via-amber-600 to-orange-800",
    halo: "shadow-[0_0_50px_rgba(251,146,60,0.28)]",
    label: "3rd",
  };
}
