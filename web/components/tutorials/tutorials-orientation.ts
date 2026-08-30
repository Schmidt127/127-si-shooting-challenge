export const TUTORIALS_ORIENTATION_STEPS = [
  {
    title: "Pick a clip",
    description:
      "Browse by format or skill area. Each card shows whether the video plays on this site or opens elsewhere.",
  },
  {
    title: "Watch in-page when available",
    description:
      "YouTube, Vimeo, and direct video files play inside the tutorial page — no extra tabs required.",
  },
  {
    title: "Follow external links when needed",
    description:
      "Adobe documents, PDFs, and other hosted resources open in a new tab with a clear label on the card.",
  },
  {
    title: "Read the breakdown",
    description:
      "Every tutorial includes written coaching notes when published, even if the video link is still coming.",
  },
] as const;

export const TUTORIALS_MEDIA_GUIDE = [
  {
    term: "Watch in-page",
    definition:
      "The clip embeds on the tutorial detail page. Look for the play badge on the card thumbnail.",
  },
  {
    term: "Open externally",
    definition:
      "The resource lives on another site (YouTube channel page, Adobe, PDF host). The card shows where it opens.",
  },
  {
    term: "Details available",
    definition:
      "Written breakdown is live; the video link will appear on the card when coaches publish it.",
  },
] as const;
