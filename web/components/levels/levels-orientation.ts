export const LEVELS_TERMINOLOGY = [
  {
    term: "Level",
    definition:
      "Your place on the ladder (Levels 1–12). The number on each card is the configured Sort Order — the same step shown on the public leaderboard and athlete profiles.",
  },
  {
    term: "Current level",
    definition:
      "The highest level you have officially reached. Check the public leaderboard or your athlete’s public profile, then find that level number in this list.",
  },
  {
    term: "Next level",
    definition:
      "The next step above your current level. Each card names the following level so you can see what comes next.",
  },
  {
    term: "Gate",
    definition:
      "Extra requirements beyond lifetime XP that may be required to advance — for example Zoom attendance or Perfect Week completion. When no gate text is published, reaching the XP threshold is enough.",
  },
] as const;

export const LEVELS_ORIENTATION_STEPS = [
  {
    title: "Find your current level",
    description:
      "Use the public leaderboard or a public athlete profile to see the level reached, then find that level number in this ladder for its configured XP threshold and gate details.",
  },
  {
    title: "Look ahead to the next level",
    description:
      "Each card names the next level in the ladder and shows the XP still ahead. Gates for that tier are summarized on the card and expanded on the detail page.",
  },
  {
    title: "Read the advance requirements",
    description:
      "Each card summarizes gate criteria from the program configuration — XP plus any Zoom, Perfect Week, or other published requirements. Open a level for the full checklist.",
  },
  {
    title: "Advance one step at a time",
    description:
      "Keep building XP and complete the gates for the next level. This ladder and each level detail page are the source for the current path.",
  },
] as const;
