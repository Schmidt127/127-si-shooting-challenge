import { describe, expect, it } from "vitest";

import { PUBLIC_SITE_ORIGIN } from "@/lib/app-config";

import {
  buildBreadcrumbListJsonLd,
  buildCatalogRouteJsonLd,
  buildCollectionPageJsonLd,
  buildDetailRouteJsonLd,
  CATALOG_SEO_SECTIONS,
} from "./structured-data";

describe("buildBreadcrumbListJsonLd", () => {
  it("emits ordered ListItem nodes with canonical URLs", () => {
    const jsonLd = buildBreadcrumbListJsonLd(CATALOG_SEO_SECTIONS.homework.breadcrumbs);
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>;

    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(items).toHaveLength(2);
    expect(items[0]?.position).toBe(1);
    expect(items[0]?.name).toBe("Shooting Challenge");
    expect(items[0]?.item).toBe(PUBLIC_SITE_ORIGIN);
    expect(items[1]?.item).toBe(`${PUBLIC_SITE_ORIGIN}/homework`);
  });
});

describe("buildCollectionPageJsonLd", () => {
  it("links collection pages to the program WebSite node", () => {
    const jsonLd = buildCollectionPageJsonLd(CATALOG_SEO_SECTIONS.leaderboard.collection);

    expect(jsonLd["@type"]).toBe("CollectionPage");
    expect(jsonLd.url).toBe(`${PUBLIC_SITE_ORIGIN}/leaderboard`);
    expect(jsonLd.isPartOf).toEqual({ "@id": `${PUBLIC_SITE_ORIGIN}/#website` });
    expect(jsonLd.about).toEqual({ "@id": `${PUBLIC_SITE_ORIGIN}/#sports-program` });
  });
});

describe("buildCatalogRouteJsonLd", () => {
  it("returns a graph with collection and breadcrumb nodes", () => {
    const homework = buildCatalogRouteJsonLd("homework");
    const graph = homework["@graph"] as Array<Record<string, unknown>>;

    expect(homework["@context"]).toBe("https://schema.org");
    expect(graph.some((node) => node["@type"] === "CollectionPage")).toBe(true);
    expect(graph.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
    expect(JSON.stringify(homework)).not.toMatch(/rec[a-zA-Z0-9]{14}/);
  });
});

describe("buildDetailRouteJsonLd", () => {
  it("adds a third breadcrumb for detail pages", () => {
    const jsonLd = buildDetailRouteJsonLd({
      section: "homework",
      itemName: "Week 1 — Form Fundamentals",
      itemDescription: "Homework assignment for week one.",
      itemPath: "/homework/recTestHomework01",
    });
    const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;
    const breadcrumb = graph.find((node) => node["@type"] === "BreadcrumbList");
    const items = breadcrumb?.itemListElement as Array<Record<string, unknown>>;

    expect(items).toHaveLength(3);
    expect(items[2]?.name).toBe("Week 1 — Form Fundamentals");
    expect(items[2]?.item).toBe(`${PUBLIC_SITE_ORIGIN}/homework/recTestHomework01`);
  });
});
