import type { AmbientPageProps } from "@/components/catalog/ambient-page";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";

export type TutorialMediaSectionConfig = {
  basePath: string;
  ambientVariant: NonNullable<AmbientPageProps["variant"]>;
  catalog: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    itemCountLabel: string;
    cardCta: string;
    cardCtaUnavailable: string;
  };
  detail: {
    backLabel: string;
    watchLabel: string;
    watchTitle: string;
    deepDiveLabel: string;
    deepDiveTitle: string;
    openVideoLabel: string;
    unavailableTitle: string;
    unavailableMessage: string;
    externalDocumentHint?: string;
  };
  empty: {
    title: string;
    message: string;
  };
  error: {
    title: string;
  };
  notFound: {
    title: string;
    message: string;
  };
};

export const TUTORIALS_SECTION: TutorialMediaSectionConfig = {
  basePath: "/tutorials",
  ambientVariant: "tutorials",
  catalog: {
    eyebrow: "Film room",
    title: "Skills and Technique Tutorials",
    titleAccent: "",
    subtitle: "Shooting technique tutorials and film breakdowns — curated for the challenge.",
    itemCountLabel: "clips",
    cardCta: "Watch & read",
    cardCtaUnavailable: "View tutorial",
  },
  detail: {
    backLabel: "All tutorials",
    watchLabel: "Watch",
    watchTitle: "Technique in motion",
    deepDiveLabel: "Deep dive",
    deepDiveTitle: "Full breakdown",
    openVideoLabel: "Open video in new tab",
    unavailableTitle: "Video coming soon",
    unavailableMessage: "This tutorial will play here when a video link is published.",
  },
  empty: {
    title: EMPTY_STATE_COPY.tutorials.title,
    message: EMPTY_STATE_COPY.tutorials.description,
  },
  error: {
    title: "Could not load tutorials",
  },
  notFound: {
    title: "Tutorial not found",
    message: "This clip may be unpublished or the link is incorrect.",
  },
};

export const SHOUTOUTS_SECTION: TutorialMediaSectionConfig = {
  basePath: "/shoutouts",
  ambientVariant: "shoutouts",
  catalog: {
    eyebrow: "Athlete spotlight",
    title: "Shout",
    titleAccent: "outs",
    subtitle: "Celebrate athletes in the challenge — features, highlights, and encouragement.",
    itemCountLabel: "shoutouts",
    cardCta: "Watch shoutout",
    cardCtaUnavailable: "Read shoutout",
  },
  detail: {
    backLabel: "All shoutouts",
    watchLabel: "Watch",
    watchTitle: "Featured clip",
    deepDiveLabel: "Story",
    deepDiveTitle: "Full shoutout",
    openVideoLabel: "Open video in new tab",
    unavailableTitle: "Video coming soon",
    unavailableMessage: "This shoutout will play here when a video link is published.",
  },
  empty: {
    title: EMPTY_STATE_COPY.shoutouts.title,
    message: EMPTY_STATE_COPY.shoutouts.description,
  },
  error: {
    title: "Could not load shoutouts",
  },
  notFound: {
    title: "Shoutout not found",
    message: "This shoutout may be unpublished or the link is incorrect.",
  },
};

export const ARTICLES_SECTION: TutorialMediaSectionConfig = {
  basePath: "/articles",
  ambientVariant: "articles",
  catalog: {
    eyebrow: "Faith & character",
    title: "Article",
    titleAccent: "book",
    subtitle: "FBC article book readings and reflections — faith, mindset, and character for athletes.",
    itemCountLabel: "articles",
    cardCta: "Read article",
    cardCtaUnavailable: "View article",
  },
  detail: {
    backLabel: "All articles",
    watchLabel: "Read",
    watchTitle: "Article",
    deepDiveLabel: "Reading",
    deepDiveTitle: "Full article",
    openVideoLabel: "Open article",
    unavailableTitle: "Reading coming soon",
    unavailableMessage: "This article will appear here when a link is published.",
    externalDocumentHint:
      "This article is hosted on Adobe. Open it in a new tab for the full reading experience.",
  },
  empty: {
    title: EMPTY_STATE_COPY.articles.title,
    message: EMPTY_STATE_COPY.articles.description,
  },
  error: {
    title: "Could not load articles",
  },
  notFound: {
    title: "Article not found",
    message: "This article may be unpublished or the link is incorrect.",
  },
};
