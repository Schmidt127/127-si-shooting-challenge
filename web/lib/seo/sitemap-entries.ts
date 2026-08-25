import type { MetadataRoute } from "next";

import { fetchScheduledHomeworkCatalog } from "@/lib/airtable/homework-queries";
import {
  fetchArticleCatalog,
  fetchLevelLadder,
  fetchShoutoutCatalog,
  fetchTutorialCatalog,
  fetchZoomMeetingCatalog,
} from "@/lib/airtable/queries";
import type { TutorialCatalogData } from "@/types/tutorials";
import type { ZoomMeetingCatalogData } from "@/types/zoom-meetings";

import { canonicalUrl, SITEMAP_PUBLIC_ROUTES } from "./metadata";

const AIRTABLE_RECORD_ID = /^rec[a-zA-Z0-9]{14}$/;

function isPublicAirtableRecordId(id: string): boolean {
  return AIRTABLE_RECORD_ID.test(id);
}

function tutorialCatalogSitemapEntries(
  catalog: TutorialCatalogData,
  pathPrefix: string,
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  const lastModified = new Date(catalog.updatedAt);

  for (const group of catalog.categoryGroups) {
    for (const item of group.tutorials) {
      if (!isPublicAirtableRecordId(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      entries.push({
        url: canonicalUrl(`${pathPrefix}/${item.id}`),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}

function zoomCatalogSitemapEntries(catalog: ZoomMeetingCatalogData): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  const lastModified = new Date(catalog.updatedAt);

  for (const group of catalog.weekGroups) {
    for (const meeting of group.meetings) {
      if (!isPublicAirtableRecordId(meeting.id) || seen.has(meeting.id)) continue;
      seen.add(meeting.id);
      entries.push({
        url: canonicalUrl(`/zoom-meetings/${meeting.id}`),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.55,
      });
    }
  }

  return entries;
}

export function buildStaticSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date();

  return SITEMAP_PUBLIC_ROUTES.map((path, index) => ({
    url: canonicalUrl(path),
    lastModified: now,
    changeFrequency:
      index === 0 || path === "/leaderboard" ? "daily" : "weekly",
    priority: index === 0 ? 1 : path === "/leaderboard" ? 0.9 : 0.7,
  }));
}

/** Published catalog rows only — each fetch fails closed and is omitted on error. */
export async function buildDynamicSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const homeworkCatalog = await fetchScheduledHomeworkCatalog();
    const seenHomework = new Set<string>();
    const homeworkUpdated = new Date(homeworkCatalog.updatedAt);

    for (const group of homeworkCatalog.weekGroups) {
      for (const assignment of group.assignments) {
        if (!isPublicAirtableRecordId(assignment.id) || seenHomework.has(assignment.id)) {
          continue;
        }
        seenHomework.add(assignment.id);
        entries.push({
          url: canonicalUrl(`/homework/${assignment.id}`),
          lastModified: homeworkUpdated,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // Scheduled PHA + library rows only — omit when catalog cannot be validated.
  }

  try {
    const tutorialCatalog = await fetchTutorialCatalog();
    entries.push(...tutorialCatalogSitemapEntries(tutorialCatalog, "/tutorials"));
  } catch {
    // Published tutorials only (`OK to Publish on Softr` + category filter).
  }

  try {
    const shoutoutCatalog = await fetchShoutoutCatalog();
    entries.push(...tutorialCatalogSitemapEntries(shoutoutCatalog, "/shoutouts"));
  } catch {
    // Published shoutouts only.
  }

  try {
    const articleCatalog = await fetchArticleCatalog();
    entries.push(...tutorialCatalogSitemapEntries(articleCatalog, "/articles"));
  } catch {
    // Published articles only.
  }

  try {
    const zoomCatalog = await fetchZoomMeetingCatalog();
    entries.push(...zoomCatalogSitemapEntries(zoomCatalog));
  } catch {
    // Public zoom meetings only (view/filter excludes cancelled).
  }

  try {
    const ladder = await fetchLevelLadder();
    const levelUpdated = new Date(ladder.updatedAt);

    for (const level of ladder.levels) {
      if (!isPublicAirtableRecordId(level.id)) continue;
      entries.push({
        url: canonicalUrl(`/levels/${level.id}`),
        lastModified: levelUpdated,
        changeFrequency: "monthly",
        priority: 0.55,
      });
    }
  } catch {
    // Active levels only (`Active?` on Levels table).
  }

  return entries;
}

export async function buildFullSitemap(): Promise<MetadataRoute.Sitemap> {
  const [staticEntries, dynamicEntries] = await Promise.all([
    buildStaticSitemapEntries(),
    buildDynamicSitemapEntries(),
  ]);

  return [...staticEntries, ...dynamicEntries];
}
