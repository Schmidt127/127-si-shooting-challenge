import { afterEach, describe, expect, it, vi } from "vitest";

import { PUBLIC_SITE_ORIGIN } from "@/lib/app-config";

import {
  buildDynamicSitemapEntries,
  buildFullSitemap,
  buildStaticSitemapEntries,
} from "./sitemap-entries";

vi.mock("@/lib/airtable/homework-queries", () => ({
  fetchScheduledHomeworkCatalog: vi.fn(),
}));

vi.mock("@/lib/airtable/queries", () => ({
  fetchTutorialCatalog: vi.fn(),
  fetchShoutoutCatalog: vi.fn(),
  fetchArticleCatalog: vi.fn(),
  fetchZoomMeetingCatalog: vi.fn(),
  fetchLevelLadder: vi.fn(),
}));

import { fetchScheduledHomeworkCatalog } from "@/lib/airtable/homework-queries";
import {
  fetchArticleCatalog,
  fetchLevelLadder,
  fetchShoutoutCatalog,
  fetchTutorialCatalog,
  fetchZoomMeetingCatalog,
} from "@/lib/airtable/queries";

const HOMEWORK_ID = "rechVLOeyEVIqmy2v";
const TUTORIAL_ID = "recTutoria0000001";
const SHOUTOUT_ID = "recK7BDVSpHy2ipCS";
const ARTICLE_ID = "recArticle0000001";
const ZOOM_ID = "recZoomMeeting001";
const LEVEL_ID = "recWeVrSabnsYaHc2";
const ATHLETE_PATH = `${PUBLIC_SITE_ORIGIN}/athletes/testing-schmidt`;

describe("buildStaticSitemapEntries", () => {
  it("lists approved public program routes only", () => {
    const entries = buildStaticSitemapEntries();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(PUBLIC_SITE_ORIGIN);
    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/leaderboard`);
    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/homework`);
    expect(urls).not.toContain(`${PUBLIC_SITE_ORIGIN}/dashboard`);
    expect(urls).not.toContain(`${PUBLIC_SITE_ORIGIN}/public-display`);
    expect(urls).not.toContain(ATHLETE_PATH);
  });
});

describe("buildDynamicSitemapEntries", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes only published catalog record URLs", async () => {
    vi.mocked(fetchScheduledHomeworkCatalog).mockResolvedValue({
      weekGroups: [
        {
          weekId: "recWeek00000001",
          weekName: "Week 1",
          weekNumber: 1,
          weekStartDate: null,
          assignments: [
            {
              id: HOMEWORK_ID,
              phaId: "recPha000000001",
              title: "Form shooting",
              displayName: "Form shooting",
              briefDescription: "Daily form work.",
              instructionsPreview: "Form shooting",
              weekId: "recWeek00000001",
              weekName: "Week 1",
              weekNumber: 1,
              weekStartDate: null,
              weekEndDate: null,
              homeworkNumber: "HW1",
              assignmentNumber: 1,
              order: 1,
              homeworkSlot: "HW1",
              dueDate: null,
              gradeBands: [],
              submissionRequirement: null,
              operatorNotes: null,
              book: "",
              bookAbbreviation: "",
              topics: [],
              coverImage: null,
              url: "",
              urlAdditional: "",
              gradeBandLabel: "",
              fullDescription: "",
              assignmentDescription: "",
              specificSteps: "",
              assignmentRationale: "",
              ageAppropriate: [],
              docs: [],
            },
          ],
        },
      ],
      totalAssignments: 1,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });

    vi.mocked(fetchTutorialCatalog).mockResolvedValue({
      categoryGroups: [
        {
          category: "Form",
          tutorials: [
            {
              id: TUTORIAL_ID,
              name: "Release angle",
              videoUrl: "https://example.com/video",
              athlete: "",
              athleteHeadshot: null,
              thumbnail: null,
              tutorialTypes: [],
              categories: ["Form"],
              programs: [],
              briefDescription: "Release tips.",
              detailedDescription: "",
              assignmentRationale: "",
              sortOrder: 1,
            },
          ],
        },
      ],
      totalTutorials: 1,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });

    vi.mocked(fetchShoutoutCatalog).mockResolvedValue({
      categoryGroups: [
        {
          category: "Highlights",
          tutorials: [
            {
              id: SHOUTOUT_ID,
              name: "Week 1 shoutout",
              videoUrl: "https://example.com/shoutout",
              athlete: "",
              athleteHeadshot: null,
              thumbnail: null,
              tutorialTypes: [],
              categories: [],
              programs: [],
              briefDescription: "Shoutout clip.",
              detailedDescription: "",
              assignmentRationale: "",
              sortOrder: 1,
            },
          ],
        },
      ],
      totalTutorials: 1,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });

    vi.mocked(fetchArticleCatalog).mockResolvedValue({
      categoryGroups: [
        {
          category: "Reading",
          tutorials: [
            {
              id: ARTICLE_ID,
              name: "Article 1",
              videoUrl: "",
              athlete: "",
              athleteHeadshot: null,
              thumbnail: null,
              tutorialTypes: [],
              categories: [],
              programs: [],
              briefDescription: "Reading reflection.",
              detailedDescription: "",
              assignmentRationale: "",
              sortOrder: 1,
            },
          ],
        },
      ],
      totalTutorials: 1,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });

    vi.mocked(fetchZoomMeetingCatalog).mockResolvedValue({
      weekGroups: [
        {
          weekId: "recWeek00000001",
          weekName: "Week 1",
          weekNumber: 1,
          meetings: [
            {
              id: ZOOM_ID,
              name: "Week 1 Zoom",
              weekId: "recWeek00000001",
              weekName: "Week 1",
              weekNumber: 1,
              startTime: null,
              endTime: null,
              briefDescription: "Live session.",
              fullDescription: "",
              zoomLink: "",
              hostName: "",
              meetingAgenda: "",
              agendaLink: "",
              recordingVideoUrl: "",
              recordingAudioUrl: "",
              meetingSummary: "",
              status: "Scheduled",
              coverImage: null,
            },
          ],
        },
      ],
      totalMeetings: 1,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });

    vi.mocked(fetchLevelLadder).mockResolvedValue({
      levels: [
        {
          id: LEVEL_ID,
          name: "Rookie",
          displayName: "Rookie",
          sortOrder: 1,
          rank: 1,
          xpRequired: 0,
          xpFromPrevious: 0,
          coverImage: null,
          gateCriteria: "",
          previousLevelId: "",
          nextLevelId: "",
        },
      ],
      totalLevels: 1,
      maxXp: 100,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });

    const entries = await buildDynamicSitemapEntries();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/homework/${HOMEWORK_ID}`);
    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/tutorials/${TUTORIAL_ID}`);
    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/shoutouts/${SHOUTOUT_ID}`);
    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/articles/${ARTICLE_ID}`);
    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/zoom-meetings/${ZOOM_ID}`);
    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/levels/${LEVEL_ID}`);
    expect(urls).not.toContain(ATHLETE_PATH);
  });

  it("omits dynamic URLs when catalog fetches fail", async () => {
    vi.mocked(fetchScheduledHomeworkCatalog).mockRejectedValue(new Error("PHA duplicate"));
    vi.mocked(fetchTutorialCatalog).mockRejectedValue(new Error("Airtable down"));
    vi.mocked(fetchShoutoutCatalog).mockRejectedValue(new Error("Airtable down"));
    vi.mocked(fetchArticleCatalog).mockRejectedValue(new Error("Airtable down"));
    vi.mocked(fetchZoomMeetingCatalog).mockRejectedValue(new Error("Airtable down"));
    vi.mocked(fetchLevelLadder).mockRejectedValue(new Error("Airtable down"));

    const entries = await buildDynamicSitemapEntries();
    expect(entries).toEqual([]);
  });
});

describe("buildFullSitemap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("merges static and dynamic entries without athlete or display routes", async () => {
    vi.mocked(fetchScheduledHomeworkCatalog).mockResolvedValue({
      weekGroups: [],
      totalAssignments: 0,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });
    vi.mocked(fetchTutorialCatalog).mockResolvedValue({
      categoryGroups: [],
      totalTutorials: 0,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });
    vi.mocked(fetchShoutoutCatalog).mockResolvedValue({
      categoryGroups: [],
      totalTutorials: 0,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });
    vi.mocked(fetchArticleCatalog).mockResolvedValue({
      categoryGroups: [],
      totalTutorials: 0,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });
    vi.mocked(fetchZoomMeetingCatalog).mockResolvedValue({
      weekGroups: [],
      totalMeetings: 0,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });
    vi.mocked(fetchLevelLadder).mockResolvedValue({
      levels: [],
      totalLevels: 0,
      maxXp: 0,
      updatedAt: "2026-08-25T12:00:00.000Z",
    });

    const entries = await buildFullSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${PUBLIC_SITE_ORIGIN}/leaderboard`);
    expect(urls).not.toContain(`${PUBLIC_SITE_ORIGIN}/public-display`);
    expect(urls).not.toContain(ATHLETE_PATH);
  });
});
