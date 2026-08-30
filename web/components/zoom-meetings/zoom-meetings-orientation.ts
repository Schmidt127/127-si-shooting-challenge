export const ZOOM_TERMINOLOGY = [
  {
    term: "Live session",
    definition:
      "A scheduled Zoom call with a join link. Attend live to earn live attendance XP when the coach marks attendance.",
  },
  {
    term: "Recording",
    definition:
      "Video or audio replay published after the call. Watching alone does not award XP — complete the Zoom Recording Quiz when links are available.",
  },
  {
    term: "Week archive",
    definition:
      "Meetings grouped by challenge week, newest week first. Each card shows that week's session schedule and any published recordings.",
  },
  {
    term: "Meeting status",
    definition:
      "Scheduled means the call is upcoming or in progress; Completed means the live window has passed. Recording links may appear after completion.",
  },
] as const;

export const ZOOM_ORIENTATION_STEPS = [
  {
    title: "Find this week's session",
    description:
      "The current week appears at the top. Open a card for the start time, host, agenda, and join link when the meeting is scheduled.",
  },
  {
    title: "Join live when the link is active",
    description:
      "Use Join Zoom meeting on the card or detail page during the scheduled window. Live attendance XP posts separately from recording credit.",
  },
  {
    title: "Catch up with a recording",
    description:
      "When video or audio links are published, watch from the card or detail page, then complete the Zoom Recording Quiz for makeup XP.",
  },
  {
    title: "One credit path per meeting",
    description:
      "Live attendance and recording makeup credit cannot both apply for the same meeting. Pick the path that matches how you participated.",
  },
] as const;
