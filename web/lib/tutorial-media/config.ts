import type { AmbientPageProps } from "@/components/catalog/ambient-page";

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
  };
  detail: {
    backLabel: string;
    watchLabel: string;
    watchTitle: string;
    deepDiveLabel: string;
    deepDiveTitle: string;
    openVideoLabel: string;
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

export const SHOUTOUTS_SECTION: TutorialMediaSectionConfig = {
  basePath: "/shoutouts",
  ambientVariant: "shoutouts",
  catalog: {
    eyebrow: "Athlete spotlight",
    title: "Shout",
    titleAccent: "outs",
    subtitle: "Celebrate athletes in the challenge — quick features, highlights, and encouragement.",
    itemCountLabel: "features",
    cardCta: "Read shout-out",
  },
  detail: {
    backLabel: "All shout-outs",
    watchLabel: "Watch",
    watchTitle: "Featured clip",
    deepDiveLabel: "Story",
    deepDiveTitle: "Full shout-out",
    openVideoLabel: "Open video in new tab",
  },
  empty: {
    title: "No shout-outs published yet",
    message: "Mark shout-outs OK to Publish on Softr and they will appear here.",
  },
  error: {
    title: "Could not load shout-outs",
  },
  notFound: {
    title: "Shout-out not found",
    message: "This feature may be unpublished or the link is incorrect.",
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
  },
  detail: {
    backLabel: "All articles",
    watchLabel: "Watch",
    watchTitle: "Companion video",
    deepDiveLabel: "Reading",
    deepDiveTitle: "Full article",
    openVideoLabel: "Open companion video",
  },
  empty: {
    title: "No articles published yet",
    message: "Mark article book entries OK to Publish on Softr and they will appear here.",
  },
  error: {
    title: "Could not load articles",
  },
  notFound: {
    title: "Article not found",
    message: "This article may be unpublished or the link is incorrect.",
  },
};
