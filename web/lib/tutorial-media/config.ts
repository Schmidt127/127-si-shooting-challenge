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

export const SHOUTOUTS_SECTION: TutorialMediaSectionConfig = {
  basePath: "/shoutouts",
  ambientVariant: "shoutouts",
  catalog: {
    eyebrow: "Athlete spotlight",
    title: "Shout",
    titleAccent: "outs",
    subtitle: "Celebrate athletes in the challenge — features, highlights, and encouragement.",
    itemCountLabel: "shoutouts",
    cardCta: "Read shoutout",
  },
  detail: {
    backLabel: "All shoutouts",
    watchLabel: "Watch",
    watchTitle: "Featured clip",
    deepDiveLabel: "Story",
    deepDiveTitle: "Full shoutout",
    openVideoLabel: "Open video in new tab",
  },
  empty: {
    title: "No shoutouts published yet",
    message: "Mark shoutouts OK to Publish on Softr and they will appear here.",
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
  },
  detail: {
    backLabel: "All articles",
    watchLabel: "Read",
    watchTitle: "Article",
    deepDiveLabel: "Reading",
    deepDiveTitle: "Full article",
    openVideoLabel: "Open article",
    externalDocumentHint:
      "This article is hosted on Adobe. Open it in a new tab for the full reading experience.",
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
