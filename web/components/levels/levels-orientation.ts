/** Concise progress framing for the public levels ladder (SC-164). */
export const LEVELS_PROGRESS_INTRO =
  "Find your athlete's current level on the public leaderboard or profile, then use this ladder for that tier and the next one — lifetime XP plus any published gates.";

export const LEVELS_PROGRESS_POINTS = [
  {
    term: "Current level",
    definition:
      "The highest published level reached. Match that step number here for the XP threshold and any advance requirements.",
  },
  {
    term: "Next level",
    definition:
      "The step above your current level. Expand its gate details first — that is usually what you are working toward.",
  },
  {
    term: "Gates",
    definition:
      "Extra requirements beyond lifetime XP (for example Zoom attendance or Perfect Week). When no gate text is published, the XP threshold is enough.",
  },
] as const;
